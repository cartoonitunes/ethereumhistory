/* battle.js - a faithful Pokémon Red / Blue battle screen.
 *
 * Layout (the Gen-1 arrangement, exactly):
 *   - enemy HP/name box  : top-LEFT       (name + level + HP bar, no numbers)
 *   - enemy sprite        : top-RIGHT      on a curved platform
 *   - player sprite (back): bottom-LEFT    on a curved platform
 *   - player HP/name box  : bottom-RIGHT   (name + level + HP bar + HP numbers)
 *   - message / menu box  : full-width bottom window
 *   - action menu         : FIGHT / ITEM / CATCH / RUN, 2x2, bottom-right
 *
 * Entry animation: the enemy slides in from the right and your creature slides
 * in from the left, then the "Wild X appeared!" text types out. Messages use
 * the typewriter reveal with the blinking ▼ continue arrow.
 *
 * The four actions keep the original mechanics under Pokémon-flavoured labels:
 *   FIGHT → ANALYZE attack   ITEM → STUDY the contract (Pokédex-style)
 *   CATCH → throw an ARCHIVE BALL   RUN → flee
 */
(function () {
  "use strict";
  var GB = window.GB;
  var MSG_SPEED = 34; // chars/sec for the typewriter

  var B = null;

  function shortName(cr) { return cr.name.replace(/\s*\(.*$/, ""); }

  // The player's lead creature IS the battler - its level/XP persist across
  // fights (it's the same object as EH_STATE.party[0]). It enters every battle
  // at full health.
  function getActive() {
    var st = window.EH_STATE;
    var lead = st.party && st.party[0];
    if (!lead) {
      lead = window.EH_CREATURES.make(window.EH_DATA.contracts[0], 5, 0);
      st.party = [lead];
    }
    lead.stats.hp = lead.stats.maxhp;
    st.active = lead;
    return lead;
  }

  function start(wild, opts) {
    opts = opts || {};
    var mine = getActive();
    mine.stats.hp = mine.stats.maxhp;
    B = {
      wild: wild, mine: mine,
      sel: 0, msel: 0, studied: 0,
      phase: "enter", enterT: 0,
      queue: [], after: null,
      msgText: "", msgRev: 0, msgDone: false,
      t: 0, shakeWild: 0, flashMine: 0, ballT: 0, caught: false,
      trainer: !!opts.trainer, trainerWin: opts.trainerWin || null,
      onEnd: opts.onEnd || null, didWin: false,
      hpAnimW: 1, hpAnimM: 1 // displayed HP fractions (animate toward real)
    };
    if (GB.current() !== scene) GB.push(scene);
  }

  // ---- message queue + typewriter -------------------------------------
  function say(msgs, after) {
    B.queue = (typeof msgs === "string") ? [msgs] : msgs.slice();
    B.after = after || null;
    B.phase = "msg";
    loadMsg(B.queue[0] || "");
  }
  function loadMsg(str) {
    var lines = GB.wrap(str, GB.W - 18).slice(0, 2);
    B.msgText = lines.join("\n");
    B.msgRev = 0; B.msgDone = false;
  }
  function advanceMsg() {
    if (!B.msgDone) { B.msgRev = GB.glyphCount(B.msgText); B.msgDone = true; return; }
    B.queue.shift();
    if (B.queue.length) { loadMsg(B.queue[0]); }
    else { var fn = B.after; B.after = null; if (fn) fn(); else toMenu(); }
  }

  // ---- combat maths ----------------------------------------------------
  // Punchy: a hit lands ~30-50% of a foe's HP, so fights resolve in 2-4 turns
  // (with creatures.js's lower HP). Encounters are quick learning beats.
  function damage(att, def) {
    var base = att.stats.atk * (0.72 + att.stats.lvl / 110);
    var d = base * (0.85 + 0.30 * Math.random()) - def.stats.def * 0.35;
    return Math.max(2, Math.round(d));
  }
  function catchChance() {
    var w = B.wild, base = w.rarityInfo.catch;
    var hpFrac = w.stats.hp / w.stats.maxhp;
    var hpBoost = 1 + (1 - hpFrac) * 1.4;
    var studyBoost = B.studied * 0.07;
    return Math.max(0.04, Math.min(0.96, base * hpBoost + studyBoost));
  }

  // ---- actions ---------------------------------------------------------
  // Use a learned move. If it drains the foe to 0 HP the foe FAINTS (battle ends,
  // you earn XP but DON'T document it) — so to catch one you must leave it some
  // HP. ACQUIRE also softens it for capture.
  function applyMove(m) {
    var dmg = Math.round(damage(B.mine, B.wild) * (m.pow || 1));
    B.wild.stats.hp = Math.max(0, B.wild.stats.hp - dmg);
    B.shakeWild = 0.45;
    if (m.catchBoost) B.studied++;
    var msgs = [shortName(B.mine) + " " + (m.verb || "hit") + " " + shortName(B.wild) + "!"];
    if (B.wild.stats.hp <= 0) {
      var lv = awardWin(1.0);
      msgs.push((B.trainer ? shortName(B.wild) + " was defeated!" : "Wild " + shortName(B.wild) + " fainted!"));
      if (lv > 0) msgs.push(shortName(B.mine) + " grew to LV " + B.mine.level + "!");
      if (B.trainer && B.trainerWin) msgs.push(B.trainerWin);
      B.didWin = true;
      say(msgs, end);
    } else {
      say(msgs, function () { enemyTurn(toMenu); });
    }
  }
  // STUDY: a safe observation — teaches the contract's real history and raises
  // catch odds, no counterattack.
  function doStudy() {
    B.studied++;
    var w = B.wild, c = w.contract;
    var pages = [shortName(w) + " - a " + w.type + " from " + c.year + ". " + (c.rarity || "") + "."];
    if (c.blurb) pages.push(c.blurb);
    if (c.sig && c.sig !== c.blurb) pages.push(c.sig);
    pages.push("You studied it closely. Its catch odds went up!");
    say(pages, toMenu);
  }
  function awardWin(mult) { return window.EH_CREATURES.gainXp(B.mine, B.wild.stats.lvl * 3.5 * (mult || 1)); }
  function doCatch() {
    if (B.trainer) { say(["You can't document another HISTORIAN's contract!"], toMenu); return; }
    var p = catchChance();
    B.ballT = 1.1;
    if (Math.random() < p) {
      B.caught = true;
      var lv = awardWin(1.2);
      window.EH_SAVE.addCatch(B.wild);     // persists collection + lead level/XP
      var msgs = ["You threw an ARCHIVE BALL!", "Gotcha! " + shortName(B.wild) + " was documented!"];
      if (lv > 0) msgs.push(shortName(B.mine) + " grew to LV " + B.mine.level + "!");
      msgs.push("Added to your HISTORIAN'S DEX.");
      B.didWin = true;
      say(msgs, end);
    } else {
      say(["You threw an ARCHIVE BALL!", "Argh! " + shortName(B.wild) + " broke free!"],
          function () { enemyTurn(toMenu); });
    }
  }
  function doRun() {
    if (B.trainer) { say(["There's no running from a HISTORIAN's challenge!"], toMenu); return; }
    say(["Got away safely!"], end);
  }

  function enemyTurn(after) {
    var moves = window.EH_CREATURES.movesFor(B.wild);
    var m = moves[moves.length - 1] || { pow: 1, verb: "struck" };
    var dmg = Math.round(damage(B.wild, B.mine) * (m.pow || 1));
    B.mine.stats.hp = Math.max(0, B.mine.stats.hp - dmg);
    B.flashMine = 0.45;
    var msgs = [(B.trainer ? "" : "Wild ") + shortName(B.wild) + " " + (m.verb || "struck") + " back!"];
    if (B.mine.stats.hp <= 0) {
      msgs.push(shortName(B.mine) + " is overwhelmed!", "You retreat to study another day.");
      say(msgs, end);
    } else { say(msgs, after); }
  }

  function toMenu() { B.phase = "menu"; }
  function end() { B.mine.stats.hp = B.mine.stats.maxhp; var cb = B.onEnd, win = B.didWin; GB.pop(); if (cb) cb(win); }

  // ---- input -----------------------------------------------------------
  // Labels say what they do: ANALYZE weakens, STUDY teaches (and raises catch
  // odds), CATCH throws an Archive Ball, RUN flees.
  var TOP = ["FIGHT", "STUDY", "CATCH", "RUN"];   // FIGHT opens the move list
  var scene = {
    onPress: function (b) {
      if (!B) return;
      if (B.phase === "msg") {
        if (b === GB.BTN.a || b === GB.BTN.b) advanceMsg();
        return;
      }
      if (B.phase === "menu") {
        if (b === GB.BTN.up) B.sel = (B.sel + TOP.length - 1) % TOP.length;
        else if (b === GB.BTN.down) B.sel = (B.sel + 1) % TOP.length;
        else if (b === GB.BTN.a) {
          var m = TOP[B.sel];
          if (m === "FIGHT") { B.phase = "moves"; B.msel = 0; }
          else if (m === "STUDY") doStudy();
          else if (m === "CATCH") doCatch();
          else if (m === "RUN") doRun();
        }
      } else if (B.phase === "moves") {
        var mv = window.EH_CREATURES.movesFor(B.mine);
        if (b === GB.BTN.up) B.msel = (B.msel + mv.length - 1) % mv.length;
        else if (b === GB.BTN.down) B.msel = (B.msel + 1) % mv.length;
        else if (b === GB.BTN.b) B.phase = "menu";
        else if (b === GB.BTN.a) applyMove(mv[B.msel]);
      }
    },
    update: function (dt) {
      if (!B) return;
      B.t += dt;
      if (B.phase === "enter") {
        B.enterT += dt / 0.55;
        if (B.enterT >= 1) { B.enterT = 1; say([B.trainer ? (shortName(B.wild) + " steps up to battle!") : ("Wild " + shortName(B.wild) + " appeared!")], toMenu); }
      }
      if (B.phase === "msg" && !B.msgDone) {
        B.msgRev += dt * MSG_SPEED;
        if (B.msgRev >= GB.glyphCount(B.msgText)) { B.msgRev = GB.glyphCount(B.msgText); B.msgDone = true; }
      }
      if (B.shakeWild > 0) B.shakeWild -= dt;
      if (B.flashMine > 0) B.flashMine -= dt;
      if (B.ballT > 0) B.ballT -= dt;
      // ease the displayed HP bars toward the true values
      var tw = B.wild.stats.hp / B.wild.stats.maxhp;
      var tm = B.mine.stats.hp / B.mine.stats.maxhp;
      B.hpAnimW += (tw - B.hpAnimW) * Math.min(1, dt * 6);
      B.hpAnimM += (tm - B.hpAnimM) * Math.min(1, dt * 6);
    },
    render: function () { render(); }
  };

  // ---- rendering -------------------------------------------------------
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function hpBar(x, y, w, frac) {
    GB.rect(x - 1, y - 1, w + 2, 7, "ink");        // dark frame
    GB.rect(x, y, w, 5, "navy");
    GB.rect(x, y, w, 1, "white"); GB.rect(x, y + 1, w, 3, "white"); // white track
    var fw = Math.max(0, Math.round(w * frac));
    var fill = frac > 0.5 ? "hpGreen" : frac > 0.2 ? "hpYellow" : "hpRed";
    GB.rect(x, y + 1, fw, 3, fill); GB.rect(x, y + 1, fw, 1, "white");
  }
  // a green battle-field platform under a creature (FireRed oval-ish pad)
  function platform(cx, y, w) {
    GB.rect(cx - w / 2 + 6, y, w - 12, 3, "arenaD");
    GB.rect(cx - w / 2, y + 3, w, 4, "arena");
    GB.rect(cx - w / 2, y + 3, w, 1, "arenaD");
    GB.rect(cx - w / 2 + 8, y + 7, w - 16, 2, "grassD");
  }

  // the HP/name plate (Gen-3 rounded box). `numbers` adds the HP readout + XP bar.
  function plate(x, y, cr, frac, numbers) {
    var w = 108, h = numbers ? 40 : 32;
    GB.boxR(x, y, w, h);
    var nm = shortName(cr), lvl = "=L" + cr.stats.lvl, lw = GB.textWidth(lvl);
    var maxc = Math.floor((w - 16 - lw) / GB.GADV);
    GB.text(nm.slice(0, maxc), x + 7, y + 5, "ink");
    GB.text(lvl, x + w - 7 - lw, y + 5, "ink");
    GB.text("HP", x + 7, y + 16, "hpGreen");
    hpBar(x + 24, y + 17, w - 33, frac);
    if (numbers) {
      var hpStr = Math.ceil(cr.stats.hp) + "/" + cr.stats.maxhp;
      GB.text(hpStr, x + w - 7 - GB.textWidth(hpStr), y + 24, "ink");   // HP numbers, own line
      var need = window.EH_CREATURES.xpToNext(cr.level || cr.stats.lvl);
      var xf = need ? Math.min(1, (cr.xp || 0) / need) : 0;
      GB.text("XP", x + 7, y + 32, "blue");                              // XP bar, own line below
      GB.rect(x + 22, y + 33, w - 30, 3, "navy");
      GB.rect(x + 22, y + 33, Math.round((w - 30) * xf), 3, "waterL");
    } else {
      GB.text(cr.type, x + 7, y + 24, "blue");                          // type fits inside h=32
      for (var i = 0; i < cr.rarityInfo.stars; i++) GB.rect(x + w - 9 - i * 5, y + 25, 3, 3, "gold");
    }
  }

  function render() {
    if (!B) return;
    // FireRed-style field: pale sky top, green grass field on a soft horizon
    GB.clear("sky");
    GB.rect(0, 44, GB.W, 4, "skyD");
    GB.rect(0, 48, GB.W, GB.H - 48, "arena");
    GB.rect(0, 48, GB.W, 2, "arenaD");
    GB.rect(0, 70, GB.W, 1, "grassD"); GB.rect(0, 92, GB.W, 1, "grassD");

    var ep = B.phase === "enter" ? easeOut(B.enterT) : 1;
    var enemyOff = (1 - ep) * 150;   // slides in from the right
    var mineOff = (1 - ep) * 150;    // slides in from the left

    // enemy sprite + platform (top-right)
    var ecx = 178, ey = 12;
    platform(ecx + enemyOff, 62, 76);
    var ejit = B.shakeWild > 0 ? (Math.floor(B.t * 40) % 2 ? 2 : -2) : 0;
    var ballHide = B.ballT > 0 && B.caught && B.ballT < 0.7;
    if (!ballHide) GB.spriteO(B.wild.sprite, ecx - 32 + enemyOff + ejit, ey, 4, B.wild.ramp);

    // player back sprite + platform (bottom-left)
    var mcx = 58, my = 70;
    platform(mcx - mineOff, 118, 76);
    if (!(B.flashMine > 0 && Math.floor(B.t * 40) % 2)) GB.spriteO(B.mine.back, mcx - 32 - mineOff, my, 4, B.mine.ramp);

    // archive-ball toss (arc from player toward the enemy) when catching
    if (B.ballT > 0) {
      var bp = 1 - (B.ballT / 1.1);
      var bx = 56 + bp * 110, by = 96 - Math.sin(bp * Math.PI) * 64;
      GB.rect(bx, by, 8, 8, "red"); GB.rect(bx + 1, by + 1, 6, 3, "redD");
      GB.rect(bx + 1, by + 4, 6, 3, "white"); GB.rect(bx, by + 3, 8, 2, "ink");
      GB.rect(bx + 3, by + 3, 2, 2, "gray1");
    }

    // HP plates slide in from the screen edges, settle once the entry is done
    if (ep > 0.45) {
      plate(10 - (1 - ep) * 120, 12, B.wild, B.hpAnimW, false);
      plate(GB.W - 118 + (1 - ep) * 120, 80, B.mine, B.hpAnimM, true);
    }
    renderBottom();
  }

  function renderBottom() {
    var by = 122, bh = GB.H - by - 2;
    function cmdList(items, sel) {
      GB.boxR(150, by, GB.W - 150, bh, "panel", "navy");
      var mx = 164, my0 = by + 5;
      for (var i = 0; i < items.length; i++) {
        var ty = my0 + i * 8;
        if (i === sel) GB.cursor(mx - 9, ty, "white");
        GB.text(items[i], mx, ty, "white");
      }
    }
    if (B.phase === "menu") {
      GB.boxR(0, by, 150, bh);                       // prompt window
      GB.text("WHAT WILL", 9, by + 9, "ink");
      GB.text(shortName(B.mine).slice(0, 11), 9, by + 21, "blue");
      GB.text("DO?", 9 + GB.textWidth(shortName(B.mine).slice(0, 11)) + 6, by + 21, "ink");
      cmdList(TOP, B.sel);
    } else if (B.phase === "moves") {
      var mv = window.EH_CREATURES.movesFor(B.mine);
      GB.boxR(0, by, 150, bh);
      GB.text("CHOOSE A MOVE", 9, by + 9, "ink");
      GB.text("B: BACK", 9, by + 21, "dim");
      cmdList(mv.map(function (m) { return m.name; }), B.msel);
    } else {
      GB.boxR(0, by, GB.W, bh);
      var lines = B.msgText.split("\n");
      var shown = Math.floor(B.msgRev), used = 0;
      for (var L = 0; L < lines.length; L++) {
        var room = Math.max(0, shown - used);
        GB.text(lines[L], 10, by + 10 + L * (GB.GLINE + 2), "ink", room);
        used += lines[L].length;
      }
      if (B.msgDone && B.queue.length && Math.floor(B.t * 3) % 2 === 0) GB.triDown(GB.W - 14, by + bh - 9, "red");
    }
  }

  window.EH_BATTLE = {
    start: start,
    startTrainer: function (creature, opts) {
      opts = opts || {};
      start(creature, { trainer: true, trainerWin: opts.win || null, onEnd: opts.onEnd || null });
    },
    scene: function () { return scene; }
  };
})();
