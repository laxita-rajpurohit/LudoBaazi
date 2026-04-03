/**
 * index.js — Ludobaazi WebSocket + HTTP server
 * Production-grade Game Engine Integration
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const GameEngine = require('./gameEngine');
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

const roomTimers = new Map(); // code -> { timeout }


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Socket Events ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Identification
  socket.on('identify', (data = {}) => {
    const { viewerId } = data;
    socket.viewerId = viewerId;
    console.log(`[ID] Socket ${socket.id} identified as ${viewerId}`);
  });

  // ── Create Room ─────────────────────────────────────────────────────────────
  const onCreateRoom = (data = {}) => {
    const { viewerId, preferredColor } = data;
    const result = createRoom(socket.id, viewerId, preferredColor);
    socket.join(result.code);
    socket.emit('room_created', { code: result.code });
  };
  socket.on('create_room', onCreateRoom);
  socket.on('create-room', onCreateRoom);

  // ── Play AI Game ─────────────────────────────────────────────────────────────
  const onPlayAiGame = (data = {}) => {
    const { viewerId } = data;
    const result = createAIGame(socket.id, viewerId);
    const { room } = result;
    socket.join(room.code);
    
    io.to(room.code).emit('game_start', room.gameState);
    
    console.log(`[Game] ${room.code} — AI Game started`);
    resetTurnTimer(room.code);
  };
  socket.on('play_ai_game', onPlayAiGame);
  socket.on('play-ai-game', onPlayAiGame);

  // ── Join Room ───────────────────────────────────────────────────────────────
  const onJoinRoom = (data = {}) => {
    const { code, viewerId, preferredColor } = data;
    const result = joinRoom(code, socket.id, viewerId, preferredColor);
    if (!result.success) {
      socket.emit('join_error', { message: result.message });
      return;
    }

    const { room, isRejoin, isGameStarted } = result;
    socket.join(code);
    
    if (isGameStarted || (room.status === 'playing' && isRejoin)) {
      io.to(code).emit('game_start', room.gameState);
      if (isGameStarted) {
        resetTurnTimer(code);
      }
    }
  };
  socket.on('join_room', onJoinRoom);
  socket.on('join-room', onJoinRoom);

  // ── Auto Play & Timer Logic ────────────────────────────────────────────────
  const resetTurnTimer = (code) => {
    if (roomTimers.has(code)) clearTimeout(roomTimers.get(code));

    const room = getRoom(code);
    if (!room || room.status !== 'playing') return;

    const gs = room.gameState;
    const currentPlayer = gs.players[gs.currentTurn];

    // Tell clients standard 10s timer (even for AI, or skip visual timer logic for AI)
    gs.timerEndTime = Date.now() + 10000;
    io.to(code).emit('timer_updated', { timerEndTime: gs.timerEndTime });

    if (currentPlayer.id === 'CPU') {
      checkAITurn(code);
      return;
    }

    const timeout = setTimeout(() => {
      const liveRoom = getRoom(code);
      if (!liveRoom || liveRoom.status !== 'playing') return;
      const liveGs = liveRoom.gameState;
      
      // Auto Roll
      if (!liveGs.diceRolled) {
        const result = processRoll(code, currentPlayer.id);
        if (result.success) {
          io.to(code).emit('dice_rolled', {
            diceValue: result.diceValue,
            validMoves: result.validMoves,
            autoPass: result.autoPass,
            gameState: result.state,
          });

          if (result.autoPass) {
            setTimeout(() => {
              io.to(code).emit('game_updated', { gameState: result.state });
              resetTurnTimer(code);
            }, 1000);
          } else if (result.validMoves.length === 1) {
             // obvious auto move
             setTimeout(() => autoMoveFixed(code, currentPlayer.id, result.validMoves[0]), 1000);
          } else {
             resetTurnTimer(code);
          }
        }
      } else {
        // Auto Move
        const validMoves = liveGs.validMoves || GameEngine.getValidMoves(liveGs, liveGs.diceValue);
        if (validMoves.length > 0) {
           const randomToken = validMoves[Math.floor(Math.random() * validMoves.length)];
           autoMoveFixed(code, currentPlayer.id, randomToken);
        }
      }
    }, 10000);

    roomTimers.set(code, timeout);
  };

  const autoMoveFixed = (code, playerId, tokenId) => {
    // Note: gameManager checks that player.id === socketId
    // since we pass the explicit playerId here it should bypass the socket mismatch if they match.
    const res = processMove(code, playerId, tokenId);
    if (res.success) {
       io.to(code).emit('game_updated', { gameState: res.state });
       if (res.state.status === 'finished') {
         const winner = res.state.players[res.state.winner];
         io.to(code).emit('game_over', { winnerIndex: res.state.winner, winnerColor: winner.color });
       } else {
         resetTurnTimer(code);
       }
    }
  };

  // ── AI Logic (Enhanced) ──────────────────────────────────────────────────────
  const checkAITurn = (code) => {
    const room = getRoom(code);
    if (!room || !room.isAI || room.status !== 'playing') return;
    
    const gs = room.gameState;
    const currentPlayer = gs.players[gs.currentTurn];

    if (currentPlayer.id === 'CPU') {
      if (!gs.diceRolled) {
        // AI DICE ROLL
        setTimeout(() => {
          const result = processRoll(code, 'CPU');
          if (result.success) {
            io.to(code).emit('dice_rolled', { 
               diceValue: result.diceValue, 
               validMoves: result.validMoves, 
               autoPass: result.autoPass, 
               gameState: result.state 
            });
            
            if (result.autoPass) {
              setTimeout(() => {
                 io.to(code).emit('game_updated', { gameState: result.state });
                 resetTurnTimer(code);
              }, 1000);
            } else {
              resetTurnTimer(code);
            }
          }
        }, 1200); // 1.2s thinking for dice
      } else {
        // AI MOVE SELECTION
        setTimeout(() => {
          const validMoves = GameEngine.getValidMoves(gs, gs.diceValue);
          if (validMoves.length > 0) {
            // Logic: Prefer kill moves
            let selectedTokenId = validMoves[0];
            let foundKill = false;

            for (const tokenId of validMoves) {
                const token = currentPlayer.tokens.find(t => t.id === tokenId);
                if (token.state === 'ACTIVE') {
                    const nextPos = (currentPlayer.startIndex + token.stepsMoved + gs.diceValue - 1) % 52;
                    const canKill = gs.players.some(p => p.id !== 'CPU' && p.tokens.some(t => t.state === 'ACTIVE' && t.position === nextPos && !GameEngine.isBlocked(gs, nextPos, 'CPU')));
                    if (canKill && !new Set([0, 8, 13, 21, 26, 34, 39, 47]).has(nextPos)) {
                        selectedTokenId = tokenId;
                        foundKill = true;
                        break;
                    }
                }
            }

            if (!foundKill) {
                // Otherwise random move
                selectedTokenId = validMoves[Math.floor(Math.random() * validMoves.length)];
            }

            const result = processMove(code, 'CPU', selectedTokenId);
            if (result.success) {
              io.to(code).emit('game_updated', { gameState: result.state });
              
              if (result.state.status === 'finished') {
                io.to(code).emit('game_over', { winnerIndex: result.state.winner, winnerColor: result.state.players[result.state.winner].color });
              } else {
                resetTurnTimer(code);
              }
            }
          }
        }, 1500); // 1.5s thinking for move
      }
    }
  };

  // ── Roll Dice ───────────────────────────────────────────────────────────────
  const onRollDice = (data = {}) => {
    const { code } = data;
    const result = processRoll(code, socket.id);
    if (!result.success) {
      socket.emit('action_error', { message: result.message });
      return;
    }

    io.to(code).emit('dice_rolled', {
      diceValue: result.diceValue,
      validMoves: result.validMoves,
      autoPass: result.autoPass,
      gameState: result.state,
    });
    
    if (result.autoPass) {
       setTimeout(() => {
         io.to(code).emit('game_updated', { gameState: result.state });
         resetTurnTimer(code);
       }, 1500); // 1.5s delay to see the number
    } else if (result.validMoves.length === 1) {
       setTimeout(() => autoMoveFixed(code, socket.id, result.validMoves[0]), 1000);
    } else {
       resetTurnTimer(code);
    }
  };
  socket.on('roll_dice', onRollDice);
  socket.on('roll-dice', onRollDice);

  // ── Move Token ──────────────────────────────────────────────────────────────
  const onMoveToken = (data = {}) => {
    const { code, tokenId } = data;
    const result = processMove(code, socket.id, tokenId);
    if (!result.success) {
      socket.emit('action_error', { message: result.message });
      return;
    }

    const { state } = result;
    io.to(code).emit('game_updated', { gameState: state });

    if (state.status === 'finished') {
      const winner = state.players[state.winner];
      io.to(code).emit('game_over', { winnerIndex: state.winner, winnerColor: winner.color });
    } else {
      resetTurnTimer(code);
    }
  };
  socket.on('move_token', onMoveToken);
  socket.on('move-token', onMoveToken);

  socket.on('disconnect', () => {
    const result = handleDisconnect(socket.id);
    if (result) {
      const { code, room } = result;
      if (room.status === 'playing' && room.gameState && room.gameState.status === 'playing') {
        const otherPlayer = room.players.find(p => p.id !== socket.id);
        if (otherPlayer) {
          room.gameState.status = 'finished';
          room.gameState.winner = otherPlayer.playerIndex;
          io.to(code).emit('game_updated', { gameState: room.gameState });
          io.to(code).emit('game_over', { 
            winnerIndex: otherPlayer.playerIndex, 
            winnerColor: otherPlayer.color,
            reason: 'opponent_left'
          });
          console.log(`[Game] ${code} — ${otherPlayer.color} won by opponent disconnect.`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎲 Ludobaazi server running at http://localhost:${PORT}\n`);
});
