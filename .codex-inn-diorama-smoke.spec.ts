import { expect, test } from "@playwright/test";

async function clickCanvasPoint(page: import("@playwright/test").Page, xRatio: number, yRatio: number) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas is not visible");
  }

  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
}

test("Inn diorama send flow stays error free at 390x844", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "C:/tmp/idle-dungeon-inn-diorama-before.png" });

  await clickCanvasPoint(page, 302 / 390, 707 / 844);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "C:/tmp/idle-dungeon-inn-diorama-after-send.png" });

  await clickCanvasPoint(page, 1.5 / 4, 0.95);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "C:/tmp/idle-dungeon-inn-diorama-tower.png" });

  await clickCanvasPoint(page, 2.5 / 4, 0.95);
  await page.waitForTimeout(100);
  await clickCanvasPoint(page, 3.5 / 4, 0.95);
  await page.waitForTimeout(100);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Inn diorama is visible at 360x640", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "C:/tmp/idle-dungeon-inn-diorama-360x640.png" });
});
