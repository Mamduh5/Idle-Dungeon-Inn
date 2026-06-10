import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { getInnViewModel } from "../../src/application/innViewModel";
import {
  handleInnCancelTrainingAction,
  handleInnSendSelectedParty,
  handleInnToggleAutoDispatch,
  handleInnTrainAction,
  handleInnTrainingAction
} from "../../src/application/innCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { getInnReadinessRenderKey } from "../../src/ui/innRenderKey";
import { tickGameState } from "../../src/systems/gameTickSystem";
import { assignHeroToBedHealingIfNeeded, getHeroActiveRoomJob } from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";

test("Inn view model returns Bed Room display data without Phaser", () => {
  const state = createInitialGameState();
  const viewModel = getInnViewModel(state);

  expect(viewModel.bedRoom.levelLabel).toBe("Lv 1");
  expect(viewModel.bedRoom.healingSpeedLabel).toBe("Heal 2 HP/s");
  expect(viewModel.bedRoom.capacityLabel).toBe("Capacity 1");
  expect(viewModel.bedRoom.heroStatusLabel).toBe("Mira Ready");
  expect(viewModel.hero?.hpLabel).toBe("HP 120/120");
});

test("Inn view model returns Training Room display data without Phaser", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const viewModel = getInnViewModel(state);

  expect(viewModel.trainingRoom.isUnlocked).toBe(true);
  expect(viewModel.trainingRoom.levelLabel).toBe("Lv 1");
  expect(viewModel.trainingRoom.speedLabel).toBe("Train 1 XP/s");
  expect(viewModel.trainingRoom.actionLabel).toBe("Train Mira");
  expect(viewModel.trainingRoom.targetHeroId).toBe("hero_rookie_knight_1");
});

test("Inn training command creates and cancels training via GameState only", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedState = handleInnTrainAction(state);
  const activeJob = getHeroActiveRoomJob(trainedState, "hero_rookie_knight_1");

  expect(trainedState.heroes[0]?.status).toBe("training");
  expect(activeJob?.roomId).toBe("training_room");
  expect(activeJob?.jobType).toBe("training");
  expect(getInnViewModel(trainedState).trainingRoom.isCancelAction).toBe(true);

  const cancelledState = handleInnCancelTrainingAction(trainedState);
  expect(getHeroActiveRoomJob(cancelledState, "hero_rookie_knight_1")).toBeNull();
  expect(cancelledState.heroes[0]?.status).toBe("ready");
});

test("Inn dispatch command uses strict readiness and does not bypass low HP", () => {
  const state = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "ready" as const
    }))
  };
  const viewModel = getInnViewModel(state);
  const attemptedState = handleInnSendSelectedParty(state);

  expect(viewModel.gate.actionEnabled).toBe(false);
  expect(viewModel.gate.actionLabel).toBe("Party Not Ready");
  expect(attemptedState.towerRuns[0]?.status).toBe("preparing");
  expect(attemptedState.recentEvents[0]?.message).toContain("needs 108 HP");
});

test("Inn auto-dispatch command toggles through application boundary", () => {
  const state = {
    ...createInitialGameState(),
    automation: {
      ...createInitialGameState().automation,
      autoDispatchLevel: 1
    }
  };
  const toggledState = handleInnToggleAutoDispatch(state);

  expect(getInnViewModel(state).autoDispatch.label).toBe("Auto: OFF");
  expect(getInnViewModel(toggledState).autoDispatch.label).toBe("Auto: ON");
  expect(toggledState.recentEvents[0]?.message).toBe("Auto-Dispatch turned ON.");
});

test("Inn view model has no scene or camera dependency", () => {
  const source = readFileSync("src/application/innViewModel.ts", "utf8");
  const viewModel = getInnViewModel(unlockTrainingRoom(createInitialGameState(), 1));

  expect(source).not.toContain("Phaser");
  expect(source).not.toContain("camera");
  expect(source).not.toContain("Scene");
  expect(viewModel.trainingRoom.actionEnabled).toBe(true);
});

test("Passive tick does not require Inn scene restart key churn", () => {
  const state = handleInnTrainingAction(unlockTrainingRoom(createInitialGameState(), 1));
  const beforeKey = getInnReadinessRenderKey(state);
  const tickedState = tickGameState(state, 10_000, Date.now() + 10_000);

  expect(tickedState.heroes[0]?.training.attackTrainingXp).toBeGreaterThan(state.heroes[0]?.training.attackTrainingXp ?? 0);
  expect(getInnReadinessRenderKey(tickedState)).toBe(beforeKey);
});

test("Training Room label stays data-driven for future heroes", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: unlockTrainingRoom(createInitialGameState(), 1).heroes.map((hero, index) =>
      index === 0
        ? {
            ...hero,
            status: "in_tower" as const
          }
        : {
            ...hero,
            name: "Niko"
          }
    )
  };
  const viewModel = getInnViewModel(state);

  expect(viewModel.trainingRoom.actionLabel).toBe("Train Niko");
  expect(viewModel.trainingRoom.targetHeroId).toBe("hero_apprentice_archer_1");
});

test("Bed Room readiness remains strict through view model and commands", () => {
  const restingState = assignHeroToBedHealingIfNeeded(createRestingState(40), "hero_rookie_knight_1", 1000);
  const viewModel = getInnViewModel(restingState);
  const dispatchAttempt = handleInnSendSelectedParty(restingState);

  expect(viewModel.bedRoom.heroStatusLabel).toBe("Mira resting");
  expect(viewModel.bedRoom.heroStatusIsActive).toBe(true);
  expect(viewModel.gate.actionEnabled).toBe(false);
  expect(dispatchAttempt.heroes[0]?.status).toBe("resting");
  expect(dispatchAttempt.towerRuns[0]?.status).toBe("preparing");
});

test("Application and view-model files stay Phaser-free", () => {
  for (const filePath of [
    "src/application/innCommands.ts",
    "src/application/innViewModel.ts",
    "src/ui/trainingRoomText.ts",
    "src/ui/heroDisplayText.ts",
    "src/ui/innRenderKey.ts",
    "src/ui/innCameraScroll.ts"
  ]) {
    expect(readFileSync(filePath, "utf8"), filePath).not.toContain("from \"phaser\"");
    expect(readFileSync(filePath, "utf8"), filePath).not.toContain("from 'phaser'");
  }
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

function createRestingState(currentHp: number): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp,
      status: "resting" as const
    }))
  };
}
