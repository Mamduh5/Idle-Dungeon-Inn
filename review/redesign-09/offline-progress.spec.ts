import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const saveStorageKey = "idle-dungeon-inn:save:v1";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(30000);

test("offline progress catches up saved tower run", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createOfflineFloorClearSave(initialState, {
    autoDispatchEnabled: true,
    lastActiveAt: Date.now() - 15 * 60 * 1000
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const reloadedState = await getGameStateSnapshot(page);
  const offlineReport = reloadedState.recentEvents.find((event) => event.type === "offline_report");

  expect(reloadedState.highestFloorCleared).toBeGreaterThan(initialState.highestFloorCleared);
  expect(reloadedState.unlockedFloor).toBeGreaterThan(initialState.unlockedFloor);
  expect(reloadedState.currencies.coins).toBeGreaterThan(initialState.currencies.coins);
  expect(reloadedState.lastActiveAt).toBeGreaterThan(savedState.lastActiveAt);
  expect(offlineReport?.message).toContain("While you were away for");
  expect(offlineReport?.message).toContain("Lantern Party cleared");
  expect(offlineReport?.message).toContain("earned");
});

test("offline progress respects Auto-Dispatch OFF", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createOfflinePreparingSave(initialState, {
    autoDispatchEnabled: false,
    unlockedFloor: 3,
    highestFloorCleared: 2,
    coins: 40,
    lastActiveAt: Date.now() - 15 * 60 * 1000
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const reloadedState = await getGameStateSnapshot(page);
  const offlineReport = reloadedState.recentEvents.find((event) => event.type === "offline_report");

  expect(reloadedState.automation.autoDispatchLevel).toBe(1);
  expect(reloadedState.automation.enabled.auto_dispatch_board).toBe(false);
  expect(reloadedState.heroes[0]?.status).toBe("ready");
  expect(reloadedState.towerRuns[0]?.status).toBe("preparing");
  expect(reloadedState.highestFloorCleared).toBe(savedState.highestFloorCleared);
  expect(reloadedState.unlockedFloor).toBe(savedState.unlockedFloor);
  expect(reloadedState.currencies.coins).toBe(savedState.currencies.coins);
  expect(reloadedState.lastActiveAt).toBeGreaterThan(savedState.lastActiveAt);
  expect(offlineReport?.message).toContain("the inn waited");
  expect(offlineReport?.message).toContain("Auto-Dispatch is OFF");
});

test("offline report is shown in inn after catch up", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createOfflineFloorClearSave(initialState, {
    autoDispatchEnabled: true,
    lastActiveAt: Date.now() - 15 * 60 * 1000
  });

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const reloadedState = await getGameStateSnapshot(page);
  const offlineReport = reloadedState.recentEvents.find((event) => event.type === "offline_report");
  const innTexts = await getSceneTexts(page, "InnScene");

  expect(offlineReport).toBeDefined();
  expect(offlineReport?.message).toContain("While you were away");
  expect(innTexts).toContain("Away Report");
  expect(innTexts.some((text) => text.includes("While you were away"))).toBe(true);
  expect(innTexts).toContain("Latest");
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

async function getSceneTexts(page: Page, sceneKey: string): Promise<string[]> {
  return page.evaluate((key) => {
    const game = (globalThis as typeof globalThis & {
      __idleDungeonInnGame?: Phaser.Game;
    }).__idleDungeonInnGame;
    const scene = game?.scene.getScene(key);

    if (!scene) {
      return [];
    }

    return scene.children.list
      .filter((child): child is Phaser.GameObjects.Text => child instanceof Phaser.GameObjects.Text)
      .map((child) => child.text);
  }, sceneKey);
}

async function writeSavedGameState(page: Page, state: RuntimeGameState): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: saveStorageKey, value: state }
  );
}

function createOfflineFloorClearSave(
  baseState: RuntimeGameState,
  options: { autoDispatchEnabled: boolean; lastActiveAt: number }
): RuntimeGameState {
  const state = createOfflinePreparingSave(baseState, {
    autoDispatchEnabled: options.autoDispatchEnabled,
    unlockedFloor: 1,
    highestFloorCleared: 0,
    coins: 0,
    lastActiveAt: options.lastActiveAt
  });

  return {
    ...state,
    heroes: state.heroes.map((hero) => ({
      ...hero,
      currentHp: 120,
      status: "in_tower",
      highestFloorCleared: 0
    })),
    parties: state.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 1
    })),
    towerRuns: state.towerRuns.map((run) => ({
      ...run,
      status: "blocked",
      floor: 1,
      nodeIndex: 1,
      nodeProgress: 1,
      enemies: [],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: "Exit reached.",
      combatStartedAt: null,
      lootBag: [],
      lastFailureReason: "Floor clear is not implemented yet.",
      startedAt: options.lastActiveAt
    }))
  };
}

function createOfflinePreparingSave(
  baseState: RuntimeGameState,
  options: {
    autoDispatchEnabled: boolean;
    unlockedFloor: number;
    highestFloorCleared: number;
    coins: number;
    lastActiveAt: number;
  }
): RuntimeGameState {
  return {
    ...baseState,
    currencies: {
      ...baseState.currencies,
      coins: options.coins
    },
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 120,
      status: "ready",
      highestFloorCleared: Math.min(hero.highestFloorCleared, options.highestFloorCleared)
    })),
    parties: baseState.parties.map((party) => ({
      ...party,
      selectedTargetFloor: options.unlockedFloor
    })),
    towerRuns: baseState.towerRuns.map((run) => ({
      ...run,
      status: "preparing",
      floor: options.unlockedFloor,
      nodeIndex: 0,
      nodeProgress: 0,
      enemies: [],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: null,
      combatStartedAt: null,
      lootBag: [],
      lastFailureReason: null,
      startedAt: options.lastActiveAt
    })),
    automation: {
      ...baseState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: options.lastActiveAt - 5000,
      enabled: {
        ...baseState.automation.enabled,
        auto_dispatch_board: options.autoDispatchEnabled
      }
    },
    unlockedFloor: options.unlockedFloor,
    highestFloorCleared: options.highestFloorCleared,
    firstClearFloorIds: Array.from({ length: options.highestFloorCleared }, (_, index) => index + 1),
    recentEvents: [],
    lastActiveAt: options.lastActiveAt
  };
}
