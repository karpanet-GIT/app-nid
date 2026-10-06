// Funzione serverless Vercel: prezzo attuale e storico giornaliero di un titolo.
//
// GET /api/quote?q=<ISIN o ticker>[&symbol=<ticker Yahoo>][&from=YYYY-MM-DD | &range=1mo]
//
// - q: ISIN (es. IE00B4L5Y983) o ticker Yahoo (es. SWDA.MI). Un ISIN si traduce in ticker con
//   OpenFIGI, preferendo Borsa Italiana e poi le altre borse in euro; se non basta, con la
//   ricerca di Yahoo Finance. Prezzi e storico vengono da Yahoo Finance.
// - symbol: ticker già noto (lo restituisce una chiamata precedente); salta la ricerca.
// - from: data ISO da cui partire con lo storico; in alternativa range (default 1mo).
//
// Risposta 200: { query, symbol, name, exchange, currency, price, date, history:[[dataISO, chiusura], ...] }
// Errori: 400 parametri non validi, 404 titolo non trovato, 502 errore della fonte dati.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
const RANGES = ['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'];
// Borse in ordine di preferenza: prima Milano, poi le altre in euro.
// Codici OpenFIGI → suffisso del ticker Yahoo; codici borsa Yahoo per la ricerca.
const FIGI_EXCH = [['IM', '.MI'], ['GY', '.DE'], ['GR', '.DE'], ['FP', '.PA'], ['NA', '.AS'], ['SM', '.MC'], ['BB', '.BR'], ['AV', '.VI'], ['GF', '.F']];
const EXCH = ['MIL', 'GER', 'PAR', 'AMS', 'MCE', 'BRU', 'VIE', 'FRA'];

class HttpError extends Error {
  constructor(status, message){ super(message); this.status = status; }
}

async function yahoo(url){
  let r;
  try{ r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }); }
  catch(e){ throw new HttpError(502, 'Fonte dati non raggiungibile'); }
  if (r.status === 404) return null;
  if (!r.ok) throw new HttpError(502, 'Fonte dati: errore ' + r.status);
  return r.json();
}

// Ticker Yahoo candidati per un ISIN, dalle quotazioni elencate da OpenFIGI.
async function figi(isin){
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.OPENFIGI_API_KEY) headers['X-OPENFIGI-APIKEY'] = process.env.OPENFIGI_API_KEY;
  let j;
  try{
    const r = await fetch('https://api.openfigi.com/v3/mapping', { method: 'POST', headers, body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    j = await r.json();
  }catch(e){ return []; }
  const data = (j && j[0] && j[0].data) || [], out = [];
  for (const [code, suffix] of FIGI_EXCH){
    for (const d of data){
      if (d.exchCode !== code || !/^[A-Z0-9.\-]+$/.test(d.ticker || '')) continue;
      const sym = d.ticker.replace(/\./g, '-') + suffix;
      if (!out.includes(sym)) out.push(sym);
    }
  }
  return out;
}

async function search(q){
  const j = await yahoo('https://query2.finance.yahoo.com/v1/finance/search?quotesCount=10&newsCount=0&listsCount=0&q=' + encodeURIComponent(q));
  const quotes = (j && j.quotes || []).filter(x => x.symbol && x.quoteType !== 'OPTION' && x.quoteType !== 'FUTURE');
  const rank = x => { const i = EXCH.indexOf(x.exchange); return i < 0 ? EXCH.length : i; };
  return quotes.sort((a, b) => rank(a) - rank(b));
}

async function chart(symbol, from, range){
  const p = from
    ? `period1=${Math.floor(Date.parse(from + 'T00:00:00Z') / 1000)}&period2=${Math.floor(Date.now() / 1000) + 86400}`
    : `range=${range}`;
  const j = await yahoo(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&${p}&includePrePost=false&events=`);
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta || !(res.meta.regularMarketPrice > 0)) return null;
  const m = res.meta, off = (m.gmtoffset || 0) * 1000;
  const day = t => new Date(t * 1000 + off).toISOString().slice(0, 10);
  const ts = res.timestamp || [], cl = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
  const map = new Map();
  ts.forEach((t, i) => { if (cl[i] > 0) map.set(day(t), Math.round(cl[i] * 1e6) / 1e6); });
  const date = m.regularMarketTime ? day(m.regularMarketTime) : null;
  if (date) map.set(date, m.regularMarketPrice);
  return {
    symbol: m.symbol || symbol,
    name: m.longName || m.shortName || null,
    exchange: m.fullExchangeName || m.exchangeName || null,
    currency: m.currency || null,
    price: m.regularMarketPrice,
    date,
    history: [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)
  };
}

async function quote(q, symbol, from, range){
  if (symbol){ const c = await chart(symbol, from, range); if (c) return c; }
  const isin = ISIN.test(q);
  if (!isin){ const c = await chart(q, from, range); if (c) return c; }
  // Preferisci una quotazione in euro: prova al massimo tre ticker per fonte.
  let first = null;
  const tryAll = async syms => {
    for (const sym of syms.slice(0, 3)){
      const c = await chart(sym, from, range);
      if (!c) continue;
      if (c.currency === 'EUR') return c;
      first = first || c;
    }
    return null;
  };
  if (isin){ const c = await tryAll(await figi(q)); if (c) return c; }
  const c = await tryAll((await search(q)).map(x => x.symbol));
  return c || first;
}

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS'){ res.status(204).end(); return; }
  const qs = req.query || {};
  const q = String(qs.q || '').trim().toUpperCase();
  const symbol = String(qs.symbol || '').trim();
  const from = String(qs.from || '').trim();
  const range = String(qs.range || '1mo').trim();
  if (!q || q.length > 40 || !/^[A-Z0-9.\-^=]+$/.test(q)) return res.status(400).json({ error: 'Parametro q mancante o non valido: serve un ISIN o un ticker.' });
  if (symbol && (symbol.length > 40 || !/^[A-Za-z0-9.\-^=]+$/.test(symbol))) return res.status(400).json({ error: 'Parametro symbol non valido.' });
  if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(Date.parse(from)))) return res.status(400).json({ error: 'Parametro from non valido: usa YYYY-MM-DD.' });
  if (!from && !RANGES.includes(range)) return res.status(400).json({ error: 'Parametro range non valido: ' + RANGES.join(', ') + '.' });
  try{
    const r = await quote(q, symbol, from, range);
    if (!r) return res.status(404).json({ error: 'Titolo non trovato: ' + q });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({ query: q, ...r });
  }catch(e){
    return res.status(e.status || 500).json({ error: e.message || 'Errore interno' });
  }
};
