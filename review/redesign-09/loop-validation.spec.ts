import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const screenshotDir = path.resolve("review/redesign-09/screenshots");
const gameWidth = 390;
const gameHeight = 844;

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(70000);

test("full current gameplay loop and required screenshots", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

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
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const initialState = await getGameStateSnapshot(page);
  expect(initialState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(1);

  const floorOne = await clearCurrentFloor(page, false);
  expect(floorOne.after.unlockedFloor).toBe(2);
  expect(floorOne.after.currencies.coins).toBe(25);
  expect(floorOne.after.heroes[0]?.status).toBe("ready");
  expect(floorOne.after.heroes[0]?.currentHp).toBe(Math.min(120, floorOne.before.heroes[0].currentHp + 15));
  expect(floorOne.after.recentEvents[0]?.message).toContain("recovered 15 HP at the Bed Room");

  await clickCanvas(page, 341, 814);
  await page.waitForTimeout(250);
  await clickCanvas(page, 116, 402);
  await page.waitForTimeout(250);

  const upgradedState = await getGameStateSnapshot(page);
  expect(upgradedState.currencies.coins).toBe(0);
  expect(upgradedState.innRooms.find((room) => room.roomId === "bed_room")?.level).toBe(2);

  await clickCanvas(page, 49, 814);
  await page.waitForTimeout(250);

  const floorTwo = await clearCurrentFloor(page, true);
  expect(floorTwo.after.heroes[0]?.status).toBe("ready");
  expect(floorTwo.after.heroes[0]?.currentHp).toBe(Math.min(120, floorTwo.before.heroes[0].currentHp + 25));
  expect(floorTwo.after.recentEvents[0]?.message).toContain("recovered 25 HP at the Bed Room");
});

test("responsive readability at 360x640", async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 1
  });
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);
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
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot("responsive-390x844.png") });
});

function shot(fileName: string): string {
  return path.join(screenshotDir, fileName);
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
  currencies: { coins: number };
  unlockedFloor: number;
  heroes: Array<{ id: string; currentHp: number; status: string }>;
  innRooms: Array<{ roomId: string; level: number; isUnlocked: boolean }>;
  recentEvents: Array<{ message: string }>;
}> {
  const state = await page.evaluate(() => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => {
        currencies: { coins: number };
        unlockedFloor: number;
        heroes: Array<{ id: string; currentHp: number; status: string }>;
        innRooms: Array<{ roomId: string; level: number; isUnlocked: boolean }>;
        recentEvents: Array<{ message: string }>;
      };
    }).__idleDungeonInnGetState;
    return getState?.();
  });

  if (!state) {
    throw new Error("Game state snapshot was not available.");
  }

  return state;
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

async function focusInnGate(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: Phaser.Game;
    }).__idleDungeonInnGame;
    const scene = game?.scene.getScene("InnScene") as Phaser.Scene | undefined;
    scene?.cameras.main.setScroll(870, 0);
  });
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
