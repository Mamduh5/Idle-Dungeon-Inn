import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { createHeroCombatStats } from "../../src/systems/combatStatSystem";
import {
  assignHeroToTrainingRoom,
  calculateTrainingRoomXpPerSecondForLevel,
  getHeroActiveRoomJob,
  getHeroTrainingAttackBonus,
  tickRoomJobs,
  TRAINING_XP_PER_ATTACK_LEVEL
} from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";
import type { HeroInstance } from "../../src/types/heroTypes";

test("old saves normalize missing or invalid hero training state", () => {
  const baseState = createInitialGameState();
  const rawState = {
    ...baseState,
    heroes: baseState.heroes.map((hero) => {
      const { training: _training, ...legacyHero } = hero;
      return {
        ...legacyHero,
        training: {
          attackTrainingXp: Number.POSITIVE_INFINITY,
          attackTrainingLevel: -4,
          totalTrainingSeconds: Number.NaN
        }
      };
    })
  };

  const normalized = normalizeLoadedGameState(rawState);

  expect(normalized?.heroes[0]?.training).toEqual({
    attackTrainingXp: 0,
    attackTrainingLevel: 0,
    totalTrainingSeconds: 0
  });
});

test("Training Room assigns a training job to a specific hero", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedState = assignHeroToTrainingRoom(state, state.heroes[0].id, 1000);
  const job = getHeroActiveRoomJob(trainedState, state.heroes[0].id);

  expect(trainedState.heroes[0]?.status).toBe("training");
  expect(job?.roomId).toBe("training_room");
  expect(job?.jobType).toBe("training");
  expect(job?.heroId).toBe(state.heroes[0].id);
});

test("training jobs add XP, seconds, and complete one attack-training drill", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const partialState = tickRoomJobs(state, 30_000, 31_000);

  expect(partialState.heroes[0]?.training.attackTrainingXp).toBe(30);
  expect(partialState.heroes[0]?.training.totalTrainingSeconds).toBe(30);
  expect(partialState.heroes[0]?.training.attackTrainingLevel).toBe(0);
  expect(getHeroActiveRoomJob(partialState, "hero_rookie_knight_1")?.progress).toBeCloseTo(0.5);

  const completedState = tickRoomJobs(partialState, 30_000, 61_000);

  expect(completedState.heroes[0]?.training.attackTrainingXp).toBe(0);
  expect(completedState.heroes[0]?.training.attackTrainingLevel).toBe(1);
  expect(completedState.heroes[0]?.training.totalTrainingSeconds).toBe(60);
  expect(completedState.heroes[0]?.status).toBe("ready");
  expect(getHeroActiveRoomJob(completedState, "hero_rookie_knight_1")).toBeNull();
});

test("combat stats use hero-specific training instead of a global room aura", () => {
  const state = withSecondHero(unlockTrainingRoom(createInitialGameState(), 3));
  const trainedHero = {
    ...state.heroes[0],
    training: {
      attackTrainingXp: 0,
      attackTrainingLevel: 2,
      totalTrainingSeconds: 120
    }
  };
  const untrainedHero = state.heroes[1];
  const trainedState: GameState = {
    ...state,
    heroes: [trainedHero, untrainedHero]
  };

  expect(getHeroTrainingAttackBonus(trainedHero)).toBe(2);
  expect(getHeroTrainingAttackBonus(untrainedHero)).toBe(0);
  expect(createHeroCombatStats(trainedState, trainedHero)?.attack).toBe(14);
  expect(createHeroCombatStats(trainedState, untrainedHero)?.attack).toBe(12);
});

test("Training Room level increases training speed", () => {
  expect(calculateTrainingRoomXpPerSecondForLevel(1)).toBe(1);
  expect(calculateTrainingRoomXpPerSecondForLevel(3)).toBe(2);

  const levelOneState = tickRoomJobs(
    assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000),
    10_000,
    11_000
  );
  const levelThreeState = tickRoomJobs(
    assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 3), "hero_rookie_knight_1", 1000),
    10_000,
    11_000
  );

  expect(levelOneState.heroes[0]?.training.attackTrainingXp).toBe(10);
  expect(levelThreeState.heroes[0]?.training.attackTrainingXp).toBe(20);
  expect(levelThreeState.heroes[0]?.training.attackTrainingXp).toBeGreaterThan(levelOneState.heroes[0]?.training.attackTrainingXp ?? 0);
});

test("Training Room drill size remains a simple 60 XP attack level", () => {
  expect(TRAINING_XP_PER_ATTACK_LEVEL).toBe(60);
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

function withSecondHero(state: GameState): GameState {
  const secondHero: HeroInstance = {
    ...state.heroes[0],
    id: "hero_rookie_knight_2",
    name: "Niko",
    assignedPartyId: null,
    training: {
      attackTrainingXp: 0,
      attackTrainingLevel: 0,
      totalTrainingSeconds: 0
    }
  };

  return {
    ...state,
    heroes: [...state.heroes, secondHero]
  };
}
