import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { type GameState, type PlayerColor } from '../types';
import { soundService } from './soundService';

interface SocketStore {
  socket: Socket | null;
  gameState: GameState | null;
  currentRoom: string | null;
  myPlayerIndex: number | null;
  myColor: PlayerColor | null;
  validMoves: string[];
  errorMessage: string | null;
  rollingPlayerId: string | null;
  lastDiceRoll: { value: number; playerIndex: number } | null;
  gameOverData: { winnerIndex: number; winnerColor: string; reason?: string } | null;
  connect: () => void;
  createRoom: (preferredColor?: string) => void;
  joinRoom: (code: string, preferredColor?: string) => void;
  rollDice: () => void;
  moveToken: (tokenId: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const socketInstance = io(URL, { autoConnect: false });

/**
 * Synchronous roll lock — prevents double-click race conditions that slip through
 * before React can re-render with updated Zustand state.
 */
let _rollLocked = false;

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: socketInstance,
  gameState: null,
  currentRoom: null,
  myPlayerIndex: null,
  myColor: null,
  validMoves: [],
  errorMessage: null,
  rollingPlayerId: null,
  lastDiceRoll: null,
  gameOverData: null,

  connect: () => {
    let viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
    if (!viewerId) {
      viewerId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('LUDO_VIEWER_ID', viewerId);
    }
  
    socketInstance.connect();
    
    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      socketInstance.emit('identify', { viewerId });
    });

    socketInstance.on('room_created', ({ code }) => {
      set({ currentRoom: code });
    });

    socketInstance.on('game_start', (gs: GameState) => {
      console.log('[Game] Start:', gs);
      const me = gs.players.find(p => p.id === socketInstance.id || p.viewerId === viewerId);
      _rollLocked = false;
      set({ 
        currentRoom: gs.gameId,
        gameState: gs,
        myPlayerIndex: me ? gs.players.indexOf(me) : null,
        myColor: me ? me.color : null,
        validMoves: [],
        rollingPlayerId: null,
        lastDiceRoll: null,
      });
    });

    socketInstance.on('dice_rolled', ({ validMoves, gameState, diceValue: rolledValue }) => {
      _rollLocked = false;
      /**
       * KEY FIX: The server emits two separate values:
       *   - `diceValue` (event payload): the ACTUAL rolled number, always present
       *   - `gameState.diceValue`: null when autoPass=true (server clears it before returning)
       * We MUST read from the event payload `rolledValue`, not from `gameState.diceValue`.
       *
       * We also use `prevState.currentTurn` (before auto-advance) to identify the roller.
       */
      const { gameState: prevState } = get();
      let lastDiceRoll: { value: number; playerIndex: number } | null = null;
      
      soundService.playDiceRoll();

      if (rolledValue != null && prevState) {
        lastDiceRoll = { value: rolledValue, playerIndex: prevState.currentTurn };
      }

      set({ gameState, validMoves: validMoves || [], rollingPlayerId: null, lastDiceRoll });
    });

    socketInstance.on('game_updated', ({ gameState }) => {
      _rollLocked = false;
      // Reset lastDiceRoll since the move has been made
      set({ gameState, validMoves: [], rollingPlayerId: null, lastDiceRoll: null });
    });

    socketInstance.on('timer_updated', ({ timerEndTime }) => {
      const gs = get().gameState;
      if (gs) {
         set({ gameState: { ...gs, timerEndTime } });
      }
    });

    socketInstance.on('game_over', (data) => {
      set({ gameOverData: data });
      console.log('[Game] Over!', data);
    });

    socketInstance.on('join_error', ({ message }) => {
      set({ errorMessage: message });
    });
  },

  createRoom: (preferredColor?: string) => {
    const viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
    socketInstance.emit('create_room', { viewerId, preferredColor });
  },

  joinRoom: (code: string, preferredColor?: string) => {
    const viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
    socketInstance.emit('join_room', { code: code.trim().toUpperCase(), viewerId, preferredColor });
  },

  rollDice: () => {
    // Synchronous guard — fires BEFORE any React re-render, preventing double-click race
    if (_rollLocked) return;

    const { currentRoom, gameState, myPlayerIndex, socket, rollingPlayerId } = get();
    // Secondary guard: also check Zustand state for safety
    if (currentRoom && gameState && myPlayerIndex !== null && !rollingPlayerId) {
      _rollLocked = true; // Lock immediately, synchronously
      set({ rollingPlayerId: socket?.id || null });
      socketInstance.emit('roll_dice', { code: currentRoom });

      // Safety Timeout: If server doesn't respond in 5s, clear animation and lock
      setTimeout(() => {
        if (get().rollingPlayerId === socket?.id) {
          _rollLocked = false;
          set({ rollingPlayerId: null });
        }
      }, 5000);
    }
  },

  moveToken: (tokenId: string) => {
    const { currentRoom } = get();
    if (currentRoom) socketInstance.emit('move_token', { code: currentRoom, tokenId });
  },

  leaveRoom: () => {
    _rollLocked = false;
    set({ gameState: null, currentRoom: null, lastDiceRoll: null });
  },

  clearError: () => set({ errorMessage: null })
}));
