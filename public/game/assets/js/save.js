/* save.js - identity, persistence, and the collection ("DEX") screen.
 *
 * Identity is Google Sign-In (the same client id as HumanityCards). The ID
 * token is decoded client-side only for the display name; the raw token is sent
 * to /api/save as a Bearer credential, and the server verifies it and keys the
 * save on the stable `sub`. Email is never stored.
 *
 * The save itself is tiny - a list of caught contract addresses, the player's
 * position, and their lead contract. Creatures are rebuilt from data.js on
 * load, so the wire format is just strings. Everything also mirrors to
 * localStorage, so the game is fully playable signed-out / offline; signing in
 * just syncs that across devices.
 *
 * Exposes EH_STATE (the live session), EH_AUTH (GSI), EH_SAVE (persistence),
 * and EH_COLLECTION (the DEX scene).
 */
(function () {
  "use strict";
  var GB = window.GB;
  var CLIENT_ID = "316184838132-03rs2kuu774tjtts2gf8dje1vr59hiq3.apps.googleusercontent.com";
  var API = "/api/game/save";
  var LS_KEY = "eh_game_save_v1";
  var TOKEN_KEY = "eh_g_token";

  // ---- live session state (the rest of the game reads/writes this) ----
  var EH_STATE = window.EH_STATE = {
    signedIn: false, token: null, sub: null, name: "HISTORIAN",
    collection: [],          // array of caught contract addresses (deduped)
    party: [],               // party[0] is the ACTIVE battler creature
    active: null,            // current battle creature w/ live HP
    activeAddr: null,        // addr of the active battler
    roster: {},              // addr -> {level, xp}: per-contract progress (swap battler)
    pos: { zone: "frontier", x: 1, y: 7 }
  };

  // ---- JWT decode (display only) --------------------------------------
  function b64url(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); var p = s.length % 4; if (p) s += "====".slice(p); return atob(s); }
  function decodeJwt(t) {
    try {
      var parts = String(t).split("."); if (parts.length < 2) return null;
      var bin = b64url(parts[1]);
      var pct = bin.split("").map(function (c) { return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2); }).join("");
      return JSON.parse(decodeURIComponent(pct));
    } catch (e) { return null; }
  }

  // ---- serialization ---------------------------------------------------
  // write the live battler's level/XP back into the roster before saving
  function syncLead() {
    var lead = EH_STATE.party[0];
    if (lead && EH_STATE.activeAddr) EH_STATE.roster[EH_STATE.activeAddr] = { level: lead.level, xp: lead.xp };
  }
  function serialize() {
    syncLead();
    return {
      collection: EH_STATE.collection.slice(),
      pos: EH_STATE.pos,
      activeAddr: EH_STATE.activeAddr,
      roster: EH_STATE.roster,
      v: 3
    };
  }
  function applySave(data) {
    if (!data || typeof data !== "object") return;
    var byAddr = window.EH_DATA.byAddr;
    if (Array.isArray(data.collection)) {
      EH_STATE.collection = data.collection
        .map(function (a) { return String(a).toLowerCase(); })
        .filter(function (a) { return !!byAddr(a); });
    }
    if (data.pos && window.EH_WORLD && window.EH_WORLD.ZONES[data.pos.zone] && !window.EH_WORLD.ZONES[data.pos.zone].interior) EH_STATE.pos = data.pos;
    if (data.roster && typeof data.roster === "object") {
      EH_STATE.roster = {};
      Object.keys(data.roster).forEach(function (a) { var k = a.toLowerCase(); if (byAddr(k)) EH_STATE.roster[k] = data.roster[a]; });
    }
    var active = (data.activeAddr || data.lead);                  // v3 or legacy v2
    if (active) active = String(active).toLowerCase();
    if (active && byAddr(active)) {
      var r = EH_STATE.roster[active] || { level: data.leadLevel || 5, xp: data.leadXp || 0 };
      EH_STATE.roster[active] = r;
      EH_STATE.activeAddr = active;
      EH_STATE.party = [window.EH_CREATURES.make(byAddr(active), r.level || 5, r.xp || 0)];
    }
  }
  // swap the active battler to a caught contract (keeps each one's own level/XP)
  function setActive(addr) {
    addr = String(addr).toLowerCase();
    var c = window.EH_DATA.byAddr(addr); if (!c) return false;
    syncLead();
    var r = EH_STATE.roster[addr] || { level: 5, xp: 0 };
    EH_STATE.roster[addr] = r;
    EH_STATE.activeAddr = addr;
    EH_STATE.party = [window.EH_CREATURES.make(c, r.level || 5, r.xp || 0)];
    save();
    return true;
  }
  function persistLead() { syncLead(); save(); }

  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(serialize())); } catch (e) {}
  }
  function loadLocal() {
    try { var s = localStorage.getItem(LS_KEY); if (s) applySave(JSON.parse(s)); } catch (e) {}
  }

  // ---- server sync -----------------------------------------------------
  function save() {
    saveLocal();
    if (!EH_STATE.signedIn || !EH_STATE.token) return Promise.resolve(false);
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + EH_STATE.token },
      body: JSON.stringify({ state: serialize() })
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  function loadRemote() {
    if (!EH_STATE.signedIn || !EH_STATE.token) return Promise.resolve(null);
    return fetch(API, { headers: { Authorization: "Bearer " + EH_STATE.token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.state ? j.state : null; })
      .catch(function () { return null; });
  }

  // Merge: take the union of caught contracts (never lose a catch), prefer the
  // remote position if present. Then persist the merged result back.
  function syncOnSignIn() {
    return loadRemote().then(function (remote) {
      if (remote) {
        var byAddr = window.EH_DATA.byAddr, localSet = {};
        EH_STATE.collection.forEach(function (a) { localSet[a] = 1; });
        (remote.collection || []).forEach(function (a) { localSet[String(a).toLowerCase()] = 1; });
        EH_STATE.collection = Object.keys(localSet).filter(function (a) { return !!byAddr(a); });
        // merge roster, keeping the higher level for each contract
        if (remote.roster) Object.keys(remote.roster).forEach(function (a) {
          var k = a.toLowerCase(); if (!byAddr(k)) return;
          var rr = remote.roster[a], cur = EH_STATE.roster[k];
          if (!cur || (rr.level || 0) > (cur.level || 0)) EH_STATE.roster[k] = rr;
        });
        if (remote.pos && window.EH_WORLD.ZONES[remote.pos.zone] && !window.EH_WORLD.ZONES[remote.pos.zone].interior) EH_STATE.pos = remote.pos;
        var active = remote.activeAddr || remote.lead;
        if (active && byAddr(String(active).toLowerCase()) && !EH_STATE.party.length) setActive(active);
      }
      return save();
    });
  }

  function addCatch(creature) {
    var a = creature.contract.addr;
    if (EH_STATE.collection.indexOf(a) === -1) EH_STATE.collection.push(a);
    // a freshly documented contract joins your roster at the level you caught it,
    // so it's immediately fieldable (swap to it from the Dex)
    if (!EH_STATE.roster[a]) EH_STATE.roster[a] = { level: creature.level || 5, xp: 0 };
    save(); // auto-save after each catch
  }

  // ---- Google Identity Services ---------------------------------------
  var gbtnEl = null, gsiReady = false, onAuthChange = null;
  function ready() { return !!(window.google && window.google.accounts && window.google.accounts.id); }

  function onCredential(resp) {
    var token = resp && resp.credential;
    var p = token && decodeJwt(token);
    if (!p || !p.sub) return;
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
    EH_STATE.signedIn = true; EH_STATE.token = token; EH_STATE.sub = p.sub;
    EH_STATE.name = (p.given_name || p.name || "HISTORIAN").toUpperCase();
    syncOnSignIn().then(function () { if (onAuthChange) onAuthChange(true); });
    if (onAuthChange) onAuthChange(true);
  }

  function restoreToken() {
    var token; try { token = localStorage.getItem(TOKEN_KEY); } catch (e) { token = null; }
    if (!token) return false;
    var p = decodeJwt(token);
    if (!p || !p.sub || !p.exp || p.exp * 1000 <= Date.now()) {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      return false;
    }
    EH_STATE.signedIn = true; EH_STATE.token = token; EH_STATE.sub = p.sub;
    EH_STATE.name = (p.given_name || p.name || "HISTORIAN").toUpperCase();
    return true;
  }

  function initGsi() {
    if (!ready()) return;
    try {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID, callback: onCredential,
        auto_select: true, cancel_on_tap_outside: true, itp_support: true
      });
    } catch (e) { return; }
    gsiReady = true;
    if (gbtnEl) renderButton(gbtnEl);
  }
  function renderButton(container) {
    gbtnEl = container;
    if (!gsiReady || !ready()) return;
    try {
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        type: "standard", theme: "filled_black", size: "large", shape: "pill", text: "signin_with"
      });
    } catch (e) {}
  }
  function signOut() {
    try { if (ready()) window.google.accounts.id.disableAutoSelect(); } catch (e) {}
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    EH_STATE.signedIn = false; EH_STATE.token = null; EH_STATE.sub = null; EH_STATE.name = "HISTORIAN";
    if (onAuthChange) onAuthChange(false);
  }

  window.onGoogleLibraryLoad = initGsi;
  if (ready()) initGsi();

  // restore a signed-in session + local progress immediately at boot
  loadLocal();
  if (restoreToken()) { syncOnSignIn(); }

  // ---- DEX / collection scene -----------------------------------------
  function collectionCreatures() {
    return EH_STATE.collection
      .map(function (a) { return window.EH_DATA.byAddr(a); })
      .filter(Boolean)
      .map(function (c) { return window.EH_CREATURES.make(c); });
  }

  var dexScene = {
    sel: 0, detail: null, t: 0, dScroll: 0, dLines: null,
    enter: function () { this.sel = 0; this.detail = null; this.dScroll = 0; this.dLines = null; this.list = collectionCreatures(); },
    onPress: function (b) {
      var n = this.list.length;
      if (this.detail) {
        var maxS = Math.max(0, (this.dLines ? this.dLines.length : 0) - 3);
        if (b === GB.BTN.b) { this.detail = null; this.dScroll = 0; this.dLines = null; this.toast = 0; }
        else if (b === GB.BTN.a) { try { window.open(this.detail.link, "_blank", "noopener"); } catch (e) {} }
        else if (b === GB.BTN.start) {        // make this contract your active battler
          var addr = this.detail.contract.addr;
          if (EH_STATE.activeAddr !== addr) { setActive(addr); this.toast = 2.4; }
        }
        else if (b === GB.BTN.down) this.dScroll = Math.min(maxS, this.dScroll + 1);
        else if (b === GB.BTN.up) this.dScroll = Math.max(0, this.dScroll - 1);
        return;
      }
      if (b === GB.BTN.b || b === GB.BTN.start) { GB.pop(); return; }
      if (!n) return;
      var cols = 5;
      if (b === GB.BTN.left) this.sel = (this.sel + n - 1) % n;
      else if (b === GB.BTN.right) this.sel = (this.sel + 1) % n;
      else if (b === GB.BTN.up) this.sel = (this.sel + n - cols) % n;
      else if (b === GB.BTN.down) this.sel = (this.sel + cols) % n;
      else if (b === GB.BTN.a) { this.detail = this.list[this.sel]; this.dScroll = 0; this.dLines = null; }
    },
    update: function (dt) { this.t += dt; },
    render: function () {
      GB.clear("box");                                  // light page
      GB.rect(0, 0, GB.W, 16, "blue"); GB.rect(0, 16, GB.W, 1, "navy"); // header bar
      GB.text("HISTORIAN'S DEX", 6, 5, "white");
      var cnt = EH_STATE.collection.length + "/" + window.EH_DATA.contracts.length;
      GB.text(cnt, GB.W - 6 - GB.textWidth(cnt), 5, "white");

      if (this.detail) { drawDetail(this.detail, this.t, this); return; }

      if (!this.list.length) {
        GB.text("NO CONTRACTS DOCUMENTED YET.", 14, 50, "ink");
        GB.text("WALK THE TALL GRASS AND", 14, 66, "ink");
        GB.text("CATCH SOME HISTORY!", 14, 78, "ink");
        GB.text("B: BACK", 8, GB.H - 12, "dim");
        return;
      }
      // grid of sprites, 5 across, vertically scrolled to keep the cursor on-screen
      var cols = 5, cw = 46, ch = 42, x0 = 7, y0 = 22, rowsVis = 3;
      var scroll = Math.max(0, Math.floor(this.sel / cols) - (rowsVis - 1));
      for (var i = 0; i < this.list.length; i++) {
        var row = Math.floor(i / cols) - scroll;
        if (row < 0 || row >= rowsVis) continue;
        var cr = this.list[i];
        var gx = x0 + (i % cols) * cw, gy = y0 + row * ch;
        if (i === this.sel) GB.boxR(gx - 1, gy - 1, 42, 40, "gray1", "blue");
        GB.spriteO(cr.sprite, gx + 4, gy + 1, 2, cr.ramp);
        GB.text(cr.name.slice(0, 6), gx + 1, gy + 34, "ink");
      }
      var s = this.list[this.sel];
      GB.rect(0, GB.H - 12, GB.W, 12, "blue");
      GB.text(s.name.slice(0, 20) + "  " + s.rarityInfo.label, 5, GB.H - 10, "white");
    }
  };
  function drawDetail(cr, t, scene) {
    var c = cr.contract;
    GB.boxR(8, 22, 74, 70, "gray1", "navy");
    GB.spriteO(cr.sprite, 16, 28, 4, cr.ramp);
    for (var s = 0; s < cr.rarityInfo.stars; s++) GB.rect(14 + s * 6, 84, 4, 4, "gold");
    var x = 90, y = 22, isActive = EH_STATE.activeAddr === c.addr;
    GB.text(cr.name.slice(0, 22), x, y, "ink");
    GB.text(cr.type + "  " + cr.rarityInfo.label + (c.copies ? "  x" + c.copies : ""), x, y + 11, "blue");
    var st = cr.stats, r = EH_STATE.roster[c.addr];
    var dexLvl = r ? r.level : st.lvl;
    GB.text("HP " + st.maxhp + "   ATK " + st.atk, x, y + 24, "ink");
    GB.text("DEF " + st.def + "   SPD " + st.spd, x, y + 34, "ink");
    GB.text("LV " + dexLvl + "   YEAR " + c.year, x, y + 44, "ink");
    GB.text(c.addr.slice(0, 8) + "..." + c.addr.slice(-6), x, y + 57, "dim");
    if (isActive) GB.text("* ACTIVE BATTLER *", x, y + 66, "red");
    else if (c.deployer) GB.text("BY " + c.deployer.slice(0, 8) + "..", x, y + 66, "dim");

    // scrollable real history (short description + significance)
    if (!scene.dLines) {
      var txt = c.blurb || "";
      if (c.sig && c.sig !== c.blurb) txt += (txt ? "  " : "") + c.sig;
      scene.dLines = GB.wrap(txt, GB.W - 24);
    }
    var by = 96, bh = GB.H - by - 12, rows = 3, scroll = scene.dScroll || 0;
    GB.boxR(6, by, GB.W - 12, bh);
    for (var i = 0; i < rows; i++) {
      var ln = scene.dLines[scroll + i];
      if (ln) GB.text(ln, 12, by + 5 + i * (GB.GLINE + 1), "ink");
    }
    if (scroll + rows < scene.dLines.length && Math.floor(t * 3) % 2 === 0) GB.triDown(GB.W - 14, by + bh - 8, "red");
    if (scene.toast > 0) { scene.toast -= 1 / 60; GB.text("NOW YOUR ACTIVE BATTLER!", 8, GB.H - 9, "red"); }
    else GB.text(isActive ? "A: EH  B: BACK  ^v: MORE" : "A: EH   B: BACK   START: USE IN BATTLE", 8, GB.H - 9, "dim");
  }

  window.EH_AUTH = {
    renderButton: renderButton, signOut: signOut, onChange: function (fn) { onAuthChange = fn; },
    isSignedIn: function () { return EH_STATE.signedIn; }
  };
  // re-apply the local save once the contract data has loaded (data.js is async,
  // so the save read at boot couldn't resolve addresses → collection/party yet).
  window.EH_SAVE = { save: save, addCatch: addCatch, serialize: serialize, rehydrate: loadLocal, setActive: setActive, persistLead: persistLead };
  window.EH_COLLECTION = { open: function () { GB.push(dexScene); }, scene: function () { return dexScene; } };
})();
