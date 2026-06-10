import { heroDefinitions } from "../data/heroData";
import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import { getBottleneckHintForRun } from "./bottleneckHintSystem";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { RecentEvent } from "../types/recentEventTypes";
import { updateHeroReadinessAfterInnReturn } from "./roomJobSystem";

export function canRecoverSelectedWipedParty(state: GameState): boolean {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party || !run || run.status !== "wiped") {
    return false;
  }

  return getHeroesForParty(state, party.id).length > 0;
}

export function recoverSelectedWipedParty(state: GameState, now = Date.now()): GameState {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);

  if (!party || !run || run.status !== "wiped") {
    return state;
  }

  const partyHeroes = getHeroesForParty(state, party.id);
  if (partyHeroes.length === 0) {
    return state;
  }

  const partyHeroIds = new Set(partyHeroes.map((hero) => hero.id));
  const safeTargetFloor = Math.max(1, Math.min(party.selectedTargetFloor ?? run.floor, state.unlockedFloor));
  const bottleneckHint = getBottleneckHintForRun(run);
  const recoveredState: GameState = {
    ...state,
    heroes: state.heroes.map((hero) =>
      partyHeroIds.has(hero.id)
        ? {
            ...hero,
            currentHp: calculateRecoveredHp(hero),
            status: "resting" as const
          }
        : hero
    )
  };
  const readinessState = updateHeroReadinessAfterInnReturn(recoveredState, [...partyHeroIds], now);

  return {
    ...readinessState,
    parties: readinessState.parties.map((candidate) =>
      candidate.id === party.id
        ? {
            ...candidate,
            selectedTargetFloor: safeTargetFloor
          }
        : candidate
    ),
    towerRuns: readinessState.towerRuns.map((candidate) =>
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
            lastFailureReason: bottleneckHint,
            startedAt: now
          }
        : candidate
    ),
    automation: {
      ...readinessState.automation,
      lastAutoDispatchAt: readinessState.automation.autoDispatchLevel > 0 ? now : readinessState.automation.lastAutoDispatchAt
    },
    recentEvents: appendRecentEvent(
      readinessState.recentEvents,
      createRecoveryEvent(
        now,
        createRecoveryMessage(party.name, bottleneckHint),
        party.id,
        run.floor
      )
    ),
    lastActiveAt: now
  };
}

function calculateRecoveredHp(hero: HeroInstance): number {
  const maxHp = heroDefinitions[hero.classId]?.baseStats.hp ?? Math.max(1, hero.currentHp);
  return Math.max(1, Math.min(maxHp, hero.currentHp));
}

function createRecoveryMessage(partyName: string, bottleneckHint: string | null): string {
  const baseMessage = `${partyName} returned to the inn after being wiped. Heroes are resting until ready.`;

  if (!bottleneckHint) {
    return baseMessage;
  }

  return `${baseMessage} ${bottleneckHint}`;
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
