import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { handleInnTrainingAction, selectTrainingHeroFromInn } from "../../src/application/innCommands";
import { getInnViewModel } from "../../src/viewModels/innViewModel";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { getSelectedPartyDispatchBlockReason } from "../../src/systems/partyDispatchSystem";
import {
  assignHeroToBedHealingIfNeeded,
  cancelHeroTrainingDrill,
  getHeroActiveRoomJob,
  isHeroInActiveTowerRun,
  prepareReturnedHeroForInnRecovery,
  startHeroTrainingDrill,
  tickRoomJobs
} from "../../src/systems/roomJobSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import { tickGameState } from "../../src/systems/gameTickSystem";
import type { GameState } from "../../src/types/gameState";

test("Inn view model exposes compact cards for extra inn rooms", () => {
  const state = {
    ...createInitialGameState(),
    innRooms: createInitialGameState().innRooms.map((room) =>
      room.roomId === "kitchen"
        ? {
            ...room,
            isUnlocked: true,
            level: 1
          }
        : room
    )
  };

  const cards = getInnViewModel(state).extraRooms;

  expect(cards.map((card) => card.roomId)).toEqual(["kitchen", "forge", "tavern", "library", "gate_room"]);
  expect(cards.find((card) => card.roomId === "kitchen")?.statusLabel).toBe("Unlocked");
  expect(cards.find((card) => card.roomId === "library")?.statusLabel).toContain("future");
  expect(cards.find((card) => card.roomId === "forge")?.effectLabel).toContain("coming soon");
});

test("training continues past one attack level until canceled", () => {
  const startedState = startHeroTrainingDrill(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const tickedState = tickRoomJobs(startedState, 70_000, 71_000);
  const trainedHero = tickedState.heroes[0];

  expect(trainedHero?.training.attackTrainingLevel).toBe(1);
  expect(trainedHero?.training.attackTrainingXp).toBe(10);
  expect(trainedHero?.status).toBe("training");
  expect(getHeroActiveRoomJob(tickedState, "hero_rookie_knight_1")?.jobType).toBe("training");

  const cancelledState = cancelHeroTrainingDrill(tickedState, "hero_rookie_knight_1", 72_000);

  expect(cancelledState.heroes[0]?.training.attackTrainingLevel).toBe(1);
  expect(cancelledState.heroes[0]?.training.attackTrainingXp).toBe(10);
  expect(cancelledState.heroes[0]?.status).toBe("ready");
  expect(getHeroActiveRoomJob(cancelledState, "hero_rookie_knight_1")).toBeNull();
});

test("Training Room selector starts the selected second hero", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero, index) => ({
      ...hero,
      name: index === 0 ? "First Hero" : "Second Hero"
    })),
    selectedTrainingHeroId: "hero_apprentice_archer_1"
  };

  const viewModel = getInnViewModel(state).trainingRoom;
  const trainedState = handleInnTrainingAction(state, viewModel.targetHeroId);

  expect(viewModel.targetLabel).toBe("Target: Second Hero");
  expect(viewModel.previousHeroId).toBe("hero_rookie_knight_1");
  expect(viewModel.nextHeroId).toBe("hero_rookie_knight_1");
  expect(trainedState.heroes[1]?.status).toBe("training");
  expect(trainedState.heroes[0]?.status).toBe("ready");
  expect(getHeroActiveRoomJob(trainedState, "hero_apprentice_archer_1")?.jobType).toBe("training");

  const activeViewModel = getInnViewModel(trainedState).trainingRoom;
  expect(activeViewModel.targetLabel).toBe("Target: Second Hero");
  expect(activeViewModel.actionLabel).toBe("Cancel Training");
  expect(activeViewModel.selectorEnabled).toBe(false);
});

test("selected training hero persists through selection command and normalizes safely", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const selectedState = selectTrainingHeroFromInn(state, "hero_apprentice_archer_1");
  const normalized = normalizeLoadedGameState({
    ...selectedState,
    selectedTrainingHeroId: "missing_hero"
  });

  expect(selectedState.selectedTrainingHeroId).toBe("hero_apprentice_archer_1");
  expect(normalized?.selectedTrainingHeroId).toBe("hero_rookie_knight_1");
  expect(getInnViewModel(normalized ?? state).trainingRoom.targetHeroId).toBe("hero_rookie_knight_1");
});

test("active tower casualty is not assigned to Bed Room during ticks", () => {
  const state = createActiveFightingRunWithOneCasualty();

  const roomTickState = tickRoomJobs(state, 5_000, 6_000);
  const gameTickState = tickGameState(state, 5_000, 6_000);
  const manualBedAttempt = assignHeroToBedHealingIfNeeded(state, "hero_rookie_knight_1", 6_000);

  expect(isHeroInActiveTowerRun(state, "hero_rookie_knight_1")).toBe(true);
  expect(getHeroActiveRoomJob(roomTickState, "hero_rookie_knight_1")).toBeNull();
  expect(getHeroActiveRoomJob(gameTickState, "hero_rookie_knight_1")).toBeNull();
  expect(getHeroActiveRoomJob(manualBedAttempt, "hero_rookie_knight_1")).toBeNull();
  expect(roomTickState.heroes[0]?.status).toBe("defeated");
});

test("explicit returned zero HP hero becomes recoverable in Bed Room", () => {
  const returnedState = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero, index) =>
      index === 0
        ? {
            ...hero,
            currentHp: 0,
            status: "defeated" as const
          }
        : hero
    )
  };

  const recoveryState = prepareReturnedHeroForInnRecovery(returnedState, "hero_rookie_knight_1", 1000);

  expect(recoveryState.heroes[0]?.currentHp).toBe(1);
  expect(recoveryState.heroes[0]?.status).toBe("resting");
  expect(getHeroActiveRoomJob(recoveryState, "hero_rookie_knight_1")?.roomId).toBe("bed_room");
});

test("full wipe recovery still returns party to inn and dispatch stays blocked", () => {
  const recoveredState = recoverSelectedWipedParty(createWipedState(createInitialGameState()), 1000);

  expect(recoveredState.towerRuns[0]?.status).toBe("preparing");
  expect(recoveredState.heroes.every((hero) => hero.status === "resting")).toBe(true);
  expect(recoveredState.heroes.every((hero) => hero.currentHp >= 1)).toBe(true);
  expect(getHeroActiveRoomJob(recoveredState, "hero_rookie_knight_1")?.roomId).toBe("bed_room");
  expect(getSelectedPartyDispatchBlockReason(recoveredState)).toContain("resting");
});

test("dispatch remains blocked while any party hero is unavailable", () => {
  expect(getSelectedPartyDispatchBlockReason(withHeroStatus("defeated"))).toContain("defeated");
  expect(getSelectedPartyDispatchBlockReason(withHeroStatus("resting"))).toContain("resting");
  expect(getSelectedPartyDispatchBlockReason(withHeroStatus("training"))).toContain("training");
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

function createActiveFightingRunWithOneCasualty(): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero, index) =>
      index === 0
        ? {
            ...hero,
            currentHp: 0,
            status: "defeated" as const
          }
        : {
            ...hero,
            status: "in_tower" as const
          }
    ),
    towerRuns: state.towerRuns.map((run, index) =>
      index === 0
        ? {
            ...run,
            status: "fighting" as const,
            enemies: [
              {
                enemyId: "ember_wisp",
                currentHp: 18,
                status: "active" as const
              }
            ],
            combatStartedAt: 1000
          }
        : run
    )
  };
}

function createWipedState(state: GameState): GameState {
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
            floor: 3,
            lastFailureReason: "Party wiped."
          }
        : run
    )
  };
}

function withHeroStatus(status: "defeated" | "resting" | "training"): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero, index) =>
      index === 0
        ? {
            ...hero,
            currentHp: status === "defeated" ? 0 : hero.currentHp,
            status
          }
        : hero
    )
  };
}
