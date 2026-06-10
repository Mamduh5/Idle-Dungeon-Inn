import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { purchaseRoomUpgradeFromBuild } from "../../src/application/buildCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import type { GameState } from "../../src/types/gameState";

test("Build view model groups strategic choice cards by category", () => {
  const viewModel = getBuildViewModel(createInitialGameState());

  expect(viewModel.choiceCategories.map((category) => category.category)).toEqual([
    "Sustain",
    "Training",
    "Automation",
    "Tank",
    "Fast Clear",
    "Loot"
  ]);
  expect(viewModel.choiceCategories.flatMap((category) => category.cards).map((card) => card.title)).toEqual([
    "Bed Room",
    "Training Room",
    "Library",
    "Auto-Dispatch Board",
    "Forge",
    "Tavern",
    "Gate Room",
    "Kitchen"
  ]);
});

test("Build cards explain current real systems without global aura copy", () => {
  const cards = getBuildViewModel(createInitialGameState()).choiceCategories.flatMap((category) => category.cards);
  const bedCard = cards.find((card) => card.targetRoomId === "bed_room");
  const trainingCard = cards.find((card) => card.targetRoomId === "training_room");
  const tankCard = cards.find((card) => card.title === "Forge");

  expect(bedCard?.category).toBe("Sustain");
  expect(bedCard?.description).toContain("Recover wounded heroes");
  expect(bedCard?.gameplayEffect).toContain("retry pacing");
  expect(trainingCard?.category).toBe("Training");
  expect(trainingCard?.description).toContain("selected heroes");
  expect(trainingCard?.gameplayEffect).toContain("no global aura");
  expect(tankCard?.blockedReason).toBe("Reach Floor 12");
});

test("bottleneck recommendation highlights Bed Room and Training Room cards", () => {
  const viewModel = getBuildViewModel(createFloor20WipeState());
  const cards = viewModel.choiceCategories.flatMap((category) => category.cards);

  expect(viewModel.bottleneckCallout?.title).toBe("Floor 20 bottleneck");
  expect(cards.find((card) => card.targetRoomId === "bed_room")?.recommendationBadge).toBe("Recommended");
  expect(cards.find((card) => card.targetRoomId === "training_room")?.recommendationBadge).toBe("Recommended");
  expect(cards.find((card) => card.category === "Automation")?.recommendationBadge).toBeNull();
});

test("purchase command updates room level and currency safely", () => {
  const state: GameState = {
    ...createInitialGameState(),
    unlockedFloor: 2,
    currencies: {
      coins: 25
    }
  };
  const upgradedState = purchaseRoomUpgradeFromBuild(state, "bed_room", 2000);
  const blockedState = purchaseRoomUpgradeFromBuild(upgradedState, "training_room", 3000);

  expect(upgradedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(upgradedState.currencies.coins).toBe(0);
  expect(blockedState.innRooms.find((room) => room.roomId === "training_room")?.isUnlocked).toBe(false);
  expect(blockedState.recentEvents[0]?.message).toContain("Training Room needs 60 coins");
});

test("BuildScene consumes choice categories and build commands", () => {
  const source = readBuildSceneSource();

  expect(source).toContain("choiceCategories");
  expect(source).toContain("purchaseRoomUpgradeFromBuild");
  expect(source).toContain("toggleAutoDispatchFromBuild");
  expect(source).not.toContain("purchaseRoomUpgrade(");
});

function createFloor20WipeState(): GameState {
  const state = createInitialGameState();
  const failureReason =
    "Floor 20 checkpoint: Bone Captain overwhelmed the party. Upgrade Bed Room for recovery and Training Room for hero-specific attack.";

  return {
    ...state,
    unlockedFloor: 20,
    highestFloorCleared: 19,
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "wiped" as const,
      floor: 20,
      enemies: [
        {
          enemyId: "bone_captain",
          currentHp: 170,
          status: "active" as const
        }
      ],
      lastFailureReason: failureReason
    })),
    recentEvents: [
      {
        id: "event_floor_20_wipe",
        type: "party_wiped",
        createdAt: 1000,
        message: failureReason,
        severity: "danger",
        floor: 20
      },
      ...state.recentEvents
    ]
  };
}

function readBuildSceneSource(): string {
  return readFileSync("src/scenes/BuildScene.ts", "utf8");
}
