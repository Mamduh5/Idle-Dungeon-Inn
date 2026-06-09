import { expect, test, type Page } from "@playwright/test";
import { createInitialGameState } from "../../src/game/initialState";
import {
  getFloor10BossCallout,
  getLatestActionableBottleneckHint,
  getRecommendedUpgradeRoomIds
} from "../../src/systems/bottleneckCalloutSystem";
import { tickAutomation } from "../../src/systems/automationSystem";
import { FLOOR_10_BOSS_HINT, FLOOR_10_BOSS_ID } from "../../src/systems/bottleneckHintSystem";
import { completeSelectedFloor } from "../../src/systems/floorClearSystem";
import { sendSelectedPartyToTower } from "../../src/systems/partyDispatchSystem";
import { purchaseRoomUpgrade } from "../../src/systems/roomUpgradeSystem";
import { tickCombat } from "../../src/systems/combatSystem";
import { tickTowerRuns } from "../../src/systems/towerRunSystem";
import { continueSelectedTowerRun } from "../../src/systems/towerNodeActionSystem";
import { recoverSelectedWipedParty } from "../../src/systems/wipeRecoverySystem";
import type { GameState } from "../../src/types/gameState";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const saveStorageKey = "idle-dungeon-inn:save:v1";
const gameWidth = 390;
const gameHeight = 844;
const SIM_DELTA_MS = 250;
const SIM_STEP_LIMIT = 400;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test("fresh state has no Floor 10 bottleneck callout", () => {
  const state = createInitialGameState();

  expect(getLatestActionableBottleneckHint(state)).toBeNull();
  expect(getFloor10BossCallout(state)).toBeNull();
  expect(getRecommendedUpgradeRoomIds(state)).toEqual([]);
});

test("Floor 10 bottleneck hint recommends Bed Room and Training Room", () => {
  const state = createStateWithFloor10Bottleneck();
  const callout = getFloor10BossCallout(state);

  expect(getLatestActionableBottleneckHint(state)).toContain("Floor 10 checkpoint");
  expect(getRecommendedUpgradeRoomIds(state)).toEqual(["bed_room", "training_room"]);
  expect(callout?.buildMessage).toContain("Floor 10 blocked your party");
  expect(callout?.buildMessage).toContain("Bed Room");
  expect(callout?.buildMessage).toContain("Training Room");
  expect(callout?.recommendations.map((recommendation) => recommendation.buildWhy)).toEqual([
    "Bed Room: improves recovery/retry pacing.",
    "Training Room: improves attack/checkpoint progress."
  ]);
});

test("unrelated Floor 6 wipe hint does not trigger Floor 10 callout", () => {
  const state: GameState = {
    ...createInitialGameState(),
    unlockedFloor: 6,
    towerRuns: createInitialGameState().towerRuns.map((run) => ({
      ...run,
      status: "wiped",
      floor: 6,
      lastFailureReason: "Party wiped. Return to the inn to recover."
    })),
    recentEvents: [
      {
        id: "event_floor_6_wipe",
        type: "party_wiped",
        createdAt: Date.now(),
        message: "Lantern Party was wiped on Floor 6.",
        severity: "danger",
        partyId: "party_lantern",
        floor: 6
      }
    ]
  };

  expect(getLatestActionableBottleneckHint(state)).toBeNull();
  expect(getFloor10BossCallout(state)).toBeNull();
});

test("Build and Inn scenes surface Floor 10 recommendations without screenshots", async ({ page }) => {
  await loadState(page, createInitialGameState());
  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);

  let buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).not.toContain("Floor 10 bottleneck");
  expect(buildTexts).not.toContain("Recommended");

  await loadState(page, createStateWithFloor10Bottleneck());
  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);

  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Floor 10 bottleneck");
  expect(buildTexts).toContain(
    "Floor 10 blocked your party. Upgrade Bed Room for safer retries or Training Room for more damage."
  );
  expect(buildTexts).toContain("Bed Room: improves recovery/retry pacing.");
  expect(buildTexts).toContain("Training Room: improves attack/checkpoint progress.");
  expect(buildTexts.filter((text) => text === "Recommended")).toHaveLength(2);

  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);
  const innTexts = await getSceneTexts(page, "InnScene");
  expect(innTexts).toContain("Upgrade advice");
  expect(innTexts).toContain("Recommended after Floor 10 wipe");
  expect(innTexts).toContain("Recommended for boss damage");
});

test("Bed Room and Training Room upgrade behavior still works with bottleneck state", () => {
  let state = createStateWithFloor10Bottleneck();
  state = {
    ...state,
    currencies: { coins: 200 }
  };

  const afterBed = purchaseRoomUpgrade("bed_room")(state);
  expect(afterBed.currencies.coins).toBe(175);
  expect(afterBed.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(afterBed.recentEvents[0]?.message).toBe("Bed Room upgraded to Lv 2 for 25 coins.");

  const afterTraining = purchaseRoomUpgrade("training_room")(afterBed);
  expect(afterTraining.currencies.coins).toBe(115);
  expect(afterTraining.innRooms.find((room) => room.roomId === "training_room")?.level).toBe(1);
  expect(afterTraining.recentEvents[0]?.message).toBe("Training Room unlocked to Lv 1 for 60 coins.");
});

test("Floor 6 wipe and manual recovery remain valid", () => {
  let state = createInitialGameState();

  for (let floor = 1; floor <= 5; floor += 1) {
    const result = runCurrentFloorUntilReturn(state);
    expect(result.status, `Floor ${floor} should clear before Floor 6`).toBe("cleared");
    state = result.state;
  }

  const floor6 = runCurrentFloorUntilReturn(state);
  expect(floor6.status).toBe("wiped");
  expect(floor6.state.towerRuns[0]?.floor).toBe(6);

  const recovered = recoverSelectedWipedParty(floor6.state);
  expect(recovered.towerRuns[0]?.status).toBe("preparing");
  expect(recovered.towerRuns[0]?.floor).toBe(6);
  expect(recovered.heroes[0]?.status).toBe("ready");
  expect(recovered.heroes[0]?.currentHp).toBeGreaterThan(0);
});

test("Auto-Dispatch still does not auto-recover wiped runs", () => {
  const now = Date.now();
  const state = createStateWithFloor10Bottleneck();
  const wipedState: GameState = {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated"
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "wiped",
      enemies: [
        {
          enemyId: FLOOR_10_BOSS_ID,
          currentHp: 96,
          status: "active"
        }
      ]
    })),
    automation: {
      ...state.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now - 5000,
      enabled: {
        ...state.automation.enabled,
        auto_dispatch_board: true
      }
    },
    recentEvents: [],
    lastActiveAt: now - 5000
  };

  const afterAutomation = tickAutomation(wipedState, now);
  expect(afterAutomation.towerRuns[0]?.status).toBe("wiped");
  expect(afterAutomation.heroes[0]?.status).toBe("defeated");
  expect(afterAutomation.recentEvents).toHaveLength(0);
});

function createStateWithFloor10Bottleneck(): GameState {
  const now = Date.now();
  const state = createInitialGameState();

  return {
    ...state,
    currencies: { coins: 200 },
    unlockedFloor: 10,
    highestFloorCleared: 9,
    firstClearFloorIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    parties: state.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 10
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "preparing",
      floor: 10,
      nodeIndex: 2,
      nodeProgress: 1,
      enemies: [],
      lastCombatEventMessage: "Floor 10 checkpoint failed. Return to the inn, recover, then improve Bed Room or Training Room.",
      lastFailureReason: FLOOR_10_BOSS_HINT,
      startedAt: now - 5000
    })),
    recentEvents: [
      {
        id: "event_floor_10_bottleneck",
        type: "party_wiped",
        createdAt: now,
        message: `${FLOOR_10_BOSS_HINT} Fix: Bed Room and Training Room help next retry.`,
        severity: "danger",
        partyId: "party_lantern",
        floor: 10
      }
    ],
    lastActiveAt: now
  };
}

function runCurrentFloorUntilReturn(state: GameState): { state: GameState; status: "cleared" | "wiped" } {
  let currentState = sendSelectedPartyToTower(state, { now: Date.now() });

  for (let steps = 0; steps < SIM_STEP_LIMIT; steps += 1) {
    currentState = tickTowerRuns(currentState, SIM_DELTA_MS, Date.now());
    currentState = tickCombat(currentState, SIM_DELTA_MS, Date.now());

    const run = currentState.towerRuns[0];
    if (!run) {
      throw new Error("Expected a tower run during Floor 6 regression simulation.");
    }

    if (run.status === "wiped") {
      return { state: currentState, status: "wiped" };
    }

    if (run.status === "looting" || run.lastFailureReason === "Encounter cleared. Node advancement is not implemented yet.") {
      currentState = continueSelectedTowerRun(currentState);
      continue;
    }

    if (run.lastFailureReason === "Floor clear is not implemented yet.") {
      return { state: completeSelectedFloor(currentState), status: "cleared" };
    }
  }

  throw new Error(`Timed out simulating Floor ${currentState.towerRuns[0]?.floor ?? "unknown"}.`);
}

async function loadState(page: Page, state: GameState): Promise<void> {
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(
    ({ key, serializedState }) => localStorage.setItem(key, serializedState),
    { key: saveStorageKey, serializedState: JSON.stringify(state) }
  );
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);
}

async function clickCanvas(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator("canvas").boundingBox();
  if (!box) {
    throw new Error("Canvas bounding box was not available.");
  }
  await page.mouse.click(box.x + (x / gameWidth) * box.width, box.y + (y / gameHeight) * box.height);
}

async function getSceneTexts(page: Page, sceneKey: string): Promise<string[]> {
  return page.evaluate((key) => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: Phaser.Game;
    }).__idleDungeonInnGame;
    const scene = game?.scene.getScene(key) as Phaser.Scene | undefined;
    return (
      scene?.children.list
        .map((child) => (child as { text?: unknown }).text)
        .filter((text): text is string => typeof text === "string") ?? []
    );
  }, sceneKey);
}
