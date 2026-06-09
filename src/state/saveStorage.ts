import { createInitialGameState } from "../game/initialState";
import type { AutomationState } from "../types/automationTypes";
import type { GameState } from "../types/gameState";
import type { HeroStatus } from "../types/ids";
import type { RecentEvent } from "../types/recentEventTypes";
import type { InnRoomState, RoomJob, RoomJobStatus, RoomJobType } from "../types/roomTypes";
import { heroDefinitions } from "../data/heroData";
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
      ...raw.currencies,
      coins: normalizeNumber(raw.currencies.coins, defaults.currencies.coins, 0)
    },
    heroes: normalizeHeroes(defaults.heroes, raw.heroes),
    parties: raw.parties,
    selectedPartyId: raw.selectedPartyId,
    towerRuns: raw.towerRuns,
    innRooms: normalizeInnRooms(defaults.innRooms, raw.innRooms),
    automation: normalizeAutomationState(defaults.automation, raw.automation),
    unlockedFloor: normalizeNumber(raw.unlockedFloor, defaults.unlockedFloor, 1),
    highestFloorCleared: normalizeNumber(raw.highestFloorCleared, defaults.highestFloorCleared, 0),
    firstClearFloorIds: raw.firstClearFloorIds.filter(
      (floor): floor is number => typeof floor === "number" && Number.isFinite(floor) && floor > 0
    ),
    inventory: {
      ...defaults.inventory,
      ...raw.inventory
    },
    recentEvents: raw.recentEvents.slice(0, RECENT_EVENT_LIMIT),
    lastActiveAt: normalizeNumber(raw.lastActiveAt, Date.now(), 0)
  };
}

function normalizeAutomationState(defaults: AutomationState, rawAutomation: Record<string, unknown>): AutomationState {
  const rawLastAutoDispatchAt = rawAutomation.lastAutoDispatchAt;

  return {
    ...defaults,
    ...rawAutomation,
    autoDispatchLevel: normalizeNumber(rawAutomation.autoDispatchLevel, defaults.autoDispatchLevel, 0),
    lastAutoDispatchAt:
      typeof rawLastAutoDispatchAt === "number" && Number.isFinite(rawLastAutoDispatchAt) ? rawLastAutoDispatchAt : null,
    autoLootLevel: normalizeNumber(rawAutomation.autoLootLevel, defaults.autoLootLevel, 0),
    autoHealLevel: normalizeNumber(rawAutomation.autoHealLevel, defaults.autoHealLevel, 0),
    autoRepairLevel: normalizeNumber(rawAutomation.autoRepairLevel, defaults.autoRepairLevel, 0),
    autoSkillLevel: normalizeNumber(rawAutomation.autoSkillLevel, defaults.autoSkillLevel, 0),
    autoRetryLevel: normalizeNumber(rawAutomation.autoRetryLevel, defaults.autoRetryLevel, 0),
    enabled: normalizeEnabledAutomation(defaults.enabled, rawAutomation.enabled)
  };
}

function normalizeHeroes(defaults: GameState["heroes"], rawHeroes: unknown[]): GameState["heroes"] {
  if (rawHeroes.length === 0) {
    return defaults;
  }

  return rawHeroes.filter(isRecord).map((rawHero, index) => {
    const fallback = defaults[index] ?? defaults[0];
    const classId = typeof rawHero.classId === "string" ? rawHero.classId : fallback.classId;
    const maxHp = Math.max(1, heroDefinitions[classId]?.baseStats.hp ?? fallback.currentHp);
    const currentHp = clampNumber(rawHero.currentHp, fallback.currentHp, 0, maxHp);

    return {
      ...fallback,
      ...rawHero,
      id: typeof rawHero.id === "string" ? rawHero.id : fallback.id,
      classId,
      name: typeof rawHero.name === "string" ? rawHero.name : fallback.name,
      level: normalizeNumber(rawHero.level, fallback.level, 1),
      xp: normalizeNumber(rawHero.xp, fallback.xp, 0),
      currentHp,
      status: normalizeHeroStatus(rawHero.status, currentHp <= 0 ? "defeated" : fallback.status),
      assignedPartyId:
        typeof rawHero.assignedPartyId === "string" || rawHero.assignedPartyId === null
          ? rawHero.assignedPartyId
          : fallback.assignedPartyId,
      highestFloorCleared: normalizeNumber(rawHero.highestFloorCleared, fallback.highestFloorCleared, 0),
      defeats: normalizeNumber(rawHero.defeats, fallback.defeats, 0),
      traits: Array.isArray(rawHero.traits) ? rawHero.traits.filter((trait): trait is string => typeof trait === "string") : [],
      gear: normalizeHeroGear(rawHero.gear)
    };
  });
}

function normalizeInnRooms(defaults: InnRoomState[], rawRooms: unknown[]): InnRoomState[] {
  const normalizedRooms = rawRooms.filter(isRecord).map((rawRoom, index) => {
    const fallback = defaults.find((room) => room.roomId === rawRoom.roomId) ?? defaults[index] ?? defaults[0];
    const roomId = typeof rawRoom.roomId === "string" ? rawRoom.roomId : fallback.roomId;
    const jobs = normalizeRoomJobs(rawRoom.jobs, roomId);

    return {
      ...fallback,
      roomId,
      level: normalizeNumber(rawRoom.level, fallback.level, 0),
      isUnlocked: typeof rawRoom.isUnlocked === "boolean" ? rawRoom.isUnlocked : fallback.isUnlocked,
      activeJob: jobs.find((job) => job.status === "active")?.id ?? null,
      jobs
    };
  });

  for (const defaultRoom of defaults) {
    if (!normalizedRooms.some((room) => room.roomId === defaultRoom.roomId)) {
      normalizedRooms.push(defaultRoom);
    }
  }

  return normalizedRooms;
}

function normalizeHeroGear(rawGear: unknown): Record<string, string | null> {
  if (!isRecord(rawGear)) {
    return {};
  }

  return Object.entries(rawGear).reduce<Record<string, string | null>>((gear, [slotId, itemId]) => {
    if (typeof itemId === "string" || itemId === null) {
      gear[slotId] = itemId;
    }

    return gear;
  }, {});
}

function normalizeRoomJobs(rawJobs: unknown, fallbackRoomId: string): RoomJob[] {
  if (!Array.isArray(rawJobs)) {
    return [];
  }

  return rawJobs.filter(isRecord).map((rawJob, index) => {
    const roomId = typeof rawJob.roomId === "string" ? rawJob.roomId : fallbackRoomId;
    const heroId = typeof rawJob.heroId === "string" ? rawJob.heroId : "";
    const jobType = normalizeRoomJobType(rawJob.jobType);
    const id = typeof rawJob.id === "string" && rawJob.id.length > 0
      ? rawJob.id
      : `room_job_${roomId}_${heroId || index}_${jobType}`;

    return {
      id,
      roomId,
      heroId,
      jobType,
      status: normalizeRoomJobStatus(rawJob.status),
      progress: clampNumber(rawJob.progress, 0, 0, 1),
      startedAt: normalizeNumber(rawJob.startedAt, Date.now(), 0),
      updatedAt: normalizeNumber(rawJob.updatedAt, Date.now(), 0)
    };
  });
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

function normalizeHeroStatus(value: unknown, fallback: HeroStatus): HeroStatus {
  const validStatuses: HeroStatus[] = [
    "idle",
    "assigned",
    "resting",
    "defeated",
    "in_tower",
    "wounded",
    "ready",
    "eating",
    "training",
    "gearing"
  ];

  return typeof value === "string" && validStatuses.includes(value as HeroStatus) ? (value as HeroStatus) : fallback;
}

function normalizeRoomJobType(value: unknown): RoomJobType {
  const validTypes: RoomJobType[] = [
    "healing",
    "training",
    "food_prep",
    "gear_upgrade",
    "morale",
    "skill_study",
    "alchemy",
    "travel_prep"
  ];

  return typeof value === "string" && validTypes.includes(value as RoomJobType) ? (value as RoomJobType) : "healing";
}

function normalizeRoomJobStatus(value: unknown): RoomJobStatus {
  const validStatuses: RoomJobStatus[] = ["active", "paused", "complete"];
  return typeof value === "string" && validStatuses.includes(value as RoomJobStatus)
    ? (value as RoomJobStatus)
    : "active";
}

function normalizeNumber(value: unknown, fallback: number, min: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, value);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
