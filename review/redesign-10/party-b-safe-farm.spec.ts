import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { assignHeroToParty, selectParty, setPartyMode } from "../../src/application/partyCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { completeSelectedFloor } from "../../src/systems/floorClearSystem";
import { applyPartyUnlocksForProgress } from "../../src/systems/partyUnlockSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { getPartyViewModel } from "../../src/viewModels/partyViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";

test("Party B exists locked by default and has its own tower run", () => {
  const state = createInitialGameState();
  const partyB = state.parties.find((party) => party.id === "party_b");
  const partyBRun = state.towerRuns.find((run) => run.partyId === "party_b");

  expect(partyB?.name).toBe("Party B");
  expect(partyB?.mode).toBe("safe_farm");
  expect(partyB?.maxSize).toBe(1);
  expect(partyB?.isUnlocked).toBe(false);
  expect(partyBRun?.status).toBe("preparing");
});

test("Party B unlocks after Floor 20 progress and normalizes old progress saves", () => {
  const progressedState = applyPartyUnlocksForProgress({
    ...createInitialGameState(),
    highestFloorCleared: 20,
    unlockedFloor: 21
  });
  const legacyState = {
    ...createInitialGameState(),
    highestFloorCleared: 20,
    unlockedFloor: 21,
    parties: createInitialGameState().parties.filter((party) => party.id !== "party_b"),
    towerRuns: createInitialGameState().towerRuns.filter((run) => run.partyId !== "party_b")
  };
  const normalized = normalizeLoadedGameState(legacyState);

  expect(progressedState.parties.find((party) => party.id === "party_b")?.isUnlocked).toBe(true);
  expect(normalized?.parties.find((party) => party.id === "party_b")?.isUnlocked).toBe(true);
  expect(normalized?.towerRuns.find((run) => run.partyId === "party_b")?.status).toBe("preparing");
});

test("selected party switching works through the party command and view models", () => {
  const state = unlockPartyB(createInitialGameState());
  const selectedState = selectParty(state, "party_b");
  const partyViewModel = getPartyViewModel(selectedState);
  const towerViewModel = getTowerViewModel(selectedState);

  expect(selectedState.selectedPartyId).toBe("party_b");
  expect(partyViewModel.selectedPartyName).toBe("Party B");
  expect(partyViewModel.parties.find((party) => party.id === "party_b")?.selectorLabel).toBe("Party B Safe Farm");
  expect(towerViewModel.party.selectedPartyName).toBe("Party B");
});

test("Safe Farm repeats the target floor and pays repeat rewards without pushing", () => {
  const state = createPartyBFarmingState();
  const completedState = completeSelectedFloor(state, 5000);
  const partyB = completedState.parties.find((party) => party.id === "party_b");
  const partyBRun = completedState.towerRuns.find((run) => run.partyId === "party_b");

  expect(completedState.currencies.coins).toBe(40);
  expect(completedState.unlockedFloor).toBe(21);
  expect(completedState.highestFloorCleared).toBe(20);
  expect(partyB?.selectedTargetFloor).toBe(5);
  expect(partyBRun?.floor).toBe(5);
  expect(partyBRun?.status).toBe("preparing");
});

test("Party A can push while Party B farms and background tower runs advance", () => {
  const state: GameState = {
    ...unlockPartyB(createInitialGameState()),
    towerRuns: createInitialGameState().towerRuns.map((run) => ({
      ...run,
      status: "traveling" as const,
      floor: run.partyId === "party_b" ? 5 : 21,
      nodeProgress: 0
    }))
  };
  const tickedState = tickTowerRuns(state, 800, 1800);

  expect(tickedState.towerRuns.find((run) => run.partyId === "party_lantern")?.nodeProgress).toBeGreaterThan(0);
  expect(tickedState.towerRuns.find((run) => run.partyId === "party_b")?.nodeProgress).toBeGreaterThan(0);
});

test("hero assignment between Party A and Party B stays unique", () => {
  const state = unlockPartyB(createInitialGameState());
  const assignedState = assignHeroToParty(state, "hero_apprentice_archer_1", "party_b", 0);
  const partyA = assignedState.parties.find((party) => party.id === "party_lantern");
  const partyB = assignedState.parties.find((party) => party.id === "party_b");

  expect(partyA?.heroIds).toEqual(["hero_rookie_knight_1"]);
  expect(partyB?.heroIds).toEqual(["hero_apprentice_archer_1"]);
  expect(new Set([...partyA?.heroIds ?? [], ...partyB?.heroIds ?? []]).size).toBe(2);
});

test("TowerScene uses party selector labels and command wrapper", () => {
  const source = readFileSync("src/scenes/TowerScene.ts", "utf8");

  expect(source).toContain("drawPartySelector");
  expect(source).toContain("selectorLabel");
  expect(source).toContain("selectPartyFromTower");
});

function unlockPartyB(state: GameState): GameState {
  return applyPartyUnlocksForProgress({
    ...state,
    highestFloorCleared: 20,
    unlockedFloor: 21
  });
}

function createPartyBFarmingState(): GameState {
  const state = assignHeroToParty(unlockPartyB(createInitialGameState()), "hero_apprentice_archer_1", "party_b", 0);
  const selectedState = selectParty(setPartyMode(state, "party_b", "safe_farm"), "party_b");

  return {
    ...selectedState,
    currencies: {
      coins: 0
    },
    firstClearFloorIds: Array.from({ length: 20 }, (_, index) => index + 1),
    parties: selectedState.parties.map((party) =>
      party.id === "party_b"
        ? {
            ...party,
            selectedTargetFloor: 5
          }
        : party
    ),
    towerRuns: selectedState.towerRuns.map((run) =>
      run.partyId === "party_b"
        ? {
            ...run,
            status: "blocked" as const,
            floor: 5,
            nodeIndex: 3,
            nodeProgress: 1,
            lastFailureReason: "Floor clear is not implemented yet.",
            lastCombatEventMessage: "Exit reached."
          }
        : run
    )
  };
}
