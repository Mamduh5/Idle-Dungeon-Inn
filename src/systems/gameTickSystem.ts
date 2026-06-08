import type { GameState } from "../types/gameState";
import { tickTowerRuns } from "./towerRunSystem";

export function tickGameState(state: GameState, deltaMs: number, now: number): GameState {
  return tickTowerRuns(state, deltaMs, now);
}
