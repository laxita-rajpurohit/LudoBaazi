/**
 * gameManager.js — Room registry and lifecycle management
 */

const { createInitialState, handleDiceRoll, moveToken, getValidMoves } = require('./gameLogic');

const rooms = new Map(); // roomCode → room object

// ─── Generate Room Code ────────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.get(code) ? generateCode() : code;
}

function createRoom(socketId, viewerId) {
  const code = generateCode();
  const room = {
    code,
    players: [{ id: socketId, viewerId, playerIndex: 0, color: 'green' }],
    gameState: null,
    status: 'waiting',
    isAI: false
  };
  rooms.set(code, room);
  return { success: true, code };
}

// ─── Create AI Game ────────────────────────────────────────────────────────────
function createAIGame(socketId, viewerId) {
  const code = 'AI_' + generateCode().substring(0, 4);
  const room = {
    code,
    players: [
      { id: socketId, viewerId, playerIndex: 0, color: 'green' },
      { id: 'CPU', viewerId: 'CPU_VIEWER', playerIndex: 1, color: 'red' }
    ],
    gameState: null,
    status: 'playing',
    isAI: true
  };
  room.gameState = createInitialState(code, room.players);
  room.gameState.isAI = true; // Flag for frontend UI
  rooms.set(code, room);
  return { success: true, room };
}

// ─── Join Room ─────────────────────────────────────────────────────────────────
function joinRoom(code, socketId, viewerId) {
  const room = rooms.get(code);
  if (!room) return { success: false, message: 'Room not found.' };

  // Check if player is already in this room (Re-connection)
  const existingPlayer = room.players.find(p => p.viewerId === viewerId);
  if (existingPlayer) {
    existingPlayer.id = socketId; // Update to latest socket ID
    console.log(`[Room] ${code} — Player re-connected: ${viewerId}`);
    return { success: true, room, isRejoin: true };
  }

  // New player joining
  if (room.status !== 'waiting') return { success: false, message: 'Game already in progress.' };
  if (room.players.length >= 2) return { success: false, message: 'Room is full.' };

  room.players.push({ id: socketId, viewerId, playerIndex: 1, color: 'red' });
  
  // Mandatory exact logs
  console.log(`Player joined room: ${code}`);
  console.log(`Total players in room: ${room.players.length}`);

  let isGameStarted = false;
  if (room.players.length === 2) {
    room.status = 'playing';
    room.gameState = createInitialState(code, room.players);
    // Explicit colors set in player assignment (already done: 0=green, 1=red)
    isGameStarted = true;
    console.log(`[Game] ${code} — Game started`);
  }

  return { success: true, room, isRejoin: false, isGameStarted };
}

// ─── Process Dice Roll ─────────────────────────────────────────────────────────
function processRoll(code, socketId) {
  const room = rooms.get(code);
  if (!room || !room.gameState) return { success: false, message: 'Room not found.' };

  const gs = room.gameState;
  if (gs.status !== 'playing') return { success: false, message: 'Game over.' };

  const player = gs.players[gs.currentTurn];
  if (player.id !== socketId) return { success: false, message: 'Not your turn.' };
  if (gs.diceRolled) return { success: false, message: 'Already rolled.' };

  const result = handleDiceRoll(gs, gs.currentTurn);
  room.gameState = result.state;

  return { success: true, ...result };
}

// ─── Process Move ──────────────────────────────────────────────────────────────
function processMove(code, socketId, tokenId) {
  const room = rooms.get(code);
  if (!room || !room.gameState) return { success: false, message: 'Room not found.' };

  const gs = room.gameState;
  if (gs.status !== 'playing') return { success: false, message: 'Game over.' };

  const player = gs.players[gs.currentTurn];
  if (player.id !== socketId) return { success: false, message: 'Not your turn.' };
  if (!gs.diceRolled) return { success: false, message: 'Roll dice first.' };
  if (!gs.validMoves.includes(tokenId)) return { success: false, message: 'Invalid move.' };

  const result = moveToken(gs, gs.currentTurn, tokenId, gs.diceValue);
  room.gameState = result.state;

  return { success: true, ...result };
}

// ─── Get Room ──────────────────────────────────────────────────────────────────
function getRoom(code) {
  return rooms.get(code);
}

// ─── Handle Disconnect ─────────────────────────────────────────────────────────
function handleDisconnect(socketId) {
  // We don't remove players anymore, we just let them disconnect.
  // Their viewerId remains in the room for re-connection.
  for (const [code, room] of rooms.entries()) {
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      console.log(`[Room] ${code} — Player disconnected (waiting for reconnect): ${player.viewerId}`);
      return { code, room, player };
    }
  }
  return null;
}

module.exports = { createRoom, createAIGame, joinRoom, processRoll, processMove, getRoom, handleDisconnect };
