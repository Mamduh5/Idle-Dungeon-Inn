import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  cancelTrainingFromInn,
  sendSelectedPartyFromInn,
  startTrainingFromInn
} from "../../src/application/innCommands";
import { purchaseRoomUpgradeFromBuild } from "../../src/application/buildCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { getInnReadinessRenderKey } from "../../src/ui/innRenderKey";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import { getHeroesViewModel } from "../../src/viewModels/heroesViewModel";
import { getInnViewModel } from "../../src/viewModels/innViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import { tickGameState } from "../../src/systems/gameTickSystem";
import { assignHeroToBedHealingIfNeeded, getHeroActiveRoomJob } from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";

test("all Phase 1 view models generate display data without Phaser", () => {
  const state = createInitialGameState();

  expect(getInnViewModel(state).bedRoom.healingSpeedLabel).toBe("Heal 2 HP/s");
  expect(getHeroesViewModel(state).roster[0]?.hpLabel).toBe("HP 120/120");
  expect(getBuildViewModel(state).roomPlans.map((room) => room.title)).toEqual([
    "Bed Room",
    "Training Room",
    "Kitchen",
    "Forge",
    "Tavern",
    "Library",
    "Gate Room"
  ]);
  expect(getTowerViewModel(state).message).toBe("Party is preparing at the inn.");

  for (const filePath of [
    "src/viewModels/innViewModel.ts",
    "src/viewModels/heroesViewModel.ts",
    "src/viewModels/buildViewModel.ts",
    "src/viewModels/towerViewModel.ts",
    "src/application/innCommands.ts",
    "src/application/buildCommands.ts",
    "src/application/towerCommands.ts"
  ]) {
    const source = readFileSync(filePath, "utf8");
    expect(source, filePath).not.toContain("from \"phaser\"");
    expect(source, filePath).not.toContain("from 'phaser'");
  }
});

test("Inn training commands start and cancel through GameState only", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedState = startTrainingFromInn(state, null, 1000);
  const activeJob = getHeroActiveRoomJob(trainedState, "hero_rookie_knight_1");

  expect(trainedState.heroes[0]?.status).toBe("training");
  expect(activeJob?.roomId).toBe("training_room");
  expect(activeJob?.jobType).toBe("training");

  const cancelledState = cancelTrainingFromInn(trainedState, null, 2000);
  expect(getHeroActiveRoomJob(cancelledState, "hero_rookie_knight_1")).toBeNull();
  expect(cancelledState.heroes[0]?.status).toBe("ready");
});

test("default training target is data-driven and not hardcoded to Mira", () => {
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
  const trainedState = startTrainingFromInn(state, null, 3000);

  expect(viewModel.trainingRoom.actionLabel).toBe("Train Niko");
  expect(viewModel.trainingRoom.targetHeroId).toBe("hero_apprentice_archer_1");
  expect(getHeroActiveRoomJob(trainedState, "hero_apprentice_archer_1")?.jobType).toBe("training");
  expect(readFileSync("src/application/innCommands.ts", "utf8")).not.toContain("Mira");
});

test("dispatch command preserves strict low-HP readiness", () => {
  const state = {
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "ready" as const
    }))
  };
  const viewModel = getInnViewModel(state);
  const attemptedState = sendSelectedPartyFromInn(state, 4000);

  expect(viewModel.gate.actionEnabled).toBe(false);
  expect(viewModel.gate.actionLabel).toBe("Party Not Ready");
  expect(attemptedState.towerRuns[0]?.status).toBe("preparing");
  expect(attemptedState.recentEvents[0]?.message).toContain("needs 108 HP");
});

test("Build upgrade command preserves room cost and currency semantics", () => {
  const state = {
    ...createInitialGameState(),
    currencies: {
      coins: 25
    }
  };
  const upgradedState = purchaseRoomUpgradeFromBuild(state, "bed_room", 5000);
  const bedRoom = upgradedState.innRooms.find((room) => room.roomId === "bed_room");

  expect(bedRoom?.level).toBe(2);
  expect(upgradedState.currencies.coins).toBe(0);
  expect(upgradedState.recentEvents[0]?.message).toContain("Bed Room upgraded to Lv 2");
});

test("Bed Room and per-hero Training Room semantics are visible in view models", () => {
  const restingState = assignHeroToBedHealingIfNeeded(createRestingState(40), "hero_rookie_knight_1", 1000);
  const trainingState = startTrainingFromInn(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const innViewModel = getInnViewModel(restingState);
  const heroesViewModel = getHeroesViewModel(trainingState);
  const buildViewModel = getBuildViewModel(trainingState);

  expect(innViewModel.bedRoom.heroStatusLabel).toBe("Mira resting");
  expect(innViewModel.bedRoom.readyHpLabel).toBe("Ready at 108 HP");
  expect(heroesViewModel.roster[0]?.trainingBonusLabel).toContain("Training +");
  expect(heroesViewModel.roster[0]?.statusLabel).toBe("Training");
  expect(buildViewModel.trainingRoomCopy).toContain("No global attack aura.");
});

test("application commands do not depend on view models", () => {
  for (const filePath of [
    "src/application/innCommands.ts",
    "src/application/buildCommands.ts",
    "src/application/towerCommands.ts"
  ]) {
    const source = readFileSync(filePath, "utf8");
    expect(source, filePath).not.toContain("../viewModels");
    expect(source, filePath).not.toContain("./innViewModel");
  }
});

test("InnScene update keeps passive ticks restart-free", () => {
  const source = readFileSync("src/scenes/InnScene.ts", "utf8");
  const updateBody = source.match(/public update[\s\S]*?\n  \}/)?.[0] ?? "";
  const state = startTrainingFromInn(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const beforeKey = getInnReadinessRenderKey(state);
  const tickedState = tickGameState(state, 10_000, 11_000);

  expect(updateBody).not.toContain("restart");
  expect(tickedState.heroes[0]?.training.attackTrainingXp).toBeGreaterThan(state.heroes[0]?.training.attackTrainingXp ?? 0);
  expect(getInnReadinessRenderKey(tickedState)).toBe(beforeKey);
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
