/**
 * gameLogic.js — Server-side Ludo game rules engine
 * ALL game logic lives here. Clients NEVER control state.
 */

// ─── Board Path ────────────────────────────────────────────────────────────────
// Standard Ludo board: 52 main path cells (0–51)
// Each color has its own "home stretch" of 5 cells (52–56 per color offset)
// Position -1 = token is in the yard (not yet on board)
// Position 57 = token is HOME (finished)

// Safe cells on the main path (0-indexed)
const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const ENTRY_CELL = { red: 0, green: 13, yellow: 26, blue: 39 };

const COLOR_INDEX = { red: 0, green: 1, yellow: 2, blue: 3 };

// How far from entry to reach the home stretch entrance
// Green: entry=0, home stretch starts after cell 51 (full lap), then cells 52-56
// Red:   entry=26, home stretch starts after cell 25 (full lap from 26)
// We use a "relative distance" model: each token tracks steps from 0 to 57
//   steps 0 = entered board
//   steps 1–51 = on main path
//   steps 52–56 = on home stretch
//   steps 57 = home!
const TOTAL_STEPS = 57;
const HOME_STRETCH_START = 52;

// Map relative step → absolute board cell for rendering
// green entry = 0 on main path
// red entry = 26 on main path
const MAIN_PATH_SIZE = 52;

function relativeToAbsolute(colorName, step) {
  if (step < 0) return null; // in yard
  if (step >= TOTAL_STEPS) return { type: 'home' };
  if (step >= HOME_STRETCH_START) {
    // home stretch cell
    return { type: 'homeStretch', color: colorName, index: step - HOME_STRETCH_START };
  }
  const entry = ENTRY_CELL[colorName];
  const absCell = (entry + step) % MAIN_PATH_SIZE;
  return { type: 'main', cell: absCell };
}

// ─── Dice ──────────────────────────────────────────────────────────────────────
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// ─── Valid Moves ───────────────────────────────────────────────────────────────
function getValidMoves(gameState, playerIndex, diceValue) {
  const colorName = gameState.players[playerIndex].color;
  const tokens = gameState.tokens[colorName];
  const validTokenIds = [];

  for (const token of tokens) {
    if (token.isHome) continue; // already finished

    if (token.steps < 0) {
      // Token is in yard — can only move out on 6
      if (diceValue === 6) {
        validTokenIds.push(token.id);
      }
    } else {
      // Token is on board
      const newSteps = token.steps + diceValue;
      if (newSteps <= TOTAL_STEPS) {
        // Valid move (can't overshoot home)
        validTokenIds.push(token.id);
      }
    }
  }

  return validTokenIds;
}

// ─── Move Token ────────────────────────────────────────────────────────────────
function moveToken(gameState, playerIndex, tokenId, diceValue) {
  const state = JSON.parse(JSON.stringify(gameState)); // deep clone
  const colorName = state.players[playerIndex].color;
  const tokens = state.tokens[colorName];
  const token = tokens.find(t => t.id === tokenId);

  if (!token) return { state, message: 'Invalid token', extraTurn: false };

  let extraTurn = diceValue === 6;
  let killedSomeone = false;

  if (token.steps < 0) {
    // Move out of yard
    if (diceValue !== 6) return { state, message: 'Need 6 to exit yard', extraTurn: false };
    token.steps = 0;
  } else {
    token.steps += diceValue;
  }

  // Check if token reached home
  if (token.steps >= TOTAL_STEPS) {
    token.steps = TOTAL_STEPS;
    token.isHome = true;
  }

  // Check collisions (only on main path)
  if (token.steps < HOME_STRETCH_START && token.steps >= 0 && !token.isHome) {
    const pos = relativeToAbsolute(colorName, token.steps);
    if (pos && pos.type === 'main' && !SAFE_CELLS.has(pos.cell)) {
      // Check if any opponent token is on this cell
      const opponentColor = colorName === 'green' ? 'red' : 'green';
      const opponentTokens = state.tokens[opponentColor];
      for (const opp of opponentTokens) {
        if (opp.isHome || opp.steps < 0) continue;
        if (opp.steps >= HOME_STRETCH_START) continue; // in home stretch, safe
        const oppPos = relativeToAbsolute(opponentColor, opp.steps);
        if (oppPos && oppPos.type === 'main' && oppPos.cell === pos.cell) {
          // Kill! Send back to yard
          opp.steps = -1;
          killedSomeone = true;
          extraTurn = true; // extra turn for killing
        }
      }
    }
  }

  // Check win condition
  const allHome = state.tokens[colorName].every(t => t.isHome);
  if (allHome) {
    state.status = 'finished';
    state.winner = playerIndex;
  }

  // Advance turn (unless extra turn)
  if (!extraTurn && state.status !== 'finished') {
    state.currentTurn = (state.currentTurn + 1) % 2;
  }

  state.diceValue = null;
  state.diceRolled = false;
  state.validMoves = [];

  return { state, message: killedSomeone ? 'Token killed! Extra turn.' : 'Move applied', extraTurn };
}

// ─── Handle Dice Roll ──────────────────────────────────────────────────────────
function handleDiceRoll(gameState, playerIndex) {
  const state = JSON.parse(JSON.stringify(gameState));
  const diceValue = rollDice();
  const validMoves = getValidMoves(state, playerIndex, diceValue);

  state.diceValue = diceValue;
  state.diceRolled = true;
  state.validMoves = validMoves;

  // If no valid moves, automatically pass to next player (unless it was a 6)
  let autoPass = false;
  if (validMoves.length === 0) {
    if (diceValue !== 6) {
      state.currentTurn = (state.currentTurn + 1) % 2;
    }
    // On 6 with no moves, still no extra turn
    state.diceValue = null;
    state.diceRolled = false;
    autoPass = true;
  }

  return { state, diceValue, validMoves, autoPass };
}

// ─── Init Game State ───────────────────────────────────────────────────────────
function createInitialState(roomCode, players) {
  const tokens = {};
  
  players.forEach((p, idx) => {
    const color = p.color;
    tokens[color] = [
      { id: `${color.charAt(0)}0`, steps: -1, isHome: false },
      { id: `${color.charAt(0)}1`, steps: -1, isHome: false },
      { id: `${color.charAt(0)}2`, steps: -1, isHome: false },
      { id: `${color.charAt(0)}3`, steps: -1, isHome: false },
    ];
  });

  return {
    roomCode,
    players, // [{ id, playerIndex, color }]
    tokens,
    currentTurn: 0, // index into players[]
    diceValue: null,
    diceRolled: false,
    validMoves: [],
    status: 'playing',
    winner: null,
  };
}

module.exports = {
  rollDice,
  getValidMoves,
  moveToken,
  handleDiceRoll,
  createInitialState,
  relativeToAbsolute,
  SAFE_CELLS,
  ENTRY_CELL,
  HOME_STRETCH_START,
  TOTAL_STEPS,
  MAIN_PATH_SIZE,
};
