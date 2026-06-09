import { expect, test } from "@playwright/test";
import { rewardDefinitions } from "../../src/data/lootData";
import { prototypeTowerFloors } from "../../src/data/towerData";
import { createInitialGameState } from "../../src/game/initialState";
import type { GameState } from "../../src/types/gameState";
import { completeSelectedFloor } from "../../src/systems/floorClearSystem";
import { calculateTrainingRoomAttackBonusForLevel } from "../../src/systems/roomEffectSystem";
import { getRoomUpgradeCost, purchaseRoomUpgrade } from "../../src/systems/roomUpgradeSystem";
import { tickCombat } from "../../src/systems/combatSystem";
import { getSelectedPartyDispatchBlockReason, sendSelectedPartyToTower } from "../../src/systems/partyDispatchSystem";
import { getHeroReadyHpThreshold, tickRoomJobs } from "../../src/systems/roomJobSystem";
import { continueSelectedTowerRun } from "../../src/systems/towerNodeActionSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import { roomDefinitions } from "../../src/data/roomData";

const SIM_DELTA_MS = 250;
const SIM_STEP_LIMIT = 400;

test("starter hero clears tutorial floors and floors 4 through 6 apply pressure", () => {
  let state = createInitialGameState();

  for (let floor = 1; floor <= 3; floor += 1) {
    const result = runCurrentFloorUntilReturn(state);
    expect(result.status, `Floor ${floor} should clear`).toBe("cleared");
    expect(result.state.highestFloorCleared).toBe(floor);
    expect(result.state.heroes[0]?.currentHp).toBeGreaterThan(0);
    state = result.state;
  }

  const floor4 = runCurrentFloorUntilReturn(state);
  expect(floor4.status).toBe("cleared");
  const floor4Hp = floor4.state.heroes[0]?.currentHp ?? 0;

  const floor5 = runCurrentFloorUntilReturn(floor4.state);
  expect(floor5.status).toBe("cleared");
  const floor5Hp = floor5.state.heroes[0]?.currentHp ?? 0;

  expect(floor4Hp).toBeLessThan(getHeroReadyHpThreshold(floor4.state.heroes[0]));
  expect(floor5Hp).toBeLessThan(getHeroReadyHpThreshold(floor5.state.heroes[0]));

  const floor6 = runCurrentFloorUntilReturn(floor5.state);
  expect(["cleared", "wiped"]).toContain(floor6.status);
  if (floor6.status === "cleared") {
    expect(floor6.state.heroes[0]?.currentHp).toBeLessThan(getHeroReadyHpThreshold(floor6.state.heroes[0]));
  } else {
    expect(floor6.state.towerRuns[0]?.status).toBe("wiped");
    expect(floor6.state.heroes[0]?.currentHp).toBe(0);
  }
});

test("floor 6 wipe recovers and training investment lets the hero make progress again", () => {
  let state = createInitialGameState();

  for (let floor = 1; floor <= 5; floor += 1) {
    const result = runCurrentFloorUntilReturn(state);
    expect(result.status, `Floor ${floor} should clear before the wipe check`).toBe("cleared");
    state = result.state;
  }

  const wiped = createWipedFloorSixState(state);

  state = recoverSelectedWipedParty(wiped.state);
  expect(state.towerRuns[0]?.status).toBe("preparing");
  expect(state.heroes[0]?.currentHp).toBeGreaterThan(0);

  state = purchaseRoomUpgrade("training_room")(state);
  state = purchaseRoomUpgrade("training_room")(state);
  state = purchaseRoomUpgrade("training_room")(state);

  const trainingRoom = state.innRooms.find((room) => room.roomId === "training_room");
  expect(trainingRoom?.level).toBe(3);
  expect(calculateTrainingRoomAttackBonusForLevel(trainingRoom?.level ?? 0)).toBe(6);

  const retry = runUntilFirstFloor6EncounterResult(state);
  expect(retry.state.towerRuns[0]?.status).toBe("blocked");
  expect(retry.state.towerRuns[0]?.nodeIndex).toBe(0);
  expect(retry.state.heroes[0]?.currentHp).toBeGreaterThan(0);
});

test("floor 4 through 10 rewards and room costs support retry upgrades without runaway repeat income", () => {
  const state = createInitialGameState();
  const bedRoom = state.innRooms.find((room) => room.roomId === "bed_room") ?? null;
  const trainingRoom = state.innRooms.find((room) => room.roomId === "training_room") ?? null;
  const bedLevelTwoCost = getRoomUpgradeCost(bedRoom, roomDefinitions.bed_room);
  const trainingUnlockCost = getRoomUpgradeCost(trainingRoom, roomDefinitions.training_room);
  const firstClearCoinsThroughFloor5 = sumFirstClearCoins(1, 5);

  expect(firstClearCoinsThroughFloor5).toBeGreaterThanOrEqual(bedLevelTwoCost + trainingUnlockCost);

  let previousFirstClear = sumFirstClearCoins(3, 3);
  for (let floor = 4; floor <= 10; floor += 1) {
    const definition = prototypeTowerFloors.find((candidate) => candidate.floor === floor);
    const firstClear = sumRewardCoins(definition?.firstClearRewards.map((reward) => reward.rewardId) ?? []);
    const repeat = sumRewardCoins(definition?.repeatRewards.map((reward) => reward.rewardId) ?? []);

    expect(firstClear).toBeGreaterThan(previousFirstClear);
    expect(repeat).toBeGreaterThan(0);
    expect(repeat).toBeLessThanOrEqual(Math.ceil(firstClear * 0.4));
    previousFirstClear = firstClear;
  }
});

function runCurrentFloorUntilReturn(state: GameState): { state: GameState; status: "cleared" | "wiped" } {
  let currentState = sendSelectedPartyToTower(preparePartyForDispatch(state), { now: Date.now() });

  for (let steps = 0; steps < SIM_STEP_LIMIT; steps += 1) {
    currentState = tickTowerRuns(currentState, SIM_DELTA_MS, Date.now());
    currentState = tickCombat(currentState, SIM_DELTA_MS, Date.now());

    const run = currentState.towerRuns[0];
    if (!run) {
      throw new Error("Expected a tower run during balance simulation.");
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

function runUntilFirstFloor6EncounterResult(state: GameState): { state: GameState } {
  let currentState = sendSelectedPartyToTower(preparePartyForDispatch(state), { now: Date.now() });

  for (let steps = 0; steps < SIM_STEP_LIMIT; steps += 1) {
    currentState = tickTowerRuns(currentState, SIM_DELTA_MS, Date.now());
    currentState = tickCombat(currentState, SIM_DELTA_MS, Date.now());

    const run = currentState.towerRuns[0];
    if (!run) {
      throw new Error("Expected a tower run during Floor 6 retry simulation.");
    }

    if (run.status === "wiped" || run.lastFailureReason === "Encounter cleared. Node advancement is not implemented yet.") {
      return { state: currentState };
    }
  }

  throw new Error("Timed out simulating first Floor 6 retry encounter.");
}

function preparePartyForDispatch(state: GameState): GameState {
  let currentState = state;

  for (let index = 0; index < 10 && getSelectedPartyDispatchBlockReason(currentState); index += 1) {
    currentState = tickRoomJobs(currentState, 60_000, Date.now() + index * 60_000);
  }

  return currentState;
}

function createWipedFloorSixState(state: GameState): { state: GameState; status: "wiped" } {
  return {
    status: "wiped",
    state: {
      ...state,
      unlockedFloor: Math.max(state.unlockedFloor, 6),
      highestFloorCleared: Math.max(state.highestFloorCleared, 5),
      firstClearFloorIds: [1, 2, 3, 4, 5],
      heroes: state.heroes.map((hero) => ({
        ...hero,
        currentHp: 0,
        status: "defeated" as const,
        highestFloorCleared: 5
      })),
      parties: state.parties.map((party) => ({
        ...party,
        selectedTargetFloor: 6
      })),
      towerRuns: state.towerRuns.map((run) => ({
        ...run,
        status: "wiped" as const,
        floor: 6,
        nodeIndex: 1,
        nodeProgress: 1,
        enemies: [
          {
            enemyId: "ember_wisp",
            currentHp: 18,
            status: "active" as const
          }
        ],
        heroCombatCooldowns: {},
        enemyCombatCooldowns: {},
        lastCombatEventMessage: "Party wiped. Return/revive is not implemented yet.",
        combatStartedAt: Date.now() - 1000,
        lootBag: [],
        lastFailureReason: "Party wiped.",
        startedAt: Date.now() - 5000
      }))
    }
  };
}

function sumFirstClearCoins(startFloor: number, endFloor: number): number {
  let total = 0;

  for (let floor = startFloor; floor <= endFloor; floor += 1) {
    const definition = prototypeTowerFloors.find((candidate) => candidate.floor === floor);
    total += sumRewardCoins(definition?.firstClearRewards.map((reward) => reward.rewardId) ?? []);
  }

  return total;
}

function sumRewardCoins(rewardIds: string[]): number {
  return rewardIds.reduce((total, rewardId) => total + (rewardDefinitions[rewardId]?.coins ?? 0), 0);
}
