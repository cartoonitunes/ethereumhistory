/* data.js - the bestiary loader. Instead of baking contracts in, the game now
 * pulls them from ETHEREUM HISTORY:
 *
 *   1. instantly loads the committed snapshot  /game/game-data.json
 *      (generated from the EH database by scripts/gen-game-data.ts)
 *   2. then refreshes in the background from   /api/game/creatures
 *      (the live DB) when the site is reachable.
 *
 * Either way the game gets the same shape - every DOCUMENTED contract on
 * Ethereum (one with real editorial history), as a catchable "creature".
 * creatures.js depends only on the shape, not the source.
 *
 * EH_DATA exposes: contracts[], zones[], byZone(eraId), byAddr(addr), loaded.
 * window.EH_DATA_READY resolves once the snapshot is in (the game waits on it).
 */
(function () {
  "use strict";
  var C = [], byA = {}, zones = [];

  function ingest(d) {
    if (!d || !Array.isArray(d.contracts) || !d.contracts.length) return false;
    C = d.contracts;
    zones = d.zones || zones;
    byA = {};
    C.forEach(function (c) {
      c.addr = String(c.addr).toLowerCase();
      if (!c.link) c.link = "https://ethereumhistory.com/contract/" + c.addr;
      byA[c.addr] = c;
    });
    EH_DATA.contracts = C;
    EH_DATA.zones = zones;
    EH_DATA.loaded = true;
    EH_DATA.generatedAt = d.generatedAt || null;
    return true;
  }

  window.EH_DATA = {
    contracts: C, zones: zones, loaded: false, generatedAt: null,
    byZone: function (z) { return C.filter(function (c) { return c.zone === z; }); },
    byAddr: function (a) { return byA[String(a).toLowerCase()] || null; },
    featured: function () { return C.filter(function (c) { return c.featured || c.rarity === "LEGENDARY"; }); }
  };

  // resolve game-data.json relative to THIS script, so it works at any mount path
  var me = (document.currentScript && document.currentScript.src) || "";
  var base = me.replace(/assets\/js\/data\.js.*$/, "");
  var SNAPSHOT_URL = base + "game-data.json";
  var LIVE_URL = "/api/game/creatures";

  window.EH_DATA_READY = fetch(SNAPSHOT_URL)
    .then(function (r) { if (!r.ok) throw new Error("snapshot " + r.status); return r.json(); })
    .then(function (d) {
      ingest(d);
      // background live refresh - never blocks play, silently ignored if offline
      fetch(LIVE_URL)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d2) { if (d2 && d2.contracts && d2.contracts.length) ingest(d2); })
        .catch(function () {});
      return d;
    })
    .catch(function (e) { console.warn("[EH] game data failed to load:", e); return null; });
})();
