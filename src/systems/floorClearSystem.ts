import { prototypeTowerFloors } from "../data/towerData";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import { FLOOR_CLEAR_HOLD_REASON } from "./towerNodeActionSystem";
import type { GameState } from "../types/gameState";
import type { PartyState } from "../types/partyTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import type { TowerRunState } from "../types/towerTypes";

export function canCompleteSelectedFloor(state: GameState): boolean {
  const run = getSelectedTowerRun(state);

  if (!run || run.status !== "blocked" || run.lastFailureReason !== FLOOR_CLEAR_HOLD_REASON) {
    return false;
  }

  const node = prototypeTowerFloors.find((floor) => floor.floor === run.floor)?.nodes[run.nodeIndex];
  return node?.type === "exit";
}

export function completeSelectedFloor(state: GameState): GameState {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const now = Date.now();

  if (!party || !run) {
    return state;
  }

  if (!canCompleteSelectedFloor(state)) {
    return {
      ...state,
      recentEvents: appendRecentEvent(
        state.recentEvents,
        createEvent(now, "floor_clear_blocked", `${party.name} cannot complete a floor right now.`, "warning", party, run)
      ),
      lastActiveAt: now
    };
  }

  const currentFloor = run.floor;
  const nextFloor = currentFloor + 1;
  const partyHeroIds = new Set(getHeroesForParty(state, party.id).map((hero) => hero.id));
  const firstClearFloorIds = state.firstClearFloorIds.includes(currentFloor)
    ? state.firstClearFloorIds
    : [...state.firstClearFloorIds, currentFloor];

  return {
    ...state,
    highestFloorCleared: Math.max(state.highestFloorCleared, currentFloor),
    firstClearFloorIds,
    unlockedFloor: Math.max(state.unlockedFloor, nextFloor),
    parties: state.parties.map((candidate) =>
      candidate.id === party.id
        ? {
            ...candidate,
            selectedTargetFloor: nextFloor
          }
        : candidate
    ),
    towerRuns: state.towerRuns.map((candidate) =>
      candidate.partyId === party.id
        ? {
            ...candidate,
            status: "preparing",
            floor: nextFloor,
            nodeIndex: 0,
            nodeProgress: 0,
            enemies: [],
            lootBag: [],
            heroCombatCooldowns: {},
            enemyCombatCooldowns: {},
            lastCombatEventMessage: "Floor cleared. Party returned to the inn.",
            combatStartedAt: null,
            lastFailureReason: null,
            startedAt: now
          }
        : candidate
    ),
    heroes: state.heroes.map((hero) =>
      partyHeroIds.has(hero.id)
        ? {
            ...hero,
            status: hero.currentHp > 0 ? "ready" : "defeated"
          }
        : hero
    ),
    recentEvents: appendRecentEvent(
      state.recentEvents,
      createEvent(
        now,
        "floor_cleared",
        `${party.name} cleared Floor ${currentFloor} and returned to the inn. Rewards are not implemented yet.`,
        "success",
        party,
        run
      )
    ),
    lastActiveAt: now
  };
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
