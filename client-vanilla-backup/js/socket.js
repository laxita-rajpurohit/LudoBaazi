/**
 * socket.js — Ludobaazi WebSocket Client
 */

const socket = io();

let currentRoom = null;
let myPlayerIndex = null;
let myColor = null;

// Persistence: Viewer ID survives refreshes
let viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
if (!viewerId) {
  viewerId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  sessionStorage.setItem('LUDO_VIEWER_ID', viewerId);
}

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  socket.emit('identify', { viewerId });
});

// ─── Actions ──────────────────────────────────────────────────────────────────

function createRoom() { socket.emit('create_room', { viewerId }); }
function playAiGame() { socket.emit('play_ai_game', { viewerId }); }
function joinRoom(code) { socket.emit('join_room', { code: code.trim().toUpperCase(), viewerId }); }
function rollDice() { if (currentRoom) socket.emit('roll_dice', { code: currentRoom }); }
function moveToken(tokenId) { if (currentRoom) socket.emit('move_token', { code: currentRoom, tokenId }); }
function leaveRoom() { window.location.href = '/'; }

// ─── Listeners ────────────────────────────────────────────────────────────────

socket.on('room_created', ({ code }) => {
  currentRoom = code;
  if (window.Home) window.Home.onRoomCreated(code);
});

socket.on('game_start', (gs) => {
  console.log('[Game] Start:', gs);
  currentRoom = gs.gameId;
  
  // Find my index
  const me = gs.players.find(p => p.id === socket.id || p.viewerId === viewerId);
  if (me) {
    myPlayerIndex = gs.players.indexOf(me);
    myColor = me.color;
  }

  // UI Transition
  document.getElementById('view-home').classList.add('hidden');
  document.getElementById('view-game').classList.remove('hidden');
  document.getElementById('topbar-room-code').textContent = currentRoom;

  UI.init();
  LudoBoard.initBoard();
  updateGameState(gs);
});

socket.on('dice_rolled', ({ diceValue, validMoves, autoPass, gameState }) => {
  UI.animateDice(diceValue, () => {
    updateGameState(gameState, validMoves);
  });
});

socket.on('game_updated', ({ gameState }) => {
  updateGameState(gameState);
});

socket.on('game_over', ({ winnerIndex, winnerColor }) => {
  UI.showWinner(winnerIndex, winnerColor);
});

socket.on('join_error', ({ message }) => {
  if (window.Home) window.Home.showError(message);
});

// ─── State Management ─────────────────────────────────────────────────────────

function updateGameState(gs, validMoves = []) {
  if (typeof LudoBoard !== 'undefined') {
    LudoBoard.renderGameState(gs, myPlayerIndex, myColor, validMoves);
  }
  if (typeof UI !== 'undefined') {
    UI.updateTurnIndicator(gs, myPlayerIndex);
  }
}

window.GameSocket = { createRoom, playAiGame, joinRoom, rollDice, moveToken, leaveRoom };
