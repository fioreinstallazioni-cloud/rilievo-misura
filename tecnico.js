/* ═══════════════════════════════════════════════════════════════════════
   Rilievo misure — disegno tecnico «a celle» (dalla 3.3)
   Il serramento è un telaio L × H diviso in parti (montanti = colonne,
   traversi = righe). Ogni parte ha un'apertura (fisso, battente, anta-ribalta,
   vasistas, scorrevole…), un riempimento (vetro, pannello, sbarre…) e un verso.
   Si parte da un modello del catalogo e si tocca una parte per cambiarla.
   Viste: frontale (interna o esterna) e pianta, con le quote calcolate da sole.
   Il disegno si salva come schema (si riapre e si modifica) + immagine (PDF).
   ═══════════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

/* ── Schema ──────────────────────────────────────────────────────────── */
var cont = 0;
function nid() { cont++; return 'c' + Date.now().toString(36) + cont; }
function cella(apertura, cerniere, riemp, extra) {
  return Object.assign({ id: nid(), tipo: 'cella', apertura: apertura || 'fisso', cerniere: cerniere || 'sx', riemp: riemp || 'vetro', verso: 'interno', zoccolo: 0 }, extra || {});
}
function parte(size, node) { return { size: size, node: node }; }
function divisa(dir, parti) {
  return { id: nid(), tipo: 'split', dir: dir, parti: parti.map(function (p) { return p && p.node ? p : parte(null, p); }) };
}
function clona(o) { return JSON.parse(JSON.stringify(o)); }
function rinnovaId(n) { n.id = nid(); if (n.tipo === 'split') n.parti.forEach(function (p) { rinnovaId(p.node); }); return n; }

var B = function (c) { return cella('battente', c); };
var due = function (r) { return divisa('v', [cella('battente', 'sx', r), cella('battente', 'dx', r)]); };

/* Il catalogo: [categoria, chiave, nome, L, H, costruttore] */
var MODELLI = [
  ['Finestre', 'f1sx', '1 anta · cerniere SX', 800, 1200, function () { return B('sx'); }],
  ['Finestre', 'f1dx', '1 anta · cerniere DX', 800, 1200, function () { return B('dx'); }],
  ['Finestre', 'f1ar', '1 anta anta-ribalta', 800, 1200, function () { return cella('antaribalta', 'sx'); }],
  ['Finestre', 'f2', '2 ante', 1200, 1400, function () { return due(); }],
  ['Finestre', 'f2ar', '2 ante · una anta-ribalta', 1200, 1400, function () { return divisa('v', [B('sx'), cella('antaribalta', 'dx')]); }],
  ['Finestre', 'f3', '3 ante', 1800, 1400, function () { return divisa('v', [B('sx'), B('dx'), cella('antaribalta', 'dx')]); }],
  ['Finestre', 'f4', '4 ante', 2400, 1400, function () { return divisa('v', [B('sx'), B('dx'), B('sx'), B('dx')]); }],
  ['Finestre', 'f1vas', '1 anta + vasistas sopra', 800, 1700, function () { return divisa('h', [parte(450, cella('vasistas')), parte(null, B('sx'))]); }],
  ['Finestre', 'f2vas', '2 ante + vasistas sopra', 1200, 1900, function () { return divisa('h', [parte(450, cella('vasistas')), parte(null, due())]); }],
  ['Finestre', 'f3vas', '3 ante + vasistas sopra', 1800, 1900, function () { return divisa('h', [parte(450, divisa('v', [cella('vasistas'), cella('vasistas'), cella('vasistas')])), parte(null, divisa('v', [B('sx'), B('dx'), B('dx')]))]); }],
  ['Finestre', 'f2fs', '2 ante + fisso sotto', 1200, 1700, function () { return divisa('h', [parte(null, due()), parte(400, cella('fisso'))]); }],
  ['Finestre', 'vas', 'Vasistas', 800, 500, function () { return cella('vasistas'); }],
  ['Finestre', 'fisso', 'Fisso', 800, 1000, function () { return cella('fisso'); }],
  ['Portefinestre', 'pf1', 'Portafinestra 1 anta', 900, 2250, function () { return B('sx'); }],
  ['Portefinestre', 'pf2', 'Portafinestra 2 ante', 1300, 2350, function () { return due(); }],
  ['Portefinestre', 'pf2ar', '2 ante · una anta-ribalta', 1300, 2350, function () { return divisa('v', [B('sx'), cella('antaribalta', 'dx')]); }],
  ['Portefinestre', 'pf2z', '2 ante con zoccolo', 1300, 2350, function () { return divisa('v', [cella('battente', 'sx', 'vetro', { zoccolo: 350 }), cella('battente', 'dx', 'vetro', { zoccolo: 350 })]); }],
  ['Portefinestre', 'pf2lat', '2 ante + fisso laterale', 1800, 2350, function () { return divisa('v', [parte(500, cella('fisso')), parte(null, due())]); }],
  ['Portefinestre', 'pf2sl', '2 ante + sopraluce fisso', 1300, 2750, function () { return divisa('h', [parte(400, cella('fisso')), parte(null, due())]); }],
  ['Scorrevoli', 'sc2', 'Scorrevole 2 ante', 1800, 2200, function () { return divisa('v', [cella('scorrevole', 'dx'), cella('scorrevole', 'sx')]); }],
  ['Scorrevoli', 'alz', 'Alzante · fisso + scorrevole', 2400, 2200, function () { return divisa('v', [cella('fisso'), cella('scorrevole', 'sx')]); }],
  ['Scorrevoli', 'sc3', 'Scorrevole 3 ante', 2700, 2200, function () { return divisa('v', [cella('scorrevole', 'dx'), cella('scorrevole', 'sx'), cella('scorrevole', 'sx')]); }],
  ['Scorrevoli', 'sc4', 'Scorrevole 4 ante · centrali', 3600, 2200, function () { return divisa('v', [cella('fisso'), cella('scorrevole', 'sx'), cella('scorrevole', 'dx'), cella('fisso')]); }],
  ['Scorrevoli', 'sc2vas', 'Scorrevole 2 ante + vasistas', 1800, 2600, function () { return divisa('h', [parte(400, cella('vasistas')), parte(null, divisa('v', [cella('scorrevole', 'dx'), cella('scorrevole', 'sx')]))]); }],
  ['Porte', 'p1sx', 'Porta 1 anta · cerniere SX', 900, 2100, function () { return cella('battente', 'sx', 'pannello'); }],
  ['Porte', 'p1dx', 'Porta 1 anta · cerniere DX', 900, 2100, function () { return cella('battente', 'dx', 'pannello'); }],
  ['Porte', 'p2as', '2 ante asimmetriche', 1300, 2100, function () { return divisa('v', [parte(null, cella('battente', 'sx', 'pannello')), parte(400, cella('battente', 'dx', 'pannello'))]); }],
  ['Porte', 'p2', '2 ante uguali', 1500, 2100, function () { return due('pannello'); }],
  ['Porte', 'p1sl', '1 anta + sopraluce', 900, 2600, function () { return divisa('h', [parte(450, cella('fisso')), parte(null, cella('battente', 'sx', 'pannello'))]); }],
  ['Porte', 'p1lat', '1 anta + laterale fisso', 1300, 2100, function () { return divisa('v', [parte(null, cella('battente', 'sx', 'pannello')), parte(400, cella('fisso'))]); }],
  ['Porte', 'p2sl', '2 ante + sopraluce', 1500, 2700, function () { return divisa('h', [parte(500, cella('fisso')), parte(null, due('pannello'))]); }],
  ['Porte', 'portone', 'Portone 2 ante + sopraluce + laterali', 2600, 3200, function () {
    return divisa('h', [parte(700, cella('fisso')), parte(null, divisa('v', [parte(450, cella('fisso')), parte(null, due('vetro')), parte(450, cella('fisso'))]))]);
  }],
  ['Verande', 'ver3sc', 'Veranda 3 ante scorrevoli', 3000, 2400, function () { return divisa('v', [cella('scorrevole', 'dx'), cella('scorrevole', 'sx'), cella('scorrevole', 'sx')]); }],
  ['Verande', 'ver4sc', 'Veranda 4 ante scorrevoli', 4000, 2400, function () { return divisa('v', [cella('scorrevole', 'dx'), cella('scorrevole', 'dx'), cella('scorrevole', 'sx'), cella('scorrevole', 'sx')]); }],
  ['Verande', 'ver3b', 'Veranda 3 moduli · battenti + fisso', 2700, 2400, function () { return divisa('v', [B('sx'), cella('fisso'), B('dx')]); }],
  ['Verande', 'ver3sl', 'Veranda 3 moduli + sopraluce a vasistas', 3000, 2700, function () {
    return divisa('h', [parte(450, divisa('v', [cella('vasistas'), cella('vasistas'), cella('vasistas')])), parte(null, divisa('v', [B('sx'), cella('fisso'), B('dx')]))]);
  }],
  ['Verande', 'ver3st', 'Veranda con sottoluce cieco', 3000, 2400, function () {
    return divisa('h', [parte(null, divisa('v', [cella('scorrevole', 'dx'), cella('fisso'), cella('scorrevole', 'sx')])), parte(900, divisa('v', [cella('fisso', 'sx', 'pannello'), cella('fisso', 'sx', 'pannello'), cella('fisso', 'sx', 'pannello')]))]);
  }],
  ['Verande', 'verlibro', 'Veranda 4 ante a libro', 3500, 2200, function () { return divisa('v', [cella('libro', 'sx'), cella('libro', 'sx'), cella('libro', 'sx'), cella('libro', 'sx')]); }],
  ['Cancelli e grate', 'c2', 'Cancello 2 ante', 3000, 1800, function () { return due('sbarre'); }],
  ['Cancelli e grate', 'c1', 'Cancello pedonale 1 anta', 1100, 1800, function () { return cella('battente', 'sx', 'sbarre'); }],
  ['Cancelli e grate', 'csc', 'Cancello scorrevole', 4000, 1800, function () { return cella('scorrevole', 'sx', 'sbarre'); }],
  ['Cancelli e grate', 'cped', 'Carraio 2 ante + pedonale', 4200, 1800, function () { return divisa('v', [parte(1100, cella('battente', 'sx', 'sbarre')), parte(null, due('sbarre'))]); }],
  ['Cancelli e grate', 'grfix', 'Grata fissa', 1000, 1200, function () { return cella('fisso', 'sx', 'sbarre'); }],
  ['Cancelli e grate', 'gr2', 'Grata apribile 2 ante', 1200, 1400, function () { return due('sbarre'); }],
  ['Cancelli e grate', 'ringh', 'Ringhiera', 3000, 1000, function () { return cella('fisso', 'sx', 'sbarre'); }],
  ['Persiane e altro', 'pers2', 'Persiana 2 ante', 1200, 1400, function () { var d = due('lamelle'); d.parti.forEach(function (p) { p.node.verso = 'esterno'; }); return d; }],
  ['Persiane e altro', 'pers1', 'Persiana 1 anta', 700, 1400, function () { return cella('battente', 'sx', 'lamelle', { verso: 'esterno' }); }],
  ['Persiane e altro', 'zanz', 'Zanzariera', 1000, 1400, function () { return cella('fisso', 'sx', 'rete'); }],
  ['Persiane e altro', 'pann', 'Pannello cieco', 1000, 1000, function () { return cella('fisso', 'sx', 'pannello'); }]
];
var CATEGORIE = ['Finestre', 'Portefinestre', 'Scorrevoli', 'Porte', 'Verande', 'Cancelli e grate', 'Persiane e altro'];

var APERTURE = [
  ['fisso', null, 'Fisso'], ['battente', 'sx', 'Battente SX'], ['battente', 'dx', 'Battente DX'],
  ['antaribalta', 'sx', 'Anta-ribalta SX'], ['antaribalta', 'dx', 'Anta-ribalta DX'], ['vasistas', null, 'Vasistas'], ['sporgere', null, 'A sporgere'],
  ['scorrevole', 'sx', 'Scorrevole ←'], ['scorrevole', 'dx', 'Scorrevole →'], ['bilico', null, 'Bilico'], ['libro', 'sx', 'A libro SX'], ['libro', 'dx', 'A libro DX']
];
var RIEMPIMENTI = [['vetro', 'Vetro'], ['pannello', 'Pannello'], ['sbarre', 'Sbarre'], ['lamelle', 'Lamelle'], ['rete', 'Rete'], ['vuoto', 'Vuoto']];
function nomeApertura(n) {
  var a = n.apertura;
  if (a === 'battente' || a === 'antaribalta' || a === 'libro') return { battente: 'battente', antaribalta: 'anta-ribalta', libro: 'a libro' }[a] + ' cerniere ' + (n.cerniere || 'sx').toUpperCase();
  if (a === 'scorrevole') return 'scorrevole verso ' + (n.cerniere === 'dx' ? 'destra' : 'sinistra');
  return { fisso: 'fisso', vasistas: 'vasistas', sporgere: 'a sporgere', bilico: 'bilico' }[a] || a;
}

/* ── Geometria ───────────────────────────────────────────────────────── */
function calcola(schema) {
  var out = [];
  (function lay(n, x, y, w, h, padre, indice) {
    if (n.tipo === 'split') {
      var v = n.dir === 'v', tot = v ? w : h, fissi = 0, nAuto = 0;
      n.parti.forEach(function (p) { if (+p.size > 0) fissi += +p.size; else nAuto++; });
      var auto = nAuto ? Math.max(1, (tot - fissi) / nAuto) : 0;
      var somma = fissi + auto * nAuto, k = somma > 0 ? tot / somma : 1; // se le misure non tornano, si scala
      var pos = v ? x : y;
      n.parti.forEach(function (p, i) {
        var s = (+p.size > 0 ? +p.size : auto) * k;
        lay(p.node, v ? pos : x, v ? y : pos, v ? s : w, v ? h : s, n, i);
        pos += s;
      });
    } else out.push({ n: n, x: x, y: y, w: w, h: h, padre: padre, indice: indice });
  })(schema.root, 0, 0, +schema.L || 1000, +schema.H || 1000, null, null);
  return out;
}
function trova(schema, id) {
  var ris = null;
  (function cerca(n, padre, indice) {
    if (ris) return;
    if (n.id === id) { ris = { n: n, padre: padre, indice: indice }; return; }
    if (n.tipo === 'split') n.parti.forEach(function (p, i) { cerca(p.node, n, i); });
  })(schema.root, null, null);
  return ris;
}
function sostituisci(schema, vecchio, nuovo) {
  if (schema.root === vecchio) { schema.root = nuovo; return; }
  (function giro(n) {
    if (n.tipo !== 'split') return;
    n.parti.forEach(function (p) { if (p.node === vecchio) p.node = nuovo; else giro(p.node); });
  })(schema.root);
}
function padreDi(schema, nodo) {
  var r = null;
  (function giro(n) { if (r || n.tipo !== 'split') return; n.parti.forEach(function (p, i) { if (p.node === nodo) r = { padre: n, indice: i }; else giro(p.node); }); })(schema.root);
  return r;
}

/* ── Disegno SVG ─────────────────────────────────────────────────────── */
var COL = { linea: '#16181d', profilo: '#e6e9ee', anta: '#f3f5f8', vetro: '#d9e9f7', pannello: '#cdd3db', quota: '#2b66bd', sel: '#2f6fd0', muro: '#b9bfc8' };
var ns = 0;
function f(n) { return Math.round(n * 10) / 10; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function riga(x1, y1, x2, y2, sw, extra) { return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + COL.linea + '" stroke-width="' + f(sw) + '"' + (extra || '') + '/>'; }
function ret(x, y, w, h, fill, sw, extra) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(Math.max(0, w)) + '" height="' + f(Math.max(0, h)) + '" fill="' + fill + '"' + (sw ? ' stroke="' + COL.linea + '" stroke-width="' + f(sw) + '"' : '') + (extra || '') + '/>'; }
function testo(x, y, t, fs, extra) { return '<text x="' + f(x) + '" y="' + f(y) + '" font-size="' + f(fs) + '" text-anchor="middle" dominant-baseline="middle"' + (extra || '') + '>' + t + '</text>'; }

function riempimento(n, G, sw, id, mini) {
  var s = '', r = n.riemp || 'vetro';
  if (r === 'vuoto') return '';
  if (r === 'vetro') {
    s += ret(G.x, G.y, G.w, G.h, COL.vetro, sw * 0.5);
    if (!mini && G.w > 120 && G.h > 120) { var d = Math.min(G.w, G.h) * 0.12; s += riga(G.x + G.w * 0.62, G.y + G.h * 0.18, G.x + G.w * 0.62 + d, G.y + G.h * 0.18 + d * 0.7, sw * 0.5, ' stroke-opacity=".35"'); }
  } else if (r === 'pannello') {
    s += ret(G.x, G.y, G.w, G.h, COL.pannello, sw * 0.5) + '<g clip-path="url(#k' + id + ')">';
    var p = Math.max(60, Math.min(G.w, G.h) / 7);
    for (var t = -G.h; t < G.w; t += p) s += riga(G.x + t, G.y + G.h, G.x + t + G.h, G.y, sw * 0.4, ' stroke-opacity=".45"');
    s += '</g>';
  } else if (r === 'sbarre') {
    s += ret(G.x, G.y, G.w, G.h, '#ffffff', sw * 0.5);
    var n2 = Math.max(1, Math.round(G.w / 120)), passo = G.w / (n2 + 1);
    for (var i = 1; i <= n2; i++) s += riga(G.x + passo * i, G.y, G.x + passo * i, G.y + G.h, sw * 1.6);
    if (G.h > 400) { s += riga(G.x, G.y + G.h * 0.12, G.x + G.w, G.y + G.h * 0.12, sw * 1.4) + riga(G.x, G.y + G.h * 0.88, G.x + G.w, G.y + G.h * 0.88, sw * 1.4); }
  } else if (r === 'lamelle') {
    s += ret(G.x, G.y, G.w, G.h, '#eef1f4', sw * 0.5);
    for (var yy = G.y + 70; yy < G.y + G.h - 20; yy += 70) s += riga(G.x, yy, G.x + G.w, yy, sw * 0.6);
  } else if (r === 'rete') {
    s += ret(G.x, G.y, G.w, G.h, '#f1f3f5', sw * 0.5) + '<g clip-path="url(#k' + id + ')">';
    for (var q = 0; q < G.w + G.h; q += 45) { s += riga(G.x + q, G.y, G.x + q - G.h, G.y + G.h, sw * 0.25, ' stroke-opacity=".35"') + riga(G.x + q - G.h, G.y, G.x + q, G.y + G.h, sw * 0.25, ' stroke-opacity=".35"'); }
    s += '</g>';
  }
  return s;
}
function simbolo(n, G, sw, est) {
  var a = n.apertura, c = n.cerniere === 'dx' ? 'dx' : 'sx';
  if (est) c = c === 'sx' ? 'dx' : 'sx';
  var verso = n.verso === 'esterno';
  var tratt = (verso !== est) ? ' stroke-dasharray="' + f(sw * 6) + ' ' + f(sw * 4) + '"' : '';
  var x0 = G.x, x1 = G.x + G.w, y0 = G.y, y1 = G.y + G.h, cx = G.x + G.w / 2, cy = G.y + G.h / 2, s = '', w = sw * 0.9;
  var battente = function (stile) {
    var hx = c === 'sx' ? x0 : x1, ox = c === 'sx' ? x1 : x0;
    return riga(ox, y0, hx, cy, w, stile) + riga(ox, y1, hx, cy, w, stile);
  };
  if (a === 'battente') s += battente(tratt);
  else if (a === 'libro') s += battente(' stroke-dasharray="' + f(sw * 8) + ' ' + f(sw * 3) + ' ' + f(sw * 1.5) + ' ' + f(sw * 3) + '"');
  else if (a === 'antaribalta') s += battente(tratt) + riga(x0, y0, cx, y1, w * 0.8, ' stroke-dasharray="' + f(sw * 4) + ' ' + f(sw * 3) + '"') + riga(x1, y0, cx, y1, w * 0.8, ' stroke-dasharray="' + f(sw * 4) + ' ' + f(sw * 3) + '"');
  else if (a === 'vasistas') s += riga(x0, y0, cx, y1, w, tratt) + riga(x1, y0, cx, y1, w, tratt);
  else if (a === 'sporgere') s += riga(x0, y1, cx, y0, w, tratt) + riga(x1, y1, cx, y0, w, tratt);
  else if (a === 'bilico') s += riga(x0, cy, x1, cy, w, ' stroke-dasharray="' + f(sw * 6) + ' ' + f(sw * 3) + '"') + riga(x0, y0, x1, y1, w * 0.7, tratt) + riga(x1, y0, x0, y1, w * 0.7, tratt);
  else if (a === 'scorrevole') {
    var dir = c === 'dx' ? 1 : -1, l = Math.min(G.w * 0.5, 600), xa = cx - dir * l / 2, xb = cx + dir * l / 2, pt = Math.min(l * 0.18, 90);
    s += riga(xa, cy, xb, cy, sw * 1.4) + riga(xb, cy, xb - dir * pt, cy - pt * 0.6, sw * 1.4) + riga(xb, cy, xb - dir * pt, cy + pt * 0.6, sw * 1.4);
  }
  return s;
}
function maniglia(n, R, ts, sw, est) {
  var a = n.apertura; if (a === 'fisso' || a === 'vasistas' || a === 'sporgere' || a === 'bilico') return '';
  var c = n.cerniere === 'dx' ? 'dx' : 'sx'; if (est) c = c === 'sx' ? 'dx' : 'sx';
  var lato = a === 'scorrevole' ? (c === 'dx' ? 'sx' : 'dx') : (c === 'sx' ? 'dx' : 'sx');
  var mw = ts * 0.32, mh = clamp(R.h * 0.12, ts * 1.2, ts * 2.6), mx = lato === 'dx' ? R.x + R.w - ts * 0.5 - mw / 2 : R.x + ts * 0.5 - mw / 2;
  var my = (R.h > 1900 ? R.y + R.h - 1050 : R.y + R.h / 2) - mh / 2;
  return '<rect x="' + f(mx) + '" y="' + f(my) + '" width="' + f(mw) + '" height="' + f(mh) + '" rx="' + f(mw / 2) + '" fill="' + COL.linea + '"/>';
}

/* frontale. o: { quote, sel, numeri, mini, larghezza } */
function svgFrontale(schema, o) {
  o = o || {}; ns++;
  var L = +schema.L || 1000, H = +schema.H || 1000, est = schema.vista === 'esterna', celle = calcola(schema);
  var t = clamp(Math.min(L, H) * 0.045, 35, 75), ts = t * 0.9, sw = Math.max(L, H) / 420;
  var M = o.quote ? Math.max(L, H) * 0.12 : t * 0.6, fs = Math.max(L, H) * 0.032;
  var vb = o.quote ? [-M * 1.5, -M * 1.45, L + M * 2.9, H + M * 2.7] : [-M, -M, L + 2 * M, H + 2 * M];
  var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.map(f).join(' ') + '"' + (o.larghezza ? ' width="' + o.larghezza + '" height="' + Math.round(o.larghezza * vb[3] / vb[2]) + '"' : '') +
    ' preserveAspectRatio="xMidYMid meet" font-family="Inter, Arial, Helvetica, sans-serif" fill="' + COL.linea + '">';
  s += ret(vb[0], vb[1], vb[2], vb[3], '#ffffff', 0);
  var defs = '', corpo = '', clic = '';
  corpo += ret(0, 0, L, H, COL.profilo, sw * 1.5);
  celle.forEach(function (c, k) {
    var x = est ? L - c.x - c.w : c.x, n = c.n;
    var il = x <= 0.5 ? t : t / 2, ir = x + c.w >= L - 0.5 ? t : t / 2, it = c.y <= 0.5 ? t : t / 2, ib = c.y + c.h >= H - 0.5 ? t : t / 2;
    var R = { x: x + il, y: c.y + it, w: c.w - il - ir, h: c.h - it - ib };
    var mobile = n.apertura !== 'fisso', G = R, id = ns + '_' + k;
    if (mobile) { corpo += ret(R.x, R.y, R.w, R.h, COL.anta, sw); G = { x: R.x + ts, y: R.y + ts, w: R.w - 2 * ts, h: R.h - 2 * ts }; }
    var z = +n.zoccolo > 0 && n.riemp === 'vetro' ? Math.min(+n.zoccolo, G.h * 0.6) : 0;
    var Gv = z ? { x: G.x, y: G.y, w: G.w, h: G.h - z } : G;
    defs += '<clipPath id="k' + id + '"><rect x="' + f(G.x) + '" y="' + f(G.y) + '" width="' + f(Math.max(0, G.w)) + '" height="' + f(Math.max(0, G.h)) + '"/></clipPath>';
    corpo += riempimento(n, Gv, sw, id, o.mini);
    if (z) corpo += riempimento({ riemp: 'pannello' }, { x: G.x, y: G.y + G.h - z, w: G.w, h: z }, sw, id, o.mini);
    corpo += simbolo(n, G, sw, est);
    if (!o.mini) corpo += maniglia(n, R, ts, sw, est);
    if (o.numeri && celle.length > 1) {
      var rr = Math.max(fs * 0.75, 18);
      corpo += '<circle cx="' + f(R.x + rr * 1.3) + '" cy="' + f(R.y + rr * 1.3) + '" r="' + f(rr) + '" fill="#ffffff" stroke="' + COL.quota + '" stroke-width="' + f(sw * 0.8) + '"/>' +
        testo(R.x + rr * 1.3, R.y + rr * 1.35, k + 1, rr * 1.15, ' fill="' + COL.quota + '" font-weight="700"');
    }
    if (o.sel && o.sel === n.id) corpo += '<rect x="' + f(R.x) + '" y="' + f(R.y) + '" width="' + f(R.w) + '" height="' + f(R.h) + '" fill="' + COL.sel + '" fill-opacity=".14" stroke="' + COL.sel + '" stroke-width="' + f(sw * 3) + '"/>';
    if (o.cliccabile) clic += '<rect data-id="' + n.id + '" x="' + f(x) + '" y="' + f(c.y) + '" width="' + f(c.w) + '" height="' + f(c.h) + '" fill="transparent" style="cursor:pointer"/>';
  });
  s += '<defs>' + defs + '</defs>' + corpo;
  if (o.quote) s += quoteFrontale(L, H, celle, est, M, fs, sw);
  if (o.quote) s += '<text x="' + f(vb[0] + M * 0.15) + '" y="' + f(vb[1] + M * 0.35) + '" font-size="' + f(fs * 0.85) + '" font-weight="600" fill="' + COL.quota + '">' + (est ? 'VISTA ESTERNA' : 'VISTA INTERNA') + '</text>';
  return s + clic + '</svg>';
}
function catena(valori, lungo) {
  var u = []; valori.forEach(function (v) { if (!u.some(function (x) { return Math.abs(x - v) < 1; })) u.push(v); });
  return u.sort(function (a, b) { return a - b; }).filter(function (v) { return v > -1 && v < lungo + 1; });
}
function quotaO(x1, x2, y, lab, fs, sw, tick) {
  var s = '<g stroke="' + COL.quota + '" stroke-width="' + f(sw) + '">' + '<line x1="' + f(x1) + '" y1="' + f(y) + '" x2="' + f(x2) + '" y2="' + f(y) + '"/>' +
    '<line x1="' + f(x1) + '" y1="' + f(y - tick) + '" x2="' + f(x1) + '" y2="' + f(y + tick) + '"/><line x1="' + f(x2) + '" y1="' + f(y - tick) + '" x2="' + f(x2) + '" y2="' + f(y + tick) + '"/></g>';
  return s + testo((x1 + x2) / 2, y - fs * 0.7, lab, fs, ' fill="' + COL.quota + '" font-weight="600"');
}
function quotaV(y1, y2, x, lab, fs, sw, tick, sinistra) {
  var s = '<g stroke="' + COL.quota + '" stroke-width="' + f(sw) + '">' + '<line x1="' + f(x) + '" y1="' + f(y1) + '" x2="' + f(x) + '" y2="' + f(y2) + '"/>' +
    '<line x1="' + f(x - tick) + '" y1="' + f(y1) + '" x2="' + f(x + tick) + '" y2="' + f(y1) + '"/><line x1="' + f(x - tick) + '" y1="' + f(y2) + '" x2="' + f(x + tick) + '" y2="' + f(y2) + '"/></g>';
  var tx = x + (sinistra ? -fs * 0.8 : fs * 0.8), ty = (y1 + y2) / 2;
  return s + '<text x="' + f(tx) + '" y="' + f(ty) + '" font-size="' + f(fs) + '" text-anchor="middle" dominant-baseline="middle" fill="' + COL.quota + '" font-weight="600" transform="rotate(-90 ' + f(tx) + ' ' + f(ty) + ')">' + lab + '</text>';
}
function quoteFrontale(L, H, celle, est, M, fs, sw) {
  var s = '', tick = fs * 0.35;
  s += quotaO(0, L, H + M * 0.95, Math.round(L), fs * 1.1, sw, tick);
  s += quotaV(0, H, L + M * 0.95, Math.round(H), fs * 1.1, sw, tick, false);
  var xs = catena([].concat.apply([], celle.map(function (c) { var x = est ? L - c.x - c.w : c.x; return [x, x + c.w]; })), L);
  if (xs.length > 2) for (var i = 0; i < xs.length - 1; i++) s += quotaO(xs[i], xs[i + 1], -M * 0.45, Math.round(xs[i + 1] - xs[i]), fs * 0.9, sw * 0.8, tick);
  var ys = catena([].concat.apply([], celle.map(function (c) { return [c.y, c.y + c.h]; })), H);
  if (ys.length > 2) for (var j = 0; j < ys.length - 1; j++) s += quotaV(ys[j], ys[j + 1], -M * 0.55, Math.round(ys[j + 1] - ys[j]), fs * 0.9, sw * 0.8, tick, true);
  return s;
}

/* pianta: sezione orizzontale a metà altezza, esterno in alto e interno in basso */
function svgPianta(schema, o) {
  o = o || {};
  var L = +schema.L || 1000, H = +schema.H || 1000, est = false; // la pianta si guarda sempre dall'interno: esterno in alto
  var celle = calcola(schema).filter(function (c) { return c.y <= H / 2 + 0.5 && c.y + c.h >= H / 2 - 0.5; })
    .sort(function (a, b) { return a.x - b.x; });
  var d = clamp(L * 0.035, 55, 90), t = clamp(Math.min(L, H) * 0.045, 35, 75), sw = Math.max(L, 600) / 420, fs = Math.max(L, 900) * 0.05;
  var gira = function (c) { return c.n.apertura === 'battente' || c.n.apertura === 'antaribalta'; };
  var giuInt = 0, suEst = 0;
  celle.forEach(function (c) {
    var amp = gira(c) ? c.w : c.n.apertura === 'libro' ? c.w * 0.42 : 0;
    if (c.n.verso === 'esterno') suEst = Math.max(suEst, amp); else giuInt = Math.max(giuInt, amp);
  });
  var muro = clamp(L * 0.07, 120, 260), M = Math.max(L, 900) * 0.08;
  // in verticale, dall'alto: ESTERNO, ante che aprono fuori, telaio, ante che aprono dentro / frecce, INTERNO, quota
  var scorr = celle.some(function (c) { return c.n.apertura === 'scorrevole'; }), yArr = d * 1.9;
  var base = d + Math.max(giuInt, scorr ? d * 1.5 : 0), yI = base + fs * 1.0, yQ = yI + fs * 2.1;
  var yE = -Math.max(suEst, d) - fs * 0.9, alto = yE - fs * 0.9;
  var vb = [-muro - M * 0.4, alto, L + 2 * muro + M * 0.8, yQ + fs * 0.6 - alto];
  var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.map(f).join(' ') + '"' + (o.larghezza ? ' width="' + o.larghezza + '" height="' + Math.round(o.larghezza * vb[3] / vb[2]) + '"' : '') +
    ' preserveAspectRatio="xMidYMid meet" font-family="Inter, Arial, Helvetica, sans-serif" fill="' + COL.linea + '">' + ret(vb[0], vb[1], vb[2], vb[3], '#ffffff', 0);
  // muri ai lati (tratteggiati)
  ns++;
  [[-muro, 0], [L, 0]].forEach(function (m, k) {
    var idm = 'm' + ns + '_' + k, hm = d * 3;
    s += '<defs><clipPath id="' + idm + '"><rect x="' + f(m[0]) + '" y="' + f(-d) + '" width="' + f(muro) + '" height="' + f(hm) + '"/></clipPath></defs>';
    s += ret(m[0], -d, muro, hm, COL.muro, 0) + '<g clip-path="url(#' + idm + ')">';
    for (var q = -hm; q < muro; q += d * 0.6) s += riga(m[0] + q, -d + hm, m[0] + q + hm, -d, sw * 0.5, ' stroke-opacity=".55"');
    s += '</g>' + ret(m[0], -d, muro, hm, 'none', sw);
  });
  s += ret(0, 0, L, d, COL.profilo, sw * 1.2);
  celle.forEach(function (c) {
    var n = c.n, x0 = c.x + (c.x <= 0.5 ? t * 0.6 : t * 0.3), x1 = c.x + c.w - (c.x + c.w >= L - 0.5 ? t * 0.6 : t * 0.3), w = x1 - x0;
    var cern = n.cerniere === 'dx' ? 'dx' : 'sx'; if (est) cern = cern === 'sx' ? 'dx' : 'sx';
    var dir = n.verso === 'esterno' ? -1 : 1, yf = dir > 0 ? d : 0;
    if (gira(c)) {
      var hx = cern === 'sx' ? x0 : x1, tip = cern === 'sx' ? x1 : x0;
      s += riga(hx, yf, hx, yf + dir * w, sw * 2.2);
      var sweep = (cern === 'sx') === (dir > 0) ? 1 : 0;
      s += '<path d="M ' + f(tip) + ' ' + f(yf) + ' A ' + f(w) + ' ' + f(w) + ' 0 0 ' + sweep + ' ' + f(hx) + ' ' + f(yf + dir * w) + '" fill="none" stroke="' + COL.linea + '" stroke-width="' + f(sw * 0.8) + '" stroke-dasharray="' + f(sw * 5) + ' ' + f(sw * 4) + '"/>';
    } else if (n.apertura === 'libro') {
      var pk = w * 0.4; // l'anta a libro si disegna piegata a metà, verso il pacchetto
      s += riga(x0, yf, (x0 + x1) / 2, yf + dir * pk, sw * 2) + riga((x0 + x1) / 2, yf + dir * pk, x1, yf, sw * 2);
    } else if (n.apertura === 'scorrevole') {
      var trk = n.cerniere === 'dx' ? d * 0.32 : d * 0.68;
      s += riga(x0, trk, x1, trk, sw * 2.2);
      var dd = (cern === 'dx' ? 1 : -1), mx = (x0 + x1) / 2, ll = Math.min(w * 0.4, 400), p = ll * 0.2;
      s += riga(mx - dd * ll / 2, yArr, mx + dd * ll / 2, yArr, sw * 1.2) + riga(mx + dd * ll / 2, yArr, mx + dd * (ll / 2 - p), yArr - p * 0.5, sw * 1.2) + riga(mx + dd * ll / 2, yArr, mx + dd * (ll / 2 - p), yArr + p * 0.5, sw * 1.2);
    } else {
      s += riga(x0, d / 2, x1, d / 2, sw * (n.riemp === 'pannello' || n.riemp === 'sbarre' ? 2.4 : 1.4));
      if (n.apertura !== 'fisso') s += ret(x0, d * 0.25, w, d * 0.5, 'none', sw * 0.8, ' stroke-dasharray="' + f(sw * 3) + ' ' + f(sw * 3) + '"');
    }
    if (o.cliccabile) s += '<rect data-id="' + n.id + '" x="' + f(c.x) + '" y="' + f(vb[1]) + '" width="' + f(c.w) + '" height="' + f(vb[3]) + '" fill="transparent" style="cursor:pointer"/>';
    if (o.sel === n.id) s += ret(c.x, -d * 0.6, c.w, d * 2.2, COL.sel, 0, ' fill-opacity=".14"');
  });
  s += testo(L / 2, yE, 'ESTERNO', fs * 0.8, ' fill="' + COL.quota + '" font-weight="600"') + testo(L / 2, yI, 'INTERNO', fs * 0.8, ' fill="' + COL.quota + '" font-weight="600"');
  if (!celle.length) s += testo(L / 2, d * 2, 'nessuna parte a metà altezza', fs * 0.7, ' fill="' + COL.quota + '"');
  s += quotaO(0, L, yQ, Math.round(L), fs, sw, fs * 0.35);
  return s + '</svg>';
}

/* ── Descrizione e immagine per il PDF ───────────────────────────────── */
function descrivi(schema) {
  var celle = calcola(schema), est = schema.vista === 'esterna';
  var parti = celle.map(function (c, k) {
    var n = c.n, r = n.riemp && n.riemp !== 'vetro' ? ' ' + n.riemp : '';
    return (celle.length > 1 ? (k + 1) + ') ' : '') + Math.round(c.w) + '×' + Math.round(c.h) + ' ' + nomeApertura(n) + r +
      (n.verso === 'esterno' && n.apertura !== 'fisso' ? ' (apre verso l\'esterno)' : '') + (+n.zoccolo > 0 ? ' zoccolo ' + n.zoccolo : '');
  });
  return 'Telaio ' + Math.round(schema.L) + '×' + Math.round(schema.H) + ' mm, ' + (est ? 'vista esterna' : 'vista interna') + (celle.length > 1 ? ', ' + celle.length + ' parti: ' : ': ') + parti.join('; ');
}
function svgInImmagine(svg) {
  return new Promise(function (res, rej) {
    var im = new Image();
    im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('disegno non convertibile')); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function proporzione(svg) { var m = /viewBox="([^"]+)"/.exec(svg), v = m ? m[1].split(' ').map(Number) : [0, 0, 1, 1]; return v[3] / v[2]; }
/* l'immagine per il PDF e per Dropbox: frontale con le quote + pianta.
   Serramento alto → affiancate (frontale a sinistra); largo → una sopra l'altra. */
function immagine(schema) {
  var W = 1600, ET = 56;
  var af = proporzione(svgFrontale(schema, { quote: true, numeri: true })), ap = proporzione(svgPianta(schema, {}));
  var accanto = af > 0.8;
  var wf = accanto ? Math.round(W * 0.6) : W, wp = accanto ? W - wf - 20 : Math.round(W * 0.7);
  return Promise.all([svgInImmagine(svgFrontale(schema, { quote: true, numeri: true, larghezza: wf })), svgInImmagine(svgPianta(schema, { larghezza: wp }))]).then(function (im) {
    var hf = Math.round(wf * af), hp = Math.round(wp * ap);
    var c = document.createElement('canvas'); c.width = W;
    c.height = accanto ? Math.max(hf, hp + ET) : hf + ET + hp;
    var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im[0], 0, 0, wf, hf);
    var px = accanto ? wf + 20 : (W - wp) / 2, py = accanto ? Math.round((c.height - hp - ET) / 2) + ET : hf + ET;
    x.fillStyle = '#2b66bd'; x.font = '600 34px Inter, Arial, sans-serif'; x.fillText('PIANTA', px + 10, py - 14);
    x.drawImage(im[1], px, py, wp, hp);
    return c.toDataURL('image/jpeg', 0.82);
  });
}

/* ── Editor a schermo intero ─────────────────────────────────────────── */
var E = { el: null, cur: null, storia: [], sel: null, vista: 'frontale', opz: null, cat: 'Finestre' };
function $(s) { return E.el.querySelector(s); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function crea() {
  if (E.el) return;
  var d = document.createElement('div');
  d.className = 'tec'; d.id = 'tecnico'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Disegno tecnico');
  d.innerHTML =
    '<div class="tec-testa"><strong id="tecTitolo">Disegno tecnico</strong>' +
      '<button class="ed-btn" type="button" data-t="modelli">Modelli</button>' +
      '<button class="ed-btn" type="button" data-t="annulla" aria-label="Annulla l\'ultima modifica">Indietro</button></div>' +
    '<div class="tec-barra"><label>L <input id="tecL" inputmode="numeric" autocomplete="off"></label><span>×</span><label>H <input id="tecH" inputmode="numeric" autocomplete="off"></label><span class="tec-mm">mm</span>' +
      '<button class="ed-btn" type="button" data-t="usapos" id="tecUsaPos" hidden>Misure della posizione</button>' +
      '<span class="tec-spinta"></span><div class="tec-schede" role="group" aria-label="Vista"><button type="button" data-tab="frontale" aria-pressed="true">Frontale</button><button type="button" data-tab="pianta" aria-pressed="false">Pianta</button></div>' +
      '<div class="tec-schede" role="group" aria-label="Visto da" id="tecLato"><button type="button" data-lato="interna" aria-pressed="true">Interno</button><button type="button" data-lato="esterna" aria-pressed="false">Esterno</button></div></div>' +
    '<div class="tec-tela" id="tecTela"></div>' +
    '<div class="tec-pannello" id="tecPannello"></div>' +
    '<div class="tec-piede"><button class="ed-btn" type="button" data-t="chiudi">Annulla</button><span class="tec-spinta"></span><button class="ed-btn primario" type="button" data-t="fatto">Fatto</button></div>' +
    '<div class="tec-catalogo" id="tecCatalogo" hidden><div class="tec-cat-testa"><strong>Scegli un modello</strong><button class="ed-btn" type="button" data-t="chiudicat">Chiudi</button></div>' +
      '<div class="tec-cat-schede" id="tecCatSchede"></div><div class="tec-cat-griglia" id="tecCatGriglia"></div>' +
      '<p class="tec-cat-nota">Il modello prende le misure della posizione; poi tocchi ogni parte per cambiarla.</p></div>';
  document.body.appendChild(d); E.el = d;
  d.addEventListener('click', clic);
  $('#tecL').addEventListener('change', misure); $('#tecH').addEventListener('change', misure);
  window.addEventListener('resize', function () { if (!d.hidden) disegna(); });
}
function memorizza() { E.storia.push(JSON.stringify(E.cur)); if (E.storia.length > 60) E.storia.shift(); }
function misure() {
  var L = parseInt($('#tecL').value, 10), H = parseInt($('#tecH').value, 10);
  if (!(L > 50) || !(H > 50)) { $('#tecL').value = E.cur.L; $('#tecH').value = E.cur.H; return; }
  if (L === E.cur.L && H === E.cur.H) return;
  memorizza(); E.cur.L = L; E.cur.H = H; disegna();
}
function disegna() {
  var tela = $('#tecTela');
  tela.innerHTML = E.vista === 'pianta' ? svgPianta(E.cur, { cliccabile: true, sel: E.sel }) : svgFrontale(E.cur, { quote: true, numeri: true, cliccabile: true, sel: E.sel });
  $('#tecL').value = E.cur.L; $('#tecH').value = E.cur.H;
  E.el.querySelectorAll('[data-lato]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lato === (E.cur.vista === 'esterna' ? 'esterna' : 'interna'))); });
  $('#tecLato').hidden = E.vista === 'pianta'; // la pianta si guarda sempre dall'alto, esterno in alto
  E.el.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === E.vista)); });
  var pos = E.opz && E.opz.L > 0 && E.opz.H > 0 && (+E.opz.L !== +E.cur.L || +E.opz.H !== +E.cur.H);
  $('#tecUsaPos').hidden = !pos; if (pos) $('#tecUsaPos').textContent = 'Usa ' + E.opz.L + '×' + E.opz.H;
  pannello();
}
function chip(attr, val, label, on) { return '<button type="button" class="tec-chip" ' + attr + '="' + val + '" aria-pressed="' + (!!on) + '">' + label + '</button>'; }
function pannello() {
  var p = $('#tecPannello');
  var t = E.sel && trova(E.cur, E.sel);
  if (!t) {
    p.innerHTML = '<p class="tec-vuoto">Tocca una parte del disegno per cambiarla: apertura, vetro o pannello, dividerla, darle una misura.</p>' +
      '<div class="tec-sez"><span>Componi</span><div class="tec-chips">' + chip('data-affianca', 'dx', '+ Modello a destra', false) + chip('data-affianca', 'sx', '+ Modello a sinistra', false) +
      chip('data-affianca', 'sopra', '+ Modello sopra', false) + chip('data-affianca', 'sotto', '+ Modello sotto', false) + '</div>' +
      '<small>Per comporre verande, portefinestre con finestre accanto, cancello + pedonale: si aggiunge un altro modello al telaio.</small></div>';
    return;
  }
  var n = t.n, celle = calcola(E.cur), k = -1, geo = null;
  celle.forEach(function (c, i) { if (c.n.id === n.id) { k = i; geo = c; } });
  var pd = padreDi(E.cur, n), h = '';
  h += '<p class="tec-p-titolo">Parte ' + (k + 1) + ' · <span class="tec-num">' + Math.round(geo.w) + ' × ' + Math.round(geo.h) + ' mm</span>' +
    '<button type="button" class="tec-link" data-t="desel">Chiudi</button></p>';
  h += '<div class="tec-sez"><span>Apertura</span><div class="tec-chips">' + APERTURE.map(function (a, i) {
    return chip('data-apr', i, a[2], n.apertura === a[0] && (!a[1] || (n.cerniere || 'sx') === a[1]));
  }).join('') + '</div><small>SX e DX: lato delle cerniere (o verso dello scorrevole) visto dall\'interno.</small></div>';
  h += '<div class="tec-sez"><span>Riempimento</span><div class="tec-chips">' + RIEMPIMENTI.map(function (r) { return chip('data-riemp', r[0], r[1], (n.riemp || 'vetro') === r[0]); }).join('') + '</div></div>';
  if (n.apertura !== 'fisso') h += '<div class="tec-sez"><span>Apre verso</span><div class="tec-chips">' + chip('data-verso', 'interno', 'Interno', n.verso !== 'esterno') + chip('data-verso', 'esterno', 'Esterno', n.verso === 'esterno') + '</div></div>';
  if ((n.riemp || 'vetro') === 'vetro') h += '<div class="tec-sez tec-riga"><span>Zoccolo cieco</span><input class="tec-in" data-zoccolo inputmode="numeric" value="' + (+n.zoccolo || '') + '" placeholder="nessuno"> <span class="tec-mm">mm</span></div>';
  h += '<div class="tec-sez"><span>Dividi questa parte</span><div class="tec-chips">' + chip('data-dividi', 'v2', '2 colonne', false) + chip('data-dividi', 'v3', '3 colonne', false) +
    chip('data-dividi', 'h2', '2 righe', false) + chip('data-dividi', 'sopra', '+ Sopraluce', false) + chip('data-dividi', 'sotto', '+ Sottoluce', false) + '</div></div>';
  if (pd) {
    var dimN = pd.padre.dir === 'v' ? 'Larghezza' : 'Altezza', sz = pd.padre.parti[pd.indice].size;
    h += '<div class="tec-sez tec-riga"><span>' + dimN + ' di questa parte</span><input class="tec-in" data-misura inputmode="numeric" value="' + (+sz > 0 ? Math.round(sz) : '') + '" placeholder="automatica"> <span class="tec-mm">mm</span>' +
      (+sz > 0 ? '<button type="button" class="tec-link" data-t="auto">Automatica</button>' : '') + '</div>';
    h += '<div class="tec-sez"><span>' + (pd.padre.dir === 'v' ? 'Ante e colonne' : 'Righe') + '</span><div class="tec-chips">' +
      chip('data-t', 'accanto', pd.padre.dir === 'v' ? '+ Una parte accanto' : '+ Una riga sotto', false) +
      '<button type="button" class="tec-chip tec-pericolo" data-t="togli">Togli questa parte</button>' +
      '<button type="button" class="tec-chip" data-t="unisci">Unisci tutto in una</button></div></div>';
  }
  p.innerHTML = h;
  var zi = p.querySelector('[data-zoccolo]'); if (zi) zi.addEventListener('change', function () { memorizza(); n.zoccolo = Math.max(0, parseInt(zi.value, 10) || 0); disegna(); });
  var mi = p.querySelector('[data-misura]'); if (mi) mi.addEventListener('change', function () {
    var v = parseInt(mi.value, 10); memorizza(); pd.padre.parti[pd.indice].size = v > 0 ? v : null; disegna();
  });
}
function dividi(n, come) {
  var base = clona(n); delete base.id;
  var copia = function () { return cella(base.apertura, base.cerniere, base.riemp, { verso: base.verso, zoccolo: base.zoccolo }); };
  var nuovo;
  if (come === 'v2') nuovo = divisa('v', [copia(), copia()]);
  else if (come === 'v3') nuovo = divisa('v', [copia(), copia(), copia()]);
  else if (come === 'h2') nuovo = divisa('h', [copia(), copia()]);
  else if (come === 'sopra') nuovo = divisa('h', [parte(400, cella('fisso')), parte(null, copia())]);
  else if (come === 'sotto') nuovo = divisa('h', [parte(null, copia()), parte(400, cella('fisso', 'sx', 'pannello'))]);
  sostituisci(E.cur, n, nuovo);
  E.sel = (come === 'sopra' ? nuovo.parti[1].node : nuovo.parti[0].node).id;
}
function clic(e) {
  var b = e.target.closest('[data-id]');
  if (b && e.target.closest('#tecTela')) { E.sel = E.sel === b.getAttribute('data-id') ? null : b.getAttribute('data-id'); disegna(); return; }
  var tab = e.target.closest('[data-tab]'); if (tab) { E.vista = tab.dataset.tab; disegna(); return; }
  var lt = e.target.closest('[data-lato]'); if (lt) { if (lt.dataset.lato !== (E.cur.vista || 'interna')) { memorizza(); E.cur.vista = lt.dataset.lato; disegna(); } return; }
  var t = e.target.closest('[data-t]');
  var sel = E.sel && trova(E.cur, E.sel);
  if (t) {
    var a = t.dataset.t;
    if (a === 'modelli') { E.affianca = null; apriCatalogo(); }
    else if (a === 'annulla') { if (E.storia.length) { E.cur = JSON.parse(E.storia.pop()); if (E.sel && !trova(E.cur, E.sel)) E.sel = null; disegna(); } }
    else if (a === 'usapos') { memorizza(); E.cur.L = +E.opz.L; E.cur.H = +E.opz.H; disegna(); }
    else if (a === 'desel') { E.sel = null; disegna(); }
    else if (a === 'auto' && sel) { var pd = padreDi(E.cur, sel.n); if (pd) { memorizza(); pd.padre.parti[pd.indice].size = null; disegna(); } }
    else if (a === 'unisci' && sel) {
      var pd2 = padreDi(E.cur, sel.n); if (pd2) { memorizza(); sostituisci(E.cur, pd2.padre, sel.n); disegna(); }
    }
    else if (a === 'accanto' && sel) {
      var pd3 = padreDi(E.cur, sel.n); if (pd3) {
        memorizza(); var b0 = sel.n, nu = cella(b0.apertura, b0.cerniere === 'sx' ? 'dx' : 'sx', b0.riemp, { verso: b0.verso, zoccolo: b0.zoccolo });
        if (b0.tipo === 'split') nu = rinnovaId(clona(b0));
        pd3.padre.parti.splice(pd3.indice + 1, 0, parte(null, nu)); E.sel = nu.id; disegna();
      }
    }
    else if (a === 'togli' && sel) {
      var pd4 = padreDi(E.cur, sel.n); if (pd4) {
        memorizza(); pd4.padre.parti.splice(pd4.indice, 1);
        if (pd4.padre.parti.length === 1) sostituisci(E.cur, pd4.padre, pd4.padre.parti[0].node);
        E.sel = null; disegna();
      }
    }
    else if (a === 'chiudi') esci();
    else if (a === 'fatto') fatto(t);
    return;
  }
  var af = e.target.closest('[data-affianca]'); if (af) { E.affianca = af.dataset.affianca; apriCatalogo(); return; }
  if (!sel) return;
  var n = sel.n;
  var ap = e.target.closest('[data-apr]'); if (ap) { var A = APERTURE[+ap.dataset.apr]; memorizza(); n.apertura = A[0]; if (A[1]) n.cerniere = A[1]; disegna(); return; }
  var ri = e.target.closest('[data-riemp]'); if (ri) { memorizza(); n.riemp = ri.dataset.riemp; disegna(); return; }
  var ve = e.target.closest('[data-verso]'); if (ve) { memorizza(); n.verso = ve.dataset.verso; disegna(); return; }
  var dv = e.target.closest('[data-dividi]'); if (dv) { memorizza(); dividi(n, dv.dataset.dividi); disegna(); }
}
/* «+ Modello a destra / sotto…»: il telaio si allarga e accoglie un altro modello */
function affianca(lato, mod) {
  memorizza();
  var nuovo = mod[5](), v = lato === 'dx' || lato === 'sx', vecchio = E.cur.root;
  var a = parte(v ? E.cur.L : E.cur.H, vecchio), b = parte(v ? mod[3] : mod[4], nuovo);
  E.cur.root = divisa(v ? 'v' : 'h', lato === 'dx' || lato === 'sotto' ? [a, b] : [b, a]);
  if (v) E.cur.L = Math.round(E.cur.L + mod[3]); else E.cur.H = Math.round(E.cur.H + mod[4]);
  E.cur.modello = 'composto'; E.sel = nuovo.tipo === 'split' ? null : nuovo.id;
}
function esci() {
  if (!E.storia.length || !E.opz.conferma) { chiudi(false); return; }
  E.opz.conferma().then(function (ok) { if (ok) chiudi(false); });
}
function apriCatalogo() {
  var c = $('#tecCatalogo');
  $('#tecCatSchede').innerHTML = CATEGORIE.map(function (k) { return '<button type="button" class="tec-chip" data-cat="' + esc(k) + '" aria-pressed="' + (k === E.cat) + '">' + esc(k) + '</button>'; }).join('');
  var L = E.opz && E.opz.L > 0 ? +E.opz.L : 0, H = E.opz && E.opz.H > 0 ? +E.opz.H : 0;
  $('#tecCatGriglia').innerHTML = MODELLI.filter(function (m) { return m[0] === E.cat; }).map(function (m) {
    var sch = { L: m[3], H: m[4], vista: 'interna', root: m[5]() };
    return '<button type="button" class="tec-modello" data-modello="' + m[1] + '">' + svgFrontale(sch, { mini: true }) + '<span>' + esc(m[2]) + '</span></button>';
  }).join('');
  var aff = { dx: 'a destra', sx: 'a sinistra', sopra: 'sopra', sotto: 'sotto' }[E.affianca];
  c.querySelector('.tec-cat-testa strong').textContent = aff ? 'Aggiungi un modello ' + aff : 'Scegli un modello';
  c.querySelector('.tec-cat-nota').textContent = aff ? 'Il modello si aggiunge con le sue misure standard: poi le correggi toccando la parte.' :
    'Il modello prende le misure della posizione; poi tocchi ogni parte per cambiarla.';
  c.hidden = false;
  c.onclick = function (e) {
    e.stopPropagation();
    if (e.target.closest('[data-t="chiudicat"]')) { c.hidden = true; E.affianca = null; return; }
    var k = e.target.closest('[data-cat]'); if (k) { E.cat = k.dataset.cat; apriCatalogo(); return; }
    var m = e.target.closest('[data-modello]'); if (!m) return;
    var mod = MODELLI.filter(function (x) { return x[1] === m.dataset.modello; })[0];
    if (E.affianca) { affianca(E.affianca, mod); E.affianca = null; c.hidden = true; disegna(); return; }
    if (E.cur && E.cur.root) memorizza();
    E.cur = { v: 1, modello: mod[1], L: L || mod[3], H: H || mod[4], vista: E.cur && E.cur.vista || 'interna', root: mod[5]() };
    E.sel = null; c.hidden = true; disegna();
  };
}
function fatto(btn) {
  btn.disabled = true;
  var sch = clona(E.cur);
  immagine(sch).then(function (img) {
    btn.disabled = false;
    var cb = E.opz.onSave; chiudi(true);
    cb({ v: 1, schema: sch, img: img, descr: descrivi(sch) });
  }, function (er) { btn.disabled = false; if (E.opz.avviso) E.opz.avviso('Non riesco a salvare il disegno: ' + er.message); });
}
function chiudi(salvato) {
  if (!E.el || E.el.hidden) return;
  E.el.hidden = true; $('#tecCatalogo').hidden = true;
  if (E.opz && E.opz.onClose) E.opz.onClose(salvato);
}
/* apri({ schema, L, H, titolo, categoria, onSave, onClose, avviso }) */
function apri(opz) {
  crea();
  E.opz = opz || {}; E.storia = []; E.sel = null; E.vista = 'frontale';
  if (opz.categoria && CATEGORIE.indexOf(opz.categoria) >= 0) E.cat = opz.categoria;
  $('#tecTitolo').textContent = opz.titolo || 'Disegno tecnico';
  E.el.hidden = false;
  if (opz.schema && opz.schema.root) { E.cur = clona(opz.schema); disegna(); }
  else {
    var m = MODELLI.filter(function (x) { return x[0] === E.cat; })[0] || MODELLI[0];
    E.cur = { v: 1, modello: m[1], L: +opz.L > 0 ? +opz.L : m[3], H: +opz.H > 0 ? +opz.H : m[4], vista: 'interna', root: m[5]() };
    disegna(); E.affianca = null; apriCatalogo();
  }
}
function aperto() { return !!(E.el && !E.el.hidden); }
/* «indietro» del telefono: prima chiude il catalogo, poi l'editor */
function indietro() {
  if (!aperto()) return false;
  if (!$('#tecCatalogo').hidden) { $('#tecCatalogo').hidden = true; E.affianca = null; return true; }
  esci(); return true;
}

root.DFTecnico = { apri: apri, aperto: aperto, indietro: indietro, chiudi: chiudi, descrivi: descrivi, immagine: immagine,
  svgFrontale: svgFrontale, svgPianta: svgPianta, MODELLI: MODELLI, CATEGORIE: CATEGORIE, _calcola: calcola };
})(window);
