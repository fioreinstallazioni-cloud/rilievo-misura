# Analisi della versione 2 e cosa è cambiato nella 3

*31/10/2026 — analisi riga per riga di `index.html` v2 (commit f207e3c), con prove in un browser
simulato da telefono (390×844).*

## Errori trovati nella v2

### Gravi

1. **Senza linea l'app non si apre.** Nessun service worker né manifest: la pagina vive solo su internet.
   In più Leaflet era caricato da unpkg.com *in testa alla pagina* in modo bloccante: con linea debole
   la pagina restava bianca finché la richiesta non andava in errore.
2. **«Dropbox» senza linea non funziona mai.** La libreria del PDF (jsPDF) veniva scaricata da
   cdnjs al momento del salvataggio: offline → «Impossibile caricare…» e il rilievo non partiva.
3. **I menu a tendina non si aprono.** I campi venivano creati con `data-list`, il codice cercava
   `data-dd`: la freccia ▼ e i suggerimenti mentre scrivi non facevano nulla (tipologia, serie, colore,
   vetri, telaio, apertura, commesse). Anche correggendo l'attributo, il menu creato non riceveva la
   classe `open` e restava invisibile. *Verificato: 0 menu visibili dopo il clic.*
4. **Il salvataggio automatico fallisce in silenzio.** Tutto in `localStorage` (~5 MB) e ogni foto
   salvata **due volte** (originale + versione annotata, ~350 KB l'una): *verificato, dopo 7 foto la
   memoria è piena*. Da lì `save()` ignora l'errore (`catch(e){}`): l'app sembra salvare ma non salva,
   e se il telefono ricarica la pagina il lavoro è perso.
5. **Un solo rilievo alla volta.** «Nuovo» cancellava quello in corso («resta salvato solo se
   esportato»): due clienti in un giorno senza linea = il primo rischia di andare perso.

### Medi

6. **PDF Dropbox: riga «Cassonetto» stampata su tutte le posizioni**, anche senza cassonetto
   (`formatCasSummary` non era condizionato).
7. **PDF: intestazione della veranda sbagliata**: mostrava «Sp. … Inf. -» (campi del cassonetto)
   invece di L × H.
8. **PDF: immagini del cassonetto incluse** anche dopo aver cambiato tipologia (residuo del «Sì»).
9. **Rubrica che sovrascrive mentre scrivi**: se il nome digitato coincideva con un contatto, telefono e
   indirizzo venivano sostituiti all'istante; continuando a scrivere restavano quelli del primo contatto.
10. **Disegni che si spostano**: i tratti erano salvati in pixel dello schermo; riaprendo un disegno o una
    foto annotata con il telefono girato (o su un altro telefono) i tratti finivano fuori posto.
11. **Bottone «PDF»** apriva una pagina HTML con la finestra di stampa (spesso bloccata come popup sul
    telefono): nessun file PDF vero.
12. **Elenco commesse di riserva vecchio** (C46…C3, mancava C47) e cartella dell'anno scritta nel codice.
13. Due funzioni `cleanPdfStr` con lo stesso nome (la seconda annullava la prima).

### Piccoli

14. `user-scalable=no`: impossibile ingrandire col pinch (accessibilità).
15. Croce per togliere le foto da 22 px (troppo piccola per il dito) e **nessuna conferma** prima di
    cancellare foto e disegni.
16. Disegni salvati in PNG a piena risoluzione dello schermo (pesanti).
17. Tasto «indietro» di Android: usciva dall'app anche con l'editor aperto.
18. Grafica non allineata al sito: blu vecchio `#1a4f9c`, font di sistema, emoji come icone, angoli
    tondi 14 px, bordi colorati a sinistra.

## Cosa fa la v3

- **Offline vero**: service worker con copia dell'app, font e librerie in locale; mappe già viste
  tenute in memoria; GPS utilizzabile senza linea (l'indirizzo si completa quando torna internet).
- **Memoria del telefono in IndexedDB** con archivio di più rilievi; i dati della v2 vengono importati
  da soli al primo avvio (rilievo aperto, rubrica, elenco commesse, collegamento Dropbox).
- **Coda d'invio Dropbox**: «Salva su Dropbox» crea subito PDF + JSON + foto e li mette in coda;
  partono appena c'è linea (anche in background su Android). Reinvii = file aggiornati, non duplicati.
- **PDF** vero, generato sul telefono, con marchio DF e laser-line blu; corretti gli errori 6–8.
- **Menu a tendina riscritti** (freccia = tutta la lista, scrivere = filtra) e rubrica a suggerimenti.
- **Grafica del sito**: barra scura in vetro, tessere chiare, bottoni squadrati 4 px, Inter + Chakra
  Petch per le misure, icone a tratto come sul sito.
- Il file `dati_….json` resta compatibile con la v2 (stesso nome, stessi campi, `img` sempre pieno).

## Confronto con il lavoro fatto con Antigravity e con i rilievi veri (31/10/2026)

Riletta la conversazione con Antigravity (richieste su rubrica, email, WhatsApp/Telegram, indirizzi,
mappa, citofono, tipo cliente, cantiere, intervista sulle tipologie 1–8, audit finale) e passati nella v3
i **19 rilievi veri** salvati in Dropbox (`dati_….json`, 39 posizioni, da giugno a ottobre 2026).

- **Tutte le richieste dell'intervista sono nella v3** (infissi, mobili, veranda, cassonetto, blindata,
  porta in ferro, portone di palazzo, sportello). L'intervista si era fermata allo sportello (n. 8):
  le tipologie dalla 9 in poi usano ancora i gruppi generici.
- **Nell'audit di Antigravity il menu a tendina risultava «sistemato», ma nel codice pubblicato non
  funzionava** (vedi punto 3 sopra): verificato su GitHub, commit f207e3c.
- Aggiunto in questo giro:
  - tipologie riconosciute anche al **plurale** e con spazi in più (*Cancelli*, *Porte in ferro*,
    *Cassonetti*, *Serrande*, *Tende*…) e con nuove parole (*cilindro*, *sopralluogo*, *veneziana*,
    *scarpiera*, *pensilina*); prima *«Cancelli»* finiva fra i serramenti e chiedeva vetri e maniglia;
  - **veranda: H maniglia non più obbligatoria** (nei rilievi veri veniva riempita con «0»; nell'intervista
    non era fra le obbligatorie);
  - **cassonetto dentro infisso/veranda: «Pezzi» obbligatorio** (chiesto nell'intervista, mancava),
    precompilato con i pezzi dell'infisso;
  - **porta blindata: «Vetri» nascosto se il modello è cieco** (1 o 2 ante senza sopralluce né laterali);
  - **portone: con la spunta «Decorazioni vetri con indirizzo» compare il campo per il testo** da riportare;
  - **telefono incollato dalla rubrica dell'iPhone**: tolti i caratteri invisibili già nel campo.
- Tutti i 19 rilievi veri si aprono nella v3 e producono il PDF senza errori (il più pesante, 9 MB di foto,
  in meno di un secondo). Quelli vecchi segnalano come mancanti solo i campi diventati obbligatori
  dopo l'intervista (L infisso e pezzi del cassonetto, modello e maniglie del portone).
- Da decidere: nell'audit di Antigravity la **veranda** ha «L spigoli / L infisso» e profondità DX/SX,
  e il **cassonetto** ha manovra e colore obbligatori; nei messaggi dell'intervista queste regole erano
  chieste per i cassonetti, non per la veranda. Nella v3 la veranda resta L × H × P e la manovra del
  cassonetto è facoltativa.
