/* main.js - boots the Game Boy, waits for the EH contract data to load, runs the
 * title screen, and hands off to the overworld. Loaded last.
 *
 * New game → start in PROF. NAKAMOTO'S LAB; the professor explains the quest and
 * hands you a starter. Returning game → resume at the saved overworld position.
 */
(function () {
  "use strict";
  var GB = window.GB;
  var INTRO_KEY = "eh_seen_intro_v2";
  function sawIntro() { try { return !!localStorage.getItem(INTRO_KEY); } catch (e) { return false; } }
  function setIntro() { try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) {} }

  // Pick a sensible starter from the live data: the Greeter if present, else a
  // modest Frontier-era contract - fitting for a brand-new historian.
  function pickStarter() {
    var all = window.EH_DATA.contracts;
    var greeter = all.find(function (c) { return /greeter/i.test(c.name); });
    if (greeter) return greeter;
    var soft = all.filter(function (c) { return c.zone === "frontier" && (c.rarity === "COMMON" || c.rarity === "UNCOMMON"); });
    return soft[0] || all[0];
  }
  function ensureStarter() {
    if (window.EH_STATE.party && window.EH_STATE.party.length) return;
    var c = pickStarter();
    if (c) window.EH_STATE.party = [window.EH_CREATURES.make(c)];
  }

  function labIntro() {
    setIntro();
    var starter = pickStarter();
    var sname = starter ? window.EH_CREATURES.nameFor(starter) : "GREETER";
    window.EH_UI.dialog([
      "PROF. NAKAMOTO|Ah, you made it! Welcome to my lab.",
      "PROF. NAKAMOTO|I study the smart contracts deployed across all of Ethereum's history - fossils of every idea anyone ever shipped on-chain.",
      "PROF. NAKAMOTO|Over 800 are documented so far, and counting. Your quest: walk the seven eras, find them in the wild, and record them in the Historian's Dex.",
      "PROF. NAKAMOTO|Here, take this one to start - " + sname + ", a relic of 2015. A fitting first companion.",
      "PROF. NAKAMOTO|In tall grass you'll meet wild contracts. ANALYZE to weaken, STUDY to learn their real story, then throw an ARCHIVE BALL.",
      "PROF. NAKAMOTO|The door to the south opens onto the FRONTIER. Go write some history!"
    ], function () { ensureStarter(); });
  }

  // ---- featured legendaries (dynamic, from the data) -------------------
  function featList() {
    var f = window.EH_DATA.featured();
    return f.length ? f : window.EH_DATA.contracts.slice(0, 6);
  }

  // ---- title scene -----------------------------------------------------
  var signinEl = null;
  var title = {
    t: 0,
    enter: function () { if (signinEl) { signinEl.style.display = "flex"; if (window.EH_AUTH) window.EH_AUTH.renderButton(signinEl.querySelector(".gbtn")); } },
    exit: function () { if (signinEl) signinEl.style.display = "none"; },
    onPress: function (b) { if (b === GB.BTN.start || b === GB.BTN.a) startGame(); },
    update: function (dt) { this.t += dt; },
    render: function () {
      var t = this.t, W = GB.W, feats = featList();
      GB.clear("sky");
      GB.rect(0, 112, W, GB.H - 112, "grass"); GB.rect(0, 112, W, 2, "grassD");
      GB.rect(((t * 8) % (W + 40)) - 40, 20, 22, 5, "white"); GB.rect(((t * 8) % (W + 40)) - 34, 16, 12, 5, "white");
      GB.rect(((t * 5 + 120) % (W + 40)) - 40, 36, 18, 4, "white");
      // a creature drifts across the top
      var fly = feats[Math.floor(t / 5) % feats.length];
      if (fly) GB.spriteO(window.EH_CREATURES.spriteFor(fly), ((t * 22) % (W + 48)) - 48, 2, 2, window.EH_CREATURES.rampFor(fly));

      GB.boxR(W / 2 - 78, 12, 156, 40);
      GB.textCenter("ETHEREUM HISTORY", W / 2, 20, "blue");
      GB.rect(W / 2 - 60, 31, 120, 1, "boxBorder");
      GB.textCenter("- E X P L O R E R -", W / 2, 38, "red");

      var c = feats[Math.floor(t / 3) % feats.length];
      if (c) {
        var bob = Math.round(Math.sin(t * 2.2) * 2);
        GB.rect(W / 2 - 34, 114, 68, 4, "arenaD"); GB.rect(W / 2 - 26, 118, 52, 3, "arena");
        GB.spriteO(window.EH_CREATURES.spriteFor(c), W / 2 - 32, 50 + bob, 4, window.EH_CREATURES.rampFor(c));
        GB.textCenter(window.EH_CREATURES.nameFor(c), W / 2, 122, "ink");
      }
      if (Math.floor(t * 1.6) % 2 === 0) GB.textCenter("PRESS  START", W / 2, 134, "ink");
      GB.textCenter(window.EH_STATE.signedIn ? "HELLO, " + window.EH_STATE.name : window.EH_DATA.contracts.length + " CONTRACTS - CARTOONITUNES", W / 2, 150, "dim");
    }
  };

  function startGame() {
    if (!sawIntro()) {
      window.EH_WORLD.loadZone("lab");
      GB.replace(window.EH_WORLD.scene());
      labIntro();
    } else {
      ensureStarter();
      GB.replace(window.EH_WORLD.scene());
    }
  }

  // ---- loading / error scenes (wait for the archive to load) -----------
  var loading = {
    t: 0, failed: false,
    update: function (dt) { this.t += dt; },
    render: function () {
      GB.clear("sky");
      GB.rect(0, 112, GB.W, GB.H - 112, "grass"); GB.rect(0, 112, GB.W, 2, "grassD");
      GB.boxR(GB.W / 2 - 78, 40, 156, 32);
      GB.textCenter("ETHEREUM HISTORY", GB.W / 2, 48, "blue");
      GB.textCenter("- E X P L O R E R -", GB.W / 2, 60, "red");
      if (this.failed) {
        GB.textCenter("COULD NOT LOAD THE ARCHIVE.", GB.W / 2, 92, "ink");
        GB.textCenter("CHECK CONNECTION & RELOAD.", GB.W / 2, 104, "dim");
      } else {
        var n = Math.floor(this.t * 2) % 4;
        GB.textCenter("LOADING THE ARCHIVE" + "....".slice(0, n), GB.W / 2, 96, "ink");
      }
    }
  };

  // ---- boot ------------------------------------------------------------
  function boot() {
    var canvas = document.getElementById("screen");
    signinEl = document.getElementById("signin");
    GB.init(canvas);
    if (window.EH_AUTH) window.EH_AUTH.onChange(function () {
      if (signinEl && window.EH_STATE.signedIn) {
        var b = signinEl.querySelector(".gbtn"); if (b) b.style.display = "none";
        var s = signinEl.querySelector(".signed"); if (s) s.style.display = "block";
      }
    });
    GB.push(loading);
    setupTouch();
    // wait for the EH contract data, then show the title
    (window.EH_DATA_READY || Promise.resolve(null)).then(function () {
      if (window.EH_DATA.loaded) {
        // a save may have been loaded before data; re-resolve party/collection now
        if (window.EH_SAVE && window.EH_SAVE.rehydrate) window.EH_SAVE.rehydrate();
        GB.replace(title);
      } else {
        loading.failed = true;
      }
    });
  }

  function setupTouch() {
    var map = { "btn-up": GB.BTN.up, "btn-down": GB.BTN.down, "btn-left": GB.BTN.left, "btn-right": GB.BTN.right,
      "btn-a": GB.BTN.a, "btn-b": GB.BTN.b, "btn-start": GB.BTN.start };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var btn = map[id];
      var press = function (e) { e.preventDefault(); el.classList.add("on"); GB.pressBtn(btn); };
      var release = function (e) { e.preventDefault(); el.classList.remove("on"); GB.releaseBtn(btn); };
      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("touchend", release, { passive: false });
      el.addEventListener("touchcancel", release, { passive: false });
      el.addEventListener("mousedown", press);
      window.addEventListener("mouseup", release);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
