/**
 * board.js — Ludo King Edition Board Renderer
 */

const BOARD_SIZE = 15;
const TOTAL_CELLS = 52;
const TOTAL_STEPS = 57;

/**
 * Ludo King Standard Safe Cells
 */
const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/**
 * Full Board Path Mapping (Pre-calculated Clockwise)
 */
const CLOCKWISE_PATH = [
  /* 0 - 4  */ [9, 14], [9, 13], [9, 12], [9, 11], [9, 10], 
  /* 5 - 10 */ [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9],
  /* 11     */ [15, 8], 
  /* 12 - 17*/ [15, 7], [14, 7], [13, 7], [12, 7], [11, 7], [10, 7],
  /* 18 - 23*/ [9, 6], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1],
  /* 24     */ [8, 1], 
  /* 25 - 30*/ [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  /* 31 - 36*/ [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
  /* 37     */ [1, 8], 
  /* 38 - 43*/ [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9],
  /* 44 - 49*/ [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15],
  /* 50 - 51*/ [8, 15], [9, 15] 
];

// Aligned with P1 (Blue) at index 0 (Start is [15, 7])
const ALIGNED_PATH = [];
for (let i = 0; i < 52; i++) {
    ALIGNED_PATH.push(CLOCKWISE_PATH[(i + 12) % 52]);
}

const HOME_STRETCH = {
    blue:   [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8]],
    red:    [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6]],
    green:  [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
    yellow: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10]]
};

const CENTER_HOME = [8, 8];

const YARD_CELLS = {
    blue:   [[11, 11], [13, 11], [11, 13], [13, 13]],
    red:    [[11, 2], [13, 2], [11, 4], [13, 4]],
    green:  [[2, 2], [4, 2], [2, 4], [4, 4]],
    yellow: [[2, 11], [4, 11], [2, 13], [4, 13]]
};

function key(c, r) { return `${c},${r}`; }

function buildCellMap() {
    const map = {};
    for (let r = 1; r <= 15; r++) {
        for (let c = 1; c <= 15; c++) {
            const k = key(c, r);
            let classes = ['cell'];
            
            // Zones (Quadrants)
            if (c >= 1 && c <= 6 && r >= 1 && r <= 6) classes.push('zone-green');
            else if (c >= 10 && c <= 15 && r >= 1 && r <= 6) classes.push('zone-red');
            else if (c >= 1 && c <= 6 && r >= 10 && r <= 15) classes.push('zone-yellow');
            else if (c >= 10 && c <= 15 && r >= 10 && r <= 15) classes.push('zone-blue');

            // Paths
            if ((c >= 7 && c <= 9) || (r >= 7 && r <= 9)) classes.push('path-cell');

            // Center area
            if (c >= 7 && c <= 9 && r >= 7 && r <= 9) {
                classes.push('home-center');
                if (c === 8 && r === 8) classes.push('finish');
            }

            map[k] = { c, r, classes };
        }
    }

    // Mark Safe Cells
    SAFE_CELLS.forEach(idx => {
        const [c, r] = ALIGNED_PATH[idx];
        const k = key(c, r);
        if (map[k]) map[k].classes.push('safe-cell');
    });

    // Mark Home Stretches
    Object.keys(HOME_STRETCH).forEach(color => {
        HOME_STRETCH[color].forEach(([c, r]) => {
            const k = key(c, r);
            if (map[k]) map[k].classes.push(`home-stretch-${color}`);
        });
    });

    return map;
}

let cellElements = {};

function initBoard() {
    const boardEl = document.getElementById('ludo-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    cellElements = {};
    const map = buildCellMap();

    for (let r = 1; r <= 15; r++) {
        for (let c = 1; c <= 15; c++) {
            const k = key(c, r);
            const el = document.createElement('div');
            el.className = map[k].classes.join(' ');
            el.id = `cell-${c}-${r}`;
            boardEl.appendChild(el);
            cellElements[k] = el;
        }
    }
}

function renderGameState(gameState, playerIndex, playerColor, validMoves) {
    if (Object.keys(cellElements).length === 0) initBoard();

    // Clear and redraw
    Object.values(cellElements).forEach(el => {
        el.querySelectorAll('.token').forEach(t => t.remove());
        el.classList.remove('can-move');
        el.classList.remove('stacked');
    });

    gameState.players.forEach((player, pIdx) => {
        const color = player.color;
        const tokensByCell = {};

        player.tokens.forEach((token, tIdx) => {
            let cellKey = null;
            if (token.state === 'BASE') {
                const [c, r] = YARD_CELLS[color][tIdx];
                cellKey = key(c, r);
            } else if (token.state === 'HOME') {
                cellKey = key(...CENTER_HOME);
            } else {
                if (token.stepsMoved > 51) {
                    const idx = token.stepsMoved - 52;
                    const coords = HOME_STRETCH[color][idx];
                    if (coords) cellKey = key(...coords);
                } else {
                    const absIdx = (player.startIndex + token.stepsMoved - 1) % 52;
                    const [c, r] = ALIGNED_PATH[absIdx];
                    cellKey = key(c, r);
                }
            }

            if (!tokensByCell[cellKey]) tokensByCell[cellKey] = [];
            tokensByCell[cellKey].push({ token, color });
        });

        for (const [cellKey, tokens] of Object.entries(tokensByCell)) {
            const cellEl = cellElements[cellKey];
            if (!cellEl) continue;

            if (tokens.length > 1) cellEl.classList.add('stacked');

            tokens.forEach(({ token, color }) => {
                const tokenEl = document.createElement('div');
                tokenEl.className = `token token-${color}`;
                
                if (validMoves && validMoves.includes(token.id)) {
                    tokenEl.classList.add('clickable');
                    cellEl.classList.add('can-move');
                    tokenEl.onclick = (e) => {
                        e.stopPropagation();
                        window.GameSocket.moveToken(token.id);
                    };
                }
                cellEl.appendChild(tokenEl);
            });
        }
    });

    // Dispatch update to UI for stats
    if (window.UI) window.UI.updateTurnIndicator(gameState, playerIndex);
}

window.LudoBoard = { initBoard, renderGameState };
