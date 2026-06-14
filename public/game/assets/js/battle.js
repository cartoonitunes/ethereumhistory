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
  function sfx(k) { if (window.EH_AUDIO) window.EH_AUDIO.sfx(k); }

  function shortName(cr) { return cr.name.replace(/\s*\(.*$/, ""); }
  // fit a name into `maxc` glyphs without an ugly mid-word cut (Pokémon never
  // chops a name in half). Prefers a word boundary; only adds "." if truncated.
  function fitName(name, maxc) {
    if (name.length <= maxc) return name;
    var cut = name.slice(0, maxc - 1);
    var sp = cut.lastIndexOf(" ");
    if (sp >= maxc - 7 && sp > 2) cut = cut.slice(0, sp);
    return cut + ".";
  }

  // The player's lead creature IS the battler - its level/XP persist across
  // fights (it's the same object as EH_STATE.party[0]). It enters every battle
  // at full health.
  function getActive() {
    var st = window.EH_STATE;
    if (!st.party || !st.party.length) {           // emergency fallback
      st.team = [window.EH_DATA.contracts[0].addr]; st.active = 0;
      st.roster = st.roster || {}; st.roster[st.team[0]] = { level: 5, xp: 0 };
      st.party = [window.EH_CREATURES.make(window.EH_DATA.byAddr(st.team[0]), 5, 0)];
    }
    if (st.active == null || st.active >= st.party.length) st.active = 0;
    return st.party[st.active];   // HP is NOT reset — it persists between battles
  }

  function start(wild, opts) {
    opts = opts || {};
    var mine = getActive();
    B = {
      wild: wild, mine: mine,
      sel: 0, msel: 0, sw: 0, studied: 0,
      participants: {}, mineStage: { atk: 0, spd: 0, crit: 0 }, wildStage: { atk: 0, spd: 0, crit: 0 },
      phase: "enter", enterT: 0,
      queue: [], after: null,
      msgText: "", msgRev: 0, msgDone: false,
      t: 0, shakeWild: 0, flashMine: 0, ballT: 0, caught: false,
      trainer: !!opts.trainer, trainerWin: opts.trainerWin || null,
      onEnd: opts.onEnd || null, didWin: false,
      hpAnimW: 1, hpAnimM: 1 // displayed HP fractions (animate toward real)
    };
    B.participants[window.EH_STATE.active] = true;
    if (window.EH_AUDIO) window.EH_AUDIO.setTrack("battle");
    if (GB.current() !== scene) GB.push(scene);
  }
  // switch the active battler to party index j (B.mine follows). Costs a turn
  // unless `free` (a forced switch after a faint).
  function switchTo(j, free) {
    var st = window.EH_STATE;
    st.active = j; B.mine = st.party[j]; B.participants[j] = true;
    B.mineStage = { atk: 0, spd: 0, crit: 0 };
    var msg = ["Go, " + shortName(B.mine) + "!"];
    if (free) { say(msg, toMenu); } else { say(msg, function () { enemyTurn(toMenu); }); }
  }
  function aliveOthers() {
    var st = window.EH_STATE, out = [];
    for (var i = 0; i < st.party.length; i++) if (i !== st.active && st.party[i].stats.hp > 0) out.push(i);
    return out;
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
  // Punchy: a hit lands ~30-50% of a foe's HP (× type effectiveness), so fights
  // resolve in 2-4 turns.
  function clampStage(s) { return Math.max(-3, Math.min(3, s || 0)); }
  function atkMult(stage) { return 1 + clampStage(stage) * 0.25; }
  function critChance(stage) { return 0.06 + Math.max(0, clampStage(stage)) * 0.15; }
  function effSpd(cr, stage) { return cr.stats.spd * (1 + clampStage(stage) * 0.2); }
  function damage(att, def, mult, crit, atkStage) {
    var base = att.stats.atk * atkMult(atkStage) * (0.85 + att.stats.lvl / 90);
    var d = (base * (0.85 + 0.30 * Math.random()) - def.stats.def * 0.3) * (mult || 1) * (crit ? 1.6 : 1);
    return Math.max(2, Math.round(d));
  }
  function catchChance() {
    var w = B.wild, base = w.rarityInfo.catch;
    var hpFrac = w.stats.hp / w.stats.maxhp;
    var hpBoost = 1 + (1 - hpFrac) * 1.4;
    var studyBoost = Math.min(0.30, B.studied * 0.08);   // capped — no STUDY-spam exploit
    return Math.max(0.04, Math.min(0.95, base * hpBoost + studyBoost));
  }
  // a qualitative capture read (the player never sees raw %), shown after STUDY
  // and when CATCH is highlighted, so the loop has feedback.
  function catchRead() {
    var p = catchChance();
    return p < 0.2 ? "POOR" : p < 0.4 ? "FAIR" : p < 0.65 ? "GOOD" : "HIGH";
  }

  // ---- actions ---------------------------------------------------------
  function clamp3(s) { return Math.max(-3, Math.min(3, s)); }
  // Use a learned move. STATUS moves (m.stage) shift stat stages; damage moves can
  // land a CRITICAL HIT (boosted by SNIPE). Draining the foe to 0 HP makes it
  // FAINT (you earn XP, can't document it) — leave HP to catch. ACQUIRE softens.
  function applyMove(m) {
    if (m.stage && (m.pow || 0) === 0) {                 // pure status move
      if (m.self) B.mineStage[m.stage] = clamp3(B.mineStage[m.stage] + m.self);
      if (m.foe) B.wildStage[m.stage] = clamp3(B.wildStage[m.stage] + m.foe);
      say([shortName(B.mine) + " used " + m.name + "! " + (m.msg || "")], function () { enemyTurn(toMenu); });
      return;
    }
    if (m.catchBoost) B.studied++;
    var mult = window.EH_CREATURES.typeMult(B.mine.type, B.wild.type);
    var crit = Math.random() < critChance(B.mineStage.crit);
    var dmg = Math.round(damage(B.mine, B.wild, mult, crit, B.mineStage.atk) * (m.pow || 1));
    sfx(crit ? "crit" : "hit");
    B.wild.stats.hp = Math.max(0, B.wild.stats.hp - dmg);
    B.shakeWild = 0.45;
    var msgs = [shortName(B.mine) + " " + (m.verb || "hit") + " " + shortName(B.wild) + "!"];
    if (crit) msgs.push("A critical hit!");
    if (mult > 1) msgs.push("It's super effective!");
    else if (mult < 1) msgs.push("It's not very effective...");
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
    pages.push("Studied! Catch read is now " + catchRead() + ".");
    say(pages, toMenu);
  }
  // XP is SPLIT among every party member that battled (all who "faced" the foe).
  // Scales with the foe's level; the steep curve keeps a lead from snowballing.
  function awardWin(mult) {
    var st = window.EH_STATE, ids = Object.keys(B.participants);
    var diff = B.wild.stats.lvl - B.mine.level;
    var total = B.wild.stats.lvl * 3.2 * (diff < -7 ? 0.3 : 1) * (mult || 1);
    var each = total / Math.max(1, ids.length), leadGain = 0;
    ids.forEach(function (k) {
      var cr = st.party[+k]; if (!cr) return;
      var g = window.EH_CREATURES.gainXp(cr, each);
      if (+k === st.active) leadGain = g;
    });
    return leadGain;
  }
  function doCatch() {
    if (B.trainer) { say(["You can't document another HISTORIAN's contract!"], toMenu); return; }
    var p = catchChance();
    B.ballT = 1.1;
    if (Math.random() < p) {
      B.caught = true;
      var lv = awardWin(1.2);
      sfx("catch");
      window.EH_SAVE.addCatch(B.wild);
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
    // SPEED: if your active is much faster (e.g. after FRONTRUN), the foe may be
    // too slow to act this turn.
    if (effSpd(B.mine, B.mineStage.spd) > effSpd(B.wild, B.wildStage.spd) * 1.35 && Math.random() < 0.4) {
      say([(B.trainer ? "" : "Wild ") + shortName(B.wild) + " was too slow to act!"], after); return;
    }
    var moves = window.EH_CREATURES.movesFor(B.wild).filter(function (m) { return (m.pow || 0) > 0; });
    var m = moves[moves.length - 1] || { pow: 1, verb: "struck" };
    var crit = Math.random() < critChance(B.wildStage.crit);
    var mult = window.EH_CREATURES.typeMult(B.wild.type, B.mine.type);
    var dmg = Math.round(damage(B.wild, B.mine, mult, crit, B.wildStage.atk) * (m.pow || 1));
    sfx(crit ? "crit" : "hit");
    B.mine.stats.hp = Math.max(0, B.mine.stats.hp - dmg);
    B.flashMine = 0.45;
    var msgs = [(B.trainer ? "" : "Wild ") + shortName(B.wild) + " " + (m.verb || "struck") + " back!"];
    if (crit) msgs.push("A critical hit!");
    if (B.mine.stats.hp <= 0) {
      msgs.push(shortName(B.mine) + " was knocked out!"); sfx("faint");
      var others = aliveOthers();
      if (others.length) { say(msgs, function () { B.phase = "forceswitch"; B.sw = others[0]; }); }
      else { msgs.push("Your whole team is down! You black out..."); say(msgs, end); }
    } else { say(msgs, after); }
  }

  function toMenu() { B.phase = "menu"; }
  // HP PERSISTS between battles. If your WHOLE team is knocked out you black out:
  // the team is revived and you're sent back to the era's start.
  function end() {
    var st = window.EH_STATE;
    var allDown = st.party.every(function (c) { return c.stats.hp <= 0; });
    if (allDown) st.party.forEach(function (c) { c.stats.hp = c.stats.maxhp; });
    var cb = B.onEnd, win = B.didWin;
    if (window.EH_SAVE && window.EH_SAVE.persistLead) window.EH_SAVE.persistLead();
    if (window.EH_AUDIO) window.EH_AUDIO.setTrack("overworld");
    GB.pop();
    if (allDown && window.EH_WORLD && window.EH_WORLD.recover) window.EH_WORLD.recover();
    if (cb) cb(win);
  }

  // ---- input -----------------------------------------------------------
  // Labels say what they do: ANALYZE weakens, STUDY teaches (and raises catch
  // odds), CATCH throws an Archive Ball, RUN flees.
  // the top command menu — SWITCH only appears when you carry more than one
  function topMenu() {
    return window.EH_STATE.party.length > 1 ? ["FIGHT", "SWITCH", "STUDY", "CATCH", "RUN"] : ["FIGHT", "STUDY", "CATCH", "RUN"];
  }
  var scene = {
    onPress: function (b) {
      if (!B) return;
      if (B.phase === "msg") {
        if (b === GB.BTN.a || b === GB.BTN.b) advanceMsg();
        return;
      }
      if (B.phase === "menu") {
        var TOP = topMenu();
        if (B.sel >= TOP.length) B.sel = 0;
        if (b === GB.BTN.up) B.sel = (B.sel + TOP.length - 1) % TOP.length;
        else if (b === GB.BTN.down) B.sel = (B.sel + 1) % TOP.length;
        else if (b === GB.BTN.a) {
          var m = TOP[B.sel];
          if (m === "FIGHT") { B.phase = "moves"; B.msel = 0; }
          else if (m === "SWITCH") { B.phase = "switch"; B.sw = window.EH_STATE.active; }
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
      } else if (B.phase === "switch" || B.phase === "forceswitch") {
        var party = window.EH_STATE.party, n = party.length;
        if (b === GB.BTN.up) B.sw = (B.sw + n - 1) % n;
        else if (b === GB.BTN.down) B.sw = (B.sw + 1) % n;
        else if (b === GB.BTN.b && B.phase === "switch") B.phase = "menu";   // can't cancel a forced switch
        else if (b === GB.BTN.a) {
          if (party[B.sw].stats.hp <= 0 || B.sw === window.EH_STATE.active) return;  // pick a fresh one
          switchTo(B.sw, B.phase === "forceswitch");
        }
      }
    },
    update: function (dt) {
      if (!B) return;
      B.t += dt;
      if (B.phase === "enter") {
        B.enterT += dt / 0.55;
        if (B.enterT >= 1) { B.enterT = 1; sfx("encounter"); say([B.trainer ? (shortName(B.wild) + " steps up to battle!") : ("Wild " + shortName(B.wild) + " appeared!")], toMenu); }
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
    var w = 116, h = numbers ? 40 : 32;
    GB.boxR(x, y, w, h);
    var lvl = "L" + cr.stats.lvl, lw = GB.textWidth(lvl);
    var maxc = Math.floor((w - 15 - lw) / GB.GADV);
    GB.text(fitName(shortName(cr), maxc), x + 7, y + 5, "ink");
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
      plate(8 - (1 - ep) * 130, 12, B.wild, B.hpAnimW, false);
      plate(GB.W - 124 + (1 - ep) * 130, 80, B.mine, B.hpAnimM, true);
    }
    renderBottom();
  }

  function renderBottom() {
    var by = 122, bh = GB.H - by - 2;
    function cmdList(items, sel) {
      GB.boxR(150, by, GB.W - 150, bh, "panel", "navy");
      var mx = 164, my0 = by + 4, sp = items.length > 4 ? 7 : 8;
      for (var i = 0; i < items.length; i++) {
        var ty = my0 + i * sp;
        if (i === sel) GB.cursor(mx - 9, ty, "white");
        GB.text(items[i], mx, ty, "white");
      }
    }
    if (B.phase === "menu") {
      var TOP = topMenu();
      GB.boxR(0, by, 150, bh);                       // prompt window
      if (TOP[B.sel] === "CATCH" && !B.trainer) {     // show the capture read
        GB.text("CAPTURE READ:", 9, by + 9, "ink");
        GB.text(catchRead(), 9, by + 21, "blue");
        GB.text("(STUDY raises it)", 60, by + 21, "dim");
      } else {
        GB.text("WHAT WILL", 9, by + 9, "ink");
        GB.text(shortName(B.mine).slice(0, 11), 9, by + 21, "blue");
        GB.text("DO?", 9 + GB.textWidth(shortName(B.mine).slice(0, 11)) + 6, by + 21, "ink");
      }
      cmdList(TOP, B.sel);
    } else if (B.phase === "moves") {
      var mv = window.EH_CREATURES.movesFor(B.mine);
      GB.boxR(0, by, 150, bh);
      GB.text("CHOOSE A MOVE", 9, by + 9, "ink");
      GB.text("B: BACK", 9, by + 21, "dim");
      cmdList(mv.map(function (m) { return m.name; }), B.msel);
    } else if (B.phase === "switch" || B.phase === "forceswitch") {
      // a full-width party list: name, level, HP
      GB.boxR(0, by, GB.W, bh);
      GB.text(B.phase === "forceswitch" ? "SEND OUT WHO?" : "SWITCH TO?  (B: BACK)", 8, by + 8, "ink");
      var party = window.EH_STATE.party;
      for (var i = 0; i < party.length && i < 6; i++) {
        var cr = party[i], col = i % 3, row = (i / 3) | 0;
        var tx = 8 + col * 78, ty = by + 19 + row * 11, fainted = cr.stats.hp <= 0;
        if (i === B.sw) GB.cursor(tx - 7, ty, "red");
        var c2 = fainted ? "dim" : (i === window.EH_STATE.active ? "blue" : "ink");
        GB.text(shortName(cr).slice(0, 6) + " " + Math.ceil(cr.stats.hp) + "/" + cr.stats.maxhp, tx, ty, c2);
      }
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
