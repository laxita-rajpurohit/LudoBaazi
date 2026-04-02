console.log('WebSocket Client Ready');
/**
 * socket.js — Ludobaazi WebSocket Client
 */

const socket = io();
console.log('Ludobaazi: Socket initialized', socket);

let currentRoom = null;
let myPlayerIndex = null;
let myColor = null;

// Persistence: Viewer ID survives refreshes, but unique per tab for testing
let viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
if (!viewerId) {
  viewerId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  sessionStorage.setItem('LUDO_VIEWER_ID', viewerId);
}

// Handle connection
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
  // Always identify ourselves to the server
  socket.emit('identify', { viewerId });
});

// ─── Actions ──────────────────────────────────────────────────────────────────

function createRoom() {
  socket.emit('create_room', { viewerId });
}

function playAiGame() {
  socket.emit('play_ai_game', { viewerId });
}

function joinRoom(code) {
  const cleanCode = code.trim().toUpperCase();
  socket.emit('join_room', { code: cleanCode, viewerId });
}

function rollDice() {
  if (currentRoom) {
    socket.emit('roll_dice', { code: currentRoom, viewerId });
    UI.setDiceRolling(true);
  }
}

function moveToken(tokenId) {
  if (currentRoom) {
    socket.emit('move_token', { code: currentRoom, tokenId, viewerId });
  }
}

function leaveRoom() {
  if (currentRoom) {
    socket.emit('leave_room', { code: currentRoom, viewerId });
  }
  currentRoom = null;
  localStorage.removeItem('LUDO_CURRENT_ROOM');
  
  // Return to home view
  const viewHome = document.getElementById('view-home');
  const viewGame = document.getElementById('view-game');
  if (viewHome) viewHome.classList.remove('hidden');
  if (viewGame) viewGame.classList.add('hidden');
  
  if (window.Home) {
    // reset UI if needed
    const roomCodeBox = document.getElementById('room-code-box');
    const btnCreate = document.getElementById('btn-create-room');
    if (roomCodeBox) roomCodeBox.classList.remove('visible');
    if (btnCreate) {
      btnCreate.classList.remove('hidden');
      btnCreate.innerHTML = '<span>✦</span> Create Room';
      btnCreate.disabled = false;
    }
  }
}

// ─── Listeners ────────────────────────────────────────────────────────────────

socket.on('room_created', ({ code }) => {
  currentRoom = code;
  localStorage.setItem('LUDO_CURRENT_ROOM', code);
  if (window.Home) {
    window.Home.onRoomCreated(code);
  }
});

socket.on('game_start', (gameState) => {
  // gameState might be nested if emitted differently, standard handle:
  const gs = gameState.gameState || gameState;
  console.log(' Ludobaazi: Game starting...', gs);
  currentRoom = gs.roomCode;
  localStorage.setItem('LUDO_CURRENT_ROOM', currentRoom);

  // Determine my player index and color
  const me = gs.players.find(p => p.viewerId === viewerId);
  if (me) {
    myPlayerIndex = me.playerIndex;
    myColor = me.color;
  } else {
    console.error("Player identity not found in game state!");
  }
  
  // SPA View Toggle: Hide Home, Show Game
  const viewHome = document.getElementById('view-home');
  const viewGame = document.getElementById('view-game');
  
  if (viewHome) viewHome.classList.add('hidden');
  if (viewGame) viewGame.classList.remove('hidden');
  
  // Initialization: Ensure scripts are executed
  console.log('Ludobaazi: Game starting...', gs);
  
  UI.init();
  LudoBoard.initBoard();
  updateGameState(gs);
  
  const roomCodeEl = document.getElementById('topbar-room-code');
  if (roomCodeEl) roomCodeEl.textContent = currentRoom;
});

socket.on('dice_rolled', ({ diceValue, validMoves, autoPass, gameState }) => {
  if (typeof UI === 'undefined') return;
  UI.animateDice(diceValue, () => {
    updateGameState(gameState, validMoves);
    if (autoPass) {
      console.log('No valid moves, auto-passing turn');
    }
  });
});

socket.on('game_updated', ({ gameState }) => {
  const gs = gameState.gameState || gameState;
  updateGameState(gs);
});

socket.on('game_over', ({ winnerIndex, winnerColor }) => {
  UI.showWinner(winnerIndex, winnerColor);
  localStorage.removeItem('LUDO_CURRENT_ROOM');
});

socket.on('join_error', ({ message }) => {
  // If we tried to auto-sync but failed, clear the storage
  if (message.includes('not found')) {
     localStorage.removeItem('LUDO_CURRENT_ROOM');
  }
  if (window.Home) {
    window.Home.showError(message);
  }
});

socket.on('action_error', ({ message }) => {
  console.error('Action error:', message);
});

socket.on('player_disconnected', ({ message }) => {
  UI.showDisconnect();
  localStorage.removeItem('LUDO_CURRENT_ROOM');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updateGameState(gameState, validMoves = []) {
  const isMyTurn = gameState.currentTurn === myPlayerIndex;
  const movesToShow = isMyTurn ? validMoves : [];
  
  if (typeof LudoBoard !== 'undefined') {
    LudoBoard.renderGameState(gameState, myPlayerIndex, myColor, movesToShow);
  }
  if (typeof UI !== 'undefined') {
    UI.updateTurnIndicator(gameState, isMyTurn);
    
    const canRoll = isMyTurn && !gameState.diceRolled && gameState.status === 'playing';
    UI.setRollButtonEnabled(canRoll);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
window.GameSocket = {
  createRoom,
  playAiGame,
  joinRoom,
  rollDice,
  moveToken,
  leaveRoom
};
