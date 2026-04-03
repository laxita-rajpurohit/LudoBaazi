import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { type PlayerColor } from '@/types';
import { getTokenPosition, COLOR_OFFSETS } from '@/lib/boardMapping';
import { soundService } from '@/lib/soundService';

interface TokenProps {
  color: PlayerColor;
  themeColor?: PlayerColor;
  stepsMoved?: number;
  state?: 'BASE' | 'ACTIVE' | 'HOME';
  offset?: number;
  className?: string;
  onClick?: () => void;
  onWalkBackComplete?: () => void;
  killedStartSteps?: number;
  boardRotation?: number;
}

export const Token: React.FC<TokenProps> = ({
  color, themeColor, stepsMoved = 0, state = 'BASE', offset = 0, className, onClick, onWalkBackComplete, killedStartSteps, boardRotation = 0
}) => {
  const visualColor = themeColor || color;
  const [visualSteps, setVisualSteps] = React.useState(killedStartSteps ?? stepsMoved);

  // Step-by-step movement: one grid square per tick
  React.useEffect(() => {
    // If it's technically in BASE, we are walking back UNTIL visualSteps reaches 0
    const isWalkingBack = state === 'BASE' && visualSteps > 0;
    const target = isWalkingBack ? 0 : stepsMoved;

    // Fail-safe trigger if it's supposed to walk back but has somehow already reached 0
    if (state === 'BASE' && visualSteps === 0 && killedStartSteps !== undefined) {
      onWalkBackComplete?.();
    }

    const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

    if (visualSteps !== target) {
      const delay = isWalkingBack ? 65 : 170; // killed tokens walk back faster
      const timer = setTimeout(() => {
        setVisualSteps(prev => {
          const next = prev < target ? prev + 1 : prev - 1;
          soundService.playTokenMove();
          
          if (isWalkingBack && next === 0) {
            onWalkBackComplete?.();
          } else if (!isWalkingBack && next === target) {
             if (state === 'HOME' || next === 57) {
                soundService.playHomeEnter();
             } else if (state === 'ACTIVE' && next <= 51) {
                const absIdx = (COLOR_OFFSETS[color] + next - 1) % 52;
                if (SAFE_SPOTS.has(absIdx >= 0 ? absIdx : 0)) {
                   soundService.playSafeSpot();
                }
             }
          }
          
          return next;
        });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [stepsMoved, visualSteps, state, onWalkBackComplete, color]);

  const pos = getTokenPosition(color, {
    id: '', playerId: '', state, stepsMoved: visualSteps, position: 0,
  });

  const isOnBoard = Array.isArray(pos);
  const [row, col] = isOnBoard ? (pos as [number, number]) : [0, 0];

  const colorStyles: Record<PlayerColor, {
    head: string; point: string; inner: string; glow: string;
  }> = {
    red: {
      head: 'from-[#ff4b2b] to-[#ff416c] border-[#8e0000]',
      point: 'border-t-[#ff416c]',
      inner: 'bg-[#ff9999]/30',
      glow: 'shadow-[0_0_12px_rgba(255,75,43,0.9),0_0_4px_rgba(255,75,43,0.5)]',
    },
    green: {
      head: 'from-[#11998e] to-[#38ef7d] border-[#004d40]',
      point: 'border-t-[#38ef7d]',
      inner: 'bg-[#bbf7d0]/30',
      glow: 'shadow-[0_0_12px_rgba(17,153,142,0.9),0_0_4px_rgba(17,153,142,0.5)]',
    },
    yellow: {
      head: 'from-[#f8ff00] to-[#fbc02d] border-[#827717]',
      point: 'border-t-[#fbc02d]',
      inner: 'bg-[#fef08a]/30',
      glow: 'shadow-[0_0_12px_rgba(248,200,0,0.9),0_0_4px_rgba(248,200,0,0.5)]',
    },
    blue: {
      head: 'from-[#00c6ff] to-[#0072ff] border-[#0d47a1]',
      point: 'border-t-[#0072ff]',
      inner: 'bg-[#bfdbfe]/30',
      glow: 'shadow-[0_0_12px_rgba(0,198,255,0.9),0_0_4px_rgba(0,198,255,0.5)]',
    },
  };

  const style = colorStyles[visualColor];

  // Shared token shape used in both board and base renderers
  const TokenShape = () => (
    <div 
      className="flex flex-col items-center scale-110 relative"
      style={{ transform: `rotate(${-boardRotation}deg)` }}
    >
      {/* Glossy sphere head */}
      <div className={cn(
        'w-4 h-4 rounded-full bg-gradient-to-br border-[1.5px] relative z-10 flex items-center justify-center',
        style.head, style.glow
      )}>
        {/* Shine highlight */}
        <div className="absolute top-[8%] left-[12%] w-[42%] h-[42%] bg-gradient-to-br from-white/80 to-transparent rounded-full blur-[1px]" />
        <div className={cn('w-1.5 h-1.5 rounded-full border border-black/10 shadow-inner', style.inner)} />
      </div>
      {/* Pin triangle */}
      <div className={cn(
        'w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] -mt-[0.5px] relative z-0',
        style.point
      )} />
      {/* Ground shadow */}
      <div className="absolute -bottom-0.5 w-2 h-[3px] bg-black/40 rounded-full blur-[1.5px]" />
    </div>
  );

  // BASE state → render inline inside the base grid cell
  if (!isOnBoard) {
    return (
      <div
        className={cn('cursor-pointer flex flex-col items-center relative w-4 h-6', className)}
        onClick={onClick}
      >
        <TokenShape />
      </div>
    );
  }

  // ACTIVE / HOME → absolutely positioned on board with smooth spring translation
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: '6.66%',
        height: '6.66%',
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        top: `${(row / 15) * 100 + offset * 1.2}%`,
        left: `${(col / 15) * 100 + offset * 1.2}%`,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        top: { type: 'spring', stiffness: 500, damping: 30 },
        left: { type: 'spring', stiffness: 500, damping: 30 },
        scale: { type: 'spring', stiffness: 400, damping: 25 },
        opacity: { duration: 0.15 }
      }}
      onClick={onClick}
      className={cn('cursor-pointer', className)}
    >
      <TokenShape />
    </motion.div>
  );
};
