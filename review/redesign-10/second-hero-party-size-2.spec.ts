import { expect, test } from "@playwright/test";
import { sendSelectedPartyFromInn } from "../../src/application/innCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { tickCombat } from "../../src/systems/combatSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import {
  assignHeroToBedHealingIfNeeded,
  getHeroActiveRoomJob,
  getHeroReadyHpThreshold,
  startHeroTrainingDrill,
  tickRoomJobs
} from "../../src/systems/roomJobSystem";
import { getPartyViewModel } from "../../src/viewModels/partyViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";
import type { HeroId } from "../../src/types/ids";

test("new games start with a knight, an archer, and a size-2 starter party", () => {
  const state = createInitialGameState();
  const party = state.parties[0];
  const partyViewModel = getPartyViewModel(state);
  const towerViewModel = getTowerViewModel(state);

  expect(state.heroes.map((hero) => [hero.name, hero.classId])).toEqual([
    ["Mira", "rookie_knight"],
    ["Lina", "apprentice_archer"]
  ]);
  expect(party?.maxSize).toBe(2);
  expect(party?.heroIds).toEqual(["hero_rookie_knight_1", "hero_apprentice_archer_1"]);
  expect(partyViewModel.parties[0]?.heroCountLabel).toBe("2/2");
  expect(partyViewModel.slots.map((slot) => slot.label)).toEqual(["Mira", "Lina"]);
  expect(towerViewModel.heroes.map((hero) => hero.name)).toEqual(["Mira", "Lina"]);
});

test("old v1 saves normalize in the second starter hero without a version bump", () => {
  const baseState = createInitialGameState();
  const legacyState = {
    ...baseState,
    heroes: [baseState.heroes[0]],
    parties: baseState.parties.map((party) => ({
      ...party,
      heroIds: ["hero_rookie_knight_1"]
    }))
  };
  const normalized = normalizeLoadedGameState(legacyState);

  expect(normalized?.version).toBe(1);
  expect(normalized?.heroes.map((hero) => hero.id)).toEqual(["hero_rookie_knight_1", "hero_apprentice_archer_1"]);
  expect(normalized?.parties[0]?.heroIds).toEqual(["hero_rookie_knight_1", "hero_apprentice_archer_1"]);
});

test("dispatch readiness requires both party heroes to be ready", () => {
  const state = createInitialGameState();
  const archer = state.heroes[1];
  const lowHpState: GameState = {
    ...state,
    heroes: state.heroes.map((hero) =>
      hero.id === archer.id
        ? {
            ...hero,
            currentHp: 20,
            status: "ready" as const
          }
        : hero
    )
  };
  const attemptedState = sendSelectedPartyFromInn(lowHpState, 1000);

  expect(getPartyViewModel(lowHpState).canDispatch).toBe(false);
  expect(getPartyViewModel(lowHpState).dispatchBlockedReason).toBe(`Lina needs ${getHeroReadyHpThreshold(archer)} HP before dispatch.`);
  expect(attemptedState.towerRuns[0]?.status).toBe("preparing");
  expect(attemptedState.recentEvents[0]?.message).toContain("Lina needs");
});

test("tower combat includes both assigned heroes", () => {
  const state = createInitialGameState();
  const singleHeroState = createFightingState(state, ["hero_rookie_knight_1"]);
  const dualHeroState = createFightingState(state, ["hero_rookie_knight_1", "hero_apprentice_archer_1"]);

  const singleHeroTick = tickCombat(singleHeroState, 1000, 2000);
  const dualHeroTick = tickCombat(dualHeroState, 1000, 2000);
  const singleEnemyHp = singleHeroTick.towerRuns[0]?.enemies[0]?.currentHp ?? 0;
  const dualEnemyHp = dualHeroTick.towerRuns[0]?.enemies[0]?.currentHp ?? 0;

  expect(dualEnemyHp).toBeLessThan(singleEnemyHp);
  expect(dualHeroTick.towerRuns[0]?.lastCombatEventMessage).toContain("Lina hit Cave Slime");
});

test("training one hero does not train the other", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedState = startHeroTrainingDrill(state, "hero_apprentice_archer_1", 1000);
  const tickedState = tickRoomJobs(trainedState, 10_000, 11_000);

  expect(getHeroActiveRoomJob(trainedState, "hero_apprentice_archer_1")?.jobType).toBe("training");
  expect(tickedState.heroes.find((hero) => hero.id === "hero_apprentice_archer_1")?.training.attackTrainingXp).toBe(10);
  expect(tickedState.heroes.find((hero) => hero.id === "hero_rookie_knight_1")?.training.attackTrainingXp).toBe(0);
});

test("Bed Room healing one hero does not heal the other unless assigned", () => {
  const state: GameState = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "resting" as const
    }))
  };
  const healingState = assignHeroToBedHealingIfNeeded(state, "hero_rookie_knight_1", 1000);
  const tickedState = tickRoomJobs(healingState, 10_000, 11_000);

  expect(getHeroActiveRoomJob(healingState, "hero_rookie_knight_1")?.roomId).toBe("bed_room");
  expect(tickedState.heroes.find((hero) => hero.id === "hero_rookie_knight_1")?.currentHp).toBe(60);
  expect(tickedState.heroes.find((hero) => hero.id === "hero_apprentice_archer_1")?.currentHp).toBe(40);
});

test("wipe recovery handles both party heroes", () => {
  const wipedState: GameState = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated" as const
    })),
    towerRuns: createInitialGameState().towerRuns.map((run) => ({
      ...run,
      status: "wiped" as const,
      floor: 6,
      lastFailureReason: "Party wiped.",
      lastCombatEventMessage: "Party wiped. Return to the inn."
    }))
  };
  const recoveredState = recoverSelectedWipedParty(wipedState, 5000);

  expect(recoveredState.towerRuns[0]?.status).toBe("preparing");
  expect(recoveredState.heroes.map((hero) => [hero.name, hero.currentHp, hero.status])).toEqual([
    ["Mira", 1, "resting"],
    ["Lina", 1, "resting"]
  ]);
});

function unlockTrainingRoom(state: GameState, level: number): GameState {
  return {
    ...state,
    innRooms: state.innRooms.map((room) =>
      room.roomId === "training_room"
        ? {
            ...room,
            level,
            isUnlocked: true,
            jobs: []
          }
        : room
    )
  };
}

function createFightingState(state: GameState, heroIds: HeroId[]): GameState {
  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      status: heroIds.includes(hero.id) ? ("in_tower" as const) : hero.status
    })),
    parties: state.parties.map((party) =>
      party.id === "party_lantern"
        ? {
            ...party,
            heroIds
          }
        : party
    ),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "fighting" as const,
      enemies: [
        {
          enemyId: "cave_slime",
          currentHp: 45,
          status: "active" as const
        }
      ],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      combatStartedAt: 1000,
      lastCombatEventMessage: "Combat running."
    }))
  };
}
