import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const screenshotDir = path.resolve("review/redesign-09/screenshots");
const saveStorageKey = "idle-dungeon-inn:save:v1";
const gameWidth = 390;
const gameHeight = 844;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(70000);

test("full current gameplay loop and required screenshots", async ({ page }) => {
  await startFreshGame(page);

  await dragCanvas(page, 90, 430, 360, 430);
  await page.waitForTimeout(250);
  const leftScroll = await getInnCameraScrollX(page);
  expect(leftScroll).toBeLessThan(120);
  await page.screenshot({ path: shot("01-inn-left-bed-area.png") });

  await dragCanvas(page, 340, 430, 70, 430);
  await page.waitForTimeout(250);
  const centerScroll = await getInnCameraScrollX(page);
  expect(centerScroll).toBeGreaterThan(leftScroll + 180);
  await page.screenshot({ path: shot("02-inn-center-hearth-area.png") });

  await dragCanvas(page, 340, 430, 60, 430);
  await dragCanvas(page, 340, 430, 60, 430);
  await page.waitForTimeout(250);
  const rightScroll = await getInnCameraScrollX(page);
  expect(rightScroll).toBeGreaterThan(centerScroll + 360);
  expect(rightScroll).toBeLessThanOrEqual(870);
  await page.screenshot({ path: shot("03-inn-right-gate-area.png") });

  await clickCanvas(page, 250, 676);
  await waitForTowerStatus(page, "traveling");
  await page.screenshot({ path: shot("04-tower-traveling.png") });

  await waitForTowerStatus(page, "fighting");
  await page.screenshot({ path: shot("05-tower-fighting.png") });

  await waitForTowerBlockedReason(page, "Encounter cleared");
  await page.screenshot({ path: shot("06-tower-continue-run.png") });

  await clickCanvas(page, 195, 652);
  await waitForTowerBlockedReason(page, "Floor clear");
  await page.screenshot({ path: shot("07-tower-complete-floor.png") });

  await clickCanvas(page, 195, 652);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot("08-inn-after-return.png") });

  await clickCanvas(page, 146, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);

  await clickCanvas(page, 244, 814);
  await page.waitForTimeout(250);
  await page.screenshot({ path: shot("09-heroes-view.png") });

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await page.screenshot({ path: shot("10-build-view.png") });

  await clickCanvas(page, 116, 402);
  await page.waitForTimeout(250);
  const upgradedState = await getGameStateSnapshot(page);
  expect(upgradedState.currencies.coins).toBe(0);
  expect(upgradedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  await page.screenshot({ path: shot("11-build-bed-upgraded.png") });
});

test("bed room return healing follows room level", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  expect(initialState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(1);

  const floorOne = await clearCurrentFloor(page, false);
  expect(floorOne.after.unlockedFloor).toBe(2);
  expect(floorOne.after.currencies.coins).toBe(25);
  expect(floorOne.after.heroes[0]?.status).toBe("ready");
  expect(floorOne.after.heroes[0]?.currentHp).toBeGreaterThanOrEqual(108);
  expect(floorOne.after.recentEvents[0]?.message).toContain("returned to the inn for readiness checks");

  await forceRestingBedJob(page, 40);
  await page.waitForTimeout(2000);
  const levelOneHealingState = await getGameStateSnapshot(page);
  const levelOneHealingGain = (levelOneHealingState.heroes[0]?.currentHp ?? 0) - 40;
  expect(levelOneHealingState.heroes[0]?.status).toBe("resting");
  expect(levelOneHealingGain).toBeGreaterThan(0);

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 116, 402);
  await page.waitForTimeout(250);

  const upgradedState = await getGameStateSnapshot(page);
  expect(upgradedState.currencies.coins).toBe(0);
  expect(upgradedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);

  await forceRestingBedJob(page, 40);
  await page.waitForTimeout(2000);
  const levelTwoHealingState = await getGameStateSnapshot(page);
  const levelTwoHealingGain = (levelTwoHealingState.heroes[0]?.currentHp ?? 0) - 40;
  expect(levelTwoHealingState.heroes[0]?.status).toBe("resting");
  expect(levelTwoHealingGain).toBeGreaterThan(levelOneHealingGain);
});

test("training room attack bonus follows room level and affects combat", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const initialTrainingRoom = initialState.innRooms.find((room) => room.roomId === "training_room");
  expect(initialTrainingRoom?.isUnlocked).toBe(false);
  expect(initialTrainingRoom?.level).toBe(0);
  expect(Object.prototype.hasOwnProperty.call(initialState.heroes[0], "attack")).toBe(false);

  const lockedDamage = await startCurrentFloorAndCaptureHeroDamage(page);
  expect(lockedDamage).toBe(11);
  const floorOne = await finishCurrentFloorFromCombat(page, []);
  expect(floorOne.after.currencies.coins).toBe(25);

  const floorTwo = await clearCurrentFloor(page, true);
  expect(floorTwo.after.currencies.coins).toBe(65);

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  let buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Combat +0 ATK");
  expect(buildTexts).not.toContain("No effect yet");

  await clickCanvas(page, 274, 402);
  await page.waitForTimeout(250);
  const trainingLevelOneState = await getGameStateSnapshot(page);
  expect(trainingLevelOneState.currencies.coins).toBe(5);
  expect(trainingLevelOneState.innRooms.find((room) => room.roomId === "training_room")?.level).toBe(1);
  expect(Object.prototype.hasOwnProperty.call(trainingLevelOneState.heroes[0], "attack")).toBe(false);
  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Combat +2 ATK");
  expect(buildTexts).not.toContain("No effect yet");

  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);
  const innTexts = await getSceneTexts(page, "InnScene");
  expect(innTexts).toContain("Train +2 ATK");

  await forceReadyPreparingState(page, false);
  const trainingLevelOneDamage = await startCurrentFloorAndCaptureHeroDamage(page);
  expect(trainingLevelOneDamage).toBe(13);
  expect(trainingLevelOneDamage).toBeGreaterThan(lockedDamage);
  const floorThree = await finishCurrentFloorFromCombat(page, ["combat"]);
  expect(floorThree.after.currencies.coins).toBe(65);

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 274, 402);
  await page.waitForTimeout(250);
  const trainingLevelTwoState = await getGameStateSnapshot(page);
  expect(trainingLevelTwoState.currencies.coins).toBe(5);
  expect(trainingLevelTwoState.innRooms.find((room) => room.roomId === "training_room")?.level).toBe(2);
  expect(Object.prototype.hasOwnProperty.call(trainingLevelTwoState.heroes[0], "attack")).toBe(false);
  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Combat +4 ATK");
  expect(buildTexts).not.toContain("No effect yet");
});

test("auto dispatch unlocks and sends ready party", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  expect(initialState.automation.autoDispatchLevel).toBe(0);
  expect(initialState.automation.enabled.auto_dispatch_board).toBe(false);

  await clearCurrentFloor(page, false);
  const floorTwo = await clearCurrentFloor(page, true);
  expect(floorTwo.after.unlockedFloor).toBe(3);

  await waitForAutomationUnlocked(page);
  const unlockedState = await getGameStateSnapshot(page);
  expect(unlockedState.automation.autoDispatchLevel).toBe(1);
  expect(unlockedState.automation.enabled.auto_dispatch_board).toBe(true);
  expect(unlockedState.recentEvents.some((event) => event.message === "Auto-Dispatch Board unlocked.")).toBe(true);

  await waitForAutoDispatch(page);
  const dispatchedState = await getGameStateSnapshot(page);
  expect(dispatchedState.heroes[0]?.status).toBe("in_tower");
  expect(dispatchedState.towerRuns[0]?.status).not.toBe("preparing");
  expect(dispatchedState.recentEvents.some((event) => event.message === "Auto-Dispatch sent Lantern Party to Floor 3.")).toBe(true);

  const autoDispatchEventCount = countEventsContaining(dispatchedState, "Auto-Dispatch sent");
  await forceDefeatedPreparingState(page);
  await page.waitForTimeout(2000);
  const defeatedState = await getGameStateSnapshot(page);
  expect(defeatedState.heroes[0]?.status).toBe("defeated");
  expect(defeatedState.towerRuns[0]?.status).toBe("preparing");
  expect(countEventsContaining(defeatedState, "Auto-Dispatch sent")).toBe(autoDispatchEventCount);
});

test("auto dispatch can be toggled on and off", async ({ page }) => {
  await startFreshGame(page);

  await clickAutoDispatchControl(page);
  let state = await getGameStateSnapshot(page);
  expect(state.automation.autoDispatchLevel).toBe(0);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);

  await clearCurrentFloor(page, false);
  await clearCurrentFloor(page, true);
  await waitForAutomationUnlocked(page);
  await waitForSceneText(page, "InnScene", "Auto: ON");

  await clickAutoDispatchControl(page);
  state = await getGameStateSnapshot(page);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.recentEvents.some((event) => event.message === "Auto-Dispatch turned OFF.")).toBe(true);

  await page.waitForTimeout(1800);
  state = await getGameStateSnapshot(page);
  expect(state.heroes[0]?.status).toBe("ready");
  expect(state.towerRuns[0]?.status).toBe("preparing");

  await focusInnGate(page);
  await clickCanvas(page, 250, 676);
  await waitForTowerStatus(page, "traveling");
  state = await getGameStateSnapshot(page);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.heroes[0]?.status).toBe("in_tower");

  await forceReadyPreparingState(page, false);
  await clickCanvas(page, 49, 814);
  await waitForSceneText(page, "InnScene", "Auto: OFF");
  await clickAutoDispatchControl(page);
  state = await getGameStateSnapshot(page);
  expect(state.automation.enabled.auto_dispatch_board).toBe(true);
  expect(state.recentEvents.some((event) => event.message === "Auto-Dispatch turned ON.")).toBe(true);

  await waitForAutoDispatch(page);
  state = await getGameStateSnapshot(page);
  expect(state.heroes[0]?.status).toBe("in_tower");
  expect(state.recentEvents.some((event) => event.message === "Auto-Dispatch sent Lantern Party to Floor 3.")).toBe(true);
});

test("build automation panel controls auto dispatch", async ({ page }) => {
  await startFreshGame(page);

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  let buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Auto-Dispatch Board");
  expect(buildTexts).toContain("Locked");
  expect(buildTexts).toContain("Unlocks at Floor 3");

  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);
  await clearCurrentFloor(page, false);
  await clearCurrentFloor(page, true);
  await waitForAutomationUnlocked(page);

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Status: ON");
  expect(buildTexts).toContain("Turn OFF");

  await clickBuildAutomationToggle(page);
  let state = await getGameStateSnapshot(page);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.recentEvents.some((event) => event.message === "Auto-Dispatch turned OFF.")).toBe(true);
  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Status: OFF");
  expect(buildTexts).toContain("Turn ON");

  await clickCanvas(page, 49, 814);
  await waitForSceneText(page, "InnScene", "Auto: OFF");

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickBuildAutomationToggle(page);
  state = await getGameStateSnapshot(page);
  expect(state.automation.enabled.auto_dispatch_board).toBe(true);
  expect(state.recentEvents.some((event) => event.message === "Auto-Dispatch turned ON.")).toBe(true);
  buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("Status: ON");
  expect(buildTexts).toContain("Turn OFF");

  await clickCanvas(page, 49, 814);
  await waitForSceneText(page, "InnScene", "Auto: ON");
});

test("local save persists room automation and floor progress", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  expect(initialState.unlockedFloor).toBe(1);
  expect(initialState.automation.autoDispatchLevel).toBe(0);

  await clearCurrentFloor(page, false);
  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 116, 402);
  await page.waitForTimeout(250);

  let state = await getGameStateSnapshot(page);
  expect(state.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(state.currencies.coins).toBe(0);

  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);
  await clearCurrentFloor(page, true);
  await waitForAutomationUnlocked(page);
  await waitForSceneText(page, "InnScene", "Auto: ON");
  await clickAutoDispatchControl(page);

  state = await getGameStateSnapshot(page);
  expect(state.unlockedFloor).toBe(3);
  expect(state.highestFloorCleared).toBe(2);
  expect(state.currencies.coins).toBe(40);
  expect(state.automation.autoDispatchLevel).toBe(1);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.towerRuns[0]?.status).toBe("preparing");

  await waitForSaveFlush(page);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const reloadedState = await getGameStateSnapshot(page);
  expect(reloadedState.currencies.coins).toBe(40);
  expect(reloadedState.unlockedFloor).toBe(3);
  expect(reloadedState.highestFloorCleared).toBe(2);
  expect(reloadedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(reloadedState.automation.autoDispatchLevel).toBe(1);
  expect(reloadedState.automation.enabled.auto_dispatch_board).toBe(false);
  expect(reloadedState.selectedPartyId).toBe("party_lantern");
  expect(reloadedState.towerRuns[0]?.status).toBe("preparing");
  expect(reloadedState.recentEvents.some((event) => event.message === "Save loaded.")).toBe(true);
});

test("corrupted localStorage falls back to fresh initial state", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, "{not-valid-json"), saveStorageKey);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const state = await getGameStateSnapshot(page);
  expect(state.version).toBe(1);
  expect(state.currencies.coins).toBe(0);
  expect(state.unlockedFloor).toBe(1);
  expect(state.highestFloorCleared).toBe(0);
  expect(state.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(1);
  expect(state.automation.autoDispatchLevel).toBe(0);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.towerRuns[0]?.status).toBe("preparing");
});

test("dev clear save control resets local state", async ({ page }) => {
  await startFreshGame(page);

  await clearCurrentFloor(page, false);
  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 116, 402);
  await page.waitForTimeout(250);
  await waitForSaveFlush(page);

  let state = await getGameStateSnapshot(page);
  expect(state.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);
  expect(state.unlockedFloor).toBe(2);

  const savedBeforeClear = await getSavedGameState(page);
  expect(savedBeforeClear?.unlockedFloor).toBe(2);

  let buildTexts = await getSceneTexts(page, "BuildScene");
  expect(buildTexts).toContain("DEV: Clear Save");

  await clickDevClearSave(page);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  state = await getGameStateSnapshot(page);
  expect(state.currencies.coins).toBe(0);
  expect(state.unlockedFloor).toBe(1);
  expect(state.automation.autoDispatchLevel).toBe(0);
  expect(state.automation.enabled.auto_dispatch_board).toBe(false);
  expect(state.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(1);
  expect(state.innRooms.find((room) => room.roomId === "training_room")?.level).toBe(0);
  expect(state.innRooms.find((room) => room.roomId === "training_room")?.isUnlocked).toBe(false);

  const savedAfterClear = await getSavedGameState(page);
  expect(savedAfterClear).toBeNull();
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  state = await getGameStateSnapshot(page);
  expect(state.currencies.coins).toBe(0);
  expect(state.unlockedFloor).toBe(1);
  expect(state.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(1);
});

test("responsive readability at 360x640", async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 1
  });
  await startFreshGame(page);
  await page.screenshot({ path: shot("responsive-360x640.png") });
  await dragCanvas(page, 330, 430, 50, 430);
  await dragCanvas(page, 330, 430, 50, 430);
  await page.waitForTimeout(250);
  await page.screenshot({ path: shot("responsive-360x640-inn-gate.png") });
  await clickCanvas(page, 250, 676);
  await page.waitForTimeout(350);
  await page.screenshot({ path: shot("responsive-360x640-tower.png") });
  await page.close();
});

test("responsive readability at 390x844", async ({ page }) => {
  await startFreshGame(page);
  await page.screenshot({ path: shot("responsive-390x844.png") });
});

function shot(fileName: string): string {
  return path.join(screenshotDir, fileName);
}

async function startFreshGame(page: Page): Promise<void> {
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate((key) => localStorage.removeItem(key), saveStorageKey);
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

async function dragCanvas(page: Page, startX: number, startY: number, endX: number, endY: number): Promise<void> {
  const box = await page.locator("canvas").boundingBox();
  if (!box) {
    throw new Error("Canvas bounding box was not available.");
  }

  await page.mouse.move(box.x + (startX / gameWidth) * box.width, box.y + (startY / gameHeight) * box.height);
  await page.mouse.down();
  await page.mouse.move(box.x + (endX / gameWidth) * box.width, box.y + (endY / gameHeight) * box.height, {
    steps: 12
  });
  await page.mouse.up();
}

async function getInnCameraScrollX(page: Page): Promise<number> {
  const scrollX = await page.evaluate(() => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: Phaser.Game;
    }).__idleDungeonInnGame;
    const scene = game?.scene.getScene("InnScene") as Phaser.Scene | undefined;
    return scene?.cameras.main.scrollX;
  });

  if (typeof scrollX !== "number") {
    throw new Error("Inn camera scrollX was not available.");
  }

  return scrollX;
}

async function getGameStateSnapshot(page: Page): Promise<{
  version: number;
  currencies: { coins: number };
  selectedPartyId: string;
  unlockedFloor: number;
  highestFloorCleared: number;
  heroes: Array<{ id: string; currentHp: number; status: string; attack?: number }>;
  automation: {
    autoDispatchLevel: number;
    lastAutoDispatchAt: number | null;
    enabled: Record<string, boolean>;
  };
  towerRuns: Array<{ status: string; floor: number; lastFailureReason: string | null }>;
  innRooms: Array<{ roomId: string; level: number; isUnlocked: boolean }>;
  recentEvents: Array<{ type: string; message: string }>;
}> {
  const state = await page.evaluate(() => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => {
        version: number;
        currencies: { coins: number };
        selectedPartyId: string;
        unlockedFloor: number;
        highestFloorCleared: number;
        heroes: Array<{ id: string; currentHp: number; status: string; attack?: number }>;
        automation: {
          autoDispatchLevel: number;
          lastAutoDispatchAt: number | null;
          enabled: Record<string, boolean>;
        };
        towerRuns: Array<{ status: string; floor: number; lastFailureReason: string | null }>;
        innRooms: Array<{ roomId: string; level: number; isUnlocked: boolean }>;
        recentEvents: Array<{ type: string; message: string }>;
      };
    }).__idleDungeonInnGetState;
    return getState?.();
  });

  if (!state) {
    throw new Error("Game state snapshot was not available.");
  }

  return state;
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

async function getSavedGameState(page: Page): Promise<{ unlockedFloor: number } | null> {
  return page.evaluate((key) => {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as { unlockedFloor: number }) : null;
  }, saveStorageKey);
}

async function waitForSceneText(page: Page, sceneKey: string, text: string): Promise<void> {
  await page.waitForFunction(
    ({ key, expectedText }) => {
      const game = (globalThis as typeof globalThis & {
        __idleDungeonInnGame?: Phaser.Game;
      }).__idleDungeonInnGame;
      const scene = game?.scene.getScene(key) as Phaser.Scene | undefined;
      return (
        scene?.children.list
          .map((child) => (child as { text?: unknown }).text)
          .some((candidate) => candidate === expectedText) ?? false
      );
    },
    { key: sceneKey, expectedText: text },
    { timeout: 5000 }
  );
}

async function waitForSaveFlush(page: Page): Promise<void> {
  await page.waitForTimeout(1200);
}

async function clearCurrentFloor(
  page: Page,
  hasTreasureNode: boolean
): Promise<{
  before: Awaited<ReturnType<typeof getGameStateSnapshot>>;
  after: Awaited<ReturnType<typeof getGameStateSnapshot>>;
}> {
  await focusInnGate(page);
  await page.waitForTimeout(250);
  await clickCanvas(page, 250, 676);
  await waitForTowerStatus(page, "fighting");
  await waitForTowerBlockedReason(page, "Encounter cleared");
  await clickCanvas(page, 195, 652);

  if (hasTreasureNode) {
    await waitForTowerStatus(page, "looting");
    await clickCanvas(page, 195, 652);
  }

  await waitForTowerBlockedReason(page, "Floor clear");
  const before = await getGameStateSnapshot(page);
  await clickCanvas(page, 195, 652);
  await page.waitForTimeout(500);
  const after = await getGameStateSnapshot(page);

  return { before, after };
}

async function startCurrentFloorAndCaptureHeroDamage(page: Page): Promise<number> {
  await focusInnGate(page);
  await page.waitForTimeout(250);
  await clickCanvas(page, 250, 676);
  await waitForTowerStatus(page, "fighting");
  return waitForHeroHitDamage(page);
}

async function finishCurrentFloorFromCombat(
  page: Page,
  remainingNodes: Array<"combat" | "treasure">
): Promise<{
  before: Awaited<ReturnType<typeof getGameStateSnapshot>>;
  after: Awaited<ReturnType<typeof getGameStateSnapshot>>;
}> {
  await waitForTowerBlockedReason(page, "Encounter cleared");
  await clickCanvas(page, 195, 652);

  for (const nodeType of remainingNodes) {
    if (nodeType === "treasure") {
      await waitForTowerStatus(page, "looting");
      await clickCanvas(page, 195, 652);
      continue;
    }

    await waitForTowerStatus(page, "fighting");
    await waitForTowerBlockedReason(page, "Encounter cleared");
    await clickCanvas(page, 195, 652);
  }

  await waitForTowerBlockedReason(page, "Floor clear");
  const before = await getGameStateSnapshot(page);
  await clickCanvas(page, 195, 652);
  await page.waitForTimeout(500);
  const after = await getGameStateSnapshot(page);

  return { before, after };
}

async function waitForAutomationUnlocked(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const getState = (globalThis as typeof globalThis & {
        __idleDungeonInnGetState?: () => {
          automation: { autoDispatchLevel: number; enabled: Record<string, boolean> };
        };
      }).__idleDungeonInnGetState;
      const automation = getState?.().automation;
      return automation?.autoDispatchLevel === 1 && automation.enabled.auto_dispatch_board === true;
    },
    undefined,
    { timeout: 4000 }
  );
}

async function waitForAutoDispatch(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const getState = (globalThis as typeof globalThis & {
        __idleDungeonInnGetState?: () => {
          heroes: Array<{ status: string }>;
          towerRuns: Array<{ status: string }>;
        };
      }).__idleDungeonInnGetState;
      const state = getState?.();
      return state?.heroes[0]?.status === "in_tower" && state.towerRuns[0]?.status !== "preparing";
    },
    undefined,
    { timeout: 5000 }
  );
}

async function forceDefeatedPreparingState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => {
        heroes: Array<{ currentHp: number; status: string }>;
        towerRuns: Array<{
          status: string;
          floor: number;
          nodeIndex: number;
          nodeProgress: number;
          enemies: unknown[];
          heroCombatCooldowns: Record<string, number>;
          enemyCombatCooldowns: Record<string, number>;
          lastCombatEventMessage: string | null;
          combatStartedAt: number | null;
          lastFailureReason: string | null;
        }>;
        automation: { lastAutoDispatchAt: number | null; autoDispatchLevel: number; enabled: Record<string, boolean> };
      };
    }).__idleDungeonInnGetState;
    const state = getState?.();
    if (!state) {
      return;
    }

    state.heroes[0].currentHp = 0;
    state.heroes[0].status = "defeated";
    state.towerRuns[0].status = "preparing";
    state.towerRuns[0].floor = 3;
    state.towerRuns[0].nodeIndex = 0;
    state.towerRuns[0].nodeProgress = 0;
    state.towerRuns[0].enemies = [];
    state.towerRuns[0].heroCombatCooldowns = {};
    state.towerRuns[0].enemyCombatCooldowns = {};
    state.towerRuns[0].lastCombatEventMessage = null;
    state.towerRuns[0].combatStartedAt = null;
    state.towerRuns[0].lastFailureReason = null;
    state.automation.autoDispatchLevel = 1;
    state.automation.enabled.auto_dispatch_board = true;
    state.automation.lastAutoDispatchAt = Date.now() - 5000;
  });
}

async function forceReadyPreparingState(page: Page, autoDispatchEnabled: boolean): Promise<void> {
  await page.evaluate((enabled) => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => {
        heroes: Array<{ currentHp: number; status: string }>;
        towerRuns: Array<{
          status: string;
          floor: number;
          nodeIndex: number;
          nodeProgress: number;
          enemies: unknown[];
          heroCombatCooldowns: Record<string, number>;
          enemyCombatCooldowns: Record<string, number>;
          lastCombatEventMessage: string | null;
          combatStartedAt: number | null;
          lastFailureReason: string | null;
        }>;
        automation: { lastAutoDispatchAt: number | null; autoDispatchLevel: number; enabled: Record<string, boolean> };
      };
    }).__idleDungeonInnGetState;
    const state = getState?.();
    if (!state) {
      return;
    }

    state.heroes[0].currentHp = 120;
    state.heroes[0].status = "ready";
    state.towerRuns[0].status = "preparing";
    state.towerRuns[0].floor = 3;
    state.towerRuns[0].nodeIndex = 0;
    state.towerRuns[0].nodeProgress = 0;
    state.towerRuns[0].enemies = [];
    state.towerRuns[0].heroCombatCooldowns = {};
    state.towerRuns[0].enemyCombatCooldowns = {};
    state.towerRuns[0].lastCombatEventMessage = null;
    state.towerRuns[0].combatStartedAt = null;
    state.towerRuns[0].lastFailureReason = null;
    state.automation.autoDispatchLevel = 1;
    state.automation.enabled.auto_dispatch_board = enabled;
    state.automation.lastAutoDispatchAt = Date.now() - 5000;
  }, autoDispatchEnabled);
}

async function forceRestingBedJob(page: Page, currentHp: number): Promise<void> {
  await page.evaluate((hp) => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => {
        heroes: Array<{ id: string; currentHp: number; status: string }>;
        innRooms: Array<{ roomId: string; activeJob?: string | null; jobs?: unknown[] }>;
      };
    }).__idleDungeonInnGetState;
    const state = getState?.();
    const hero = state?.heroes[0];
    const bedRoom = state?.innRooms.find((room) => room.roomId === "bed_room");
    if (!state || !hero || !bedRoom) {
      return;
    }

    const jobId = `room_job_bed_room_${hero.id}_healing`;
    hero.currentHp = hp;
    hero.status = "resting";
    bedRoom.activeJob = jobId;
    bedRoom.jobs = [
      {
        id: jobId,
        roomId: "bed_room",
        heroId: hero.id,
        jobType: "healing",
        status: "active",
        progress: 0,
        startedAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }, currentHp);
}

function countEventsContaining(
  state: Awaited<ReturnType<typeof getGameStateSnapshot>>,
  text: string
): number {
  return state.recentEvents.filter((event) => event.message.includes(text)).length;
}

async function focusInnGate(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: Phaser.Game;
    }).__idleDungeonInnGame;
    const scene = game?.scene.getScene("InnScene") as Phaser.Scene | undefined;
    scene?.cameras.main.setScroll(870, 0);
  });
}

async function clickAutoDispatchControl(page: Page): Promise<void> {
  await focusInnGate(page);
  await page.waitForTimeout(150);
  await clickCanvas(page, 250, 536);
  await page.waitForTimeout(250);
}

async function clickBuildAutomationToggle(page: Page): Promise<void> {
  await clickCanvas(page, 278, 518);
  await page.waitForTimeout(250);
}

async function clickDevClearSave(page: Page): Promise<void> {
  await clickCanvas(page, 195, 704);
}

async function waitForHeroHitDamage(page: Page): Promise<number> {
  const damage = await page.waitForFunction(
    () => {
      const getState = (globalThis as typeof globalThis & {
        __idleDungeonInnGetState?: () => {
          towerRuns: Array<{ lastCombatEventMessage: string | null }>;
        };
      }).__idleDungeonInnGetState;
      const message = getState?.().towerRuns[0]?.lastCombatEventMessage ?? "";
      const match = message.match(/^Mira hit .+ for (\d+)\.$/);
      return match ? Number(match[1]) : null;
    },
    undefined,
    { timeout: 14000 }
  );

  const value = await damage.jsonValue();
  if (typeof value !== "number") {
    throw new Error("Hero hit damage was not available.");
  }

  return value;
}

async function waitForTowerStatus(page: Page, status: string): Promise<void> {
  await page.waitForFunction(
    (expectedStatus) => {
      const game = (globalThis as typeof globalThis & {
        __idleDungeonInnGame?: Phaser.Game;
      }).__idleDungeonInnGame;
      const scene = game?.scene.getScene("TowerScene") as (Phaser.Scene & { renderKey?: string }) | undefined;
      return scene?.renderKey?.startsWith(`${expectedStatus}|`) ?? false;
    },
    status,
    { timeout: 14000 }
  );
  await page.waitForTimeout(250);
}

async function waitForTowerBlockedReason(page: Page, reasonFragment: string): Promise<void> {
  await page.waitForFunction(
    (expectedReason) => {
      const game = (globalThis as typeof globalThis & {
        __idleDungeonInnGame?: Phaser.Game;
      }).__idleDungeonInnGame;
      const scene = game?.scene.getScene("TowerScene") as (Phaser.Scene & { renderKey?: string }) | undefined;
      const renderKey = scene?.renderKey ?? "";
      return renderKey.startsWith("blocked|") && renderKey.includes(expectedReason);
    },
    reasonFragment,
    { timeout: 14000 }
  );
  await page.waitForTimeout(250);
}
