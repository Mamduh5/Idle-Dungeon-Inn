import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createInitialGameState } from "../../src/game/initialState";
import { getInnCameraScrollForCreate } from "../../src/ui/innCameraScroll";
import { getInnReadinessRenderKey } from "../../src/ui/innRenderKey";
import { assignHeroToBedHealingIfNeeded, assignHeroToTrainingRoom, tickRoomJobs } from "../../src/systems/roomJobSystem";
import type { GameState } from "../../src/types/gameState";

test("InnScene update ticks game state without passive scene restart", () => {
  const source = readFileSync("src/scenes/InnScene.ts", "utf8");
  const updateMethod = source.match(/public update\([\s\S]*?\n  }\n\n  private configureCamera/);

  expect(updateMethod?.[0]).toContain("tickGameState");
  expect(updateMethod?.[0]).not.toContain("scene.restart");
  expect(updateMethod?.[0]).not.toContain("getInnReadinessRenderKey");
});

test("InnScene keeps explicit restart path scroll-aware only", () => {
  const source = readFileSync("src/scenes/InnScene.ts", "utf8");

  expect(source).toContain("private restartWithCurrentScroll()");
  expect(source).toContain("this.scene.restart({ scrollX: this.cameras.main.scrollX }");
  expect(source).not.toContain("this.scene.restart();");
});

test("Inn readiness render key ignores passive Bed Room healing HP ticks", () => {
  const state = assignHeroToBedHealingIfNeeded(createRestingState(40), "hero_rookie_knight_1", 1000);
  const beforeKey = getInnReadinessRenderKey(state);
  const tickedState = tickRoomJobs(state, 1_000, 2_000);

  expect(tickedState.heroes[0]?.currentHp).toBeGreaterThan(state.heroes[0]?.currentHp ?? 0);
  expect(getInnReadinessRenderKey(tickedState)).toBe(beforeKey);
});

test("Inn readiness render key ignores passive Training Room progress ticks", () => {
  const state = assignHeroToTrainingRoom(unlockTrainingRoom(createInitialGameState(), 1), "hero_rookie_knight_1", 1000);
  const beforeKey = getInnReadinessRenderKey(state);
  const tickedState = tickRoomJobs(state, 10_000, 11_000);

  expect(tickedState.heroes[0]?.training.attackTrainingXp).toBeGreaterThan(state.heroes[0]?.training.attackTrainingXp ?? 0);
  expect(getInnReadinessRenderKey(tickedState)).toBe(beforeKey);
});

test("Inn explicit redraw camera scroll helper preserves and clamps scroll", () => {
  expect(getInnCameraScrollForCreate(undefined, 330, 900)).toBe(330);
  expect(getInnCameraScrollForCreate(620, 330, 900)).toBe(620);
  expect(getInnCameraScrollForCreate(-25, 330, 900)).toBe(0);
  expect(getInnCameraScrollForCreate(1200, 330, 900)).toBe(900);
  expect(getInnCameraScrollForCreate(Number.NaN, 330, 900)).toBe(330);
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
    )
  };
}
