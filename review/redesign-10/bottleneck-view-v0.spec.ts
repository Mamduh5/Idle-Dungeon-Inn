import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { analyzeBottleneck } from "../../src/systems/bottleneckAnalysisSystem";
import { getBottleneckViewModel } from "../../src/viewModels/bottleneckViewModel";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";

test("low HP wipe produces a Bed Room recommendation", () => {
  const state = createWipedState(6, "Party wiped after taking too much damage.", 24);
  const summary = analyzeBottleneck(state);
  const viewModel = getBottleneckViewModel(state);

  expect(summary.cause).toBe("low_hp");
  expect(summary.recommendations.map((recommendation) => recommendation.target)).toContain("bed_room");
  expect(viewModel.recommendations[0]?.actionLabel).toBe("Upgrade Bed Room");
  expect(viewModel.evidence.join(" ")).toContain("needs 108 HP");
});

test("low training wipe produces a Training Room recommendation", () => {
  const state = createWipedState(7, "Party wiped because damage was too low.", 120);
  const summary = analyzeBottleneck(state);
  const viewModel = getBottleneckViewModel(state);

  expect(summary.cause).toBe("low_training");
  expect(summary.recommendations.map((recommendation) => recommendation.target)).toContain("training_room");
  expect(viewModel.causeLabel).toBe("Low Training");
});

test("Floor 10 boss failure produces checkpoint wording and actionable fixes", () => {
  const state = createWipedState(
    10,
    "Floor 10 checkpoint: Took too much damage before Big Cave Slime fell. Upgrade Bed Room for retry recovery and Training Room for attack.",
    20
  );
  const viewModel = getBottleneckViewModel(state);

  expect(viewModel.title).toBe("Floor 10 bottleneck");
  expect(viewModel.cause).toBe("boss_checkpoint");
  expect(viewModel.evidence.join(" ")).toContain("Big Cave Slime");
  expect(viewModel.recommendations.map((recommendation) => recommendation.target)).toEqual(["bed_room", "training_room"]);
});

test("no active bottleneck returns a calm empty state", () => {
  const viewModel = getBottleneckViewModel(createInitialGameState());

  expect(viewModel.hasCurrentBlocker).toBe(false);
  expect(viewModel.title).toBe("No current bottleneck");
  expect(viewModel.emptyStateLabel).toBe("No current blocker.");
  expect(viewModel.recommendations).toEqual([]);
});

test("Build and Tower view models surface bottleneck summaries without scenes", () => {
  const state = createWipedState(
    10,
    "Floor 10 checkpoint: Damage was close, but recovery ran out before Big Cave Slime fell. Upgrade Bed Room, then retry.",
    30
  );
  const buildViewModel = getBuildViewModel(state);
  const towerViewModel = getTowerViewModel(state);

  expect(buildViewModel.bottleneckSummary.title).toBe("Floor 10 bottleneck");
  expect(towerViewModel.bottleneckSummary.recommendations[0]?.target).toBe("bed_room");
  expect(towerViewModel.bottleneckSummary.floorLabel).toBe("Floor 10");
});

function createWipedState(floor: number, failureReason: string, currentHp: number): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp,
      status: currentHp <= 0 ? ("defeated" as const) : ("ready" as const)
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "wiped" as const,
      floor,
      lastFailureReason: failureReason,
      enemies:
        floor === 10
          ? [
              {
                enemyId: "floor_10_gatekeeper",
                currentHp: 80,
                status: "active" as const
              }
            ]
          : []
    })),
    recentEvents: [
      {
        id: `event_party_wiped_${floor}`,
        type: "party_wiped",
        createdAt: 1000,
        message: failureReason,
        severity: "danger",
        floor
      },
      ...state.recentEvents
    ]
  };
}
