import { expect, test } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import {
  applyOfflineProgress,
  calculateOfflineElapsedMs,
  OFFLINE_PROGRESS_MAX_ELAPSED_MS
} from "../../src/systems/offlineProgressSystem";
import {
  assignHeroToBedHealingIfNeeded,
  getHeroActiveRoomJob,
  startHeroTrainingDrill
} from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";

test("Bed Room heals while offline and reports room work", () => {
  const now = 1_000_000;
  const state = withLastActiveAt(
    assignHeroToBedHealingIfNeeded(createRestingState(40), "hero_rookie_knight_1", now - 120_000),
    now - 120_000
  );
  const offlineState = applyOfflineProgress(state, now);
  const hero = offlineState.heroes.find((candidate) => candidate.id === "hero_rookie_knight_1");
  const report = offlineState.recentEvents[0];

  expect(hero?.currentHp).toBeGreaterThan(40);
  expect(report?.type).toBe("offline_report");
  expect(report?.message).toContain("Mira recovered");
  expect(report?.message).toContain("Bed Room");
});

test("Training Room progresses and completes one drill while offline", () => {
  const now = 1_000_000;
  const trainingState = startHeroTrainingDrill(
    unlockTrainingRoom(createInitialGameState(), 1),
    "hero_apprentice_archer_1",
    now - 70_000
  );
  const state = withLastActiveAt(trainingState, now - 70_000);
  const offlineState = applyOfflineProgress(state, now);
  const archer = offlineState.heroes.find((hero) => hero.id === "hero_apprentice_archer_1");

  expect(archer?.training.attackTrainingLevel).toBe(1);
  expect(archer?.status).toBe("ready");
  expect(getHeroActiveRoomJob(offlineState, "hero_apprentice_archer_1")).toBeNull();
  expect(offlineState.recentEvents[0]?.message).toContain("Lina completed 1 attack drill in Training Room");
});

test("offline progress does not duplicate after the saved lastActiveAt is current", () => {
  const now = 1_000_000;
  const state = withLastActiveAt(
    assignHeroToBedHealingIfNeeded(createRestingState(40), "hero_rookie_knight_1", now - 120_000),
    now - 120_000
  );
  const firstOfflineState = applyOfflineProgress(state, now);
  const secondOfflineState = applyOfflineProgress(firstOfflineState, now + 1000);

  expect(firstOfflineState.recentEvents.filter((event) => event.type === "offline_report")).toHaveLength(1);
  expect(secondOfflineState).toBe(firstOfflineState);
});

test("offline room progress clamps elapsed time and reports the cap", () => {
  const now = 10_000_000;
  const state = withLastActiveAt(
    assignHeroToBedHealingIfNeeded(createRestingState(1), "hero_rookie_knight_1", now - 3 * OFFLINE_PROGRESS_MAX_ELAPSED_MS),
    now - 3 * OFFLINE_PROGRESS_MAX_ELAPSED_MS
  );
  const offlineState = applyOfflineProgress(state, now);

  expect(calculateOfflineElapsedMs(state, now)).toBe(3 * OFFLINE_PROGRESS_MAX_ELAPSED_MS);
  expect(offlineState.recentEvents[0]?.message).toContain("While you were away for 30m");
  expect(offlineState.recentEvents[0]?.message).toContain("Progress was capped");
  expect(Number.isFinite(offlineState.heroes[0]?.currentHp ?? Number.NaN)).toBe(true);
});

test("invalid timestamps do not produce offline reports or corrupt state", () => {
  const state: GameState = {
    ...createInitialGameState(),
    lastActiveAt: Number.NaN
  };
  const offlineState = applyOfflineProgress(state, 1_000_000);

  expect(calculateOfflineElapsedMs(state, 1_000_000)).toBe(0);
  expect(offlineState).toBe(state);
  expect(offlineState.recentEvents[0]?.type).toBe("save_loaded");
});

function createRestingState(currentHp: number): GameState {
  const state = createInitialGameState();

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp,
      status: "resting" as const
    }))
  };
}

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
    ),
    unlockedFloor: Math.max(state.unlockedFloor, 2)
  };
}

function withLastActiveAt(state: GameState, lastActiveAt: number): GameState {
  return {
    ...state,
    lastActiveAt
  };
}
