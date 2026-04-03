import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LudoBoard } from './components/LudoBoard';
import { Dice } from './components/Dice';
import { Token } from './components/Token';
import { useSocketStore } from './lib/socket';
import { type PlayerColor, type Player } from './types';
import { getPlayerGlowColor, getDiceTrayGradient } from './lib/boardMapping';

export default function App() {
  const {
    connect, gameState, currentRoom, createRoom, joinRoom,
    leaveRoom, errorMessage, clearError, gameOverData
  } = useSocketStore();

  const [joinCode, setJoinCode] = useState('');
  const [preferredColor, setPreferredColor] = useState('blue');

  useEffect(() => {
    connect();
  }, [connect]);

  const rollingPlayerId = useSocketStore(s => s.rollingPlayerId);
  const lastDiceRoll    = useSocketStore(s => s.lastDiceRoll);

  // ── Lobby screen ────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center p-4 text-white font-sans">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="bg-white/8 p-8 rounded-3xl backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] border border-white/15 text-center max-w-sm w-full"
        >
          {/* Logo */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mb-6"
          >
            <h1 className="text-5xl font-black mb-1 bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
              LudoBaazi
            </h1>
            <p className="text-white/50 text-sm tracking-widest uppercase font-semibold">Real-time Multiplayer</p>
          </motion.div>

          {/* Color Selection */}
          {!currentRoom && (
            <div className="mb-6">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-3 font-semibold">Select Your Color</p>
              <div className="flex gap-3 justify-center">
                {['blue', 'red', 'green', 'yellow'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPreferredColor(c)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      preferredColor === c ? "scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-[#24243e] shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "scale-100 opacity-60 hover:opacity-100",
                      {
                        'bg-blue-500 border-blue-300': c === 'blue',
                        'bg-red-500 border-red-300': c === 'red',
                        'bg-green-500 border-green-300': c === 'green',
                        'bg-yellow-400 border-yellow-200': c === 'yellow',
                      }
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2.5 rounded-xl mb-4 text-sm flex justify-between items-center"
            >
              <span>{errorMessage}</span>
              <button onClick={clearError} className="text-red-300 hover:text-white ml-2 text-lg leading-none">×</button>
            </motion.div>
          )}

          {currentRoom ? (
            <div className="space-y-4">
              <div className="bg-black/30 p-5 rounded-2xl border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Room Code</p>
                <p className="text-4xl font-mono tracking-[0.3em] font-black text-yellow-300">{currentRoom}</p>
              </div>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-sm text-white/60"
              >
                Waiting for opponent…
              </motion.p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => createRoom(preferredColor)}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-green-600 rounded-2xl font-black text-lg shadow-[0_6px_20px_rgba(16,185,129,0.45)] transition-shadow active:scale-[0.98]"
              >
                🎲 Create Room
              </button>

              <div className="flex items-center gap-3 my-2 opacity-40">
                <hr className="flex-1 border-white/20" />
                <span className="text-xs font-bold">OR</span>
                <hr className="flex-1 border-white/20" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && joinRoom(joinCode, preferredColor)}
                  placeholder="Room Code"
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-3 uppercase tracking-widest outline-none focus:border-white/40 font-mono text-sm transition-colors placeholder:text-white/30"
                  maxLength={6}
                />
                <button
                  onClick={() => joinRoom(joinCode, preferredColor)}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 rounded-xl font-bold transition-colors border border-white/10 active:scale-[0.95]"
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

  // ── Game screen ─────────────────────────────────────────────────────────────
  const socketId     = useSocketStore.getState().socket?.id || '';
  const myPlayer     = gameState?.players.find(p => p.id === socketId || p.viewerId === sessionStorage.getItem('LUDO_VIEWER_ID'));
  const oppPlayer    = gameState?.players.find(p => p.id !== myPlayer?.id);
  const activePlayer = gameState?.players[gameState.currentTurn];
  const isMyTurn     = activePlayer?.id === myPlayer?.id;

  // ── Logical to Visual Color Mapping ──
  // Rule: You always see YOURSELF securely as 'blue' in the UI. 
  // The 'preferredColor' you pick in the lobby is instead shown to your opponent.
  const myLogicalColor = myPlayer?.color || 'blue';
  const oppLogicalColor = oppPlayer?.color || 'red';
  
  const myVisualColor = 'blue';
  let oppVisualColor = oppPlayer?.preferredColor || 'red';
  
  // Anti-collision fallback locally
  if (oppVisualColor === myVisualColor) {
    oppVisualColor = 'red';
  }

  const visualColorMap: Record<string, string> = {
    [myLogicalColor]: myVisualColor,
    [oppLogicalColor]: oppVisualColor,
  };

  const boardRotation = {
    blue: 0,
    red: -90,
    green: 180,
    yellow: 90
  }[myLogicalColor] || 0;

  const visualActiveColor = activePlayer ? (visualColorMap[activePlayer.color] || activePlayer.color) : 'blue';

  const turnDotClass = {
    red:    'bg-red-500 shadow-[0_0_10px_#ef4444]',
    green:  'bg-green-500 shadow-[0_0_10px_#22c55e]',
    blue:   'bg-blue-400 shadow-[0_0_10px_#60a5fa]',
    yellow: 'bg-yellow-400 shadow-[0_0_10px_#facc15]',
  }[visualActiveColor] ?? 'bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c72] via-[#2a5298] to-[#4a90e2] relative overflow-hidden flex flex-col items-center justify-center p-2 font-sans text-white">

      {/* ── Animated background pattern ──────────────────────────────────────── */}
      <motion.div
        animate={{ x: [-20, 20], y: [-20, 20] }}
        transition={{ repeat: Infinity, repeatType: 'mirror', duration: 22, ease: 'linear' }}
        className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rotate-[-12deg] scale-150"
      >
        <div className="grid grid-cols-5 gap-x-16 gap-y-28">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-10">
              <div className="w-16 h-16 bg-blue-600/40 rounded-2xl border border-blue-300/20 shadow-lg" />
              <div className="w-10 h-14 bg-blue-600/30 rounded-full border border-blue-300/20 opacity-60" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── TOP BAR ────────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={leaveRoom}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-red-500/80 rounded-xl border border-white/20 hover:border-red-400 text-xs font-semibold backdrop-blur-md transition-all shadow-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit
        </motion.button>

        <span className="pointer-events-auto font-mono text-[11px] bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 text-white/80 tracking-widest shadow-lg backdrop-blur-md">
          {currentRoom}
        </span>
      </div>

      {/* ── Game Over Overlay ─────────────────────────────────────────────────── */}
      {gameOverData && (
        <div className="absolute inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 border border-white/20 p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-sm w-full"
          >
            <motion.h2 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-5xl font-black mb-2 tracking-tighter uppercase italic bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent"
            >
              {gameOverData.winnerIndex === gameState?.players.indexOf(myPlayer as Player) ? "You Win!" : "You Lose!"}
            </motion.h2>
            
            <p className="text-white/60 mb-8 font-medium uppercase tracking-[0.2em] text-xs">
              {gameOverData.reason === 'opponent_left' ? 'Opponent Disconnected' : 'Match Finished'}
            </p>

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/30 active:scale-95 transition-transform uppercase tracking-widest text-sm"
            >
              Return to Lobby
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: boardRotation }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="relative z-20 w-full flex justify-center px-2 mt-4 mb-28" // Increased mb for bottom bar
      >
        <LudoBoard visualColorMap={visualColorMap} boardRotation={boardRotation} />
      </motion.div>

      {/* ── BOTTOM CONTROLS GRID ─────────────────────────────────────────────── */}
      <div className="absolute bottom-6 w-full max-w-md px-4 z-40 flex items-center justify-between pointer-events-none">
        
        {/* Helper function to rank players: local player on left, opponent on right */}
        {(() => {
          // If only P1 is there, just render him, else render P1 left, P2 right
          let leftPlayer = gameState.players[0];
          let rightPlayer = gameState.players[1];
          // Determine local player
          const localId = socketId;
          const localViewer = sessionStorage.getItem('LUDO_VIEWER_ID');
          const localIndex = gameState.players.findIndex(p => p.id === localId || p.viewerId === localViewer);
          if (localIndex > 0) {
            leftPlayer = gameState.players[localIndex];
            rightPlayer = gameState.players[0];
          }

          const renderProfile = (p: typeof leftPlayer) => {
            if (!p) return <div className="w-24 border border-transparent" />;
            const isTurn = gameState.currentTurn === gameState.players.indexOf(p);
            const vColor = (visualColorMap[p.color] || p.color) as PlayerColor;

            const bgGradient = vColor === 'red' ? 'from-red-600/60 to-red-900/60' : 
                               vColor === 'green' ? 'from-green-600/60 to-green-900/60' :
                               vColor === 'yellow' ? 'from-yellow-600/60 to-yellow-900/60' :
                               'from-blue-600/60 to-blue-900/60';
            
            const borderGlow = isTurn ? getPlayerGlowColor(vColor) : 'transparent';
            
            return (
              <motion.div
                animate={{
                  boxShadow: isTurn ? `0 0 20px ${borderGlow}, 0 4px 12px rgba(0,0,0,0.5)` : '0 4px 12px rgba(0,0,0,0.5)',
                  scale: isTurn ? 1.05 : 1
                }}
                className={cn(
                  'pointer-events-auto relative p-2 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all duration-300 w-[85px] bg-gradient-to-b backdrop-blur-md',
                  bgGradient,
                  isTurn ? 'border-white/60' : 'border-white/10 opacity-80'
                )}
              >
                {/* Timer Bar (Top of profile) */}
                {isTurn && gameState.timerEndTime && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-black/40 overflow-hidden rounded-t-2xl">
                    <motion.div
                      key={gameState.timerEndTime}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ 
                        duration: Math.max(0, (gameState.timerEndTime - Date.now()) / 1000), 
                        ease: 'linear' 
                      }}
                      className={cn("h-full", turnDotClass.split(' ')[0])}
                    />
                  </div>
                )}
                <div className="text-[10px] font-black uppercase text-white/90 truncate w-full text-center tracking-widest mt-0.5">
                  {p.id === 'CPU' ? 'CPU' : (p.id === localId || p.viewerId === localViewer) ? 'YOU' : `P${gameState.players.indexOf(p)+1}`}
                </div>
                <div className="w-12 h-12 bg-black/40 rounded-xl p-1.5 flex items-center justify-center border border-white/20">
                  <Token color={p.color} themeColor={vColor} className="scale-[1.8]" />
                </div>
              </motion.div>
            );
          };

          const gradient = getDiceTrayGradient(visualActiveColor as PlayerColor);
          const glowColor = getPlayerGlowColor(visualActiveColor as PlayerColor);
          
          const diceDisplayValue =
            lastDiceRoll
              ? lastDiceRoll.value
              : gameState.diceRolled
              ? (gameState.diceValue ?? 1)
              : 1;

          return (
            <>
              {renderProfile(leftPlayer)}

              {/* Central Dice */}
              <motion.div
                animate={{
                  boxShadow: [`0 10px 30px rgba(0,0,0,0.4)`, `0 14px 40px ${glowColor}`, `0 10px 30px rgba(0,0,0,0.4)`],
                  scale: 1.15,
                }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className={cn(
                  'pointer-events-auto p-2 rounded-3xl flex flex-col items-center gap-2 border-[3px] shadow-2xl backdrop-blur-md bg-white/20 border-white/80'
                )}
              >
                <div className={cn('p-3 rounded-2xl border-2 border-white/40 shadow-inner bg-gradient-to-br transition-colors duration-500', gradient)}>
                  <Dice
                    value={diceDisplayValue}
                    isRolling={rollingPlayerId != null}
                    onClick={
                      isMyTurn && !gameState.diceRolled
                        ? () => useSocketStore.getState().rollDice()
                        : undefined
                    }
                  />
                </div>
              </motion.div>

              {renderProfile(rightPlayer)}
            </>
          );
        })()}
      </div>

      {/* Subtle vignette gradients */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
    </div>
  );
}
