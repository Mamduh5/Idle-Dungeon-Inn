import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { roomDefinitions } from "../../src/data/roomData";
import { createInitialGameState } from "../../src/game/initialState";
import { normalizeLoadedGameState } from "../../src/state/saveStorage";
import { tickAutomation } from "../../src/systems/automationSystem";
import {
  BASE_AUTO_DISPATCH_COOLDOWN_MS,
  BASE_TOWER_TRAVEL_DURATION_MS,
  getGateRoomTravelDurationMs,
  getLibraryAutoDispatchCooldownMs
} from "../../src/systems/roomEffectSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { getBuildViewModel } from "../../src/viewModels/buildViewModel";
import type { GameState } from "../../src/types/gameState";
import type { RoomId } from "../../src/types/ids";

const NEW_ROOM_IDS: RoomId[] = ["kitchen", "forge", "tavern", "library", "gate_room"];

test("new room data and initial room states exist", () => {
  const state = createInitialGameState();

  for (const roomId of NEW_ROOM_IDS) {
    expect(roomDefinitions[roomId]?.name, roomId).toBeTruthy();
    expect(state.innRooms.find((room) => room.roomId === roomId), roomId).toMatchObject({
      roomId,
      level: 0,
      isUnlocked: false,
      activeJob: null
    });
  }
});

test("old saves normalize missing new room states without a save-version bump", () => {
  const baseState = createInitialGameState();
  const legacyState = {
    ...baseState,
    innRooms: baseState.innRooms.filter((room) => !NEW_ROOM_IDS.includes(room.roomId))
  };
  const normalized = normalizeLoadedGameState(legacyState);

  expect(normalized?.version).toBe(1);
  for (const roomId of NEW_ROOM_IDS) {
    expect(normalized?.innRooms.find((room) => room.roomId === roomId)?.isUnlocked).toBe(false);
  }
});

test("Gate Room reduces tower travel duration through the tower backend", () => {
  const baseState = createTravelingState(createInitialGameState());
  const gateState = createTravelingState(unlockRoom(createInitialGameState(), "gate_room", 1));
  const gateTravelMs = getGateRoomTravelDurationMs(gateState);
  const baseTickedState = tickTowerRuns(baseState, gateTravelMs, 2000);
  const gateTickedState = tickTowerRuns(gateState, gateTravelMs, 2000);

  expect(gateTravelMs).toBeLessThan(BASE_TOWER_TRAVEL_DURATION_MS);
  expect(baseTickedState.towerRuns[0]?.status).toBe("traveling");
  expect(gateTickedState.towerRuns[0]?.status).toBe("exploring");
});

test("Library reduces auto-dispatch cooldown through the automation backend", () => {
  const baseState = createAutoDispatchCooldownState(createInitialGameState());
  const libraryState = createAutoDispatchCooldownState(unlockRoom(createInitialGameState(), "library", 2));
  const baseTickedState = tickAutomation(baseState, 1300);
  const libraryTickedState = tickAutomation(libraryState, 1300);

  expect(getLibraryAutoDispatchCooldownMs(libraryState)).toBeLessThan(BASE_AUTO_DISPATCH_COOLDOWN_MS);
  expect(baseTickedState.towerRuns[0]?.status).toBe("preparing");
  expect(libraryTickedState.towerRuns[0]?.status).toBe("traveling");
});

test("Build View exposes new room cards with finite effects", () => {
  const viewModel = getBuildViewModel(unlockRoom(unlockRoom(createInitialGameState(), "library", 2), "gate_room", 1));
  const cards = viewModel.choiceCategories.flatMap((category) => category.cards);

  for (const roomId of ["kitchen", "forge", "tavern", "library", "gate_room"]) {
    expect(cards.find((card) => card.targetRoomId === roomId)?.title).toBe(roomDefinitions[roomId]?.name);
  }

  expect(cards.find((card) => card.targetRoomId === "library")?.gameplayEffect).toContain("automation delay");
  expect(cards.find((card) => card.targetRoomId === "gate_room")?.gameplayEffect).toContain("tower travel");
  expect(cards.every((card) => !card.gameplayEffect.includes("NaN") && !card.gameplayEffect.includes("Infinity"))).toBe(true);
});

test("new room systems and view models stay Phaser-free", () => {
  for (const filePath of ["src/systems/roomEffectSystem.ts", "src/viewModels/buildViewModel.ts"]) {
    const source = readFileSync(filePath, "utf8");

    expect(source, filePath).not.toContain("from \"phaser\"");
    expect(source, filePath).not.toContain("from 'phaser'");
    expect(source, filePath).not.toContain("../scenes");
  }
});

function unlockRoom(state: GameState, roomId: RoomId, level: number): GameState {
  return {
    ...state,
    innRooms: state.innRooms.map((room) =>
      room.roomId === roomId
        ? {
            ...room,
            level,
            isUnlocked: true
          }
        : room
    )
  };
}

function createTravelingState(state: GameState): GameState {
  return {
    ...state,
    towerRuns: state.towerRuns.map((run) =>
      run.partyId === "party_lantern"
        ? {
            ...run,
            status: "traveling" as const,
            floor: 1,
            nodeProgress: 0
          }
        : run
    )
  };
}

function createAutoDispatchCooldownState(state: GameState): GameState {
  return {
    ...state,
    automation: {
      ...state.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: 0,
      enabled: {
        ...state.automation.enabled,
        auto_dispatch_board: true
      }
    },
    towerRuns: state.towerRuns.map((run) =>
      run.partyId === "party_lantern"
        ? {
            ...run,
            status: "preparing" as const,
            floor: 1,
            nodeIndex: 0,
            nodeProgress: 0
          }
        : run
    )
  };
}
