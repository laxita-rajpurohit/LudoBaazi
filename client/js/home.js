/**
 * home.js — Ludobaazi Home Screen Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnCreate = document.getElementById('btn-create-room');
    const btnPlayAi = document.getElementById('btn-play-ai');
    const btnJoin   = document.getElementById('btn-join-room');
    const inputCode = document.getElementById('input-room-code');
    const roomCodeBox = document.getElementById('room-code-box');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const btnCopy = document.getElementById('btn-copy-code');
    const joinError = document.getElementById('join-error');

    if (btnCreate) {
        btnCreate.onclick = () => {
            btnCreate.disabled = true;
            btnCreate.innerText = 'CREATING...';
            window.GameSocket.createRoom();
        };
    }

    if (btnPlayAi) {
        btnPlayAi.onclick = () => {
            btnPlayAi.disabled = true;
            btnPlayAi.innerText = 'STARTING...';
            window.GameSocket.playAiGame();
        };
    }

    if (btnJoin) {
        btnJoin.onclick = () => {
            const code = inputCode.value.trim().toUpperCase();
            if (code.length === 6) {
                window.GameSocket.joinRoom(code);
            } else {
                window.Home.showError('Enter a valid 6-char code.');
            }
        };
    }

    if (btnCopy) {
        btnCopy.onclick = () => {
            navigator.clipboard.writeText(roomCodeDisplay.innerText).then(() => {
                btnCopy.innerText = 'COPIED!';
                setTimeout(() => btnCopy.innerText = 'Copy & Invite', 2000);
            });
        };
    }

    window.Home = {
        onRoomCreated: (code) => {
            roomCodeDisplay.innerText = code;
            roomCodeBox.classList.remove('hidden');
            btnCreate.classList.add('hidden');
        },
        showError: (msg) => {
            if (joinError) {
                joinError.innerText = msg;
                joinError.style.display = 'block';
                setTimeout(() => joinError.style.display = 'none', 3000);
            }
        }
    };
});
