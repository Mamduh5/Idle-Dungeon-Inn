import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { createHeroCombatStats } from "../../src/systems/combatStatSystem";
import {
  assignHeroToBedHealingIfNeeded,
  assignHeroToTrainingRoom,
  calculateTrainingRoomXpPerSecondForLevel,
  cancelHeroTrainingDrill,
  getHeroActiveRoomJob,
  getHeroTrainingAttackBonus,
  getTrainingRoomAssignmentBlockReason,
  startHeroTrainingDrill,
  tickRoomJobs,
  TRAINING_XP_PER_ATTACK_LEVEL
} from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";
import type { HeroInstance } from "../../src/types/heroTypes";
import {
  getHeroTrainingRosterText,
  getTrainingRoomInnText,
  TRAINING_ROOM_BUILD_COPY
} from "../../src/ui/trainingRoomText";

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

test("Training Room action creates a training job and event for the selected hero", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedState = startHeroTrainingDrill(state, state.heroes[0].id, 1000);
  const job = getHeroActiveRoomJob(trainedState, state.heroes[0].id);

  expect(trainedState.heroes[0]?.status).toBe("training");
  expect(job?.roomId).toBe("training_room");
  expect(job?.jobType).toBe("training");
  expect(trainedState.recentEvents[0]?.message).toBe("Mira started a training drill.");
});

test("Training Room action is blocked when hero is in tower", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      status: "in_tower" as const
    }))
  };

  const blockedState = startHeroTrainingDrill(state, state.heroes[0].id, 1000);

  expect(getTrainingRoomAssignmentBlockReason(state, state.heroes[0].id)).toBe("Mira is in tower.");
  expect(getHeroActiveRoomJob(blockedState, state.heroes[0].id)).toBeNull();
  expect(blockedState.heroes[0]?.status).toBe("in_tower");
  expect(blockedState.recentEvents[0]?.message).toBe("Mira is in tower.");
});

test("Training Room action is blocked when hero is resting in Bed Room", () => {
  const woundedState: GameState = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      currentHp: 40,
      status: "resting" as const
    }))
  };
  const restingState = assignHeroToBedHealingIfNeeded(woundedState, woundedState.heroes[0].id, 1000);
  const blockedState = startHeroTrainingDrill(restingState, restingState.heroes[0].id, 2000);

  expect(getTrainingRoomAssignmentBlockReason(restingState, restingState.heroes[0].id)).toBe("Mira is resting.");
  expect(getHeroActiveRoomJob(blockedState, restingState.heroes[0].id)?.roomId).toBe("bed_room");
  expect(blockedState.recentEvents[0]?.message).toBe("Mira is resting.");
});

test("Training Room status text reflects active drill progress", () => {
  const state = startHeroTrainingDrill(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const partialState = tickRoomJobs(state, 30_000, 31_000);
  const text = getTrainingRoomInnText(partialState, partialState.heroes[0]);

  expect(text.speedLabel).toBe("Train 1 XP/s");
  expect(text.assignmentLabel).toBe("Mira training");
  expect(text.bonusLabel).toBe("Mira training: +0 ATK");
  expect(text.progressLabel).toBe("Next +ATK 30/60 XP");
  expect(text.actionLabel).toBe("Cancel Training");
});

test("Cancel Training safely frees the hero for dispatch readiness", () => {
  const state = startHeroTrainingDrill(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const cancelledState = cancelHeroTrainingDrill(state, "hero_rookie_knight_1", 2000);

  expect(getHeroActiveRoomJob(cancelledState, "hero_rookie_knight_1")).toBeNull();
  expect(cancelledState.heroes[0]?.status).toBe("ready");
  expect(cancelledState.recentEvents[0]?.message).toBe("Mira stopped training.");
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

test("Heroes View training text shows personal bonus, progress, and status", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      training: {
        attackTrainingXp: 15,
        attackTrainingLevel: 2,
        totalTrainingSeconds: 135
      }
    }))
  };
  const text = getHeroTrainingRosterText(state, state.heroes[0]);

  expect(text.bonusLabel).toBe("Training +2 ATK");
  expect(text.progressLabel).toBe("Next +ATK 15/60 XP");
  expect(text.statusLabel).toBe("Ready");
});

test("Build View copy explains selected-hero training instead of a global aura", () => {
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Trains selected heroes over time.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Higher room level trains faster.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Personal +ATK is kept.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("No global attack aura.");
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
