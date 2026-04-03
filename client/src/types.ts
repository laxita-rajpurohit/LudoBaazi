export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: string;
  playerId: string;
  state: 'BASE' | 'ACTIVE' | 'HOME';
  position: number;
  stepsMoved: number;
}

export interface Player {
  id: string;
  viewerId?: string;
  color: PlayerColor;
  startIndex: number;
  tokens: Token[];
  preferredColor?: string;
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentTurn: number;
  diceValue: number | null;
  status: 'waiting' | 'playing' | 'finished';
  winner: number | null;
  diceRolled: boolean;
  validMoves: string[];
  timerEndTime?: number;
}

export const BOARD_SIZE = 15;

export const COLOR_MAP = {
  red: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    border: 'border-red-600',
    gradient: 'from-red-400 to-red-600',
    light: 'bg-red-100',
    baseStart: [0, 0],
    pathStart: [6, 1],
    homePath: [7, 1, 7, 2, 7, 3, 7, 4, 7, 5],
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    border: 'border-green-600',
    gradient: 'from-green-400 to-green-600',
    light: 'bg-green-100',
    baseStart: [0, 9],
    pathStart: [1, 8],
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    border: 'border-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
    light: 'bg-yellow-100',
    baseStart: [9, 9],
    pathStart: [8, 13],
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-600',
    gradient: 'from-blue-400 to-blue-600',
    light: 'bg-blue-100',
    baseStart: [9, 0],
    pathStart: [13, 6],
  },
};
