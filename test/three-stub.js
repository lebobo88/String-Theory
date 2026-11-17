/* A stand-in for Three.js so the interface and flow can be smoke-tested where the CDN is unreachable.
   Every property auto-creates, every call returns another stand-in. It draws nothing. */
window.__THREE_STUB__ = (function () {
  function mk() {
    const store = { children: [] };
    const f = function () {};
    const p = new Proxy(f, {
      get(t, k) {
        if (k === Symbol.toPrimitive) return () => 0;
        if (k === 'then') return undefined;
        if (k === 'array') return new Float32Array(0);
        if (k === 'add') return o => { store.children.push(o); return p; };
        if (k === 'remove') return o => { const i = store.children.indexOf(o); if (i >= 0) store.children.splice(i, 1); return p; };
        if (!(k in store)) store[k] = mk();
        return store[k];
      },
      set(t, k, v) { store[k] = v; return true; },
      has() { return true; },
      construct() { return mk(); },
      apply() { return mk(); }
    });
    return p;
  }
  return mk();
})();
