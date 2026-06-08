import type { GameState } from "../types/gameState";
import { tickCombat } from "./combatSystem";
import { tickTowerRuns } from "./towerRunSystem";

export function tickGameState(state: GameState, deltaMs: number, now: number): GameState {
  return tickCombat(tickTowerRuns(state, deltaMs, now), deltaMs, now);
}
