import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { assignHeroToParty } from "../../src/application/partyCommands";
import { createInitialGameState } from "../../src/game/initialState";
import { startTrainingFromInn } from "../../src/application/innCommands";
import { getHeroesViewModel } from "../../src/viewModels/heroesViewModel";
import type { GameState } from "../../src/types/gameState";

test("Heroes view model lists all heroes with HP, training, job, and party labels", () => {
  const state = startTrainingFromInn(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const viewModel = getHeroesViewModel(state);

  expect(viewModel.summaryLabel).toBe("2 heroes known / 2/2 in party");
  expect(viewModel.roster.map((hero) => hero.name)).toEqual(["Mira", "Lina"]);
  expect(viewModel.roster[0]?.hpLabel).toBe("HP 120/120");
  expect(viewModel.roster[0]?.statusLabel).toBe("Training");
  expect(viewModel.roster[0]?.currentRoomJobLabel).toBe("Training in Training Room");
  expect(viewModel.roster[0]?.partyLabel).toBe("Party: Lantern Party");
  expect(viewModel.roster[1]?.partyLabel).toBe("Party: Lantern Party");
});

test("unassigned heroes expose selected-party assignment action when a slot is open", () => {
  const viewModel = getHeroesViewModel(withUnassignedArcher(createInitialGameState()));
  const secondHero = viewModel.roster.find((hero) => hero.id === "hero_apprentice_archer_1");

  expect(secondHero?.assignActionLabel).toBe("Assign");
  expect(secondHero?.canAssignToSelectedParty).toBe(true);
  expect(secondHero?.assignBlockedReason).toBeNull();
});

test("party assignment command fills a slot without duplicating heroes", () => {
  const state = withUnassignedArcher(createInitialGameState());
  const assignedState = assignHeroToParty(state, "hero_apprentice_archer_1", "party_lantern", 1);
  const party = assignedState.parties.find((candidate) => candidate.id === "party_lantern");
  const secondHero = assignedState.heroes.find((hero) => hero.id === "hero_apprentice_archer_1");

  expect(party?.heroIds).toEqual(["hero_rookie_knight_1", "hero_apprentice_archer_1"]);
  expect(new Set(party?.heroIds).size).toBe(party?.heroIds.length);
  expect(secondHero?.assignedPartyId).toBe("party_lantern");
});

test("Heroes scene consumes the view model instead of direct training and hero data helpers", () => {
  const source = readFileSync("src/scenes/HeroesScene.ts", "utf8");

  expect(source).toContain("getHeroesViewModel");
  expect(source).not.toContain("heroDefinitions");
  expect(source).not.toContain("getHeroTrainingRosterText");
  expect(source).not.toContain("getHeroHpDisplayText");
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

function withUnassignedArcher(state: GameState): GameState {
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      hero.id === "hero_apprentice_archer_1"
        ? {
            ...hero,
            assignedPartyId: null
          }
        : hero
    ),
    parties: state.parties.map((party) =>
      party.id === "party_lantern"
        ? {
            ...party,
            heroIds: ["hero_rookie_knight_1"]
          }
        : party
    )
  };
}
