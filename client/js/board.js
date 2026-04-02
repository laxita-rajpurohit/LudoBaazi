console.log('Ludo Board Ready');
/**
 * board.js — Ludobaazi Ludo Board Renderer
 *
 * Renders the 15×15 grid and places tokens based on server game state.
 * Uses a coordinate map derived from the standard Ludo path.
 */

// ─── Board Cell Definitions ────────────────────────────────────────────────────
// Standard Ludo 15×15 grid coordinate system (col, row) 1-indexed
// We'll define which cells are which zone, then lay out the path.

const BOARD_SIZE = 15;

// Home zone corners (col-start, row-start) for each color — 6×6 blocks
const HOME_ZONES = {
  red:    { cols: [1,6],   rows: [1,6]   },
  green:  { cols: [10,15], rows: [1,6]   },
  yellow: { cols: [1,6],   rows: [10,15] },
  blue:   { cols: [10,15], rows: [10,15] },
};

// Inner yard circles (2×2 inside the 6×6 home) — centered at these cells
const YARD_CENTERS = {
  red:    [[3,3]],
  green:  [[13,3]],
  yellow: [[3,13]],
  blue:   [[13,13]],
};

// Path cells — the 52-step main ring (col, row) starting from Green entry (step=0)
// Standard Ludo path, going counter-clockwise:
// Green enters at (10,6) going down, Red enters at (6,10) going right
// We define the full 52-cell path as (col, row) pairs
const MAIN_PATH = [
  // Steps 0-5: Green entry column going down (right side, col 10)
  [10,6],[10,7],[10,8],[10,9],[10,10],[10,11],
  // Steps 6-11: Bottom-right corner going left (row 10)
  [9,10],[8,10],[7,10],[6,10],[5,10],[4,10],
  // Wait — let me use the canonical Ludo path properly
  // Actually let me redefine using standard Ludo path coordinates
];

// Standard Ludo path — canonical 52 cells (1-indexed col, row)
// Starting from Green's entry point (step 0) and going clockwise
const PATH_CELLS = (function() {
  // Row/col arrays for each segment of the standard path
  // The board looks like this with 15x15:
  //  - Rows 7 is the middle horizontal path
  //  - Col 8 is the middle vertical path
  //  - Each colored zone occupies a 6x6 corner

  const path = [];

  // Segment A: col 10, rows 6 down to 2 (green home stretch entry area reversed → main path going up left side)
  // Let me use a well-known coordinate layout for 15×15 Ludo:

  // TOP section (rows 1-6):
  //   Red yard: cols 1-6, rows 1-6
  //   Path:     cols 7-9, rows 1-6  (3 wide)
  //   Green yard: cols 10-15, rows 1-6
  // MIDDLE section (rows 7-9):
  //   Path all across (15 wide, 3 tall)
  // BOTTOM section (rows 10-15):
  //   Yellow yard: cols 1-6, rows 10-15
  //   Path:     cols 7-9, rows 10-15
  //   Blue yard:  cols 10-15, rows 10-15

  // Main path (52 cells), GREEN starts at step 0 = entry cell
  // Going clockwise from green entry:
  // Green entry: col 10, row 7

  // Top-right segment (going up): col 9, rows 7→2 (cols 9, rows 7 to 2: step 0-5)
  for (let r = 7; r >= 2; r--) path.push([9, r]);     // 6 cells (steps 0-5)
  // Top row going left: row 1, cols 8→2 (step 6-11)
  for (let c = 8; c >= 2; c--) path.push([c, 1]);      // but row 1 top cells
  // Hmm this is getting complex without a known fixed array. Let me use explicit coordinates.

  return path;
})();

// Define the canonical path as an explicit array of [col, row]
// This is the standard 52-cell Ludo path for a 15×15 board,
// starting with Green's entry (step 0) going clockwise.
const CANONICAL_PATH = [
  // ── Going Up (Green entry going into path from right-mid) ──
  [10,7],[10,8],[10,9],[9,10],[8,10],[7,10],          // 0-5:  going left (bottom of green zone)
  [6,10],[6,11],[6,12],[6,13],[6,14],[6,15],            // -- wrong, let's use a completely different approach
];

// ──────────────────────────────────────────────────────────────────────────────
// DEFINITIVE PATH — Explicit 52-cell array [col, row] for 15×15 grid
// Step 0 = Green's board entry point. They enter and travel clockwise.
// Red enters at step 26 (diametrically opposite).
// ──────────────────────────────────────────────────────────────────────────────
const LUDO_PATH = [
//  col row   // step
  [ 1, 7],   // 0  — red entry
  [ 2, 7],   // 1
  [ 3, 7],   // 2
  [ 4, 7],   // 3
  [ 5, 7],   // 4
  [ 6, 6],   // 5
  [ 6, 5],   // 6
  [ 6, 4],   // 7
  [ 6, 3],   // 8
  [ 6, 2],   // 9
  [ 6, 1],   // 10
  [ 7, 1],   // 11
  [ 8, 1],   // 12
  [ 9, 1],   // 13
  [ 9, 2],   // 14
  [ 9, 3],   // 15
  [ 9, 4],   // 16
  [ 9, 5],   // 17
  [ 9, 6],   // 18
  [10, 7],   // 19
  [11, 7],   // 20
  [12, 7],   // 21
  [13, 7],   // 22
  [14, 7],   // 23
  [15, 7],   // 24
  [15, 8],   // 25
  [15, 9],   // 26  — green entry
  [14, 9],   // 27
  [13, 9],   // 28
  [12, 9],   // 29
  [11, 9],   // 30
  [10, 9],   // 31
  [ 9,10],   // 32
  [ 9,11],   // 33
  [ 9,12],   // 34
  [ 9,13],   // 35
  [ 9,14],   // 36
  [ 9,15],   // 37
  [ 8,15],   // 38
  [ 7,15],   // 39
  [ 6,14],   // 40
  [ 6,13],   // 41
  [ 6,12],   // 42
  [ 6,11],   // 43
  [ 6,10],   // 44
  [ 5, 9],   // 45
  [ 4, 9],   // 46
  [ 3, 9],   // 47
  [ 2, 9],   // 48
  [ 1, 9],   // 49
  [ 1, 8],   // 50
  [ 1, 7],   // 51 → wraps to 0
];

// Home stretch cells: 5 cells leading to center home
// [col, row] for each step in the home stretch (steps 52-56, index 0-4)
const HOME_STRETCH = {
  red:    [[2,8],[3,8],[4,8],[5,8],[6,8]],   // Red goes right toward center
  green:  [[14,8],[13,8],[12,8],[11,8],[10,8]], // Green goes left toward center (actually let me reconsider path direction)
};

// ─── Entry points (which step index on LUDO_PATH each color enters at)
const ENTRY_STEP = { red: 0, green: 26 };

// Center home cell (col 8, row 8)
const CENTER_HOME = [8, 8];

// Safe cells (step indices in LUDO_PATH)
const SAFE_STEPS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Yard positions for tokens in the yard ─────────────────────────────────────
// Each color has a central yard area; we place tokens in a 2×2 sub-grid
const YARD_TOKEN_CELLS = {
  red:    [[2,2],[4,2],[2,4],[4,4]],
  green:  [[11,2],[13,2],[11,4],[13,4]],
  yellow: [[2,11],[4,11],[2,13],[4,13]],
  blue:   [[11,11],[13,11],[11,13],[13,13]],
};

// ─── Build a cell key ── 
function key(col, row) { return `${col},${row}`; }

// ─── Classify each cell ────────────────────────────────────────────────────────
function buildCellMap() {
  const map = {};
  for (let r = 1; r <= 15; r++) {
    for (let c = 1; c <= 15; c++) {
      let type = 'path';
      let classes = ['cell'];

      // Classify into zones
      if (c >= 1  && c <= 6  && r >= 1  && r <= 6)  { type = 'zone'; classes.push('zone-red'); }
      if (c >= 10 && c <= 15 && r >= 1  && r <= 6)  { type = 'zone'; classes.push('zone-green'); }
      if (c >= 1  && c <= 6  && r >= 10 && r <= 15) { type = 'zone'; classes.push('zone-yellow'); }
      if (c >= 10 && c <= 15 && r >= 10 && r <= 15) { type = 'zone'; classes.push('zone-blue'); }

      // Inner yard (2×2 sub-squares inside each 6×6 home)
      if ((c === 2||c===3||c===4||c===5) && (r===2||r===3||r===4||r===5)) { type='yard-inner'; classes=['cell','yard-inner-red']; }
      if ((c===11||c===12||c===13||c===14) && (r===2||r===3||r===4||r===5)) { type='yard-inner'; classes=['cell','yard-inner-green']; }
      if ((c===2||c===3||c===4||c===5) && (r===11||r===12||r===13||r===14)) { type='yard-inner'; classes=['cell','yard-inner-yellow']; }
      if ((c===11||c===12||c===13||c===14) && (r===11||r===12||r===13||r===14)) { type='yard-inner'; classes=['cell','yard-inner-blue']; }

      // Center 3×3
      if (c >= 7 && c <= 9 && r >= 7 && r <= 9) {
        type = 'center';
        classes = ['cell'];
        if (c===7&&r===7) classes.push('center-nw');
        else if (c===9&&r===7) classes.push('center-ne');
        else if (c===7&&r===9) classes.push('center-sw');
        else if (c===9&&r===9) classes.push('center-se');
        else if (c===8&&r===8) classes.push('center-mid');
        else classes.push('center-home');
      }

      // Path cells (middle corridors)
      if (
        (c >= 7 && c <= 9 && (r < 7 || r > 9)) ||   // vertical corridors
        (r >= 7 && r <= 9 && (c < 7 || c > 9))        // horizontal corridors
      ) {
        type = 'path';
        classes = ['cell', 'path'];
      }

      map[key(c, r)] = { col: c, row: r, type, classes: [...new Set(classes)] };
    }
  }

  // Mark safe path cells
  for (const stepIdx of SAFE_STEPS) {
    const [c, r] = LUDO_PATH[stepIdx];
    if (map[key(c,r)]) map[key(c,r)].classes.push('safe');
  }

  // Mark home stretch cells
  HOME_STRETCH.red.forEach(([c,r]) => {
    if (map[key(c,r)]) { map[key(c,r)].classes = ['cell','home-stretch-red']; }
  });
  HOME_STRETCH.green.forEach(([c,r]) => {
    if (map[key(c,r)]) { map[key(c,r)].classes = ['cell','home-stretch-green']; }
  });

  // Colored entry cells
  const [rc, rr] = LUDO_PATH[ENTRY_STEP.red];
  if (map[key(rc,rr)]) map[key(rc,rr)].classes.push('path-red','safe');
  const [gc, gr] = LUDO_PATH[ENTRY_STEP.green];
  if (map[key(gc,gr)]) map[key(gc,gr)].classes.push('path-green','safe');

  return map;
}

// ─── Exported Board State ──────────────────────────────────────────────────────
let boardCells = null;
let cellElements = {};   // key → DOM element
let currentGameState = null;
let myPlayerIndex = null;
let myColor = null;

// ─── Initialize Board ──────────────────────────────────────────────────────────
function initBoard() {
  const boardEl = document.getElementById('ludo-board');
  boardEl.innerHTML = '';
  cellElements = {};
  boardCells = buildCellMap();

  for (let r = 1; r <= BOARD_SIZE; r++) {
    for (let c = 1; c <= BOARD_SIZE; c++) {
      const k = key(c, r);
      const cell = boardCells[k];
      const el = document.createElement('div');
      el.className = cell.classes.join(' ');
      el.dataset.col = c;
      el.dataset.row = r;
      el.id = `cell-${c}-${r}`;
      boardEl.appendChild(el);
      cellElements[k] = el;
    }
  }
}

// ─── Render Game State ─────────────────────────────────────────────────────────
function renderGameState(gameState, playerIndex, playerColor, validMoves) {
  currentGameState = gameState;
  myPlayerIndex = playerIndex;
  myColor = playerColor;

  // Clear all tokens from cells
  Object.values(cellElements).forEach(el => {
    Array.from(el.querySelectorAll('.token')).forEach(t => t.remove());
    el.classList.remove('highlight-valid');
  });

  // Render tokens for both colors
  ['green', 'red'].forEach(color => {
    const tokens = gameState.tokens[color];
    tokens.forEach((token, idx) => {
      renderToken(token, color, idx, validMoves || []);
    });
  });

  // Update home counts
  ['green', 'red'].forEach(color => {
    const count = gameState.tokens[color].filter(t => t.isHome).length;
    const el = document.getElementById(`home-count-${color}`);
    if (el) el.textContent = `${count} / 4`;
  });
}

// ─── Render a single token ─────────────────────────────────────────────────────
function renderToken(token, color, idx, validMoves) {
  const isClickable = validMoves.includes(token.id);

  const tokenEl = document.createElement('div');
  tokenEl.className = `token ${color}-token`;
  tokenEl.dataset.tokenId = token.id;
  tokenEl.title = `${color} token ${idx + 1}`;

  if (token.isHome) {
    // Place token in center home cell
    const [hc, hr] = CENTER_HOME;
    const cellEl = cellElements[key(hc, hr)];
    if (cellEl) {
      const existing = cellEl.querySelectorAll(`.${color}-token`).length;
      tokenEl.style.width = '18%';
      tokenEl.style.height = '18%';
      // offset based on count
      const offsets = [[-6,-6],[6,-6],[-6,6],[6,6]];
      const [ox,oy] = offsets[existing] || [0,0];
      tokenEl.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
      cellEl.appendChild(tokenEl);
    }
    return;
  }

  if (token.steps < 0) {
    // Token in yard
    const yardCells = YARD_TOKEN_CELLS[color];
    const [yc, yr] = yardCells[idx];
    const cellEl = cellElements[key(yc, yr)];
    if (cellEl) {
      tokenEl.classList.add('in-yard', `yard-token-${idx}`);
      if (isClickable) {
        tokenEl.classList.add('clickable');
        tokenEl.style.cursor = 'pointer';
        tokenEl.addEventListener('click', () => onTokenClick(token.id));
      }
      cellEl.appendChild(tokenEl);
    }
    return;
  }

  // Token on main path or home stretch
  let cellKey = null;

  if (token.steps >= 52) {
    // Home stretch
    const stretchIdx = token.steps - 52; // 0-4
    const stretch = HOME_STRETCH[color];
    if (stretch && stretch[stretchIdx]) {
      const [sc, sr] = stretch[stretchIdx];
      cellKey = key(sc, sr);
    }
  } else {
    // Main path — calculate absolute cell
    const entry = ENTRY_STEP[color];
    const absStep = (entry + token.steps) % 52;
    const [pc, pr] = LUDO_PATH[absStep];
    cellKey = key(pc, pr);
  }

  if (cellKey && cellElements[cellKey]) {
    const cellEl = cellElements[cellKey];
    if (isClickable) {
      tokenEl.classList.add('clickable');
      tokenEl.addEventListener('click', () => onTokenClick(token.id));
      cellEl.classList.add('highlight-valid');
    }
    cellEl.appendChild(tokenEl);
  }
}

// ─── Token Click Handler ───────────────────────────────────────────────────────
let onTokenClickCallback = null;
function onTokenClick(tokenId) {
  if (onTokenClickCallback) onTokenClickCallback(tokenId);
}
function setTokenClickCallback(fn) {
  onTokenClickCallback = fn;
}

// ─── Exports ───────────────────────────────────────────────────────────────────
window.LudoBoard = {
  initBoard,
  renderGameState,
  setTokenClickCallback,
  LUDO_PATH,
  HOME_STRETCH,
  ENTRY_STEP,
};
