/* world.js - the overworld: hand-drawn zone maps, grid walking, a following
 * camera, tall-grass encounters, readable signs, walk-in doors, and talkable
 * NPCs. GBA resolution (240x160) shows a 15x10 tile window onto each map.
 *
 * Everything is drawn from code (no images): grass, trees, water, packed-earth
 * paths, full buildings (red roofs + plaster walls + windows + doors), and
 * interiors with wood floors, counters, bookshelves and plants.
 *
 * Transitions are unified: any tile listed in a zone's `exits` (the W warp pads,
 * the D building doors, the X exit mats) warps the player when stepped onto. So
 * walking into a door enters that building; walking onto the mat leaves it.
 *
 * Tile legend (one char per tile):
 *   .  grass        ,  tall grass (encounters)   P  path        W  warp(exit)
 *   T  tree(solid)  ~  water(solid)              R  rock(solid)  F  fence(solid)
 *   r  roof(solid)  H  wall(solid)  w  window-wall(solid)  D  door(enter)  S sign(solid,read)
 *   O  wood floor   M  inner wall(solid)  C counter(solid)  K bookcase(solid)
 *   L  plant(solid) =  rug             X  exit mat(leave)
 */
(function () {
  "use strict";
  var GB = window.GB, TILE = 16;
  var VIEW_TX = Math.ceil(GB.W / TILE) + 1, VIEW_TY = Math.ceil(GB.H / TILE) + 1;

  // ---------- shared dialog box ----------------------------------------
  var DLG_SPEED = 38;
  function dialog(pages, onDone) {
    if (typeof pages === "string") pages = [pages];
    // each page may carry a speaker: "NAME|the text" → name shown on a tab
    var groups = [];
    pages.forEach(function (p) {
      var speaker = null, body = p;
      var bar = p.indexOf("|");
      if (bar > 0 && bar < 18 && p.slice(0, bar) === p.slice(0, bar).toUpperCase()) {
        speaker = p.slice(0, bar); body = p.slice(bar + 1);
      }
      body = body.replace(/\{NAME\}/g, (window.EH_STATE && window.EH_STATE.name) || "HISTORIAN");
      var lines = wrap(body);
      for (var i = 0; i < lines.length; i += 2) groups.push({ sp: speaker, lines: lines.slice(i, i + 2) });
    });
    var idx = 0, t = 0, rev = 0, doneTyping = false;
    function pageChars() { return GB.glyphCount((groups[idx] ? groups[idx].lines : []).join("")); }
    var scene = {
      onPress: function (b) {
        if (b !== GB.BTN.a && b !== GB.BTN.b) return;
        if (!doneTyping) { rev = pageChars(); doneTyping = true; return; }
        idx++; rev = 0; doneTyping = false;
        if (idx >= groups.length) { GB.pop(); if (onDone) onDone(); }
      },
      update: function (dt) {
        t += dt;
        if (!doneTyping) { rev += dt * DLG_SPEED; if (rev >= pageChars()) { rev = pageChars(); doneTyping = true; } }
      },
      render: function () { GB.renderBelow(); boxAtBottom(groups[idx], t, Math.floor(rev), doneTyping); }
    };
    GB.push(scene);
  }
  function wrap(s) { return GB.wrap(s, GB.W - 28); }
  function boxAtBottom(group, t, rev, doneTyping) {
    var bh = 46, by = GB.H - bh - 3, bx = 4, bw = GB.W - 8;
    GB.boxR(bx, by, bw, bh);
    if (group && group.sp) {                       // speaker name tab
      var nw = GB.textWidth(group.sp) + 10;
      GB.boxR(bx + 4, by - 8, nw, 13, "navy", "navy");
      GB.text(group.sp, bx + 9, by - 5, "white");
    }
    var lines = group ? group.lines : [];
    if (rev == null) rev = 999;
    var used = 0;
    for (var i = 0; i < lines.length; i++) {
      var room = Math.max(0, rev - used);
      GB.text(lines[i], bx + 8, by + 10 + i * (GB.GLINE + 2), "ink", room);
      used += lines[i].length;
    }
    if (doneTyping !== false && Math.floor(t * 3) % 2 === 0) GB.triDown(bx + bw - 12, by + bh - 10, "red");
  }

  // ---------- tile rendering -------------------------------------------
  function shade(zone, x, y, salt) { return GB.rng(GB.hashStr(zone.name + ":" + x + ":" + y + ":" + (salt || "")))(); }

  // tint colour: a zone may override a palette name (per-era ground mood)
  function tc(zone, name) { return (zone && zone.tint && zone.tint[name]) || name; }

  function grassBase(sx, sy, zone, x, y) {
    GB.rect(sx, sy, TILE, TILE, tc(zone, "grass"));
    var s = shade(zone, x, y, "g");
    if (s < 0.13) { GB.rect(sx + 4, sy + 6, 1, 2, tc(zone, "grassD")); GB.rect(sx + 5, sy + 7, 2, 1, tc(zone, "grassD")); GB.rect(sx + 6, sy + 5, 1, 2, tc(zone, "grassD")); }
    else if (s < 0.22) { GB.rect(sx + 11, sy + 10, 1, 2, tc(zone, "grassL")); GB.rect(sx + 10, sy + 11, 2, 1, tc(zone, "grassL")); }
    else if (s < 0.27) {   // a clean 4-petal flower with a gold centre
      var fc = s < 0.235 ? "red" : s < 0.25 ? "yellow" : s < 0.26 ? "pink" : "white";
      GB.rect(sx + 7, sy + 5, 2, 2, fc); GB.rect(sx + 7, sy + 9, 2, 2, fc);
      GB.rect(sx + 5, sy + 7, 2, 2, fc); GB.rect(sx + 9, sy + 7, 2, 2, fc);
      GB.rect(sx + 7, sy + 7, 2, 2, "gold"); GB.rect(sx + 6, sy + 12, 1, 2, "grassDk");
    }
  }

  function drawTile(zone, ch, sx, sy, x, y, t) {
    switch (ch) {
      case "T": { // tree - layered canopy + trunk
        grassBase(sx, sy, zone, x, y);
        GB.rect(sx + 2, sy, 12, 13, "tree");
        GB.rect(sx + 1, sy + 3, 14, 8, "tree");
        GB.rect(sx + 2, sy, 1, 1, "grass"); GB.rect(sx + 13, sy, 1, 1, "grass");
        GB.rect(sx + 1, sy + 3, 1, 1, "grass"); GB.rect(sx + 14, sy + 3, 1, 1, "grass");
        GB.rect(sx + 1, sy + 10, 1, 1, "grass"); GB.rect(sx + 14, sy + 10, 1, 1, "grass");
        GB.rect(sx + 4, sy + 2, 4, 2, "treeL"); GB.rect(sx + 9, sy + 4, 2, 2, "treeL"); GB.rect(sx + 6, sy + 7, 2, 2, "treeL");
        GB.rect(sx + 3, sy, 9, 1, "treeD"); GB.rect(sx + 1, sy + 4, 1, 6, "treeD"); GB.rect(sx + 14, sy + 4, 1, 6, "treeD");
        GB.rect(sx + 3, sy + 12, 9, 1, "treeD"); GB.rect(sx + 6, sy + 13, 4, 3, "trunk"); GB.rect(sx + 6, sy + 13, 1, 3, "trunkD");
        break; }
      case "~": { grassBase(sx, sy, zone, x, y); // not used as edge; full water
        GB.rect(sx, sy, TILE, TILE, "water"); GB.rect(sx, sy, TILE, 2, "waterD");
        var off = Math.floor(t * 4) % TILE;
        GB.rect(sx + (off % TILE), sy + 4, 5, 1, "waterL"); GB.rect(sx + ((off + 8) % TILE), sy + 9, 5, 1, "waterL");
        GB.rect(sx + ((off + 4) % TILE), sy + 13, 4, 1, "waterD"); break; }
      case "R": grassBase(sx, sy, zone, x, y);
        GB.rect(sx + 2, sy + 4, 12, 9, "gray2"); GB.rectLine(sx + 2, sy + 4, 12, 9, "gray4"); GB.rect(sx + 4, sy + 6, 4, 2, "gray1"); break;
      case "F": grassBase(sx, sy, zone, x, y);
        GB.rect(sx, sy + 5, TILE, 2, "trunk"); GB.rect(sx + 2, sy + 2, 2, 12, "trunk"); GB.rect(sx + 7, sy + 2, 2, 12, "trunk"); GB.rect(sx + 12, sy + 2, 2, 12, "trunk");
        GB.rect(sx + 2, sy + 2, 1, 12, "trunkD"); GB.rect(sx + 7, sy + 2, 1, 12, "trunkD"); GB.rect(sx + 12, sy + 2, 1, 12, "trunkD"); break;
      case "S": grassBase(sx, sy, zone, x, y); // wooden sign
        GB.rect(sx + 7, sy + 9, 2, 6, "trunkD"); GB.rect(sx + 2, sy + 2, 12, 8, "trunk"); GB.rectLine(sx + 2, sy + 2, 12, 8, "trunkD");
        GB.rect(sx + 4, sy + 4, 8, 1, "sand"); GB.rect(sx + 4, sy + 6, 6, 1, "sand"); break;
      // ---- buildings ----
      case "r": { // red shingled roof
        GB.rect(sx, sy, TILE, TILE, "roof"); GB.rect(sx, sy, TILE, 2, "red");
        GB.rect(sx, sy + TILE - 3, TILE, 3, "roofD");
        for (var i = (x % 2) * 4; i < TILE; i += 8) GB.rect(sx + i, sy + 5, 1, TILE - 8, "roofD");
        break; }
      case "H": // plaster wall
        GB.rect(sx, sy, TILE, TILE, "sand"); GB.rect(sx, sy, TILE, 1, "earth"); GB.rect(sx, sy + TILE - 1, TILE, 1, "earthD");
        GB.rect(sx, sy + 7, TILE, 1, "earthD"); break;
      case "w": // window wall
        GB.rect(sx, sy, TILE, TILE, "sand"); GB.rect(sx, sy + TILE - 1, TILE, 1, "earthD");
        GB.rect(sx + 3, sy + 3, 10, 8, "skyD"); GB.rectLine(sx + 3, sy + 3, 10, 8, "earthD");
        GB.rect(sx + 4, sy + 4, 4, 3, "waterL"); GB.rect(sx + 8, sy + 4, 1, 6, "earthD"); GB.rect(sx + 3, sy + 7, 10, 1, "earthD"); break;
      case "D": // door (in plaster) - walkable
        GB.rect(sx, sy, TILE, TILE, "sand"); GB.rect(sx, sy, TILE, 1, "earth");
        GB.rect(sx + 3, sy + 2, 10, 14, "trunkD"); GB.rect(sx + 4, sy + 3, 8, 13, "trunk");
        GB.rect(sx + 5, sy + 5, 6, 1, "trunkD"); GB.rect(sx + 5, sy + 9, 6, 1, "trunkD"); GB.rect(sx + 10, sy + 10, 1, 2, "gold"); break;
      // ---- terrain paths ----
      case "P": GB.rect(sx, sy, TILE, TILE, tc(zone, "path"));
        if (shade(zone, x, y, "p") < 0.22) GB.rect(sx + 5, sy + 9, 2, 1, tc(zone, "pathD"));
        else if (shade(zone, x, y, "q") < 0.14) GB.rect(sx + 10, sy + 4, 1, 1, tc(zone, "pathD")); break;
      case "W": { GB.rect(sx, sy, TILE, TILE, "path"); GB.rect(sx, sy, TILE, 2, "pathD"); GB.rect(sx, sy + TILE - 2, TILE, 2, "pathD");
        if (Math.floor(t * 2) % 2 === 0) { GB.rect(sx + 6, sy + 5, 4, 1, "tree"); GB.rect(sx + 7, sy + 4, 2, 4, "tree"); GB.rect(sx + 5, sy + 7, 6, 1, "tree"); GB.rect(sx + 6, sy + 9, 4, 1, "tree"); }
        break; }
      // ---- interior tiles ----
      case "O": GB.rect(sx, sy, TILE, TILE, "earth"); GB.rect(sx, sy + 7, TILE, 1, "earthD"); GB.rect(sx, sy + 15, TILE, 1, "earthD");
        GB.rect(sx + ((x % 2) ? 11 : 3), sy, 1, 7, "earthD"); GB.rect(sx + ((x % 2) ? 3 : 11), sy + 8, 1, 7, "earthD"); break;
      case "M": GB.rect(sx, sy, TILE, TILE, "gray1"); GB.rect(sx, sy + 11, TILE, 5, "dirt"); GB.rect(sx, sy + 10, TILE, 1, "earthD");
        GB.rect(sx + 2, sy + 3, 2, 2, "skyD"); GB.rect(sx + 9, sy + 5, 2, 2, "skyD"); GB.rect(sx + 13, sy + 2, 2, 2, "skyD"); break;
      case "C": GB.rect(sx, sy, TILE, TILE, "earth"); GB.rect(sx, sy, TILE, 7, "trunk"); GB.rect(sx, sy + 7, TILE, 1, "trunkD");
        GB.rect(sx, sy + 8, TILE, 8, "dirt"); GB.rect(sx + 7, sy + 8, 1, 8, "earthD"); GB.rect(sx, sy + 2, TILE, 1, "earthD"); break;
      case "K": GB.rect(sx, sy, TILE, TILE, "trunkD"); GB.rect(sx + 1, sy + 1, 14, 4, "trunk"); GB.rect(sx + 1, sy + 7, 14, 4, "trunk"); GB.rect(sx + 1, sy + 12, 14, 3, "trunk");
        GB.rect(sx + 2, sy + 1, 2, 4, "red"); GB.rect(sx + 5, sy + 1, 2, 4, "blue"); GB.rect(sx + 8, sy + 1, 2, 4, "gold"); GB.rect(sx + 11, sy + 1, 2, 4, "teal");
        GB.rect(sx + 3, sy + 7, 2, 4, "purple"); GB.rect(sx + 7, sy + 7, 2, 4, "red"); GB.rect(sx + 10, sy + 7, 2, 4, "blue"); break;
      case "L": GB.rect(sx, sy, TILE, TILE, "earth"); GB.rect(sx + 4, sy + 1, 8, 8, "tree"); GB.rect(sx + 3, sy + 3, 10, 4, "tree");
        GB.rect(sx + 5, sy + 2, 2, 2, "treeL"); GB.rect(sx + 9, sy + 4, 2, 2, "treeL"); GB.rect(sx + 5, sy + 9, 6, 5, "roof"); GB.rect(sx + 5, sy + 9, 6, 1, "orange"); break;
      case "=": GB.rect(sx, sy, TILE, TILE, "earth"); GB.rect(sx + 1, sy + 1, 14, 14, "blue"); GB.rectLine(sx + 1, sy + 1, 14, 14, "navy");
        GB.rect(sx + 3, sy + 3, 10, 10, "panel"); GB.rect(sx + 6, sy + 6, 4, 4, "gold"); break;
      case "X": GB.rect(sx, sy, TILE, TILE, "earth"); GB.rect(sx + 2, sy + 9, 12, 6, "roof"); GB.rectLine(sx + 2, sy + 9, 12, 6, "roofD"); GB.rect(sx + 4, sy + 11, 8, 1, "orange"); break;
      default: grassBase(sx, sy, zone, x, y);
        if (ch === ",") { GB.rect(sx, sy + 12, TILE, 4, tc(zone, "grassD")); var sw = Math.floor(t * 2.5) % 2; clump(sx + 1 + (sw ? 1 : 0), sy); clump(sx + 9 - (sw ? 1 : 0), sy); }
    }
  }
  function clump(gx, sy) {
    GB.rect(gx, sy + 10, 6, 3, "grassD"); GB.rect(gx, sy + 7, 1, 4, "grassDk"); GB.rect(gx + 2, sy + 6, 1, 5, "grassDk");
    GB.rect(gx + 4, sy + 8, 1, 3, "grassDk"); GB.rect(gx + 5, sy + 7, 1, 4, "grassDk");
  }

  // ---------- people sprites (player + NPCs) ---------------------------
  // One template, recoloured per character. Down/up/side authored; right mirrors.
  var P_TPL = {
    down: ["................","................","....hhhhhh......","...hHHHHHHh.....","...hffffffh.....","...hfeffefh.....","...hffffffh.....","....FFFFFF......","...asSSSSsa.....","..aassssssaa....","...asssssa......","...ass..ssa.....","...pp....pp.....","...pP....Pp.....","...bb....bb.....","................"],
    up:   ["................","................","....hhhhhh......","...hHHHHHHh.....","...hhhhhhhh.....","...hhhhhhhh.....","...hhhhhhhh.....","....hhhhhh......","...asSSSSsa.....","..aassssssaa....","...asssssa......","...ass..ssa.....","...pp....pp.....","...pP....Pp.....","...bb....bb.....","................"],
    left: ["................","................","....hhhhhh......","...hHHHHHHh.....","...hffffhh......","...hfeffh.......","...hffffh.......","....FFFFh.......","...asSSSsa......","..aasssssa......","...asssssa......","...ass.ssa......","...pp..pp.......","...pP..Pp.......","...bb..bb.......","................"]
  };
  function buildDir(rows, pal) {
    return rows.map(function (r) {
      return r.split("").map(function (ch) {
        var c = pal[ch]; if (c === undefined) return -1; return GB.COL[c] || c;
      });
    });
  }
  function mirror(grid) { return grid.map(function (row) { return row.slice().reverse(); }); }
  function person(pal) {
    var d = buildDir(P_TPL.down, pal), u = buildDir(P_TPL.up, pal), l = buildDir(P_TPL.left, pal);
    return { 0: u, 1: d, 2: l, 3: mirror(l), pal: pal };
  }
  // palettes (h hair, H hairD, f skin, F skinD, e eye, s shirt, S shirtD, a skin-hand, p pants, P pantsD, b boots)
  var PAL = {
    player: { h: "#b03020", H: "#7a1c14", f: "skin", F: "skinD", e: "ink", s: "red", S: "redD", a: "skin", p: "navy", P: "#162244", b: "ink" },
    prof:   { h: "gray2", H: "gray3", f: "skin", F: "skinD", e: "ink", s: "white", S: "gray1", a: "skin", p: "gray3", P: "gray4", b: "ink" },
    blue:   { h: "hair", H: "#3a2010", f: "skin", F: "skinD", e: "ink", s: "blue", S: "blueD", a: "skin", p: "navy", P: "#162244", b: "ink" },
    green:  { h: "trunkD", H: "#3a2010", f: "skin", F: "skinD", e: "ink", s: "tree", S: "treeD", a: "skin", p: "trunk", P: "trunkD", b: "ink" },
    purple: { h: "purpleD", H: "#3a1850", f: "skin", F: "skinD", e: "ink", s: "purple", S: "purpleD", a: "skin", p: "navy", P: "#162244", b: "ink" },
    pink:   { h: "#7a3020", H: "#4a1c10", f: "skin", F: "skinD", e: "ink", s: "pink", S: "pinkD", a: "skin", p: "purpleD", P: "#3a1850", b: "ink" },
    gold:   { h: "goldD", H: "#5a3a08", f: "skin", F: "skinD", e: "ink", s: "gold", S: "goldD", a: "skin", p: "trunk", P: "trunkD", b: "ink" },
    teal:   { h: "ink", H: "ink", f: "skin", F: "skinD", e: "ink", s: "teal", S: "#136058", a: "skin", p: "gray4", P: "ink", b: "ink" },
    kid:    { h: "gold", H: "goldD", f: "skin", F: "skinD", e: "ink", s: "orange", S: "roofD", a: "skin", p: "blue", P: "blueD", b: "ink" }
  };
  var SPRITES = {};
  Object.keys(PAL).forEach(function (k) { SPRITES[k] = person(PAL[k]); });
  var PLAYER = SPRITES.player;

  function drawLegs(sx, sy, dir, frame, pal) {
    var d = GB.COL[pal.p] || pal.p;
    if (dir === 2 || dir === 3) {
      if (frame) { GB.rect(sx + 5, sy + 12, 2, 4, d); GB.rect(sx + 8, sy + 13, 2, 3, d); }
      else { GB.rect(sx + 5, sy + 13, 2, 3, d); GB.rect(sx + 8, sy + 12, 2, 4, d); }
    } else {
      if (frame) { GB.rect(sx + 4, sy + 12, 3, 4, d); GB.rect(sx + 9, sy + 12, 3, 3, d); }
      else { GB.rect(sx + 4, sy + 12, 3, 3, d); GB.rect(sx + 9, sy + 12, 3, 4, d); }
    }
  }
  function drawPerson(spr, sx, sy, dir, frame) {
    GB.sprite(spr[dir] || spr[1], sx, sy, 1);
    if (frame !== null) drawLegs(sx, sy, dir, frame, spr.pal);
  }

  // ---------- interiors factory ----------------------------------------
  // Two reusable room templates; each interior is one of these plus its own
  // back-exit and NPCs. 12 wide x 9 tall (centres in the 15x10 view).
  var TPL = {
    shop: ["MMMMMMMMMMMM","MKKCCCCCKKKM","MOOOOOOOOOOM","MLOOOOOOOOLM","MOOOOOOOOOOM","MOOOO==OOOOM","MOOOOOOOOOOM","MLOOOOOOOOLM","MMMMMXMMMMMM"],
    hall: ["MMMMMMMMMMMM","MKLOOOOOOLKM","MOOOOOOOOOOM","MOOO====OOOM","MOOO====OOOM","MOOO====OOOM","MOOOOOOOOOOM","MLOOOOOOOOLM","MMMMMXMMMMMM"]
  };

  // ---------- zone definitions -----------------------------------------
  // Outdoor maps. Buildings authored as roof(r)/wall(H,w)/door(D). NPCs &
  // building→interior links are attached below via BUILDINGS / per-zone npcs.
  // ---------- outdoor route templates ----------------------------------
  // Two reusable 22x16 layouts, each with warps at BOTH ends + two building
  // doors. Eras alternate between them (so neighbours look different) and tint
  // their grass/path per the mood of the era. The era CONTENT - encounters,
  // signs, NPC stories, building curators - is what really differs.
  var TPL_OUT = {
    route: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T...rrr......rrr....TT",
      "T...HwH......HwH....TT",
      "T...HDH......HDH....TT",
      "TPPPPPPPPPPPPPPPPPPPPT",
      "T..,,....P....,,...STT",
      "T..,,....P....,,...TTT",
      "WPPPPPPPPPPPPPPPPPPPPW",
      "T....,,..P....,,....TT",
      "T....,,..P....,,....TT",
      "T........PP........TTT",
      "T..,,,...PP....,,,..TT",
      "T..,,,...PP....,,,..TT",
      "T........PP........TTT",
      "T..................TTT",
      "TTTTTTTTTTTTTTTTTTTTTT"
    ],
    town: [
      "FFFFFFFFFFFFFFFFFFFFFF",
      "F....rrrr....rrrr....F",
      "F....HwwH....HwwH....F",
      "F....HwDH....HwDH....F",
      "FPPPPPPPPPPPPPPPPPPPPF",
      "F...,,.....,,.....,,.F",
      "WPPPPPPPPPPPPPPPPPPPPW",
      "F..,,.....,,.....,,..F",
      "FPPPPPPPPPPPPPPPPPPPPF",
      "F...,,.....,,.....,,.F",
      "F..,,,...,,,...,,,...F",
      "F.........S..........F",
      "F..,,,...,,,...,,,...F",
      "F..................,.F",
      "F....,,......,,.....,F",
      "FFFFFFFFFFFFFFFFFFFFFF"
    ],
    // a lakeside route — a wide body of water below the path (water is impassable)
    lake: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T...rrr......rrr....TT",
      "T...HwH......HwH....TT",
      "T...HDH......HDH....TT",
      "TPPPPPPPPPPPPPPPPPPPPT",
      "T..,,....P....,,...STT",
      "T........P.........TTT",
      "WPPPPPPPPPPPPPPPPPPPPW",
      "T..~~~~~......,,....TT",
      "T.~~~~~~~~....,,....TT",
      "T.~~~~~~~~.........TTT",
      "T..~~~~~~....,,,....TT",
      "T...~~~~....,,,.....TT",
      "T.........,,.......TTT",
      "T..................TTT",
      "TTTTTTTTTTTTTTTTTTTTTT"
    ],
    // a rocky crag — boulders strewn across the route (rocks are impassable)
    crag: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T...rrr......rrr....TT",
      "T...HwH......HwH....TT",
      "T...HDH......HDH....TT",
      "TPPPPPPPPPPPPPPPPPPPPT",
      "T.R,,....P....,,.R.STT",
      "T..,,..R.P..R.,,...TTT",
      "WPPPPPPPPPPPPPPPPPPPPW",
      "T..,,..R....R.,,....TT",
      "T.R,,....RR...,,..R.TT",
      "T....RR......RR....TTT",
      "T..,,,...RR....,,,..TT",
      "T..,,,.R.....R.,,,..TT",
      "T...R.........R....TTT",
      "T....R.....R.......TTT",
      "TTTTTTTTTTTTTTTTTTTTTT"
    ],
    // a VERTICAL valley — you travel north-south through it (warps top & bottom).
    valley: [
      "TTTTTTTTTTWTTTTTTTTTTT",
      "T.....,,..P..,,,.....T",
      "T.........P.........,T",
      "T..rrr....P....rrr...T",
      "T..HwH....P....HwH...T",
      "T..HDH....P....HDH...T",
      "T..PPPPPPPPPPPPPPP...T",
      "T....,,...P...,,,...ST",
      "T.........P.........,T",
      "T..,,,....P....,,,...T",
      "T..,,,....P....,,,...T",
      "T.........P..........T",
      "T....,,...P...,,.....T",
      "T....,,...P...,,.....T",
      "T.........P..........T",
      "TTTTTTTTTTWTTTTTTTTTTT"
    ]
  };
  // per-template geometry, in ENTRY/EXIT terms so routes can connect on any side:
  //  - horizontal templates: entry = west edge, exit = east edge
  //  - vertical (valley):    entry = top edge,  exit = bottom edge
  // The chain wires prev.exit → this.entry and this.exit → next.entry.
  var GEOM = {
    route:  { entry: { warp: { x: 0, y: 7 }, spawn: { x: 1, y: 7 } },  exit: { warp: { x: 21, y: 7 }, spawn: { x: 20, y: 7 } }, sign: { x: 19, y: 5 } },
    town:   { entry: { warp: { x: 0, y: 6 }, spawn: { x: 1, y: 6 } },  exit: { warp: { x: 21, y: 6 }, spawn: { x: 20, y: 6 } }, sign: { x: 10, y: 11 } },
    valley: { entry: { warp: { x: 10, y: 0 }, spawn: { x: 10, y: 1 } }, exit: { warp: { x: 10, y: 15 }, spawn: { x: 10, y: 14 } }, sign: { x: 20, y: 7 } }
  };
  function geomFor(tpl) { return GEOM[tpl] || GEOM.route; }
  // era ground tints (null = default lush green) - subtle per-era mood
  var TINTS = {
    frontier: null,
    homestead: { grass: "#8ed06a", grassD: "#5cb33e", grassL: "#b6e891" },
    dao:       { grass: "#6f9a72", grassD: "#487a52", grassL: "#9cc497", path: "#cdbf90", pathD: "#9c8a54" },
    tangerine: { grass: "#a8bf52", grassD: "#7e9a34", grassL: "#cfe07e", path: "#e8c074", pathD: "#bf8a3a" },
    spurious:  { grass: "#bcb06a", grassD: "#92864a", grassL: "#dcd292", path: "#e8d7a0", pathD: "#bfa566" },
    byzantium: { grass: "#7e9a52", grassD: "#566f34", grassL: "#aac57e", path: "#e6cf94", pathD: "#bfa050" },
    constantinople: { grass: "#6fb094", grassD: "#3f8466", grassL: "#9bd4ba", path: "#d6d8e2", pathD: "#9aa0b2" }
  };

  // ---------- the seven era zones (the region) -------------------------
  // Each era: which template, encounter rate, the route sign, two roaming NPCs,
  // and two buildings (a "hall" museum + a second room), every line drawn from
  // real Ethereum history. The encounter pool comes from that era's real
  // documented contracts (creatures.js randomForZone(eraId)).
  var ERAS = [
    { id: "frontier", name: "FRONTIER", year: "2015", tpl: "route", rate: 0.11,
      sign: "FRONTIER - 2015. Ethereum's first year. The earliest contracts ever deployed live in this grass: greeters, name registries, the first tokens.  EAST >>> HOMESTEAD",
      npcs: [
        { spr: "green", name: "TRAPPER", text: ["TRAPPER|I was here on Frontier Day 1 - July 30th, 2015. Linagee deployed a raw 0xDEADBEEF test before anyone even knew what a contract WAS."] },
        { spr: "blue", name: "WANDERER", text: ["WANDERER|ETHERIA - a world of hexagonal tiles - shipped in 2015. The FIRST NFT, two years before CryptoKitties. STUDY the rare ones before you throw a ball."] }
      ],
      buildings: [
        { name: "FRONTIER HALL", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "prof", name: "CURATOR", text: ["CURATOR|2015 was the experimental dawn. MISTCOIN - the token that inspired ERC-20. The GREETER from the tutorial. AyeAyeCoin. Each one a legend.", "CURATOR|Hundreds are documented here. Catch them, and their story joins your Dex forever."] },
          { x: 8, y: 5, spr: "blue", name: "SCHOLAR", text: ["SCHOLAR|Six 'zombie accounts' were the earliest null deployments on mainnet. Nobody is sure who made them or why. The frontier kept its secrets."] } ] },
        { name: "MIST CABIN", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "green", name: "HISTORIAN", text: ["HISTORIAN|MISTCOIN was deployed and distributed through the Mist wallet - one of the first tokens anyone actually held. Fabian Vogelsteller's prototype became ERC-20."] } ] }
      ] },
    { id: "homestead", name: "HOMESTEAD", year: "2016", tpl: "valley", rate: 0.13,
      sign: "HOMESTEAD - 2016. Ethereum's first planned upgrade. Stable enough to BUILD on: ENS, early Maker, the first token-for-token swaps.  <<< FRONTIER   DAO FORK >>>",
      npcs: [
        { spr: "blue", name: "BUILDER", text: ["BUILDER|Homestead made the chain solid. Real projects appeared - name services, lending experiments, the first decentralized exchanges."] },
        { spr: "gold", name: "SWAPPER", text: ["SWAPPER|The UNICORN MEAT GRINDER - feed it one ERC-20, get another back. The first on-chain swap, March 2016. Uniswap's great-grandfather."] }
      ],
      buildings: [
        { name: "HOMESTEAD HALL", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "prof", name: "ARCHIVIST", text: ["ARCHIVIST|176 contracts from 2016 are documented in these halls. The year Ethereum learned to walk.", "ARCHIVIST|The Unicorn token gave you a unicorn for donating 2.014 ETH to the Foundation. People loved it."] } ] },
        { name: "SWAP SHED", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "gold", name: "MECHANIC", text: ["MECHANIC|Bok Consulting's TokenTraderFactory spun up a trading contract per token. Early DEX plumbing, years before AMMs."] } ] }
      ] },
    { id: "dao", name: "DAO FORK", year: "2016", tpl: "crag", rate: 0.13,
      sign: "DAO FORK - July 2016. THE DAO raised 12.7M ETH, then a reentrancy bug drained it. The chain hard-forked to claw it back. ETH and ETC were born here.  <<< HOMESTEAD   TANGERINE >>>",
      npcs: [
        { spr: "purple", name: "INVESTOR", text: ["INVESTOR|I put ETH into The DAO. 'Code is law', we all said... until $60M walked straight out the door through a recursive call."] },
        { spr: "teal", name: "SPLITTER", text: ["SPLITTER|Some refused the fork - they said the chain must be immutable. Their version became Ethereum Classic. Two histories, one genesis."] }
      ],
      buildings: [
        { name: "THE DAO HALL", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "purple", name: "CURATOR", text: ["CURATOR|THE DAO: 12.7M ETH from 11,000 people - the largest crowdfund in history at the time.", "CURATOR|The attacker drained it into a 'child DAO'. The community voted to fork and rewrite the balances. Barely."] },
          { x: 8, y: 5, spr: "blue", name: "WITNESS", text: ["WITNESS|For weeks it was all anyone talked about. Fork, or hold the line? The vote was close. Ethereum chose to intervene - once."] } ] },
        { name: "FORK CAMP", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "teal", name: "MINER", text: ["MINER|Block 1,920,000. That's where the two chains split. I had to choose which one to point my rigs at. We all did."] } ] }
      ] },
    { id: "tangerine", name: "TANGERINE WHISTLE", year: "2016", tpl: "lake", rate: 0.15,
      sign: "TANGERINE WHISTLE - Oct 2016. A wave of DoS spam hammered the chain. EIP-150 repriced gas overnight to stop it. Survival, written into the protocol.  <<< DAO   SPURIOUS >>>",
      npcs: [
        { spr: "teal", name: "ATTACKER", text: ["ATTACKER|The 'Shanghai attacks' spammed cheap opcodes - EXTCODESIZE, SUICIDE - to grind every node to a crawl. Blocks took forever."] },
        { spr: "blue", name: "DEFENDER", text: ["DEFENDER|EIP-150 made those opcodes expensive in a single fork. The spam stopped being profitable. The chain adapted and lived."] }
      ],
      buildings: [
        { name: "GAS STATION", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "gold", name: "ENGINEER", text: ["ENGINEER|Gas isn't just a fee - it's the immune system. Tangerine Whistle proved the protocol could reprice itself to survive an attack."] } ] },
        { name: "SPAM RUINS", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "teal", name: "WATCHER", text: ["WATCHER|Thousands of attack contracts got created and self-destructed that month. Ghosts of a war the chain barely won."] } ] }
      ] },
    { id: "spurious", name: "SPURIOUS DRAGON", year: "2016-17", tpl: "route", rate: 0.16,
      sign: "SPURIOUS DRAGON - Nov 2016. State-clearing and replay protection clean up after the attacks... and then the ICO boom begins. The grass thickens.  <<< TANGERINE   BYZANTIUM >>>",
      npcs: [
        { spr: "prof", name: "CLEANER", text: ["CLEANER|EIP-161 swept thousands of empty attack accounts off the chain - a real spring cleaning. And EIP-155 stopped replay attacks between ETH and ETC."] },
        { spr: "gold", name: "TRADER", text: ["TRADER|By 2017 the ICOs were arriving. A new token every block, it felt like. Most worthless. A few... not."] }
      ],
      buildings: [
        { name: "STATE HALL", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "prof", name: "ARCHIVIST", text: ["ARCHIVIST|104 documented contracts from this era. The chain got leaner and meaner, then the gold rush poured in."] } ] },
        { name: "ICO DAWN", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "teal", name: "PROMOTER", text: ["PROMOTER|First the trickle, then the flood. Crowdsale contracts, vesting contracts, vending machines selling tokens for ETH."] } ] }
      ] },
    { id: "byzantium", name: "BYZANTIUM", year: "2017-19", tpl: "town", rate: 0.18,
      sign: "BYZANTIUM - Oct 2017. The boom. CryptoKitties clog the chain. ERC-20s by the thousand. NFTs are born. The wildest era of them all.  <<< SPURIOUS   CONSTANTINOPLE >>>",
      npcs: [
        { spr: "pink", name: "KITTY BREEDER", text: ["KITTY BREEDER|CRYPTOKITTIES! Late 2017, these breeding-cat NFTs congested the ENTIRE network. Gas to the moon. Pixels became property."] },
        { spr: "teal", name: "ICO SHILL", text: ["ICO SHILL|Got a whitepaper? BANCOR raised $153M in three hours. STATUS started a gas war. A thousand tokens launched. Maybe ten mattered."] }
      ],
      buildings: [
        { name: "ICO BOOTH", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "teal", name: "PROMOTER", text: ["PROMOTER|This was the mania. ERC-20 made launching a token trivial, so everyone did. The good, the bad, and the rug.", "PROMOTER|CRYPTOPUNKS gave away 10,000 pixel portraits for free in 2017. Look how that turned out."] } ] },
        { name: "NFT GALLERY", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "purple", name: "ARTIST", text: ["ARTIST|CryptoKitties. MoonCats. Etheria reborn. The non-fungible token standard, ERC-721, was forged right here in the chaos."] } ] }
      ] },
    { id: "constantinople", name: "CONSTANTINOPLE", year: "2019", tpl: "lake", rate: 0.18,
      sign: "CONSTANTINOPLE - Feb 2019. Gas costs tuned, the chain matures, DeFi stirs. The story is still being written - so go and document it.  <<< BYZANTIUM",
      npcs: [
        { spr: "blue", name: "BUILDER", text: ["BUILDER|MakerDAO, 0x, the ancestors of Compound and Aave. The quiet plumbing being laid here becomes 'DeFi summer' in 2020."] },
        { spr: "prof", name: "SAGE", text: ["SAGE|You've walked all seven eras. Every contract you caught is documented for good. History remembers what we choose to write down."] }
      ],
      buildings: [
        { name: "DEFI LAB", tpl: "hall", npcs: [
          { x: 4, y: 3, spr: "gold", name: "DEGEN", text: ["DEGEN|Lending, exchanges, stablecoins - all being assembled now. The ICO rush is over. THIS is what gets built next."] } ] },
        { name: "THE ARCHIVE", tpl: "shop", npcs: [
          { x: 6, y: 3, spr: "prof", name: "SAGE", text: ["SAGE|Ethereum History documents real contracts so they're never forgotten. Every one you catch here links to its page. Thank you for being a historian."] } ] }
      ] }
  ];

  // ---------- the lab (start) ------------------------------------------
  var ZONES = {
    lab: {
      name: "PROF. NAKAMOTO'S LAB", year: "", rate: 0, interior: true, heal: true, w: 12, h: 9,
      start: { x: 5, y: 6 },
      rows: ["MMMMMMMMMMMM","MKKKKLLKKKKM","MOOOOOOOOOOM","MOOO====OOOM","MOOOOOOOOOOM","MOOOOOOOOOOM","MOOOOOOOOOOM","MLOOOOOOOOLM","MMMMMXMMMMMM"],
      exits: [{ x: 5, y: 8, to: { zone: "frontier", x: 1, y: 7 } }],
      signs: [],
      npcs: [
        { x: 5, y: 3, spr: "prof", name: "PROF. NAKAMOTO", text: ["PROF. NAKAMOTO|Welcome to my lab! I study the contracts deployed across Ethereum's history.", "PROF. NAKAMOTO|Every contract is a fossil of an idea. Most have never been documented.", "PROF. NAKAMOTO|That's YOUR quest: explore the seven eras, encounter the contracts, and CATCH them for the Historian's Dex."] },
        { x: 9, y: 7, spr: "kid", name: "AIDE", text: ["AIDE|Hi {NAME}! Walk into tall grass to find wild contracts. Walk into doors to go inside. Press A to read signs and talk to folks. START opens your menu!"] }
      ]
    }
  };

  // ---------- generate the era zones + chain them together -------------
  // Historian trainers — one per era. Repeatable battles for XP; they fight with
  // a real, notable contract of their era (no catching theirs). Placed on the
  // grass just off the path at (10,5).
  var TRAINERS = {
    frontier: { name: "HISTORIAN LINA", spr: "prof", use: /greeter|mistcoin|etheria|ayeaye/i,
      intro: ["HISTORIAN LINA|A fellow historian! Let's see how your contract handles a frontier relic. For the record!"], win: "HISTORIAN LINA|Beautifully documented. Keep at it!" },
    homestead: { name: "HISTORIAN ABE", spr: "blue", use: /unicorn|maker|registrar|grinder/i,
      intro: ["HISTORIAN ABE|Homestead is where the building began. Prove your contract has grown!"], win: "HISTORIAN ABE|Sharp work. The Dex grows." },
    dao: { name: "HISTORIAN VIK", spr: "purple", use: /dao/i,
      intro: ["HISTORIAN VIK|Every historian must understand the fork. Battle me, and learn what it cost!"], win: "HISTORIAN VIK|'Code is law'... but you fight well." },
    tangerine: { name: "HISTORIAN GASPER", spr: "gold", use: null,
      intro: ["HISTORIAN GASPER|Survived the spam wars, did you? Let's spar - winner buys the gas."], win: "HISTORIAN GASPER|Resilient. Just like the chain." },
    spurious: { name: "HISTORIAN SORA", spr: "teal", use: null,
      intro: ["HISTORIAN SORA|The ICO dawn is breaking. Show me your strongest contract!"], win: "HISTORIAN SORA|A worthy document indeed." },
    byzantium: { name: "HISTORIAN NEO", spr: "pink", use: /kitt|punk|mooncat|nft/i,
      intro: ["HISTORIAN NEO|This is the WILD era! Can your contract keep up with the mania?"], win: "HISTORIAN NEO|Legendary run. Onward!" },
    constantinople: { name: "PROF. NAKAMOTO", spr: "prof", use: /maker|weth|0x|compound/i,
      intro: ["PROF. NAKAMOTO|You've come so far, historian. One last battle - for old times' sake!"], win: "PROF. NAKAMOTO|Magnificent. You're a true historian now. Thank you for everything." }
  };

  var BUILDING_DEFS = {};
  ERAS.forEach(function (era, i) {
    var g = geomFor(era.tpl);
    var townish = era.tpl === "town", vert = era.tpl === "valley";
    var rows = TPL_OUT[era.tpl].slice();
    var npcs = era.npcs.map(function (n, k) {
      var pos = (vert ? [{ x: 6, y: 8 }, { x: 14, y: 11 }] : townish ? [{ x: 7, y: 5 }, { x: 14, y: 9 }] : [{ x: 6, y: 5 }, { x: 14, y: 9 }])[k];
      return { x: pos.x, y: pos.y, spr: n.spr, name: n.name, text: n.text };
    });
    if (TRAINERS[era.id]) {
      var tr = TRAINERS[era.id], tp = vert ? { x: 7, y: 11 } : { x: 10, y: 5 };
      npcs.push({ x: tp.x, y: tp.y, spr: tr.spr, name: tr.name, trainer: tr });
    }
    var z = {
      name: era.name, year: era.year, rate: era.rate, w: 22, h: 16,
      tint: TINTS[era.id] || null, era: era.id,
      rows: rows, start: { x: g.entry.spawn.x, y: g.entry.spawn.y },
      warps: [], npcs: npcs,
      signs: [{ x: g.sign.x, y: g.sign.y, text: era.sign }]
    };
    // entry warp → previous era's EXIT arrival (frontier's entry → the lab)
    var back = i === 0 ? { zone: "lab", x: 5, y: 6 }
      : { zone: ERAS[i - 1].id, x: geomFor(ERAS[i - 1].tpl).exit.spawn.x, y: geomFor(ERAS[i - 1].tpl).exit.spawn.y };
    z.warps.push({ x: g.entry.warp.x, y: g.entry.warp.y, to: back });
    // exit warp → next era's ENTRY arrival (last era: wall off the exit edge)
    if (i < ERAS.length - 1) {
      var ng = geomFor(ERAS[i + 1].tpl);
      z.warps.push({ x: g.exit.warp.x, y: g.exit.warp.y, to: { zone: ERAS[i + 1].id, x: ng.entry.spawn.x, y: ng.entry.spawn.y } });
    } else {
      var wch = townish ? "F" : "T";
      var r = z.rows[g.exit.warp.y];
      z.rows[g.exit.warp.y] = r.slice(0, g.exit.warp.x) + wch + r.slice(g.exit.warp.x + 1);
    }
    ZONES[era.id] = z;
    BUILDING_DEFS[era.id] = era.buildings;
  });

  // scan doors → wire exits + generate interior zones (door order = def order)
  Object.keys(BUILDING_DEFS).forEach(function (zoneId) {
    var oz = ZONES[zoneId]; if (!oz) return;
    oz.exits = oz.exits || [];
    var doors = [];
    for (var y = 0; y < oz.h; y++) for (var x = 0; x < oz.w; x++) if (oz.rows[y][x] === "D") doors.push({ x: x, y: y });
    BUILDING_DEFS[zoneId].forEach(function (def, i) {
      var d = doors[i]; if (!d) return;
      var iid = zoneId + "_" + i;
      oz.exits.push({ x: d.x, y: d.y, to: { zone: iid, x: 5, y: 6 } });
      ZONES[iid] = {
        name: def.name, year: "", rate: 0, interior: true, w: 12, h: 9,
        heal: def.tpl === "hall",            // era HALLs double as healing centres
        start: { x: 5, y: 6 }, rows: TPL[def.tpl || "shop"].slice(),
        exits: [{ x: 5, y: 8, to: { zone: zoneId, x: d.x, y: d.y + 1 } }],
        signs: [], npcs: def.npcs || [],
        enterText: def.npcs && def.npcs[0] ? def.npcs[0].text : null
      };
    });
  });

  // turn each zone's warp tiles into exits too
  Object.keys(ZONES).forEach(function (id) {
    var z = ZONES[id]; z.exits = z.exits || [];
    (z.warps || []).forEach(function (w) { z.exits.push({ x: w.x, y: w.y, to: w.to }); });
    z.signs = z.signs || []; z.npcs = z.npcs || [];
  });

  function mapW(z) { return z.w || 20; }
  function mapH(z) { return z.h || 15; }
  function tileAt(z, x, y) {
    var w = mapW(z), h = mapH(z);
    if (x < 0 || y < 0 || x >= w || y >= h) return z.interior ? "M" : "T";
    return z.rows[y][x];
  }
  var SOLID = { "T": 1, "~": 1, "R": 1, "F": 1, "H": 1, "w": 1, "S": 1, "r": 1, "M": 1, "C": 1, "K": 1, "L": 1, "=": 0 };
  function solid(ch) { return !!SOLID[ch]; }

  // ---------- overworld scene ------------------------------------------
  var world = {
    zoneId: "lab", zone: null, px: 0, py: 0, ox: 0, oy: 0,
    dir: 1, moving: false, step: 0, stepDur: 0.15, frame: 0, walkToggle: 0,
    banner: 0, t: 0
  };

  function loadZone(id, spawn, faceDir) {
    world.zoneId = id; world.zone = ZONES[id];
    var s = spawn || world.zone.start;
    world.px = s.x; world.py = s.y; world.ox = 0; world.oy = 0;
    world.moving = false; world.step = 0; world.banner = 2.4;
    if (faceDir != null) world.dir = faceDir;
    if (window.EH_STATE && !world.zone.interior) window.EH_STATE.pos = { zone: id, x: world.px, y: world.py };
  }

  // restore the WHOLE party to full HP (returns true if any healing was needed)
  function healParty() {
    var party = window.EH_STATE && window.EH_STATE.party;
    if (!party || !party.length) return false;
    var need = false;
    party.forEach(function (c) { if (c.stats.hp < c.stats.maxhp) need = true; c.stats.hp = c.stats.maxhp; });
    return need;
  }
  // black-out: send the player back to the start of the current era (or frontier)
  function recover() {
    var id = (world.zone && !world.zone.interior) ? world.zoneId : "frontier";
    if (!ZONES[id] || ZONES[id].interior) id = "frontier";
    loadZone(id, ZONES[id].start, 1);
  }

  function exitAt(z, x, y) {
    return (z.exits || []).find(function (e) { return e.x === x && e.y === y; });
  }
  function npcAt(z, x, y) { return (z.npcs || []).find(function (n) { return n.x === x && n.y === y; }); }
  function signAt(z, x, y) { return (z.signs || []).find(function (s) { return s.x === x && s.y === y; }); }

  function tryStep(dir) {
    var dx = dir === 2 ? -1 : dir === 3 ? 1 : 0, dy = dir === 0 ? -1 : dir === 1 ? 1 : 0;
    world.dir = dir;
    var nx = world.px + dx, ny = world.py + dy, z = world.zone;
    if (npcAt(z, nx, ny)) { interact(); return; }
    var ch = tileAt(z, nx, ny);
    if (ch === "S") { interact(); return; }
    if (solid(ch)) return;                                 // bump
    world.moving = true; world.step = 0; world.toX = nx; world.toY = ny;
  }

  function finishStep() {
    world.px = world.toX; world.py = world.toY; world.ox = 0; world.oy = 0; world.moving = false;
    world.walkToggle ^= 1; world.frame = world.walkToggle;
    var z = world.zone;
    if (window.EH_STATE && !z.interior) window.EH_STATE.pos = { zone: world.zoneId, x: world.px, y: world.py };
    var ex = exitAt(z, world.px, world.py);
    if (ex) {
      var tz = ZONES[ex.to.zone];
      var greet = tz && tz.interior && tz.enterText && !tz._seen;
      var healed = tz && tz.heal && healParty();   // halls restore your contract
      loadZone(ex.to.zone, { x: ex.to.x, y: ex.to.y }, z.interior ? 1 : 0);
      if (greet) { tz._seen = true; dialog(tz.enterText); }
      else if (healed) dialog([tz.name + "|Your contract was restored to full health."]);
      return;
    }
    if (tileAt(z, world.px, world.py) === ",") maybeEncounter();
  }

  function interact() {
    var dx = world.dir === 2 ? -1 : world.dir === 3 ? 1 : 0, dy = world.dir === 0 ? -1 : world.dir === 1 ? 1 : 0;
    var z = world.zone, nx = world.px + dx, ny = world.py + dy;
    var n = npcAt(z, nx, ny);
    if (n) { if (n.trainer) startTrainerTalk(n); else dialog(n.text); return; }
    var s = signAt(z, nx, ny);
    if (s) { dialog(s.text); return; }
    if (tileAt(z, nx, ny) === "~") { goFishing(); return; }   // cast into water
  }

  // FISHING: face water + A. A second encounter mode, drawing DEFI/"liquidity"
  // contracts — gives the lake eras a reason to exist beyond decoration.
  function goFishing() {
    dialog(["You cast a line into the liquidity pool..."], function () {
      if (Math.random() < 0.6) {
        var pool = window.EH_DATA.contracts.filter(function (c) { return c.cat === "DEFI" || c.cat === "TOKEN"; });
        if (!pool.length) pool = window.EH_DATA.contracts;
        var c = pool[Math.floor(Math.random() * pool.length)];
        playEncounter(window.EH_CREATURES.make(c, window.EH_CREATURES.wildLevel(world.zoneId, c)));
      } else dialog(["...not even a nibble. Try again later."]);
    });
  }

  // pick a notable real contract of the era for a Historian to battle with
  function pickTrainerContract(zone, useRe) {
    var pool = window.EH_DATA.byZone(zone);
    if (useRe) { var m = pool.filter(function (c) { return useRe.test(c.name); }); if (m.length) return m[Math.floor(Math.random() * m.length)]; }
    var notable = pool.filter(function (c) { return c.rarity === "LEGENDARY" || c.rarity === "EPIC"; });
    var src = notable.length ? notable : (pool.length ? pool : window.EH_DATA.contracts);
    return src[Math.floor(Math.random() * src.length)];
  }
  // Historians fight at a FIXED level near the top of their era's band — a real
  // gate-check you can lose and come back to (not a rubber-band). Constantinople's
  // Prof. Nakamoto is the CHAMPION; beating him rolls the Hall of Fame.
  var TRAINER_LVL = { frontier: 8, homestead: 13, dao: 17, tangerine: 22, spurious: 28, byzantium: 36, constantinople: 44 };
  function startTrainerTalk(n) {
    var tr = n.trainer, zone = world.zoneId;
    var intro = n._met ? [tr.name + "|Ready for another round?"] : tr.intro;
    n._met = true;
    dialog(intro, function () {
      var c = pickTrainerContract(zone, tr.use);
      if (!c) { dialog([tr.name + "|...I've misplaced my contract. Another time!"]); return; }
      var lead = window.EH_STATE.party[window.EH_STATE.active];
      var lvl = TRAINER_LVL[zone] || ((lead ? lead.level : 5) + 2);
      var champion = zone === "constantinople";
      window.EH_BATTLE.startTrainer(window.EH_CREATURES.make(c, lvl, 0), {
        win: tr.win,
        onEnd: function (won) { if (won && champion) hallOfFame(); }
      });
    });
  }

  // ---------- Hall of Fame (the win condition) -------------------------
  function hallOfFame() {
    var caught = window.EH_STATE.collection.map(function (a) { return window.EH_DATA.byAddr(a); }).filter(Boolean);
    caught.sort(function (a, b) { return rarityRank(b) - rarityRank(a); });
    var top = caught.slice(0, 6).map(function (c) { return window.EH_CREATURES.make(c, 50, 0); });
    var t = 0;
    GB.push({
      onPress: function (b) { if (b === GB.BTN.a || b === GB.BTN.b || b === GB.BTN.start) GB.pop(); },
      update: function (dt) { t += dt; },
      render: function () {
        GB.clear("navy");
        GB.rect(0, 0, GB.W, 2, "gold"); GB.rect(0, GB.H - 2, GB.W, 2, "gold");
        GB.textCenter("- HISTORIAN CHAMPION -", GB.W / 2, 7, "gold");
        GB.textCenter("You documented " + window.EH_STATE.collection.length + " contracts", GB.W / 2, 20, "white");
        GB.textCenter("across all seven eras of Ethereum.", GB.W / 2, 30, "white");
        top.forEach(function (cr, i) {
          var cx = 36 + (i % 3) * 78, cy = 46 + ((i / 3) | 0) * 44;
          GB.spriteO(cr.sprite, cx, cy, 2, cr.ramp);
          GB.textCenter(cr.name.slice(0, 11), cx + 16, cy + 34, "white");
        });
        GB.textCenter("Thank you for being a historian!", GB.W / 2, GB.H - 16, "gold");
        if (Math.floor(t * 1.5) % 2 === 0) GB.textCenter("PRESS A", GB.W / 2, GB.H - 7, "white");
      }
    });
  }
  function rarityRank(c) { return ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].indexOf(c.rarity); }

  function maybeEncounter() {
    if (Math.random() >= world.zone.rate) return;
    var wild = null, daily = dailyContract();
    // the Contract of the Day appears ONLY in its own era, until you catch it.
    // Every other encounter comes from THIS era's real contracts (era-accurate;
    // rare legendaries are just weighted scarce within the era pool).
    if (daily && daily.zone === world.zoneId &&
        window.EH_STATE.collection.indexOf(daily.addr) === -1 && Math.random() < 0.14) {
      wild = window.EH_CREATURES.wildByAddr(daily.addr, world.zoneId);
    }
    if (!wild) wild = window.EH_CREATURES.randomForZone(world.zoneId);
    if (wild) playEncounter(wild);
  }
  function playEncounter(wild) {
    var t = 0, DUR = 0.62, FLASH = 7;
    GB.push({
      update: function (dt) { t += dt; if (t >= DUR) { GB.pop(); window.EH_BATTLE.start(wild); } },
      render: function () {
        var phase = Math.floor((t / DUR) * FLASH);
        GB.clear(phase % 2 ? "white" : "ink");
        if (t > DUR * 0.7) { var p = (t - DUR * 0.7) / (DUR * 0.3); var h = Math.ceil(GB.H / 2 * Math.min(1, p)); GB.rect(0, 0, GB.W, h, "ink"); GB.rect(0, GB.H - h, GB.W, h, "ink"); }
      }
    });
  }

  world.enter = function () {
    if (!world.zone) {
      var pos = (window.EH_STATE && window.EH_STATE.pos) || null;
      if (pos && ZONES[pos.zone] && !ZONES[pos.zone].interior) loadZone(pos.zone, { x: pos.x, y: pos.y });
      else loadZone("lab");
    }
  };

  world.onPress = function (b) {
    if (b === GB.BTN.start) { openMenu(); return; }
    if (b === GB.BTN.a && !world.moving) interact();
  };
  world.update = function (dt) {
    world.t += dt;
    if (world.banner > 0) world.banner -= dt;
    if (world.moving) {
      world.step += dt / world.stepDur;
      if (world.step >= 1) finishStep();
      else { var d = world.step * TILE, dx = world.toX - world.px, dy = world.toY - world.py; world.ox = dx * d; world.oy = dy * d; world.frame = world.step > 0.5 ? world.walkToggle : (world.walkToggle ^ 1); }
    }
    if (!world.moving) {
      var b = GB.BTN;
      if (GB.isHeld(b.up)) tryStep(0); else if (GB.isHeld(b.down)) tryStep(1);
      else if (GB.isHeld(b.left)) tryStep(2); else if (GB.isHeld(b.right)) tryStep(3);
    }
  };

  function render() {
    var z = world.zone, t = world.t, mw = mapW(z), mh = mapH(z);
    var ppx = world.px * TILE + world.ox + 8, ppy = world.py * TILE + world.oy + 8;
    var camX = Math.round(ppx - GB.W / 2), camY = Math.round(ppy - GB.H / 2);
    camX = Math.max(0, Math.min(camX, mw * TILE - GB.W));
    camY = Math.max(0, Math.min(camY, mh * TILE - GB.H));
    if (mw * TILE < GB.W) camX = Math.round((mw * TILE - GB.W) / 2);
    if (mh * TILE < GB.H) camY = Math.round((mh * TILE - GB.H) / 2);

    GB.clear(z.interior ? "ink" : "grassDk");
    var tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
    for (var y = ty0; y <= ty0 + VIEW_TY; y++)
      for (var x = tx0; x <= tx0 + VIEW_TX; x++) {
        if (x < 0 || y < 0 || x >= mw || y >= mh) continue;
        drawTile(z, z.rows[y][x], x * TILE - camX, y * TILE - camY, x, y, t);
      }
    // NPCs
    (z.npcs || []).forEach(function (n) {
      var spr = SPRITES[n.spr] || SPRITES.blue;
      drawPerson(spr, n.x * TILE - camX, n.y * TILE - camY, n.dir != null ? n.dir : 1, null);
    });
    // player
    drawPerson(PLAYER, Math.round(ppx - camX - 8), Math.round(ppy - camY - 8), world.dir, world.frame);

    if (world.banner > 0) {
      var label = z.name, bw = Math.max(GB.textWidth(label), z.year ? GB.textWidth(z.year) : 0) + 18;
      GB.boxR((GB.W - bw) / 2, 6, bw, z.year ? 24 : 16);
      GB.textCenter(label, GB.W / 2, 11, "ink");
      if (z.year) GB.textCenter(z.year, GB.W / 2, 21, "dim");
    }
  }
  world.render = function () { render(); };

  // ---------- START menu (DEX / BAG / SAVE / OPTIONS / EXIT) ------------
  function openMenu() {
    var items = ["DEX", "BAG", "SAVE", "OPTIONS", "EXIT"], sel = 0, msg = "", msgT = 0;
    var menu = {
      onPress: function (b) {
        if (b === GB.BTN.up) sel = (sel + items.length - 1) % items.length;
        else if (b === GB.BTN.down) sel = (sel + 1) % items.length;
        else if (b === GB.BTN.b || b === GB.BTN.start) GB.pop();
        else if (b === GB.BTN.a) {
          var it = items[sel];
          if (it === "EXIT") { GB.pop(); if (window.EH_GAME) window.EH_GAME.toTitle(); }
          else if (it === "DEX") { GB.pop(); window.EH_COLLECTION.open(); }
          else if (it === "BAG") { GB.pop(); openBag(); }
          else if (it === "OPTIONS") { GB.pop(); openOptions(); }
          else if (it === "SAVE") { msg = "SAVING..."; msgT = 2; window.EH_SAVE.save().then(function (ok) { msg = ok ? "SAVED TO CLOUD!" : "SAVED ON DEVICE."; msgT = 1.6; }); }
        }
      },
      update: function (dt) { if (msgT > 0) msgT -= dt; },
      render: function () {
        render();
        var w = 92, x = GB.W - w - 4, y = 4, h = 10 + items.length * (GB.GLINE + 1);
        GB.boxR(x, y, w, h);
        for (var i = 0; i < items.length; i++) {
          var ty = y + 7 + i * (GB.GLINE + 1);
          if (i === sel) GB.cursor(x + 6, ty, "red");
          GB.text(items[i], x + 14, ty, "ink");
        }
        if (msgT > 0) { GB.boxR(4, GB.H - 26, GB.W - 8, 22); GB.text(msg, 11, GB.H - 18, "ink"); }
      }
    };
    GB.push(menu);
  }
  // a deterministic daily featured contract (the "Contract of the Day")
  function dailyContract() {
    var pool = window.EH_DATA.contracts; if (!pool.length) return null;
    var d = new Date();
    var key = "eh-daily-" + d.getUTCFullYear() + "-" + d.getUTCMonth() + "-" + d.getUTCDate();
    return pool[GB.hashStr(key) % pool.length];
  }
  function eraCounts() {
    var st = window.EH_STATE, totals = {}, got = {};
    window.EH_DATA.contracts.forEach(function (c) { totals[c.zone] = (totals[c.zone] || 0) + 1; });
    st.collection.forEach(function (a) { var c = window.EH_DATA.byAddr(a); if (c) got[c.zone] = (got[c.zone] || 0) + 1; });
    return { totals: totals, got: got };
  }
  function openBag() {
    var st = window.EH_STATE, ec = eraCounts(), daily = dailyContract();
    function line(z, nm) { return nm + " " + (ec.got[z] || 0) + "/" + (ec.totals[z] || 0); }
    dialog([
      "BAG|ARCHIVE BALLS: unlimited. Each one documents a contract into your Dex.",
      "BAG|DOCUMENTED: " + st.collection.length + " / " + window.EH_DATA.contracts.length + " contracts.  TEAM: " + st.team.length + "/6, led by " + (st.party[st.active] ? st.party[st.active].name : "NONE") + ".",
      "PROGRESS|" + line("frontier", "FRONTIER") + "   " + line("homestead", "HOMESTEAD") + "   " + line("dao", "DAO") + "   " + line("byzantium", "BYZANTIUM"),
      "DAILY|CONTRACT OF THE DAY: " + (daily ? daily.name + " (" + daily.zone.toUpperCase() + "). " + daily.blurb : "loading...") + " Find it in the wild today!"
    ]);
  }
  function openOptions() {
    var items = ["SOUND & MUSIC", "BACK"], sel = 0;
    GB.push({
      onPress: function (b) {
        if (b === GB.BTN.up) sel = (sel + items.length - 1) % items.length;
        else if (b === GB.BTN.down) sel = (sel + 1) % items.length;
        else if (b === GB.BTN.b || b === GB.BTN.start) GB.pop();
        else if (b === GB.BTN.left || b === GB.BTN.right || b === GB.BTN.a) {
          if (sel === 0 && window.EH_AUDIO) window.EH_AUDIO.toggle();
          else if (sel === 1 && b === GB.BTN.a) GB.pop();
        }
      },
      render: function () {
        GB.clear("box");
        GB.rect(0, 0, GB.W, 16, "blue"); GB.rect(0, 16, GB.W, 1, "navy");
        GB.text("OPTIONS", 8, 5, "white");
        var on = window.EH_AUDIO && window.EH_AUDIO.isEnabled();
        for (var i = 0; i < items.length; i++) {
          var y = 44 + i * 18;
          if (i === sel) GB.cursor(20, y, "red");
          GB.text(items[i], 30, y, "ink");
          if (i === 0) GB.text(on ? "ON" : "OFF", 160, y, on ? "hpGreen" : "dim");
        }
        GB.text("A / LEFT-RIGHT: toggle    B: back", 14, GB.H - 24, "dim");
        GB.text("Music is original 8-bit chiptune.", 14, GB.H - 12, "dim");
      }
    });
  }

  window.EH_WORLD = { scene: function () { return world; }, loadZone: loadZone, dialog: dialog, ZONES: ZONES, recover: recover, healParty: healParty };
  window.EH_UI = { dialog: dialog, boxAtBottom: boxAtBottom };
})();
