# Rilievo misure — DF Fiore Installazioni

Scheda di rilievo misure da usare sul telefono dal cliente. Stessa grafica del sito dfcnc.it
(design system DF «Precision»: barra scura, tessere chiare, bottoni squadrati, Inter + Chakra Petch,
blu DF `#2F6FD0`).

## Cosa fa

- **Si apre anche senza linea.** Dopo la prima apertura con internet, l'app resta sul telefono
  (service worker): al cliente si apre anche in cantina o in campagna.
- **Salva da sola, sul telefono**, a ogni cosa che scrivi (IndexedDB: centinaia di foto, non 7 come prima).
- **Archivio dei rilievi**: «Nuovo» non cancella niente, i rilievi precedenti restano nell'archivio
  (icona in alto a destra) con il loro stato: *Bozza*, *In attesa di linea*, *Su Dropbox*, *Errore*.
- **Salva su Dropbox** manda direttamente nella cartella giusta:
  - `…/Commesse Installazioni 2026/Lead/<Cliente>/` per un nuovo cliente, oppure
  - `…/Commesse Installazioni 2026/<Commessa>/` per una commessa confermata;
  - dentro: `Rilievo_<Cliente>_<data>.pdf`, `dati_<Cliente>_<data>.json` e la cartella
    `Foto_<Cliente>_<data>/` con disegni e foto in JPG (si può spegnere dalle impostazioni).
  - **Senza linea** il rilievo va in coda e parte **da solo** appena torna internet
    (all'apertura dell'app, al ritorno della linea, ogni minuto; su Android anche ad app chiusa).
  - Se lo rimandi dopo una modifica, i file su Dropbox vengono **aggiornati**, non duplicati.
- **PDF** crea un vero file PDF (anche offline) da condividere su WhatsApp/email o salvare.
- Tasto «indietro» del telefono: chiude la finestra aperta invece di uscire dall'app.

## Novità della 3.4: grate del catalogo DF e persiane napoletane

- **I 17 disegni del «Catalogo grate DF»** (G·01 Posillipo … G·17 Miseno, quello mandato ad Abete il
  26/10/2026) sono nel disegno tecnico, ripresi dal sorgente `Cloude code/Catalogo Grate/genera-catalogo.py`
  su Dropbox con le stesse proporzioni. Nuovo gruppo **«Grate DF»** (ogni disegno come grata a 2 ante) e,
  per qualsiasi parte, riempimento **«Grata DF (catalogo)»** con la scelta del disegno a riquadri: vale
  per grate, **cancelli** e ringhiere. Sulle parti larghe (cancelli scorrevoli, carrai) il disegno si
  ripete a moduli. I cancelli del catalogo partono già con un disegno DF (si cambia toccando la parte).
- **Persiana napoletana** (in «Cancelli e grate» e in «Persiane»): ante a battente a lamelle che aprono
  verso l'esterno con lo **sportello a sporgere** in basso; l'altezza dello sportello si scrive per ogni
  anta e si adatta all'altezza della posizione. Nel PDF: «con sportello a sporgere alla napoletana h …».
- Se il catalogo grate cambia, va aggiornata anche la lista `GRATE` e la funzione `disegnoGrata` in `tecnico.js`.

## Novità della 3.3: disegno tecnico «a parti» (idea presa da fliwoX)

In ogni posizione, accanto a «Disegna», c'è **Disegno tecnico**:

- **Catalogo di modelli pronti** (72 dalla 3.4) in 8 gruppi: finestre (1–4 ante, anta-ribalta, con vasistas sopra o
  fisso sotto), portefinestre (con zoccolo, fisso laterale, sopraluce), scorrevoli e alzanti, porte e
  portoni (con sopraluce e laterali), verande (scorrevoli, battenti, a libro, con sopraluce a vasistas o
  sottoluce cieco), cancelli e grate (2 ante, pedonale, scorrevole, carraio + pedonale, ringhiera),
  persiane, zanzariere, pannelli. Il modello prende **L × H della posizione**.
- **Tocchi una parte e la cambi**: apertura (fisso, battente SX/DX, anta-ribalta, vasistas, a sporgere,
  scorrevole, bilico, a libro), riempimento (vetro, pannello, sbarre, lamelle, rete, vuoto), verso
  (interno/esterno), zoccolo cieco; la **dividi** in colonne o righe, aggiungi **sopraluce/sottoluce**,
  aggiungi o togli un'anta, dai la **misura** alla singola parte (le altre si adattano).
- **Componi**: «+ Modello a destra / sinistra / sopra / sotto» per affiancare telai (portafinestra +
  finestra, veranda + porta, carraio + pedonale…).
- **Vista frontale** (da interno o da esterno, con le quote di ogni parte calcolate da sole) e **pianta**
  con il verso di apertura delle ante e gli scorrevoli.
- Nel **PDF** il disegno esce grande, con frontale + pianta e la descrizione di ogni parte; su Dropbox
  c'è anche `PosNN_disegno_tecnico.jpg`, e nel `dati_….json` lo schema (`tecnico.schema`) per riaprirlo.
- Il disegno a mano libera resta com'era (per schizzi, note e foto).

## Novità della 3.2

- **Rubrica aziendale**: i clienti si cercano nella rubrica unica `Ufficio/Rubrica/Rubrica Selvaggia.xlsx`
  su Dropbox (per nome, telefono, città o P.IVA). L'app la scarica, ne tiene una copia sul telefono per
  lavorare senza linea e la riscarica solo quando è cambiata (al massimo ogni 6 ore, o col tasto
  «Aggiorna»). **Non la modifica**: i clienti nuovi restano «sul telefono · da registrare in rubrica
  aziendale», e nel file `dati_….json` c'è `cliente_in_rubrica_aziendale: false`.
  Il percorso del file si cambia in *Impostazioni → Rubrica aziendale*.
- **WhatsApp e Telegram** con le loro icone.
- **Numero civico**: nella mappa c'è il campo «N° civico» (preso da quello che avevi scritto, o da
  OpenStreetMap quando lo conosce), e scegliendo un indirizzo suggerito il civico scritto non si perde più.
- **Coordinate per gli operai**: sotto l'indirizzo e nel PDF ci sono le coordinate precise con i link
  che aprono il navigatore in **Google Maps** e **Apple Maps**, più «Copia». Si vede se il punto è
  preciso (scelto sulla mappa) o approssimato (preso dall'indirizzo). Nel `dati_….json` sono in `mappe`.

## Novità della 3.1 (idee prese dai video di fliwoX)

- **«Che misura hai preso?»** per ogni posizione: esterne (fuori telaio), luce muro, finita, altro.
  Obbligatorio dove sono obbligatorie L e H: in officina devono sapere se togliere o no.
- **Tre prese per lato** (spunta): L alto/centro/basso, H sinistra/centro/destra, diagonali facoltative.
  In L e H va la **minima**; se le prese o le diagonali differiscono di più di 5 mm l'app avvisa
  (muro storto o fuori squadro). «Tutte uguali alla prima» ricopia la prima misura.
- **Accesso al cantiere** per tutto il rilievo: piano (obbligatorio), mezzo di salita, difficoltà,
  note per la posa. Nel PDF come «Posa e logistica»; piano e mezzo di salita vanno anche in rubrica.
- **Telaio lato per lato** (spunta, per infissi, verande, porte, portoni e sportelli): profilo Z / L / T /
  a muro per ogni lato e rifilo in mm.

## Installarla sul telefono

1. Apri l'indirizzo dell'app **con la linea** (la prima volta serve internet).
2. **Android (Chrome):** menu ⋮ → *Installa app* (o *Aggiungi a schermata Home*).
   **iPhone (Safari):** tasto Condividi → *Aggiungi alla schermata Home*.
3. Da quel momento usa l'icona **DF** sulla schermata Home: funziona anche offline.

> Su iPhone l'app installata ha una memoria separata da Safari. Se avevi un rilievo aperto in Safari,
> da Safari fai *Impostazioni → Esporta backup* e poi nell'app *Impostazioni → Importa*.

## Collegare Dropbox (una volta per telefono)

Impostazioni (ingranaggio) → segui i 3 passi: crea l'app su dropbox.com/developers/apps
(Scoped access, Full Dropbox, permessi `files.content.write` e `files.content.read`), incolla la
*App key*, apri l'autorizzazione e incolla il codice. Se il telefono era già collegato con la versione
precedente, il collegamento viene ripreso da solo.

A gennaio cambia l'anno della cartella in *Impostazioni → Cartella delle commesse*.

## Pubblicare una versione nuova

I file dell'app restano in copia sul telefono: perché i telefoni prendano la versione nuova bisogna
cambiare il numero di versione **in tutti questi punti** (cerca `3.4.0`):

- `sw.js` → `VERSIONE` e i `?v=` nella lista `FILE_APP` e in `importScripts`
- `index.html` → i `?v=` di `app.css`, `dbx.js`, `tecnico.js`, `app.js`
- `app.js` → `VERSIONE_APP`

Alla prima apertura con linea l'app mostra «Nuova versione pronta → Aggiorna ora».

## File

| File | Cosa contiene |
|---|---|
| `index.html` | la pagina e le icone |
| `app.css` | la grafica (token del sito) |
| `app.js` | il modulo, le schede per tipologia, disegni/foto, mappa, PDF, archivio |
| `tecnico.js` | il disegno tecnico «a parti»: catalogo dei modelli, frontale, pianta, quote |
| `dbx.js` | memoria del telefono (IndexedDB) e coda d'invio a Dropbox (usato anche dal service worker) |
| `sw.js` | service worker: app offline, mappe già viste, invio in background |
| `vendor/` | jsPDF 2.5.1, Leaflet 1.9.4 e SheetJS 0.18.5 (lettura della rubrica Excel) in locale |
| `fonts/` | Inter e Chakra Petch in locale |
