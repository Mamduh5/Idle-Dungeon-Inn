import { expect, test } from "@playwright/test";
import { enemyDefinitions } from "../../src/data/enemyData";
import { rewardDefinitions } from "../../src/data/lootData";
import { prototypeTowerFloors } from "../../src/data/towerData";
import { createInitialGameState } from "../../src/game/initialState";
import { sendSelectedPartyToTower } from "../../src/systems/partyDispatchSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { analyzeBottleneck } from "../../src/systems/bottleneckAnalysisSystem";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import { getBottleneckViewModel } from "../../src/viewModels/bottleneckViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";

test("Floors 11 through 20 exist with combat, exits, and configured rewards", () => {
  const floors = new Map(prototypeTowerFloors.map((floor) => [floor.floor, floor]));

  for (let floorNumber = 11; floorNumber <= 20; floorNumber += 1) {
    const floor = floors.get(floorNumber);

    expect(floor, `Floor ${floorNumber}`).toBeDefined();
    expect(floor?.themeId).toContain("bone");
    expect(floor?.nodes.some((node) => node.type === "combat" || node.type === "elite" || node.type === "boss")).toBe(true);
    expect(floor?.nodes.at(-1)?.type).toBe("exit");
    expect(floor?.firstClearRewards[0]?.coins).toBeGreaterThan(0);
    expect(floor?.repeatRewards[0]?.coins).toBeGreaterThan(0);
  }
});

test("Floor 20 has the Bone Captain boss checkpoint", () => {
  const floor20 = prototypeTowerFloors.find((floor) => floor.floor === 20);
  const bossNode = floor20?.nodes.find((node) => node.type === "boss");

  expect(bossNode?.bossId).toBe("bone_captain");
  expect(enemyDefinitions.bone_captain.name).toBe("Bone Captain");
  expect(enemyDefinitions.bone_captain.unlockFloor).toBe(20);
});

test("Floor 20 boss identity appears in Tower, Build, and bottleneck view models", () => {
  const state = createFloor20WipeState();
  const towerViewModel = getTowerViewModel(state);
  const bottleneckViewModel = getBottleneckViewModel(state);
  const buildViewModel = getBuildViewModel(state);

  expect(towerViewModel.checkpointLabel).toBe("Bone Hall checkpoint");
  expect(towerViewModel.bottleneckHint).toContain("Bone Captain");
  expect(towerViewModel.bottleneckSuggestions.join(" ")).toContain("both heroes");
  expect(bottleneckViewModel.title).toBe("Floor 20 bottleneck");
  expect(bottleneckViewModel.evidence.join(" ")).toContain("Bone Captain");
  expect(buildViewModel.bottleneckCallout?.title).toBe("Floor 20 bottleneck");
  expect(buildViewModel.bottleneckCallout?.buildMessage).toContain("Floor 20 blocked your party");
});

test("Floor 1 through 10 data remains intact", () => {
  const floorNumbers = prototypeTowerFloors.slice(0, 10).map((floor) => floor.floor);
  const floor10 = prototypeTowerFloors.find((floor) => floor.floor === 10);

  expect(floorNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(floor10?.nodes.find((node) => node.type === "boss")?.bossId).toBe("floor_10_gatekeeper");
  expect(enemyDefinitions.floor_10_gatekeeper.name).toBe("Big Cave Slime");
});

test("a ready party can dispatch to and attempt Floor 20 from backend state", () => {
  const dispatchedState = sendSelectedPartyToTower(createReadyFloor20State(), { now: 1000 });
  const enteredState = tickTowerRuns(dispatchedState, 1600, 2600);
  const encounterState = tickTowerRuns(enteredState, 2000, 4600);

  expect(dispatchedState.towerRuns[0]?.floor).toBe(20);
  expect(dispatchedState.towerRuns[0]?.status).toBe("traveling");
  expect(encounterState.towerRuns[0]?.status).toBe("fighting");
  expect(encounterState.towerRuns[0]?.enemies.map((enemy) => enemy.enemyId)).toEqual(["bone_guard", "bone_archer"]);
});

test("Floor 20 failure produces actionable Bed Room and Training Room bottlenecks", () => {
  const state = createFloor20WipeState();
  const summary = analyzeBottleneck(state);
  const viewModel = getBottleneckViewModel(state);

  expect(summary.cause).toBe("boss_checkpoint");
  expect(summary.recommendations.map((recommendation) => recommendation.target)).toEqual(["bed_room", "training_room"]);
  expect(viewModel.recommendations.map((recommendation) => recommendation.actionLabel)).toEqual([
    "Upgrade Bed Room",
    "Train hero attack"
  ]);
});

test("Floor 11 through 20 rewards scale without runaway repeat income", () => {
  let previousFirstClear = rewardDefinitions.floor_10_first_clear_coins.coins ?? 0;

  for (let floorNumber = 11; floorNumber <= 20; floorNumber += 1) {
    const firstClear = rewardDefinitions[`floor_${floorNumber}_first_clear_coins`]?.coins ?? 0;
    const repeat = rewardDefinitions[`floor_${floorNumber}_repeat_clear_coins`]?.coins ?? 0;

    expect(firstClear).toBeGreaterThan(previousFirstClear);
    expect(repeat).toBeGreaterThan(0);
    expect(repeat).toBeLessThanOrEqual(Math.ceil(firstClear * 0.4));
    previousFirstClear = firstClear;
  }
});

function createReadyFloor20State(): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    unlockedFloor: 20,
    highestFloorCleared: 19,
    firstClearFloorIds: Array.from({ length: 19 }, (_, index) => index + 1),
    parties: state.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 20
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "preparing" as const,
      floor: 20,
      nodeIndex: 0,
      nodeProgress: 0,
      enemies: [],
      lastFailureReason: null
    }))
  };
}

function createFloor20WipeState(): GameState {
  const state = createReadyFloor20State();
  const failureReason =
    "Floor 20 checkpoint: Bone Captain overwhelmed the party. Upgrade Bed Room for recovery and Training Room for hero-specific attack.";

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: hero.id === "hero_rookie_knight_1" ? 18 : 12,
      status: "defeated" as const
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "wiped" as const,
      floor: 20,
      nodeIndex: 2,
      nodeProgress: 1,
      enemies: [
        {
          enemyId: "bone_captain",
          currentHp: 170,
          status: "active" as const
        }
      ],
      lastCombatEventMessage: "Floor 20 checkpoint failed.",
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
