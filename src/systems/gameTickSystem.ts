import type { GameState } from "../types/gameState";
import { capRecentEvents } from "../state/recentEvents";
import { tickAutomation } from "./automationSystem";
import { tickCombat } from "./combatSystem";
import { tickRoomJobs } from "./roomJobSystem";
import { tickTowerRuns } from "./towerRunSystem";

export function tickGameState(state: GameState, deltaMs: number, now: number): GameState {
  let nextState = state;
  nextState = tickTowerRuns(nextState, deltaMs, now);
  nextState = tickCombat(nextState, deltaMs, now);
  nextState = tickRoomJobs(nextState, deltaMs, now);
  nextState = tickAutomation(nextState, now);

  if (nextState.recentEvents.length > 20) {
    return {
      ...nextState,
      recentEvents: capRecentEvents(nextState.recentEvents)
    };
  }

  return nextState;
}
