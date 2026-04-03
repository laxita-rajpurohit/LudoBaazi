/**
 * gameManager.js — Room registry and lifecycle management
 * Orchestrates rooms and connects them to the GameEngine.
 */

const GameEngine = require('./gameEngine');

const rooms = new Map(); // roomCode → room object

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = ['blue', 'red', 'green', 'yellow'];

// ─── Generate Room Code ────────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.get(code) ? generateCode() : code;
}

/**
 * Create a new room for a multiplayer game
 */
function createRoom(socketId, viewerId) {
  const code = generateCode();
  const room = {
    code,
    players: [{ id: socketId, viewerId, playerIndex: 0, color: COLORS[0] }],
    gameState: null,
    status: 'waiting',
    isAI: false
  };
  rooms.set(code, room);
  return { success: true, code };
}

/**
 * Create a single-player game against AI
 */
function createAIGame(socketId, viewerId) {
  const code = 'AI_' + generateCode().substring(0, 4);
  const players = [
    { id: socketId, viewerId, playerIndex: 0, color: COLORS[0] },
    { id: 'CPU', viewerId: 'CPU_VIEWER', playerIndex: 1, color: COLORS[1] }
  ];
  const room = {
    code,
    players,
    gameState: GameEngine.createGame(code, players),
    status: 'playing',
    isAI: true
  };
  rooms.set(code, room);
  return { success: true, room };
}

/**
 * Join an existing room
 */
function joinRoom(code, socketId, viewerId) {
  const room = rooms.get(code);
  if (!room) return { success: false, message: 'Room not found.' };

  // Re-connection Logic
  const existingPlayer = room.players.find(p => p.viewerId === viewerId);
  if (existingPlayer) {
    existingPlayer.id = socketId;
    console.log(`[Room] ${code} — Player re-joined: ${viewerId}`);
    return { success: true, room, isRejoin: true };
  }

  // New Join Logic
  if (room.status !== 'waiting') return { success: false, message: 'Game in progress.' };
  if (room.players.length >= 4) return { success: false, message: 'Room full.' };

  const playerIndex = room.players.length;
  room.players.push({
    id: socketId,
    viewerId,
    playerIndex,
    color: COLORS[playerIndex]
  });

  console.log(`[Join] ${viewerId} joined room ${code}`);

  let isGameStarted = false;
  if (room.players.length === 2) { // Auto-start for 2 players, but wait for more if desired? Prompt says 2-player for now.
    room.status = 'playing';
    room.gameState = GameEngine.createGame(code, room.players);
    isGameStarted = true;
    console.log(`[Game] ${code} — Started`);
  }

  return { success: true, room, isRejoin: false, isGameStarted };
}

/**
 * Process a dice roll action
 */
function processRoll(code, socketId) {
  const room = rooms.get(code);
  if (!room || !room.gameState) return { success: false, message: 'Game not found.' };

  const gs = room.gameState;
  if (gs.status !== 'playing') return { success: false, message: 'Game not active.' };

  const player = gs.players[gs.currentTurn];
  if (player.id !== socketId) return { success: false, message: 'Not your turn.' };
  if (gs.diceRolled) return { success: false, message: 'Dice already rolled.' };

  const diceValue = GameEngine.rollDice(gs);
  gs.diceValue = diceValue;
  gs.diceRolled = true;

  const validMoves = GameEngine.getValidMoves(gs, diceValue);
  
  let autoPass = false;
  if (validMoves.length === 0) {
    // If no moves and not a 6, pass turn
    if (diceValue !== 6) {
      gs.currentTurn = (gs.currentTurn + 1) % gs.players.length;
    }
    gs.diceValue = null;
    gs.diceRolled = false;
    autoPass = true;
  }

  console.log(`[Dice] ${code} — ${player.color} rolled ${diceValue}`);
  return { success: true, diceValue, validMoves, autoPass, state: gs };
}

/**
 * Process a token movement action
 */
function processMove(code, socketId, tokenId) {
  const room = rooms.get(code);
  if (!room || !room.gameState) return { success: false, message: 'Game not found.' };

  const gs = room.gameState;
  const player = gs.players[gs.currentTurn];
  if (player.id !== socketId) return { success: false, message: 'Not your turn.' };
  if (!gs.diceRolled) return { success: false, message: 'Roll first.' };

  const isValid = GameEngine.isValidMove(gs, tokenId, gs.diceValue);
  if (!isValid) return { success: false, message: 'Invalid move selection.' };

  const { extraTurn, logMessage } = GameEngine.applyMove(gs, tokenId, gs.diceValue);
  
  console.log(`[Move] ${code} — ${logMessage}`);
  return { success: true, state: gs, extraTurn };
}

function getRoom(code) {
  return rooms.get(code);
}

function handleDisconnect(socketId) {
  for (const [code, room] of rooms.entries()) {
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      console.log(`[Room] ${code} — Disconnect: ${player.viewerId}`);
      return { code, room, player };
    }
  }
  return null;
}

module.exports = { createRoom, createAIGame, joinRoom, processRoll, processMove, getRoom, handleDisconnect };
