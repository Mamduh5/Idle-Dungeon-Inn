import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const saveStorageKey = "idle-dungeon-inn:save:v1";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(30000);

test("wiped party can return to inn and recover", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createWipedRunSave(initialState, {
    autoDispatchEnabled: false,
    now: Date.now()
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await startScene(page, "TowerScene");
  await page.waitForTimeout(300);

  const towerTexts = await getSceneTexts(page, "TowerScene");
  expect(towerTexts).toContain("Party Wiped");
  expect(towerTexts).toContain("Return to Inn");

  await clickCanvas(page, 195, 652);
  await page.waitForTimeout(300);

  const recoveredState = await getGameStateSnapshot(page);
  const innTexts = await getSceneTexts(page, "InnScene");

  expect(innTexts).toContain("Hearth Hall");
  expect(recoveredState.towerRuns[0]?.status).toBe("preparing");
  expect(recoveredState.heroes[0]?.status).toBe("resting");
  expect(recoveredState.heroes[0]?.currentHp).toBeGreaterThan(0);
  expect(recoveredState.heroes[0]?.currentHp).toBeLessThan(108);
  expect(recoveredState.recentEvents.some((event) => event.message.includes("returned to the inn after being wiped"))).toBe(true);
});

test("auto dispatch does not recover wiped party automatically", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createWipedRunSave(initialState, {
    autoDispatchEnabled: true,
    now: Date.now() - 5000
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await startScene(page, "TowerScene");
  await page.waitForTimeout(2500);

  const state = await getGameStateSnapshot(page);
  const recoveryEvents = state.recentEvents.filter((event) => event.message.includes("returned to the inn after being wiped"));
  const dispatchEvents = state.recentEvents.filter((event) => event.message.includes("Auto-Dispatch sent"));

  expect(state.automation.enabled.auto_dispatch_board).toBe(true);
  expect(state.towerRuns[0]?.status).toBe("wiped");
  expect(state.heroes[0]?.status).toBe("defeated");
  expect(state.heroes[0]?.currentHp).toBe(0);
  expect(recoveryEvents).toHaveLength(0);
  expect(dispatchEvents).toHaveLength(0);
});

test("auto dispatch waits after manual wipe recovery until hero is ready", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createWipedRunSave(initialState, {
    autoDispatchEnabled: true,
    now: Date.now() - 5000
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await startScene(page, "TowerScene");
  await page.waitForTimeout(300);
  await clickCanvas(page, 195, 652);

  const recoveredState = await waitForState(page, (state) => state.towerRuns[0]?.status === "preparing" && state.heroes[0]?.status === "resting");
  expect(recoveredState.heroes[0]?.currentHp).toBeGreaterThan(0);
  expect(recoveredState.heroes[0]?.currentHp).toBeLessThan(108);

  await page.waitForTimeout(2500);
  const waitingState = await getGameStateSnapshot(page);
  expect(waitingState.towerRuns[0]?.status).toBe("preparing");
  expect(waitingState.heroes[0]?.status).toBe("resting");

  await forceHeroReadyAfterBedHealing(page);

  const redispatchedState = await waitForState(
    page,
    (state) => state.towerRuns[0]?.status !== "preparing" && state.heroes[0]?.status === "in_tower",
    3000
  );
  expect(redispatchedState.towerRuns[0]?.floor).toBe(6);
  expect(redispatchedState.recentEvents.some((event) => event.message === "Auto-Dispatch sent Lantern Party to Floor 6.")).toBe(true);
});

type RuntimeGameState = {
  version: number;
  currencies: { coins: number };
  selectedPartyId: string;
  unlockedFloor: number;
  highestFloorCleared: number;
  firstClearFloorIds: number[];
  heroes: Array<{
    id: string;
    classId: string;
    name: string;
    level: number;
    xp: number;
    currentHp: number;
    status: string;
    assignedPartyId: string | null;
    highestFloorCleared: number;
    defeats: number;
    traits: string[];
    gear: Record<string, unknown>;
  }>;
  parties: Array<{
    id: string;
    name: string;
    heroIds: string[];
    maxSize: number;
    mode: string;
    selectedTargetFloor: number | null;
    selectedMaterialId: string | null;
    retreatHpPercent: number;
    isUnlocked: boolean;
  }>;
  automation: {
    autoDispatchLevel: number;
    lastAutoDispatchAt: number | null;
    autoLootLevel: number;
    autoHealLevel: number;
    autoRepairLevel: number;
    autoSkillLevel: number;
    autoRetryLevel: number;
    enabled: Record<string, boolean>;
  };
  towerRuns: Array<{
    partyId: string;
    status: string;
    floor: number;
    nodeIndex: number;
    nodeProgress: number;
    enemies: unknown[];
    heroCombatCooldowns: Record<string, number>;
    enemyCombatCooldowns: Record<string, number>;
    lastCombatEventMessage: string | null;
    combatStartedAt: number | null;
    lootBag: unknown[];
    lastFailureReason: string | null;
    startedAt: number;
  }>;
  innRooms: Array<{ roomId: string; level: number; isUnlocked: boolean; activeJob: unknown | null }>;
  inventory: { itemStacks: unknown[] };
  recentEvents: Array<{ type: string; message: string }>;
  lastActiveAt: number;
};

type SceneTextChild = {
  text?: unknown;
};

type SceneWithChildren = {
  children?: {
    list?: SceneTextChild[];
  };
};

type GameWithScenes = {
  scene?: {
    getScene?: (key: string) => SceneWithChildren | undefined;
    start?: (key: string) => void;
  };
};

async function startFreshGame(page: Page): Promise<void> {
  await page.goto(baseUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate((key) => localStorage.removeItem(key), saveStorageKey);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);
}

async function getGameStateSnapshot(page: Page): Promise<RuntimeGameState> {
  const state = await page.evaluate(() => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => RuntimeGameState;
    }).__idleDungeonInnGetState;
    return getState?.();
  });

  if (!state) {
    throw new Error("Game state snapshot was not available.");
  }

  return state;
}

async function waitForState(
  page: Page,
  predicate: (state: RuntimeGameState) => boolean,
  timeoutMs = 5000
): Promise<RuntimeGameState> {
  const startedAt = Date.now();
  let state = await getGameStateSnapshot(page);

  while (!predicate(state)) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for state. Current status: ${state.towerRuns[0]?.status ?? "none"}`);
    }

    await page.waitForTimeout(100);
    state = await getGameStateSnapshot(page);
  }

  return state;
}

async function getSceneTexts(page: Page, sceneKey: string): Promise<string[]> {
  return page.evaluate((key) => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: GameWithScenes;
    }).__idleDungeonInnGame;
    const scene = game?.scene?.getScene?.(key);

    return (
      scene?.children?.list
        ?.map((child) => child.text)
        .filter((text): text is string => typeof text === "string") ?? []
    );
  }, sceneKey);
}

async function startScene(page: Page, sceneKey: string): Promise<void> {
  await page.evaluate((key) => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: GameWithScenes;
    }).__idleDungeonInnGame;
    game?.scene?.start?.(key);
  }, sceneKey);
}

async function clickCanvas(page: Page, canvasX: number, canvasY: number): Promise<void> {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Canvas was not available for clicking.");
  }

  await page.mouse.click(box.x + canvasX, box.y + canvasY);
}

async function writeSavedGameState(page: Page, state: RuntimeGameState): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: saveStorageKey, value: state }
  );
}

async function forceHeroReadyAfterBedHealing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const getState = (globalThis as typeof globalThis & {
      __idleDungeonInnGetState?: () => RuntimeGameState;
    }).__idleDungeonInnGetState;
    const state = getState?.();
    if (!state) {
      return;
    }

    state.heroes[0].currentHp = 108;
    state.heroes[0].status = "ready";
    state.innRooms.forEach((room) => {
      room.activeJob = null;
      (room as { jobs?: unknown[] }).jobs = [];
    });
    state.automation.lastAutoDispatchAt = Date.now() - 5000;
  });
}

function createWipedRunSave(
  baseState: RuntimeGameState,
  options: { autoDispatchEnabled: boolean; now: number }
): RuntimeGameState {
  return {
    ...baseState,
    unlockedFloor: 6,
    highestFloorCleared: 5,
    firstClearFloorIds: [1, 2, 3, 4, 5],
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 0,
      status: "defeated",
      highestFloorCleared: 5
    })),
    parties: baseState.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 6
    })),
    towerRuns: baseState.towerRuns.map((run) => ({
      ...run,
      status: "wiped",
      floor: 6,
      nodeIndex: 1,
      nodeProgress: 1,
      enemies: [
        {
          enemyId: "ember_wisp",
          currentHp: 18,
          status: "active"
        }
      ],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: "Party wiped. Return/revive is not implemented yet.",
      combatStartedAt: options.now - 1000,
      lootBag: [],
      lastFailureReason: "Party wiped.",
      startedAt: options.now - 5000
    })),
    automation: {
      ...baseState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: options.now - 5000,
      enabled: {
        ...baseState.automation.enabled,
        auto_dispatch_board: options.autoDispatchEnabled
      }
    },
    recentEvents: [],
    lastActiveAt: options.now
  };
}
