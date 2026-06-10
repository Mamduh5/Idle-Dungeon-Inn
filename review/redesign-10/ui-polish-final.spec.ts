import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { selectParty } from "../../src/application/partyCommands";
import { NAV_ITEMS } from "../../src/game/navigation";
import { createInitialGameState } from "../../src/game/initialState";
import { applyPartyUnlocksForProgress } from "../../src/systems/partyUnlockSystem";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import { getHeroesViewModel } from "../../src/viewModels/heroesViewModel";
import { getInnViewModel } from "../../src/viewModels/innViewModel";
import { getTowerViewModel } from "../../src/viewModels/towerViewModel";
import type { GameState } from "../../src/types/gameState";

test("bottom navigation labels remain exact and ordered", () => {
  expect(NAV_ITEMS.map((item) => item.label)).toEqual(["Inn", "Tower", "Heroes", "Build"]);
});

test("core screens expose compact major labels through view models", () => {
  const state = createInitialGameState();
  const inn = getInnViewModel(state);
  const heroes = getHeroesViewModel(state);
  const tower = getTowerViewModel(state);
  const build = getBuildViewModel(state);
  const buildCards = build.choiceCategories.flatMap((category) => category.cards);

  expect(inn.bedRoom.healingSpeedLabel).toBe("Heal 2 HP/s");
  expect(inn.gate.actionLabel.length).toBeLessThanOrEqual(16);
  expect(heroes.summaryLabel).toBe("2 heroes known / 2/2 in party");
  expect(heroes.roster.map((hero) => hero.name)).toEqual(["Mira", "Lina"]);
  expect(tower.floorNodeLabel).toBe("Floor 1 / Node 1");
  expect(tower.statusLabel.length).toBeLessThanOrEqual(12);
  expect(buildCards.map((card) => card.title)).toEqual([
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

test("party labels cover Party A and Party B without one-hero assumptions", () => {
  const unlockedState = applyPartyUnlocksForProgress({
    ...createInitialGameState(),
    highestFloorCleared: 20,
    unlockedFloor: 21
  });
  const partyBState = selectParty(unlockedState, "party_b");
  const partyAViewModel = getHeroesViewModel(unlockedState);
  const partyBViewModel = getHeroesViewModel(partyBState);

  expect(partyAViewModel.party.parties.map((party) => party.selectorLabel)).toEqual([
    "Party A Push",
    "Party B Safe Farm"
  ]);
  expect(partyAViewModel.party.parties.every((party) => party.selectorLabel.length <= 18)).toBe(true);
  expect(partyAViewModel.party.parties.map((party) => party.heroCountLabel)).toEqual(["2/2", "0/1"]);
  expect(partyBViewModel.partySlots).toHaveLength(1);
  expect(partyBViewModel.partySlots[0]?.label).toBe("Future");
});

test("default training target is roster-driven rather than a hardcoded hero", () => {
  const state = unlockTrainingRoom({
    ...createInitialGameState(),
    heroes: createInitialGameState().heroes.map((hero, index) =>
      index === 0
        ? {
            ...hero,
            status: "in_tower" as const
          }
        : {
            ...hero,
            name: "Ren"
          }
    )
  });
  const inn = getInnViewModel(state);
  const heroes = getHeroesViewModel(state);

  expect(inn.trainingRoom.actionLabel).toBe("Train Ren");
  expect(inn.trainingRoom.targetHeroId).toBe("hero_apprentice_archer_1");
  expect(heroes.roster.map((hero) => hero.name)).toContain("Ren");
  expect(readFileSync("src/scenes/HeroesScene.ts", "utf8")).not.toContain("Mira");
});

test("critical actions expose blocked reasons for disabled states", () => {
  const state = createInitialGameState();
  const lowHpState: GameState = {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "ready" as const
    }))
  };
  const buildCards = getBuildViewModel(state).choiceCategories.flatMap((category) => category.cards);
  const trainingCard = buildCards.find((card) => card.targetRoomId === "training_room");
  const automationCard = buildCards.find((card) => card.id === "automation_auto_dispatch");
  const heroes = getHeroesViewModel(state);
  const party = getTowerViewModel(lowHpState).party;

  expect(trainingCard?.blockedReason).toBe("Reach Floor 2");
  expect(automationCard?.blockedReason).toBe("Unlocks at Floor 3");
  expect(heroes.roster[0]?.assignBlockedReason).toBe("Already in selected party.");
  expect(party.canDispatch).toBe(false);
  expect(party.dispatchBlockedReason).toContain("needs 108 HP");
});

test("final scene polish uses view-model labels and keeps passive Inn ticks restart-free", () => {
  const heroesSource = readFileSync("src/scenes/HeroesScene.ts", "utf8");
  const buildSource = readFileSync("src/scenes/BuildScene.ts", "utf8");
  const innSource = readFileSync("src/scenes/InnScene.ts", "utf8");
  const innUpdateBody = innSource.match(/public update[\s\S]*?\n  \}/)?.[0] ?? "";

  expect(heroesSource).toContain("drawPartySelector");
  expect(heroesSource).toContain("selectorLabel");
  expect(heroesSource).toContain("selectParty(currentState, party.id)");
  expect(heroesSource).not.toContain("Additional party actions are not implemented");
  expect(buildSource).toContain("getChoiceMetaLabel");
  expect(buildSource).toContain("card.blockedReason");
  expect(innUpdateBody).not.toContain("restart");
});

function unlockTrainingRoom(state: GameState): GameState {
  return {
    ...state,
    innRooms: state.innRooms.map((room) =>
      room.roomId === "training_room"
        ? {
            ...room,
            level: 1,
            isUnlocked: true,
            jobs: []
          }
        : room
    )
  };
}
