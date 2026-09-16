/**
 * levels.js
 * ---------------------------------------------------------------------------
 * Obstacle layouts and the Challenge-mode level table.
 *
 * Two safety rules are enforced for every layout, no matter how it was
 * generated:
 *   1. a corridor around the snake's spawn point is always cleared;
 *   2. the board is flood-filled from the spawn point, and obstacles are
 *      dropped until most of the free space is reachable.
 * That is why a layout can never trap the player or hide the food.
 */
(function (global) {
  'use strict';

  var NS = global.SnakeGame;

  function key(x, y) { return x + ',' + y; }

  /** Small deterministic PRNG so a given level always looks the same. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Where the snake starts: centre of the board, facing right. */
  function spawnPoint(cols, rows) {
    return { x: Math.floor(cols / 2) + 1, y: Math.floor(rows / 2) };
  }

  /** Cells that must stay empty so the snake never spawns inside a wall. */
  function safeZone(cols, rows) {
    var cx = Math.floor(cols / 2);
    var cy = Math.floor(rows / 2);
    var zone = {};
    for (var y = cy - 1; y <= cy + 1; y++) {
      for (var x = cx - 4; x <= cx + 5; x++) {
        if (x >= 0 && x < cols && y >= 0 && y < rows) zone[key(x, y)] = true;
      }
    }
    return zone;
  }

  /* ------------------------------ layouts -------------------------------- */

  var Layouts = {};

  Layouts.none = function () { return []; };

  Layouts.corners = function (cols, rows) {
    var cells = [];
    var arm = Math.max(3, Math.round(Math.min(cols, rows) * 0.22));
    var anchors = [
      { x: 2, y: 2, dx: 1, dy: 1 },
      { x: cols - 3, y: 2, dx: -1, dy: 1 },
      { x: 2, y: rows - 3, dx: 1, dy: -1 },
      { x: cols - 3, y: rows - 3, dx: -1, dy: -1 }
    ];
    anchors.forEach(function (a) {
      for (var i = 0; i < arm; i++) {
        cells.push({ x: a.x + a.dx * i, y: a.y });
        cells.push({ x: a.x, y: a.y + a.dy * i });
      }
    });
    return cells;
  };

  Layouts.blocks = function (cols, rows, rand, scale) {
    var cells = [];
    var zone = safeZone(cols, rows);
    var count = Math.max(3, Math.round(6 * scale));
    for (var i = 0; i < count; i++) {
      for (var attempt = 0; attempt < 20; attempt++) {
        var x = 2 + Math.floor(rand() * (cols - 5));
        var y = 2 + Math.floor(rand() * (rows - 5));
        if (zone[key(x, y)] || zone[key(x + 1, y)] ||
            zone[key(x, y + 1)] || zone[key(x + 1, y + 1)]) continue;
        cells.push({ x: x, y: y }, { x: x + 1, y: y },
                   { x: x, y: y + 1 }, { x: x + 1, y: y + 1 });
        break;
      }
    }
    return cells;
  };

  Layouts.walls = function (cols, rows, rand, scale) {
    var cells = [];
    var xs = [Math.round(cols * 0.28), Math.round(cols * 0.72)];
    var gapSize = Math.max(4, Math.round(7 - scale * 2));
    xs.forEach(function (x) {
      var gapStart = 2 + Math.floor(rand() * Math.max(1, rows - 4 - gapSize));
      for (var y = 2; y < rows - 2; y++) {
        if (y >= gapStart && y < gapStart + gapSize) continue;
        cells.push({ x: x, y: y });
      }
    });
    return cells;
  };

  /** A saltire (diagonal cross) — it leaves the centre plaza open. */
  Layouts.cross = function (cols, rows) {
    var cx = Math.floor(cols / 2);
    var cy = Math.floor(rows / 2);
    var reach = Math.max(6, Math.floor(Math.min(cols, rows) * 0.36));
    var cells = [];
    for (var i = 4; i <= reach; i++) {
      cells.push({ x: cx - i, y: cy - i }, { x: cx + i, y: cy - i },
                 { x: cx - i, y: cy + i }, { x: cx + i, y: cy + i });
    }
    return cells;
  };

  Layouts.rings = function (cols, rows) {
    var cx = Math.floor(cols / 2);
    var cy = Math.floor(rows / 2);
    var r = Math.max(5, Math.floor(Math.min(cols, rows) * 0.28));
    var cells = [];
    for (var d = -r; d <= r; d++) {
      if (Math.abs(d) > 1) {                       // gaps at the middle of each side
        cells.push({ x: cx - r, y: cy + d }, { x: cx + r, y: cy + d });
        cells.push({ x: cx + d, y: cy - r }, { x: cx + d, y: cy + r });
      }
    }
    return cells;
  };

  Layouts.tunnel = function (cols, rows) {
    var cy = Math.floor(rows / 2);
    var cells = [];
    var gap = Math.max(5, Math.round(cols * 0.26));
    var index = 0;
    for (var y = 2; y < rows - 2; y += 4) {
      if (Math.abs(y - cy) < 2) { index++; continue; }
      var openLeft = index % 2 === 0;
      var from = openLeft ? 2 + gap : 2;
      var to = openLeft ? cols - 3 : cols - 3 - gap;
      for (var x = from; x <= to; x++) cells.push({ x: x, y: y });
      index++;
    }
    return cells;
  };

  Layouts.maze = function (cols, rows) {
    var cells = [];
    var column = 0;
    for (var x = 3; x < cols - 2; x += 4) {
      var startY = column % 2 === 0 ? 2 : 5;
      for (var y = startY; y < rows - 3; y += 6) {
        cells.push({ x: x, y: y }, { x: x, y: y + 1 }, { x: x, y: y + 2 });
      }
      column++;
    }
    return cells;
  };

  /* ---------------------------- validation ------------------------------- */

  /** Breadth-first fill from the spawn cell; returns the reachable cell count. */
  function reachableCount(cols, rows, blocked, start) {
    var seen = {};
    var queue = [start];
    var count = 0;
    seen[key(start.x, start.y)] = true;

    while (queue.length) {
      var cell = queue.pop();
      count++;
      var neighbours = [
        { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }
      ];
      for (var i = 0; i < neighbours.length; i++) {
        var n = neighbours[i];
        if (n.x < 0 || n.y < 0 || n.x >= cols || n.y >= rows) continue;
        var k = key(n.x, n.y);
        if (seen[k] || blocked[k]) continue;
        seen[k] = true;
        queue.push(n);
      }
    }
    return count;
  }

  function isPlayable(cols, rows, blockedSet, start, threshold) {
    var blockedCount = Object.keys(blockedSet).length;
    var free = cols * rows - blockedCount;
    if (free <= 10) return false;
    return reachableCount(cols, rows, blockedSet, start) >= free * (threshold || 0.72);
  }

  /**
   * Builds the obstacle list for a layout.
   * @returns {{cells: Array, set: Object}}
   */
  function build(layoutName, cols, rows, seed, scale) {
    var generator = Layouts[layoutName] || Layouts.none;
    var rand = mulberry32(seed || 1);
    var raw = generator(cols, rows, rand, scale === undefined ? 1 : scale) || [];

    var zone = safeZone(cols, rows);
    var start = spawnPoint(cols, rows);
    var set = {};
    var cells = [];

    raw.forEach(function (cell) {
      var x = cell.x, y = cell.y;
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;   // keep inside board
      var k = key(x, y);
      if (zone[k] || set[k]) return;                          // never block the spawn
      set[k] = true;
      cells.push({ x: x, y: y });
    });

    // Drop obstacles until the board is comfortably connected again.
    var guard = 0;
    while (cells.length && !isPlayable(cols, rows, set, start) && guard < 80) {
      var index = Math.floor(rand() * cells.length);
      var removed = cells.splice(index, 1)[0];
      delete set[key(removed.x, removed.y)];
      guard++;
    }

    return { cells: cells, set: set };
  }

  /* ------------------------------ levels --------------------------------- */

  NS.LEVELS = [
    { name: 'Open field', layout: 'none', target: 5 },
    { name: 'Four corners', layout: 'corners', target: 7 },
    { name: 'Scatter', layout: 'blocks', target: 8 },
    { name: 'The gates', layout: 'walls', target: 9 },
    { name: 'Saltire', layout: 'cross', target: 10 },
    { name: 'The ring', layout: 'rings', target: 11 },
    { name: 'Switchback', layout: 'tunnel', target: 12 },
    { name: 'Pillars', layout: 'maze', target: 14 }
  ];

  /** Levels past the table repeat the layouts with bigger targets. */
  function getLevel(number) {
    var list = NS.LEVELS;
    var index = (number - 1) % list.length;
    var cycle = Math.floor((number - 1) / list.length);
    var base = list[index];
    return {
      number: number,
      name: base.name + (cycle ? ' II' : ''),
      layout: base.layout,
      target: base.target + cycle * 3,
      seed: number * 97 + 13,
      scale: 1 + cycle * 0.25
    };
  }

  NS.Levels = {
    build: build,
    getLevel: getLevel,
    spawnPoint: spawnPoint,
    safeZone: safeZone,
    isPlayable: isPlayable,
    key: key,
    random: mulberry32,
    layoutNames: Object.keys(Layouts)
  };

})(window);
