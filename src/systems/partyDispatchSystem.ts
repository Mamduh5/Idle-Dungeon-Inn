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
import { getHeroActiveRoomJob, getHeroReadyHpThreshold, isHeroDispatchReady } from "./roomJobSystem";

interface DispatchOptions {
  now?: number;
  eventType?: RecentEvent["type"];
  createMessage?: (partyName: string, targetFloor: number) => string;
}

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

export function getSelectedPartyDispatchBlockReason(state: GameState): string | null {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party) {
    return "No selected party is available.";
  }

  if (!run) {
    return `${party.name} does not have a tower run yet.`;
  }

  const heroes = getHeroesForParty(state, party.id);

  if (heroes.length === 0) {
    return `${party.name} needs at least one hero.`;
  }

  if (ACTIVE_TOWER_STATUSES.includes(run.status)) {
    return `${party.name} is already in the tower.`;
  }

  const unavailableHero = heroes.find((hero) => UNAVAILABLE_HERO_STATUSES.includes(hero.status));

  if (unavailableHero) {
    return `${unavailableHero.name} is ${formatStatus(unavailableHero.status)}.`;
  }

  const lowHpHero = heroes.find((hero) => hero.currentHp < getHeroReadyHpThreshold(hero));
  if (lowHpHero) {
    return `${lowHpHero.name} needs ${getHeroReadyHpThreshold(lowHpHero)} HP before dispatch.`;
  }

  const busyHero = heroes.find((hero) => getHeroActiveRoomJob(state, hero.id) !== null);
  if (busyHero) {
    return `${busyHero.name} is preparing in a room job.`;
  }

  const notReadyHero = heroes.find((hero) => !isHeroDispatchReady(state, hero));
  if (notReadyHero) {
    return `${notReadyHero.name} is not ready.`;
  }

  return null;
}

export function canDispatchSelectedParty(state: GameState): boolean {
  return getSelectedPartyDispatchBlockReason(state) === null;
}

export function sendSelectedPartyToTower(state: GameState, options: DispatchOptions = {}): GameState {
  const blockReason = getSelectedPartyDispatchBlockReason(state);
  const now = options.now ?? Date.now();

  if (blockReason) {
    return withEvent(state, createWarningEvent(now, blockReason));
  }

  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party || !run) {
    return state;
  }

  const targetFloor = Math.max(1, Math.min(party.selectedTargetFloor || run.floor, state.unlockedFloor));
  const eventType = options.eventType ?? "party_dispatched";
  const message = options.createMessage?.(party.name, targetFloor) ?? `${party.name} left for Floor ${targetFloor}.`;

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
            heroCombatCooldowns: {},
            enemyCombatCooldowns: {},
            lastCombatEventMessage: null,
            combatStartedAt: null,
            lootBag: [],
            lastFailureReason: null,
            startedAt: now
          }
        : candidate
    ),
    recentEvents: appendRecentEvent(
      state.recentEvents,
      {
        id: `event_${eventType}_${now}`,
        type: eventType,
        createdAt: now,
        message,
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
