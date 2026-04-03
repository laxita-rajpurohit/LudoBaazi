import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface DiceProps {
  value: number;
  isRolling?: boolean;
  onClick?: () => void;
  className?: string;
}

const Pip = () => (
  <div className="w-[32%] h-[32%] bg-[#111] rounded-full shadow-[inset_0_2px_3px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.2)] border-[0.5px] border-black/50" />
);

const Face: React.FC<{ value: number; transform: string; color?: string }> = ({ value, transform, color = "white" }) => {
  const layouts: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  return (
    <div 
      className="absolute inset-0 rounded-[12px] border border-gray-300/60 flex items-center justify-center p-1"
      style={{ 
        transform, 
        backfaceVisibility: 'visible',
        backgroundColor: color,
        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%), linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.1) 100%)',
        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.12), 0 0 3px rgba(0,0,0,0.05)',
      }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-0 w-full h-full">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {layouts[value].includes(i) && <Pip />}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Dice: React.FC<DiceProps> = ({ value, isRolling, onClick, className }) => {
  const rotations: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: 180 },
  };

  const currentRotation = rotations[value] || rotations[1];
  const diceSize = 48; 
  const halfSize = diceSize / 2;

  return (
    <div 
      className={cn("relative cursor-pointer group", className)}
      style={{ 
        width: diceSize, 
        height: diceSize,
        perspective: '800px' 
      }}
      onClick={onClick}
    >
      {/* Dynamic Drop Shadow */}
      <motion.div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/30 rounded-[100%] blur-md"
        animate={isRolling ? {
          scale: [1, 1.4, 0.7, 1.2, 1],
          opacity: [0.3, 0.1, 0.4, 0.2, 0.3],
          filter: ["blur(4px)", "blur(8px)", "blur(3px)", "blur(6px)", "blur(4px)"]
        } : {
          scale: 1,
          opacity: 0.3,
          filter: "blur(4px)"
        }}
        transition={{ duration: 0.3, repeat: isRolling ? Infinity : 0 }}
      />

      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={isRolling ? {
          rotateX: [0, 1080, 2160, 3240],
          rotateY: [0, 720, 1440, 2160],
          rotateZ: [0, 360, 720, 1080],
          y: [0, -25, 0, -12, 0],
          scale: [1, 1.1, 0.9, 1.05, 1],
        } : {
          rotateX: currentRotation.x,
          rotateY: currentRotation.y,
          rotateZ: 0,
          y: 0,
          scale: 1
        }}
        transition={isRolling ? {
          duration: 0.3,
          repeat: Infinity,
          ease: "linear"
        } : {
          type: "spring",
          stiffness: 400,
          damping: 25,
          mass: 1
        }}
      >
        {/* Front (1) */}
        <Face value={1} transform={`translateZ(${halfSize}px)`} />
        {/* Right (2) */}
        <Face value={2} transform={`rotateY(90deg) translateZ(${halfSize}px)`} />
        {/* Top (3) */}
        <Face value={3} transform={`rotateX(90deg) translateZ(${halfSize}px)`} />
        {/* Bottom (4) */}
        <Face value={4} transform={`rotateX(-90deg) translateZ(${halfSize}px)`} />
        {/* Left (5) */}
        <Face value={5} transform={`rotateY(-90deg) translateZ(${halfSize}px)`} />
        {/* Back (6) */}
        <Face value={6} transform={`rotateY(180deg) translateZ(${halfSize}px)`} />
        
        {/* Beveled Edges (simulated with extra faces if needed, but rounded corners + shadows usually suffice) */}
      </motion.div>
    </div>
  );
};
