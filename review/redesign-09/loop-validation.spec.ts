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
  await page.waitForTimeout(350);
  await page.screenshot({ path: shot("04-tower-traveling.png") });

  await page.waitForTimeout(9500);
  await page.screenshot({ path: shot("05-tower-fighting.png") });

  await page.waitForTimeout(4500);
  await page.screenshot({ path: shot("06-tower-continue-run.png") });

  await clickCanvas(page, 195, 714);
  await page.waitForTimeout(4200);
  await page.screenshot({ path: shot("07-tower-complete-floor.png") });

  await clickCanvas(page, 195, 714);
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
