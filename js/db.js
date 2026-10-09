// Minimal IndexedDB wrapper — stores: kv, days, plans, photos, weights
const DB_NAME = 'donusum';
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of ['kv', 'days', 'plans', 'photos', 'weights']) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => res(r && r.result !== undefined ? r.result : r);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export const db = {
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),
  set: (store, key, val) => tx(store, 'readwrite', s => s.put(val, key)),
  del: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
  keys: (store) => tx(store, 'readonly', s => s.getAllKeys()),
  all: async (store) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, 'readonly').objectStore(store);
      const out = {};
      const c = t.openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); };
      c.onerror = () => rej(c.error);
    });
  },
  clear: (store) => tx(store, 'readwrite', s => s.clear()),
};
