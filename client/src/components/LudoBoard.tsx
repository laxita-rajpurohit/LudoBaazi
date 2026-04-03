import React from 'react';
import { cn } from '@/lib/utils';
import { type PlayerColor, type GameState, type Player, type Token } from '@/types';
import { Token as TokenIcon } from './Token';
import { Star } from 'lucide-react';
import { useSocketStore } from '@/lib/socket';
import { getTokenPosition } from '@/lib/boardMapping';

export const LudoBoard: React.FC = () => {
  const gameState = useSocketStore((s: any) => s.gameState as GameState);
  const validMoves = useSocketStore((s: any) => s.validMoves as string[]);
  const moveToken = useSocketStore((s: any) => s.moveToken as (id: string) => void);

  const activeTokensWithOffsets: { token: Token; color: PlayerColor; offset: number }[] = [];
  const baseTokens: Record<PlayerColor, number> = { red: 4, green: 4, yellow: 4, blue: 4 };
  const cellTracker: Record<string, number> = {};

  if (gameState && gameState.players) {
    baseTokens.red = 0; baseTokens.green = 0; baseTokens.yellow = 0; baseTokens.blue = 0;
    gameState.players.forEach((player: Player) => {
      player.tokens.forEach((t: Token) => {
        if (t.state === 'BASE') {
          baseTokens[player.color]++;
        } else {
          const pos = getTokenPosition(player.color, t);
          const key = Array.isArray(pos) ? `${pos[0]}-${pos[1]}` : 'base';
          const offset = cellTracker[key] || 0;
          cellTracker[key] = offset + 1;
          activeTokensWithOffsets.push({ token: t, color: player.color, offset });
        }
      });
    });
  }

  const handleTokenClick = (tokenId: string) => {
    if (validMoves.includes(tokenId)) {
      moveToken(tokenId);
    }
  };

  const renderBase = (color: PlayerColor, row: number, col: number) => {
    const tokensInBase = baseTokens[color];
    const baseStyles: Record<PlayerColor, string> = {
      red: 'bg-gradient-to-br from-[#ff4b2b] to-[#ff416c] border-[#8e0000]',
      green: 'bg-gradient-to-br from-[#11998e] to-[#38ef7d] border-[#004d40]',
      yellow: 'bg-gradient-to-br from-[#f8ff00] to-[#fbc02d] border-[#827717]',
      blue: 'bg-gradient-to-br from-[#00c6ff] to-[#0072ff] border-[#0d47a1]',
    };

    const dotColor: Record<PlayerColor, string> = {
      red: 'bg-[#8e0000]',
      green: 'bg-[#004d40]',
      yellow: 'bg-[#827717]',
      blue: 'bg-[#0d47a1]',
    };

    // Find valid base tokens to make them clickable
    const myBaseTokens = gameState?.players.find(p => p.color === color)?.tokens.filter(t => t.state === 'BASE') || [];

    const isMyBaseTurn = gameState?.players[gameState.currentTurn]?.color === color;

    return (
      <div 
        className={cn(
          "absolute w-[40%] h-[40%] rounded-2xl border-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center p-3 overflow-hidden transition-all duration-500",
          baseStyles[color],
          isMyBaseTurn && "ring-8 ring-white/30 scale-[1.02] z-20",
          row === 0 ? 'top-0' : 'bottom-0',
          col === 0 ? 'left-0' : 'right-0'
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        <div className="w-full h-full bg-white rounded-xl shadow-[0_6px_12px_rgba(0,0,0,0.3)] grid grid-cols-2 grid-rows-2 p-2.5 gap-2.5 relative z-10">
          {Array.from({ length: 4 }).map((_, i) => {
            const tkn = i < tokensInBase ? myBaseTokens[i] : null;
            const isValid = tkn && validMoves.includes(tkn.id);
            return (
              <div key={i} className="flex items-center justify-center bg-gray-50 rounded-lg shadow-inner">
                {tkn ? (
                  <TokenIcon 
                    color={color} 
                    className={cn("scale-125", isValid && "ring-4 ring-yellow-400 rounded-full animate-pulse cursor-pointer")} 
                    onClick={() => isValid ? handleTokenClick(tkn.id) : undefined}
                  />
                ) : (
                  <div className={cn("w-4 h-4 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] opacity-20", dotColor[color])} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCell = (r: number, c: number) => {
    let cellColor = "bg-white";
    let icon = null;
    let arrow = null;

    if (r === 7 && c > 0 && c < 6) cellColor = "bg-gradient-to-r from-[#ff4b2b] to-[#ff416c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]";
    if (r === 7 && c > 8 && c < 14) cellColor = "bg-gradient-to-l from-[#f8ff00] to-[#fbc02d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]";
    if (c === 7 && r > 0 && r < 6) cellColor = "bg-gradient-to-b from-[#11998e] to-[#38ef7d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]";
    if (c === 7 && r > 8 && r < 14) cellColor = "bg-gradient-to-t from-[#00c6ff] to-[#0072ff] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]";

    if (r === 6 && c === 1) cellColor = "bg-gradient-to-br from-[#ff4b2b] to-[#ff416c] shadow-lg";
    if (r === 1 && c === 8) cellColor = "bg-gradient-to-br from-[#11998e] to-[#38ef7d] shadow-lg";
    if (r === 8 && c === 13) cellColor = "bg-gradient-to-br from-[#f8ff00] to-[#fbc02d] shadow-lg";
    if (r === 13 && c === 6) cellColor = "bg-gradient-to-br from-[#00c6ff] to-[#0072ff] shadow-lg";

    const stars = [[8, 2], [2, 6], [6, 12], [12, 8]];
    if (stars.some(([sr, sc]) => sr === r && sc === c)) {
      icon = <Star className="w-5 h-5 text-gray-300 fill-white drop-shadow-sm" strokeWidth={1.5} />;
    }

    if (r === 6 && c === 0) arrow = <span className="text-[#ff4b2b] font-bold text-xl drop-shadow-md">→</span>;
    if (r === 0 && c === 8) arrow = <span className="text-[#11998e] font-bold text-xl drop-shadow-md">↓</span>;
    if (r === 8 && c === 14) arrow = <span className="text-[#fbc02d] font-bold text-xl drop-shadow-md">←</span>;
    if (r === 14 && c === 6) arrow = <span className="text-[#0072ff] font-bold text-xl drop-shadow-md">↑</span>;

    return (
      <div 
        key={`${r}-${c}`}
        className={cn(
          "border-[0.5px] border-gray-200 flex items-center justify-center relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]",
          cellColor
        )}
      >
        {icon}
        {arrow}
      </div>
    );
  };

  return (
    <div className="relative aspect-square w-full max-w-[500px] bg-gradient-to-br from-[#d4a017] to-[#8a6d3b] p-3 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.7),inset_0_-8px_20px_rgba(0,0,0,0.5)] border-t-4 border-l-4 border-white/50">
      <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.2)] flex items-center justify-center">
        <div className="grid grid-cols-15 grid-rows-15 h-full w-full">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) return <div key={`${r}-${c}`} />;
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return <div key={`${r}-${c}`} />;
              return renderCell(r, c);
            })
          )}
        </div>

        {renderBase('red', 0, 0)}
        {renderBase('green', 0, 9)}
        {renderBase('blue', 9, 0)}
        {renderBase('yellow', 9, 9)}

        {/* Token Overlay Layer */}
        <div className="absolute inset-0 pointer-events-none z-40">
          {activeTokensWithOffsets.map(({ token, color, offset }) => (
            <TokenIcon
              key={token.id}
              color={color}
              state={token.state}
              stepsMoved={token.stepsMoved}
              offset={offset}
              className={cn("pointer-events-auto", validMoves.includes(token.id) && "ring-4 ring-yellow-400 rounded-full animate-pulse")}
              onClick={() => handleTokenClick(token.id)}
            />
          ))}
        </div>

        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-white shadow-[0_0_30px_rgba(0,0,0,0.3)] overflow-hidden border-4 border-white z-20 rounded-sm">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="0,0 50,50 100,0" className="fill-[#11998e] filter drop-shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
            <polygon points="100,0 50,50 100,100" className="fill-[#fbc02d] filter drop-shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
            <polygon points="100,100 50,50 0,100" className="fill-[#0072ff] filter drop-shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
            <polygon points="0,100 50,50 0,0" className="fill-[#ff4b2b] filter drop-shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
            <circle cx="50" cy="50" r="12" className="fill-white/10" />
            <circle cx="50" cy="50" r="6" className="fill-white/20" />
          </svg>
        </div>
      </div>
    </div>
  );
};
