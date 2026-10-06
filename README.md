# Il mio portafoglio

App web in un unico file (`index.html`) per seguire un portafoglio di titoli: ETF, ETC/ETN, azioni, titoli di Stato, obbligazioni, certificati e fondi.

## Cosa fa

- Valore del portafoglio e guadagno rispetto al prezzo di carico
- Grafici dell'andamento del portafoglio e dei singoli titoli, con filtro per periodo e per comparto
- Mappa dei titoli (dimensione per valore, colore per variazione)
- Confronto con indici di riferimento
- Calendario di cedole e scadenze dei prossimi 12 mesi, con barriere dei certificati
- Aggiornamento dei prezzi (anche tutti insieme) e importazione dello storico da CSV
- Tema chiaro e scuro

## Come usarla

Apri `index.html` nel browser. Non serve installare niente né avviare un server.

## Dove finiscono i dati

Dipende da dove apri l'app:

- **File aperto nel browser:** i dati restano nel browser (`localStorage`, chiave `portafoglio-v2`) e non vengono inviati a nessun server. Se cancelli i dati del sito o cambi browser o dispositivo, il portafoglio non ti segue: usa **••• → Esporta backup** per salvarlo e **Ripristina da backup** per ricaricarlo.
- **Artifact pubblicato su claude.ai:** i dati vengono salvati nel database dell'Artifact, legati al tuo utente, e ritrovi il portafoglio da qualsiasi dispositivo.
