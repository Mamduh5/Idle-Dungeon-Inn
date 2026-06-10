import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { assignHeroToParty, selectParty, setPartyMode } from "../../src/application/partyCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { getHeroesViewModel } from "../../src/viewModels/heroesViewModel";
import { getPartyViewModel } from "../../src/viewModels/partyViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";

test("party view model exposes selected party, mode, target, slots, and dispatch state", () => {
  const viewModel = getPartyViewModel(createInitialGameState());

  expect(viewModel.selectedPartyName).toBe("Lantern Party");
  expect(viewModel.selectedModeLabel).toBe("Push");
  expect(viewModel.targetFloorLabel).toBe("Target F1");
  expect(viewModel.slots[0]?.label).toBe("Mira");
  expect(viewModel.modeOptions.map((option) => option.label)).toEqual(["Push", "Safe Farm", "Material Hunt", "Boss Attempt"]);
  expect(viewModel.canDispatch).toBe(true);
});

test("party commands update selected party and mode without scene dependencies", () => {
  const state = withSecondParty(createInitialGameState());
  const selectedState = selectParty(state, "party_b");
  const modeState = setPartyMode(selectedState, "party_b", "safe_farm");

  expect(getPartyViewModel(modeState).selectedPartyName).toBe("Party B");
  expect(getPartyViewModel(modeState).selectedModeLabel).toBe("Safe Farm");
  expect(getTowerViewModel(modeState).party.selectedPartyName).toBe("Party B");
  expect(getHeroesViewModel(modeState).party.selectedPartyName).toBe("Party B");
});

test("selecting locked parties is ignored safely", () => {
  const lockedState = {
    ...withSecondParty(createInitialGameState()),
    parties: withSecondParty(createInitialGameState()).parties.map((party) =>
      party.id === "party_b"
        ? {
            ...party,
            isUnlocked: false
          }
        : party
    )
  };
  const selectedState = selectParty(lockedState, "party_b");

  expect(selectedState.selectedPartyId).toBe("party_lantern");
});

test("assignment command keeps party hero ids unique", () => {
  const state = createInitialGameState();
  const assignedState = assignHeroToParty(state, "hero_rookie_knight_1", "party_lantern", 1);
  const party = assignedState.parties.find((candidate) => candidate.id === "party_lantern");

  expect(party?.heroIds).toEqual(["hero_apprentice_archer_1", "hero_rookie_knight_1"]);
  expect(new Set(party?.heroIds).size).toBe(party?.heroIds.length);
});

test("party system view model and command files stay Phaser-free", () => {
  for (const filePath of ["src/viewModels/partyViewModel.ts", "src/application/partyCommands.ts"]) {
    const source = readFileSync(filePath, "utf8");
    expect(source, filePath).not.toContain("from \"phaser\"");
    expect(source, filePath).not.toContain("from 'phaser'");
    expect(source, filePath).not.toContain("../scenes");
  }
});

function withSecondParty(state: GameState): GameState {
  return {
    ...state,
    parties: [
      ...state.parties,
      {
        id: "party_b",
        name: "Party B",
        heroIds: [],
        maxSize: 1,
        mode: "push",
        selectedTargetFloor: 1,
        selectedMaterialId: null,
        retreatHpPercent: 30,
        isUnlocked: true
      }
    ],
    towerRuns: [
      ...state.towerRuns,
      {
        ...state.towerRuns[0],
        partyId: "party_b",
        status: "preparing" as const,
        floor: 1,
        nodeIndex: 0,
        nodeProgress: 0,
        enemies: [],
        heroCombatCooldowns: {},
        enemyCombatCooldowns: {},
        lastCombatEventMessage: null,
        combatStartedAt: null,
        lootBag: [],
        lastFailureReason: null
      }
    ]
  };
}
