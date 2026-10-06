# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Panoramica

"Il mio portafoglio" è un'app per seguire un portafoglio di titoli (ETF, ETC/ETN, azioni, titoli di Stato, obbligazioni, certificati, fondi). Sta tutta in un file, `index.html` (~1700 righe): CSS in `<style>`, JS in un unico `<script>` dentro una IIFE con `'use strict'`. Non ci sono build, dipendenze, linter né test. L'unica risorsa esterna è il font Figtree da Google Fonts.

C'è anche una funzione serverless Vercel, `api/quote.js` (CommonJS, Node 18+, nessuna dipendenza): `GET /api/quote?q=<ISIN o ticker>[&symbol=][&from=YYYY-MM-DD|&range=]` restituisce `{source, symbol, name, currency, price, date, history:[[dataISO, chiusura]]}`. Per un ISIN la fonte principale è justETF (ETF, ETC e azioni, in euro; `symbol` è l'ISIN). Yahoo Finance è solo una riserva perché dai server di Vercel risponde spesso 429: l'ISIN si traduce in ticker con OpenFIGI (preferisce Borsa Italiana, poi altre borse in euro; chiave facoltativa in `OPENFIGI_API_KEY`). Entrambe sono API non ufficiali. Risponde 404 se il titolo non c'è (tipico di certificati e BTP).

- **Avvio:** apri `index.html` nel browser, senza server. I prezzi automatici funzionano solo quando l'app è servita da Vercel (`vercel dev` in locale); da file o come Artifact si usa l'inserimento manuale.
- **Verifica:** a mano nel browser, nel tema chiaro e in quello scuro e a larghezza da telefono.

Testi della UI, commenti e nomi delle sezioni sono in italiano. Mantieni questa lingua.

## Struttura dello script

Le sezioni sono separate da commenti `/* ---------- nome ---------- */`, in quest'ordine: costanti → stato → formattazione → CSV → archiviazione → calcoli → cedole e scadenze → grafici → serie ricostruite → render → dialoghi → eventi → tema → avvio.

- **Stato globale unico** `S` (`holdings`, `hist`, `bench`, `range`, `dRange`, `openId`, `loaded`, `pfCat`, `incCat`). Ogni modifica segue lo schema: muta `S` → `store.save*()` → `render()` (e `detail(id)` se il dialogo è aperto).
- **Rendering:** stringhe template assegnate a `innerHTML`. Ogni valore dell'utente passa da `esc()`. Il dettaglio e i form usano un solo `<dialog id="dlg">` (`openDlg`/`closeDlg`).
- **Eventi:** un unico listener `click` delegato sul `document`. I pulsanti si dichiarano con `data-act="..."` (gestiti nello `switch`) o con `data-range`, `data-drange`, `data-open`, `data-pfcat`, `data-inccat`. Per un'azione nuova aggiungi un `case`, non un listener. Invio nei campi del dialogo clicca il pulsante `save*` presente. Le azioni distruttive usano `arm(btn, label)`, che chiede un secondo clic di conferma.
- **Grafici:** SVG disegnati a mano (`drawChart`, `drawMulti`, `miniSVG`, `spark`), senza librerie. `mountChart`/`mountMulti` salvano `el._draw` e ridisegnano tramite un `ResizeObserver` condiviso.

## Modello dati

- **Holding:** `{id, name, isin, cat, quote, qty, pmc, price, priceDate, buyDate, tax, perf?, bank?, income?, feed?}`.
  - `quote: 'pct'` vuol dire prezzo in % del nominale (TS/OBB), quindi il controvalore è `qty/100 * price`. Usa sempre `factor(h)`.
  - Un titolo è "completo" (`isComplete`) se ha `qty`, `pmc` e `price` > 0. I titoli incompleti usano `bank.value/bank.cost` e i rendimenti `perf.r[periodo]` inseriti a mano.
  - `feed: {symbol}` è il ticker trovato da `/api/quote`. Si salva solo dopo che il prezzo trovato torna con quello del titolo (`checkQuote`); da allora gli aggiornamenti scaricano solo gli ultimi giorni invece di 5 anni.
  - `income` è una cedola obbligazionaria (`kind:'bond'`) o un certificato (`kind:'cert'`, con barriere, memoria, `worst`, `missed`).
- **Storico:** `S.hist[id]` è un array di `[dataISO, prezzo]` ordinato per data. Le funzioni di ricerca (`priceAt` usa la ricerca binaria) contano su quest'ordine.
- **Periodi:** chiavi `1G 1S 1M 3M 6M 1A 3A 5A CARICO` (`RANGES`, `RDAYS`, `CAP`). `calc(h, r)` e `totals(r)` sono il cuore dei calcoli.
- **Categorie:** `CATS` definisce colore, aliquota fiscale di default (26%, 12,5% per i TS) e tipo di quotazione. Una categoria sconosciuta ricade su `ALTRO`.
- Le date sono stringhe ISO `YYYY-MM-DD`, gestite con `addISO`/`toISO` (mezzogiorno locale per evitare problemi di fuso). I numeri si formattano con `Intl` `it-IT` (`eur`, `pct`, `px`…). `parseNum`/`parseDate` accettano input sia in formato italiano sia inglese.

## Archiviazione (`store`): due modalità

- **`db`:** si attiva se esistono `window.claude.use('db'|'user'|'downloads')`, cioè quando la pagina gira come Artifact claude.ai con capability. I documenti stanno in `data/users/<uid>/`: `portfolio` (`{version:2, holdings, updatedAt}`), `benchmarks` e `hist-<id>` (`{points}`). Il portafoglio arriva da `onSnapshot`.
- **`local`:** fallback su `localStorage` con chiave `portafoglio-v2` (`{holdings, hist, bench}`). Lo stesso `localStorage` conserva anche `pf-range` e `pf-theme`.

Invarianti da non rompere:
- Non salvare mai prima che `store.synced` sia vero, così una pagina appena aperta non può sovrascrivere i dati con uno stato vuoto.
- `saveHist` unisce il proprio storico con quello del server (per la stessa data vince il prezzo locale), perché altre finestre o Claude possono scrivere in `hist-*`. `force=true` sostituisce lo storico. `store.pending` evita che `loadHist` sovrascriva uno storico mentre lo si sta salvando.
- Backup ed esportazione usano lo stesso JSON: il download passa da `store.dl` e, se non è disponibile, si copia il testo.

## Tema

I colori sono token CSS su `:root`. Il tema scuro è definito sia in `@media (prefers-color-scheme: dark)` con `:root:not([data-theme="light"])` sia in `:root[data-theme="dark"]`, quindi un colore nuovo va aggiunto in tutti e tre i blocchi. Per i colori derivati usa `color-mix` (vedi `tileColors`).
