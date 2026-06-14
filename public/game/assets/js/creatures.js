/* creatures.js - turns a historical contract (data.js) into a battle-able
 * creature: derived stats, a type, a rarity-driven catch difficulty, and a
 * recognizable pixel-art sprite.
 *
 * Sprites are NOT random noise. Each contract CATEGORY has a hand-authored 16x16
 * base "mon" with a clear silhouette (a coin for TOKEN, a gem for NFT, a golem
 * for DAO, a kitty for GAME, a droplet for DEFI, a gear-bot for TOOL, an
 * all-seeing pyramid for PONZI, a ghost for UNKNOWN). Then a deterministic pass
 * keyed off the contract address adds variation - a crest (horns/antenna/ears),
 * an eye style, and rarity sparkles - so every contract looks individual while
 * its TYPE stays instantly readable. Colour comes from a per-TYPE 4-shade ramp.
 *
 * Stat derivation (per the brief):
 *   HP  ← bytecode size       ATK ← tx + ETH      DEF ← age in days
 *   SPD ← code size (nimble)  LVL ← deploy year (2015 = legends)
 */
(function () {
  "use strict";

  var GB = window.GB;

  var TYPES = {
    TOKEN:   { label: "TOKEN",   base: 1 },
    NFT:     { label: "NFT",     base: 2 },
    DAO:     { label: "DAO",     base: 3 },
    GAME:    { label: "GAME",    base: 1 },
    DEFI:    { label: "DEFI",    base: 2 },
    TOOL:    { label: "TOOL",    base: 1 },
    PONZI:   { label: "PONZI",   base: 3 },
    UNKNOWN: { label: "?",       base: 2 }
  };

  var RARITY = {
    COMMON:    { label: "COMMON",    catch: 0.70, stars: 1 },
    UNCOMMON:  { label: "UNCOMMON",  catch: 0.52, stars: 2 },
    RARE:      { label: "RARE",      catch: 0.36, stars: 3 },
    EPIC:      { label: "EPIC",      catch: 0.22, stars: 4 },
    LEGENDARY: { label: "LEGENDARY", catch: 0.10, stars: 5 }
  };

  // Per-TYPE colour ramp: [0]=highlight, [1]=light, [2]=mid, [3]=darkest.
  var TYPE_RAMP = {
    TOKEN:   ["#d8ecff", "#7fb4ec", "#3a6ec8", "#214888"], // blue coin
    NFT:     ["#f3e0ff", "#c48ee8", "#9450c4", "#5a2a80"], // purple gem
    DAO:     ["#eef1f6", "#b4bcce", "#6a7488", "#39425a"], // steel golem
    GAME:    ["#ffe0d2", "#f3906a", "#e0492c", "#8c2418"], // red kitty
    DEFI:    ["#fff0c0", "#f6cf52", "#e09c1e", "#946012"], // gold droplet
    TOOL:    ["#cdf3ec", "#63cdbc", "#23a596", "#0e5a54"], // teal bot
    PONZI:   ["#ffdce8", "#f482ac", "#e03c74", "#841c48"], // pink pyramid
    UNKNOWN: ["#f0ece0", "#c8c0a4", "#8a8064", "#46402c"]  // tan ghost
  };
  function rampFor(c) { return TYPE_RAMP[c.cat] || TYPE_RAMP.UNKNOWN; }

  // ---- base sprite shapes ----------------------------------------------
  // Legend: '.' transparent - 0..3 ramp shades - W white eye - K black pupil/mouth
  var BASE = {
    TOKEN: [ // a round coin/orb with a dark belly emboss and little feet
      "................",
      ".....022220.....",
      "...02211112200..",
      "..022111111220..",
      "..021111111120..",
      ".021111111111200",
      ".0211WK11KW11120",
      ".0211WK11KW11120",
      ".021111KK1111120",
      ".021110330111120",
      ".021110330111120",
      "..0211110011120.",
      "..0221111112200.",
      "...022222222200.",
      "....33....33....",
      "................"
    ],
    NFT: [ // a faceted crystal/gem with an inner sparkle
      "................",
      ".......00.......",
      "......0220......",
      ".....0211200....",
      "....021111200...",
      "...02111111200..",
      "..021W1111W1120.",
      "..021WK11KW1120.",
      ".02111111111120.",
      ".02111KKKK11120.",
      ".021111111111 0.",
      "..0211111111120.",
      "...0211111120...",
      "....02111120....",
      ".....021120.....",
      "......0220......"
    ],
    DAO: [ // a boxy steel golem with stubby arms and legs
      "................",
      "..0..0..0..0....",
      "..02111111120...",
      "..02111111120...",
      ".0211111111120..",
      ".021WW11WW1120..",
      ".021WK11KW1120..",
      ".02111111111200.",
      "0021KKKKKKK1120.",
      "0202111111112020",
      "00021111111120 0",
      "...021111112 0..",
      "...02110331120..",
      "...0211033112 0.",
      "...0220..0220...",
      "..33........33.."
    ],
    GAME: [ // a kitty: pointed ears, wide eyes, whiskers, a curling tail
      "................",
      "..3..........3..",
      "..32........23..",
      "..322......223..",
      "..3221....1223..",
      ".02211111111220.",
      ".021111111111120",
      ".021W111111W1120",
      ".021WK1111KW1120",
      ".021111KK11111 0",
      ".021111111111120",
      "..0211111111120.",
      "..0221111112200.",
      "...0220..0220...",
      "..23........32..",
      "..330........0.."
    ],
    DEFI: [ // a liquid droplet/slime with a glossy highlight
      ".......0........",
      ".......2........",
      "......020.......",
      "......121.......",
      ".....02120......",
      ".....02120......",
      "....0211120.....",
      "...021111120....",
      "..0211WWWW1120..",
      "..021WK11KW120..",
      ".0211111KK11120.",
      ".021111111111 0.",
      ".021111111111120",
      "..0211111111120.",
      "...02211112200..",
      ".....022220....."
    ],
    TOOL: [ // a gear-headed little bot with bolt arms
      "....0.0..0.0....",
      "....0202020.....",
      "...02111111200..",
      "..0211111111200.",
      "..0211WW11WW120.",
      "..021WK11KW1120.",
      "..0211KK111120..",
      "..0211111111120.",
      ".021021111120120",
      "021..0211120..12",
      "021..0211120..12",
      "....021111120...",
      "....02111120....",
      "...0220..0220...",
      "..033......330..",
      "................"
    ],
    PONZI: [ // an all-seeing pyramid: single eye on top, broad triangular base
      ".......0........",
      ".......2........",
      "......0W0.......",
      "......0K0.......",
      ".....021120.....",
      ".....02112 0....",
      "....0211111 0...",
      "....021111120...",
      "...02111111120..",
      "...021111111120.",
      "..02111111111200",
      "..021111111112 0",
      ".0211111111111 0",
      ".021111111111120",
      ".02222222222220.",
      "..333333333333.."
    ],
    UNKNOWN: [ // a wispy ghost-blob with a glitchy lower edge
      "................",
      ".....022220.....",
      "...02211112200..",
      "..0211111111200.",
      "..021W11111W120.",
      ".021WK1111KW1120",
      ".021111111111120",
      ".021111KK1111120",
      ".021133333331120",
      ".021131331311120",
      ".021111111111120",
      ".021111111111120",
      ".021110011001120",
      ".021100110011120",
      "..00..00..00..0.",
      "................"
    ]
  };

  // Crest overlays - drawn over the top of the head for per-contract variety.
  // Anchored near the top-centre. '.' = leave underlying pixel.
  var CRESTS = {
    none: [],
    antenna: [ // a bobble antenna
      "......0K0.......",
      ".......2........",
      ".......2........"
    ],
    horns: [
      "...3.......3....",
      "...23.....32....",
      "....2.....2....."
    ],
    ears: [
      "...00.....00....",
      "...010...010....",
      "....0.....0....."
    ],
    spike: [
      ".......3........",
      "......323.......",
      ".....32123......"
    ]
  };
  var CREST_KEYS = ["none", "antenna", "horns", "ears", "spike", "none"];

  function buildGrid(rows) {
    return rows.map(function (r) {
      r = (r + "................").slice(0, 16);
      return r.split("").map(function (ch) {
        if (ch === ".") return -1;
        if (ch === "W") return "#fbfbff";
        if (ch === "K") return "#15151f";
        var n = parseInt(ch, 10);
        return isNaN(n) ? -1 : n;
      });
    });
  }

  // Compose the final sprite: base shape + a deterministic crest + rarity
  // sparkle accents, all keyed off the address so a contract is always itself.
  function spriteFor(c) {
    var rnd = GB.rng(GB.hashStr(c.addr + "|" + c.cat));
    var base = BASE[c.cat] || BASE.UNKNOWN;
    var grid = buildGrid(base);

    // crest variant
    var crestKey = CREST_KEYS[Math.floor(rnd() * CREST_KEYS.length)];
    var crest = CRESTS[crestKey];
    if (crest && crest.length) {
      var cgrid = buildGrid(crest);
      for (var y = 0; y < cgrid.length; y++)
        for (var x = 0; x < 16; x++)
          if (cgrid[y][x] !== -1) grid[y][x] = cgrid[y][x];
    }

    // rarity sparkles: a few highlight pixels scattered on the body edge
    var stars = (RARITY[c.rarity] || RARITY.COMMON).stars;
    for (var s = 0; s < stars - 1; s++) {
      var sx = 2 + Math.floor(rnd() * 12), sy = 3 + Math.floor(rnd() * 9);
      if (grid[sy] && grid[sy][sx] !== -1 && typeof grid[sy][sx] === "number") grid[sy][sx] = 0;
    }
    return grid;
  }

  // A back sprite (player's own creature, turned away): no eyes, flatter shade.
  function backSpriteFor(c) {
    var g = spriteFor(c);
    return g.map(function (row, y) {
      return row.map(function (v) {
        if (v === -1) return -1;
        if (typeof v === "string") return -1;          // drop eyes/mouth
        return Math.min(3, v + 1);                       // darker, turned away
      });
    });
  }

  // ---- stats & levelling ------------------------------------------------
  // Stats scale with LEVEL (Pokémon-style). Your starter begins at level 5 and
  // grows as it catches contracts; wild contracts are levelled to their era, so
  // the region gets tougher as you travel east. Tuned with battle.js's punchy
  // damage formula for short 2-4 turn fights.
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // each TYPE leans a different way (DAO tanky, DEFI fast, PONZI glassy…)
  var TYPE_BIAS = {
    TOKEN: { hp: 1.05, atk: 1.0, def: 1.0, spd: 1.0 }, NFT: { hp: 1.0, atk: 1.08, def: 0.95, spd: 1.0 },
    DAO: { hp: 1.2, atk: 0.9, def: 1.18, spd: 0.8 }, GAME: { hp: 0.95, atk: 1.12, def: 0.9, spd: 1.18 },
    DEFI: { hp: 1.0, atk: 1.0, def: 0.95, spd: 1.25 }, TOOL: { hp: 1.05, atk: 0.92, def: 1.12, spd: 0.95 },
    PONZI: { hp: 0.85, atk: 1.25, def: 0.82, spd: 1.12 }, UNKNOWN: { hp: 1, atk: 1, def: 1, spd: 1 }
  };
  function statsFor(c, level) {
    level = level || 1;
    var stars = (RARITY[c.rarity] || RARITY.COMMON).stars;   // 1..5
    var size = c.size || 400, b = TYPE_BIAS[c.cat] || TYPE_BIAS.UNKNOWN;
    // a deterministic per-contract "nature": a small ±8% spread per stat, so a
    // creature has individual character without making a level edge unreliable.
    var rnd = GB.rng(GB.hashStr(c.addr + "|nature"));
    function nat() { return 0.92 + rnd() * 0.16; }
    // lower HP base + stronger ATK + level-weighted damage → a level advantage is
    // decisive (an L5 cleanly beats an L3) and fights stay short.
    var hp  = Math.round((10 + level * 2.0 + stars * 1.5 + Math.log2(size + 1) * 0.8) * b.hp * nat());
    var atk = Math.round((6 + level * 1.0 + stars * 1.2) * b.atk * nat());
    var def = Math.round((1 + level * 0.25 + stars * 0.8) * b.def * nat());
    var spd = Math.round((5 + level * 0.8 + stars * 0.5) * b.spd * nat());
    return { hp: hp, maxhp: hp, atk: Math.max(1, atk), def: Math.max(1, def), spd: Math.max(1, spd), lvl: level };
  }

  // ---- type effectiveness (shallow on purpose; some types are scarce) -------
  // ×2 super-effective, ×0.5 resisted, else ×1. EH-flavoured matchups.
  var MATCHUP = {
    TOKEN: { DAO: 2, DEFI: 0.5 }, NFT: { GAME: 2, TOOL: 0.5 }, DAO: { PONZI: 2, TOKEN: 0.5 },
    GAME: { TOOL: 2, NFT: 0.5 }, DEFI: { TOKEN: 2, DAO: 0.5 }, TOOL: { DEFI: 2, GAME: 0.5 },
    PONZI: { NFT: 2, DAO: 0.5 }, UNKNOWN: {}
  };
  function typeMult(att, def) { var m = MATCHUP[att]; return (m && m[def]) || 1; }

  // levelling curve (steeper, so a single lead can't snowball past every era) +
  // XP gain (mutates the creature in place, returns # levels gained)
  function xpToNext(level) { return Math.round(8 + level * level * 1.1); }
  function gainXp(cr, amount) {
    cr.xp = (cr.xp || 0) + Math.max(0, Math.round(amount));
    var gained = 0;
    while (cr.level < 100 && cr.xp >= xpToNext(cr.level)) { cr.xp -= xpToNext(cr.level); cr.level++; gained++; }
    if (gained) {
      var frac = cr.stats.maxhp ? cr.stats.hp / cr.stats.maxhp : 1;
      cr.stats = statsFor(cr.contract, cr.level);
      cr.stats.hp = Math.max(1, Math.round(cr.stats.maxhp * Math.max(frac, 0.5)));
    }
    return gained;
  }

  // wild level by era: early eras low-level, later eras tougher. The level also
  // TRACKS the player's lead (within the era band), so encounters stay beatable —
  // you never get stuck facing only foes you can't dent.
  var ZONE_ORDER = ["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium", "constantinople"];
  var ZONE_LVL = [[3, 7], [7, 12], [11, 16], [15, 21], [19, 27], [25, 35], [33, 45]];
  function zoneIndex(zone) { var i = ZONE_ORDER.indexOf(zone); return i < 0 ? 0 : i; }
  function leadLevel() {
    var p = window.EH_STATE && window.EH_STATE.party && window.EH_STATE.party[0];
    return p ? (p.level || 5) : 5;
  }
  // Wild level is set by the ERA (so the region genuinely gets tougher as you
  // travel east and there's a reason to prepare), with only a small floor nudge
  // off your lead so you're never *totally* outmatched.
  function wildLevel(zone, c) {
    var b = ZONE_LVL[zoneIndex(zone)] || [4, 10];
    var stars = (RARITY[c.rarity] || RARITY.COMMON).stars;
    var lvl = b[0] + Math.floor(Math.random() * (b[1] - b[0] + 1)) + Math.max(0, stars - 2);
    return clamp(lvl, 2, 60);
  }

  // ---- moves: learned as a creature LEVELS UP (last 4 known are usable) ------
  // EH-flavoured: ANALYZE reads it, CRACK breaks its bytecode open, ACQUIRE buys
  // in (and softens it for capture), BURN/REENTER/FORK hit harder.
  // Damage moves (pow>0) and STATUS moves (pow 0, change stat stages). `self`/
  // `foe` adjust the named stage on you / the opponent. crit raises crit chance.
  var MOVELIST = [
    { name: "ANALYZE", lv: 1, pow: 1.0, verb: "analyzed" },
    { name: "CRACK", lv: 5, pow: 1.35, verb: "cracked open" },
    { name: "FRONTRUN", lv: 8, pow: 0, verb: "front-ran", stage: "spd", self: 1, foe: -1, msg: "Speed up, foe slowed!" },
    { name: "ACQUIRE", lv: 11, pow: 1.05, verb: "acquired a stake in", catchBoost: true },
    { name: "BURN", lv: 15, pow: 1.6, verb: "burned" },
    { name: "SNIPE", lv: 19, pow: 0, verb: "took aim at", stage: "crit", self: 2, msg: "Critical-hit chance up!" },
    { name: "RUGPULL", lv: 23, pow: 0.85, verb: "rug-pulled", stage: "atk", foe: -1, msg: "Foe's power fell!" },
    { name: "REENTER", lv: 28, pow: 1.95, verb: "reentered" },
    { name: "FORK", lv: 34, pow: 2.4, verb: "forked" }
  ];
  function movesFor(cr) {
    var lv = cr.level || (cr.stats && cr.stats.lvl) || 1;
    return MOVELIST.filter(function (m) { return m.lv <= lv; }).slice(-4);
  }

  function nameFor(c) {
    if (c.name && c.name.length) return c.name.toUpperCase();
    return (c.addr.slice(0, 6) + ".." + c.addr.slice(-4)).toUpperCase();
  }

  function make(c, level, xp) {
    level = level || 5;
    return {
      contract: c,
      name: nameFor(c),
      type: (TYPES[c.cat] || TYPES.UNKNOWN).label,
      rarity: c.rarity,
      rarityInfo: RARITY[c.rarity] || RARITY.COMMON,
      level: level, xp: xp || 0,
      stats: statsFor(c, level),
      sprite: spriteFor(c),
      back: backSpriteFor(c),
      ramp: rampFor(c),
      link: c.link
    };
  }

  // The encounter pool for a zone is that ERA's real contracts (era-accurate).
  // Only when an era is too thin to be fun (Constantinople, Tangerine) do we
  // borrow from the chronologically-NEAREST eras, so it never jumps to an
  // unrelated decade.
  function poolForZone(zone) {
    var pool = window.EH_DATA.byZone(zone);
    if (pool.length >= 12) return pool;
    var idx = zoneIndex(zone), extra = [];
    for (var d = 1; d <= 6 && pool.length + extra.length < 12; d++) {
      [idx - d, idx + d].forEach(function (j) {
        if (j >= 0 && j < ZONE_ORDER.length) extra = extra.concat(window.EH_DATA.byZone(ZONE_ORDER[j]));
      });
    }
    return pool.concat(extra);
  }
  // Common contracts show up often, rare/legendary ones seldom - so stumbling on
  // The DAO or CryptoPunks in its own era feels special.
  function randomForZone(zone) {
    var pool = poolForZone(zone);
    if (!pool.length) pool = window.EH_DATA.contracts;
    var weighted = [];
    pool.forEach(function (c) {
      var w = 7 - (RARITY[c.rarity] || RARITY.COMMON).stars; // commons ~6, legendaries ~2
      for (var i = 0; i < w; i++) weighted.push(c);
    });
    if (!weighted.length) return null;
    var pick = weighted[Math.floor(Math.random() * weighted.length)];
    return make(pick, wildLevel(zone, pick));
  }

  // A specific contract as a wild encounter (Contract of the Day), at zone level
  function wildByAddr(addr, zone) {
    var c = window.EH_DATA.byAddr(addr);
    return c ? make(c, wildLevel(zone || c.zone, c)) : null;
  }

  window.EH_CREATURES = {
    make: make,
    gainXp: gainXp, xpToNext: xpToNext, wildLevel: wildLevel, movesFor: movesFor, typeMult: typeMult,
    randomForZone: randomForZone,
    wildByAddr: wildByAddr,
    spriteFor: spriteFor,
    rampFor: rampFor,
    TYPE_RAMP: TYPE_RAMP,
    TYPES: TYPES,
    RARITY: RARITY,
    nameFor: nameFor
  };
})();
