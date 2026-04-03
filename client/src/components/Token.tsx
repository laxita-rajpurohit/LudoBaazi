import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { type PlayerColor } from '@/types';

interface TokenProps {
  color: PlayerColor;
  stepsMoved?: number;
  state?: 'BASE' | 'ACTIVE' | 'HOME';
  className?: string;
  onClick?: () => void;
}

import { getTokenPosition } from '@/lib/boardMapping';

export const Token: React.FC<TokenProps> = ({ color, stepsMoved = 0, state = 'BASE', className, onClick }) => {
  const [visualSteps, setVisualSteps] = React.useState(stepsMoved);
  
  // Step-by-step animation logic
  React.useEffect(() => {
    if (state === 'BASE') {
      setVisualSteps(0);
      return;
    }
    if (visualSteps !== stepsMoved) {
      const timer = setTimeout(() => {
        setVisualSteps(prev => {
          if (prev < stepsMoved) return prev + 1;
          if (prev > stepsMoved) return prev - 1;
          return prev;
        });
      }, 150); // Speed of walking
      return () => clearTimeout(timer);
    }
  }, [stepsMoved, visualSteps, state]);

  const pos = getTokenPosition(color, { id: '', playerId: '', state, stepsMoved: visualSteps, position: 0 });
  const isOverlay = Array.isArray(pos);
  const [row, col] = isOverlay ? pos : [0, 0];

  const colorStyles: Record<PlayerColor, any> = {
    red: {
      head: 'from-[#ff4b2b] to-[#ff416c] border-[#8e0000]',
      point: 'border-t-[#ff416c]',
      inner: 'bg-[#ff9999]/30',
      glow: 'shadow-[0_0_15px_rgba(255,75,43,0.6)]',
    },
    green: {
      head: 'from-[#11998e] to-[#38ef7d] border-[#004d40]',
      point: 'border-t-[#38ef7d]',
      inner: 'bg-[#bbf7d0]/30',
      glow: 'shadow-[0_0_15px_rgba(17,153,142,0.6)]',
    },
    yellow: {
      head: 'from-[#f8ff00] to-[#fbc02d] border-[#827717]',
      point: 'border-t-[#fbc02d]',
      inner: 'bg-[#fef08a]/30',
      glow: 'shadow-[0_0_15px_rgba(248,255,0,0.6)]',
    },
    blue: {
      head: 'from-[#00c6ff] to-[#0072ff] border-[#0d47a1]',
      point: 'border-t-[#0072ff]',
      inner: 'bg-[#bfdbfe]/30',
      glow: 'shadow-[0_0_15px_rgba(0,198,255,0.6)]',
    },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      layout
      initial={false}
      animate={isOverlay ? {
        top: `${(row / 15) * 100}%`,
        left: `${(col / 15) * 100}%`,
        scale: [1, 1.05, 1],
      } : {
        scale: [1, 1.05, 1],
      }}
      transition={isOverlay ? {
        type: "spring",
        stiffness: 300,
        damping: 30,
        layout: { duration: 0.2 }
      } : { 
        repeat: Infinity, 
        duration: 2,
        ease: "easeInOut"
      }}
      whileHover={{ scale: 1.1, zIndex: 50 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={isOverlay ? {
        position: 'absolute',
        width: '6.66%',
        height: '6.66%',
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      } : undefined}
      className={cn(
        "cursor-pointer flex flex-col items-center",
        !isOverlay && "relative w-4 h-6",
        className
      )}
    >
      <div className="flex flex-col items-center scale-110">
        {/* Pin Head - Glossy Sphere */}
        <div className={cn(
          "w-4 h-4 rounded-full bg-gradient-to-br border-[1px] relative z-10 flex items-center justify-center",
          style.head,
          style.glow
        )}>
          {/* Top Shine */}
          <div className="absolute top-[10%] left-[15%] w-[40%] h-[40%] bg-gradient-to-br from-white/70 to-transparent rounded-full blur-[1px]" />
          <div className={cn("w-1.5 h-1.5 rounded-full border border-black/10 shadow-inner", style.inner)} />
        </div>
        
        {/* Pin Point - Triangle */}
        <div className={cn(
          "w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] -mt-[0.5px] relative z-0",
          style.point
        )} />
        
        {/* Contact Shadow */}
        <div className="absolute -bottom-0.5 w-2 h-0.5 bg-black/40 rounded-full blur-[1px]" />
      </div>
    </motion.div>
  );
};
