console.log('Home Screen Logic Ready');
/**
 * home.js — Ludobaazi Home Screen Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnCreate = document.getElementById('btn-create-room');
  const btnPlayAi = document.getElementById('btn-play-ai');
  const btnJoin = document.getElementById('btn-join-room');
  const inputCode = document.getElementById('input-room-code');
  const roomCodeBox = document.getElementById('room-code-box');
  const roomCodeDisplay = document.getElementById('room-code-display');
  const btnCopy = document.getElementById('btn-copy-code');
  const joinError = document.getElementById('join-error');
  
  // Handle Create Room
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      btnCreate.innerHTML = '<span>✦</span> Creating...';
      btnCreate.disabled = true;
      if (btnPlayAi) btnPlayAi.disabled = true;
      GameSocket.createRoom();
    });
  }

  // Handle Play vs Computer
  if (btnPlayAi) {
    btnPlayAi.addEventListener('click', () => {
      btnPlayAi.innerHTML = '<span>🤖</span> Starting...';
      btnPlayAi.disabled = true;
      if (btnCreate) btnCreate.disabled = true;
      GameSocket.playAiGame();
    });
  }
  
  // Handle Join Room
  if (btnJoin) {
    btnJoin.addEventListener('click', () => {
      const code = inputCode.value.trim().toUpperCase();
      if (code.length === 6) {
        GameSocket.joinRoom(code);
      } else {
        showError('Please enter a valid 6-char code.');
      }
    });
  }
  
  // Handle Enter key on input
  if (inputCode) {
    inputCode.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') btnJoin.click();
    });
  }
  
  // Handle Copy Code
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const code = roomCodeDisplay.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        btnCopy.style.borderColor = '#047857';
        btnCopy.style.color = '#047857';
        setTimeout(() => {
          btnCopy.textContent = originalText;
          btnCopy.style.borderColor = '';
          btnCopy.style.color = '';
        }, 2000);
      });
    });
  }
  
  // Export methods for socket.js to call
  window.Home = {
    onRoomCreated: (code) => {
      roomCodeDisplay.textContent = code;
      roomCodeBox.classList.add('visible');
      btnCreate.classList.add('hidden');
    },
    showError: (message) => {
      joinError.textContent = message;
      joinError.classList.add('visible');
      setTimeout(() => joinError.classList.remove('visible'), 3000);
    }
  };
});

function showError(message) {
  const joinError = document.getElementById('join-error');
  if (joinError) {
    joinError.textContent = message;
    joinError.classList.add('visible');
    setTimeout(() => joinError.classList.remove('visible'), 3000);
  }
}
