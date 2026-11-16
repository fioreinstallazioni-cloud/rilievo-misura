#!/usr/bin/env node
/* Banco di prova dell'avviso alla macchina (3.5.0): dopo che un rilievo è stato caricato del tutto su Dropbox, dbx.js chiama il webhook di n8n.
   Si lancia con:  node prove/banco-avviso.js
   Carica il VERO dbx.js in un sandbox `vm`, con una memoria finta (IndexedDB in memoria), un Dropbox finto e un fetch finto che registra le chiamate.
   Nomi, numeri e indirizzi sono INVENTATI. */
'use strict';
var fs = require('fs'), vm = require('vm'), path = require('path');
var src = fs.readFileSync(path.join(__dirname, '..', 'dbx.js'), 'utf8');
var URL_AVVISO = (src.match(/var URL_AVVISO_RILIEVO = '([^']+)'/) || [])[1];
if (!URL_AVVISO) { console.error('FAIL: non trovo URL_AVVISO_RILIEVO in dbx.js'); process.exit(2); }

/* ── IndexedDB finta, in memoria: quanto basta per dbx.js ─────────────── */
function fakeIDB() {
  var data = {}, chiavi = {};
  function req(fn) { var r = {}; setTimeout(function () { try { r.result = fn(); r.onsuccess && r.onsuccess(); } catch (e) { r.error = e; r.onerror && r.onerror(); } }, 0); return r; }
  return { data: data, open: function () {
    var rq = {};
    setTimeout(function () {
      var db = {
        objectStoreNames: { contains: function (n) { return !!data[n]; } },
        createObjectStore: function (n, o) { data[n] = new Map(); chiavi[n] = o && o.keyPath; },
        transaction: function () {
          var t = {};
          return Object.assign(t, { objectStore: function (n) {
            var fine = function () { setTimeout(function () { t.oncomplete && t.oncomplete(); }, 0); };
            return {
              get: function (k) { return req(function () { var v = data[n].get(k); return v === undefined ? undefined : structuredClone(v); }); },
              getAll: function () { return req(function () { return Array.from(data[n].values()).map(function (v) { return structuredClone(v); }); }); },
              count: function () { return req(function () { return data[n].size; }); },
              put: function (v, k) { data[n].set(chiavi[n] ? v[chiavi[n]] : k, structuredClone(v)); fine(); },
              delete: function (k) { data[n].delete(k); fine(); }
            };
          } });
        },
        close: function () {}
      };
      rq.result = db;
      rq.onupgradeneeded && rq.onupgradeneeded();
      rq.onsuccess && rq.onsuccess();
    }, 0);
    return rq;
  } };
}

/* ── una sessione: memoria nuova, dbx.js nuovo, fetch che registra ─────── */
function sessione(opz) {
  opz = opz || {};
  var idb = fakeIDB(), chiamate = [], uploads = [];
  var s = { chiamate: chiamate, uploads: uploads, rete: { avviso: opz.avviso || 'ok', online: true } };
  var ctx = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, structuredClone: structuredClone, URLSearchParams: URLSearchParams,
    AbortController: AbortController, TextEncoder: TextEncoder, Date: Date, indexedDB: idb, VERSIONE_APP: '3.5.0',
    navigator: { get onLine() { return s.rete.online; } },
    fetch: function (url, o) {
      o = o || {};
      if (url === URL_AVVISO) {
        chiamate.push({ url: url, metodo: o.method, tipo: (o.headers || {})['Content-Type'], corpo: JSON.parse(o.body) });
        var c = s.rete.avviso;
        if (c === 'cade') return Promise.reject(new TypeError('Failed to fetch'));
        var ok = c === 'ok';
        return Promise.resolve({ ok: ok, status: ok ? 200 : (c === '429' ? 429 : 503), json: function () { return Promise.resolve(ok ? { ok: true, id: 'ri-x' } : { ok: false, motivo: 'prova' }); } });
      }
      if (/files\/upload/.test(url)) {
        var arg = JSON.parse(o.headers['Dropbox-API-Arg']);
        uploads.push(arg.path);
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ path_display: arg.path }); } });
      }
      return Promise.reject(new Error('fetch inatteso: ' + url));
    }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'dbx.js' });
  s.D = ctx.DFDropbox; s.S = ctx.DFStore;
  s.pronto = s.S.kvSet('dbx', { refresh: 'r', key: 'k', access: 'a', exp: Date.now() + 3600000 });
  s.accoda = function (o) {
    o = o || {};
    var cart = o.cartella || '/Ufficio/COMMESSE/Commesse Installazioni 2026/Lead/zzz Prova';
    var f = function (chiave, nome) { return { chiave: chiave, nome: nome, path: cart + '/' + nome, modo: 'add', dati: new ArrayBuffer(4), fatto: false }; };
    var voce = { id: 'rzzz1', cliente: 'zzz Prova', cartella: cart, createdAt: Date.now(), versione: o.versione || 1000, tentativi: 0,
                 files: [f('pdf', 'Rilievo_zzz_Prova_2026-11-16.pdf'), f('json', 'dati_zzz_Prova_2026-11-16.json')] };
    if (o.destType !== null) voce.destType = o.destType || 'lead';
    return s.S.store.put('outbox', voce).then(function () { return s.D.aggiornaInvio(voce.id, { stato: 'in_coda', cartella: cart }); });
  };
  s.invio = function () { return s.S.store.get('invii', 'rzzz1'); };
  s.giro = function () { return s.D.svuotaCoda('prova'); };
  return s;
}

var pass = 0, fail = 0;
function ck(ok, nome, dett) { if (ok) pass++; else { fail++; console.log('FAIL: ' + nome + (dett ? '  → ' + dett : '')); } }
function eq(a, b, nome) { ck(JSON.stringify(a) === JSON.stringify(b), nome, 'ottenuto ' + JSON.stringify(a) + ', atteso ' + JSON.stringify(b)); }

(async function () {
  var s, r, inv;

  /* 1. lead caricato → UNA POST col body giusto */
  s = sessione(); await s.pronto; await s.accoda();
  r = await s.giro();
  eq(r.inviati, 1, '1 lead: inviati');
  eq(s.chiamate.length, 1, '1 lead: una sola POST');
  var c = s.chiamate[0] || { corpo: {} }, b = c.corpo;
  eq(c.metodo, 'POST', '1 metodo'); eq(c.tipo, 'text/plain', '1 Content-Type text/plain');
  eq(b.rilievoId, 'rzzz1', '1 rilievoId'); eq(b.versione, 1000, '1 versione'); eq(b.cliente, 'zzz Prova', '1 cliente'); eq(b.destType, 'lead', '1 destType');
  eq(b.cartella, '/Ufficio/COMMESSE/Commesse Installazioni 2026/Lead/zzz Prova', '1 cartella');
  eq(b.dati, '/Ufficio/COMMESSE/Commesse Installazioni 2026/Lead/zzz Prova/dati_zzz_Prova_2026-11-16.json', '1 percorso dati (quello restituito da Dropbox)');
  eq(b.pdf, '/Ufficio/COMMESSE/Commesse Installazioni 2026/Lead/zzz Prova/Rilievo_zzz_Prova_2026-11-16.pdf', '1 percorso pdf');
  eq(b.app, '3.5.0', '1 versione app');
  inv = await s.invio();
  eq(inv.stato, 'inviato', '1 stato inviato'); eq(inv.avvisoMacchina, 'ok', '1 avviso ok'); ck(inv.avvisoMacchinaIl > 0, '1 avvisoMacchinaIl scritto'); eq(inv.avvisoVersione, 1000, '1 avvisoVersione');

  /* 1b. seconda chiamata dopo un avviso riuscito → nessuna POST, nemmeno rimettendo in coda la STESSA versione */
  await s.giro(); eq(s.chiamate.length, 1, '1b secondo giro: nessuna POST');
  await s.accoda(); r = await s.giro();
  eq(s.uploads.length, 4, '1b stessa versione rimandata: i file vengono caricati di nuovo'); eq(s.chiamate.length, 1, '1b stessa versione: nessun secondo avviso');
  /* 1c. versione nuova (rilievo modificato e rimandato) → un avviso nuovo, una volta sola */
  await s.accoda({ versione: 2000 }); await s.giro(); await s.giro();
  eq(s.chiamate.length, 2, '1c versione nuova: una POST in più'); eq(s.chiamate[1].corpo.versione, 2000, '1c versione nuova nel body');
  inv = await s.invio(); eq(inv.avvisoVersione, 2000, '1c avvisoVersione aggiornata');

  /* 2. commessa → nessuna POST, il caricamento è comunque «inviato» */
  s = sessione(); await s.pronto; await s.accoda({ destType: 'commessa', cartella: '/Ufficio/COMMESSE/Commesse Installazioni 2026/C99-ZZZ Prova' });
  r = await s.giro(); inv = await s.invio();
  eq(r.inviati, 1, '2 commessa: inviati'); eq(s.chiamate.length, 0, '2 commessa: nessuna POST'); eq(inv.stato, 'inviato', '2 commessa: stato inviato');
  await s.giro(); eq(s.chiamate.length, 0, '2 commessa: nemmeno al giro dopo');

  /* 3. fetch dell'avviso che fallisce → caricamento «inviato», avviso ritentato al giro dopo, al massimo 3 volte in tutto */
  s = sessione({ avviso: 'cade' }); await s.pronto; await s.accoda();
  r = await s.giro(); inv = await s.invio();
  eq(r.inviati, 1, '3 rete giù: il caricamento riesce comunque'); eq(r.errore, null, '3 rete giù: il giro non segnala errore'); eq(inv.stato, 'inviato', '3 stato inviato');
  ck(/^errore: /.test(inv.avvisoMacchina || ''), '3 avviso segnato errore', inv.avvisoMacchina); eq(inv.avvisoTentativi, 1, '3 un tentativo'); eq(s.chiamate.length, 1, '3 una POST');
  await s.giro(); eq(s.chiamate.length, 2, '3 secondo tentativo al giro dopo');
  await s.giro(); eq(s.chiamate.length, 3, '3 terzo tentativo');
  await s.giro(); await s.giro(); eq(s.chiamate.length, 3, '3 mai oltre 3 tentativi'); inv = await s.invio(); eq(inv.avvisoTentativi, 3, '3 tentativi segnati: 3');
  eq((await s.D.avvisiDaRiprovare()).length, 0, '3 più nulla da riprovare');

  /* 3b. fallisce la prima volta, riesce al giro dopo → ok, e poi basta */
  s = sessione({ avviso: 'cade' }); await s.pronto; await s.accoda(); await s.giro();
  eq((await s.D.avvisiDaRiprovare()).length, 1, '3b un avviso da riprovare');
  s.rete.avviso = 'ok'; await s.giro(); inv = await s.invio();
  eq(inv.avvisoMacchina, 'ok', '3b riuscito al secondo giro'); eq(inv.avvisoTentativi, 2, '3b tentativi: 2'); eq(s.chiamate.length, 2, '3b due POST');
  await s.giro(); eq(s.chiamate.length, 2, '3b dopo il successo nessun altro avviso'); eq((await s.D.avvisiDaRiprovare()).length, 0, '3b più nulla da riprovare');

  /* 3c. risposta non buona di n8n (503, 429) = avviso non riuscito, mai un errore del caricamento */
  s = sessione({ avviso: '503' }); await s.pronto; await s.accoda(); r = await s.giro(); inv = await s.invio();
  eq(r.inviati, 1, '3c 503: caricamento riuscito'); ck(/^errore: risposta 503/.test(inv.avvisoMacchina || ''), '3c 503: avviso in errore', inv.avvisoMacchina);

  /* 3d. senza linea il ripasso non butta i tentativi */
  s = sessione({ avviso: 'cade' }); await s.pronto; await s.accoda(); await s.giro();
  s.rete.online = false; await s.giro(); await s.giro(); eq(s.chiamate.length, 1, '3d offline: nessun tentativo buttato');
  s.rete.online = true; s.rete.avviso = 'ok'; await s.giro(); eq(s.chiamate.length, 2, '3d di nuovo online: riprova'); inv = await s.invio(); eq(inv.avvisoMacchina, 'ok', '3d riuscito');

  /* 4. rilievi già su Dropbox prima della 3.5 (nessun avvisoDovuto) → mai avvisati */
  s = sessione(); await s.pronto;
  await s.D.aggiornaInvio('rvecchio', { stato: 'inviato', cartella: '/Ufficio/COMMESSE/Commesse Installazioni 2026/Lead/zzz Vecchio', versione: 5, percorsi: { json: '/x/dati_a.json' } });
  await s.giro(); eq(s.chiamate.length, 0, '4 rilievi vecchi: nessuna POST'); eq((await s.D.avvisiDaRiprovare()).length, 0, '4 rilievi vecchi: niente da riprovare');

  /* 5. voce in coda di prima della 3.5 (senza destType): si capisce dalla cartella */
  s = sessione(); await s.pronto; await s.accoda({ destType: null }); await s.giro();
  eq(s.chiamate.length, 1, '5 voce senza destType in una cartella Lead: avvisa');
  s = sessione(); await s.pronto; await s.accoda({ destType: null, cartella: '/Ufficio/COMMESSE/Commesse Installazioni 2026/C99-ZZZ Prova' }); await s.giro();
  eq(s.chiamate.length, 0, '5 voce senza destType in una commessa: non avvisa');

  console.log((fail ? 'FALLITO' : 'OK') + ': ' + pass + '/' + (pass + fail) + (fail ? ' (' + fail + ' falliti)' : ''));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('ERRORE del banco:', e); process.exit(2); });
