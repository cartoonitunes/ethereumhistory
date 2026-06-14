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

  // ---- stats ------------------------------------------------------------
  // Tuned (with battle.js's damage formula) for SHORT, punchy fights - a wild
  // contract goes down in ~2-4 hits, so encounters are quick learning beats and
  // not slogs. Stats derive from real fields: bytecode size, deploy year, rarity.
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function statsFor(c) {
    var stars = (RARITY[c.rarity] || RARITY.COMMON).stars;   // 1..5
    var size = c.size || 400;
    var hp  = clamp(Math.round(18 + size / 130 + stars * 4), 16, 66);
    var atk = clamp(Math.round(12 + size / 600 + stars * 3), 10, 38);
    var def = clamp(Math.round(3 + stars * 2), 3, 14);
    var spd = clamp(Math.round(44 - size / 320 + stars * 3), 8, 60);
    var lvl = clamp(Math.round(56 - (c.year - 2015) * 6 + stars * 2), 5, 60);
    return { hp: hp, maxhp: hp, atk: atk, def: def, spd: spd, lvl: lvl };
  }

  function nameFor(c) {
    if (c.name && c.name.length) return c.name.toUpperCase();
    return (c.addr.slice(0, 6) + ".." + c.addr.slice(-4)).toUpperCase();
  }

  function make(c) {
    var s = statsFor(c);
    return {
      contract: c,
      name: nameFor(c),
      type: (TYPES[c.cat] || TYPES.UNKNOWN).label,
      rarity: c.rarity,
      rarityInfo: RARITY[c.rarity] || RARITY.COMMON,
      stats: s,
      sprite: spriteFor(c),
      back: backSpriteFor(c),
      ramp: rampFor(c),
      link: c.link
    };
  }

  // Pick a wild contract for an era zone. Common contracts show up often, the
  // rare/legendary ones seldom - so stumbling on The DAO or CryptoPunks feels
  // special. Thin eras (e.g. Tangerine, Constantinople) borrow from the whole
  // set so there's always variety to find.
  function randomForZone(zone) {
    var pool = window.EH_DATA.byZone(zone);
    if (pool.length < 8) {
      var extra = window.EH_DATA.contracts.filter(function (c) { return c.zone !== zone; });
      pool = pool.concat(extra);
    }
    if (!pool.length) pool = window.EH_DATA.contracts;
    var weighted = [];
    pool.forEach(function (c) {
      var stars = (RARITY[c.rarity] || RARITY.COMMON).stars;   // 1..5
      var w = 7 - stars;                                       // commons weigh ~6, legendaries ~2
      for (var i = 0; i < w; i++) weighted.push(c);
    });
    if (!weighted.length) return null;
    return make(weighted[Math.floor(Math.random() * weighted.length)]);
  }

  // A specific contract as a wild encounter (Contract of the Day / legendary hunt)
  function wildByAddr(addr) {
    var c = window.EH_DATA.byAddr(addr);
    return c ? make(c) : null;
  }

  window.EH_CREATURES = {
    make: make,
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
