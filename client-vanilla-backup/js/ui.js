/**
 * ui.js — Ludo King Interactive UI Logic
 */

const DICE_ICON_MAP = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
};

const UI = {
  init() {
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
      btnRoll.onclick = () => {
        if (window.GameSocket) window.GameSocket.rollDice();
      };
    }
    
    document.querySelectorAll('.btn-play-again').forEach(btn => {
      btn.onclick = () => window.location.reload();
    });
    
    const btnExit = document.getElementById('btn-exit-room');
    if (btnExit) {
      btnExit.onclick = () => {
        if (window.GameSocket) window.GameSocket.leaveRoom();
      };
    }
  },

  animateDice(value, callback) {
    const diceFace = document.getElementById('dice-face');
    const diceIcon = document.getElementById('dice-icon');
    const diceLabel = document.getElementById('dice-value-label');
    
    if (!diceFace || !diceIcon) return;
    
    diceFace.classList.add('rolling');
    diceIcon.textContent = '🎲';
    diceLabel.textContent = 'ROLLING...';
    
    setTimeout(() => {
      diceFace.classList.remove('rolling');
      diceIcon.textContent = DICE_ICON_MAP[value] || '🎲';
      diceLabel.textContent = `RESULT: ${value}`;
      if (callback) callback();
    }, 600);
  },

  updateTurnIndicator(gameState, playerIndex) {
    const currentTurn = gameState.currentTurn;
    const activePlayer = gameState.players[currentTurn];
    const isMyTurn = currentTurn === playerIndex;
    
    const turnText = document.getElementById('turn-text');
    const turnDot = document.getElementById('turn-dot');
    
    if (turnDot) {
      turnDot.className = `status-dot ${activePlayer.color}`;
      turnDot.style.color = `var(--br-${activePlayer.color})`;
    }

    if (turnText) {
      if (isMyTurn) {
        turnText.textContent = "YOUR TURN!";
        turnText.style.color = '#fde047';
      } else {
        const colorName = activePlayer.color.toUpperCase();
        if (activePlayer.id === 'CPU') {
          turnText.textContent = `COMPUTER (${colorName}) THINKS...`;
        } else {
          turnText.textContent = `${colorName}’S TURN`;
        }
        turnText.style.color = 'white';
      }
    }

    // Highlight player panels & progress bars
    gameState.players.forEach((p, idx) => {
        const panel = document.getElementById(`panel-player${idx}`);
        if (panel) {
            panel.classList.toggle('active-turn', idx === currentTurn);
        }
        
        // Update home progress bar
        const homeCount = p.tokens.filter(t => t.state === 'HOME').length;
        const progressFill = document.getElementById(`progress-${p.color}`);
        const countText = document.getElementById(`home-count-${p.color}`);
        
        if (progressFill) progressFill.style.width = `${(homeCount / 4) * 100}%`;
        if (countText) countText.textContent = `${homeCount}/4`;
    });

    // Update Roll Button
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
        const canRoll = isMyTurn && !gameState.diceRolled && gameState.status === 'playing';
        btnRoll.disabled = !canRoll;
        btnRoll.textContent = canRoll ? 'ROLL NOW' : 'WAIT...';
    }
  },

  showWinner(winnerIndex, winnerColor) {
    const modal = document.getElementById('winner-modal');
    const title = document.getElementById('winner-title');
    const sub = document.getElementById('winner-sub');
    
    if (modal && title && sub) {
      const colorName = winnerColor.toUpperCase();
      title.textContent = `${colorName} VICTORY!`;
      sub.textContent = `PLAYER ${winnerIndex + 1} HAS CONQUERED THE BOARD!`;
      modal.classList.add('visible');
      modal.style.display = 'flex';
      this.createConfetti();
    }
  },

  createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#00AEEF', '#ED1C24', '#00A651', '#FFF200'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 3 + 's';
      piece.style.width = Math.random() * 10 + 5 + 'px';
      piece.style.height = Math.random() * 10 + 5 + 'px';
      container.appendChild(piece);
    }
  }
};

window.UI = UI;
