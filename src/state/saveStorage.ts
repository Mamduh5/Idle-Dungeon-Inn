import { createInitialGameState } from "../game/initialState";
import type { AutomationState } from "../types/automationTypes";
import type { GameState } from "../types/gameState";
import type { RecentEvent } from "../types/recentEventTypes";
import { RECENT_EVENT_LIMIT, appendRecentEvent } from "./recentEvents";

export const SAVE_STORAGE_KEY = "idle-dungeon-inn:save:v1";
const CURRENT_SAVE_VERSION = 1;

export function loadSavedGameState(): GameState | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const saved = storage.getItem(SAVE_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const normalized = normalizeLoadedGameState(JSON.parse(saved));
    return normalized ? withSaveLoadedEvent(normalized) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can fail in private mode or when quota is exhausted.
  }
}

export function clearSavedGameState(): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Storage can fail in private mode.
  }
}

export function normalizeLoadedGameState(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.version !== CURRENT_SAVE_VERSION) {
    return null;
  }

  if (
    !isRecord(raw.currencies) ||
    !Array.isArray(raw.heroes) ||
    !Array.isArray(raw.parties) ||
    typeof raw.selectedPartyId !== "string" ||
    !Array.isArray(raw.towerRuns) ||
    !Array.isArray(raw.innRooms) ||
    !isRecord(raw.automation) ||
    typeof raw.unlockedFloor !== "number" ||
    typeof raw.highestFloorCleared !== "number" ||
    !Array.isArray(raw.firstClearFloorIds) ||
    !isRecord(raw.inventory) ||
    !Array.isArray(raw.recentEvents) ||
    typeof raw.lastActiveAt !== "number"
  ) {
    return null;
  }

  const defaults = createInitialGameState();

  return {
    ...defaults,
    version: CURRENT_SAVE_VERSION,
    currencies: {
      ...defaults.currencies,
      ...raw.currencies
    },
    heroes: raw.heroes,
    parties: raw.parties,
    selectedPartyId: raw.selectedPartyId,
    towerRuns: raw.towerRuns,
    innRooms: raw.innRooms,
    automation: normalizeAutomationState(defaults.automation, raw.automation),
    unlockedFloor: raw.unlockedFloor,
    highestFloorCleared: raw.highestFloorCleared,
    firstClearFloorIds: raw.firstClearFloorIds,
    inventory: {
      ...defaults.inventory,
      ...raw.inventory
    },
    recentEvents: raw.recentEvents.slice(0, RECENT_EVENT_LIMIT),
    lastActiveAt: raw.lastActiveAt
  };
}

function normalizeAutomationState(defaults: AutomationState, rawAutomation: Record<string, unknown>): AutomationState {
  const rawLastAutoDispatchAt = rawAutomation.lastAutoDispatchAt;

  return {
    ...defaults,
    ...rawAutomation,
    autoDispatchLevel: normalizeNumber(rawAutomation.autoDispatchLevel, defaults.autoDispatchLevel),
    lastAutoDispatchAt:
      typeof rawLastAutoDispatchAt === "number" || rawLastAutoDispatchAt === null ? rawLastAutoDispatchAt : null,
    autoLootLevel: normalizeNumber(rawAutomation.autoLootLevel, defaults.autoLootLevel),
    autoHealLevel: normalizeNumber(rawAutomation.autoHealLevel, defaults.autoHealLevel),
    autoRepairLevel: normalizeNumber(rawAutomation.autoRepairLevel, defaults.autoRepairLevel),
    autoSkillLevel: normalizeNumber(rawAutomation.autoSkillLevel, defaults.autoSkillLevel),
    autoRetryLevel: normalizeNumber(rawAutomation.autoRetryLevel, defaults.autoRetryLevel),
    enabled: normalizeEnabledAutomation(defaults.enabled, rawAutomation.enabled)
  };
}

function normalizeEnabledAutomation(
  defaults: Record<string, boolean>,
  rawEnabled: unknown
): Record<string, boolean> {
  if (!isRecord(rawEnabled)) {
    return defaults;
  }

  return Object.entries(rawEnabled).reduce<Record<string, boolean>>(
    (enabled, [automationId, value]) => {
      if (typeof value === "boolean") {
        enabled[automationId] = value;
      }

      return enabled;
    },
    { ...defaults }
  );
}

function withSaveLoadedEvent(state: GameState): GameState {
  const now = Date.now();
  const event: RecentEvent = {
    id: `event_save_loaded_${now}`,
    type: "save_loaded",
    createdAt: now,
    message: "Save loaded.",
    severity: "info"
  };

  return {
    ...state,
    recentEvents: appendRecentEvent(state.recentEvents, event)
  };
}

function getLocalStorage(): Storage | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
