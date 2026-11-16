#!/usr/bin/env node
/* Banco di prova della rubrica aziendale (3.4.1): raggruppamento delle righe con lo stesso NOME,
   voci dei referenti, compilazione del cliente, ricerca per cifre.
   Si lancia con:  node prove/banco-rubrica.js
   Carica da app.js solo il pezzo della rubrica (dal «var RUBRICA_PREDEFINITA» a «salvaInRubrica»)
   in un sandbox `vm`, con finte minime di quello che serve. Nomi e numeri sono INVENTATI. */
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
var a = src.indexOf('var RUBRICA_PREDEFINITA'), b = src.indexOf('/* sul telefono si tengono');
if (a < 0 || b < a) { console.error('FAIL: non trovo il pezzo della rubrica in app.js'); process.exit(2); }

var avvisi = [], testate = 0, fuochi = 0, combo = null;
var ctx = {
  S: {}, rubrica: [], imp: {}, comboAperta: null, console: console,
  disegnaTestata: function () { testate++; }, salvaPresto: function () {},
  avviso: function (t, tipo) { avvisi.push({ t: t, tipo: tipo }); },
  $: function () { return { focus: function () { fuochi++; } }; },
  setTimeout: function (f) { f(); },
  apriCombo: function (input, filtro, voci) { combo = voci; }, chiudiCombo: function () {},
  online: function () { return false; }, DFDropbox: {}, kvSet: function () { return Promise.resolve(); }, caricaScript: function () {}
};
vm.createContext(ctx);
vm.runInContext(src.slice(a, b), ctx, { filename: 'app.js (rubrica)' });
vm.runInContext('var __esporta = { daRigaRubrica: daRigaRubrica, cercaContatti: cercaContatti, compilaDaContatto: compilaDaContatto, ' +
  'suggerisciRubrica: suggerisciRubrica, dettaglioContatto: dettaglioContatto, contattiAziendali: contattiAziendali, ' +
  'imposta: function (righe) { rubAz = { contatti: righe.map(daRigaRubrica).filter(Boolean) }; gruppiRubrica = null; } };', ctx);
var R = ctx.__esporta;

var pass = 0, fail = 0;
function prova(nome, ok, dettaglio) {
  if (ok) { pass++; console.log('PASS  ' + nome); }
  else { fail++; console.log('FAIL  ' + nome + (dettaglio !== undefined ? '  →  ' + JSON.stringify(dettaglio) : '')); }
}
function nuovo(tipoCliente) {
  ctx.S = { cliente: '', tel: '', email: '', via: '', referente: '', tipoCliente: tipoCliente || 'privato', rubricaRif: null };
  avvisi.length = 0; fuochi = 0; testate = 0;
  return ctx.S;
}

/* ── la rubrica finta (come le righe vere di Excel) ── */
var RIGHE = [
  { NOME: 'Ditta Prova s.r.l.', REFERENTE: '', CODICE: '1000001', PIVA: '01234567890', INDIRIZZO: 'Via Finta 1', CITTA: 'Napoli', PROVINCIA: 'na', CAP: '80100', EMAIL: 'info@ditta-prova.example.test', TELEFONO: '', CELLULARE: '' },
  { NOME: 'Ditta Prova s.r.l.', REFERENTE: 'Mario', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: '', TELEFONO: '', CELLULARE: '3330000001' },
  { NOME: 'Ditta Prova s.r.l.', REFERENTE: 'Lucia', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: 'lucia@ditta-prova.example.test', TELEFONO: '', CELLULARE: '3330000002' },

  { NOME: 'Ferramenta Esempio s.n.c.', REFERENTE: '', CODICE: '1000002', PIVA: '09876543210', INDIRIZZO: 'Via Esempio 7', CITTA: 'Caserta', PROVINCIA: 'CE', CAP: '81100', EMAIL: 'info@ferramenta.example.test', TELEFONO: '0810000000', CELLULARE: '' },
  { NOME: 'Ferramenta Esempio s.n.c.', REFERENTE: 'Pina', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: '', TELEFONO: '', CELLULARE: '3330000003' },

  { NOME: 'Costruzioni Uno s.r.l.', REFERENTE: '', CODICE: '1000003', PIVA: '01122334455', INDIRIZZO: 'Via Uno 3', CITTA: 'Aversa', PROVINCIA: 'CE', CAP: '81031', EMAIL: 'info@uno.example.test', TELEFONO: '', CELLULARE: '' },
  { NOME: 'Costruzioni Uno s.r.l.', REFERENTE: 'Gino', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: '', TELEFONO: '', CELLULARE: '3330000004' },

  { NOME: 'Rivendita Prova s.r.l.', REFERENTE: '', CODICE: '1000004', PIVA: '05566778899', INDIRIZZO: 'Via Rivendita 9', CITTA: 'Napoli', PROVINCIA: 'NA', CAP: '80100', EMAIL: 'info@rivendita.example.test', TELEFONO: '', CELLULARE: '' },
  { NOME: 'Rivendita Prova s.r.l.', REFERENTE: 'Carla', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: '', TELEFONO: '', CELLULARE: '3330000005' },

  { NOME: 'Ditta Mista s.r.l.', REFERENTE: 'Anna', CODICE: '1000005', PIVA: '02233445566', INDIRIZZO: 'Via Mista 2', CITTA: 'Napoli', PROVINCIA: 'NA', CAP: '80100', EMAIL: 'info@mista.example.test', TELEFONO: '', CELLULARE: '3330000006' },
  { NOME: 'Ditta Mista s.r.l.', REFERENTE: 'Bruno', CODICE: '', PIVA: '', INDIRIZZO: '', CITTA: '', CAP: '', EMAIL: '', TELEFONO: '', CELLULARE: '3330000007' },

  { NOME: 'Giulia Verdi', REFERENTE: '', CODICE: '2000001', PIVA: '', INDIRIZZO: 'Via dei Prati 5', CITTA: 'Napoli', PROVINCIA: 'NA', CAP: '80100', EMAIL: 'giulia@example.test', TELEFONO: '', CELLULARE: '3330000008' },
  { NOME: 'Ditta Sola s.r.l.', REFERENTE: '', CODICE: '1000006', PIVA: '03344556677', INDIRIZZO: 'Via Sola 4', CITTA: 'Napoli', PROVINCIA: 'NA', CAP: '80100', EMAIL: 'info@sola.example.test', TELEFONO: '0810000001', CELLULARE: '' }
];
R.imposta(RIGHE);
var tutte = R.contattiAziendali();
function ditta(nome) { return tutte.filter(function (c) { return c.nome === nome; })[0]; }
function trova(q, max) { return R.cercaContatti(q, max); }
function etichette(lista) { return lista.map(function (c) { return c.rif ? c.nome + ' — ' + c.rif.nome : c.nome; }); }

/* 1. raggruppamento */
var dp = ditta('Ditta Prova s.r.l.');
prova('raggruppamento: 13 righe -> 7 contatti (una per ditta)', tutte.length === 7, tutte.length);
prova('raggruppamento: la ditta è la riga col CODICE (telefono vuoto)', dp && dp.codice === '1000001' && dp.tel === '' && dp.piva === '01234567890', dp);
prova('raggruppamento: due referenti con nome e telefono', dp.referenti.length === 2 && dp.referenti[0].nome === 'Mario' && dp.referenti[0].tel === '3330000001' && dp.referenti[1].nome === 'Lucia' && dp.referenti[1].email === 'lucia@ditta-prova.example.test', dp.referenti);
prova('raggruppamento: la riga principale con REFERENTE e telefono diventa referente (inPrincipale)', ditta('Ditta Mista s.r.l.').referenti.length === 2 && ditta('Ditta Mista s.r.l.').referenti[0].inPrincipale === true, ditta('Ditta Mista s.r.l.').referenti);
prova('raggruppamento: ditta senza righe doppie non ha referenti', ditta('Ditta Sola s.r.l.').referenti.length === 0 && ditta('Giulia Verdi').referenti.length === 0);
prova('raggruppamento: la lista è la stessa se la rubrica non cambia (cache)', R.contattiAziendali() === tutte);

/* 2. suggerimenti */
var s1 = trova('ditta prova');
prova('ricerca per nome: la ditta una volta e sotto i due referenti', etichette(s1).join('|') === 'Ditta Prova s.r.l.|Ditta Prova s.r.l. — Mario|Ditta Prova s.r.l. — Lucia', etichette(s1));
nuovo();
R.suggerisciRubrica({ value: 'Ditta Prova', closest: function () { return null; } });
prova('combo: etichetta del referente «Ditta Prova s.r.l. — Mario · 333 000 0001»', combo && combo.length === 3 && combo[1].etichetta === 'Ditta Prova s.r.l. — Mario · 333 000 0001', combo && combo.map(function (v) { return v.etichetta; }));
prova('combo: sotto la ditta «Referenti: Mario, Lucia»', combo && /Referenti: Mario, Lucia/.test(combo[0].dett), combo && combo[0].dett);
prova('combo: la voce del referente non ripete il numero nel dettaglio', combo && combo[1].dett.indexOf('333') < 0, combo && combo[1].dett);
var cm = trova('ditta mista');
prova('ditta con referente nella riga principale: voce solo per il secondo (il primo è già la ditta)', etichette(cm).join('|') === 'Ditta Mista s.r.l.|Ditta Mista s.r.l. — Bruno', etichette(cm));
prova('contatti senza doppioni: nessuna voce in più', etichette(trova('giulia')).join('|') === 'Giulia Verdi' && etichette(trova('ditta sola')).join('|') === 'Ditta Sola s.r.l.');
prova('il privato non cambia: dettaglio come prima (tipo · telefono · via)', R.dettaglioContatto(ditta('Giulia Verdi')) === 'Privato · 3330000008 · Via dei Prati 5, Napoli (NA), 80100' || /3330000008/.test(R.dettaglioContatto(ditta('Giulia Verdi'))), R.dettaglioContatto(ditta('Giulia Verdi')));

/* 3. compila da referente */
var voceMario = trova('ditta prova')[1], S = nuovo('azienda');
R.compilaDaContatto(voceMario);
prova('referente: cliente = nome della ditta', S.cliente === 'Ditta Prova s.r.l.', S.cliente);
prova('referente: telefono del referente', S.tel === '3330000001', S.tel);
prova('referente (azienda): nome del referente nel campo referente', S.referente === 'Mario' && S.tipoCliente === 'azienda', [S.referente, S.tipoCliente]);
prova('referente: email della ditta se il referente non ne ha', S.email === 'info@ditta-prova.example.test', S.email);
prova('referente: indirizzo, codice e P.IVA dalla riga principale', S.via === 'Via Finta 1, Napoli (NA), 80100' && S.rubricaRif && S.rubricaRif.codice === '1000001' && S.rubricaRif.piva === '01234567890' && S.rubricaRif.nome === 'Ditta Prova s.r.l.', [S.via, S.rubricaRif]);
prova('referente: avviso «Dati di … (Mario)»', avvisi.length === 1 && /\(Mario\)/.test(avvisi[0].t) && avvisi[0].tipo === 'ok', avvisi);
S = nuovo('azienda'); R.compilaDaContatto(trova('ditta prova')[2]);
prova('referente con email propria: usa la sua', S.email === 'lucia@ditta-prova.example.test' && S.tel === '3330000002' && S.referente === 'Lucia', S);

/* 3b. rivenditore: il campo referente è il «cliente finale», non ci va il referente della ditta */
var vCarla = trova('rivendita prova')[1];
ctx.rubrica = [{ nome: 'Rivendita Prova s.r.l.', tipoCliente: 'rivenditore', inAziendale: true }];
S = nuovo('privato'); R.compilaDaContatto(vCarla);
prova('rivenditore: telefono del referente ma NIENTE nome nel campo referente', S.tel === '3330000005' && S.tipoCliente === 'rivenditore' && S.referente === '', [S.tel, S.tipoCliente, S.referente]);
prova('rivenditore: codice e P.IVA dalla principale', S.rubricaRif && S.rubricaRif.codice === '1000004' && S.rubricaRif.piva === '05566778899', S.rubricaRif);
ctx.rubrica = [];

/* 4. ditta senza referente scelto */
S = nuovo(); R.compilaDaContatto(ditta('Ferramenta Esempio s.n.c.'));
prova('ditta col telefono nella riga principale: usa quello (come prima)', S.tel === '0810000000' && avvisi.length === 1 && avvisi[0].tipo === 'ok' && fuochi === 0, [S.tel, avvisi]);
S = nuovo(); R.compilaDaContatto(ditta('Costruzioni Uno s.r.l.'));
prova('ditta senza telefono e UN solo referente: telefono suo + avviso «Telefono di Gino»', S.tel === '3330000004' && avvisi.length === 1 && /Telefono di Gino/.test(avvisi[0].t) && fuochi === 0, [S.tel, avvisi]);
S = nuovo(); R.compilaDaContatto(dp);
prova('ditta senza telefono e DUE referenti: telefono vuoto, mai indovinato', S.tel === '', S.tel);
prova('due referenti: avviso «Scegli il referente: Mario, Lucia»', avvisi.length === 1 && avvisi[0].t === 'Scegli il referente: Mario, Lucia' && avvisi[0].tipo === 'errore', avvisi);
prova('due referenti: il campo Telefono riceve il focus', fuochi === 1, fuochi);
prova('due referenti: il resto si compila (cliente, indirizzo, codice)', S.cliente === 'Ditta Prova s.r.l.' && S.via.indexOf('Via Finta 1') === 0 && S.rubricaRif.codice === '1000001', S);
S = nuovo(); R.compilaDaContatto(ditta('Giulia Verdi'));
prova('privato senza doppioni: invariato', S.cliente === 'Giulia Verdi' && S.tel === '3330000008' && S.tipoCliente === 'privato' && fuochi === 0 && /^Dati di Giulia Verdi presi dalla rubrica aziendale$/.test(avvisi[0].t), [S, avvisi]);
S = nuovo(); R.compilaDaContatto(ditta('Ditta Mista s.r.l.'));
prova('ditta con referente nella principale: telefono e referente come prima', S.tel === '3330000006' && S.referente === 'Anna' && fuochi === 0, [S.tel, S.referente, fuochi]);

/* 5. ricerca per cifre */
var c1 = trova('333 000 0002');
prova('cifre: il telefono di un referente trova la sua voce (Lucia)', c1.length === 1 && c1[0].rif && c1[0].rif.nome === 'Lucia' && c1[0].tel === '3330000002', etichette(c1));
var c2 = trova('3330000003');
prova('cifre: trova il referente della ferramenta, non la ditta', c2.length === 1 && c2[0].rif && c2[0].rif.nome === 'Pina', etichette(c2));
var c3 = trova('0810000000');
prova('cifre: il telefono della ditta trova la ditta (con i suoi referenti)', etichette(c3).join('|') === 'Ferramenta Esempio s.n.c.|Ferramenta Esempio s.n.c. — Pina', etichette(c3));
prova('cifre: nessun risultato per un numero che non c\'è', trova('3339999999').length === 0);
S = nuovo('azienda'); R.compilaDaContatto(c1[0]);
prova('cifre -> compila: telefono e referente giusti', S.tel === '3330000002' && S.referente === 'Lucia' && S.cliente === 'Ditta Prova s.r.l.', S);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
