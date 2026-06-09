import type { GameState } from "../types/gameState";
import { tickAutomation } from "./automationSystem";
import { tickCombat } from "./combatSystem";
import { tickRoomJobs } from "./roomJobSystem";
import { tickTowerRuns } from "./towerRunSystem";

export function tickGameState(state: GameState, deltaMs: number, now: number): GameState {
  return tickAutomation(tickRoomJobs(tickCombat(tickTowerRuns(state, deltaMs, now), deltaMs, now), deltaMs, now), now);
}
