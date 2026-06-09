import { expect, test, type Page } from "@playwright/test";
import { enemyDefinitions } from "../../src/data/enemyData";
import { rewardDefinitions } from "../../src/data/lootData";
import { prototypeTowerFloors } from "../../src/data/towerData";
import type { TowerNodeDefinition } from "../../src/types/towerTypes";

const baseUrl = process.env.VALIDATION_URL ?? "http://127.0.0.1:5174";
const saveStorageKey = "idle-dungeon-inn:save:v1";

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});

test.setTimeout(30000);

test("tower content data contract covers floors 1 through 10", () => {
  expect(prototypeTowerFloors.map((floor) => floor.floor)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  for (const floor of prototypeTowerFloors) {
    expect(floor.themeId.length).toBeGreaterThan(0);
    expect(floor.nodes.length).toBeGreaterThan(0);
    expect(floor.nodes.at(-1)?.type).toBe("exit");
    expect(floor.nodes.some((node) => node.type === "combat" || node.type === "elite" || node.type === "boss")).toBe(true);

    for (const node of floor.nodes) {
      expect(node.id.length).toBeGreaterThan(0);
      expectReferencedEnemiesToExist(node);
      expectReferencedTreasureRewardToExist(node);
    }

    const firstClearCoins = sumRewardCoins(floor.firstClearRewards.map((reward) => reward.rewardId));
    const repeatCoins = sumRewardCoins(floor.repeatRewards.map((reward) => reward.rewardId));

    expect(firstClearCoins).toBeGreaterThan(0);
    expect(repeatCoins).toBeGreaterThan(0);
    expect(firstClearCoins).toBeGreaterThan(repeatCoins);
  }
});

test("new tower floor smoke starts a floor 4 run", async ({ page }) => {
  await startFreshGame(page);

  const initialState = await getGameStateSnapshot(page);
  const savedState = createFloorFourTravelingSave(initialState, Date.now());

  await writeSavedGameState(page, savedState);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => {
    const game = (globalThis as typeof globalThis & { __idleDungeonInnGame?: GameWithScenes }).__idleDungeonInnGame;
    game?.scene?.start?.("TowerScene");
  });
  await page.waitForTimeout(300);

  const towerTexts = await getSceneTexts(page, "TowerScene");

  expect(towerTexts).toContain("Floor 4 / Node 1");
  expect(towerTexts).toContain("Tower Run");
  expect(towerTexts.some((text) => text.includes("Lantern Party advances"))).toBe(true);
});

function expectReferencedEnemiesToExist(node: TowerNodeDefinition): void {
  for (const enemyId of node.enemyIds ?? []) {
    expect(enemyDefinitions[enemyId], `Missing enemy definition for ${enemyId}`).toBeDefined();
  }

  if (node.bossId) {
    expect(enemyDefinitions[node.bossId], `Missing boss enemy definition for ${node.bossId}`).toBeDefined();
  }
}

function expectReferencedTreasureRewardToExist(node: TowerNodeDefinition): void {
  if (node.rewardTableId) {
    expect(rewardDefinitions[node.rewardTableId], `Missing treasure reward definition for ${node.rewardTableId}`).toBeDefined();
  }
}

function sumRewardCoins(rewardIds: string[]): number {
  return rewardIds.reduce((total, rewardId) => {
    const reward = rewardDefinitions[rewardId];
    expect(reward, `Missing reward definition for ${rewardId}`).toBeDefined();
    return total + (reward?.coins ?? 0);
  }, 0);
}

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

async function writeSavedGameState(page: Page, state: RuntimeGameState): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: saveStorageKey, value: state }
  );
}

function createFloorFourTravelingSave(baseState: RuntimeGameState, now: number): RuntimeGameState {
  return {
    ...baseState,
    currencies: {
      ...baseState.currencies,
      coins: 240
    },
    unlockedFloor: 4,
    highestFloorCleared: 3,
    firstClearFloorIds: [1, 2, 3],
    heroes: baseState.heroes.map((hero) => ({
      ...hero,
      currentHp: 120,
      status: "in_tower",
      highestFloorCleared: 3
    })),
    parties: baseState.parties.map((party) => ({
      ...party,
      selectedTargetFloor: 4
    })),
    towerRuns: baseState.towerRuns.map((run) => ({
      ...run,
      status: "traveling",
      floor: 4,
      nodeIndex: 0,
      nodeProgress: 0.25,
      enemies: [],
      heroCombatCooldowns: {},
      enemyCombatCooldowns: {},
      lastCombatEventMessage: null,
      combatStartedAt: null,
      lootBag: [],
      lastFailureReason: null,
      startedAt: now
    })),
    automation: {
      ...baseState.automation,
      autoDispatchLevel: 1,
      lastAutoDispatchAt: now,
      enabled: {
        ...baseState.automation.enabled,
        auto_dispatch_board: true
      }
    },
    recentEvents: [],
    lastActiveAt: now
  };
}
