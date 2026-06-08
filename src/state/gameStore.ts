import { createInitialGameState } from "../game/initialState";
import type { GameState } from "../types/gameState";

let currentGameState: GameState = createInitialGameState();

export function getGameState(): GameState {
  return currentGameState;
}

export function setGameState(nextState: GameState): void {
  currentGameState = nextState;
}

export function updateGameState(updater: (state: GameState) => GameState): GameState {
  currentGameState = updater(currentGameState);
  return currentGameState;
}

export function resetGameStateForDev(): GameState {
  currentGameState = createInitialGameState();
  return currentGameState;
}
