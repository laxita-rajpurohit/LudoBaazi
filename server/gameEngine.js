/**
 * gameEngine.js — Production-grade Ludo Engine
 * Single source of truth for Ludo rules, moves, and state updates.
 */

const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const TOTAL_CELLS = 52;
const STEPS_TO_HOME_PATH = 51;
const TOTAL_STEPS = 57; // 51 path + 5 home cells + 1 finish

const PLAYER_CONFIG = {
  blue:   { startIndex: 0,  color: 'blue' },
  red:    { startIndex: 13, color: 'red' },
  green:  { startIndex: 26, color: 'green' },
  yellow: { startIndex: 39, color: 'yellow' }
};

class GameEngine {
  /**
   * Create a new Ludo game state
   */
  static createGame(gameId, players) {
    const gameState = {
      gameId,
      players: players.map((p, idx) => ({
        id: p.id,
        color: p.color,
        startIndex: PLAYER_CONFIG[p.color].startIndex,
        tokens: Array.from({ length: 4 }, (_, i) => ({
          id: `${p.color}_${i}`,
          playerId: p.id,
          state: 'BASE',
          position: -1,
          stepsMoved: 0
        }))
      })),
      currentTurn: 0,
      diceValue: null,
      status: 'playing',
      winner: null,
      moveHistory: [],
      diceRolled: false
    };
    return gameState;
  }

  /**
   * Roll the dice (Server Only)
   */
  static rollDice() {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Get valid tokens that can move for the current player
   */
  static getValidMoves(gameState, diceValue) {
    const player = gameState.players[gameState.currentTurn];
    const validTokenIds = [];

    player.tokens.forEach(token => {
      const canMove = this.isValidMove(gameState, token.id, diceValue);
      if (canMove) {
        validTokenIds.push(token.id);
      }
    });

    return validTokenIds;
  }

  /**
   * Check if a specific token can move with the given dice value
   */
  static isValidMove(gameState, tokenId, diceValue) {
    const player = gameState.players[gameState.currentTurn];
    const token = player.tokens.find(t => t.id === tokenId);

    if (!token || token.state === 'HOME') return false;

    // RULE: Token moves from BASE → startIndex only if dice = 6
    if (token.state === 'BASE') {
      return diceValue === 6;
    }

    // RULE: Exactly index 5 (stepsMoved 57) required for home
    if (token.stepsMoved + diceValue > TOTAL_STEPS) {
      return false;
    }

    // RULE: Check for opponent blocks
    const nextStepsMoved = token.stepsMoved + diceValue;
    if (nextStepsMoved <= STEPS_TO_HOME_PATH) {
      // It's on the main path. Check if it jumps over a block.
      // Note: Ludo rules vary on whether you can jump a block or not.
      // Prompt says: "Opponent cannot pass through [a block]"
      for (let s = 1; s <= diceValue; s++) {
        const intermediateSteps = token.stepsMoved + s;
        if (intermediateSteps > STEPS_TO_HOME_PATH) break;

        const intermediatePos = (player.startIndex + intermediateSteps - 1) % TOTAL_CELLS;
        if (this.isBlocked(gameState, intermediatePos, player.id)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a global position is blocked by an opponent
   */
  static isBlocked(gameState, globalPosition, currentPlayerId) {
    for (const player of gameState.players) {
      if (player.id === currentPlayerId) continue;

      const tokensOnCell = player.tokens.filter(t => 
        t.state === 'ACTIVE' && t.position === globalPosition
      );

      if (tokensOnCell.length >= 2) {
        return true; // Blocked!
      }
    }
    return false;
  }

  /**
   * Apply move to the game state
   */
  static applyMove(gameState, tokenId, diceValue) {
    const player = gameState.players[gameState.currentTurn];
    const token = player.tokens.find(t => t.id === tokenId);
    
    let extraTurn = diceValue === 6;
    let logMessage = `${player.color} moved token ${tokenId}`;

    if (token.state === 'BASE') {
      token.state = 'ACTIVE';
      token.position = player.startIndex;
      token.stepsMoved = 1;
      logMessage = `${player.color} unlocked token ${tokenId}`;
    } else {
      token.stepsMoved += diceValue;
      
      if (token.stepsMoved > STEPS_TO_HOME_PATH) {
        // Enters Home Path
        token.state = 'ACTIVE'; // Still active but on home path
        const homeIndex = token.stepsMoved - 52; // 52, 53, 54, 55, 56, 57 -> 0, 1, 2, 3, 4, 5
        
        if (token.stepsMoved === TOTAL_STEPS) {
          token.state = 'HOME';
          token.position = 5;
          extraTurn = true; // Extra turn for reaching home
          logMessage = `${player.color} reached HOME with ${tokenId}`;
        } else {
          token.position = homeIndex;
        }
      } else {
        // Move on global path
        token.position = (player.startIndex + token.stepsMoved - 1) % TOTAL_CELLS;
        
        // KILL LOGIC
        const killed = this.handleKill(gameState, token.position, player.id);
        if (killed) {
          extraTurn = true;
          logMessage += ` and KILLED an opponent token!`;
        }
      }
    }

    // Check Win Condition
    const allHome = player.tokens.every(t => t.state === 'HOME');
    if (allHome) {
      gameState.status = 'finished';
      gameState.winner = gameState.currentTurn;
      logMessage = `${player.color} wins the game!`;
    }

    // Log update
    gameState.moveHistory.push({
      playerIndex: gameState.currentTurn,
      color: player.color,
      diceValue,
      tokenId,
      message: logMessage,
      timestamp: Date.now()
    });

    // Handle Turn Change
    if (!extraTurn && gameState.status !== 'finished') {
       gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
    }

    // Reset dice state
    gameState.diceValue = null;
    gameState.diceRolled = false;

    return { gameState, extraTurn, logMessage };
  }

  /**
   * Check and handle killing of opponent tokens
   */
  static handleKill(gameState, position, attackerPlayerId) {
    // Tokens on SAFE CELLS cannot be killed
    if (SAFE_CELLS.has(position)) return false;

    let killed = false;
    for (const player of gameState.players) {
      if (player.id === attackerPlayerId) continue;

      // Rule: Stacked tokens (blocks) cannot be killed
      const opponentTokensOnCell = player.tokens.filter(t => 
        t.state === 'ACTIVE' && t.position === position && t.stepsMoved <= STEPS_TO_HOME_PATH
      );

      if (opponentTokensOnCell.length === 1) {
        // Only 1 token, can be killed
        const victim = opponentTokensOnCell[0];
        victim.state = 'BASE';
        victim.position = -1;
        victim.stepsMoved = 0;
        killed = true;
      }
    }
    return killed;
  }
}

module.exports = GameEngine;
