import { heroDefinitions } from "../data/heroData";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import { calculateReturnHealingAmount } from "./roomEffectSystem";

export function canRecoverSelectedWipedParty(state: GameState): boolean {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party || !run || run.status !== "wiped") {
    return false;
  }

  return getHeroesForParty(state, party.id).length > 0;
}

export function recoverSelectedWipedParty(state: GameState): GameState {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const now = Date.now();

  if (!party || !run || run.status !== "wiped") {
    return state;
  }

  const partyHeroes = getHeroesForParty(state, party.id);
  if (partyHeroes.length === 0) {
    return state;
  }

  const partyHeroIds = new Set(partyHeroes.map((hero) => hero.id));
  const recoveryAmount = getWipeRecoveryAmount(state);
  const safeTargetFloor = Math.max(1, Math.min(party.selectedTargetFloor ?? run.floor, state.unlockedFloor));

  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      partyHeroIds.has(hero.id)
        ? {
            ...hero,
            currentHp: calculateRecoveredHp(hero, recoveryAmount),
            status: "ready"
          }
        : hero
    ),
    parties: state.parties.map((candidate) =>
      candidate.id === party.id
        ? {
            ...candidate,
            selectedTargetFloor: safeTargetFloor
          }
        : candidate
    ),
    towerRuns: state.towerRuns.map((candidate) =>
      candidate.partyId === party.id
        ? {
            ...candidate,
            status: "preparing",
            floor: safeTargetFloor,
            nodeIndex: 0,
            nodeProgress: 0,
            enemies: [],
            heroCombatCooldowns: {},
            enemyCombatCooldowns: {},
            lastCombatEventMessage: "Party returned to the inn after a wipe.",
            combatStartedAt: null,
            lootBag: [],
            lastFailureReason: null,
            startedAt: now
          }
        : candidate
    ),
    automation: {
      ...state.automation,
      lastAutoDispatchAt: state.automation.autoDispatchLevel > 0 ? now : state.automation.lastAutoDispatchAt
    },
    recentEvents: appendRecentEvent(
      state.recentEvents,
      createRecoveryEvent(
        now,
        `${party.name} returned to the inn after being wiped and recovered ${recoveryAmount} HP.`,
        party.id,
        run.floor
      )
    ),
    lastActiveAt: now
  };
}

function getWipeRecoveryAmount(state: GameState): number {
  return Math.max(1, calculateReturnHealingAmount(state));
}

function calculateRecoveredHp(hero: HeroInstance, recoveryAmount: number): number {
  const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? Math.max(1, hero.currentHp, recoveryAmount);
  return Math.max(1, Math.min(maxHp, recoveryAmount));
}

function createRecoveryEvent(createdAt: number, message: string, partyId: string, floor: number): RecentEvent {
  return {
    id: `event_party_wipe_recovered_${partyId}_${createdAt}`,
    type: "party_wiped",
    createdAt,
    message,
    severity: "success",
    partyId,
    floor
  };
}
