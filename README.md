# Il mio portafoglio

App web in un unico file (`index.html`) per seguire un portafoglio di titoli: ETF, ETC/ETN, azioni, titoli di Stato, obbligazioni, certificati e fondi.

## Cosa fa

- Valore del portafoglio e guadagno rispetto al prezzo di carico
- Acquisti e vendite di quote con data e prezzo: prezzo medio di carico ricalcolato, guadagno realizzato sulle vendite, cedole contate solo sulle quote possedute a ogni data
- Grafici dell'andamento del portafoglio e dei singoli titoli, con filtro per periodo e per comparto
- Mappa dei titoli (dimensione per valore, colore per variazione)
- Confronto con indici di riferimento
- Calendario di cedole e scadenze dei prossimi 12 mesi, con barriere dei certificati
- Aggiornamento automatico dei prezzi e dello storico giornaliero (con l'app pubblicata su Vercel), inserimento manuale per i titoli non trovati, importazione dello storico da CSV
- Tema chiaro e scuro

## Come usarla

Apri `index.html` nel browser. Non serve installare niente né avviare un server.

Per l'aggiornamento automatico dei prezzi pubblica la cartella su Vercel: la funzione `api/quote.js` cerca ogni titolo per ISIN su justETF (ETF, ETC e azioni) e su Borsa Italiana (BTP e obbligazioni del MOT con lo storico, certificati del SeDeX con il prezzo del giorno) e scarica prezzo e storico giornaliero. **Aggiorna prezzi** aggiorna da sola i titoli trovati e ti chiede a mano solo gli altri. Se un titolo viene trovato in un'altra valuta o con un prezzo che non torna con il tuo, non viene salvato finché non lo confermi.

## Stessi dati su tutti i browser (Gist di GitHub)

Con l'app su Vercel il portafoglio può stare in un Gist privato di GitHub, nel file `portfolio.json` (stesso formato del backup). Ogni salvataggio è una revisione del Gist, quindi le versioni precedenti restano consultabili su GitHub.

1. Su [gist.github.com](https://gist.github.com) crea un **secret gist** con un file `portfolio.json` che contiene `{}`. L'id è l'ultima parte dell'indirizzo del Gist.
2. Su GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**, crea un token con il solo permesso **Gists: Read and write**.
3. Su Vercel → progetto → Settings → Environment Variables aggiungi `GITHUB_TOKEN` (il token), `GIST_ID` (l'id) e, se vuoi, `PORTFOLIO_PASSWORD` (l'app la chiede una volta per browser). Poi rifai il deploy.
4. Apri l'app nel browser dove hai già il portafoglio: al primo avvio i dati di quel browser vengono copiati nel Gist. In alternativa usa **Ripristina da backup**.

Se due browser modificano il portafoglio insieme, il secondo salvataggio non sovrascrive il primo: l'app ricarica la versione più recente e ti chiede di ripetere la modifica.

## Dove finiscono i dati

Dipende da dove apri l'app:

- **App su Vercel con il Gist configurato:** i dati stanno nel Gist privato e sono gli stessi su tutti i browser; ogni browser ne tiene anche una copia nel `localStorage`.
- **File aperto nel browser:** i dati restano nel browser (`localStorage`, chiave `portafoglio-v2`) e non vengono inviati a nessun server. Se cancelli i dati del sito o cambi browser o dispositivo, il portafoglio non ti segue: usa **••• → Esporta backup** per salvarlo e **Ripristina da backup** per ricaricarlo.
- **Artifact pubblicato su claude.ai:** i dati vengono salvati nel database dell'Artifact, legati al tuo utente, e ritrovi il portafoglio da qualsiasi dispositivo.
