import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LudoBoard } from './components/LudoBoard';
import { Dice } from './components/Dice';
import { Token } from './components/Token';
import { useSocketStore } from './lib/socket';

export default function App() {
  const { 
    connect, gameState, currentRoom, createRoom, joinRoom, 
    rollDice, leaveRoom, errorMessage, clearError 
  } = useSocketStore();

  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    connect();
  }, [connect]);
  // Handle fake rolling animation before server dice response arrives
  const rollingPlayerId = useSocketStore(s => s.rollingPlayerId);

  const getLabelPosition = (color: string) => {
    switch (color) {
      case 'red': return 'top-[12.5%] left-[7%]';
      case 'green': return 'top-[12.5%] right-[7%]';
      case 'yellow': return 'bottom-[12.5%] right-[7%]';
      case 'blue': return 'bottom-[12.5%] left-[7%]';
      default: return '';
    }
  };

  const getDiceTrayPosition = (color: string) => {
    switch (color) {
      case 'red': return 'top-[5%] left-[5%]';
      case 'green': return 'top-[5%] right-[5%]';
      case 'yellow': return 'bottom-[5%] right-[5%]';
      case 'blue': return 'bottom-[5%] left-[5%]';
      default: return '';
    }
  };

  const getDiceTrayStyles = (color: string) => {
    switch (color) {
      case 'red': return 'from-[#ff4b2b] to-[#ff416c]';
      case 'green': return 'from-[#11998e] to-[#38ef7d]';
      case 'yellow': return 'from-[#f8ff00] to-[#fbc02d]';
      case 'blue': return 'from-[#00c6ff] to-[#0072ff]';
      default: return '';
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3c72] via-[#2a5298] to-[#4a90e2] flex flex-col items-center justify-center p-4 text-white font-sans">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl border border-white/20 text-center max-w-sm w-full"
        >
          <h1 className="text-4xl font-extrabold mb-2 drop-shadow-md">Ludobaazi</h1>
          <p className="text-blue-100 mb-8 opacity-80">Real-time Multiplayer</p>

          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-2 rounded-lg mb-4 text-sm flex justify-between items-center">
              <span>{errorMessage}</span>
              <button onClick={clearError} className="text-red-200 hover:text-white">&times;</button>
            </div>
          )}

          {currentRoom ? (
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-xl">
                <p className="text-sm text-blue-200 mb-1">Room Code</p>
                <p className="text-3xl font-mono tracking-widest font-bold">{currentRoom}</p>
              </div>
              <p className="text-sm text-blue-100 animate-pulse">Waiting for opponent...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <button 
                onClick={createRoom}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-600 rounded-xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-transform"
              >
                Create Room
              </button>
              
              <div className="flex items-center gap-2 my-4 opacity-50">
                <hr className="flex-1 border-white/20" />
                <span className="text-xs font-medium">OR</span>
                <hr className="flex-1 border-white/20" />
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter Code" 
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 uppercase tracking-widest outline-none focus:border-white/40 font-mono transition-colors"
                  maxLength={6}
                />
                <button 
                  onClick={() => joinRoom(joinCode)}
                  className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Get active player for dynamic UI
  const activePlayer = gameState.players[gameState.currentTurn];
  const isMyTurn = activePlayer?.id === useSocketStore.getState().socket?.id || 
                   activePlayer?.viewerId === sessionStorage.getItem('LUDO_VIEWER_ID');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c72] via-[#2a5298] to-[#4a90e2] relative overflow-hidden flex flex-col items-center justify-center p-4 font-sans text-white">
      {/* Immersive Background Pattern - Matching Image with Motion */}
      <motion.div 
        animate={{ 
          x: [-30, 30],
          y: [-30, 30]
        }}
        transition={{ 
          repeat: Infinity, 
          repeatType: "mirror", 
          duration: 25,
          ease: "linear"
        }}
        className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden rotate-[-15deg] scale-150"
      >
        {/* Background Decorative Pattern... */}
        <div className="grid grid-cols-5 gap-x-20 gap-y-32">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-12">
              <div className="w-20 h-20 bg-blue-700/40 rounded-2xl flex items-center justify-center border-2 border-blue-400/30 shadow-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div className="w-3 h-3 bg-blue-200/50 rounded-full" />
                  <div className="w-3 h-3 bg-blue-200/50 rounded-full" />
                  <div className="w-3 h-3 bg-blue-200/50 rounded-full" />
                  <div className="w-3 h-3 bg-blue-200/50 rounded-full" />
                </div>
              </div>
              <div className="w-12 h-16 bg-blue-700/40 rounded-full border-2 border-blue-400/30 opacity-60 shadow-lg" />
              <div className="text-5xl text-blue-200/30 font-black">↑</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Bar - Exit Game & Room Info */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={leaveRoom}
          className="px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-lg border border-white/20 flex items-center gap-2 text-xs font-medium shadow-lg"
        >
          <List className="w-3.5 h-3.5 rotate-90" />
          <span>Exit Game</span>
        </motion.button>
        <span className="font-mono text-sm bg-black/20 px-2 py-1 rounded">Room: {currentRoom}</span>
      </div>

      {/* Turn Indicator */}
      {gameState.status === 'playing' && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/40 backdrop-blur-xl border border-white/20 px-8 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-1"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/50">Current Turn</p>
          <div className="flex items-center gap-3">
             <div className={cn("w-3 h-3 rounded-full animate-pulse", 
               activePlayer?.color === 'red' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
               activePlayer?.color === 'green' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
               activePlayer?.color === 'blue' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' :
               'bg-yellow-500 shadow-[0_0_10px_#eab308]'
             )} />
             <span className="text-lg font-black uppercase tracking-wider italic">
               {activePlayer?.color === useSocketStore.getState().myColor ? 'YOUR TURN' : `${activePlayer?.color}'S TURN`}
             </span>
          </div>
        </motion.div>
      )}

      {typeof gameState.winner === 'number' && (
         <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-gradient-to-br from-yellow-400 to-amber-600 p-1 rounded-3xl shadow-2xl"
           >
             <div className="bg-black/90 px-12 py-10 rounded-[1.4rem] text-center">
               <h2 className="text-5xl font-black text-yellow-400 mb-2 italic">VICTORY!</h2>
               <p className="text-xl font-bold text-white mb-8">
                 {gameState.players[gameState.winner].color.toUpperCase()} PLAYER WINS
               </p>
               <button 
                 onClick={leaveRoom}
                 className="px-8 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-transform"
               >
                 PLAY AGAIN
               </button>
             </div>
           </motion.div>
         </div>
      )}

      {/* Main Board Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative z-20 w-full flex justify-center px-4 my-8"
      >
        <LudoBoard />
      </motion.div>

      {/* Dice Trays for all players */}
      {gameState.players.map((p, idx) => {
        const isCurrentPlayerTurn = gameState.currentTurn === idx;
        const trayPos = getDiceTrayPosition(p.color);
        const labelPos = getLabelPosition(p.color);
        const trayGradient = getDiceTrayStyles(p.color);
        
        return (
          <React.Fragment key={p.id}>
            {/* Player Label */}
            <div className={cn("absolute z-30 font-bold text-sm uppercase italic drop-shadow-md", labelPos)}>
               <span className={cn(
                 "px-3 py-0.5 rounded-md backdrop-blur-md border border-white/10 shadow-sm",
                 p.color === 'red' ? 'text-red-400 bg-red-900/20' : 
                 p.color === 'green' ? 'text-green-400 bg-green-900/20' :
                 p.color === 'blue' ? 'text-blue-400 bg-blue-900/20' : 'text-yellow-400 bg-yellow-900/20'
               )}>
                 P{idx + 1}: {p.color}
               </span>
            </div>

            {/* Dice Tray */}
            <div className={cn("absolute z-30", trayPos)}>
              <motion.div 
                animate={{ 
                  y: trayPos.includes('top') ? [0, -4, 0] : [0, 4, 0],
                  boxShadow: isCurrentPlayerTurn ? [
                    "0 15px 35px rgba(0,0,0,0.4)",
                    `0 20px 45px ${p.color === 'red' ? 'rgba(239,68,68,0.6)' : p.color === 'green' ? 'rgba(34,197,94,0.6)' : p.color === 'blue' ? 'rgba(59,130,246,0.6)' : 'rgba(234,179,8,0.6)'}`,
                    "0 15px 35px rgba(0,0,0,0.4)"
                  ] : undefined,
                  scale: isCurrentPlayerTurn ? 1.05 : 0.85
                }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className={cn(
                  "p-1.5 rounded-[1.5rem] flex items-center gap-2 border-[3px] shadow-2xl backdrop-blur-sm transition-all",
                  isCurrentPlayerTurn ? "bg-white/20 border-white" : "bg-black/30 border-white/10 grayscale-[0.5] opacity-50"
                )}
              >
                <div className={cn("p-2 rounded-xl border-2 border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br", trayGradient)}>
                  <Dice 
                    value={isCurrentPlayerTurn ? (gameState.diceValue || 1) : 1} 
                    isRolling={rollingPlayerId === p.id} 
                    onClick={isCurrentPlayerTurn && isMyTurn ? () => useSocketStore.getState().rollDice() : undefined}
                    className="w-10 h-10 rounded-md" 
                  />
                </div>
                <div className="bg-white/90 p-2 rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] flex items-center justify-center w-10 h-10 border border-white">
                  <Token color={p.color} className="scale-125" />
                </div>
              </motion.div>
            </div>
          </React.Fragment>
        );
      })}

      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}
