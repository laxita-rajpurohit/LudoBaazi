import { type PlayerColor, type Token } from '../types';

export const PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], 
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], 
  [0, 7], 
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], 
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], 
  [7, 14], 
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], 
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], 
  [14, 7], 
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], 
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], 
  [7, 0], [6, 0]
];

export const COLOR_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

export const HOME_STRETCH: Record<PlayerColor, [number, number][]> = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

export function getTokenPosition(color: PlayerColor, token: Token) {
  if (token.state === 'BASE') return 'BASE';
  if (token.state === 'HOME') return 'HOME';
  
  if (token.stepsMoved > 51) {
    const idx = token.stepsMoved - 52; // 52, 53, 54, 55, 56 -> 0, 1, 2, 3, 4
    return HOME_STRETCH[color][idx] || 'HOME';
  }
  
  const offset = COLOR_OFFSETS[color];
  const absIdx = (offset + token.stepsMoved - 1) % 52;
  return PATH[absIdx >= 0 ? absIdx : 0];
}
