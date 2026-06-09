import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const saveStorageKey = "idle-dungeon-inn:save:v1";
const floorClearHoldReason = "Floor clear is not implemented yet.";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(30000);

test("auto dispatch completes a cleared floor and sends the next run", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createAutoFloorClearSave(initialState, Date.now());

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();

  const completedState = await waitForState(page, (state) => state.highestFloorCleared >= 3 && state.unlockedFloor >= 4);
  expect(completedState.currencies.coins).toBeGreaterThan(savedState.currencies.coins);
  expect(completedState.recentEvents.some((event) => event.message.includes("cleared Floor 3"))).toBe(true);

  const redispatchedState = await waitForState(
    page,
    (state) => state.towerRuns[0]?.floor === 4 && state.towerRuns[0]?.status !== "preparing" && state.heroes[0]?.status === "in_tower"
  );

  expect(redispatchedState.automation.enabled.auto_dispatch_board).toBe(true);
  expect(redispatchedState.towerRuns[0]?.floor).toBe(4);
  expect(redispatchedState.recentEvents.some((event) => event.message === "Auto-Dispatch sent Lantern Party to Floor 4.")).toBe(true);
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

async function writeSavedGameState(page: Page, state: RuntimeGameState): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: saveStorageKey, value: state }
  );
}

function createAutoFloorClearSave(baseState: RuntimeGameState, now: number): RuntimeGameState {
  return {
    ...baseState,
    currencies: {
      ...baseState.currencies,
      coins: 0
    },
    unlockedFloor: 3,
    highestFloorCleared: 2,
    firstClearFloorIds: [1, 2],
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 80,
      status: "in_tower",
      highestFloorCleared: 2
    })),
    parties: baseState.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 3
    })),
    towerRuns: baseState.towerRuns.map((run) => ({
      ...run,
      status: "blocked",
      floor: 3,
      nodeIndex: 2,
      nodeProgress: 1,
      enemies: [],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: "Exit reached.",
      combatStartedAt: null,
      lootBag: [],
      lastFailureReason: floorClearHoldReason,
      startedAt: now - 5000
    })),
    automation: {
      ...baseState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now - 5000,
      enabled: {
        ...baseState.automation.enabled,
        auto_dispatch_board: true
      }
    },
    recentEvents: [],
    lastActiveAt: now
  };
}
