/* engine.js - the Game Boy. Everything below the game lives here:
 *
 *   - a 240x160 internal framebuffer (the real GBA resolution) drawn on an
 *     integer-scaled, pixel-crisp <canvas> that fills the viewport with
 *     letterboxing so the aspect ratio never distorts.
 *   - a 4-colour palette (classic DMG green, plus a dark "EH" variant) that all
 *     drawing goes through, so a theme swap is one array.
 *   - a hand-rolled 5x7 bitmap font (names render UPPERCASE, very Pokémon).
 *   - unified input: arrow keys / WASD / Z-X-Enter on desktop, an on-screen
 *     d-pad + A/B/START on touch. Both feed the same 8-button model with edge
 *     detection (press = this frame only) and held state (for walking).
 *   - a tiny scene stack. A scene is { update(dt), render(), onPress(btn),
 *     onRelease(btn), enter(), exit() }. world / battle / title / collection
 *     each register one. The loop drives only the top scene.
 *
 * No images, no audio files, no framework - every pixel is drawn from code so
 * the whole thing ships as a handful of small text files. window.GB is the
 * public surface the other modules build on.
 */
(function () {
  "use strict";

  // ---- the screen -------------------------------------------------------
  var W = 240, H = 160;                       // native GBA resolution
  var canvas, ctx, scale = 1, ox = 0, oy = 0; // letterbox offsets in CSS px

  // ---- palette ----------------------------------------------------------
  // Full-colour GBA-era palette (Pokémon FireRed / Emerald vibe). Drawing takes
  // EITHER a colour name (string, looked up here) or a legacy 0-3 ramp index
  // (kept as a neutral grayscale fallback for incidental UI fills). This is a
  // deliberate move OFF the monochrome DMG green.
  var COL = {
    // UI / neutrals
    box: "#f8f8f8", boxBorder: "#384868", boxFrame: "#90b0e0", boxShadow: "#9098b0",
    white: "#ffffff", ink: "#283038", dim: "#606878",
    gray1: "#d8d8e0", gray2: "#a8a8b8", gray3: "#707888", gray4: "#404858",
    // greens (grass / trees / arena)
    grass: "#80c860", grassD: "#54a838", grassL: "#a8e088", grassDk: "#3c7c28",
    tree: "#3ca048", treeD: "#1f6e30", treeL: "#6cc858", trunk: "#7a4a22", trunkD: "#542e14",
    arena: "#88d068", arenaD: "#5aa840",
    // blues (water / UI panels / FireRed menu)
    water: "#4a84d8", waterD: "#2a5ab8", waterL: "#8cb8ec", sky: "#a8d0f0", skyD: "#80b0e0",
    blue: "#3a6ec8", blueD: "#264c94", blueL: "#82aceb", navy: "#22315e",
    panel: "#4878c0", panelD: "#2a4c90", panelL: "#86b2ea",
    // earth / paths / wood
    earth: "#d8b46c", earthD: "#a87c3c", path: "#e6cf94", pathD: "#c0a058", dirt: "#bb8c46",
    sand: "#ecdaa2",
    // warm / accents
    red: "#e0463a", redD: "#a82028", roof: "#cc4338", roofD: "#922a26",
    orange: "#ec8c34", yellow: "#f4d23e", gold: "#e0a830", goldD: "#9c6a14",
    skin: "#f8c890", skinD: "#d8985c", hair: "#5a3416",
    purple: "#9858c0", purpleD: "#5c2c80", teal: "#36b0a4", pink: "#f06ea0", pinkD: "#a82858",
    // HP bar fills (green → yellow → red, like Gen 3)
    hpGreen: "#48c850", hpYellow: "#f0c828", hpRed: "#e04038"
  };
  var RAMP4 = ["#f8f8f8", "#b0b4c4", "#5c6478", "#1c2230"]; // legacy neutral ramp
  function pal(c) {
    if (typeof c === "string") return COL[c] || c;   // named colour or raw hex
    return RAMP4[c & 3];
  }
  function col(name) { return COL[name] || name; }
  function setTheme() { /* colours are fixed full-colour now */ }

  // ---- 5x7 bitmap font --------------------------------------------------
  // Authored as 7 rows of 5 chars ('#' = ink). Lowercase falls back to its
  // uppercase glyph - so everything reads UPPERCASE, which is exactly the
  // first-gen Pokémon look. Parsed once into bit rows at boot.
  var GLYPHS = {
    "A":"01110;10001;10001;11111;10001;10001;10001",
    "B":"11110;10001;10001;11110;10001;10001;11110",
    "C":"01110;10001;10000;10000;10000;10001;01110",
    "D":"11110;10001;10001;10001;10001;10001;11110",
    "E":"11111;10000;10000;11110;10000;10000;11111",
    "F":"11111;10000;10000;11110;10000;10000;10000",
    "G":"01110;10001;10000;10111;10001;10001;01111",
    "H":"10001;10001;10001;11111;10001;10001;10001",
    "I":"01110;00100;00100;00100;00100;00100;01110",
    "J":"00111;00010;00010;00010;00010;10010;01100",
    "K":"10001;10010;10100;11000;10100;10010;10001",
    "L":"10000;10000;10000;10000;10000;10000;11111",
    "M":"10001;11011;10101;10101;10001;10001;10001",
    "N":"10001;10001;11001;10101;10011;10001;10001",
    "O":"01110;10001;10001;10001;10001;10001;01110",
    "P":"11110;10001;10001;11110;10000;10000;10000",
    "Q":"01110;10001;10001;10001;10101;10010;01101",
    "R":"11110;10001;10001;11110;10100;10010;10001",
    "S":"01111;10000;10000;01110;00001;00001;11110",
    "T":"11111;00100;00100;00100;00100;00100;00100",
    "U":"10001;10001;10001;10001;10001;10001;01110",
    "V":"10001;10001;10001;10001;10001;01010;00100",
    "W":"10001;10001;10001;10101;10101;11011;10001",
    "X":"10001;10001;01010;00100;01010;10001;10001",
    "Y":"10001;10001;01010;00100;00100;00100;00100",
    "Z":"11111;00001;00010;00100;01000;10000;11111",
    "0":"01110;10011;10101;10101;11001;10001;01110",
    "1":"00100;01100;00100;00100;00100;00100;01110",
    "2":"01110;10001;00001;00110;01000;10000;11111",
    "3":"11111;00010;00100;00010;00001;10001;01110",
    "4":"00010;00110;01010;10010;11111;00010;00010",
    "5":"11111;10000;11110;00001;00001;10001;01110",
    "6":"00110;01000;10000;11110;10001;10001;01110",
    "7":"11111;00001;00010;00100;01000;01000;01000",
    "8":"01110;10001;10001;01110;10001;10001;01110",
    "9":"01110;10001;10001;01111;00001;00010;01100",
    " ":"00000;00000;00000;00000;00000;00000;00000",
    ".":"00000;00000;00000;00000;00000;01100;01100",
    ",":"00000;00000;00000;00000;01100;00100;01000",
    "!":"00100;00100;00100;00100;00100;00000;00100",
    "?":"01110;10001;00001;00110;00100;00000;00100",
    "'":"00100;00100;01000;00000;00000;00000;00000",
    "-":"00000;00000;00000;11111;00000;00000;00000",
    "+":"00000;00100;00100;11111;00100;00100;00000",
    ":":"00000;01100;01100;00000;01100;01100;00000",
    "/":"00001;00010;00010;00100;01000;01000;10000",
    "(":"00010;00100;01000;01000;01000;00100;00010",
    ")":"01000;00100;00010;00010;00010;00100;01000",
    "%":"11001;11010;00100;01000;10011;00011;00000",
    "*":"00000;01010;00100;11111;00100;01010;00000",
    "#":"01010;11111;01010;01010;11111;01010;00000",
    ">":"01000;00100;00010;00001;00010;00100;01000",
    "<":"00010;00100;01000;10000;01000;00100;00010",
    "$":"00100;01111;10100;01110;00101;11110;00100",
    "=":"00000;00000;11111;00000;11111;00000;00000",
    "x":"00000;00000;10001;01010;00100;01010;10001"
  };
  var FONT = {};
  Object.keys(GLYPHS).forEach(function (ch) {
    FONT[ch] = GLYPHS[ch].split(";").map(function (r) {
      var bits = [];
      for (var i = 0; i < 5; i++) bits.push(r[i] === "1" || r[i] === "#");
      return bits;
    });
  });
  var GW = 5, GH = 7, GADV = 6, GLINE = 9; // glyph width/height, advance, line height

  function glyphFor(ch) {
    if (FONT[ch]) return FONT[ch];
    var up = ch.toUpperCase();
    return FONT[up] || FONT["?"];
  }

  // Draw a string at (x,y) in palette colour `ci`. Honours \n. The optional
  // `max` caps how many glyphs are drawn (newlines don't count) - that's the
  // typewriter effect every Pokémon text box uses. Returns the pixel width.
  function text(str, x, y, ci, max) {
    if (ci == null) ci = "ink";
    ctx.fillStyle = pal(ci);
    var cx = x, cy = y, maxw = 0, n = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === "\n") { cy += GLINE; cx = x; continue; }
      if (max != null && n >= max) break;
      var g = glyphFor(ch);
      for (var ry = 0; ry < GH; ry++)
        for (var rx = 0; rx < GW; rx++)
          if (g[ry][rx]) ctx.fillRect(cx + rx, cy + ry, 1, 1);
      n++;
      cx += GADV;
      if (cx - x > maxw) maxw = cx - x;
    }
    return Math.max(maxw, cx - x);
  }
  // number of visible (non-newline) glyphs - for typewriter completion checks
  function glyphCount(str) {
    str = String(str); var n = 0;
    for (var i = 0; i < str.length; i++) if (str[i] !== "\n") n++;
    return n;
  }
  function textWidth(str) {
    str = String(str);
    var w = 0, line = 0;
    for (var i = 0; i < str.length; i++) {
      if (str[i] === "\n") { w = Math.max(w, line); line = 0; }
      else line += GADV;
    }
    return Math.max(w, line);
  }
  function textCenter(str, cx, y, ci) { text(str, Math.round(cx - textWidth(str) / 2), y, ci); }

  // Word-wrap to a pixel width → array of lines (chars, not pixels).
  function wrap(str, pxWidth) {
    var maxChars = Math.max(1, Math.floor(pxWidth / GADV));
    var words = String(str).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!cur.length) cur = w;
      else if ((cur + " " + w).length <= maxChars) cur += " " + w;
      else { lines.push(cur); cur = w; }
      while (cur.length > maxChars) { lines.push(cur.slice(0, maxChars)); cur = cur.slice(maxChars); }
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  // ---- primitive drawing ------------------------------------------------
  function clear(ci) { ctx.fillStyle = pal(ci == null ? 0 : ci); ctx.fillRect(0, 0, W, H); }
  function rect(x, y, w, h, ci) { ctx.fillStyle = pal(ci); ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function rectLine(x, y, w, h, ci) { // 1px outline
    ctx.fillStyle = pal(ci);
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }

  // The FireRed text/menu box: light interior, navy rounded border, and a 1px
  // inner highlight frame. bg/bd override the colours (e.g. the blue battle
  // command menu). This is the window every screen reuses.
  function boxR(x, y, w, h, bg, bd) {
    bg = bg || "box"; bd = bd || "boxBorder";
    rect(x, y, w, h, bg);
    rect(x + 1, y, w - 2, 1, bd); rect(x + 1, y + h - 1, w - 2, 1, bd);
    rect(x, y + 1, 1, h - 2, bd); rect(x + w - 1, y + 1, 1, h - 2, bd);
    // rounded corners
    rect(x + 1, y + 1, 1, 1, bd); rect(x + w - 2, y + 1, 1, 1, bd);
    rect(x + 1, y + h - 2, 1, 1, bd); rect(x + w - 2, y + h - 2, 1, 1, bd);
  }
  function panel(x, y, w, h) { boxR(x, y, w, h); }
  // the blinking "press to continue" down-triangle
  function triDown(x, y, ci) {
    if (ci == null) ci = "ink";
    rect(x, y, 5, 1, ci); rect(x + 1, y + 1, 3, 1, ci); rect(x + 2, y + 2, 1, 1, ci);
  }
  // the menu selection cursor (right-pointing arrow)
  function cursor(x, y, ci) {
    if (ci == null) ci = "red";
    rect(x, y, 1, 5, ci); rect(x + 1, y + 1, 1, 3, ci); rect(x + 2, y + 2, 1, 1, ci);
  }

  // Draw a sprite from a 2D grid. Cell values may be:
  //   -1 / null         → transparent
  //   a colour string   → drawn directly (e.g. the player sprite)
  //   a number 0-3      → indexes `ramp` (a 4-colour array) if given, else pal()
  // `ramp` lets one shape grid be recoloured per creature type.
  function sprite(grid, x, y, s, ramp) {
    s = s || 1;
    for (var ry = 0; ry < grid.length; ry++) {
      var row = grid[ry];
      for (var rx = 0; rx < row.length; rx++) {
        var v = row[rx];
        if (v === -1 || v == null) continue;
        ctx.fillStyle = (typeof v === "string") ? (COL[v] || v) : (ramp ? ramp[v] : pal(v));
        ctx.fillRect(x + rx * s, y + ry * s, s, s);
      }
    }
  }

  // Sprite with a 1px (scaled) dark outline traced around the solid pixels, so
  // creatures pop against any background (the Pokémon "black keyline" look).
  // `oc` is the outline colour (default near-black). Outline is drawn first.
  function spriteO(grid, x, y, s, ramp, oc) {
    s = s || 1; oc = oc || "#181820";
    var H = grid.length;
    ctx.fillStyle = oc;
    for (var ry = 0; ry < H; ry++) {
      var row = grid[ry];
      for (var rx = 0; rx < row.length; rx++) {
        var v = row[rx];
        if (v === -1 || v == null) continue;
        // paint the 4-neighbourhood of every solid cell with the outline colour
        ctx.fillRect(x + rx * s - s, y + ry * s, s, s);
        ctx.fillRect(x + rx * s + s, y + ry * s, s, s);
        ctx.fillRect(x + rx * s, y + ry * s - s, s, s);
        ctx.fillRect(x + rx * s, y + ry * s + s, s, s);
      }
    }
    sprite(grid, x, y, s, ramp);   // solid fill paints over the inner outline
  }

  // ---- a tiny seeded RNG ------------------------------------------------
  // mulberry32 - deterministic streams keyed off a contract address so a given
  // contract always generates the same sprite / nature.
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- input ------------------------------------------------------------
  // 8 logical buttons. `held` = currently down, `pressed` = down this frame
  // only (consumed each loop), so menus advance one step per tap.
  var BTN = { up: 0, down: 1, left: 2, right: 3, a: 4, b: 5, start: 6, select: 7 };
  var held = [false, false, false, false, false, false, false, false];
  var pressedQueue = [];

  function pressBtn(b) {
    if (b == null) return;
    if (!held[b]) pressedQueue.push(b);
    held[b] = true;
  }
  function releaseBtn(b) {
    if (b == null) return;
    held[b] = false;
    if (scene && scene.onRelease) scene.onRelease(b);
  }

  var KEYMAP = {
    ArrowUp: 0, KeyW: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2,
    ArrowRight: 3, KeyD: 3, KeyZ: 4, Enter: 4, Space: 4, KeyX: 5,
    Backspace: 5, ShiftLeft: 6, Escape: 6, Tab: 7
  };
  window.addEventListener("keydown", function (e) {
    var b = KEYMAP[e.code];
    if (b == null) return;
    e.preventDefault();
    pressBtn(b);
  }, { passive: false });
  window.addEventListener("keyup", function (e) {
    var b = KEYMAP[e.code];
    if (b == null) return;
    e.preventDefault();
    releaseBtn(b);
  }, { passive: false });

  // Touch controls are wired by the shell (index.html) which calls these.
  function isHeld(b) { return held[b]; }

  // ---- scene stack ------------------------------------------------------
  var stack = [];
  var scene = null;
  function top() { return stack.length ? stack[stack.length - 1] : null; }
  function refresh() { scene = top(); }
  // Render the scene directly beneath the top - used by overlay scenes
  // (dialog boxes, menus) so the live world shows through behind them.
  function renderBelow() {
    var s = stack[stack.length - 2];
    if (s && s.render) s.render();
  }

  function pushScene(s) {
    if (scene && scene.pause) scene.pause();
    stack.push(s);
    refresh();
    if (scene.enter) scene.enter();
  }
  function popScene() {
    var s = stack.pop();
    if (s && s.exit) s.exit();
    refresh();
    if (scene && scene.resume) scene.resume();
  }
  function replaceScene(s) {
    var old = stack.pop();
    if (old && old.exit) old.exit();
    stack.push(s);
    refresh();
    if (scene.enter) scene.enter();
  }

  // ---- the loop ---------------------------------------------------------
  var lastT = 0, acc = 0, started = false;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    var dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.1) dt = 0.1; // clamp after a tab-switch stall

    // dispatch buffered presses to the active scene
    if (scene) {
      while (pressedQueue.length) {
        var b = pressedQueue.shift();
        if (scene.onPress) scene.onPress(b);
      }
      if (scene.update) scene.update(dt);
      if (scene.render) scene.render();
    } else {
      pressedQueue.length = 0;
    }
  }

  // ---- responsive scaling ----------------------------------------------
  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    // leave room for the touch overlay at the bottom on portrait phones
    var s = Math.max(1, Math.floor(Math.min(vw / W, vh / H)));
    scale = s;
    var cssW = W * s, cssH = H * s;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ox = Math.floor((vw - cssW) / 2);
    oy = Math.floor((vh - cssH) / 2);
    canvas.style.left = ox + "px";
    canvas.style.top = Math.max(0, oy) + "px";
  }

  function init(canvasEl) {
    canvas = canvasEl;
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener("resize", resize);
    if (!started) { started = true; requestAnimationFrame(frame); }
  }

  window.GB = {
    W: W, H: H, BTN: BTN,
    init: init, resize: resize,
    // drawing
    ctx: function () { return ctx; }, pal: pal, setTheme: setTheme, theme: function () { return theme; },
    clear: clear, rect: rect, rectLine: rectLine, panel: panel, sprite: sprite, spriteO: spriteO,
    boxR: boxR, triDown: triDown, cursor: cursor,
    text: text, textCenter: textCenter, textWidth: textWidth, wrap: wrap,
    glyphCount: glyphCount,
    GADV: GADV, GLINE: GLINE,
    // input
    pressBtn: pressBtn, releaseBtn: releaseBtn, isHeld: isHeld,
    // scenes
    push: pushScene, pop: popScene, replace: replaceScene, current: function () { return scene; },
    renderBelow: renderBelow,
    // util
    hashStr: hashStr, rng: rng, col: col, COL: COL
  };
})();
