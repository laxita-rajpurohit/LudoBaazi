console.log('UI Library Ready');
/**
 * ui.js — Ludobaazi UI State & Animations
 */

const DICE_ICON_MAP = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅'
};

const UI = {
  init() {
    // Add event listeners for buttons
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
      btnRoll.onclick = () => {
        GameSocket.rollDice();
      };
    }
    
    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
      btnPlayAgain.onclick = () => {
        window.location.reload(); // Simple way to reset state in SPA
      };
    }
    
    const btnExit = document.getElementById('btn-exit-room');
    if (btnExit) {
      btnExit.onclick = () => {
        if (window.GameSocket) {
          window.GameSocket.leaveRoom();
        }
      };
    }
  },

  animateDice(value, callback) {
    const diceFace = document.getElementById('dice-face');
    const diceIcon = document.getElementById('dice-icon');
    const diceLabel = document.getElementById('dice-value-label');
    
    if (!diceFace || !diceIcon) return;
    
    diceFace.classList.add('rolling');
    diceIcon.textContent = '🎲'; // Generic dice during roll
    
    // Animate label
    diceLabel.textContent = 'Rolling...';
    
    setTimeout(() => {
      diceFace.classList.remove('rolling');
      diceIcon.textContent = DICE_ICON_MAP[value] || '🎲';
      diceLabel.textContent = `You rolled ${value}!`;
      
      if (callback) callback();
    }, 600);
  },

  setDiceRolling(isRolling) {
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
      btnRoll.disabled = isRolling;
      if (isRolling) btnRoll.textContent = 'Rolling...';
      else btnRoll.textContent = 'Roll Dice';
    }
  },

  updateTurnIndicator(gameState, isMyTurn) {
    const turnIndex = gameState.currentTurn;
    const isAI = gameState.isAI === true;
    
    const turnDot = document.getElementById('turn-dot');
    const turnText = document.getElementById('turn-text');
    const panel0 = document.getElementById('panel-player0');
    const panel1 = document.getElementById('panel-player1');
    
    // Safety check for turnIndex
    const safeTurnIndex = turnIndex === 0 ? 0 : 1;
    const colorName = safeTurnIndex === 0 ? 'Green' : 'Red';
    const colorClass = safeTurnIndex === 0 ? 'green' : 'red';
    
    if (turnDot) {
      turnDot.className = `turn-dot ${colorClass}`;
    }
    
    if (turnText) {
      if (isMyTurn) {
        turnText.textContent = "Your turn!";
        turnText.classList.add('pulse');
      } else {
        turnText.classList.remove('pulse');
        if (isAI && safeTurnIndex === 1) {
          turnText.textContent = "Computer is Thinking...";
        } else {
          turnText.textContent = `${colorName}'s turn`;
        }
      }
    }
    
    // Highlight panels
    if (panel0) panel0.classList.toggle('active-turn', safeTurnIndex === 0);
    if (panel1) panel1.classList.toggle('active-turn', safeTurnIndex === 1);
  },

  setRollButtonEnabled(enabled) {
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
      btnRoll.disabled = !enabled;
      btnRoll.textContent = enabled ? 'Roll Dice' : (enabled === false ? 'Wait for Turn' : 'Roll Dice');
      if (enabled) btnRoll.classList.add('pulse');
      else btnRoll.classList.remove('pulse');
    }
  },

  showWinner(winnerIndex, winnerColor) {
    const modal = document.getElementById('winner-modal');
    const title = document.getElementById('winner-title');
    const sub = document.getElementById('winner-sub');
    
    if (modal && title && sub) {
      const colorName = winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1);
      title.textContent = `${colorName} Wins!`;
      sub.textContent = `Player ${winnerIndex + 1} dominated the board.`;
      modal.classList.add('visible');
      this.createConfetti();
    }
  },

  showDisconnect() {
    const modal = document.getElementById('disconnect-modal');
    if (modal) {
      modal.classList.add('visible');
    }
  },

  createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    const colors = ['#10B981', '#34D399', '#EF4444', '#F87171', '#F59E0B', '#3B82F6'];
    
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(piece);
    }
  }
};

window.UI = UI;
