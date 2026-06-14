/* main.js - boots the Game Boy, waits for the EH contract data to load, runs the
 * title screen, and hands off to the overworld. Loaded last.
 *
 * New game → start in PROF. NAKAMOTO'S LAB; the professor explains the quest and
 * hands you a starter. Returning game → resume at the saved overworld position.
 */
(function () {
  "use strict";
  var GB = window.GB;

  // The three Frontier legends the professor offers as a starter.
  function starterChoices() {
    var want = ["mistcoin", "etheria", "greeter"], picks = [];
    want.forEach(function (k) {
      var c = window.EH_DATA.contracts.find(function (x) { return new RegExp(k, "i").test(x.name); });
      if (c && picks.indexOf(c) < 0) picks.push(c);
    });
    window.EH_DATA.byZone("frontier").forEach(function (c) {     // fill any gaps
      if (picks.length < 3 && picks.indexOf(c) < 0) picks.push(c);
    });
    return picks.slice(0, 3);
  }
  // returning-player / safety fallback: a level-5 lead if somehow none
  function ensureStarter() {
    if (window.EH_STATE.party && window.EH_STATE.party.length) return;
    var picks = starterChoices();
    if (picks[0]) { window.EH_SAVE.setStarter(picks[0].addr); }
  }

  function labIntro() {
    window.EH_UI.dialog([
      "PROF. NAKAMOTO|Ah, you made it! Welcome to my lab. First - what should I call you, historian?"
    ], function () { nameEntry(function () { afterName(); }); });
  }
  function afterName() {
    window.EH_UI.dialog([
      "PROF. NAKAMOTO|{NAME}! A fine name. I study the smart contracts deployed across all of Ethereum's history.",
      "PROF. NAKAMOTO|Your quest: walk the seven eras, find these contracts in the wild, and record them in your Historian's Dex.",
      "PROF. NAKAMOTO|Three Frontier legends rest on my table - all level 5. Choose the one that calls to you, {NAME}.",
      "PROF. NAKAMOTO|In tall grass you'll meet wild contracts. ANALYZE to weaken, STUDY to learn their story, then throw an ARCHIVE BALL."
    ], chooseStarter);
  }

  // ---- name-entry scene (GBA on-screen keyboard) -----------------------
  function nameEntry(onDone) {
    var rows = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ.", "0123456789"], name = "", cr = 0, cc = 0, MAX = 9, t = 0;
    GB.push({
      onPress: function (b) {
        if (b === GB.BTN.up) cr = (cr + rows.length - 1) % rows.length;
        else if (b === GB.BTN.down) cr = (cr + 1) % rows.length;
        else if (b === GB.BTN.left) cc = (cc + rows[cr].length - 1) % rows[cr].length;
        else if (b === GB.BTN.right) cc = (cc + 1) % rows[cr].length;
        else if (b === GB.BTN.a) { if (name.length < MAX) name += rows[cr][Math.min(cc, rows[cr].length - 1)]; }
        else if (b === GB.BTN.b) { name = name.slice(0, -1); }
        else if (b === GB.BTN.start) { window.EH_STATE.name = (name.trim() || "HISTORIAN").toUpperCase(); window.EH_SAVE.save(); GB.pop(); if (onDone) onDone(); }
        if (cc >= rows[cr].length) cc = rows[cr].length - 1;
      },
      update: function (dt) { t += dt; },
      render: function () {
        GB.clear("box");
        GB.rect(0, 0, GB.W, 16, "blue"); GB.rect(0, 16, GB.W, 1, "navy");
        GB.text("NAME YOUR HISTORIAN", 8, 5, "white");
        GB.boxR(40, 24, 160, 16);
        GB.text(name.toUpperCase() + (Math.floor(t * 2) % 2 ? "_" : ""), 48, 28, "ink");
        for (var ri = 0; ri < rows.length; ri++) for (var ci = 0; ci < rows[ri].length; ci++) {
          var gx = 28 + ci * 21, gy = 52 + ri * 16;
          if (ri === cr && ci === cc) GB.cursor(gx - 8, gy, "red");
          GB.text(rows[ri][ci], gx, gy, "ink");
        }
        GB.text("A: type   B: delete   START: OK", 14, GB.H - 10, "dim");
      }
    });
  }

  // ---- starter selection scene -----------------------------------------
  function chooseStarter() {
    var picks = starterChoices();
    if (!picks.length) { ensureStarter(); return; }
    var sel = 0, t = 0;
    GB.push({
      onPress: function (b) {
        if (b === GB.BTN.left) sel = (sel + picks.length - 1) % picks.length;
        else if (b === GB.BTN.right) sel = (sel + 1) % picks.length;
        else if (b === GB.BTN.a) {
          var c = picks[sel];
          window.EH_SAVE.setStarter(c.addr);
          GB.pop();
          window.EH_UI.dialog([
            "PROF. NAKAMOTO|" + window.EH_CREATURES.nameFor(c) + ", level 5 - an excellent choice!",
            "PROF. NAKAMOTO|The door to the south opens onto the FRONTIER. Go document some history!"
          ]);
        }
      },
      update: function (dt) { t += dt; },
      render: function () {
        var W = GB.W;
        GB.clear("sky");
        GB.rect(0, 116, W, W, "grass"); GB.rect(0, 116, W, 2, "grassD");
        GB.boxR(W / 2 - 96, 4, 192, 14);
        GB.textCenter("CHOOSE YOUR FIRST CONTRACT", W / 2, 8, "ink");
        for (var i = 0; i < picks.length; i++) {
          var c = picks[i], cx = W / 2 + (i - 1) * 74, on = i === sel;
          var bob = on ? Math.round(Math.sin(t * 3) * 2) : 0;
          GB.rect(cx - 26, 92, 52, 4, "arenaD"); GB.rect(cx - 20, 96, 40, 3, "arena");
          if (on) GB.boxR(cx - 30, 26, 60, 64, "box", "red");
          GB.spriteO(window.EH_CREATURES.spriteFor(c), cx - 24, 40 + bob, 3, window.EH_CREATURES.rampFor(c));
          GB.textCenter(window.EH_CREATURES.nameFor(c).slice(0, 10), cx, 100, on ? "ink" : "dim");
        }
        var cur = picks[sel];
        GB.boxR(4, 118, W - 8, 38);
        GB.text(window.EH_CREATURES.nameFor(cur).slice(0, 16), 10, 122, "ink");
        var typ = (window.EH_CREATURES.TYPES[cur.cat] || { label: cur.cat }).label;
        GB.text(typ + " - " + cur.rarity, 10, 132, "blue");
        var bl = GB.wrap(cur.blurb || "", W - 20);
        GB.text(bl[0] || "", 10, 143, "ink");
        GB.text("< >: PICK   A: CHOOSE", W - 4 - GB.textWidth("< >: PICK   A: CHOOSE"), 122, "dim");
      }
    });
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
    onPress: function (b) { if (b === GB.BTN.start || b === GB.BTN.a) openSlots(); },
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

  // ---- save-slot select (CONTINUE / NEW GAME) --------------------------
  function openSlots() {
    var sel = 0, t = 0;
    GB.push({
      onPress: function (b) {
        if (b === GB.BTN.up) sel = (sel + 2) % 3;
        else if (b === GB.BTN.down) sel = (sel + 1) % 3;
        else if (b === GB.BTN.b) GB.pop();
        else if (b === GB.BTN.select) { if (window.EH_SAVE.hasSlot(sel + 1)) window.EH_SAVE.newGame(sel + 1); }  // erase
        else if (b === GB.BTN.a) {
          var n = sel + 1;
          if (window.EH_SAVE.hasSlot(n)) { window.EH_SAVE.setSlot(n); GB.pop(); startContinue(); }
          else { window.EH_SAVE.newGame(n); GB.pop(); startNew(); }
        }
      },
      update: function (dt) { t += dt; },
      render: function () {
        GB.clear("sky");
        GB.rect(0, 116, GB.W, GB.H - 116, "grass"); GB.rect(0, 116, GB.W, 2, "grassD");
        GB.boxR(GB.W / 2 - 72, 6, 144, 14); GB.textCenter("CHOOSE A SAVE SLOT", GB.W / 2, 10, "ink");
        for (var i = 0; i < 3; i++) {
          var n = i + 1, y = 30, sum = window.EH_SAVE.slotSummary(n);
          y = 30 + i * 26;
          GB.boxR(18, y, GB.W - 36, 22, i === sel ? "gray1" : "box", i === sel ? "red" : "boxBorder");
          GB.text("SLOT " + n, 26, y + 4, "ink");
          if (sum) { GB.text(sum.name.slice(0, 10) + "  " + sum.docs + " DOCS", 26, y + 13, "blue"); GB.text(sum.zone.toUpperCase().slice(0, 8), GB.W - 90, y + 13, "dim"); }
          else GB.text("- NEW GAME -", 26, y + 13, "dim");
          if (i === sel) GB.triDown(GB.W - 28, y + 8, "red");
        }
        GB.text("A: play   SELECT: erase   B: back", 18, GB.H - 9, "dim");
      }
    });
  }
  function startContinue() { ensureStarter(); GB.replace(window.EH_WORLD.scene()); }
  function startNew() { window.EH_WORLD.loadZone("lab"); GB.replace(window.EH_WORLD.scene()); labIntro(); }
  // return to the title (the EXIT menu option) — saves first
  window.EH_GAME = { toTitle: function () { if (window.EH_SAVE) window.EH_SAVE.persistLead(); GB.replace(title); } };

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
