import { createInitialGameState } from "../game/initialState";
import type { GameState } from "../types/gameState";
import { clearSavedGameState, loadSavedGameState, saveGameState } from "./saveStorage";

const SAVE_THROTTLE_MS = 1000;

let currentGameState: GameState = loadSavedGameState() ?? createInitialGameState();
let lastSavedAt = 0;
let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function getGameState(): GameState {
  return currentGameState;
}

export function setGameState(nextState: GameState): void {
  currentGameState = nextState;
  persistNow(currentGameState);
}

export function updateGameState(updater: (state: GameState) => GameState): GameState {
  const previousState = currentGameState;
  currentGameState = updater(currentGameState);

  if (currentGameState !== previousState) {
    persistThrottled(currentGameState);
  }

  return currentGameState;
}

export function resetGameStateForDev(): GameState {
  currentGameState = createInitialGameState();
  persistNow(currentGameState);
  return currentGameState;
}

export function clearSavedGameStateForDev(): GameState {
  clearSavedGameState();
  currentGameState = createInitialGameState();
  return currentGameState;
}

function persistNow(state: GameState): void {
  clearPendingSave();
  saveGameState(state);
  lastSavedAt = Date.now();
}

function persistThrottled(state: GameState): void {
  const now = Date.now();

  if (now - lastSavedAt >= SAVE_THROTTLE_MS) {
    persistNow(state);
    return;
  }

  if (pendingSaveTimer !== null) {
    return;
  }

  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null;
    saveGameState(currentGameState);
    lastSavedAt = Date.now();
  }, SAVE_THROTTLE_MS - (now - lastSavedAt));
}

function clearPendingSave(): void {
  if (pendingSaveTimer === null) {
    return;
  }

  clearTimeout(pendingSaveTimer);
  pendingSaveTimer = null;
}
