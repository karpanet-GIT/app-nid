// Funzione serverless Vercel: salva il portafoglio in un Gist privato di GitHub, così è lo
// stesso su tutti i browser e i dispositivi.
//
// GET /api/portfolio → { app, version, updatedAt, holdings, hist, bench }
// PUT /api/portfolio   body { holdings, hist, bench, base } → { updatedAt }
//
// Il file del Gist (portfolio.json) ha lo stesso formato di "Esporta backup": si può leggere su
// GitHub e ripristinare dall'app. Ogni salvataggio è una revisione del Gist, quindi le versioni
// precedenti restano consultabili.
//
// `base` è l'updatedAt da cui è partita la modifica: se nel frattempo un altro browser ha
// salvato, risponde 409 e il client ricarica la versione più recente invece di sovrascriverla.
//
// Variabili d'ambiente su Vercel:
// - GITHUB_TOKEN: token GitHub con il solo permesso sui Gist (lettura e scrittura).
// - GIST_ID: id del Gist privato (l'ultima parte del suo indirizzo).
// - PORTFOLIO_PASSWORD (facoltativa): se c'è, l'app la chiede una volta per browser.

const FILE = 'portfolio.json';

class HttpError extends Error {
  constructor(status, message){ super(message); this.status = status; }
}

async function github(method, body){
  let r;
  try{
    r = await fetch('https://api.github.com/gists/' + encodeURIComponent(process.env.GIST_ID), {
      method,
      headers: {
        'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'app-nid-portafoglio',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
  }catch(e){ throw new HttpError(502, 'GitHub non raggiungibile'); }
  if (r.status === 401 || r.status === 403) throw new HttpError(502, 'GitHub: token non valido o senza permesso sui Gist');
  if (r.status === 404) throw new HttpError(502, 'GitHub: Gist non trovato, controlla GIST_ID');
  if (!r.ok) throw new HttpError(502, 'GitHub: errore ' + r.status);
  return r.json();
}

async function read(){
  const g = await github('GET');
  const f = g.files && g.files[FILE];
  if (!f) return null;
  let text = f.content;
  // Oltre 1 MB l'API dei Gist tronca il contenuto: si scarica il file intero.
  if (f.truncated){
    const r = await fetch(f.raw_url, { headers: { 'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new HttpError(502, 'GitHub: errore ' + r.status);
    text = await r.text();
  }
  if (!text || !text.trim()) return null;
  try{ return JSON.parse(text); }catch(e){ throw new HttpError(500, FILE + ' nel Gist non è un JSON valido'); }
}

module.exports = async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.GITHUB_TOKEN || !process.env.GIST_ID) return res.status(501).json({ error: 'Sincronizzazione non configurata: mancano GITHUB_TOKEN e GIST_ID.' });
  const pw = process.env.PORTFOLIO_PASSWORD;
  if (pw && req.headers.authorization !== 'Bearer ' + pw) return res.status(401).json({ error: 'Password mancante o errata.' });
  try{
    if (req.method === 'GET'){
      const d = await read();
      return res.status(200).json(d && Array.isArray(d.holdings) ? d : { holdings: [], hist: {}, bench: null, updatedAt: null });
    }
    if (req.method === 'PUT'){
      const b = req.body;
      if (!b || !Array.isArray(b.holdings) || (b.hist && typeof b.hist !== 'object')) return res.status(400).json({ error: 'Dati del portafoglio non validi.' });
      const cur = await read();
      const curAt = (cur && cur.updatedAt) || null;
      if ((b.base || null) !== curAt) return res.status(409).json({ error: 'Il portafoglio è stato modificato da un altro browser.', updatedAt: curAt });
      const updatedAt = new Date().toISOString();
      const doc = { app: 'portafoglio', version: 2, updatedAt, holdings: b.holdings, hist: b.hist || {}, bench: b.bench || null };
      await github('PATCH', { files: { [FILE]: { content: JSON.stringify(doc) } } });
      return res.status(200).json({ updatedAt });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Metodo non permesso.' });
  }catch(e){
    return res.status(e.status || 500).json({ error: e.message || 'Errore interno' });
  }
};
