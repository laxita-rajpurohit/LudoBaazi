console.log('Ludo Board Ready');

// ─── Constants ────────────────────────────────────────────────────────────────
const BOARD_SIZE = 15;
const MAIN_PATH_SIZE = 52;

// Steps considered "safe" (tokens cannot be killed here)
const SAFE_STEPS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Path Coordinates ─────────────────────────────────────────────────────────
// Definitive 52-cell clockwise path for 15x15 board.
// Green entry (Step 0) is [15, 7]. Red entry (Step 26) is [1, 9].
const LUDO_PATH = [
  // Green entry quadrant (Right -> Bottom)
  [15,7], [15,8], [15,9], [14,9], [13,9], [12,9], [11,9], [10,9],
  [9,10], [9,11], [9,12], [9,13], [9,14], [9,15], [8,15], [7,15],
  // Red side quadrant (Bottom -> Left)
  [6,15], [6,14], [6,13], [6,12], [6,11], [6,10], [5,9], [4,9], [3,9], [2,9],
  [1,9], [1,8], [1,7], [2,7], [3,7], [4,7], [5,7], [6,7],
  // Top quadrant (Left -> Top)
  [7,6], [7,5], [7,4], [7,3], [7,2], [7,1], [8,1], [9,1],
  [10,1], [10,2], [10,3], [10,4], [10,5], [10,6], [11,7], [12,7], [13,7], [14,7]
];

const HOME_STRETCH = {
  green: [[14,8],[13,8],[12,8],[11,8],[10,8]], // Mid-right row going left
  red:   [[2,8],[3,8],[4,8],[5,8],[6,8]],     // Mid-left row going right
};

const ENTRY_STEP = { green: 0, red: 26 };
const CENTER_HOME = [8, 8];

const YARD_TOKEN_CELLS = {
  green: [[11,2],[13,2],[11,4],[13,4]],   // Top-Right
  red:   [[2,11],[4,11],[2,13],[4,13]],    // Bottom-Left
  yellow: [[2,2],[4,2],[2,4],[4,4]],      // Top-Left
  blue:   [[11,11],[13,11],[11,13],[13,13]], // Bottom-Right
};

function key(col, row) { return `${col},${row}`; }

// ─── Classify each cell ────────────────────────────────────────────────────────
function buildCellMap() {
  const map = {};
  for (let r = 1; r <= 15; r++) {
    for (let c = 1; c <= 15; c++) {
      let classes = ['cell'];
      let type = 'path';
      const k = key(c, r);

      // 1. Zones (6x6 corners)
      if (c >= 1 && c <= 6 && r >= 1 && r <= 6) classes.push('zone-red');
      else if (c >= 10 && c <= 15 && r >= 1 && r <= 6) classes.push('zone-green');
      else if (c >= 1 && c <= 6 && r >= 10 && r <= 15) classes.push('zone-yellow');
      else if (c >= 10 && c <= 15 && r >= 10 && r <= 15) classes.push('zone-blue');

      // 2. Yards (2x2 sub-grids)
      if (((c==2||c==3||c==4||c==5)) && ((r==2||r==3||r==4||r==5))) classes.push('yard-inner-red');
      if (((c==11||c==12||c==13||c==14)) && ((r==2||r==3||r==4||r==5))) classes.push('yard-inner-green');
      if (((c==2||c==3||c==4||c==5)) && ((r==11||r==12||r==13||r==14))) classes.push('yard-inner-yellow');
      if (((c==11||c==12||c==13||c==14)) && ((r==11||r==12||r==13||r==14))) classes.push('yard-inner-blue');

      // 3. Center Cross
      if (c >= 7 && c <= 9 && r >= 7 && r <= 9) {
        if (c==8 && r==8) classes.push('center-mid');
        else classes.push('center-home');
      }

      // 4. Corridors
      if ((c >= 7 && c <= 9 && (r < 7 || r > 9)) || (r >= 7 && r <= 9 && (c < 7 || c > 9))) {
        classes.push('path');
      }

      map[k] = { col: c, row: r, classes };
    }
  }

  // Modifiers
  SAFE_STEPS.forEach(idx => {
    const [c, r] = LUDO_PATH[idx];
    if (map[key(c,r)]) map[key(c,r)].classes.push('safe');
  });

  HOME_STRETCH.red.forEach(([c,r]) => { if (map[key(c,r)]) map[key(c,r)].classes.push('home-stretch-red'); });
  HOME_STRETCH.green.forEach(([c,r]) => { if (map[key(c,r)]) map[key(c,r)].classes.push('home-stretch-green'); });

  const [gc, gr] = LUDO_PATH[ENTRY_STEP.green]; if (map[key(gc,gr)]) map[key(gc,gr)].classes.push('path-green');
  const [rc, rr] = LUDO_PATH[ENTRY_STEP.red]; if (map[key(rc,rr)]) map[key(rc,rr)].classes.push('path-red');

  return map;
}

let boardCells = null;
let cellElements = {};

function initBoard() {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;
  
  boardEl.innerHTML = '';
  cellElements = {};
  boardCells = buildCellMap();

  for (let r = 1; r <= 15; r++) {
    for (let c = 1; c <= 15; c++) {
      const k = key(c, r);
      const cellData = boardCells[k];
      const el = document.createElement('div');
      el.className = [...new Set(cellData.classes)].join(' ');
      el.id = `cell-${c}-${r}`;
      boardEl.appendChild(el);
      cellElements[k] = el;
    }
  }
}

function renderGameState(gameState, playerIndex, playerColor, validMoves) {
  if (!cellElements || Object.keys(cellElements).length === 0) initBoard();

  // Clear 
  Object.values(cellElements).forEach(el => {
    Array.from(el.querySelectorAll('.token')).forEach(t => t.remove());
    el.classList.remove('highlight-valid');
  });

  // Render tokens
  ['green', 'red'].forEach(color => {
    const tokens = gameState.tokens[color];
    tokens.forEach((token, idx) => {
      let cellKey = null;
      if (token.isHome) {
        cellKey = key(...CENTER_HOME);
      } else if (token.steps < 0) {
        const [yc, yr] = YARD_TOKEN_CELLS[color][idx];
        cellKey = key(yc, yr);
      } else if (token.steps >= 52) {
        const [hc, hr] = HOME_STRETCH[color][token.steps - 52];
        cellKey = key(hc, hr);
      } else {
        const absIdx = (ENTRY_STEP[color] + token.steps) % 52;
        const [pc, pr] = LUDO_PATH[absIdx];
        cellKey = key(pc, pr);
      }

      const cellEl = cellElements[cellKey];
      if (cellEl) {
        const tokenEl = document.createElement('div');
        tokenEl.className = `token token-${color}`;
        if (validMoves && validMoves.includes(token.id)) {
          tokenEl.classList.add('clickable');
          tokenEl.onclick = () => window.GameSocket.moveToken(token.id);
          cellEl.classList.add('highlight-valid');
        }
        cellEl.appendChild(tokenEl);
      }
    });
  });

  // Home counts
  ['green', 'red'].forEach(color => {
    const el = document.getElementById(`home-count-${color}`);
    if (el) el.textContent = `${gameState.tokens[color].filter(t => t.isHome).length} / 4`;
  });
}

window.LudoBoard = {
  initBoard,
  renderGameState,
  setTokenClickCallback: (cb) => { /* legacy fallback */ }
};
