# Il mio portafoglio

App web in un unico file (`index.html`) per seguire un portafoglio di titoli: ETF, ETC/ETN, azioni, titoli di Stato, obbligazioni, certificati e fondi.

## Cosa fa

- Valore del portafoglio e guadagno rispetto al prezzo di carico
- Grafici dell'andamento del portafoglio e dei singoli titoli, con filtro per periodo e per comparto
- Mappa dei titoli (dimensione per valore, colore per variazione)
- Confronto con indici di riferimento
- Calendario di cedole e scadenze dei prossimi 12 mesi, con barriere dei certificati
- Aggiornamento automatico dei prezzi e dello storico giornaliero (con l'app pubblicata su Vercel), inserimento manuale per i titoli non trovati come certificati e BTP, importazione dello storico da CSV
- Tema chiaro e scuro

## Come usarla

Apri `index.html` nel browser. Non serve installare niente né avviare un server.

Per l'aggiornamento automatico dei prezzi pubblica la cartella su Vercel: la funzione `api/quote.js` cerca ogni titolo per ISIN su justETF (ETF, ETC e azioni) e scarica prezzo e storico giornaliero. **Aggiorna prezzi** aggiorna da sola i titoli trovati e ti chiede a mano solo gli altri. Se un titolo viene trovato in un'altra valuta o con un prezzo che non torna con il tuo, non viene salvato finché non lo confermi.

## Dove finiscono i dati

Dipende da dove apri l'app:

- **File aperto nel browser:** i dati restano nel browser (`localStorage`, chiave `portafoglio-v2`) e non vengono inviati a nessun server. Se cancelli i dati del sito o cambi browser o dispositivo, il portafoglio non ti segue: usa **••• → Esporta backup** per salvarlo e **Ripristina da backup** per ricaricarlo.
- **Artifact pubblicato su claude.ai:** i dati vengono salvati nel database dell'Artifact, legati al tuo utente, e ritrovi il portafoglio da qualsiasi dispositivo.
