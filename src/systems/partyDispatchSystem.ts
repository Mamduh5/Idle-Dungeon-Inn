import {
  getHeroesForParty,
  getSelectedParty,
  getSelectedTowerRun
} from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { HeroStatus } from "../types/ids";
import type { RecentEvent } from "../types/recentEventTypes";
import type { TowerRunStatus } from "../types/towerTypes";

const ACTIVE_TOWER_STATUSES: TowerRunStatus[] = [
  "traveling",
  "exploring",
  "fighting",
  "looting",
  "retreating",
  "boss_ready"
];

const UNAVAILABLE_HERO_STATUSES: HeroStatus[] = [
  "defeated",
  "wounded",
  "in_tower",
  "resting",
  "eating",
  "training",
  "gearing"
];

export function sendSelectedPartyToTower(state: GameState): GameState {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const now = Date.now();

  if (!party) {
    return withEvent(state, createWarningEvent(now, "No selected party is available."));
  }

  if (!run) {
    return withEvent(state, createWarningEvent(now, `${party.name} does not have a tower run yet.`));
  }

  const heroes = getHeroesForParty(state, party.id);

  if (heroes.length === 0) {
    return withEvent(state, createWarningEvent(now, `${party.name} needs at least one hero.`));
  }

  if (ACTIVE_TOWER_STATUSES.includes(run.status)) {
    return withEvent(state, createWarningEvent(now, `${party.name} is already in the tower.`));
  }

  const unavailableHero = heroes.find((hero) => UNAVAILABLE_HERO_STATUSES.includes(hero.status));

  if (unavailableHero) {
    return withEvent(
      state,
      createWarningEvent(now, `${unavailableHero.name} is ${formatStatus(unavailableHero.status)}.`)
    );
  }

  const targetFloor = Math.max(1, Math.min(party.selectedTargetFloor || run.floor, state.unlockedFloor));

  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      party.heroIds.includes(hero.id)
        ? {
            ...hero,
            status: "in_tower"
          }
        : hero
    ),
    towerRuns: state.towerRuns.map((candidate) =>
      candidate.partyId === party.id
        ? {
            ...candidate,
            status: "traveling",
            floor: targetFloor,
            nodeIndex: 0,
            nodeProgress: 0,
            enemies: [],
            lootBag: [],
            lastFailureReason: null,
            startedAt: now
          }
        : candidate
    ),
    recentEvents: appendRecentEvent(
      state.recentEvents,
      {
        id: `event_party_dispatched_${now}`,
        type: "party_dispatched",
        createdAt: now,
        message: `${party.name} left for Floor ${targetFloor}.`,
        severity: "success",
        partyId: party.id,
        floor: targetFloor
      }
    ),
    lastActiveAt: now
  };
}

function withEvent(state: GameState, event: RecentEvent): GameState {
  return {
    ...state,
    recentEvents: appendRecentEvent(state.recentEvents, event),
    lastActiveAt: event.createdAt
  };
}

function createWarningEvent(createdAt: number, message: string): RecentEvent {
  return {
    id: `event_dispatch_blocked_${createdAt}`,
    type: "party_dispatch_blocked",
    createdAt,
    message,
    severity: "warning"
  };
}

function formatStatus(status: HeroStatus): string {
  return status.split("_").join(" ");
}
