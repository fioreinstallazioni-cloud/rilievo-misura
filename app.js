/* ═══════════════════════════════════════════════════════════════════════
   Rilievo misure v3 — DF / Fiore Installazioni
   - Si apre e lavora anche senza linea (service worker + IndexedDB).
   - Archivio: più rilievi sul telefono, «Nuovo» non cancella niente.
   - «Salva su Dropbox» mette il rilievo in coda e lo manda appena c'è linea
     (PDF + dati JSON + foto JPG nella cartella del Lead o della commessa).
   - «PDF» crea un vero file PDF sul telefono, anche offline.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var VERSIONE_APP = '3.1.0';
var BASE_PREDEFINITA = '/Ufficio/COMMESSE/Commesse Installazioni 2026';
var COMMESSE_PREDEFINITE = [
  'C47-SIRYUS SRL', 'C46-Mes group', 'C45-Tonino Russo', 'C44-Teatro Bracco', 'C35-Tecno3-Telai',
  'C34-Caruso Geometra', 'C29-Condominio c.Garibaldi 174', 'C.26 Vincenzo Palmieri'
];
var CARTELLE_ESCLUSE = ['lead', 'file produzione', 'assistenze installazioni', 'assistenza'];

/* ── Catalogo DF Fiore Installazioni (invariato) ──────────────────────── */
var OPZIONI = {
  tipologia: ['Infissi in alluminio', 'Finestra', 'Portafinestra', 'Scorrevole', 'Mobili in alluminio', 'Veranda', 'Cassonetto',
    'Porta blindata', 'Porta in ferro', 'Portone palazzo', 'Sportello in alluminio', 'Cancello', 'Cancello battente', 'Cancello scorrevole',
    'Persiana in ferro', 'Persiana in alluminio', 'Grata/Inferriata', 'Ringhiera/Parapetto', 'Copertura/Tettoia', 'Lattoneria',
    'Tapparella', 'Zanzariera', 'Serranda', 'Tenda da sole', 'Mobile/Copricaldaia', 'Controtelaio', 'Carter/Grondaia', 'Riparazioni', 'Altro'],
  serie: ['Alluminio freddo MAR45', 'Alluminio termico MAR73HTi', 'Scorrevole freddo MAS60', 'Scorrevole termico MAS65TT', 'Persiana MAR45 SP54',
    'Ferro zincato', 'Ferro zincato e verniciato', 'PVC', 'Alluminio coibentato', 'Jolly', 'A molla', 'Lamiera coibentata'],
  colore: ['RAL 9010 Bianco', 'RAL 1013 Avorio', 'RAL 8017 Marrone', 'RAL 6005 Verde', 'RAL 9005 Nero', 'RAL 7016 Grigio antracite',
    'Grigio raffaello', 'Grigio grafite', 'Marrone raffaello', 'Alluminio anodizzato', 'Effetto legno Noce', 'Effetto legno Ciliegio',
    'Effetto legno Rovere', 'Grezzo'],
  vetri: ['Vetrocamera 4/12/4 standard', 'Vetrocamera 4/12/4C', 'Basso emissivo', 'Satinato', 'Stratificato/Antinfortunio', 'Acustico',
    'Triplo vetro', 'Pannello cieco', 'Lamiera', 'Senza vetro'],
  telaio: ['Su controtelaio esistente', 'Nuovo controtelaio singolo', 'Nuovo controtelaio doppio', 'A muro', 'L', 'Z', 'Z con falda da 40',
    'Z con falda da 50', 'T ai quattro lati', 'Z esterno L interno', 'Distanziale a C 100mm', 'Distanziale a C 120mm', 'Falso telaio'],
  apertura: ['1 anta DX', '1 anta SX', '2 ante', '3 ante', 'Anta-ribalta DX', 'Anta-ribalta SX', '2 ante + ribalta', 'Spingere DX', 'Spingere SX',
    'Tirare DX', 'Tirare SX', 'Fisso', 'Scorrevole', 'Vasistas'],
  modelloPorta: ['1 anta', '2 ante', '2 ante asimmetriche', '1 anta + sopralluce', '2 ante + sopralluce', '2 ante asimmetriche + sopralluce',
    '1 anta + 1 laterale fisso', '2 ante + 1 laterale fisso', '2 ante asimmetriche + 1 laterale fisso', '1 anta + 2 laterali fissi',
    '2 ante + 2 laterali fissi', '2 ante asimmetriche + 2 laterali fissi', '1 anta + sopralluce + laterale fisso', '2 ante + sopralluce + 2 laterali fissi'],
  modelloSerratura: ['Cilindro europeo', 'Elettrica', 'Doppia mappa', 'Solo mandate', 'A fascia', 'A montante', 'Esterna', 'Multipunto', 'Maniglione antipanico'],
  tipoDefender: ['Standard', 'Magnetico', 'Antishock / Monoblocco', 'Nessuno'],
  spioncino: ['Standard', 'Elettronico', 'Standard Bicolore', 'Elettronico Bicolore', 'Nessuno'],
  tipoFissaggio: ['Tasselli chimici', 'Tasselli meccanici', 'Zanche a murare', 'Saldatura su controtelaio', 'Viti su telaio'],
  manigliaPortone: ['Maniglia', 'Maniglione', 'Pomello', 'Nessuna'],
  tipoManiglia: ['Standard in tinta', 'Cromo satinato', 'Ottone / Oro', 'Nera', 'Maniglia a incasso', 'Pomello'],
  casTipo: ['Tradizionale', 'Cilindro', 'Coibentato', 'Monoblocco'],
  casManovra: ['Cinghia', 'Motore', 'Arganello'],
  pos: ['Cucina', 'Soggiorno', 'Salone', 'Camera 1', 'Camera 2', 'Camera 3', 'Stanzetta', 'Bagno', 'Bagno 2', 'Ingresso', 'Porta principale',
    'Portone principale', 'Studio', 'Ripostiglio', 'Garage', 'Cantina', 'Mansarda', 'Balcone', 'Terrazzo', 'Scala']
};

OPZIONI.piano = ['Seminterrato', 'Piano terra', 'Rialzato'].concat(Array.from({ length: 20 }, function (_, k) { return (k + 1) + '° piano'; })).concat(['Mansarda', 'Attico', 'Altro']);
OPZIONI.mezzoSalita = ['Scala interna', 'Scala esterna', 'Scala aerea', 'Scala a mano', 'Ascensore', 'Gru', 'Elevatore', 'Ponteggio', 'Nessuno'];

/* «Che misura hai preso?»: senza questa informazione in officina non sanno se togliere o no */
var TIPI_MISURA = [['esterne', 'Esterne', 'fuori telaio'], ['luce', 'Luce muro', 'interne'], ['finita', 'Finita', 'del prodotto'], ['altro', 'Altro', 'la scrivi tu']];
var TESTO_MISURA = { esterne: 'Esterne (fuori telaio)', luce: 'Interne (luce muro)', finita: 'Finita (misura del prodotto)' };
var PRESE_L = ['L_alto', 'L_centro', 'L_basso'], PRESE_H = ['H_sx', 'H_centro', 'H_dx'], PRESE = PRESE_L.concat(PRESE_H, ['D1', 'D2']);
var SOGLIA_MM = 5;   // oltre questa differenza fra le prese l'app avvisa (muro storto o fuori squadro)
var LATI = [['sopra', 'Sopra'], ['sx', 'Sinistra'], ['dx', 'Destra'], ['sotto', 'Sotto']];
var PROFILI_LATO = [['', '—'], ['Z', 'Z'], ['L', 'L'], ['T', 'T'], ['nessuno', 'Nessuno / a muro']];
var CON_TELAIO = ['serramento', 'veranda', 'porta_blindata', 'porta_ferro', 'portone_palazzo', 'sportello_alluminio'];

/* ── Disegni standard ────────────────────────────────────────────────── */
var TEMPLATES = {
  finestra1: { nome: 'Finestra 1 anta', draw: rectAnta(1) },
  finestra2: { nome: 'Finestra 2 ante', draw: rectAnta(2) },
  ribalta: { nome: 'Anta-ribalta', draw: drawRibalta },
  pf1: { nome: 'Portafinestra 1 anta', draw: rectAnta(1) },
  pf2: { nome: 'Portafinestra 2 ante', draw: rectAnta(2) },
  scorrevole: { nome: 'Scorrevole 2 ante', draw: drawScorrevole },
  fisso: { nome: 'Fisso', draw: drawFisso },
  persiana: { nome: 'Persiana', draw: drawPersiana },
  tappcass: { nome: 'Cassonetto + tapparella', draw: drawTappCass }
};
function cornice(ctx, w, h) { var m = Math.min(w, h) * 0.12; ctx.strokeRect(m, m, w - 2 * m, h - 2 * m); return { x: m, y: m, W: w - 2 * m, H: h - 2 * m }; }
function rectAnta(n) {
  return function (ctx, w, h) {
    var f = cornice(ctx, w, h), seg = f.W / n;
    for (var i = 0; i < n; i++) {
      var cx = f.x + seg * i; ctx.strokeRect(cx, f.y, seg, f.H);
      ctx.beginPath(); ctx.moveTo(cx, f.y + f.H); ctx.lineTo(cx + seg / 2, f.y); ctx.lineTo(cx + seg, f.y + f.H); ctx.stroke();
    }
  };
}
function drawRibalta(ctx, w, h) {
  var f = cornice(ctx, w, h); ctx.beginPath(); ctx.moveTo(f.x, f.y + f.H); ctx.lineTo(f.x + f.W / 2, f.y); ctx.lineTo(f.x + f.W, f.y + f.H); ctx.stroke();
  ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.W / 2, f.y + f.H); ctx.lineTo(f.x + f.W, f.y); ctx.stroke(); ctx.setLineDash([]);
}
function freccia(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  var a = Math.atan2(y2 - y1, x2 - x1), s = ctx.lineWidth * 4;
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s * Math.cos(a - 0.4), y2 - s * Math.sin(a - 0.4));
  ctx.moveTo(x2, y2); ctx.lineTo(x2 - s * Math.cos(a + 0.4), y2 - s * Math.sin(a + 0.4)); ctx.stroke();
}
function drawScorrevole(ctx, w, h) {
  var f = cornice(ctx, w, h); ctx.strokeRect(f.x, f.y, f.W / 2, f.H); ctx.strokeRect(f.x + f.W / 2, f.y, f.W / 2, f.H);
  var my = f.y + f.H / 2; freccia(ctx, f.x + f.W * 0.2, my, f.x + f.W * 0.45, my); freccia(ctx, f.x + f.W * 0.8, my, f.x + f.W * 0.55, my);
}
function drawFisso(ctx, w, h) { var f = cornice(ctx, w, h); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.W, f.y + f.H); ctx.moveTo(f.x + f.W, f.y); ctx.lineTo(f.x, f.y + f.H); ctx.stroke(); }
function drawPersiana(ctx, w, h) {
  var f = cornice(ctx, w, h), n = 8;
  for (var i = 1; i < n; i++) { var yy = f.y + f.H * i / n; ctx.beginPath(); ctx.moveTo(f.x, yy); ctx.lineTo(f.x + f.W, yy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(f.x + f.W / 2, f.y); ctx.lineTo(f.x + f.W / 2, f.y + f.H); ctx.stroke();
}
function drawTappCass(ctx, w, h) {
  var m = Math.min(w, h) * 0.12, x = m, W = w - 2 * m, boxH = (h - 2 * m) * 0.18;
  ctx.strokeRect(x, m, W, boxH);
  var fy = m + boxH + ctx.lineWidth * 2, fH = h - 2 * m - boxH - ctx.lineWidth * 2; ctx.strokeRect(x, fy, W, fH);
  for (var i = 1; i < 6; i++) { var yy = fy + fH * i / 6; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + W, yy); ctx.stroke(); }
}
function disegnaModello(ctx, key, w, h) {
  if (!TEMPLATES[key]) return;
  ctx.save(); ctx.strokeStyle = '#2f6fd0'; ctx.lineWidth = Math.max(1.5, Math.min(w, h) / 220); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  TEMPLATES[key].draw(ctx, w, h); ctx.restore();
}

/* ── Categorie della tipologia (invariate) ───────────────────────────── */
function categoria(tipo) {
  // minuscole, spazi doppi tolti; ogni parola cerca anche il plurale (finestra/finestre, cancello/cancelli…)
  var t = (tipo || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t) return 'seleziona';
  var ha = function (re) { return re.test(t); };
  if (ha(/riparaz|^altr[oi]$|carter|grondai|lattoneri|^controtela|elementi particolari|serratur|cilindr|assistenz|modific|sopralluog/)) return 'varie';
  if (ha(/^cassonett[oi]$/)) return 'cassonetto_solo';
  if (ha(/mobil[ei]|copricaldai|scarpier|armadi/)) return 'mobili_alluminio';
  if (ha(/sportell/)) return 'sportello_alluminio';
  if (ha(/verand/)) return 'veranda';
  if (ha(/blindat/)) return 'porta_blindata';
  if (ha(/porton/)) return 'portone_palazzo';
  if (ha(/port[ae]/) && ha(/ferr/)) return 'porta_ferro';
  if (ha(/zanzarier|tapparell|serrand|tend[ae]|persian|venezian/)) return 'accessori';
  if (ha(/cancell|grat[ae]\b|inferriat|grigli|ringhier|parapett|copertur|tettoi|pensilin/)) return 'ferro_esterno';
  return 'serramento';
}
function haCassonetto(it) { var c = categoria(it.tipologia); return c === 'cassonetto_solo' || ((c === 'serramento' || c === 'veranda') && it.cassonetto === 'si'); }

/* ── Utilità ─────────────────────────────────────────────────────────── */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function ic(n, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
function oggiISO() { var d = new Date(), z = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function dataIt(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
function quando(ts) {
  if (!ts) return ''; var d = new Date(ts), z = function (n) { return String(n).padStart(2, '0'); };
  var oggi = new Date(); var stessa = d.toDateString() === oggi.toDateString();
  return (stessa ? 'oggi' : z(d.getDate()) + '/' + z(d.getMonth() + 1)) + ' alle ' + z(d.getHours()) + ':' + z(d.getMinutes());
}
function nuovoId() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clona(o) { return JSON.parse(JSON.stringify(o)); }
function nomeSicuro(s) { return String(s || 'Cliente senza nome').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim() || 'Cliente senza nome'; }
function pz(it) { return parseInt(it.PZ, 10) || 0; }
function online() { return navigator.onLine !== false; }
function attendi(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function mediaSrc(m) { return m ? (m.img || m.bg || null) : null; }

/* ── Dati ────────────────────────────────────────────────────────────── */
function nuoviDati(rilevatore) {
  return { cliente: '', tel: '', email: '', wa: false, tg: false, via: '', citofono: '', tipoCliente: 'privato', referente: '',
    cantiereDiverso: false, viaCantiere: '', lat: null, lng: null, latCantiere: null, lngCantiere: null,
    piano: '', mezzoSalita: '', difficolta: '', notePosa: '',
    data: oggiISO(), rilevatore: rilevatore || '', destType: 'lead', destCommessa: '', items: [] };
}
function posizioneVuota() {
  return { pos: '', tipologia: '', serie: '', colore: '', vetri: '', telaio: '', apertura: '',
    hmaniglia: '', L: '', H: '', P: '', PZ: '1', nota: '', cassonetto: 'no', _confirm: true, soloRiparazione: false,
    misuraLuce: false, L_luce: '', H_luce: '', controtelaio: false, coprifili: false,
    tipoMisura: '', tipoMisuraAltro: '',
    trePrese: false, L_alto: '', L_centro: '', L_basso: '', H_sx: '', H_centro: '', H_dx: '', D1: '', D2: '',
    telaioLati: false, tl_sopra: '', tl_sx: '', tl_dx: '', tl_sotto: '', rf_sopra: '', rf_sx: '', rf_dx: '', rf_sotto: '',
    tipoManiglia: '', mensole: '', fondo: 'no', tetto: 'no', anteNoSim: '', hRinghiera: '',
    anteSimmetriche: 'si', sopralluceTipo: 'nessuno', sopralluceH: '', sottoluceH: '',
    modelloPorta: '', modelloSerratura: '', tipoDefender: '', coloreFerramenta: '',
    ferramentaDiversa: false, coloreFerrInt: '', coloreFerrEst: '',
    pannelloEst: false, pannelloEstColore: '', pannelloEstSpessore: '', pannelloInt: false, pannelloIntColore: '', pannelloIntSpessore: '',
    spioncino: '', tipoFissaggio: '', chiusuraSuppl: false, doppiaSerratura: false, chiudiportaAereo: false,
    manigliaInt: '', manigliaEst: '', numChiavi: '', decorazioneVetriIndirizzo: false, decorazioneTesto: '', pulsantieraCitofono: false, serraturaChiave: false,
    cas: { L: '', L_spigoli: '', L_infisso: '', H: '', P: '', P_dx: '', P_sx: '', PZ: '', tipo: '', manovra: '', note: '', foto: [], disegno: null },
    foto: [], disegno: null };
}
/* porta i dati salvati dalle versioni precedenti alla forma attuale */
function normalizza(s) {
  if (!s || typeof s !== 'object') return nuoviDati();
  var base = nuoviDati();
  Object.keys(base).forEach(function (k) { if (s[k] === undefined) s[k] = base[k]; });
  if (!s.citofono && s.vianote) s.citofono = s.vianote;
  if (!Array.isArray(s.items)) s.items = [];
  var def = posizioneVuota();
  s.items.forEach(function (it) {
    Object.keys(def).forEach(function (k) { if (it[k] === undefined) it[k] = clona(def[k]); });
    if (!Array.isArray(it.foto)) it.foto = it.foto ? [it.foto] : [];
    if (!it.cas || typeof it.cas !== 'object') it.cas = clona(def.cas);
    Object.keys(def.cas).forEach(function (k) { if (it.cas[k] === undefined) it.cas[k] = clona(def.cas[k]); });
    if (!it.cas.L_spigoli && it.cas.L) it.cas.L_spigoli = it.cas.L;
    if (!it.cas.P_dx && it.cas.P) it.cas.P_dx = it.cas.P;
    if (!Array.isArray(it.cas.foto)) it.cas.foto = it.cas.foto ? [it.cas.foto] : [];
  });
  return s;
}

var rec = null;        // il rilievo aperto { id, createdAt, updatedAt, data }
var S = null;          // = rec.data (abbreviazione, come «state» della versione vecchia)
var imp = { cartellaBase: BASE_PREDEFINITA, fotoJpg: true, rilevatore: '' };
var rubrica = [];
var commesse = COMMESSE_PREDEFINITE.slice();
var memoriaOk = true;

/* ── Memoria: IndexedDB, con riserva in RAM se il browser la nega ──────── */
function memoriaDiRiserva() {
  memoriaOk = false;
  var m = {}; DFStore.STORES.forEach(function (s) { m[s] = new Map(); });
  var keyOf = function (st, val, key) { return key !== undefined ? key : val.id; };
  DFStore.store.get = function (st, k) { return Promise.resolve(m[st].get(k)); };
  DFStore.store.getAll = function (st) { return Promise.resolve(Array.from(m[st].values())); };
  DFStore.store.count = function (st) { return Promise.resolve(m[st].size); };
  DFStore.store.put = function (st, v, k) { m[st].set(keyOf(st, v, k), v); return Promise.resolve(v); };
  DFStore.store.del = function (st, k) { m[st].delete(k); return Promise.resolve(); };
  DFStore.kvGet = function (k) { return DFStore.store.get('kv', k); };
  DFStore.kvSet = function (k, v) { return DFStore.store.put('kv', v, k); };
}
var db = function () { return DFStore.store; };
function kvGet(k) { return DFStore.kvGet(k); }
function kvSet(k, v) { return DFStore.kvSet(k, v); }

/* la versione 2 teneva tutto in localStorage: si porta qui una volta sola */
function migraDallaV2() {
  return kvGet('migrazioneV2').then(function (fatto) {
    if (fatto) return null;
    var lavori = [];
    var vecchio = null;
    try { vecchio = JSON.parse(localStorage.getItem('df_rilievo_v2')); } catch (e) { vecchio = null; }
    var idImportato = null;
    if (vecchio && (vecchio.cliente || (vecchio.items && vecchio.items.length))) {
      idImportato = nuovoId();
      var dati = normalizza(vecchio);
      lavori.push(db().put('rilievi', { id: idImportato, createdAt: Date.now(), updatedAt: Date.now(), data: dati }));
    }
    try { var rb = JSON.parse(localStorage.getItem('df_rubrica')); if (Array.isArray(rb) && rb.length) lavori.push(kvSet('rubrica', rb)); } catch (e) {}
    try { var cm = JSON.parse(localStorage.getItem('df_commesse_list')); if (Array.isArray(cm) && cm.length) lavori.push(kvSet('commesse', cm)); } catch (e) {}
    try { var dc = JSON.parse(localStorage.getItem('df_dropbox_cfg')); if (dc && dc.refresh) lavori.push(kvSet('dbx', { key: dc.key, refresh: dc.refresh })); } catch (e) {}
    return Promise.all(lavori).then(function () {
      return Promise.all([idImportato ? kvSet('aperto', idImportato) : null, kvSet('migrazioneV2', Date.now())]);
    }).then(function () {
      // spazio liberato solo dopo che la copia nuova è al sicuro
      try { localStorage.removeItem('df_rilievo_v2'); } catch (e) {}
      return idImportato;
    });
  });
}

var timerSalva = null, salvataggioInCorso = null;
function salvaPresto() {
  rec.updatedAt = Date.now();
  statoSalvataggio('salvo');
  clearTimeout(timerSalva);
  timerSalva = setTimeout(salvaOra, 500);
}
function salvaOra() {
  clearTimeout(timerSalva);
  if (!rec) return Promise.resolve();
  var copia = rec;
  salvataggioInCorso = db().put('rilievi', copia).then(function () {
    statoSalvataggio('ok');
    aggiornaRiepilogoStato();
  }, function (e) {
    statoSalvataggio('errore');
    avviso('Non riesco a salvare sul telefono: ' + (e && e.name === 'QuotaExceededError' ? 'memoria piena' : (e && e.message || 'errore')) + '. Fai un backup dalle impostazioni.', 'errore', 8000);
  });
  return salvataggioInCorso;
}
function statoSalvataggio(st) {
  var el = $('#statoSalvataggio'); if (!el) return;
  var t = el.querySelector('.testo');
  if (st === 'errore') { el.dataset.stato = 'errore'; t.textContent = 'Non salvato'; return; }
  if (!memoriaOk) { el.dataset.stato = 'errore'; t.textContent = 'Memoria assente'; return; }
  if (st === 'salvo') { el.dataset.stato = online() ? '' : 'offline'; t.textContent = 'Salvo…'; return; }
  el.dataset.stato = online() ? '' : 'offline';
  t.textContent = online() ? 'Salvato' : 'Offline';
}

function apriRilievo(id) {
  return db().get('rilievi', id).then(function (r) {
    if (!r) return false;
    r.data = normalizza(r.data);
    rec = r; S = r.data;
    return kvSet('aperto', id).then(function () { disegnaTutto(); window.scrollTo(0, 0); return true; });
  });
}
function creaRilievo() {
  var r = { id: nuovoId(), createdAt: Date.now(), updatedAt: Date.now(), data: nuoviDati(imp.rilevatore) };
  return db().put('rilievi', r).then(function () { rec = r; S = r.data; return kvSet('aperto', r.id); }).then(function () { disegnaTutto(); window.scrollTo(0, 0); });
}
function rilievoVuoto(r) { var d = r && r.data; return !d || (!d.cliente && !d.tel && !d.via && !(d.items && d.items.length)); }

/* ── Avvisi, dialoghi, pannelli ──────────────────────────────────────── */
var timerAvviso = null;
function avviso(testo, tipo, ms) {
  var el = $('#avviso');
  el.dataset.tipo = tipo || '';
  el.querySelector('use').setAttribute('href', '#i-' + (tipo === 'errore' ? 'avviso' : tipo === 'offline' ? 'offline' : 'check'));
  el.querySelector('span').textContent = testo;
  el.classList.add('su');
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(function () { el.classList.remove('su'); }, ms || 2600);
}

/* tasto «indietro» del telefono: chiude la finestra aperta invece di uscire dall'app.
   Una sola voce «di guardia» nella cronologia mentre c'è qualcosa aperto: niente
   history.back() da codice, che con finestre aperte una dopo l'altra può
   portare fuori dall'app. */
function spingiStoria() { try { if (!(history.state && history.state.dfGuardia)) history.pushState({ dfGuardia: 1 }, ''); } catch (e) {} }
function tornaStoria() {}
function qualcosaAperto() { return pilaOverlay.length > 0 || !$('#editor').hidden || !$('#mappa').hidden; }
window.addEventListener('popstate', function () {
  if (history.state && history.state.dfGuardia) return;
  if (pilaOverlay.length) chiudiOverlay(null, undefined, true);
  else if (!$('#editor').hidden) indietroEditor();
  else if (!$('#mappa').hidden) chiudiMappa(true);
  if (qualcosaAperto()) spingiStoria();
});

var pilaOverlay = [];
function apriOverlay(el, tipo) {
  var velo = document.createElement('div'); velo.className = 'velo';
  document.body.appendChild(velo); document.body.appendChild(el);
  document.body.classList.add('bloccato');
  var voce = { el: el, velo: velo, tipo: tipo, onClose: null };
  pilaOverlay.push(voce);
  spingiStoria();
  velo.addEventListener('click', function () { chiudiOverlay(voce); });
  requestAnimationFrame(function () { velo.classList.add('aperto'); el.classList.add('aperto'); });
  return voce;
}
function chiudiOverlay(voce, valore, daStoria) {
  if (!voce) voce = pilaOverlay[pilaOverlay.length - 1];
  if (!voce || voce.chiuso) return;
  voce.chiuso = true;
  voce.el.style.pointerEvents = 'none'; voce.velo.style.pointerEvents = 'none'; // non blocca i tocchi mentre sfuma
  if (!daStoria) tornaStoria();
  pilaOverlay = pilaOverlay.filter(function (v) { return v !== voce; });
  voce.el.classList.remove('aperto'); voce.velo.classList.remove('aperto');
  setTimeout(function () { voce.el.remove(); voce.velo.remove(); }, 380);
  if (!pilaOverlay.length && $('#editor').hidden && $('#mappa').hidden) document.body.classList.remove('bloccato');
  if (voce.onClose) voce.onClose(valore);
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if (comboAperta) chiudiCombo(); else if (pilaOverlay.length) chiudiOverlay(); }
});

/* dialogo al centro; restituisce una promessa col valore dell'azione scelta */
function dialogo(o) {
  return new Promise(function (resolve) {
    var el = document.createElement('div');
    el.className = 'dialogo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<button class="chiudi" type="button" aria-label="Chiudi">' + ic('x', 'ico-s') + '</button>' +
      (o.titolo ? '<h2>' + esc(o.titolo) + '</h2>' : '') + (o.testo ? '<p class="testo">' + o.testo + '</p>' : '') + (o.html || '') +
      '<div class="dialogo-azioni">' + (o.azioni || [{ v: true, t: 'OK', cls: 'btn-primary' }]).map(function (a, k) {
        return '<button type="button" class="btn ' + (a.cls || 'btn-secondary') + '" data-az="' + k + '">' + (a.ico ? ic(a.ico, 'ico-s') : '') + esc(a.t) + '</button>';
      }).join('') + '</div>';
    var voce = apriOverlay(el, 'dialogo');
    voce.onClose = function (v) { resolve(v === undefined ? null : v); };
    el.querySelector('.chiudi').onclick = function () { chiudiOverlay(voce, null); };
    $$('[data-az]', el).forEach(function (b) {
      b.onclick = function () {
        var a = o.azioni[+b.dataset.az];
        if (a.prima) { var ok = a.prima(el); if (ok === false) return; }
        if (a.fai) { a.fai(el); if (a.resta) return; } // azioni che devono partire dal tocco (condividi, scarica)
        chiudiOverlay(voce, a.v);
      };
    });
    if (o.dopo) o.dopo(el, voce);
  });
}
function conferma(titolo, testo, si) {
  var rosso = /^(Elimina|Togli|Pulisci|Scollega|Esci)/.test(si || '');
  return dialogo({ titolo: titolo, testo: testo, azioni: [{ v: false, t: 'Annulla' }, { v: true, t: si || 'Conferma', cls: rosso ? 'btn-primary btn-rosso' : 'btn-primary' }] });
}
function pannello(titolo, corpoHtml, piedeHtml) {
  var el = document.createElement('aside');
  el.className = 'pannello'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', titolo);
  el.innerHTML = '<div class="pannello-testa"><h2>' + esc(titolo) + '</h2><button class="chiudi" type="button" aria-label="Chiudi">' + ic('x', 'ico-s') + '</button></div>' +
    '<div class="pannello-corpo">' + corpoHtml + '</div>' + (piedeHtml ? '<div class="pannello-piede">' + piedeHtml + '</div>' : '');
  var voce = apriOverlay(el, 'pannello');
  el.querySelector('.chiudi').onclick = function () { chiudiOverlay(voce); };
  return voce;
}

/* ── Disegno della pagina ────────────────────────────────────────────── */
function disegnaTutto() { disegnaTestata(); disegnaPosizioni(); aggiornaRiepilogoStato(); statoSalvataggio('ok'); }

function disegnaTestata() {
  $$('[data-h]').forEach(function (el) { var v = S[el.dataset.h]; el.value = v == null ? '' : v; el.removeAttribute('aria-invalid'); });
  if (!S.data) { S.data = oggiISO(); $('#c_data').value = S.data; }
  $$('[data-hchk]').forEach(function (el) { el.checked = !!S[el.dataset.hchk]; });
  aggiornaTipoCliente(); aggiornaTitolo(); aggiornaCantiere(); aggiornaNoteIndirizzo(); aggiornaDifficolta();
}
function aggiornaTitolo() {
  $('#titoloCliente').textContent = S.cliente.trim() || 'Nuovo rilievo';
  $('#eyebrowRilievo').textContent = 'Rilievo del ' + (dataIt(S.data) || dataIt(oggiISO()));
}
function aggiornaTipoCliente() {
  $$('.seg [data-tipo]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tipo === S.tipoCliente)); });
  var w = $('#referenteWrap'), l = $('#referenteLabel'), inp = $('#c_referente');
  if (S.tipoCliente === 'azienda') { w.hidden = false; l.textContent = 'Referente / contatto'; inp.placeholder = 'Es. referente della ditta'; }
  else if (S.tipoCliente === 'rivenditore') { w.hidden = false; l.textContent = 'Cliente finale del rivenditore'; inp.placeholder = 'Es. nome del cliente finale'; }
  else w.hidden = true;
}
function aggiornaDifficolta() { $$('[data-diff]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.diff === S.difficolta)); }); }
$$('[data-diff]').forEach(function (b) {
  b.onclick = function () { S.difficolta = S.difficolta === b.dataset.diff ? '' : b.dataset.diff; aggiornaDifficolta(); salvaPresto(); };
});
function aggiornaCantiere() { $('#cantiereWrap').hidden = !S.cantiereDiverso; }
function linkMappa(lat, lng) { return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng; }
function aggiornaNoteIndirizzo() {
  [['via', 'lat', 'lng'], ['viaCantiere', 'latCantiere', 'lngCantiere']].forEach(function (k) {
    var n = $('#nota_' + k[0]); if (!n) return;
    var lat = S[k[1]], lng = S[k[2]];
    if (lat && lng) n.innerHTML = 'Posizione salvata · <a href="' + linkMappa(lat, lng) + '" target="_blank" rel="noopener">apri in Maps</a>' +
      (/^GPS /.test(S[k[0]] || '') ? ' · l\'indirizzo lo completo quando torna la linea' : '');
    else n.textContent = '';
  });
}

function reqMark(r) { return r === 1 || r === true ? ' <i class="req">*</i>' : r === 'f' ? ' <span class="facolt">(facolt.)</span>' : ''; }
function idc(i, f, cf) { return 'f' + i + (cf ? 'c' : '') + '_' + f; }
function campoTesto(it, i, f, label, req, ph, cls) {
  return '<div class="campo' + (cls ? ' ' + cls : '') + '"><label for="' + idc(i, f) + '">' + label + reqMark(req) + '</label>' +
    '<input id="' + idc(i, f) + '" data-f="' + f + '" data-i="' + i + '" value="' + esc(it[f]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off"></div>';
}
function campoLista(it, i, f, label, chiave, req, ph, attr) {
  var k = chiave === 'dl' ? f : chiave;
  return '<div class="campo"' + (attr || '') + '><label for="' + idc(i, f) + '">' + label + reqMark(req) + '</label><div class="combo">' +
    '<input id="' + idc(i, f) + '" data-f="' + f + '" data-i="' + i + '" data-dd="' + k + '" value="' + esc(it[f]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') +
    ' autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list">' +
    '<button type="button" class="combo-freccia" tabindex="-1" aria-label="Mostra tutte le voci">' + ic('giu', 'ico-s') + '</button>' +
    '<div class="combo-menu" role="listbox" hidden></div></div></div>';
}
function campoNum(it, i, f, label, req, cf, ph, extra) {
  var v = cf ? it.cas[f] : it[f];
  return '<div class="campo"><label for="' + idc(i, f, cf) + '">' + label + reqMark(req) + '</label>' +
    '<input id="' + idc(i, f, cf) + '" ' + (cf ? 'data-cf' : 'data-f') + '="' + f + '" data-i="' + i + '" value="' + esc(v) + '" inputmode="numeric" autocomplete="off"' +
    (ph ? ' placeholder="' + esc(ph) + '"' : '') + (extra || '') + '></div>';
}
/* tre prese per lato: la misura da usare è la minima; avvisi se le prese o le diagonali differiscono */
function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) || n <= 0 ? null : n; }
function arrot(n) { return Math.round(n * 10) / 10; }
function analisiPrese(it) {
  var L = PRESE_L.map(function (f) { return num(it[f]); }).filter(function (n) { return n != null; });
  var H = PRESE_H.map(function (f) { return num(it[f]); }).filter(function (n) { return n != null; });
  var d1 = num(it.D1), d2 = num(it.D2);
  var r = { Lmin: L.length ? Math.min.apply(null, L) : null, Hmin: H.length ? Math.min.apply(null, H) : null,
    dL: L.length > 1 ? arrot(Math.max.apply(null, L) - Math.min.apply(null, L)) : 0,
    dH: H.length > 1 ? arrot(Math.max.apply(null, H) - Math.min.apply(null, H)) : 0,
    dD: d1 != null && d2 != null ? arrot(Math.abs(d1 - d2)) : null, avvisi: [] };
  if (r.dL > SOGLIA_MM) r.avvisi.push('le 3 larghezze differiscono di ' + r.dL + ' mm');
  if (r.dH > SOGLIA_MM) r.avvisi.push('le 3 altezze differiscono di ' + r.dH + ' mm');
  if (r.dD != null && r.dD > SOGLIA_MM) r.avvisi.push('fuori squadro: le diagonali differiscono di ' + r.dD + ' mm');
  return r;
}
function calcolaPrese(it) {
  var a = analisiPrese(it);
  it.L = a.Lmin == null ? '' : String(a.Lmin); it.H = a.Hmin == null ? '' : String(a.Hmin);
  return a;
}
function esitoPrese(it) {
  var a = analisiPrese(it), s = '';
  if (a.Lmin != null || a.Hmin != null) s += '<p class="prese-riepilogo"><span class="tecnico">L ' + (a.Lmin != null ? a.Lmin : '–') + ' × H ' + (a.Hmin != null ? a.Hmin : '–') + ' mm</span> · è la misura minima, quella che va in L e H' +
    (a.dD != null ? ' · diagonali: differenza <span class="tecnico">' + a.dD + ' mm</span>' : '') + '</p>';
  if (a.avvisi.length) s += '<p class="avviso-misure">' + ic('avviso', 'ico-s') + '<span>Attenzione: ' + a.avvisi.join('; ') + '. Controlla muro e squadro prima di andare via.</span></p>';
  return s;
}
function bloccoTrePrese(it, i) {
  return '<div class="blocco"><p class="blocco-titolo">Tre prese per lato<button type="button" class="btn btn-ghost btn-piccolo" data-act="prese-uguali" data-i="' + i + '" style="margin-left:auto">Tutte uguali alla prima</button></p>' +
    '<div class="campi g3 misure">' + campoNum(it, i, 'L_alto', 'L alto', 1) + campoNum(it, i, 'L_centro', 'L centro', 1) + campoNum(it, i, 'L_basso', 'L basso', 1) + '</div>' +
    '<div class="campi g3 misure" style="margin-top:12px">' + campoNum(it, i, 'H_sx', 'H sinistra', 1) + campoNum(it, i, 'H_centro', 'H centro', 1) + campoNum(it, i, 'H_dx', 'H destra', 1) + '</div>' +
    '<div class="campi misure" style="margin-top:12px">' + campoNum(it, i, 'D1', 'Diagonale 1', 'f') + campoNum(it, i, 'D2', 'Diagonale 2', 'f') + '</div>' +
    '<div data-esito-prese="' + i + '">' + esitoPrese(it) + '</div></div>';
}
function bloccoTipoMisura(it, i, req) {
  return '<div class="campi g1" style="margin-top:12px"><div class="campo"><span class="etichetta">Che misura hai preso?' + reqMark(req) + '</span>' +
    '<div class="seg seg-misura" role="group" aria-label="Tipo di misura" data-tm-gruppo="' + i + '">' +
    TIPI_MISURA.map(function (t) { return '<button type="button" data-tm="' + t[0] + '" data-i="' + i + '" aria-pressed="' + (it.tipoMisura === t[0]) + '">' + t[1] + '<small>' + t[2] + '</small></button>'; }).join('') + '</div>' +
    (it.tipoMisura === 'altro' ? '<input id="' + idc(i, 'tipoMisuraAltro') + '" data-f="tipoMisuraAltro" data-i="' + i + '" value="' + esc(it.tipoMisuraAltro) + '" placeholder="Es. misure interne a parte la falda" autocomplete="off" aria-label="Che misura hai preso">' : '') +
    '</div></div>';
}
function bloccoTelaioLati(it, i, r) {
  return '<div class="blocco"><p class="blocco-titolo">Telaio lato per lato</p><div class="campi">' +
    LATI.map(function (l) { return campoSel(it, i, 'tl_' + l[0], l[1] + ' · profilo', PROFILI_LATO, r) + campoNum(it, i, 'rf_' + l[0], l[1] + ' · rifilo mm', 0, false, 'nessuno'); }).join('') +
    '</div><p class="campo-nota" style="margin-top:8px">Il rifilo vuoto vuol dire «nessun rifilo» su quel lato.</p></div>';
}
function campoSel(it, i, f, label, opzioni, req, cf) {
  var v = cf ? it.cas[f] : it[f];
  return '<div class="campo"><label for="' + idc(i, f, cf) + '">' + label + reqMark(req) + '</label><select id="' + idc(i, f, cf) + '" ' + (cf ? 'data-cf' : 'data-f') + '="' + f + '" data-i="' + i + '">' +
    opzioni.map(function (o) { var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (v === val ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') +
    '</select></div>';
}
var SPUNTA = '<span class="spunta"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>';
function chip(it, i, f, label) {
  return '<label class="chip' + (it[f] ? ' on' : '') + '"><input type="checkbox" data-fchk="' + f + '" data-i="' + i + '"' + (it[f] ? ' checked' : '') + '>' + SPUNTA + label + '</label>';
}
var SI_NO = [['no', 'No'], ['si', 'Sì']];

function campiPosizione(it, i) {
  var cat = categoria(it.tipologia);
  if (cat === 'seleziona') return '<div class="invito">Scegli o scrivi la <b>tipologia</b> per compilare misure e dettagli.</div>';
  var isOpt = cat === 'varie' || !!it.soloRiparazione;
  var rq = isOpt ? 'f' : 1;              // obbligatorio, o facoltativo se è una riparazione
  var rF = isOpt ? 0 : 1;
  var conProf = ['mobili_alluminio', 'veranda', 'sportello_alluminio'].indexOf(cat) >= 0;
  var profObblig = cat === 'mobili_alluminio' && !isOpt;
  var h = '';

  if (cat === 'cassonetto_solo') {
    h += '<div class="campi g3 misure">' + campoNum(it, i, 'L_spigoli', 'L spigoli', rq, true) + campoNum(it, i, 'L_infisso', 'L infisso', rq, true) + campoNum(it, i, 'H', 'H', rq, true) + '</div>' +
      '<div class="campi g3 misure" style="margin-top:12px">' + campoNum(it, i, 'P_dx', 'Prof. DX', rq, true) + campoNum(it, i, 'P_sx', 'Prof. SX', 0, true, '= DX') + campoNum(it, i, 'PZ', 'Pezzi', 1) + '</div>' +
      '<p class="campo-nota" style="margin-top:6px">Misure in millimetri. Se la profondità SX è uguale alla DX lasciala vuota.</p>';
  } else {
    var calc = it.trePrese ? ' readonly tabindex="-1" class="calcolato"' : '';
    h += '<div class="campi ' + (conProf ? '' : 'g3') + ' misure">' + campoNum(it, i, 'L', it.trePrese ? 'L mm · minima' : 'L mm', rq, false, '', calc) + campoNum(it, i, 'H', it.trePrese ? 'H mm · minima' : 'H mm', rq, false, '', calc) +
      (conProf ? campoNum(it, i, 'P', 'P mm', profObblig ? 1 : 'f') : '') + campoNum(it, i, 'PZ', 'Pezzi', 1) + '</div>';
    h += bloccoTipoMisura(it, i, rq);
  }

  h += '<div class="scelte" style="margin-top:12px">' + (cat !== 'cassonetto_solo' ? chip(it, i, 'trePrese', 'Tre prese per lato') : '') + chip(it, i, 'misuraLuce', 'Misura luce') +
    (cat !== 'varie' ? chip(it, i, 'soloRiparazione', 'Solo riparazione / parziale') : '') + '</div>';
  if (it.trePrese && cat !== 'cassonetto_solo') h += bloccoTrePrese(it, i);
  if (it.misuraLuce) h += '<div class="blocco"><p class="blocco-titolo">Misura luce</p><div class="campi misure">' + campoNum(it, i, 'L_luce', 'L luce mm', 1) + campoNum(it, i, 'H_luce', 'H luce mm', 1) + '</div></div>';

  var hman = function (stella, ph) { return '<div class="campo"><label for="' + idc(i, 'hmaniglia') + '">H maniglia' + reqMark(stella) + '</label><input id="' + idc(i, 'hmaniglia') + '" data-f="hmaniglia" data-i="' + i + '" value="' + esc(it.hmaniglia) + '" placeholder="' + (ph || 'mm o cm da terra') + '" autocomplete="off"></div>'; };
  var dett = '<h3 class="sez-titolo">Dettagli</h3>';

  if (cat === 'serramento') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'vetri', 'Vetri', 'dl', rF) + campoLista(it, i, 'telaio', 'Telaio', 'dl', rF) + campoLista(it, i, 'apertura', 'Apertura', 'dl', rF) + hman(rq) +
      campoSel(it, i, 'cassonetto', 'Cassonetto', SI_NO, rq) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'controtelaio', 'Controtelaio presente') + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>' +
      (it.cassonetto === 'si' ? bloccoCassonetto(it, i, rF) : '');
  } else if (cat === 'mobili_alluminio') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'vetri', 'Vetri e pannelli', 'dl', rF) + campoLista(it, i, 'apertura', 'Apertura', 'dl', rF) + hman(rq) +
      campoLista(it, i, 'tipoManiglia', 'Tipo maniglia', 'tipoManiglia', 0) +
      campoTesto(it, i, 'mensole', 'Mensole (quantità / note)', 0, 'Es. 3 mensole interne') + campoTesto(it, i, 'anteNoSim', 'Ante non simmetriche (misure)', 0, 'Misura anta se asimmetrica') +
      campoSel(it, i, 'fondo', 'Fondo', SI_NO, 1) + campoSel(it, i, 'tetto', 'Tetto', SI_NO, 1) + campoNum(it, i, 'hRinghiera', 'H ringhiera (se serve)', 0, false, 'mm') + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
  } else if (cat === 'veranda') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'vetri', 'Vetri / pannelli', 'dl', rF) + campoLista(it, i, 'telaio', 'Telaio', 'dl', rF) + campoLista(it, i, 'apertura', 'Apertura', 'dl', rF) + hman(0) +
      campoNum(it, i, 'hRinghiera', 'H ringhiera (se serve)', 0, false, 'mm') + campoTesto(it, i, 'anteNoSim', 'Ante simmetriche / misure ante', 0, 'Sì, oppure le misure') +
      campoSel(it, i, 'sopralluceTipo', 'Sopralluce', [['nessuno', 'Nessuno'], ['fisso', 'Fisso'], ['apribile', 'Apribile']], 0) +
      campoNum(it, i, 'sopralluceH', 'Altezza sopralluce mm', 0) + campoNum(it, i, 'sottoluceH', 'Altezza sottoluce mm', 0) +
      campoSel(it, i, 'cassonetto', 'Cassonetto', SI_NO, 0) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>' +
      (it.cassonetto === 'si' ? bloccoCassonetto(it, i, rF) : '');
  } else if (cat === 'cassonetto_solo') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoSel(it, i, 'tipo', 'Tipo cassonetto', [''].concat(OPZIONI.casTipo), rq, true) + campoSel(it, i, 'manovra', 'Manovra', [''].concat(OPZIONI.casManovra), 0, true) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
  } else if (cat === 'porta_blindata' || cat === 'porta_ferro') {
    var bl = cat === 'porta_blindata';
    h += dett + '<div class="campi">' + campoLista(it, i, 'modelloPorta', 'Modello', 'modelloPorta', rF) + campoLista(it, i, 'colore', bl ? 'Colore porta' : 'Colore', 'dl', rF) +
      campoLista(it, i, 'vetri', 'Vetri / pannelli / lamiere', 'dl', 0, '', bl ? ' data-vetri-bl' + (vetriBlindata(it) ? '' : ' hidden') : '') + campoLista(it, i, 'telaio', 'Telaio', 'dl', 0) +
      campoLista(it, i, 'apertura', 'Senso di apertura', 'dl', rF) + hman(0, 'mm da terra') +
      campoLista(it, i, 'modelloSerratura', 'Modello serratura', 'modelloSerratura', rF) + campoLista(it, i, 'tipoDefender', 'Tipo defender', 'tipoDefender', 0) +
      campoLista(it, i, 'coloreFerramenta', 'Colore ferramenta', 'colore', 0) + campoLista(it, i, 'spioncino', 'Spioncino', 'spioncino', 0) +
      campoLista(it, i, 'tipoFissaggio', 'Tipo di fissaggio', 'tipoFissaggio', 0) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + (bl ? chip(it, i, 'pannelloEst', 'Pannello esterno') + chip(it, i, 'pannelloInt', 'Pannello interno') : '') +
      chip(it, i, 'ferramentaDiversa', 'Ferramenta int/est diversa') + chip(it, i, 'chiusuraSuppl', 'Chiusura supplementare') + chip(it, i, 'doppiaSerratura', 'Doppia serratura') +
      chip(it, i, 'chiudiportaAereo', 'Chiudiporta aereo') + chip(it, i, 'controtelaio', 'Controtelaio') + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
    if (bl && it.pannelloEst) h += '<div class="blocco"><p class="blocco-titolo">Pannello esterno</p><div class="campi">' + campoTesto(it, i, 'pannelloEstColore', 'Colore / finitura', 1) + campoNum(it, i, 'pannelloEstSpessore', 'Spessore mm', 0) + '</div></div>';
    if (bl && it.pannelloInt) h += '<div class="blocco"><p class="blocco-titolo">Pannello interno</p><div class="campi">' + campoTesto(it, i, 'pannelloIntColore', 'Colore / finitura', 1) + campoNum(it, i, 'pannelloIntSpessore', 'Spessore mm', 0) + '</div></div>';
    if (it.ferramentaDiversa) h += bloccoFerramenta(it, i);
  } else if (cat === 'portone_palazzo') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'modelloPorta', 'Modello', 'modelloPorta', rF) + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', 0) +
      campoLista(it, i, 'colore', 'Colore', 'dl', rF) + campoLista(it, i, 'vetri', 'Vetri / pannelli / lamiere', 'dl', 0) + campoLista(it, i, 'telaio', 'Telaio', 'dl', 0) +
      campoLista(it, i, 'apertura', 'Senso di apertura', 'dl', rF) + hman(0, 'mm da terra') +
      campoLista(it, i, 'modelloSerratura', 'Modello serratura (es. esterna / a montante)', 'modelloSerratura', rF) +
      campoLista(it, i, 'manigliaInt', 'Maniglia interna', 'manigliaPortone', rF) + campoLista(it, i, 'manigliaEst', 'Maniglia esterna', 'manigliaPortone', rF) +
      campoNum(it, i, 'numChiavi', 'Copie delle chiavi', 0, false, 'Es. 12') + campoLista(it, i, 'coloreFerramenta', 'Colore ferramenta', 'colore', 0) +
      campoLista(it, i, 'spioncino', 'Spioncino', 'spioncino', 0) + campoLista(it, i, 'tipoFissaggio', 'Tipo di fissaggio', 'tipoFissaggio', 0) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'ferramentaDiversa', 'Ferramenta int/est diversa') + chip(it, i, 'chiudiportaAereo', 'Chiudiporta aereo') +
      chip(it, i, 'decorazioneVetriIndirizzo', 'Decorazioni vetri con indirizzo') + chip(it, i, 'pulsantieraCitofono', 'Pulsantiera citofonica') + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
    if (it.decorazioneVetriIndirizzo) h += '<div class="blocco"><p class="blocco-titolo">Decorazioni sui vetri</p><div class="campi g1">' +
      campoTesto(it, i, 'decorazioneTesto', 'Testo / numero civico da riportare', 0, 'Es. Via Roma 12 — numeri 10 e 12') + '</div></div>';
    if (it.ferramentaDiversa) h += bloccoFerramenta(it, i);
  } else if (cat === 'sportello_alluminio') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'telaio', 'Telaio', 'dl', 0) + campoLista(it, i, 'apertura', 'Apertura', 'dl', rF) + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'serraturaChiave', 'Serratura con chiave') + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
  } else if (cat === 'accessori') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / modello', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'telaio', 'Telaio / guida', 'dl', 'f') + campoLista(it, i, 'apertura', 'Apertura / comando', 'dl', 'f') + '</div>';
  } else if (cat === 'ferro_esterno') {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', rF) + campoLista(it, i, 'colore', 'Colore', 'dl', rF) +
      campoLista(it, i, 'telaio', 'Telaio / fissaggio', 'dl', 'f') + campoLista(it, i, 'apertura', 'Apertura', 'dl', 'f') + '</div>' +
      '<div class="scelte" style="margin-top:12px">' + chip(it, i, 'coprifili', 'Carter / coprifili') + '</div>';
  } else {
    h += dett + '<div class="campi">' + campoLista(it, i, 'serie', 'Serie / materiale', 'dl', 'f') + campoLista(it, i, 'colore', 'Colore', 'dl', 'f') + '</div>';
  }

  if (CON_TELAIO.indexOf(cat) >= 0) {
    h += '<div class="scelte" style="margin-top:8px">' + chip(it, i, 'telaioLati', 'Telaio lato per lato (Z / L e rifili)') + '</div>';
    if (it.telaioLati) h += bloccoTelaioLati(it, i, rF);
  }
  var notaObbl = cat === 'varie' || it.soloRiparazione;
  h += '<div class="campi g1" style="margin-top:12px"><div class="campo"><label for="' + idc(i, 'nota') + '">Nota' + reqMark(notaObbl ? 1 : 0) + '</label>' +
    '<textarea id="' + idc(i, 'nota') + '" data-f="nota" data-i="' + i + '" rows="2" placeholder="' + (notaObbl ? 'Descrivi l\'intervento da fare…' : 'Annotazioni per produzione e montaggio…') + '">' + esc(it.nota) + '</textarea></div></div>';

  h += '<h3 class="sez-titolo">Disegno e foto</h3><div class="media-griglia">' + miniatura(it.disegno, 'disegno', i) +
    it.foto.map(function (m, j) { return miniaturaFoto(m, 'foto', i, j); }).join('') +
    '<button type="button" class="media media-vuoto" data-act="addfoto" data-i="' + i + '">' + ic('camera') + 'Foto</button></div>';
  return h;
}
/* blindata cieca (1 o 2 ante senza sopralluce né laterali): niente vetri */
function vetriBlindata(it) { var m = (it.modelloPorta || '').toLowerCase(); return !m.trim() || /sopralluce|laterale|vetr/.test(m); }
function bloccoFerramenta(it, i) {
  return '<div class="blocco"><p class="blocco-titolo">Colore ferramenta</p><div class="campi">' + campoLista(it, i, 'coloreFerrInt', 'Interna', 'colore', 1) + campoLista(it, i, 'coloreFerrEst', 'Esterna', 'colore', 1) + '</div></div>';
}
function bloccoCassonetto(it, i, rF) {
  var r = rF ? 1 : 0;
  return '<div class="blocco"><p class="blocco-titolo">Dettaglio cassonetto</p>' +
    '<div class="campi g3 misure">' + campoNum(it, i, 'L_spigoli', 'L spigoli', r, true) + campoNum(it, i, 'L_infisso', 'L infisso', r, true) + campoNum(it, i, 'H', 'H', r, true) + '</div>' +
    '<div class="campi g3 misure" style="margin-top:12px">' + campoNum(it, i, 'P_dx', 'Prof. DX', r, true) + campoNum(it, i, 'P_sx', 'Prof. SX', 0, true, '= DX') + campoNum(it, i, 'PZ', 'Pezzi', r, true) + '</div>' +
    '<div class="campi" style="margin-top:12px">' + campoSel(it, i, 'tipo', 'Tipo cassonetto', [''].concat(OPZIONI.casTipo), r, true) +
    campoSel(it, i, 'manovra', 'Manovra', [''].concat(OPZIONI.casManovra), 0, true) +
    '<div class="campo campo-largo"><label for="' + idc(i, 'note', true) + '">Note cassonetto</label><input id="' + idc(i, 'note', true) + '" data-cf="note" data-i="' + i + '" value="' + esc(it.cas.note) + '" autocomplete="off"></div></div>' +
    '<p class="sez-titolo" style="margin-top:16px">Disegno e foto del cassonetto</p><div class="media-griglia">' + miniatura(it.cas.disegno, 'casdis', i) +
    it.cas.foto.map(function (m, j) { return miniaturaFoto(m, 'casfoto', i, j); }).join('') +
    '<button type="button" class="media media-vuoto" data-act="addcasfoto" data-i="' + i + '">' + ic('camera') + 'Foto</button></div></div>';
}
function miniatura(m, tipo, i) {
  var src = mediaSrc(m);
  if (src) return '<div class="media media-disegno" role="button" tabindex="0" data-act="edit-' + tipo + '" data-i="' + i + '" aria-label="Modifica il disegno"><img src="' + src + '" alt="">' +
    '<button type="button" class="media-togli" data-act="del-' + tipo + '" data-i="' + i + '" aria-label="Togli il disegno"><span>' + ic('x') + '</span></button></div>';
  return '<button type="button" class="media media-vuoto" data-act="edit-' + tipo + '" data-i="' + i + '">' + ic('matita') + 'Disegna</button>';
}
function miniaturaFoto(m, tipo, i, j) {
  return '<div class="media" role="button" tabindex="0" data-act="edit' + tipo + '" data-i="' + i + '" data-j="' + j + '" aria-label="Apri la foto"><img src="' + mediaSrc(m) + '" alt="">' +
    '<button type="button" class="media-togli" data-act="del' + tipo + '" data-i="' + i + '" data-j="' + j + '" aria-label="Togli la foto"><span>' + ic('x') + '</span></button></div>';
}
function titoloPos(it) { return it.tipologia.trim() || 'Nuova posizione'; }
function sottoPos(it) {
  var p = [];
  if (it.pos) p.push(it.pos);
  var c = categoria(it.tipologia);
  if (c === 'cassonetto_solo') { if (it.cas.L_spigoli || it.cas.H) p.push((it.cas.L_spigoli || '–') + ' × ' + (it.cas.H || '–') + ' mm'); }
  else if (it.L || it.H) p.push((it.L || '–') + ' × ' + (it.H || '–') + (it.P ? ' × ' + it.P : '') + ' mm');
  p.push(pz(it) + ' pz');
  return p.map(function (x) { return x.replace(/ /g, ' '); }).join(' · '); // ogni pezzo resta intero a capo
}
function htmlPosizione(it, i) {
  var n = String(i + 1).padStart(2, '0');
  return (it._confirm === false ? '<div class="avviso-conferma">' + ic('copia', 'ico-s') + '<span>Posizione duplicata: controlla i campi diversi, poi conferma.</span>' +
      '<button type="button" class="btn btn-secondary btn-piccolo" data-act="confirm" data-i="' + i + '">' + ic('check', 'ico-s') + 'Conferma</button></div>' : '') +
    '<div class="pos-testa"><span class="pos-n" aria-hidden="true">' + n + '</span><div class="titoli"><span class="eyebrow" style="margin:0">Posizione ' + (i + 1) + '</span>' +
    '<h2 class="titolo" data-titolo="' + i + '">' + esc(titoloPos(it)) + '</h2><p class="sottotitolo tecnico" data-sotto="' + i + '">' + esc(sottoPos(it)) + '</p></div>' +
    '<div class="azioni-pos"><button type="button" class="btn btn-icona" data-act="dup" data-i="' + i + '" aria-label="Duplica la posizione" title="Duplica">' + ic('copia') + '</button>' +
    '<button type="button" class="btn btn-icona btn-pericolo" data-act="del" data-i="' + i + '" aria-label="Elimina la posizione" title="Elimina">' + ic('cestino') + '</button></div></div>' +
    '<div class="campi">' + campoLista(it, i, 'pos', 'Locale', 'dl', 1, 'Es. Cucina') + campoLista(it, i, 'tipologia', 'Tipologia', 'dl', 1, 'Es. Finestra') + '</div>' +
    '<div data-sub="' + i + '">' + campiPosizione(it, i) + '</div>';
}
function disegnaPosizioni() {
  var box = $('#posizioni');
  box.innerHTML = S.items.map(function (it, i) {
    return '<section class="tessera' + (it._confirm === false ? ' da-confermare' : '') + '" data-pos="' + i + '" aria-label="Posizione ' + (i + 1) + '">' + htmlPosizione(it, i) + '</section>';
  }).join('');
  aggiornaConteggi();
}
function ridisegnaPosizione(i) {
  var sec = $('[data-pos="' + i + '"]'); if (!sec) return disegnaPosizioni();
  var it = S.items[i];
  sec.className = 'tessera' + (it._confirm === false ? ' da-confermare' : '');
  sec.innerHTML = htmlPosizione(it, i);
}
function ridisegnaCampi(i) { var b = $('[data-sub="' + i + '"]'); if (b) b.innerHTML = campiPosizione(S.items[i], i); }
function aggiornaTestaPos(i) {
  var t = $('[data-titolo="' + i + '"]'), s = $('[data-sotto="' + i + '"]');
  if (t) t.textContent = titoloPos(S.items[i]); if (s) s.textContent = sottoPos(S.items[i]);
}
function aggiornaConteggi() {
  $('#statPos').textContent = S.items.length;
  $('#statPz').textContent = S.items.reduce(function (t, it) { return t + pz(it); }, 0);
}

/* stato dell'invio del rilievo aperto, nel riquadro dei numeri */
function aggiornaRiepilogoStato() {
  if (!rec) return;
  db().get('invii', rec.id).then(function (inv) {
    var el = $('#statDest'); if (!el) return;
    var s = statoInvio(rec, inv);
    el.innerHTML = '<b>' + esc(s.testo) + '</b>' + (s.dett ? esc(s.dett) : '');
  }, function () {});
}
function statoInvio(r, inv) {
  if (!inv || !inv.stato) return { cls: 'tag-bozza', testo: 'Bozza sul telefono', dett: 'Salvata in automatico', breve: 'Bozza' };
  if (inv.stato === 'in_coda') return { cls: 'tag-coda', testo: 'In attesa di linea', dett: 'Parte da solo appena c\'è internet', breve: 'In attesa di linea' };
  if (inv.stato === 'invio') return { cls: 'tag-invio', testo: 'Invio in corso…', dett: '', breve: 'Invio…' };
  if (inv.stato === 'errore') return { cls: 'tag-errore', testo: 'Invio non riuscito', dett: inv.errore || '', breve: 'Errore' };
  if (inv.stato === 'inviato') {
    if (r && inv.versione && r.updatedAt > inv.versione + 1500) return { cls: 'tag-mod', testo: 'Modificato dopo l\'invio', dett: 'Rimandalo per aggiornare Dropbox', breve: 'Da rimandare' };
    return { cls: 'tag-ok', testo: 'Su Dropbox ✓', dett: quando(inv.inviatoIl), breve: 'Su Dropbox' };
  }
  return { cls: 'tag-bozza', testo: 'Bozza', dett: '', breve: 'Bozza' };
}

/* ── Eventi dei campi ────────────────────────────────────────────────── */
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.dataset.h !== undefined) {
    var k = t.dataset.h;
    if (k === 'tel' && /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(t.value)) t.value = t.value.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');
    S[k] = t.value; t.removeAttribute('aria-invalid');
    if (k === 'cliente' || k === 'data') aggiornaTitolo();
    if (k === 'rilevatore') { imp.rilevatore = t.value; kvSet('impostazioni', imp); }
    if ((k === 'via' && S.lat) || (k === 'viaCantiere' && S.latCantiere)) aggiornaNoteIndirizzo();
    salvaPresto();
  } else if (t.dataset.f !== undefined && t.dataset.i !== undefined) {
    var i = +t.dataset.i, it = S.items[i]; if (!it) return;
    var prima = categoria(it.tipologia);
    it[t.dataset.f] = t.value; t.removeAttribute('aria-invalid');
    if (t.dataset.f === 'PZ') aggiornaConteggi();
    if (PRESE.indexOf(t.dataset.f) >= 0 && it.trePrese) {
      calcolaPrese(it);
      ['L', 'H'].forEach(function (f) { var el = $('[data-f="' + f + '"][data-i="' + i + '"]'); if (el) { el.value = it[f]; el.removeAttribute('aria-invalid'); } });
      var es = $('[data-esito-prese="' + i + '"]'); if (es) es.innerHTML = esitoPrese(it);
    }
    if (t.dataset.f === 'modelloPorta') { var vb = $('[data-sub="' + i + '"] [data-vetri-bl]'); if (vb) vb.hidden = !vetriBlindata(it); }
    if (t.dataset.f === 'tipologia' && categoria(t.value) !== prima) ridisegnaCampi(i);
    aggiornaTestaPos(i);
    salvaPresto();
  } else if (t.dataset.cf !== undefined) {
    var j = +t.dataset.i, c = S.items[j].cas;
    c[t.dataset.cf] = t.value;
    if (t.dataset.cf === 'L_spigoli') c.L = t.value;
    if (t.dataset.cf === 'P_dx') c.P = t.value;
    t.removeAttribute('aria-invalid');
    aggiornaTestaPos(j);
    salvaPresto();
  }
  if (t.dataset.dd !== undefined) { if (t.value.trim()) apriCombo(t, t.value); else apriCombo(t, ''); }
  if (t.id === 'c_cliente') suggerisciRubrica(t);
  if (t.id === 'c_via' || t.id === 'c_via_cantiere') suggerisciIndirizzo(t);
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset.hchk !== undefined) {
    S[t.dataset.hchk] = t.checked;
    if (t.dataset.hchk === 'cantiereDiverso') aggiornaCantiere();
    salvaPresto();
  } else if (t.dataset.fchk !== undefined) {
    var i = +t.dataset.i, itc = S.items[i]; itc[t.dataset.fchk] = t.checked;
    if (t.dataset.fchk === 'trePrese' && t.checked) { // si parte dalle misure già scritte
      if (!itc.L_centro && itc.L) itc.L_centro = itc.L;
      if (!itc.H_centro && itc.H) itc.H_centro = itc.H;
      calcolaPrese(itc);
    }
    salvaPresto(); ridisegnaCampi(i); aggiornaTestaPos(i);
  } else if (t.tagName === 'SELECT' && t.dataset.f !== undefined) {
    var k = +t.dataset.i; S.items[k][t.dataset.f] = t.value;
    if (t.dataset.f === 'cassonetto' && t.value === 'si' && !S.items[k].cas.PZ) S.items[k].cas.PZ = S.items[k].PZ || '';
    salvaPresto(); ridisegnaCampi(k);
  } else if (t.tagName === 'SELECT' && t.dataset.cf !== undefined) {
    S.items[+t.dataset.i].cas[t.dataset.cf] = t.value; t.removeAttribute('aria-invalid'); salvaPresto();
  }
});
$$('.seg [data-tipo]').forEach(function (b) {
  b.onclick = function () { S.tipoCliente = b.dataset.tipo; aggiornaTipoCliente(); salvaPresto(); };
});

/* ── Clic sulle posizioni e sui media ────────────────────────────────── */
document.addEventListener('click', function (e) {
  var tg = e.target.closest('[data-act]'); if (!tg) return;
  var a = tg.dataset.act, i = +tg.dataset.i, j = +tg.dataset.j, it = S.items[i];
  if (a.indexOf('del') === 0) e.stopPropagation();
  if (a === 'del') {
    conferma('Eliminare la posizione ' + (i + 1) + '?', esc(titoloPos(it)) + (it.pos ? ' · ' + esc(it.pos) : '') + '. Foto e disegni di questa posizione andranno persi.', 'Elimina').then(function (ok) {
      if (!ok) return; S.items.splice(i, 1); salvaPresto(); disegnaPosizioni();
    });
  } else if (a === 'dup') {
    var c = clona(it); c.foto = []; c.cas.foto = []; c._confirm = false; // le foto non si duplicano: si chiede conferma
    S.items.splice(i + 1, 0, c); salvaPresto(); disegnaPosizioni();
    var nuova = $('[data-pos="' + (i + 1) + '"]'); if (nuova) nuova.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (a === 'confirm') { it._confirm = true; salvaPresto(); ridisegnaPosizione(i); }
  else if (a === 'prese-uguali') {
    var primaL = PRESE_L.map(function (f) { return it[f]; }).filter(function (v) { return String(v || '').trim(); })[0];
    var primaH = PRESE_H.map(function (f) { return it[f]; }).filter(function (v) { return String(v || '').trim(); })[0];
    if (!primaL && !primaH) { avviso('Scrivi prima almeno una larghezza o un\'altezza', 'errore'); return; }
    PRESE_L.forEach(function (f) { if (!String(it[f] || '').trim() && primaL) it[f] = primaL; });
    PRESE_H.forEach(function (f) { if (!String(it[f] || '').trim() && primaH) it[f] = primaH; });
    calcolaPrese(it); salvaPresto(); ridisegnaCampi(i); aggiornaTestaPos(i);
  }
  else if (a === 'edit-disegno') editaMedia(it.disegno, 'Disegno · posizione ' + (i + 1), true, function (m) { it.disegno = m; salvaPresto(); ridisegnaCampi(i); });
  else if (a === 'del-disegno') confermaTogli('il disegno').then(function (ok) { if (ok) { it.disegno = null; salvaPresto(); ridisegnaCampi(i); } });
  else if (a === 'edit-casdis') editaMedia(it.cas.disegno, 'Disegno del cassonetto', true, function (m) { it.cas.disegno = m; salvaPresto(); ridisegnaCampi(i); });
  else if (a === 'del-casdis') confermaTogli('il disegno del cassonetto').then(function (ok) { if (ok) { it.cas.disegno = null; salvaPresto(); ridisegnaCampi(i); } });
  else if (a === 'addfoto') scegliFoto(function (src) { editaMedia({ v: 2, bg: src, strokes: [] }, 'Foto · posizione ' + (i + 1), false, function (m) { if (m) { it.foto.push(m); salvaPresto(); ridisegnaCampi(i); } }); });
  else if (a === 'editfoto') editaMedia(it.foto[j], 'Foto · posizione ' + (i + 1), false, function (m) { if (m) { it.foto[j] = m; salvaPresto(); ridisegnaCampi(i); } });
  else if (a === 'delfoto') confermaTogli('questa foto').then(function (ok) { if (ok) { it.foto.splice(j, 1); salvaPresto(); ridisegnaCampi(i); } });
  else if (a === 'addcasfoto') scegliFoto(function (src) { editaMedia({ v: 2, bg: src, strokes: [] }, 'Foto del cassonetto', false, function (m) { if (m) { it.cas.foto.push(m); salvaPresto(); ridisegnaCampi(i); } }); });
  else if (a === 'editcasfoto') editaMedia(it.cas.foto[j], 'Foto del cassonetto', false, function (m) { if (m) { it.cas.foto[j] = m; salvaPresto(); ridisegnaCampi(i); } });
  else if (a === 'delcasfoto') confermaTogli('questa foto').then(function (ok) { if (ok) { it.cas.foto.splice(j, 1); salvaPresto(); ridisegnaCampi(i); } });
});
document.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.media[role=button]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-tm]'); if (!b) return;
  var i = +b.dataset.i, it = S.items[i]; if (!it) return;
  it.tipoMisura = it.tipoMisura === b.dataset.tm ? '' : b.dataset.tm;
  salvaPresto(); ridisegnaCampi(i);
  if (it.tipoMisura === 'altro') { var inp = $('[data-f="tipoMisuraAltro"][data-i="' + i + '"]'); if (inp) inp.focus({ preventScroll: true }); }
});
function confermaTogli(cosa) { return conferma('Togliere ' + cosa + '?', 'Non si può recuperare.', 'Togli'); }

$('#btnAggiungi').onclick = function () {
  S.items.push(posizioneVuota()); salvaPresto(); disegnaPosizioni();
  var ult = $('[data-pos="' + (S.items.length - 1) + '"]');
  if (ult) { ult.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function () { var f = ult.querySelector('input'); if (f) f.focus({ preventScroll: true }); }, 450); }
};

/* ── Menu a tendina (combo): freccia = tutta la lista, scrivere = filtra ─ */
var comboAperta = null;
function opzioniPer(chiave) { return chiave === 'commesse' ? commesse : (OPZIONI[chiave] || []); }
function apriCombo(input, filtro, voci) {
  var wrap = input.closest('.combo'); if (!wrap) return;
  var menu = wrap.querySelector('.combo-menu');
  var lista = voci || opzioniPer(input.dataset.dd).map(function (o) { return { v: o }; });
  var q = (filtro || '').trim().toLowerCase();
  if (q && !voci) lista = lista.filter(function (o) { return o.v.toLowerCase().indexOf(q) >= 0; });
  if (!lista.length || (q && lista.length === 1 && lista[0].v.toLowerCase() === q && !voci)) { if (comboAperta && comboAperta.input === input) chiudiCombo(); return; }
  if (comboAperta && comboAperta.input !== input) chiudiCombo();
  var cur = (input.value || '').trim();
  menu.innerHTML = lista.map(function (o, k) {
    return '<button type="button" class="combo-voce" role="option" data-k="' + k + '" aria-selected="' + (o.v === cur) + '">' + esc(o.etichetta || o.v) + (o.dett ? '<small>' + esc(o.dett) + '</small>' : '') + '</button>';
  }).join('');
  menu.hidden = false; input.setAttribute('aria-expanded', 'true');
  comboAperta = { input: input, menu: menu, voci: lista };
  var sel = menu.querySelector('[aria-selected="true"]'); if (sel) menu.scrollTop = Math.max(0, sel.offsetTop - 60);
  // se il menu finisce sotto la barra in basso, si fa scorrere la pagina
  if (!input.closest('.dialogo')) {
    var r = menu.getBoundingClientRect(), limite = window.innerHeight - ($('.barra') ? $('.barra').offsetHeight : 0) - 8;
    if (r.bottom > limite) window.scrollBy({ top: r.bottom - limite, behavior: 'smooth' });
  }
}
function chiudiCombo() {
  if (!comboAperta) return;
  comboAperta.menu.hidden = true; comboAperta.menu.innerHTML = '';
  comboAperta.input.setAttribute('aria-expanded', 'false');
  comboAperta = null;
}
function tieniFuoco(e) {
  if (e.target.closest('.combo-menu, .combo-freccia')) { e.preventDefault(); return true; } // il campo resta col fuoco
  return false;
}
document.addEventListener('pointerdown', function (e) {
  if (tieniFuoco(e)) return;
  if (comboAperta && !e.target.closest('.combo')) chiudiCombo();
}, true);
document.addEventListener('mousedown', tieniFuoco, true);
document.addEventListener('click', function (e) {
  var fr = e.target.closest('.combo-freccia');
  if (fr) {
    var inp = fr.closest('.combo').querySelector('input');
    if (comboAperta && comboAperta.input === inp) chiudiCombo(); else { apriCombo(inp, ''); }
    return;
  }
  var v = e.target.closest('.combo-voce');
  if (v && comboAperta) {
    var o = comboAperta.voci[+v.dataset.k], input = comboAperta.input;
    chiudiCombo();
    if (o.scegli) { o.scegli(); return; }
    input.value = o.v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    chiudiCombo();
  }
});
document.addEventListener('focusout', function (e) {
  if (!comboAperta || e.target !== comboAperta.input) return;
  setTimeout(function () { if (comboAperta && !comboAperta.input.closest('.combo').contains(document.activeElement)) chiudiCombo(); }, 150);
});

/* ── Rubrica clienti ─────────────────────────────────────────────────── */
function dettaglioContatto(c) {
  var p = [];
  if (c.tipoCliente === 'azienda') p.push('Azienda'); else if (c.tipoCliente === 'rivenditore') p.push('Rivenditore');
  if (c.tel) p.push(c.tel); if (c.via) p.push(c.via);
  return p.join(' · ');
}
function suggerisciRubrica(input) {
  var q = input.value.trim().toLowerCase();
  if (q.length < 2 || !rubrica.length) { if (comboAperta && comboAperta.input === input) chiudiCombo(); return; }
  var trovati = rubrica.filter(function (c) { return (c.nome || '').toLowerCase().indexOf(q) >= 0 || (c.tel || '').replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) >= 0; }).slice(0, 8);
  if (!trovati.length) { if (comboAperta && comboAperta.input === input) chiudiCombo(); return; }
  apriCombo(input, '', trovati.map(function (c) { return { v: c.nome, dett: dettaglioContatto(c), scegli: function () { compilaDaContatto(c); } }; }));
}
function compilaDaContatto(c) {
  ['cliente', 'tel', 'email', 'via', 'citofono', 'referente', 'viaCantiere'].forEach(function (k) { S[k] = (k === 'cliente' ? c.nome : c[k]) || ''; });
  ['piano', 'mezzoSalita'].forEach(function (k) { if (c[k]) S[k] = c[k]; });
  if (!S.citofono && c.vianote) S.citofono = c.vianote;
  S.wa = !!c.wa; S.tg = !!c.tg; S.tipoCliente = c.tipoCliente || 'privato'; S.cantiereDiverso = !!c.cantiereDiverso;
  S.lat = c.lat == null ? null : c.lat; S.lng = c.lng == null ? null : c.lng;
  S.latCantiere = c.latCantiere == null ? null : c.latCantiere; S.lngCantiere = c.lngCantiere == null ? null : c.lngCantiere;
  disegnaTestata(); salvaPresto();
  avviso('Dati di ' + c.nome + ' presi dalla rubrica', 'ok');
}
function salvaInRubrica() {
  var nome = (S.cliente || '').trim(); if (!nome) return Promise.resolve();
  var c = { nome: nome, tel: S.tel, email: S.email, wa: S.wa, tg: S.tg, via: S.via, citofono: S.citofono, tipoCliente: S.tipoCliente, referente: S.referente,
    piano: S.piano, mezzoSalita: S.mezzoSalita,
    cantiereDiverso: S.cantiereDiverso, viaCantiere: S.viaCantiere, lat: S.lat, lng: S.lng, latCantiere: S.latCantiere, lngCantiere: S.lngCantiere };
  var k = rubrica.findIndex(function (x) { return (x.nome || '').toLowerCase().trim() === nome.toLowerCase(); });
  if (k >= 0) rubrica[k] = c; else rubrica.push(c);
  return kvSet('rubrica', rubrica);
}
$('#btnRubrica').onclick = apriRubrica;
function apriRubrica() {
  var voce = pannello('Rubrica clienti',
    '<div class="campo" style="margin-bottom:6px"><label class="sr-only" for="rubCerca">Cerca</label><input class="input" id="rubCerca" type="search" placeholder="Cerca per nome o telefono" autocomplete="off"></div><div id="rubLista"></div>',
    '<button class="btn btn-primary btn-lg btn-block" type="button" id="rubAggiungi">' + ic('piu', 'ico-s') + 'Salva il cliente di questo rilievo</button>');
  var el = voce.el;
  function elenca() {
    var q = $('#rubCerca', el).value.trim().toLowerCase();
    var l = rubrica.filter(function (c) { return !q || (c.nome || '').toLowerCase().indexOf(q) >= 0 || (c.tel || '').indexOf(q) >= 0; })
      .sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || '', 'it'); });
    $('#rubLista', el).innerHTML = l.length ? l.map(function (c) {
      var k = rubrica.indexOf(c);
      return '<div class="riga-c"><div class="info" data-scegli="' + k + '" role="button" tabindex="0"><h3>' + esc(c.nome) + '</h3><p>' + esc(dettaglioContatto(c)) +
        (c.referente ? ' · ' + (c.tipoCliente === 'rivenditore' ? 'Cliente finale: ' : 'Ref: ') + esc(c.referente) : '') + '</p></div>' +
        '<button class="btn btn-secondary btn-piccolo" type="button" data-scegli="' + k + '">Scegli</button>' +
        '<button class="btn btn-icona btn-pericolo" type="button" data-togli="' + k + '" aria-label="Togli ' + esc(c.nome) + ' dalla rubrica">' + ic('cestino', 'ico-s') + '</button></div>';
    }).join('') : '<div class="vuoto"><strong>Nessun contatto</strong>I clienti si aggiungono da soli quando fai un PDF o salvi su Dropbox.</div>';
  }
  elenca();
  $('#rubCerca', el).oninput = elenca;
  el.addEventListener('click', function (e) {
    var s = e.target.closest('[data-scegli]'), t = e.target.closest('[data-togli]');
    if (s) { compilaDaContatto(rubrica[+s.dataset.scegli]); chiudiOverlay(voce); }
    else if (t) {
      var c = rubrica[+t.dataset.togli];
      conferma('Togliere ' + c.nome + ' dalla rubrica?', 'I rilievi già fatti non cambiano.', 'Togli').then(function (ok) {
        if (!ok) return; rubrica.splice(rubrica.indexOf(c), 1); kvSet('rubrica', rubrica); elenca();
      });
    }
  });
  $('#rubAggiungi', el).onclick = function () {
    if (!S.cliente.trim()) { avviso('Scrivi prima il nome del cliente', 'errore'); return; }
    salvaInRubrica().then(function () { elenca(); avviso(S.cliente + ' salvato in rubrica', 'ok'); });
  };
}

/* ── Indirizzi (OpenStreetMap, solo con linea) ───────────────────────── */
function formattaIndirizzo(a) {
  if (!a) return '';
  var via = a.road || a.pedestrian || a.path || a.suburb || a.neighbourhood || a.square || '';
  var civ = a.house_number ? ' ' + a.house_number : '';
  var citta = a.city || a.town || a.village || a.municipality || a.hamlet || '';
  return [via ? via + civ : '', citta, a.postcode || ''].filter(function (x) { return x && x.trim(); }).join(', ');
}
var NOMINATIM = 'https://nominatim.openstreetmap.org/';
function cercaIndirizzi(q) {
  return fetch(NOMINATIM + 'search?format=json&addressdetails=1&countrycodes=it&limit=5&accept-language=it&q=' + encodeURIComponent(q) + '&email=fioreinstallazioni@gmail.com')
    .then(function (r) { return r.json(); });
}
function indirizzoDaCoordinate(lat, lng) {
  return fetch(NOMINATIM + 'reverse?format=json&accept-language=it&lat=' + lat + '&lon=' + lng + '&email=fioreinstallazioni@gmail.com')
    .then(function (r) { return r.json(); }).then(function (d) { return formattaIndirizzo(d.address) || d.display_name || ''; });
}
var timerIndirizzo = null;
function suggerisciIndirizzo(input) {
  clearTimeout(timerIndirizzo);
  var q = input.value.trim();
  if (q.length < 4 || !online()) { if (comboAperta && comboAperta.input === input) chiudiCombo(); return; }
  var campo = input.dataset.h;
  timerIndirizzo = setTimeout(function () {
    cercaIndirizzi(q).then(function (arr) {
      if (input.value.trim() !== q || document.activeElement !== input) return;
      if (!arr || !arr.length) { if (comboAperta && comboAperta.input === input) chiudiCombo(); return; }
      apriCombo(input, '', arr.map(function (a) {
        var f = formattaIndirizzo(a.address) || a.display_name;
        return { v: f, scegli: function () {
          input.value = f; S[campo] = f; input.removeAttribute('aria-invalid');
          if (campo === 'via') { S.lat = +a.lat; S.lng = +a.lon; } else { S.latCantiere = +a.lat; S.lngCantiere = +a.lon; }
          aggiornaNoteIndirizzo(); salvaPresto();
        } };
      }));
    }).catch(function () {});
  }, 600);
}
/* indirizzi presi col solo GPS mentre si era offline: si completano dopo */
function completaIndirizziGps() {
  if (!online() || !S) return;
  [['via', 'lat', 'lng'], ['viaCantiere', 'latCantiere', 'lngCantiere']].forEach(function (k) {
    if (/^GPS /.test(S[k[0]] || '') && S[k[1]] && S[k[2]]) {
      var idRil = rec.id;
      indirizzoDaCoordinate(S[k[1]], S[k[2]]).then(function (ind) {
        if (!ind || !rec || rec.id !== idRil || !/^GPS /.test(S[k[0]] || '')) return;
        S[k[0]] = ind; var el = $('[data-h="' + k[0] + '"]'); if (el) el.value = ind;
        aggiornaNoteIndirizzo(); salvaPresto();
      }).catch(function () {});
    }
  });
}

/* ── Mappa (Leaflet in locale; le mappe già viste restano sul telefono) ─ */
var mappa = null, puntoMappa = null, sceltaMappa = null, campoMappa = 'via';
function caricaScript(src) {
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Impossibile caricare ' + src)); }; document.head.appendChild(s); });
}
function caricaLeaflet() {
  if (window.L) return Promise.resolve();
  var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(l);
  return caricaScript('vendor/leaflet/leaflet.js');
}
$$('[data-mappa]').forEach(function (b) { b.onclick = function () { apriMappa(b.dataset.mappa); }; });
function testoMappa(t) { $('#mappaIndirizzo').textContent = t; }
function apriMappa(campo) {
  campoMappa = campo;
  $('#mappa').hidden = false; document.body.classList.add('bloccato'); spingiStoria();
  var lat = campo === 'via' ? S.lat : S.latCantiere, lng = campo === 'via' ? S.lng : S.lngCantiere;
  var start = lat && lng ? [lat, lng] : [40.8518, 14.2681], zoom = lat && lng ? 17 : 12;
  caricaLeaflet().then(function () {
    if (!mappa) {
      mappa = L.map('mapContainer', { zoomControl: false }).setView(start, zoom);
      L.control.zoom({ position: 'bottomright' }).addTo(mappa); // in alto c'è il riquadro dell'indirizzo
      var strato = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mappa);
      strato.on('tileerror', function () { if (!online()) testoMappa('Senza linea la mappa non si carica (restano solo le zone già viste). Usa «Usa GPS» e conferma: l\'indirizzo lo completo quando torna internet.'); });
      puntoMappa = L.marker(start, { draggable: true, icon: L.divIcon({ html: '<div class="punto-mappa"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(mappa);
      puntoMappa.on('dragend', function () { var p = puntoMappa.getLatLng(); scegliPunto(p.lat, p.lng); });
      mappa.on('click', function (e) { puntoMappa.setLatLng(e.latlng); scegliPunto(e.latlng.lat, e.latlng.lng); });
    } else { mappa.setView(start, zoom); puntoMappa.setLatLng(start); }
    setTimeout(function () { mappa.invalidateSize(); }, 120);
    scegliPunto(start[0], start[1]);
    if (!(lat && lng)) {
      var scritto = (S[campo] || '').trim();
      if (scritto.length >= 4 && online() && !/^GPS /.test(scritto)) {
        testoMappa('Cerco l\'indirizzo scritto…');
        cercaIndirizzi(scritto).then(function (arr) {
          if (arr && arr.length) { var p = [+arr[0].lat, +arr[0].lon]; mappa.setView(p, 17); puntoMappa.setLatLng(p); scegliPunto(p[0], p[1]); }
          else gpsSuMappa();
        }).catch(gpsSuMappa);
      } else gpsSuMappa();
    }
  }).catch(function () { testoMappa('La mappa non è disponibile. Usa «Usa GPS» per salvare la posizione.'); });
}
var timerAnteprima = null;
function scegliPunto(lat, lng) {
  sceltaMappa = { lat: lat, lng: lng };
  testoMappa(lat.toFixed(6) + ', ' + lng.toFixed(6) + (online() ? ' · cerco l\'indirizzo…' : ' · senza linea: salvo le coordinate'));
  clearTimeout(timerAnteprima);
  if (!online()) return;
  timerAnteprima = setTimeout(function () {
    indirizzoDaCoordinate(lat, lng).then(function (t) { if (sceltaMappa && sceltaMappa.lat === lat) testoMappa(t || (lat.toFixed(6) + ', ' + lng.toFixed(6))); })
      .catch(function () { testoMappa(lat.toFixed(6) + ', ' + lng.toFixed(6)); });
  }, 500);
}
function gpsSuMappa() {
  if (!navigator.geolocation) { testoMappa('Questo telefono non dà la posizione GPS. Sposta il punto a mano.'); return; }
  testoMappa('Cerco la posizione GPS…');
  navigator.geolocation.getCurrentPosition(function (p) {
    var ll = [p.coords.latitude, p.coords.longitude];
    if (mappa) { mappa.setView(ll, 17); puntoMappa.setLatLng(ll); }
    scegliPunto(ll[0], ll[1]);
  }, function () { testoMappa('GPS non disponibile: attivalo, oppure sposta il punto a mano.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}
$('#mappaGps').onclick = gpsSuMappa;
function chiudiMappa(daStoria) {
  if ($('#mappa').hidden) return;
  $('#mappa').hidden = true; if (daStoria !== true) tornaStoria();
  if (!pilaOverlay.length && $('#editor').hidden) document.body.classList.remove('bloccato');
}
$('#mappaChiudi').onclick = function () { chiudiMappa(); };
$('#mappaConferma').onclick = function () {
  if (!sceltaMappa) { chiudiMappa(); return; }
  var c = campoMappa, lat = sceltaMappa.lat, lng = sceltaMappa.lng;
  if (c === 'via') { S.lat = lat; S.lng = lng; } else { S.latCantiere = lat; S.lngCantiere = lng; }
  var input = $('[data-h="' + c + '"]');
  var metti = function (t) { input.value = t; S[c] = t; input.removeAttribute('aria-invalid'); aggiornaNoteIndirizzo(); salvaPresto(); };
  var segnaposto = 'GPS ' + lat.toFixed(5) + ', ' + lng.toFixed(5);
  chiudiMappa();
  if (!online()) {
    if (!S[c] || /^GPS /.test(S[c])) metti(segnaposto); else { aggiornaNoteIndirizzo(); salvaPresto(); }
    avviso('Posizione salvata. L\'indirizzo lo completo quando torna la linea', 'offline', 3500);
    return;
  }
  indirizzoDaCoordinate(lat, lng).then(function (t) { metti(t || segnaposto); }).catch(function () { metti(S[c] && !/^GPS /.test(S[c]) ? S[c] : segnaposto); });
};

/* ── Foto: scatta o scegli dalla galleria ────────────────────────────── */
function scegliFoto(cb) {
  var el = document.createElement('div');
  el.className = 'foglio'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Aggiungi foto');
  el.innerHTML = '<button class="btn btn-secondary" type="button" data-src="camera">' + ic('camera') + 'Scatta una foto</button>' +
    '<button class="btn btn-secondary" type="button" data-src="galleria">' + ic('galleria') + 'Scegli dalla galleria</button>' +
    '<button class="btn" type="button" data-src="annulla">Annulla</button>';
  var voce = apriOverlay(el, 'foglio');
  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-src]'); if (!b) return;
    chiudiOverlay(voce);
    if (b.dataset.src === 'annulla') return;
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    if (b.dataset.src === 'camera') inp.setAttribute('capture', 'environment');
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      ridimensiona(f, 1600, 0.82).then(cb).catch(function () { avviso('Non riesco ad aprire questa foto', 'errore'); });
    };
    document.body.appendChild(inp); // iPhone apre la fotocamera solo se il campo è nella pagina
    inp.click();
  });
}
function caricaImmagine(src) {
  return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('immagine non valida')); }; im.src = src; });
}
function ridimensiona(file, max, q) {
  var url = URL.createObjectURL(file);
  return caricaImmagine(url).then(function (im) {
    var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL('image/jpeg', q);
  }, function (e) { URL.revokeObjectURL(url); throw e; });
}

/* ── Editor di disegno e foto ─────────────────────────────────────────
   I tratti si salvano in coordinate relative (0–1): così il disegno resta
   al suo posto anche se si riapre con il telefono girato o su un altro
   schermo (la versione 2 li salvava in pixel e si spostavano). ──────── */
var ed = { canvas: $('#edCanvas'), ctx: null, bg: null, bgImg: null, tpl: null, strokes: [], cur: null, colore: '#2f6fd0', spessore: 3,
  w: 0, h: 0, ar: null, onSave: null, modelli: false, puntatore: null };
function editaMedia(media, titolo, conModelli, onSave) {
  var m = media || null;
  ed.onSave = onSave; ed.modelli = conModelli; ed.tpl = null; ed.strokes = []; ed.bg = null; ed.ar = null; ed.bgImg = null; ed.modificato = false;
  if (m) {
    if (m.v === 2) { ed.bg = m.bg || null; ed.tpl = m.tpl || null; ed.strokes = clona(m.strokes || []); ed.ar = m.ar || null; }
    else if ((m.strokes && m.strokes.length) || m.tpl) { ed.bg = m.img || m.bg || null; } // disegno della v2: si «appiattisce» e si continua sopra
    else { ed.bg = m.bg || m.img || null; }
  }
  $('#edTitolo').textContent = titolo;
  $('#edModelli').hidden = !conModelli;
  $$('.colore').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.col === ed.colore)); });
  $('#edSpessore').value = ed.spessore;
  $('#editor').hidden = false; document.body.classList.add('bloccato'); spingiStoria();
  var pronto =ed.bg ? caricaImmagine(ed.bg).then(function (im) { ed.bgImg = im; ed.ar = im.naturalWidth / im.naturalHeight; }) : Promise.resolve();
  pronto.then(function () { requestAnimationFrame(preparaTela); }, function () { ed.bg = null; requestAnimationFrame(preparaTela); });
}
function preparaTela() {
  if ($('#editor').hidden) return;
  var area = $('.ed-tela'), maxW = area.clientWidth - 20, maxH = area.clientHeight - 20;
  if (!ed.ar) ed.ar = maxW / maxH; // disegno nuovo: prende la forma dello schermo
  var w = maxW, h = w / ed.ar; if (h > maxH) { h = maxH; w = h * ed.ar; }
  w = Math.floor(w); h = Math.floor(h);
  var dpr = window.devicePixelRatio || 1, cv = ed.canvas;
  cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  ed.ctx = cv.getContext('2d'); ed.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ed.w = w; ed.h = h;
  ridisegnaTela();
}
function disegnaSu(ctx, w, h, conSfondo) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  if (conSfondo && ed.bgImg) ctx.drawImage(ed.bgImg, 0, 0, w, h);
  if (ed.tpl) disegnaModello(ctx, ed.tpl, w, h);
  ed.strokes.forEach(function (st) {
    ctx.strokeStyle = st.c; ctx.lineWidth = Math.max(1, st.w * w); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    st.p.forEach(function (pt, k) { var x = pt[0] * w, y = pt[1] * h; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (st.p.length === 1) ctx.lineTo(st.p[0][0] * w + 0.1, st.p[0][1] * h);
    ctx.stroke();
  });
}
function ridisegnaTela() { if (ed.ctx) disegnaSu(ed.ctx, ed.w, ed.h, true); }
function posTela(e) { var r = ed.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
ed.canvas.addEventListener('pointerdown', function (e) {
  if (ed.puntatore !== null) { // secondo dito: niente righe strane, si annulla il tratto
    if (ed.cur) { ed.strokes.pop(); ed.cur = null; ridisegnaTela(); }
    return;
  }
  e.preventDefault(); ed.puntatore = e.pointerId;
  try { ed.canvas.setPointerCapture(e.pointerId); } catch (x) {}
  ed.cur = { c: ed.colore, w: ed.spessore / Math.max(ed.w, 1), p: [posTela(e)] }; ed.modificato = true;
  ed.strokes.push(ed.cur); ridisegnaTela();
});
ed.canvas.addEventListener('pointermove', function (e) {
  if (!ed.cur || e.pointerId !== ed.puntatore) return; e.preventDefault();
  var ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  ev.forEach(function (x) { ed.cur.p.push(posTela(x)); });
  ridisegnaTela();
});
function fineTratto(e) { if (e.pointerId === ed.puntatore) { ed.puntatore = null; ed.cur = null; } }
ed.canvas.addEventListener('pointerup', fineTratto);
ed.canvas.addEventListener('pointercancel', fineTratto);
$$('.colore').forEach(function (b) { b.onclick = function () { ed.colore = b.dataset.col; $$('.colore').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
$('#edSpessore').oninput = function (e) { ed.spessore = +e.target.value; };
$('#edAnnulla').onclick = function () { if (ed.strokes.length) { ed.strokes.pop(); ed.modificato = true; ridisegnaTela(); } };
$('#edPulisci').onclick = function () {
  if (!ed.strokes.length && !ed.tpl) return;
  conferma('Pulire tutto?', 'Si tolgono tutti i tratti' + (ed.tpl ? ' e il modello' : '') + '.', 'Pulisci').then(function (ok) { if (ok) { ed.strokes = []; ed.tpl = null; ed.modificato = true; ridisegnaTela(); } });
};
function chiudiEditor(daStoria) {
  if ($('#editor').hidden) return;
  $('#editor').hidden = true; ed.puntatore = null; ed.cur = null;
  if (!daStoria) tornaStoria();
  if (!pilaOverlay.length && $('#mappa').hidden) document.body.classList.remove('bloccato');
}
function tratteggiNuovi() { return !!ed.modificato; } // solo se in questa apertura è cambiato qualcosa
$('#edChiudi').onclick = function () {
  if (!tratteggiNuovi()) { chiudiEditor(); return; }
  conferma('Uscire senza salvare?', 'I tratti fatti adesso andranno persi.', 'Esci').then(function (ok) { if (ok) chiudiEditor(); });
};
/* «indietro» del telefono dentro l'editor */
function indietroEditor() {
  if (!tratteggiNuovi()) { chiudiEditor(true); return; }
  conferma('Uscire senza salvare?', 'I tratti fatti adesso andranno persi.', 'Esci').then(function (ok) { if (ok) chiudiEditor(); });
}
$('#edSalva').onclick = function () {
  var cb = ed.onSave;
  if (!ed.bg && !ed.tpl && !ed.strokes.length) { chiudiEditor(); cb(null); return; }
  var out = { v: 2, bg: ed.bg, tpl: ed.tpl, strokes: ed.strokes, ar: ed.ar, img: null };
  if (ed.tpl || ed.strokes.length || !ed.bg) {
    // immagine finale a buona risoluzione, non a misura di schermo
    var W, H;
    if (ed.bgImg) { var s = Math.min(1, 1600 / Math.max(ed.bgImg.naturalWidth, ed.bgImg.naturalHeight)); W = Math.round(ed.bgImg.naturalWidth * s); H = Math.round(ed.bgImg.naturalHeight * s); }
    else { W = 1400; H = Math.round(1400 / ed.ar); if (H > 1800) { H = 1800; W = Math.round(1800 * ed.ar); } }
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    disegnaSu(c.getContext('2d'), W, H, true);
    out.img = c.toDataURL('image/jpeg', 0.85);
  }
  chiudiEditor(); cb(out);
};
window.addEventListener('resize', function () { if (!$('#editor').hidden) preparaTela(); });
$('#edModelli').onclick = function () {
  dialogo({
    titolo: 'Disegno standard', testo: 'Parti da un modello e completa a mano.',
    html: '<div class="modelli">' + Object.keys(TEMPLATES).map(function (k) { return '<button class="modello" type="button" data-tpl="' + k + '"><canvas width="280" height="140" data-c="' + k + '"></canvas><span>' + esc(TEMPLATES[k].nome) + '</span></button>'; }).join('') + '</div>',
    azioni: [{ v: null, t: 'Chiudi' }],
    dopo: function (el, voce) {
      $$('canvas[data-c]', el).forEach(function (c) { var x = c.getContext('2d'); disegnaModello(x, c.dataset.c, c.width, c.height); });
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-tpl]'); if (!b) return; ed.tpl = b.dataset.tpl; ed.modificato = true; ridisegnaTela(); chiudiOverlay(voce); });
    }
  });
};

/* ── Controllo dei campi obbligatori ─────────────────────────────────── */
var ETICHETTE = { pos: 'Locale', tipologia: 'Tipologia', L: 'Larghezza L', H: 'Altezza H', P: 'Profondità P', PZ: 'Pezzi',
  L_luce: 'L luce', H_luce: 'H luce', serie: 'Serie / materiale', colore: 'Colore', vetri: 'Vetri / pannelli', telaio: 'Telaio', apertura: 'Apertura',
  hmaniglia: 'H maniglia', modelloPorta: 'Modello', modelloSerratura: 'Modello serratura', manigliaInt: 'Maniglia interna', manigliaEst: 'Maniglia esterna',
  pannelloEstColore: 'Colore pannello esterno', pannelloIntColore: 'Colore pannello interno', coloreFerrInt: 'Colore ferramenta interna',
  coloreFerrEst: 'Colore ferramenta esterna', L_spigoli: 'Cassonetto: L spigoli', L_infisso: 'Cassonetto: L infisso', P_dx: 'Cassonetto: profondità DX',
  tipo: 'Cassonetto: tipo', nota: 'Nota (descrivi l\'intervento)',
  L_alto: 'L alto', L_centro: 'L centro', L_basso: 'L basso', H_sx: 'H sinistra', H_centro: 'H centro', H_dx: 'H destra',
  tipoMisuraAltro: 'Che misura hai preso (scrivila)', tl_sopra: 'Telaio sopra', tl_sx: 'Telaio sinistra', tl_dx: 'Telaio destra', tl_sotto: 'Telaio sotto' };
function controllaCampi() {
  $$('[aria-invalid="true"]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
  var mancano = [], avvisi = [];
  var segna = function (el, pos, testo) { if (el) el.setAttribute('aria-invalid', 'true'); mancano.push({ el: el, pos: pos, testo: testo }); };
  [['c_cliente', 'Cliente'], ['c_tel', 'Telefono'], ['c_via', 'Indirizzo del cliente'], ['c_piano', 'Piano'], ['c_data', 'Data del rilievo'], ['c_rilevatore', 'Rilevatore']]
    .concat(S.cantiereDiverso ? [['c_via_cantiere', 'Indirizzo del cantiere']] : []).forEach(function (x) {
      var el = $('#' + x[0]); if (!el.value.trim()) segna(el, 'Cliente', x[1]);
    });
  if (!S.items.length) mancano.push({ el: $('#btnAggiungi'), pos: 'Rilievo', testo: 'Aggiungi almeno una posizione' });
  S.items.forEach(function (it, i) {
    var P = 'Pos. ' + (i + 1);
    if (it._confirm === false) mancano.push({ el: $('[data-pos="' + i + '"]'), pos: P, testo: 'Conferma la posizione duplicata' });
    var cat = categoria(it.tipologia), opz = cat === 'varie' || !!it.soloRiparazione;
    var req = ['pos', 'tipologia', 'PZ'];
    if (!opz) {
      if (cat === 'serramento') req = req.concat(['L', 'H', 'serie', 'colore', 'vetri', 'telaio', 'apertura', 'hmaniglia']);
      else if (cat === 'veranda') req = req.concat(['L', 'H', 'serie', 'colore', 'vetri', 'telaio', 'apertura']);
      else if (cat === 'mobili_alluminio') req = req.concat(['L', 'H', 'P', 'serie', 'colore', 'vetri', 'apertura', 'hmaniglia']);
      else if (cat === 'porta_blindata' || cat === 'porta_ferro') {
        req = req.concat(['L', 'H', 'modelloPorta', 'colore', 'apertura', 'modelloSerratura']);
        if (cat === 'porta_blindata' && it.pannelloEst) req.push('pannelloEstColore');
        if (cat === 'porta_blindata' && it.pannelloInt) req.push('pannelloIntColore');
        if (it.ferramentaDiversa) req.push('coloreFerrInt', 'coloreFerrEst');
      } else if (cat === 'portone_palazzo') {
        req = req.concat(['L', 'H', 'modelloPorta', 'colore', 'apertura', 'modelloSerratura', 'manigliaInt', 'manigliaEst']);
        if (it.ferramentaDiversa) req.push('coloreFerrInt', 'coloreFerrEst');
      } else if (cat === 'sportello_alluminio') req = req.concat(['L', 'H', 'serie', 'colore', 'apertura']);
      else if (cat === 'accessori' || cat === 'ferro_esterno') req = req.concat(['L', 'H', 'serie', 'colore']);
      else if (cat === 'cassonetto_solo') req = req.concat(['serie', 'colore']);
    } else if (!String(it.nota || '').trim()) req.push('nota');
    if (it.misuraLuce) req.push('L_luce', 'H_luce');
    if (it.trePrese && cat !== 'cassonetto_solo') req = req.concat(PRESE_L, PRESE_H);
    if (it.telaioLati && CON_TELAIO.indexOf(cat) >= 0) {
      req = req.filter(function (f) { return f !== 'telaio'; }); // il telaio è descritto lato per lato
      if (!opz) LATI.forEach(function (l) { req.push('tl_' + l[0]); });
    }
    if (!opz && cat !== 'cassonetto_solo') {
      if (!it.tipoMisura) segna($('[data-tm-gruppo="' + i + '"]'), P, 'Che misura hai preso (esterne, luce muro…)');
      else if (it.tipoMisura === 'altro') req.push('tipoMisuraAltro');
    }
    req.forEach(function (f) { if (!String(it[f] || '').trim()) segna($('[data-f="' + f + '"][data-i="' + i + '"]'), P, ETICHETTE[f] || f); });
    if (!opz && haCassonetto(it)) {
      ['L_spigoli', 'L_infisso', 'H', 'P_dx', 'tipo'].concat(categoria(it.tipologia) === 'cassonetto_solo' ? [] : ['PZ']).forEach(function (f) {
        var v = f === 'L_spigoli' ? (it.cas.L_spigoli || it.cas.L) : f === 'P_dx' ? (it.cas.P_dx || it.cas.P) : it.cas[f];
        if (!String(v || '').trim()) segna($('[data-cf="' + f + '"][data-i="' + i + '"]'), P, f === 'H' ? 'Cassonetto: altezza H' : f === 'PZ' ? 'Cassonetto: pezzi' : (ETICHETTE[f] || f));
      });
    }
    if (!mediaSrc(it.disegno)) avvisi.push({ el: $('[data-act="edit-disegno"][data-i="' + i + '"]'), pos: P, testo: 'Manca il disegno' });
    if (!it.foto.length) avvisi.push({ el: $('[data-act="addfoto"][data-i="' + i + '"]'), pos: P, testo: 'Manca la foto' });
  });
  return { mancano: mancano, avvisi: avvisi };
}
function vaiA(el) { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus && el.tagName !== 'SECTION') setTimeout(function () { el.focus({ preventScroll: true }); }, 400); }
function righe(lista, cls) {
  return lista.map(function (m, k) { return '<li class="' + (cls || '') + '"><button type="button" data-vai="' + k + '"><span class="pos">' + esc(m.pos) + '</span>' + esc(m.testo) + '</button></li>'; }).join('');
}
/* restituisce true se si può procedere */
function controlla(perCosa) {
  var r = controllaCampi();
  if (r.mancano.length) {
    return dialogo({
      titolo: 'Mancano ' + r.mancano.length + (r.mancano.length === 1 ? ' campo' : ' campi'),
      testo: 'Per ' + (perCosa === 'pdf' ? 'fare il PDF' : 'salvare su Dropbox') + ' compila i campi obbligatori. Tocca una riga per andarci. <b>Il rilievo intanto è già salvato sul telefono.</b>',
      html: '<ul class="elenco-mancanti">' + righe(r.mancano) + '</ul>',
      azioni: [{ v: false, t: 'Torna al rilievo', cls: 'btn-primary' }],
      dopo: function (el, voce) { el.addEventListener('click', function (e) { var b = e.target.closest('[data-vai]'); if (b) { chiudiOverlay(voce, false); vaiA(r.mancano[+b.dataset.vai].el); } }); }
    }).then(function () { return false; });
  }
  if (r.avvisi.length) {
    return dialogo({
      titolo: 'Vuoi procedere lo stesso?', testo: 'Mancano disegni o foto in alcune posizioni.',
      html: '<ul class="elenco-mancanti">' + righe(r.avvisi, 'warn') + '</ul>',
      azioni: [{ v: false, t: 'Aggiungo' }, { v: true, t: 'Procedi', cls: 'btn-primary' }],
      dopo: function (el, voce) { el.addEventListener('click', function (e) { var b = e.target.closest('[data-vai]'); if (b) { chiudiOverlay(voce, false); vaiA(r.avvisi[+b.dataset.vai].el); } }); }
    }).then(function (v) { return !!v; });
  }
  return Promise.resolve(true);
}

/* ── Specifiche (PDF) ────────────────────────────────────────────────── */
function specifiche(it) {
  var cat = categoria(it.tipologia), sp = [];
  var add = function (k, v) { var c = String(v == null ? '' : v).trim(); if (c) sp.push([k, c]); };
  if (it.tipoMisura) add('Tipo misura', it.tipoMisura === 'altro' ? (it.tipoMisuraAltro || 'Altro') : TESTO_MISURA[it.tipoMisura]);
  if (it.misuraLuce && (it.L_luce || it.H_luce)) add('Misura luce', (it.L_luce || '-') + ' × ' + (it.H_luce || '-') + ' mm');
  if (it.soloRiparazione) add('Intervento', 'Solo riparazione / parziale');
  add('Modello', it.modelloPorta); add('Serie', it.serie); add('Colore', it.colore); add('Vetri/Pannelli', it.vetri); add('Telaio', it.telaio);
  if (it.controtelaio) add('Controtelaio', 'Sì');
  add('Apertura', it.apertura); add('H maniglia', it.hmaniglia); add('Tipo maniglia', it.tipoManiglia); add('Mensole', it.mensole);
  if (cat === 'mobili_alluminio') { add('Fondo', it.fondo === 'si' ? 'Sì' : 'No'); add('Tetto', it.tetto === 'si' ? 'Sì' : 'No'); }
  add('Ante / simm.', it.anteNoSim); add('H ringhiera', it.hRinghiera);
  if (cat === 'veranda' && it.sopralluceTipo && it.sopralluceTipo !== 'nessuno') add('Sopralluce', it.sopralluceTipo + (it.sopralluceH ? ' (H ' + it.sopralluceH + ' mm)' : ''));
  add('H sottoluce', it.sottoluceH); add('Serratura', it.modelloSerratura);
  if (it.serraturaChiave) add('Serratura a chiave', 'Sì');
  add('Defender', it.tipoDefender);
  if (it.ferramentaDiversa) { add('Ferramenta int.', it.coloreFerrInt); add('Ferramenta est.', it.coloreFerrEst); } else add('Colore ferr.', it.coloreFerramenta);
  if (it.pannelloEst) add('Pannello est.', (it.pannelloEstColore || '') + (it.pannelloEstSpessore ? ' (' + it.pannelloEstSpessore + ' mm)' : ''));
  if (it.pannelloInt) add('Pannello int.', (it.pannelloIntColore || '') + (it.pannelloIntSpessore ? ' (' + it.pannelloIntSpessore + ' mm)' : ''));
  add('Spioncino', it.spioncino); add('Fissaggio', it.tipoFissaggio); add('Maniglia int.', it.manigliaInt); add('Maniglia est.', it.manigliaEst); add('Copie chiavi', it.numChiavi);
  if (it.chiusuraSuppl) add('Chiusura suppl.', 'Sì'); if (it.doppiaSerratura) add('Doppia serratura', 'Sì'); if (it.chiudiportaAereo) add('Chiudiporta aereo', 'Sì');
  if (it.decorazioneVetriIndirizzo) add('Decoraz. vetro', it.decorazioneTesto || 'Con indirizzo'); if (it.pulsantieraCitofono) add('Pulsantiera citof.', 'Sì');
  if (it.coprifili) add('Carter/coprifili', 'Sì');
  if (cat === 'serramento' || cat === 'veranda') add('Cassonetto', it.cassonetto === 'si' ? 'Sì' : 'No');
  return sp;
}
/* righe che non stanno in mezza colonna */
function righeLunghe(it) {
  var r = [], cat = categoria(it.tipologia);
  if (it.trePrese && cat !== 'cassonetto_solo') {
    var v = function (f) { return it[f] || '-'; };
    r.push('Tre prese - L alto/centro/basso: ' + PRESE_L.map(v).join(' / ') + ' - H sinistra/centro/destra: ' + PRESE_H.map(v).join(' / ') + ' mm (in L e H la minima)' +
      (it.D1 || it.D2 ? ' - Diagonali: ' + v('D1') + ' / ' + v('D2') + ' mm' : ''));
  }
  if (it.telaioLati && CON_TELAIO.indexOf(cat) >= 0) {
    r.push('Telaio per lato - ' + LATI.map(function (l) {
      var t = it['tl_' + l[0]]; return l[1].toLowerCase() + ' ' + (t === 'nessuno' ? 'a muro' : (t || '-')) + (it['rf_' + l[0]] ? ' rifilo ' + it['rf_' + l[0]] : '');
    }).join(', '));
  }
  return r;
}
function avvisiPdf(it) { return it.trePrese && categoria(it.tipologia) !== 'cassonetto_solo' ? analisiPrese(it).avvisi : []; }
function rigaCassonetto(it) {
  var c = it.cas || {}, pdx = c.P_dx || c.P || '-';
  return 'Cassonetto ' + (c.tipo || '') + ': L spigoli ' + (c.L_spigoli || c.L || '-') + (c.L_infisso ? ' (L infisso ' + c.L_infisso + ')' : '') +
    ' × H ' + (c.H || '-') + ' × P DX ' + pdx + (c.P_sx && c.P_sx !== pdx ? ' / SX ' + c.P_sx : '') + ' mm' + (c.PZ && categoria(it.tipologia) !== 'cassonetto_solo' ? ' - PZ ' + c.PZ : '') +
    (c.manovra ? ' - Manovra: ' + c.manovra : '') + (c.note ? ' - ' + c.note : '');
}
function misureTesta(it) {
  var c = categoria(it.tipologia);
  if (c === 'cassonetto_solo') return 'L sp. ' + (it.cas.L_spigoli || it.cas.L || '-') + '  L inf. ' + (it.cas.L_infisso || '-') + '  H ' + (it.cas.H || '-') + '   PZ ' + (it.PZ || '-');
  return 'L ' + (it.L || '-') + ' × H ' + (it.H || '-') + (it.P ? ' × P ' + it.P : '') + '   PZ ' + (it.PZ || '-');
}

/* ── PDF (jsPDF in locale: funziona anche offline) ───────────────────── */
var logoDataUrl = null;
function caricaLogo() {
  if (logoDataUrl) return Promise.resolve(logoDataUrl);
  return fetch('assets/logo-df-bianco.png').then(function (r) { return r.blob(); }).then(function (b) {
    return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { logoDataUrl = fr.result; res(logoDataUrl); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(b); });
  }).catch(function () { return null; });
}
function caricaJsPdf() { return window.jspdf ? Promise.resolve() : caricaScript('vendor/jspdf.umd.min.js'); }
function pdfTxt(s) {
  return String(s == null ? '' : s).normalize('NFC').replace(/[​-‏‪-‮⁠-⁯﻿]/g, '').replace(/ /g, ' ')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x00-\xFF€]/g, '').trim();
}
function prepImg(src, maxPx, q) {
  return caricaImmagine(src).then(function (im) {
    var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, maxPx / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', q), w: w, h: h };
  }, function () { return null; });
}
function cartellaDestinazione(d) {
  d = d || S;
  var base = (imp.cartellaBase || BASE_PREDEFINITA).replace(/\/+$/, '');
  if (d.destType === 'commessa' && d.destCommessa) return base + '/' + nomeSicuro(d.destCommessa);
  return base + '/Lead/' + nomeSicuro(d.cliente);
}
function nomeBase(d) { d = d || S; return nomeSicuro(d.cliente).replace(/\s+/g, '_') + '_' + (d.data || oggiISO()); }

function creaPdf() {
  return Promise.all([caricaJsPdf(), caricaLogo()]).then(function (r) {
    var logo = r[1];
    var doc = new window.jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    var PW = 210, PH = 297, M = 12, W = PW - 2 * M, PIEDE = 10, y = M;
    var BLU = [47, 111, 208], INK = [43, 102, 189], TESTO = [22, 24, 29], GRIGIO = [110, 114, 120], NERO = [15, 17, 21], SUP = [245, 246, 248];
    var F = function (st) { doc.setFont('helvetica', st || 'normal'); };
    var col = function (c) { doc.setTextColor(c[0], c[1], c[2]); };
    var spazio = function (h) { if (y + h > PH - M - PIEDE) { doc.addPage(); y = M; return true; } return false; };
    var testo = function (t, x, yy, o) { doc.text(pdfTxt(t), x, yy, o); };

    // intestazione: il marchio DF sul nero del sito, poi la laser-line blu
    doc.setFillColor(NERO[0], NERO[1], NERO[2]); doc.rect(M, y, 24, 11, 'F');
    if (logo) { try { doc.addImage(logo, 'PNG', M + 4.5, y + 3, 15, 15 * 174 / 506); } catch (e) {} }
    else { doc.setTextColor(255); F('bold'); doc.setFontSize(12); doc.text('DF', M + 7.5, y + 7.5); }
    col(TESTO); F('bold'); doc.setFontSize(17); testo('Scheda rilievo misure', M + 28, y + 5.6);
    col(GRIGIO); F('normal'); doc.setFontSize(8.5); testo('Fiore Installazioni S.r.l.s.', M + 28, y + 10);
    col(TESTO); F('bold'); doc.setFontSize(9.5); testo('Rilievo del ' + dataIt(S.data), PW - M, y + 5, { align: 'right' });
    col(GRIGIO); F('normal'); doc.setFontSize(8.5); testo('Rilevatore: ' + (S.rilevatore || '-'), PW - M, y + 9.6, { align: 'right' });
    y += 14; doc.setDrawColor(BLU[0], BLU[1], BLU[2]); doc.setLineWidth(0.6); doc.line(M, y, PW - M, y); y += 4;

    // cliente, nel riquadro grigio come le tessere
    var righeCli = [];
    var cli = S.cliente || '';
    if (S.tipoCliente === 'azienda') cli += ' [Azienda]' + (S.referente ? ' - Ref: ' + S.referente : '');
    else if (S.tipoCliente === 'rivenditore') cli += ' [Rivenditore]' + (S.referente ? ' - Cliente finale: ' + S.referente : '');
    var canali = [S.wa ? 'WhatsApp' : '', S.tg ? 'Telegram' : ''].filter(Boolean).join('/');
    righeCli.push(['Cliente', cli]);
    righeCli.push(['Telefono', (S.tel || '') + (canali ? ' (' + canali + ')' : '')]);
    if (S.email) righeCli.push(['Email', S.email]);
    righeCli.push([S.cantiereDiverso ? 'Indirizzo cliente' : 'Indirizzo', S.via || '']);
    if (S.cantiereDiverso && S.viaCantiere) righeCli.push(['Indirizzo cantiere', S.viaCantiere]);
    if (S.citofono) righeCli.push(['Citofono / note', S.citofono]);
    var posa = [S.piano, S.mezzoSalita ? 'salita: ' + S.mezzoSalita : '', S.difficolta ? 'difficoltà ' + S.difficolta : ''].filter(Boolean).join(' - ');
    if (posa) righeCli.push(['Posa e logistica', posa]);
    if (S.notePosa) righeCli.push(['Note per la posa', S.notePosa]);
    doc.setFontSize(9.5);
    var LBL = 32, larg = W - 8 - LBL;
    var blocchi = righeCli.map(function (r) { F('normal'); return [r[0], doc.splitTextToSize(pdfTxt(r[1]) || '-', larg)]; });
    var hBox = 6 + blocchi.reduce(function (t, b) { return t + b[1].length * 4.4 + 1; }, 0) + 6;
    doc.setFillColor(SUP[0], SUP[1], SUP[2]); doc.rect(M, y, W, hBox, 'F');
    var yy = y + 6;
    blocchi.forEach(function (b) {
      col(GRIGIO); F('bold'); doc.setFontSize(8); testo(b[0].toUpperCase(), M + 4, yy);
      col(TESTO); F('normal'); doc.setFontSize(9.5); doc.text(b[1], M + 4 + LBL, yy);
      yy += b[1].length * 4.4 + 1;
    });
    var totPz = S.items.reduce(function (t, it) { return t + pz(it); }, 0);
    col(GRIGIO); doc.setFontSize(7.5); F('normal');
    testo('Cartella Dropbox: ' + cartellaDestinazione() + '/', M + 4, y + hBox - 2.5);
    y += hBox + 3;
    col(INK); F('bold'); doc.setFontSize(10);
    testo(S.items.length + (S.items.length === 1 ? ' posizione' : ' posizioni') + ' - ' + totPz + ' pezzi', M, y + 3.5);
    y += 7;

    var i = 0;
    function prossima() {
      if (i >= S.items.length) return Promise.resolve();
      var it = S.items[i], n = i; i++;
      spazio(30);
      // barra blu della posizione
      doc.setFillColor(BLU[0], BLU[1], BLU[2]); doc.rect(M, y, W, 8.5, 'F');
      doc.setTextColor(255); F('bold'); doc.setFontSize(10);
      var mis = pdfTxt(misureTesta(it));
      var largMis = doc.getTextWidth(mis) + 4;
      var tit = 'POS. ' + (n + 1) + (it.pos ? '  -  ' + it.pos : '') + (it.tipologia ? '  -  ' + it.tipologia : '') + (it.soloRiparazione ? '  [riparazione]' : '');
      doc.text(doc.splitTextToSize(pdfTxt(tit), W - largMis - 6)[0] || '', M + 2.5, y + 5.8);
      doc.text(mis, PW - M - 2.5, y + 5.8, { align: 'right' });
      y += 11;
      // specifiche su due colonne
      var sp = specifiche(it);
      col(TESTO); doc.setFontSize(8.6);
      for (var k = 0; k < sp.length; k += 2) {
        spazio(5);
        for (var c2 = 0; c2 < 2; c2++) {
          var s = sp[k + c2]; if (!s) continue;
          var x = M + c2 * (W / 2);
          F('bold'); col(GRIGIO); var lb = pdfTxt(s[0]) + ':'; doc.text(lb, x, y + 3);
          var lw = Math.max(25, doc.getTextWidth(lb) + 2);
          F('normal'); col(TESTO); doc.text(doc.splitTextToSize(pdfTxt(s[1]) || '-', W / 2 - lw - 3)[0] || '-', x + lw, y + 3);
        }
        y += 4.6;
      }
      righeLunghe(it).forEach(function (t) {
        var ll = doc.splitTextToSize(pdfTxt(t), W); spazio(ll.length * 4.3 + 2); F('normal'); col(TESTO); doc.text(ll, M, y + 3.5); y += ll.length * 4.3 + 1;
      });
      avvisiPdf(it).forEach(function (t) {
        var la = doc.splitTextToSize(pdfTxt('ATTENZIONE: ' + t), W); spazio(la.length * 4.3 + 2); F('bold'); doc.setTextColor(208, 55, 49); doc.text(la, M, y + 3.5); y += la.length * 4.3 + 1;
      });
      if (haCassonetto(it)) {
        var cl = doc.splitTextToSize(pdfTxt(rigaCassonetto(it)), W);
        spazio(cl.length * 4.3 + 2); F('bold'); col(INK); doc.text(cl, M, y + 3.5); y += cl.length * 4.3 + 1.5;
      }
      if (it.nota) {
        var nl = doc.splitTextToSize(pdfTxt('Nota: ' + it.nota), W);
        spazio(nl.length * 4.3 + 2); F('normal'); col(TESTO); doc.text(nl, M, y + 3.5); y += nl.length * 4.3 + 1.5;
      }
      // immagini: disegno + foto (+ cassonetto solo se c'è davvero), 3 per riga
      var imgs = [it.disegno].concat(it.foto || []);
      if (haCassonetto(it)) imgs = imgs.concat([it.cas.disegno]).concat(it.cas.foto || []);
      imgs = imgs.filter(function (m) { return mediaSrc(m); });
      y += 2;
      var COL = 3, GAP = 3, BW = (W - (COL - 1) * GAP) / COL, BH = 46, q = 0;
      function immagine() {
        if (q >= imgs.length) { if (imgs.length % COL) y += BH + GAP; return Promise.resolve(); }
        var m = imgs[q], cc = q % COL; q++;
        if (cc === 0) spazio(BH + GAP);
        return prepImg(mediaSrc(m), 1000, 0.74).then(function (p) {
          var bx = M + cc * (BW + GAP);
          doc.setDrawColor(222, 225, 230); doc.setLineWidth(0.2); doc.rect(bx, y, BW, BH);
          if (p) {
            var a = p.w / p.h, dw = BW - 2, dh = dw / a; if (dh > BH - 2) { dh = BH - 2; dw = dh * a; }
            try { doc.addImage(p.data, 'JPEG', bx + (BW - dw) / 2, y + (BH - dh) / 2, dw, dh); } catch (e) {}
          }
          if (cc === COL - 1) y += BH + GAP;
          return immagine();
        });
      }
      return immagine().then(function () {
        y += 2; doc.setDrawColor(220, 223, 228); doc.setLineWidth(0.2); doc.line(M, y, PW - M, y); y += 5;
        return prossima();
      });
    }
    return prossima().then(function () {
      spazio(22);
      y += 4; col(TESTO); F('normal'); doc.setFontSize(9);
      testo('Totale: ' + S.items.length + ' posizioni, ' + totPz + ' pezzi', M, y);
      doc.setDrawColor(TESTO[0], TESTO[1], TESTO[2]); doc.setLineWidth(0.3); doc.line(PW - M - 70, y + 8, PW - M, y + 8);
      col(GRIGIO); doc.setFontSize(8); testo('Firma del cliente per accettazione delle misure', PW - M, y + 12, { align: 'right' });
      // piede su ogni pagina
      var tot = doc.getNumberOfPages();
      for (var p = 1; p <= tot; p++) {
        doc.setPage(p); col(GRIGIO); F('normal'); doc.setFontSize(7.5);
        testo('DF - Fiore Installazioni S.r.l.s. - Rilievo ' + (S.cliente || '') + ' del ' + dataIt(S.data), M, PH - 7);
        testo('Pagina ' + p + ' di ' + tot, PW - M, PH - 7, { align: 'right' });
      }
      return doc.output('blob');
    });
  });
}

/* ── Bottone PDF: un file vero, da condividere o salvare ─────────────── */
function occupa(btn, testo) {
  var vecchio = btn.innerHTML; btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
  btn.innerHTML = ic('aggiorna', 'ico-s') + '<span>' + esc(testo) + '</span>';
  return function () { btn.innerHTML = vecchio; btn.removeAttribute('aria-busy'); btn.disabled = false; };
}
$('#btnPdf').onclick = function () {
  var btn = this;
  controlla('pdf').then(function (ok) {
    if (!ok) return;
    var libera = occupa(btn, 'Preparo…');
    salvaInRubrica();
    salvaOra().then(creaPdf).then(function (blob) {
      libera();
      var nome = 'Rilievo_' + nomeBase() + '.pdf';
      var file = null; try { file = new File([blob], nome, { type: 'application/pdf' }); } catch (e) {}
      var puoCondividere = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      var url = URL.createObjectURL(blob);
      // le azioni partono dal tocco sul bottone: il telefono condivide solo così
      var az = [
        { v: 'apri', t: 'Apri', ico: 'pdf', resta: true, fai: function () { window.open(url, '_blank'); } },
        { v: 'scarica', t: 'Salva sul telefono', ico: 'scarica', resta: true, cls: puoCondividere ? 'btn-secondary' : 'btn-primary', fai: function () {
          var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); avviso('PDF salvato nei download', 'ok');
        } }
      ];
      if (puoCondividere) az.push({ v: 'condividi', t: 'Condividi', ico: 'condividi', resta: true, cls: 'btn-primary', fai: function () {
        navigator.share({ files: [file], title: nome }).catch(function () {});
      } });
      dialogo({
        titolo: 'PDF pronto', testo: '<b>' + esc(nome) + '</b> · ' + Math.max(1, Math.round(blob.size / 1024)) + ' KB. Puoi condividerlo (WhatsApp, email, Dropbox…) o salvarlo sul telefono.' +
          (online() ? '' : ' Sei senza linea: il PDF è pronto lo stesso.'),
        azioni: az
      }).then(function () { setTimeout(function () { URL.revokeObjectURL(url); }, 60000); });
    }).catch(function (e) { libera(); avviso('Non riesco a creare il PDF: ' + (e && e.message || e), 'errore', 6000); });
  });
};

/* ── Salva su Dropbox: in coda subito, parte appena c'è linea ─────────── */
function scegliDestinazione() {
  return new Promise(function (resolve) {
    var tipo = S.destType || 'lead', com = S.destCommessa || '';
    var html = '<div class="campi g1"><div class="campo"><span class="etichetta">Dove va il rilievo <i class="req">*</i></span>' +
      '<div class="seg" role="group"><button type="button" data-d="lead" aria-pressed="' + (tipo === 'lead') + '">Nuovo cliente (Lead)</button>' +
      '<button type="button" data-d="commessa" aria-pressed="' + (tipo === 'commessa') + '">Commessa confermata</button></div></div>' +
      '<div class="campo" id="dCommWrap"' + (tipo === 'commessa' ? '' : ' hidden') + '><label for="dComm" class="etichetta-riga"><span>Commessa <i class="req">*</i></span>' +
      '<button type="button" class="btn btn-ghost btn-piccolo" id="dAggiorna">' + ic('aggiorna', 'ico-s') + 'Aggiorna elenco</button></label>' +
      '<div class="combo"><input id="dComm" data-dd="commesse" value="' + esc(com) + '" placeholder="Es. C47-SIRYUS SRL" autocomplete="off" role="combobox" aria-expanded="false">' +
      '<button type="button" class="combo-freccia" tabindex="-1" aria-label="Mostra tutte le commesse">' + ic('giu', 'ico-s') + '</button><div class="combo-menu" hidden></div></div></div></div>' +
      '<div class="percorso" id="dPercorso"></div>' +
      (online() ? '' : '<p class="campo-nota" style="margin-top:10px">' + ic('offline', 'ico-s') + 'Sei senza linea: il rilievo resta in coda sul telefono e parte da solo appena torna internet.</p>');
    var stato = { tipo: tipo };
    dialogo({
      titolo: 'Salva su Dropbox', html: html,
      azioni: [{ v: null, t: 'Annulla' }, { v: 'ok', t: online() ? 'Salva su Dropbox' : 'Metti in coda', ico: 'cloud', cls: 'btn-primary', prima: function (el) {
        if (stato.tipo === 'commessa' && !$('#dComm', el).value.trim()) { $('#dComm', el).setAttribute('aria-invalid', 'true'); $('#dComm', el).focus(); return false; }
        S.destType = stato.tipo; S.destCommessa = stato.tipo === 'commessa' ? $('#dComm', el).value.trim() : S.destCommessa;
        return true;
      } }],
      dopo: function (el) {
        var percorso = function () {
          var d = { destType: stato.tipo, destCommessa: $('#dComm', el).value.trim(), cliente: S.cliente };
          $('#dPercorso', el).innerHTML = 'Il PDF, i dati e le foto andranno in:<b>' + esc(cartellaDestinazione(d)) + '/</b>';
        };
        $$('[data-d]', el).forEach(function (b) {
          b.onclick = function () {
            stato.tipo = b.dataset.d; $$('[data-d]', el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            $('#dCommWrap', el).hidden = stato.tipo !== 'commessa'; percorso();
          };
        });
        $('#dComm', el).addEventListener('input', function (e) { e.target.removeAttribute('aria-invalid'); percorso(); });
        $('#dAggiorna', el).onclick = function () {
          var b = this; var lib = occupa(b, 'Carico…');
          aggiornaCommesse(true).then(function () { lib(); });
        };
        percorso();
        aggiornaCommesse(false);
      }
    }).then(function (v) { resolve(v === 'ok'); });
  });
}
function aggiornaCommesse(conAvviso) {
  if (!online()) { if (conAvviso) avviso('Senza linea uso l\'ultimo elenco salvato', 'offline'); return Promise.resolve(false); }
  return DFDropbox.collegato().then(function (ok) {
    if (!ok) { if (conAvviso) avviso('Collega prima Dropbox dalle impostazioni', 'errore'); return false; }
    return DFDropbox.elencoCartelle((imp.cartellaBase || BASE_PREDEFINITA).replace(/\/+$/, '')).then(function (nomi) {
      var l = nomi.filter(function (n) { return CARTELLE_ESCLUSE.indexOf(n.toLowerCase()) < 0 && !/^[-_.]/.test(n); });
      var num = function (s) { var m = s.match(/^C\.?\s?(\d+)/i); return m ? parseInt(m[1], 10) : 0; };
      l.sort(function (a, b) { return num(b) - num(a) || a.localeCompare(b, 'it'); });
      if (l.length) { commesse = l; kvSet('commesse', l); }
      if (conAvviso) avviso('Elenco commesse aggiornato (' + l.length + ')', 'ok');
      return true;
    });
  }).catch(function (e) { if (conAvviso) avviso('Elenco commesse non aggiornato: ' + e.message, 'errore', 5000); return false; });
}

function dataUrlInBytes(du) {
  var p = du.indexOf(','), b = atob(du.slice(p + 1)), u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
}
function jsonPerDropbox(base) {
  // compatibile con la v2: ogni immagine ha sempre «img» pieno
  var d = clona(S);
  var fix = function (m) { if (m) m.img = m.img || m.bg || null; return m; };
  d.items.forEach(function (it) { fix(it.disegno); it.foto.forEach(fix); fix(it.cas.disegno); it.cas.foto.forEach(fix); });
  d.dropbox_folder = base; d.id_rilievo = rec.id; d.versione_app = VERSIONE_APP; d.salvato_il = new Date().toISOString();
  return JSON.stringify(d, null, 2);
}
function mettiInCoda() {
  var base = cartellaDestinazione(), nb = nomeBase();
  return Promise.all([creaPdf(), db().get('invii', rec.id), db().get('outbox', rec.id)]).then(function (r) {
    var pdf = r[0], prec = r[1], codaPrec = r[2];
    return pdf.arrayBuffer().then(function (pdfBytes) {
      var giaFatti = {};
      if (codaPrec && codaPrec.cartella === base) codaPrec.files.forEach(function (f) { if (f.fatto && f.risultato) giaFatti[f.chiave] = f.risultato; });
      var percorsiPrec = (prec && prec.cartella === base && prec.percorsi) || {};
      var file = function (chiave, nome, dati, sempreSovrascrivi) {
        var gia = giaFatti[chiave] || percorsiPrec[chiave];
        return { chiave: chiave, nome: nome, path: gia || (base + '/' + nome), modo: (gia || sempreSovrascrivi) ? 'overwrite' : 'add', dati: dati, fatto: false };
      };
      var files = [file('pdf', 'Rilievo_' + nb + '.pdf', pdfBytes), file('json', 'dati_' + nb + '.json', new TextEncoder().encode(jsonPerDropbox(base)).buffer)];
      if (imp.fotoJpg !== false) {
        S.items.forEach(function (it, i) {
          var P = 'Pos' + String(i + 1).padStart(2, '0');
          var media = [[it.disegno, P + '_disegno']].concat(it.foto.map(function (m, j) { return [m, P + '_foto' + (j + 1)]; }));
          if (haCassonetto(it)) media = media.concat([[it.cas.disegno, P + '_cassonetto_disegno']]).concat(it.cas.foto.map(function (m, j) { return [m, P + '_cassonetto_foto' + (j + 1)]; }));
          media.forEach(function (x) {
            var src = mediaSrc(x[0]); if (!src || src.indexOf('data:image/') !== 0) return;
            var est = src.indexOf('data:image/png') === 0 ? '.png' : '.jpg';
            files.push(file('foto:' + x[1], 'Foto_' + nb + '/' + x[1] + est, dataUrlInBytes(src), true));
          });
        });
      }
      var voce = { id: rec.id, cliente: S.cliente, cartella: base, createdAt: Date.now(), versione: rec.updatedAt, files: files, tentativi: 0 };
      return db().put('outbox', voce).then(function () {
        return DFDropbox.aggiornaInvio(rec.id, { stato: 'in_coda', richiestoIl: Date.now(), cartella: base, errore: null });
      });
    });
  });
}
$('#btnDropbox').onclick = function () {
  var btn = this;
  controlla('dropbox').then(function (ok) {
    if (!ok) return;
    return scegliDestinazione().then(function (si) {
      if (!si) return;
      var libera = occupa(btn, 'Preparo…');
      return salvaInRubrica().then(salvaOra).then(mettiInCoda).then(function () {
        libera(); aggiornaBadge(); aggiornaRiepilogoStato(); chiediSyncInBackground();
        return DFDropbox.collegato().then(function (coll) {
          if (!coll) {
            return dialogo({ titolo: 'Rilievo in coda', testo: 'Il rilievo è <b>salvato sul telefono</b> e pronto a partire. Dropbox però non è ancora collegato su questo telefono: collegalo (serve la linea) e parte da solo.',
              azioni: [{ v: false, t: 'Più tardi' }, { v: true, t: 'Collega Dropbox', cls: 'btn-primary' }] }).then(function (v) { if (v) apriImpostazioni(); });
          }
          if (!online()) { avviso('Salvato sul telefono: lo mando a Dropbox appena torna la linea', 'offline', 4500); return; }
          var lib2 = occupa(btn, 'Invio…');
          return DFDropbox.svuotaCoda('pagina').then(function (r) {
            lib2(); aggiornaBadge(); aggiornaRiepilogoStato();
            if (r.occupato) { avviso('Invio già in corso…', ''); return; }
            if (!r.errore) { avviso('Salvato su Dropbox ✓ ' + cartellaDestinazione().split('/').slice(-1)[0], 'ok', 3500); return; }
            if (r.codice === 'rete') avviso('Linea debole: resta in coda e riprovo da solo', 'offline', 4500);
            else if (r.codice === 'ricollega' || r.codice === 'noncoll') dialogo({ titolo: 'Ricollega Dropbox', testo: esc(r.errore) + '. Il rilievo resta in coda sul telefono.', azioni: [{ v: false, t: 'Più tardi' }, { v: true, t: 'Apri impostazioni', cls: 'btn-primary' }] }).then(function (v) { if (v) apriImpostazioni(); });
            else dialogo({ titolo: 'Invio non riuscito', testo: esc(r.errore) + '<br>Il rilievo resta in coda: puoi riprovare dall\'archivio.' });
          });
        });
      }).catch(function (e) { libera(); avviso('Non riesco a preparare l\'invio: ' + (e && e.message || e), 'errore', 6000); });
    });
  });
};
function chiediSyncInBackground() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(function (reg) { if (reg.sync && reg.sync.register) return reg.sync.register('df-invio'); }).catch(function () {});
}
function aggiornaBadge() {
  db().count('outbox').then(function (n) {
    var b = $('#badgeCoda'); b.textContent = n; b.hidden = !n;
    $('#btnCoda').setAttribute('aria-label', 'Archivio rilievi' + (n ? ' · ' + n + ' in attesa di invio' : ''));
  }, function () {});
}
function provaInvio(origine) {
  if (!online()) return Promise.resolve();
  return db().count('outbox').then(function (n) {
    if (!n) return;
    return DFDropbox.collegato().then(function (c) { if (c) return DFDropbox.svuotaCoda(origine); });
  }).then(function () { aggiornaBadge(); aggiornaRiepilogoStato(); }, function () {});
}

/* ── Nuovo rilievo e archivio ────────────────────────────────────────── */
$('#btnNuovo').onclick = function () {
  if (rilievoVuoto(rec)) { avviso('Questo rilievo è già vuoto', ''); return; }
  var nome = S.cliente || 'senza nome';
  salvaOra().then(creaRilievo).then(function () { avviso('Nuovo rilievo. Quello di ' + nome + ' resta nell\'archivio', 'ok', 3500); });
};
$('#btnCoda').onclick = apriArchivio;
function apriArchivio() {
  var voce = pannello('I tuoi rilievi', '<div id="arcTesta"></div><div id="arcLista"><div class="vuoto">Carico…</div></div>',
    '<button class="btn btn-primary btn-lg btn-block" type="button" id="arcNuovo">' + ic('piu', 'ico-s') + 'Nuovo rilievo</button>');
  var el = voce.el;
  function elenca() {
    return salvaOra().then(function () { return Promise.all([db().getAll('rilievi'), db().getAll('invii'), db().getAll('outbox')]); }).then(function (r) {
      var ril = r[0].sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      var inv = {}; r[1].forEach(function (x) { inv[x.id] = x; });
      var coda = r[2].length;
      $('#arcTesta', el).innerHTML = '<div class="percorso" style="margin:0 0 10px">' + (coda ?
        '<b>' + coda + (coda === 1 ? ' rilievo in attesa' : ' rilievi in attesa') + ' di invio</b>' + (online() ? 'Partono da soli; puoi anche forzare adesso.' : 'Partono da soli appena torna la linea.') :
        '<b>Niente in attesa</b>Tutti i rilievi salvati su Dropbox sono partiti.') + '</div>' +
        (coda && online() ? '<button class="btn btn-secondary btn-block" type="button" id="arcInvia" style="margin-bottom:8px">' + ic('cloud', 'ico-s') + 'Invia adesso</button>' : '');
      $('#arcLista', el).innerHTML = ril.length ? ril.map(function (x) {
        var d = x.data || {}, s = statoInvio(x, inv[x.id]), corr = rec && x.id === rec.id;
        var npos = (d.items || []).length, npz = (d.items || []).reduce(function (t, it) { return t + pz(it); }, 0);
        return '<div class="riga-r' + (corr ? ' corrente' : '') + '"><div><h3>' + esc(d.cliente || 'Senza nome') + '</h3><p>' + esc(dataIt(d.data)) + ' · ' + npos + ' pos. · ' + npz + ' pz' +
          (d.rilevatore ? ' · ' + esc(d.rilevatore) : '') + (corr ? ' · <b>aperto adesso</b>' : '') + '</p>' +
          (inv[x.id] && inv[x.id].stato === 'inviato' && inv[x.id].cartella ? '<p>' + ic('cartella', 'ico-s') .replace('class="ico ico-s"', 'class="ico ico-s" style="display:inline;vertical-align:-3px;width:13px;height:13px"') + ' ' + esc(inv[x.id].cartella.split('/').slice(-2).join('/')) + '</p>' : '') +
          '</div><span class="tag ' + s.cls + '">' + esc(s.breve) + '</span>' +
          (inv[x.id] && inv[x.id].stato === 'errore' && inv[x.id].errore ? '<p class="errore">' + esc(inv[x.id].errore) + '</p>' : '') +
          '<div class="azioni-r">' + (corr ? '' : '<button class="btn btn-secondary btn-piccolo" type="button" data-apri="' + x.id + '">Apri</button>') +
          '<button class="btn btn-ghost btn-piccolo" type="button" data-copia="' + x.id + '">' + ic('copia', 'ico-s') + 'Copia come nuovo</button>' +
          '<button class="btn btn-ghost btn-piccolo btn-pericolo" type="button" data-togli="' + x.id + '">' + ic('cestino', 'ico-s') + 'Elimina</button></div></div>';
      }).join('') : '<div class="vuoto"><strong>Nessun rilievo</strong>Inizia dal modulo.</div>';
      var bi = $('#arcInvia', el);
      if (bi) bi.onclick = function () { var lib = occupa(bi, 'Invio…'); DFDropbox.collegato().then(function (c) { if (!c) { lib(); apriImpostazioni(); return; } return DFDropbox.svuotaCoda('archivio').then(function (r) { lib(); if (r.errore) avviso(r.errore, r.codice === 'rete' ? 'offline' : 'errore', 5000); else avviso('Inviati: ' + r.inviati, 'ok'); elenca(); aggiornaBadge(); }); }); };
    });
  }
  elenca();
  voce.elenca = elenca; archivioAperto = voce;
  voce.onClose = function () { archivioAperto = null; };
  el.addEventListener('click', function (e) {
    var a = e.target.closest('[data-apri]'), c = e.target.closest('[data-copia]'), t = e.target.closest('[data-togli]');
    if (a) { salvaOra().then(function () { return apriRilievo(a.dataset.apri); }).then(function () { chiudiOverlay(voce); }); }
    else if (c) {
      db().get('rilievi', c.dataset.copia).then(function (x) {
        var d = normalizza(clona(x.data)); d.data = oggiISO(); d.items.forEach(function (it) { it.foto = []; it.cas.foto = []; });
        var nr = { id: nuovoId(), createdAt: Date.now(), updatedAt: Date.now(), data: d };
        return salvaOra().then(function () { return db().put('rilievi', nr); }).then(function () { return apriRilievo(nr.id); });
      }).then(function () { chiudiOverlay(voce); avviso('Copia creata (senza foto): è il rilievo aperto', 'ok', 3500); });
    } else if (t) {
      var id = t.dataset.togli;
      Promise.all([db().get('rilievi', id), db().get('outbox', id), db().get('invii', id)]).then(function (r) {
        var nome = (r[0] && r[0].data && r[0].data.cliente) || 'senza nome';
        var avv = r[1] ? '<b>Attenzione: non è ancora partito per Dropbox.</b> Se lo elimini va perso.' : (r[2] && r[2].stato === 'inviato' ? 'Su Dropbox resta la copia già inviata.' : 'Non è mai stato salvato su Dropbox: va perso.');
        return conferma('Eliminare il rilievo di ' + nome + '?', avv, 'Elimina').then(function (ok) {
          if (!ok) return;
          return Promise.all([db().del('rilievi', id), db().del('outbox', id), db().del('invii', id)]).then(function () {
            if (rec && rec.id === id) {
              return db().getAll('rilievi').then(function (all) {
                all.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
                rec = null; return all.length ? apriRilievo(all[0].id) : creaRilievo();
              });
            }
          }).then(function () { aggiornaBadge(); elenca(); });
        });
      });
    }
  });
  $('#arcNuovo', el).onclick = function () {
    if (rilievoVuoto(rec)) { chiudiOverlay(voce); avviso('Il rilievo aperto è già vuoto', ''); return; }
    salvaOra().then(creaRilievo).then(function () { chiudiOverlay(voce); avviso('Nuovo rilievo pronto', 'ok'); });
  };
}
var archivioAperto = null;

/* ── Impostazioni: Dropbox, cartella, backup ─────────────────────────── */
$('#btnImpostazioni').onclick = function () { apriImpostazioni(); };
function apriImpostazioni() {
  DFDropbox.cfg().then(function (c) {
    var coll = !!c.refresh;
    var html =
      '<h3 class="sez-titolo" style="margin-top:4px">Dropbox</h3>' +
      '<div class="stato-box ' + (coll ? 'on' : 'off') + '">' + ic(coll ? 'check' : 'cloud', 'ico-s') + (coll ? 'Collegato: i rilievi partono da soli.' : 'Non collegato su questo telefono.') + '</div>' +
      (coll ? '' :
        '<ol class="passi"><li>Apri <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener">dropbox.com/developers/apps</a> → <b>Create app</b> → <i>Scoped access</i> → <i>Full Dropbox</i>.</li>' +
        '<li>Scheda <b>Permissions</b>: spunta <code>files.content.write</code> e <code>files.content.read</code> → <b>Submit</b>.</li>' +
        '<li>Scheda <b>Settings</b>: copia la <b>App key</b> qui sotto. Serve una volta sola.</li></ol>' +
        '<div class="campi g1"><div class="campo"><label for="dbxKey">App key</label><input id="dbxKey" value="' + esc(c.key || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>' +
        '<button class="btn btn-primary btn-block" type="button" id="dbxAutorizza" style="margin-top:10px">1 · Apri l\'autorizzazione di Dropbox</button>' +
        '<div id="dbxPasso2" hidden><div class="campi g1" style="margin-top:12px"><div class="campo"><label for="dbxCodice">Incolla il codice che ti mostra Dropbox</label><input id="dbxCodice" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>' +
        '<button class="btn btn-primary btn-block" type="button" id="dbxConferma" style="margin-top:10px">2 · Collega</button></div>' +
        '<p class="campo-nota" style="margin-top:8px">La chiave resta solo su questo telefono. Il collegamento si rinnova da solo.</p>') +
      '<h3 class="sez-titolo">Dove salvare</h3>' +
      '<div class="campi g1"><div class="campo"><label for="impBase">Cartella delle commesse</label><input id="impBase" value="' + esc(imp.cartellaBase || BASE_PREDEFINITA) + '" autocomplete="off" spellcheck="false">' +
      '<p class="campo-nota">I nuovi clienti vanno in <b>…/Lead/Nome cliente</b>, le commesse nella loro cartella. A gennaio cambia l\'anno qui.</p></div></div>' +
      '<div class="scelte" style="margin-top:10px"><label class="chip"><input type="checkbox" id="impFoto"' + (imp.fotoJpg !== false ? ' checked' : '') + '>' + SPUNTA + 'Carica anche le foto come file JPG</label></div>' +
      '<h3 class="sez-titolo">Copia di sicurezza</h3>' +
      '<p class="campo-nota" style="margin-bottom:10px">Salva tutti i rilievi e la rubrica in un file, o ripristinali (anche i file «dati_….json» di Dropbox).</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" type="button" id="impEsporta">' + ic('scarica', 'ico-s') + 'Esporta backup</button>' +
      '<button class="btn btn-secondary" type="button" id="impImporta">' + ic('carica', 'ico-s') + 'Importa</button></div>' +
      (coll ? '<h3 class="sez-titolo">Collegamento</h3><button class="btn btn-ghost btn-pericolo" type="button" id="dbxScollega">Scollega Dropbox da questo telefono</button>' : '') +
      '<p class="versione" id="impVersione">Rilievo misure ' + VERSIONE_APP + '</p>';
    dialogo({
      titolo: 'Impostazioni', html: html, azioni: [{ v: true, t: 'Fatto', cls: 'btn-primary' }],
      dopo: function (el) {
        if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (s) {
          $('#impVersione', el).textContent = 'Rilievo misure ' + VERSIONE_APP + ' · memoria usata ' + (s.usage / 1048576).toFixed(1) + ' MB' + (memoriaOk ? '' : ' · ATTENZIONE: memoria non disponibile');
        });
        $('#impBase', el).onchange = function () { var v = this.value.trim(); imp.cartellaBase = v ? '/' + v.replace(/^\/+/, '').replace(/\/+$/, '') : BASE_PREDEFINITA; this.value = imp.cartellaBase; kvSet('impostazioni', imp); aggiornaRiepilogoStato(); };
        $('#impFoto', el).onchange = function () { imp.fotoJpg = this.checked; kvSet('impostazioni', imp); };
        $('#impEsporta', el).onclick = esportaBackup;
        $('#impImporta', el).onclick = importaBackup;
        var aut = $('#dbxAutorizza', el);
        if (aut) aut.onclick = function () {
          var key = $('#dbxKey', el).value.trim();
          if (!key) { $('#dbxKey', el).setAttribute('aria-invalid', 'true'); $('#dbxKey', el).focus(); return; }
          if (!online()) { avviso('Per collegare Dropbox serve la linea', 'offline'); return; }
          var w = window.open('about:blank', '_blank'); // subito: Safari blocca le finestre aperte dopo un'attesa
          pkce().then(function (p) {
            return DFDropbox.cfg().then(function (cc) { cc.key = key; cc.verifier = p.v; return DFDropbox.setCfg(cc); }).then(function () {
              var url = 'https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(key) + '&response_type=code&token_access_type=offline' +
                '&code_challenge=' + p.c + '&code_challenge_method=S256&scope=' + encodeURIComponent('files.content.write files.content.read');
              if (w) w.location.href = url; else window.location.href = url;
              $('#dbxPasso2', el).hidden = false;
            });
          });
        };
        var conf = $('#dbxConferma', el);
        if (conf) conf.onclick = function () {
          var code = $('#dbxCodice', el).value.trim(); if (!code) { $('#dbxCodice', el).focus(); return; }
          var lib = occupa(conf, 'Collego…');
          DFDropbox.scambiaCodice(code).then(function () {
            lib(); chiudiOverlay(); avviso('Dropbox collegato ✓', 'ok'); aggiornaCommesse(false); provaInvio('collegato');
          }, function (e) { lib(); avviso('Collegamento non riuscito: ' + e.message, 'errore', 6000); });
        };
        var sc = $('#dbxScollega', el);
        if (sc) sc.onclick = function () {
          conferma('Scollegare Dropbox?', 'I rilievi in coda restano sul telefono e partiranno quando lo ricolleghi.', 'Scollega').then(function (ok) {
            if (!ok) return; DFDropbox.setCfg({ key: c.key }).then(function () { chiudiOverlay(); avviso('Dropbox scollegato', ''); });
          });
        };
      }
    });
  });
}
function b64url(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function pkce() {
  var v = b64url(crypto.getRandomValues(new Uint8Array(48)));
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(function (h) { return { v: v, c: b64url(h) }; });
}
function esportaBackup() {
  salvaOra().then(function () { return Promise.all([db().getAll('rilievi'), kvGet('rubrica')]); }).then(function (r) {
    var dati = { tipo: 'df-rilievo-backup', versione: VERSIONE_APP, creato: new Date().toISOString(), rilievi: r[0], rubrica: r[1] || [] };
    var blob = new Blob([JSON.stringify(dati)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-rilievi-' + oggiISO() + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
    avviso('Backup creato: ' + r[0].length + ' rilievi', 'ok');
  });
}
function importaBackup() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = function () {
    var f = inp.files && inp.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t), lavori = [], n = 0, ultimo = null;
      if (d && d.tipo === 'df-rilievo-backup') {
        (d.rilievi || []).forEach(function (r) { if (r && r.id && r.data) { r.data = normalizza(r.data); lavori.push(db().put('rilievi', r)); n++; ultimo = r.id; } });
        if (Array.isArray(d.rubrica)) d.rubrica.forEach(function (c) { if (c && c.nome && !rubrica.some(function (x) { return (x.nome || '').toLowerCase() === c.nome.toLowerCase(); })) rubrica.push(c); });
        lavori.push(kvSet('rubrica', rubrica));
      } else if (d && Array.isArray(d.items)) { // un singolo rilievo (dati_….json o export della v2)
        delete d.dropbox_folder;
        var r = { id: nuovoId(), createdAt: Date.now(), updatedAt: Date.now(), data: normalizza(d) };
        lavori.push(db().put('rilievi', r)); n = 1; ultimo = r.id;
      } else throw new Error('file non riconosciuto');
      return Promise.all(lavori).then(function () {
        chiudiOverlay(); avviso('Importati ' + n + ' rilievi', 'ok');
        if (n === 1 && ultimo) return salvaOra().then(function () { return apriRilievo(ultimo); });
      });
    }).catch(function (e) { avviso('Import non riuscito: ' + e.message, 'errore', 5000); });
  };
  inp.click();
}

/* ── Linea sì / linea no ─────────────────────────────────────────────── */
function aggiornaRete() {
  $('#strisciaOffline').hidden = online();
  statoSalvataggio('ok');
}
window.addEventListener('online', function () {
  aggiornaRete(); avviso('Linea tornata: invio quello che è in coda', 'ok');
  completaIndirizziGps(); provaInvio('online');
});
window.addEventListener('offline', function () { aggiornaRete(); avviso('Sei senza linea: continuo a salvare sul telefono', 'offline', 3500); });
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') provaInvio('visibile');
  else salvaOra(); // il telefono può chiudere l'app in background: si salva subito
});
window.addEventListener('pagehide', function () { salvaOra(); });
setInterval(function () { if (document.visibilityState === 'visible') provaInvio('timer'); }, 60000);

/* avvisi del motore d'invio (anche dal service worker) */
var ch = DFDropbox.canale();
if (ch) ch.onmessage = function (e) {
  var m = e.data || {};
  if (m.tipo === 'inviato') { aggiornaBadge(); aggiornaRiepilogoStato(); if (archivioAperto) archivioAperto.elenca(); if (m.cliente && m.id !== (rec && rec.id)) avviso('Rilievo di ' + m.cliente + ' salvato su Dropbox ✓', 'ok', 3500); }
  if (m.tipo === 'coda-finita' || m.tipo === 'errore' || m.tipo === 'invio') { aggiornaBadge(); aggiornaRiepilogoStato(); if (archivioAperto) archivioAperto.elenca(); }
};

/* ── Service worker: l'app resta sul telefono ────────────────────────── */
function registraSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  var ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (ricaricato) return; ricaricato = true; salvaOra().then(function () { location.reload(); }); });
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    var proponi = function (w) {
      dialogo({ titolo: 'Nuova versione pronta', testo: 'È disponibile un aggiornamento dell\'app. Il rilievo aperto è salvato.', azioni: [{ v: false, t: 'Dopo' }, { v: true, t: 'Aggiorna ora', cls: 'btn-primary' }] })
        .then(function (v) { if (v) salvaOra().then(function () { w.postMessage('aggiorna-ora'); }); });
    };
    if (reg.waiting && navigator.serviceWorker.controller) proponi(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing; if (!w) return;
      w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) proponi(w); });
    });
    setInterval(function () { if (online()) reg.update().catch(function () {}); }, 30 * 60000);
  }).catch(function () {});
}

/* ── Avvio ───────────────────────────────────────────────────────────── */
function avvia() {
  aggiornaRete();
  DFStore.openDB().catch(function () { memoriaDiRiserva(); })
    .then(function () { return migraDallaV2().catch(function () { return null; }); })
    .then(function () { return Promise.all([kvGet('impostazioni'), kvGet('rubrica'), kvGet('commesse'), kvGet('aperto')]); })
    .then(function (r) {
      if (r[0]) imp = Object.assign(imp, r[0]);
      rubrica = Array.isArray(r[1]) ? r[1] : [];
      if (Array.isArray(r[2]) && r[2].length) commesse = r[2];
      var aperto = r[3];
      return (aperto ? apriRilievo(aperto) : Promise.resolve(false)).then(function (ok) {
        if (ok) return;
        return db().getAll('rilievi').then(function (all) {
          if (all.length) { all.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }); return apriRilievo(all[0].id); }
          return creaRilievo();
        });
      });
    })
    .then(function () {
      aggiornaBadge();
      if (!memoriaOk) avviso('Questo browser non permette di salvare: non chiudere la pagina e fai il PDF', 'errore', 9000);
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      completaIndirizziGps();
      provaInvio('avvio');
      registraSW();
    })
    .catch(function (e) { avviso('Errore all\'avvio: ' + (e && e.message || e), 'errore', 9000); });
}
avvia();

/* per i collaudi */
window.__rilievo = { get S() { return S; }, get rec() { return rec; }, creaPdf: creaPdf, controllaCampi: controllaCampi, categoria: categoria, VERSIONE: VERSIONE_APP };
})();
