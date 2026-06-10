import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import { handleInnSelectNextTrainingHero, handleInnTrainingAction, selectTrainingHero } from "../../src/application/innCommands";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { createHeroCombatStats } from "../../src/systems/combatStatSystem";
import {
  assignHeroToBedHealingIfNeeded,
  assignHeroToTrainingRoom,
  calculateTrainingRoomXpPerSecondForLevel,
  cancelHeroTrainingDrill,
  getHeroActiveRoomJob,
  getHeroMaxHp,
  getHeroTrainingAttackBonus,
  getTrainingHeroSelectionOptions,
  getTrainingRoomAssignmentBlockReason,
  MAX_TRAINING_ATTACK_LEVEL,
  startHeroTrainingDrill,
  tickRoomJobs,
  TRAINING_XP_PER_ATTACK_LEVEL
} from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";
import {
  getDefaultTrainingHero,
  getEligibleTrainingHeroes,
  getHeroTrainingRosterText,
  getTrainingRoomInnText,
  TRAINING_ROOM_BUILD_COPY
} from "../../src/ui/trainingRoomText";
import { getHeroHpDisplayText } from "../../src/ui/heroDisplayText";
import { getInnReadinessRenderKey } from "../../src/ui/innRenderKey";

const MIRA_ID = "hero_rookie_knight_1";
const LINA_ID = "hero_apprentice_archer_1";

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

test("Training Room assigns a training job to a specific selected hero", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const selectedState = selectTrainingHero(state, LINA_ID);
  const trainedState = assignHeroToTrainingRoom(selectedState, LINA_ID, 1000);
  const job = getHeroActiveRoomJob(trainedState, LINA_ID);

  expect(trainedState.selectedTrainingHeroId).toBe(LINA_ID);
  expect(trainedState.heroes.find((hero) => hero.id === LINA_ID)?.status).toBe("training");
  expect(trainedState.heroes.find((hero) => hero.id === MIRA_ID)?.status).toBe("ready");
  expect(job?.roomId).toBe("training_room");
  expect(job?.jobType).toBe("training");
  expect(job?.heroId).toBe(LINA_ID);
});

test("Training Room action creates a continuous training job and event for selected hero", () => {
  const state = selectTrainingHero(unlockTrainingRoom(createInitialGameState(), 1), LINA_ID);
  const trainedState = startHeroTrainingDrill(state, LINA_ID, 1000);
  const job = getHeroActiveRoomJob(trainedState, LINA_ID);

  expect(job?.roomId).toBe("training_room");
  expect(trainedState.recentEvents[0]?.message).toBe("Lina started training until canceled.");
});

test("Training Room selector can move from first hero to second hero", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const selectedState = handleInnSelectNextTrainingHero(state);
  const text = getTrainingRoomInnText(selectedState, selectedState.heroes[1]);

  expect(getTrainingHeroSelectionOptions(selectedState).map((hero) => hero.name)).toEqual(["Mira", "Lina"]);
  expect(selectedState.selectedTrainingHeroId).toBe(LINA_ID);
  expect(text.selectorLabel).toBe("Target: Lina");
  expect(text.actionLabel).toBe("Train Lina");
});

test("Training Room action label is data-driven from the selected eligible hero", () => {
  const state = {
    ...selectTrainingHero(unlockTrainingRoom(createInitialGameState(), 1), LINA_ID),
    heroes: createInitialGameState().heroes.map((hero) =>
      hero.id === LINA_ID
        ? {
            ...hero,
            name: "Niko"
          }
        : hero
    )
  };
  const text = getTrainingRoomInnText(state, state.heroes[1]);

  expect(getEligibleTrainingHeroes(state).map((hero) => hero.name)).toEqual(["Mira", "Niko"]);
  expect(getDefaultTrainingHero(state, state.selectedTrainingHeroId)?.name).toBe("Niko");
  expect(text.actionLabel).toBe("Train Niko");
  expect(text.targetHero?.name).toBe("Niko");
});

test("Training Room action text reports no eligible hero instead of a misleading target", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) => ({
      ...hero,
      status: "in_tower" as const
    }))
  };
  const text = getTrainingRoomInnText(state, state.heroes[0]);

  expect(getEligibleTrainingHeroes(state)).toEqual([]);
  expect(text.targetHero).toBeNull();
  expect(text.actionEnabled).toBe(false);
  expect(text.blockedReason).toBe("No eligible hero.");
});

test("Training Room action is blocked when hero is in tower", () => {
  const state = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) =>
      hero.id === MIRA_ID
        ? {
            ...hero,
            status: "in_tower" as const
          }
        : hero
    )
  };

  const blockedState = startHeroTrainingDrill(state, MIRA_ID, 1000);

  expect(getTrainingRoomAssignmentBlockReason(state, MIRA_ID)).toBe("Mira is in tower.");
  expect(getHeroActiveRoomJob(blockedState, MIRA_ID)).toBeNull();
  expect(blockedState.recentEvents[0]?.message).toBe("Mira is in tower.");
});

test("Training Room action is blocked when hero is resting in Bed Room", () => {
  const woundedState: GameState = {
    ...unlockTrainingRoom(createInitialGameState(), 1),
    heroes: createInitialGameState().heroes.map((hero) =>
      hero.id === MIRA_ID
        ? {
            ...hero,
            currentHp: 40,
            status: "resting" as const
          }
        : hero
    )
  };
  const restingState = assignHeroToBedHealingIfNeeded(woundedState, MIRA_ID, 1000);
  const blockedState = startHeroTrainingDrill(restingState, MIRA_ID, 2000);

  expect(getTrainingRoomAssignmentBlockReason(restingState, MIRA_ID)).toBe("Mira is resting.");
  expect(getHeroActiveRoomJob(blockedState, MIRA_ID)?.roomId).toBe("bed_room");
  expect(blockedState.recentEvents[0]?.message).toBe("Mira is resting.");
});

test("Training Room status text reflects active continuous progress", () => {
  const state = startHeroTrainingDrill(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const partialState = tickRoomJobs(state, 30_000, 31_000);
  const text = getTrainingRoomInnText(partialState, partialState.heroes[0]);

  expect(text.speedLabel).toBe("Train 1 XP/s");
  expect(text.selectorLabel).toBe("Target: Mira");
  expect(text.assignmentLabel).toBe("Mira training");
  expect(text.bonusLabel).toBe("Mira training: +0 ATK");
  expect(text.progressLabel).toBe("Next +ATK 30/60 XP");
  expect(text.actionLabel).toBe("Cancel Training");
});

test("training jobs keep running after one attack-training level", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const partialState = tickRoomJobs(state, 30_000, 31_000);

  expect(partialState.heroes[0]?.training.attackTrainingXp).toBe(30);
  expect(partialState.heroes[0]?.training.totalTrainingSeconds).toBe(30);
  expect(partialState.heroes[0]?.training.attackTrainingLevel).toBe(0);
  expect(getHeroActiveRoomJob(partialState, MIRA_ID)?.progress).toBeCloseTo(0.5);

  const continuedState = tickRoomJobs(partialState, 35_000, 66_000);

  expect(continuedState.heroes[0]?.training.attackTrainingXp).toBe(5);
  expect(continuedState.heroes[0]?.training.attackTrainingLevel).toBe(1);
  expect(continuedState.heroes[0]?.training.totalTrainingSeconds).toBe(65);
  expect(continuedState.heroes[0]?.status).toBe("training");
  expect(getHeroActiveRoomJob(continuedState, MIRA_ID)?.roomId).toBe("training_room");
});

test("Cancel Training safely frees the hero and keeps earned progress", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const trainedState = tickRoomJobs(state, 65_000, 66_000);
  const cancelledState = cancelHeroTrainingDrill(trainedState, MIRA_ID, 67_000);

  expect(cancelledState.heroes[0]?.training.attackTrainingLevel).toBe(1);
  expect(cancelledState.heroes[0]?.training.attackTrainingXp).toBe(5);
  expect(getHeroActiveRoomJob(cancelledState, MIRA_ID)).toBeNull();
  expect(cancelledState.heroes[0]?.status).toBe("ready");
  expect(cancelledState.recentEvents[0]?.message).toBe("Mira stopped training.");
});

test("training tick only mutates training progress and status, not HP", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const beforeHero = state.heroes[0];
  const beforeMaxHp = getHeroMaxHp(beforeHero);
  const tickedState = tickRoomJobs(state, 10_000, 11_000);
  const afterHero = tickedState.heroes[0];

  expect(afterHero?.currentHp).toBe(beforeHero.currentHp);
  expect(afterHero ? getHeroMaxHp(afterHero) : null).toBe(beforeMaxHp);
  expect(afterHero?.training.attackTrainingXp).toBeGreaterThan(beforeHero.training.attackTrainingXp);
  expect(afterHero?.training.totalTrainingSeconds).toBeGreaterThan(beforeHero.training.totalTrainingSeconds);
});

test("active training progress does not churn Inn readiness render key", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000);
  const beforeKey = getInnReadinessRenderKey(state);
  const tickedState = tickRoomJobs(state, 10_000, 11_000);

  expect(tickedState.heroes[0]?.training.attackTrainingXp).toBeGreaterThan(state.heroes[0].training.attackTrainingXp);
  expect(getHeroActiveRoomJob(tickedState, MIRA_ID)?.progress).toBeGreaterThan(0);
  expect(getInnReadinessRenderKey(tickedState)).toBe(beforeKey);
});

test("combat HP stays base HP while training bonus only affects attack", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 1);
  const trainedHero = {
    ...state.heroes[0],
    training: {
      attackTrainingXp: 0,
      attackTrainingLevel: 3,
      totalTrainingSeconds: 180
    }
  };
  const trainedState: GameState = {
    ...state,
    heroes: [trainedHero]
  };
  const stats = createHeroCombatStats(trainedState, trainedHero);

  expect(stats?.hp).toBe(120);
  expect(stats?.attack).toBe(15);
});

test("runtime training math clamps invalid values without changing HP", () => {
  const state = assignHeroToTrainingRoom(
    {
      ...unlockTrainingRoom(createInitialGameState(), 1),
      heroes: createInitialGameState().heroes.map((hero) => ({
        ...hero,
        training: {
          attackTrainingXp: Number.POSITIVE_INFINITY,
          attackTrainingLevel: Number.POSITIVE_INFINITY,
          totalTrainingSeconds: Number.POSITIVE_INFINITY
        }
      }))
    },
    MIRA_ID,
    1000
  );
  const tickedState = tickRoomJobs(state, 1_000, 2_000);

  expect(tickedState.heroes[0]?.currentHp).toBe(120);
  expect(tickedState.heroes[0]?.training.attackTrainingLevel).toBe(0);
  expect(tickedState.heroes[0]?.training.attackTrainingXp).toBe(1);
});

test("combat stats use hero-specific training instead of a global room aura", () => {
  const state = unlockTrainingRoom(createInitialGameState(), 3);
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
  expect(createHeroCombatStats(trainedState, untrainedHero)?.attack).toBe(14);
});

test("Training Room level increases training speed", () => {
  expect(calculateTrainingRoomXpPerSecondForLevel(1)).toBe(1);
  expect(calculateTrainingRoomXpPerSecondForLevel(3)).toBe(2);

  const levelOneState = tickRoomJobs(assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), MIRA_ID, 1000), 10_000, 11_000);
  const levelThreeState = tickRoomJobs(assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 3), MIRA_ID, 1000), 10_000, 11_000);

  expect(levelOneState.heroes[0]?.training.attackTrainingXp).toBe(10);
  expect(levelThreeState.heroes[0]?.training.attackTrainingXp).toBe(20);
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

test("save normalization clamps huge HP and training stats to readable finite values", () => {
  const baseState = createInitialGameState();
  const normalized = normalizeLoadedGameState({
    ...baseState,
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 999_999_999_999,
      training: {
        attackTrainingXp: 999_999_999,
        attackTrainingLevel: 999_999_999,
        totalTrainingSeconds: 999_999_999_999
      }
    }))
  });

  expect(normalized?.heroes[0]?.currentHp).toBe(120);
  expect(normalized?.heroes[0]?.training.attackTrainingXp).toBe(60);
  expect(normalized?.heroes[0]?.training.attackTrainingLevel).toBe(MAX_TRAINING_ATTACK_LEVEL);
  expect(normalized?.heroes[0] ? getHeroHpDisplayText(normalized.heroes[0]).label : null).toBe("HP 120/120");
});

test("HP display text clamps corrupted runtime HP to finite max HP", () => {
  const state = createInitialGameState();
  const display = getHeroHpDisplayText({
    ...state.heroes[0],
    currentHp: 999_999_999_999
  });

  expect(display.label).toBe("HP 120/120");
  expect(display.ratio).toBe(1);
});

test("Build View copy explains selected-hero training instead of a global aura", () => {
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Trains selected heroes over time.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Higher room level trains faster.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("Personal +ATK is kept.");
  expect(TRAINING_ROOM_BUILD_COPY).toContain("No global attack aura.");
});

test("Inn training action starts selected hero and then cancels active training", () => {
  const selectedState = selectTrainingHero(unlockTrainingRoom(createInitialGameState(), 1), LINA_ID);
  const trainingState = handleInnTrainingAction(selectedState, LINA_ID);
  const cancelledState = handleInnTrainingAction(trainingState, LINA_ID);

  expect(getHeroActiveRoomJob(trainingState, LINA_ID)?.jobType).toBe("training");
  expect(getHeroActiveRoomJob(cancelledState, LINA_ID)).toBeNull();
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
