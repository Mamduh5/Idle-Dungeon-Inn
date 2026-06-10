import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createInitialGameState } from "../../src/game/initialState";
import { handleInnSelectNextTrainingHero, handleInnTrainingAction, selectTrainingHero } from "../../src/application/innCommands";
import { getInnViewModel } from "../../src/viewModels/innViewModel";
import { getSelectedPartyDispatchBlockReason } from "../../src/systems/partyDispatchSystem";
import {
  assignHeroToBedHealingIfNeeded,
  assignHeroToTrainingRoom,
  getHeroActiveRoomJob,
  prepareReturnedHeroForInnRecovery,
  tickRoomJobs
} from "../../src/systems/roomJobSystem";
import { tickCombat } from "../../src/systems/combatSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import type { GameState } from "../../src/types/gameState";

const MIRA_ID = "hero_rookie_knight_1";
const LINA_ID = "hero_apprentice_archer_1";

test("Inn view model exposes unlocked and locked extra room cards", () => {
  const state = withRooms(createInitialGameState(), {
    kitchen: { isUnlocked: true, level: 1 },
    library: { isUnlocked: false, level: 0 },
    gate_room: { isUnlocked: true, level: 1 },
    forge: { isUnlocked: false, level: 0 },
    tavern: { isUnlocked: false, level: 0 }
  });
  const viewModel = getInnViewModel(state);
  const roomNames = viewModel.extraRooms.map((room) => room.name);

  expect(roomNames).toEqual(expect.arrayContaining(["Kitchen", "Library", "Gate Room", "Forge", "Tavern"]));
  expect(viewModel.extraRooms.find((room) => room.roomId === "kitchen")?.statusLabel).toBe("Unlocked");
  expect(viewModel.extraRooms.find((room) => room.roomId === "library")?.effectLabel).toContain("Automation research");
  expect(viewModel.extraRooms.find((room) => room.roomId === "forge")?.statusLabel).toMatch(/Unlock F|Future wing/);
});

test("InnScene has a render path for view-model driven extra room cards", () => {
  const source = readFileSync("src/scenes/InnScene.ts", "utf8");

  expect(source).toContain("this.drawExtraRoomCards(viewModel.extraRooms)");
  expect(source).toContain("private drawExtraRoomCard");
  expect(source).toContain("InnRoomCardViewModel");
});

test("Training Room selector starts the second ready hero instead of the first party hero", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const selectedState = handleInnSelectNextTrainingHero(state);
  const trainingState = handleInnTrainingAction(selectedState, selectedState.selectedTrainingHeroId);

  expect(selectedState.selectedTrainingHeroId).toBe(LINA_ID);
  expect(getHeroActiveRoomJob(trainingState, LINA_ID)?.jobType).toBe("training");
  expect(getHeroActiveRoomJob(trainingState, MIRA_ID)).toBeNull();
  expect(trainingState.heroes.find((hero) => hero.id === LINA_ID)?.status).toBe("training");
  expect(trainingState.heroes.find((hero) => hero.id === MIRA_ID)?.status).toBe("ready");
});

test("Training Room view model labels selected and active hero", () => {
  const selectedState = selectTrainingHero(unlockTrainingRoom(createInitialGameState(), 1), LINA_ID);
  const idleViewModel = getInnViewModel(selectedState);
  const trainingState = handleInnTrainingAction(selectedState, LINA_ID);
  const activeViewModel = getInnViewModel(trainingState);

  expect(idleViewModel.trainingRoom.selectorLabel).toBe("Target: Lina");
  expect(idleViewModel.trainingRoom.actionLabel).toBe("Train Lina");
  expect(activeViewModel.trainingRoom.assignmentLabel).toBe("Lina training");
  expect(activeViewModel.trainingRoom.actionLabel).toBe("Cancel Training");
});

test("Training job remains active and wraps XP after gaining one +ATK", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const tickedState = tickRoomJobs(state, 65_000, 66_000);
  const hero = tickedState.heroes.find((candidate) => candidate.id === MIRA_ID);

  expect(hero?.training.attackTrainingLevel).toBe(1);
  expect(hero?.training.attackTrainingXp).toBe(5);
  expect(hero?.status).toBe("training");
  expect(getHeroActiveRoomJob(tickedState, MIRA_ID)?.roomId).toBe("training_room");
  expect(getSelectedPartyDispatchBlockReason(tickedState)).toBe("Mira is training.");
});

test("Combat does not wipe a two-hero party while one hero remains alive", () => {
  const state = createTwoHeroCombatState();
  const tickedState = tickCombat(state, 2_000, 3_000);

  expect(tickedState.heroes.find((hero) => hero.id === MIRA_ID)?.currentHp).toBe(0);
  expect(tickedState.heroes.find((hero) => hero.id === MIRA_ID)?.status).toBe("defeated");
  expect(tickedState.heroes.find((hero) => hero.id === LINA_ID)?.currentHp).toBeGreaterThan(0);
  expect(tickedState.towerRuns[0]?.status).toBe("fighting");
});

test("Returned 0 HP hero becomes resting and healable by Bed Room", () => {
  const state = createReturnedCasualtyState();
  const recoveredState = prepareReturnedHeroForInnRecovery(state, MIRA_ID, 1000);
  const assignedState = assignHeroToBedHealingIfNeeded(recoveredState, MIRA_ID, 1000);
  const healedState = tickRoomJobs(assignedState, 5_000, 6_000);

  expect(assignedState.heroes.find((hero) => hero.id === MIRA_ID)?.currentHp).toBe(1);
  expect(assignedState.heroes.find((hero) => hero.id === MIRA_ID)?.status).toBe("resting");
  expect(getHeroActiveRoomJob(assignedState, MIRA_ID)?.jobType).toBe("healing");
  expect(healedState.heroes.find((hero) => hero.id === MIRA_ID)?.currentHp).toBeGreaterThan(1);
});

test("Bed Room picks next waiting low-HP hero when capacity opens", () => {
  const baseState = createInitialGameState();
  const waitingState = {
    ...baseState,
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: hero.id === MIRA_ID ? 105 : 20,
      status: "resting" as const
    }))
  };
  const assignedState = assignHeroToBedHealingIfNeeded(waitingState, MIRA_ID, 1000);
  const tickedState = tickRoomJobs(assignedState, 2_000, 3_000);

  expect(tickedState.heroes.find((hero) => hero.id === MIRA_ID)?.status).toBe("ready");
  expect(getHeroActiveRoomJob(tickedState, MIRA_ID)).toBeNull();
  expect(getHeroActiveRoomJob(tickedState, LINA_ID)?.jobType).toBe("healing");
});

test("Full wipe recovery still returns heroes to resting Bed Room recovery", () => {
  const wipedState = createWipedState();
  const recoveredState = recoverSelectedWipedParty(wipedState, 1000);

  expect(recoveredState.towerRuns[0]?.status).toBe("preparing");
  expect(recoveredState.heroes.every((hero) => hero.status === "resting")).toBe(true);
  expect(recoveredState.heroes.every((hero) => hero.currentHp >= 1)).toBe(true);
  expect(getSelectedPartyDispatchBlockReason(recoveredState)).toContain("resting");
});

function unlockTrainingRoom(state: GameState, level: number): GameState {
  return {
    ...state,
    innRooms: state.innRooms.map((room) =>
      room.roomId === "training_room"
        ? {
            ...room,
            isUnlocked: true,
            level,
            jobs: []
          }
        : room
    )
  };
}

function withRooms(
  state: GameState,
  roomPatch: Record<string, { isUnlocked: boolean; level: number }>
): GameState {
  return {
    ...state,
    unlockedFloor: 12,
    innRooms: state.innRooms.map((room) =>
      roomPatch[room.roomId]
        ? {
            ...room,
            ...roomPatch[room.roomId]
          }
        : room
    )
  };
}

function createTwoHeroCombatState(): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: hero.id === MIRA_ID ? 1 : hero.currentHp,
      status: "in_tower" as const
    })),
    towerRuns: state.towerRuns.map((run, index) =>
      index === 0
        ? {
            ...run,
            status: "fighting" as const,
            enemies: [
              {
                enemyId: "floor_10_gatekeeper",
                currentHp: 128,
                status: "active" as const
              }
            ],
            combatStartedAt: 1_000,
            heroCombatCooldowns: {},
            enemyCombatCooldowns: {}
          }
        : run
    )
  };
}

function createReturnedCasualtyState(): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      hero.id === MIRA_ID
        ? {
            ...hero,
            currentHp: 0,
            status: "defeated" as const
          }
        : hero
    )
  };
}

function createWipedState(): GameState {
  const state = createInitialGameState();
  const now = Date.now();

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated" as const
    })),
    towerRuns: state.towerRuns.map((run, index) =>
      index === 0
        ? {
            ...run,
            status: "wiped" as const,
            floor: 6,
            enemies: [],
            lastFailureReason: "Party wiped.",
            lastCombatEventMessage: "Party wiped.",
            startedAt: now
          }
        : run
    )
  };
}
