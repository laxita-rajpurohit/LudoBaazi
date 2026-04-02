/**
 * index.js — Ludobaazi WebSocket + HTTP server
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const {
  createRoom,
  createAIGame,
  joinRoom,
  processRoll,
  processMove,
  getRoom,
  handleDisconnect,
} = require('./gameManager');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Socket Events ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // GLOBAL DEBUG: Log EVERY event that reaches the server
  socket.onAny((event, ...args) => {
    console.log(`[DEBUG] Incoming Event: ${event}`, args);
  });

  // Identification (optional mapping, room logic uses params)
  socket.on('identify', (data = {}) => {
    const { viewerId } = data;
    socket.viewerId = viewerId;
    console.log(`[ID] Socket ${socket.id} identified as ${viewerId}`);
  });

  // ── Create Room (Compatibility for both _ and -) ─────────────────────────────
  const onCreateRoom = (data = {}) => {
    const { viewerId } = data;
    const result = createRoom(socket.id, viewerId);
    socket.join(result.code);
    socket.emit('room_created', { code: result.code });
    socket.emit('room-created', { code: result.code }); // Compatibility
    console.log(`[Room] Created: ${result.code} by ${viewerId}`);
  };
  socket.on('create_room', onCreateRoom);
  socket.on('create-room', onCreateRoom);

  // ── Play AI Game ─────────────────────────────────────────────────────────────
  const onPlayAiGame = (data = {}) => {
    const { viewerId } = data;
    const result = createAIGame(socket.id, viewerId);
    const { room } = result;
    socket.join(room.code);
    
    // Alert the user that the game has started
    const gs = room.gameState;
    const payload = { gameState: gs };
    socket.emit('game_start', payload);
    socket.emit('game-start', payload);
    
    console.log(`[Game] ${room.code} — AI Game started for ${viewerId}`);
    checkAITurn(room.code);
  };
  socket.on('play_ai_game', onPlayAiGame);
  socket.on('play-ai-game', onPlayAiGame);

  // ── Join Room (Compatibility for both _ and -) ───────────────────────────────
  const onJoinRoom = (data = {}) => {
    const { code, viewerId } = data;
    const result = joinRoom(code, socket.id, viewerId);
    if (!result.success) {
      socket.emit('join_error', { message: result.message });
      socket.emit('join-error', { message: result.message }); // Compatibility
      return;
    }

    const { room, isRejoin, isGameStarted } = result;
    socket.join(code);
    
    if (isGameStarted) {
      // User Requirement: When players.length === 2, emit "game_start" event to the room
      const gs = room.gameState;
      io.to(code).emit('game_start', gs);
      io.to(code).emit('game-start', gs);
      console.log(`[Game] ${code} — Game state synced for room`);
    } else if (room.status === 'playing' && isRejoin) {
      // Catch up the rejoined player
      const gs = room.gameState;
      socket.emit('game_start', gs);
      socket.emit('game-start', gs);
    }
  };
  socket.on('join_room', onJoinRoom);
  socket.on('join-room', onJoinRoom);

  // ── AI Helper Loop ───────────────────────────────────────────────────────────
  const checkAITurn = (code) => {
    const room = getRoom(code);
    if (!room || !room.isAI || room.status !== 'playing') return;
    
    const gs = room.gameState;
    if (gs.currentTurn === 1) { // AI is Player 2 (index 1)
      // It's the AI's turn! Think for a second...
      if (!gs.diceRolled) {
        setTimeout(() => {
          const result = processRoll(code, 'CPU');
          if (result.success) {
            const { diceValue, validMoves, autoPass, state } = result;
            const payload = { diceValue, validMoves, autoPass, gameState: state };
            io.to(code).emit('dice_rolled', payload);
            io.to(code).emit('dice-rolled', payload);
            
            // If they can't move, their turn auto-passes, check if they get another turn or P1's turn
            if (autoPass) {
              setTimeout(() => {
                 // Broadcast state update to sync currentTurn change completely
                 io.to(code).emit('game_updated', { gameState: state });
                 io.to(code).emit('game-updated', { gameState: state });
                 checkAITurn(code); 
              }, 500);
            } else {
              // They have valid moves, trigger move selection
              checkAITurn(code);
            }
          }
        }, 1500); // 1.5s thinking time for dice roll
      } else {
        // Dice is rolled, need to select a token
        setTimeout(() => {
          const validMoves = gs.validMoves;
          if (validMoves.length > 0) {
            // Pick a random token from validMoves
            const selectedToken = validMoves[Math.floor(Math.random() * validMoves.length)];
            const result = processMove(code, 'CPU', selectedToken);
            if (result.success) {
              const payload = { gameState: result.state };
              io.to(code).emit('game_updated', payload);
              io.to(code).emit('game-updated', payload);
              
              if (result.state.status === 'finished') {
                const gameOverPayload = { winnerIndex: result.state.winner, winnerColor: result.state.players[result.state.winner].color };
                io.to(code).emit('game_over', gameOverPayload);
              } else {
                checkAITurn(code);
              }
            }
          }
        }, 1000); // 1s thinking time for move making
      }
    }
  };

  // ── Roll Dice (Compatibility for both _ and -) ───────────────────────────────
  const onRollDice = (data = {}) => {
    const { code } = data;
    const result = processRoll(code, socket.id);
    if (!result.success) {
      socket.emit('action_error', { message: result.message });
      return;
    }

    const { diceValue, validMoves, autoPass, state } = result;
    const payload = {
      diceValue,
      validMoves,
      autoPass,
      gameState: state,
    };

    io.to(code).emit('dice_rolled', payload);
    io.to(code).emit('dice-rolled', payload); // Compatibility
    console.log(`[Dice] Room ${code} — rolled ${diceValue}`);
    
    if (autoPass) {
       // If player auto-passed, we must sync state to show AI Turn
       setTimeout(() => {
         io.to(code).emit('game_updated', { gameState: state });
         io.to(code).emit('game-updated', { gameState: state });
         checkAITurn(code);
       }, 500);
    }
  };
  socket.on('roll_dice', onRollDice);
  socket.on('roll-dice', onRollDice);

  // ── Move Token (Compatibility for both _ and -) ──────────────────────────────
  const onMoveToken = (data = {}) => {
    const { code, tokenId } = data;
    const result = processMove(code, socket.id, tokenId);
    if (!result.success) {
      socket.emit('action_error', { message: result.message });
      return;
    }

    const { state } = result;
    const payload = { gameState: state };

    io.to(code).emit('game_updated', payload);
    io.to(code).emit('game-updated', payload); // Compatibility

    if (state.status === 'finished') {
      const gameOverPayload = {
        winnerIndex: state.winner,
        winnerColor: state.players[state.winner].color,
      };
      io.to(code).emit('game_over', gameOverPayload);
      io.to(code).emit('game-over', gameOverPayload);
      console.log(`[Win] Room ${code} — Winner: Player ${state.winner + 1}`);
    } else {
      checkAITurn(code);
    }
  };
  socket.on('move_token', onMoveToken);
  socket.on('move-token', onMoveToken);

  // ── Leave Room ───────────────────────────────────────────────────────────────
  const onLeaveRoom = (data = {}) => {
    const { code } = data;
    socket.leave(code);
    console.log(`[Room] ${code} — Player left: ${socket.id}`);
    io.to(code).emit('player_disconnected', { message: 'Opponent left the room.' });
  };
  socket.on('leave_room', onLeaveRoom);
  socket.on('leave-room', onLeaveRoom);

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const result = handleDisconnect(socket.id);
    if (result) {
      console.log(`[-] Disconnected: ${socket.id} (Room: ${result.code})`);
    }
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎲 Ludobaazi server running at http://localhost:${PORT}\n`);
});
