import { expect, test } from "@playwright/test";
import { enemyDefinitions } from "../../src/data/enemyData";
import { prototypeTowerFloors } from "../../src/data/towerData";
import { createInitialGameState } from "../../src/game/initialState";
import { tickAutomation } from "../../src/systems/automationSystem";
import { FLOOR_10_BOSS_ID, getBottleneckHintForRun } from "../../src/systems/bottleneckHintSystem";
import { tickCombat } from "../../src/systems/combatSystem";
import { completeSelectedFloor } from "../../src/systems/floorClearSystem";
import { sendSelectedPartyToTower } from "../../src/systems/partyDispatchSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { continueSelectedTowerRun } from "../../src/systems/towerNodeActionSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import type { GameState } from "../../src/types/gameState";

const SIM_DELTA_MS = 250;
const SIM_STEP_LIMIT = 400;

test("floor 10 is represented as the first boss checkpoint", () => {
  const floor10 = prototypeTowerFloors.find((floor) => floor.floor === 10);
  const bossNode = floor10?.nodes.find((node) => node.type === "boss");

  expect(floor10?.themeId).toBe("sealed_gate");
  expect(bossNode?.bossId).toBe(FLOOR_10_BOSS_ID);
  expect(enemyDefinitions[FLOOR_10_BOSS_ID]?.name).toBe("Big Cave Slime");
  expect(enemyDefinitions[FLOOR_10_BOSS_ID]?.unlockFloor).toBe(10);
});

test("weak floor 10 boss attempt can wipe and records a bottleneck hint", () => {
  const now = Date.now();
  const bossStats = enemyDefinitions[FLOOR_10_BOSS_ID]?.baseStats;
  expect(bossStats).toBeTruthy();

  let state = createInitialGameState();
  state = {
    ...state,
    unlockedFloor: 10,
    highestFloorCleared: 9,
    firstClearFloorIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 8,
      status: "in_tower"
    })),
    parties: state.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 10
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "fighting",
      floor: 10,
      nodeIndex: 2,
      nodeProgress: 1,
      enemies: [
        {
          enemyId: FLOOR_10_BOSS_ID,
          currentHp: bossStats?.hp ?? 128,
          status: "active"
        }
      ],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: "Boss checkpoint started.",
      combatStartedAt: now - 1000,
      lastFailureReason: null,
      startedAt: now - 5000
    }))
  };

  const failed = tickCombat(state, 1500, now);
  const run = failed.towerRuns[0];

  expect(run?.status).toBe("wiped");
  expect(run?.floor).toBe(10);
  expect(run?.lastFailureReason).toContain("Floor 10 checkpoint");
  expect(run?.lastFailureReason).toContain("Bed Room");
  expect(run?.lastFailureReason).toContain("Training Room");
  expect(getBottleneckHintForRun(run ?? null)).toBe(run?.lastFailureReason);
  expect(failed.recentEvents[0]?.message).toContain("Big Cave Slime");
  expect(failed.recentEvents[0]?.message).toContain("Bed Room");
  expect(failed.recentEvents[0]?.message).toContain("Training Room");
});

test("floor 6 wipe and manual recovery remain valid", () => {
  let state = createInitialGameState();

  for (let floor = 1; floor <= 5; floor += 1) {
    const result = runCurrentFloorUntilReturn(state);
    expect(result.status, `Floor ${floor} should clear before Floor 6`).toBe("cleared");
    state = result.state;
  }

  const floor6 = runCurrentFloorUntilReturn(state);
  expect(floor6.status).toBe("wiped");
  expect(floor6.state.towerRuns[0]?.floor).toBe(6);

  const recovered = recoverSelectedWipedParty(floor6.state);
  expect(recovered.towerRuns[0]?.status).toBe("preparing");
  expect(recovered.towerRuns[0]?.floor).toBe(6);
  expect(recovered.heroes[0]?.status).toBe("ready");
  expect(recovered.heroes[0]?.currentHp).toBeGreaterThan(0);
});

test("auto dispatch still does not auto recover a wiped run", () => {
  const now = Date.now();
  const state = createInitialGameState();
  const wipedState: GameState = {
    ...state,
    unlockedFloor: 10,
    highestFloorCleared: 9,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated"
    })),
    parties: state.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 10
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "wiped",
      floor: 10,
      nodeIndex: 2,
      nodeProgress: 1,
      enemies: [
        {
          enemyId: FLOOR_10_BOSS_ID,
          currentHp: 96,
          status: "active"
        }
      ],
      lastCombatEventMessage: "Floor 10 checkpoint failed.",
      lastFailureReason: "Floor 10 checkpoint: Took too much damage before Big Cave Slime fell.",
      combatStartedAt: now - 1000,
      startedAt: now - 5000
    })),
    automation: {
      ...state.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now - 5000,
      enabled: {
        ...state.automation.enabled,
        auto_dispatch_board: true
      }
    },
    recentEvents: [],
    lastActiveAt: now - 5000
  };

  const afterAutomation = tickAutomation(wipedState, now);
  expect(afterAutomation.towerRuns[0]?.status).toBe("wiped");
  expect(afterAutomation.heroes[0]?.status).toBe("defeated");
  expect(afterAutomation.recentEvents).toHaveLength(0);
});

function runCurrentFloorUntilReturn(state: GameState): { state: GameState; status: "cleared" | "wiped" } {
  let currentState = sendSelectedPartyToTower(state, { now: Date.now() });

  for (let steps = 0; steps < SIM_STEP_LIMIT; steps += 1) {
    currentState = tickTowerRuns(currentState, SIM_DELTA_MS, Date.now());
    currentState = tickCombat(currentState, SIM_DELTA_MS, Date.now());

    const run = currentState.towerRuns[0];
    if (!run) {
      throw new Error("Expected a tower run during Floor 6 regression simulation.");
    }

    if (run.status === "wiped") {
      return { state: currentState, status: "wiped" };
    }

    if (run.status === "looting" || run.lastFailureReason === "Encounter cleared. Node advancement is not implemented yet.") {
      currentState = continueSelectedTowerRun(currentState);
      continue;
    }

    if (run.lastFailureReason === "Floor clear is not implemented yet.") {
      return { state: completeSelectedFloor(currentState), status: "cleared" };
    }
  }

  throw new Error(`Timed out simulating Floor ${currentState.towerRuns[0]?.floor ?? "unknown"}.`);
}
