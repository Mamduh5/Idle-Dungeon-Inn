import { prototypeTowerFloors } from "../data/towerData";
import { getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { PartyState } from "../types/partyTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import type { TowerRunState } from "../types/towerTypes";

export const ENCOUNTER_CLEAR_HOLD_REASON = "Encounter cleared. Node advancement is not implemented yet.";
export const TREASURE_HOLD_REASON = "Treasure found. Rewards are not implemented yet.";
export const FLOOR_CLEAR_HOLD_REASON = "Floor clear is not implemented yet.";

export function continueSelectedTowerRun(state: GameState, now = Date.now()): GameState {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party || !run) {
    return state;
  }

  if (!canContinueTowerRun(run)) {
    return {
      ...state,
      recentEvents: appendRecentEvent(
        state.recentEvents,
        createEvent(now, "tower_node_continue_blocked", `${party.name} cannot continue right now.`, "warning", party, run)
      ),
      lastActiveAt: now
    };
  }

  const floor = prototypeTowerFloors.find((candidate) => candidate.floor === run.floor);
  const nextNodeIndex = run.nodeIndex + 1;
  const nextNode = floor?.nodes[nextNodeIndex];

  if (!nextNode) {
    return {
      ...state,
      towerRuns: state.towerRuns.map((candidate) =>
        candidate.partyId === run.partyId
          ? {
              ...candidate,
              status: "blocked",
              nodeProgress: 1,
              lastFailureReason: "No next node is available. Floor clear is not implemented yet.",
              lastCombatEventMessage: "No next node is available."
            }
          : candidate
      ),
      recentEvents: appendRecentEvent(
        state.recentEvents,
        createEvent(
          now,
          "tower_node_continue_blocked",
          `${party.name} could not find another node. Floor clear is not implemented yet.`,
          "warning",
          party,
          run
        )
      ),
      lastActiveAt: now
    };
  }

  return {
    ...state,
    towerRuns: state.towerRuns.map((candidate) =>
      candidate.partyId === run.partyId
        ? {
            ...candidate,
            status: "exploring",
            nodeIndex: nextNodeIndex,
            nodeProgress: 0,
            enemies: [],
            heroCombatCooldowns: {},
            enemyCombatCooldowns: {},
            lastCombatEventMessage: "Moving to the next node.",
            combatStartedAt: null,
            lastFailureReason: null
          }
        : candidate
    ),
    recentEvents: appendRecentEvent(
      state.recentEvents,
      createEvent(now, "tower_node_continued", `${party.name} moved to the next tower node.`, "info", party, run)
    ),
    lastActiveAt: now
  };
}

export function canContinueTowerRun(run: TowerRunState | null): boolean {
  if (!run || run.status === "wiped") {
    return false;
  }

  if (run.status === "looting" && run.lastFailureReason === TREASURE_HOLD_REASON) {
    return true;
  }

  if (run.status !== "blocked") {
    return false;
  }

  return run.lastFailureReason === ENCOUNTER_CLEAR_HOLD_REASON && run.enemies.every((enemy) => enemy.status === "defeated");
}

function createEvent(
  createdAt: number,
  type: RecentEvent["type"],
  message: string,
  severity: RecentEvent["severity"],
  party: PartyState,
  run: TowerRunState
): RecentEvent {
  return {
    id: `event_${type}_${party.id}_${createdAt}`,
    type,
    createdAt,
    message,
    severity,
    partyId: party.id,
    floor: run.floor
  };
}
