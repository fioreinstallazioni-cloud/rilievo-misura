/* ═══════════════════════════════════════════════════════════════════════
   Rilievo misure — memoria del telefono (IndexedDB) e invii a Dropbox.
   Lo usano sia la pagina sia il service worker (sw.js), quindi qui non si
   tocca mai il DOM.

   Archivi (object store):
   - rilievi : i rilievi, uno per record { id, createdAt, updatedAt, data }
   - kv      : impostazioni (Dropbox, rubrica, commesse, rilievo aperto…)
   - outbox  : la coda degli invii: { id = id rilievo, cartella, files[] }
               ogni file porta i suoi byte (ArrayBuffer) finché non è caricato
   - invii   : lo stato dell'invio di ogni rilievo (in coda, inviato, errore)
               — tenuto separato da «rilievi» così il salvataggio automatico
               della pagina e il caricamento in background non si pestano.
   ═══════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var DB_NAME = 'df-rilievo';
  var DB_VER = 1;
  var STORES = ['rilievi', 'kv', 'outbox', 'invii'];
  var dbp = null;

  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!root.indexedDB) { rej(new Error('IndexedDB non disponibile')); return; }
      var rq = root.indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains('rilievi')) db.createObjectStore('rilievi', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('invii')) db.createObjectStore('invii', { keyPath: 'id' });
      };
      rq.onsuccess = function () {
        var db = rq.result;
        db.onversionchange = function () { db.close(); dbp = null; };
        res(db);
      };
      rq.onerror = function () { rej(rq.error); };
      rq.onblocked = function () { rej(new Error('Memoria bloccata da un\'altra scheda aperta')); };
    });
    dbp.catch(function () { dbp = null; });
    return dbp;
  }

  function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  var store = {
    get: function (st, key) { return openDB().then(function (db) { return reqP(db.transaction(st).objectStore(st).get(key)); }); },
    getAll: function (st) { return openDB().then(function (db) { return reqP(db.transaction(st).objectStore(st).getAll()); }); },
    count: function (st) { return openDB().then(function (db) { return reqP(db.transaction(st).objectStore(st).count()); }); },
    /* la promessa si risolve solo a scrittura conclusa (transazione completa) */
    put: function (st, val, key) {
      return openDB().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction(st, 'readwrite');
          var os = t.objectStore(st);
          if (key === undefined) os.put(val); else os.put(val, key);
          t.oncomplete = function () { res(val); };
          t.onerror = function () { rej(t.error); };
          t.onabort = function () { rej(t.error || new Error('Scrittura annullata')); };
        });
      });
    },
    del: function (st, key) {
      return openDB().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction(st, 'readwrite');
          t.objectStore(st).delete(key);
          t.oncomplete = function () { res(); };
          t.onerror = function () { rej(t.error); };
        });
      });
    }
  };
  function kvGet(k) { return store.get('kv', k); }
  function kvSet(k, v) { return store.put('kv', v, k); }

  /* ── avvisi fra pagina e service worker ─────────────────────────────── */
  var canale = null;
  try { if (root.BroadcastChannel) canale = new root.BroadcastChannel('df-rilievo'); } catch (e) { canale = null; }
  function annuncia(msg) { try { if (canale) canale.postMessage(msg); } catch (e) {} }

  /* ── errori con un codice, così si sa se riprovare ─────────────────── */
  function errore(code, msg) { var e = new Error(msg); e.code = code; return e; }
  // rete      → manca la linea o è troppo lenta: si riprova da soli
  // ricollega → il collegamento a Dropbox non vale più: va rifatto
  // noncoll   → Dropbox non è collegato su questo telefono
  // dropbox   → Dropbox ha rifiutato il file (si mostra il messaggio)

  function fetchT(url, opts, ms) {
    var ctrl = root.AbortController ? new root.AbortController() : null;
    var o = Object.assign({}, opts || {});
    if (ctrl) o.signal = ctrl.signal;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 30000) : null;
    return root.fetch(url, o).then(function (r) { if (timer) clearTimeout(timer); return r; }, function (e) {
      if (timer) clearTimeout(timer);
      throw errore('rete', 'Nessuna linea (' + (e && e.name === 'AbortError' ? 'tempo scaduto' : 'rete non raggiungibile') + ')');
    });
  }

  /* l'header Dropbox-API-Arg accetta solo ASCII */
  function asciiSafe(s) { return s.replace(/[\u007f-￿]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); }); }

  /* ── Dropbox ────────────────────────────────────────────────────────── */
  function cfg() { return kvGet('dbx').then(function (c) { return c || {}; }); }
  function setCfg(c) { return kvSet('dbx', c); }
  function collegato() { return cfg().then(function (c) { return !!c.refresh; }); }

  function token(forza) {
    return cfg().then(function (c) {
      if (!c.refresh) throw errore('noncoll', 'Dropbox non è collegato su questo telefono');
      if (!forza && c.access && c.exp && c.exp > Date.now() + 60000) return c.access;
      return fetchT('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: c.refresh, client_id: c.key }).toString()
      }, 20000).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.ok && d.access_token) {
            c.access = d.access_token; c.exp = Date.now() + (d.expires_in || 14400) * 1000;
            return setCfg(c).then(function () { return c.access; });
          }
          if (d.error === 'invalid_grant' || r.status === 400 || r.status === 401) throw errore('ricollega', 'Il collegamento a Dropbox non vale più: ricollegalo dalle impostazioni');
          if (r.status >= 500 || r.status === 429) throw errore('rete', 'Dropbox non risponde (' + r.status + ')');
          throw errore('dropbox', 'Rinnovo del collegamento fallito: ' + (d.error_description || d.error || r.status));
        });
      });
    });
  }

  function scambiaCodice(code) {
    return cfg().then(function (c) {
      return fetchT('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: code.trim(), grant_type: 'authorization_code', client_id: c.key, code_verifier: c.verifier || '' }).toString()
      }, 20000).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (d) {
        if (!d.refresh_token) throw errore('dropbox', d.error_description || d.error || 'Codice non valido');
        c.refresh = d.refresh_token; delete c.verifier;
        if (d.access_token) { c.access = d.access_token; c.exp = Date.now() + (d.expires_in || 14400) * 1000; }
        return setCfg(c).then(function () { return true; });
      });
    });
  }

  function chiamaApi(url, corpo, tk) {
    return fetchT(url, {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo)
    }, 20000);
  }

  function carica(path, dati, modo, tk) {
    var arg = { path: path, mode: modo === 'overwrite' ? 'overwrite' : 'add', autorename: modo !== 'overwrite', mute: true };
    return fetchT('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tk, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': asciiSafe(JSON.stringify(arg)) },
      body: dati
    }, 120000).then(function (r) {
      if (r.ok) return r.json();
      return r.text().then(function (t) {
        if (r.status === 401) throw errore('token', 'Token scaduto');
        if (r.status === 429 || r.status >= 500) throw errore('rete', 'Dropbox occupato (' + r.status + '), riprovo più tardi');
        if (r.status === 409 && /insufficient_space/.test(t)) throw errore('dropbox', 'Dropbox è pieno: libera spazio');
        throw errore('dropbox', 'Dropbox ha rifiutato il file (' + r.status + '): ' + t.slice(0, 200));
      });
    });
  }

  function caricaConRinnovo(path, dati, modo, tk) {
    return carica(path, dati, modo, tk.v).catch(function (e) {
      if (e.code !== 'token') throw e;
      return token(true).then(function (nuovo) { tk.v = nuovo; return carica(path, dati, modo, nuovo); });
    });
  }

  /* metadati di un file (serve la «rev» per non riscaricare un file che non è cambiato) */
  function metadati(path) {
    return token().then(function (tk) {
      return chiamaApi('https://api.dropboxapi.com/2/files/get_metadata', { path: path }, tk);
    }).then(function (r) {
      if (r.ok) return r.json();
      return r.text().then(function (t) {
        if (r.status === 409 && /not_found/.test(t)) throw errore('dropbox', 'File non trovato su Dropbox: ' + path);
        throw errore(r.status >= 500 ? 'rete' : 'dropbox', 'Dropbox non risponde (' + r.status + ')');
      });
    });
  }
  /* scarica un file intero (la rubrica aziendale) */
  function scarica(path) {
    return token().then(function (tk) {
      return fetchT('https://content.dropboxapi.com/2/files/download', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + tk, 'Dropbox-API-Arg': asciiSafe(JSON.stringify({ path: path })) }
      }, 60000);
    }).then(function (r) {
      if (!r.ok) throw errore(r.status >= 500 ? 'rete' : 'dropbox', 'Download non riuscito (' + r.status + ')');
      return r.arrayBuffer();
    });
  }

  function elencoCartelle(path) {
    return token().then(function (tk) {
      return chiamaApi('https://api.dropboxapi.com/2/files/list_folder', { path: path, recursive: false, limit: 2000 }, tk);
    }).then(function (r) {
      if (!r.ok) throw errore(r.status >= 500 ? 'rete' : 'dropbox', 'Elenco cartelle non disponibile (' + r.status + ')');
      return r.json();
    }).then(function (d) {
      return (d.entries || []).filter(function (e) { return e['.tag'] === 'folder'; }).map(function (e) { return e.name; });
    });
  }

  /* ── la coda degli invii ─────────────────────────────────────────────── */
  function aggiornaInvio(id, patch) {
    return store.get('invii', id).then(function (cur) {
      var v = Object.assign({ id: id }, cur || {}, patch, { aggiornatoIl: Date.now() });
      return store.put('invii', v);
    });
  }

  /* se nel frattempo il rilievo è stato rimesso in coda (versione nuova),
     non si tocca la voce nuova: la si manda al giro successivo */
  function stessaVoce(it) {
    return store.get('outbox', it.id).then(function (cur) { return !!cur && cur.createdAt === it.createdAt; });
  }
  function salvaVoce(it) { return stessaVoce(it).then(function (ok) { if (ok) return store.put('outbox', it); }); }
  function togliVoce(it) { return stessaVoce(it).then(function (ok) { if (ok) return store.del('outbox', it.id); return 'sostituita'; }); }

  var occupato = false;
  function conBlocco(fn) {
    var nav = root.navigator;
    if (nav && nav.locks && nav.locks.request) {
      return nav.locks.request('df-invio-dropbox', { ifAvailable: true }, function (lock) {
        if (!lock) return { occupato: true };
        return fn();
      });
    }
    if (occupato) return Promise.resolve({ occupato: true });
    occupato = true;
    return Promise.resolve().then(fn).then(function (r) { occupato = false; return r; }, function (e) { occupato = false; throw e; });
  }

  /* Prova a mandare tutto quello che è in coda. Non lancia mai errori:
     restituisce un riassunto { inviati, rimasti, errore }. */
  function svuotaCoda(origine) {
    return conBlocco(function () {
      return store.getAll('outbox').then(function (items) {
        items.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
        var esito = { inviati: 0, rimasti: items.length, errore: null, codice: null, origine: origine || '' };
        if (!items.length) return esito;
        var tk = { v: null };
        return token().then(function (t) { tk.v = t; }).then(function () {
          var i = 0;
          function prossimo() {
            if (i >= items.length) return esito;
            var it = items[i++];
            return aggiornaInvio(it.id, { stato: 'invio', errore: null }).then(function () {
              annuncia({ tipo: 'invio', id: it.id });
              var j = 0;
              function file() {
                if (j >= it.files.length) return null;
                var f = it.files[j++];
                if (f.fatto) return file();
                return caricaConRinnovo(f.path, f.dati, f.modo, tk).then(function (res) {
                  f.fatto = true; f.risultato = res && res.path_display; f.dati = null; // i byte non servono più
                  return salvaVoce(it).then(file);
                });
              }
              return file();
            }).then(function () {
              var percorsi = {};
              it.files.forEach(function (f) { percorsi[f.chiave || f.nome] = f.risultato || f.path; });
              return togliVoce(it).then(function (esitoTogli) {
                var patch = { inviatoIl: Date.now(), cartella: it.cartella, percorsi: percorsi, versione: it.versione, errore: null, tentativi: 0 };
                patch.stato = esitoTogli === 'sostituita' ? 'in_coda' : 'inviato';
                return aggiornaInvio(it.id, patch);
              }).then(function () {
                esito.inviati++; esito.rimasti--;
                annuncia({ tipo: 'inviato', id: it.id, cliente: it.cliente });
                return prossimo();
              });
            }, function (e) {
              it.tentativi = (it.tentativi || 0) + 1; it.ultimoErrore = e.message; it.ultimoTentativo = Date.now();
              return salvaVoce(it).then(function () {
                var stato = (e.code === 'rete') ? 'in_coda' : 'errore';
                return aggiornaInvio(it.id, { stato: stato, errore: e.code === 'rete' ? null : e.message, tentativi: it.tentativi });
              }).then(function () {
                esito.errore = e.message; esito.codice = e.code;
                annuncia({ tipo: 'errore', id: it.id, codice: e.code, messaggio: e.message });
                // senza linea o senza collegamento è inutile provare gli altri
                if (e.code === 'rete' || e.code === 'ricollega' || e.code === 'noncoll') return esito;
                return prossimo();
              });
            });
          }
          return prossimo();
        }, function (e) {
          esito.errore = e.message; esito.codice = e.code;
          var stato = e.code === 'rete' ? 'in_coda' : 'errore';
          return Promise.all(items.map(function (it) {
            return aggiornaInvio(it.id, { stato: stato, errore: e.code === 'rete' ? null : e.message });
          })).then(function () { annuncia({ tipo: 'errore', codice: e.code, messaggio: e.message }); return esito; });
        });
      });
    }).then(function (r) { annuncia({ tipo: 'coda-finita', esito: r }); return r; }, function (e) {
      return { inviati: 0, rimasti: -1, errore: e && e.message, codice: 'interno' };
    });
  }

  root.DFStore = { openDB: openDB, store: store, kvGet: kvGet, kvSet: kvSet, STORES: STORES };
  root.DFDropbox = {
    cfg: cfg, setCfg: setCfg, collegato: collegato, token: token, scambiaCodice: scambiaCodice,
    elencoCartelle: elencoCartelle, metadati: metadati, scarica: scarica, svuotaCoda: svuotaCoda, aggiornaInvio: aggiornaInvio, annuncia: annuncia,
    canale: function () { return canale; }
  };
})(typeof self !== 'undefined' ? self : this);
