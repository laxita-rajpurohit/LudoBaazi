import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import { type GameState, type PlayerColor } from '../types';

interface SocketStore {
  socket: Socket | null;
  gameState: GameState | null;
  currentRoom: string | null;
  myPlayerIndex: number | null;
  myColor: PlayerColor | null;
  validMoves: string[];
  errorMessage: string | null;
  connect: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  rollDice: () => void;
  moveToken: (tokenId: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const socketInstance = io(URL, { autoConnect: false });

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: socketInstance,
  gameState: null,
  currentRoom: null,
  myPlayerIndex: null,
  myColor: null,
  validMoves: [],
  errorMessage: null,

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
      
      set({ 
        currentRoom: gs.gameId,
        gameState: gs,
        myPlayerIndex: me ? gs.players.indexOf(me) : null,
        myColor: me ? me.color : null,
        validMoves: []
      });
    });

    socketInstance.on('dice_rolled', ({ validMoves, gameState }) => {
      set({ gameState, validMoves: validMoves || [] });
    });

    socketInstance.on('game_updated', ({ gameState }) => {
      set({ gameState, validMoves: [] });
    });

    socketInstance.on('game_over', ({ winnerIndex }) => {
      // Game over logic... could display winner
      console.log('Game Over! Winner:', winnerIndex);
    });

    socketInstance.on('join_error', ({ message }) => {
      set({ errorMessage: message });
    });
  },

  createRoom: () => {
    const viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
    socketInstance.emit('create_room', { viewerId });
  },

  joinRoom: (code: string) => {
    const viewerId = sessionStorage.getItem('LUDO_VIEWER_ID');
    socketInstance.emit('join_room', { code: code.trim().toUpperCase(), viewerId });
  },

  rollDice: () => {
    const { currentRoom } = get();
    if (currentRoom) socketInstance.emit('roll_dice', { code: currentRoom });
  },

  moveToken: (tokenId: string) => {
    const { currentRoom } = get();
    if (currentRoom) socketInstance.emit('move_token', { code: currentRoom, tokenId });
  },

  leaveRoom: () => {
    set({ gameState: null, currentRoom: null });
  },

  clearError: () => set({ errorMessage: null })
}));
