import { createInitialGameState } from "../game/initialState";
import type { AutomationState } from "../types/automationTypes";
import type { GameState } from "../types/gameState";
import type { HeroTrainingState } from "../types/heroTypes";
import type { HeroStatus, PartyMode } from "../types/ids";
import type { LootStack } from "../types/lootTypes";
import type { PartyState } from "../types/partyTypes";
import type { RecentEvent, RecentEventSeverity, RecentEventType } from "../types/recentEventTypes";
import type { InnRoomState, RoomJob, RoomJobStatus, RoomJobType } from "../types/roomTypes";
import type { TowerRunEnemyState, TowerRunState, TowerRunStatus } from "../types/towerTypes";
import { heroDefinitions } from "../data/heroData";
import { normalizePartyUnlocksForProgress } from "../systems/partyUnlockSystem";
import { RECENT_EVENT_LIMIT, appendRecentEvent } from "./recentEvents";

export const SAVE_STORAGE_KEY = "idle-dungeon-inn:save:v1";
const CURRENT_SAVE_VERSION = 1;
const MAX_NORMALIZED_TRAINING_LEVEL = 999;
const MAX_NORMALIZED_TRAINING_XP = 60;
const MAX_NORMALIZED_TRAINING_SECONDS = 9_999_999;

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
  const heroes = normalizeHeroes(defaults.heroes, raw.heroes);
  const highestFloorCleared = normalizeNumber(raw.highestFloorCleared, defaults.highestFloorCleared, 0);
  const unlockedFloor = normalizeNumber(raw.unlockedFloor, defaults.unlockedFloor, 1);
  const parties = normalizePartyUnlocksForProgress(
    normalizeParties(defaults.parties, raw.parties, new Set(heroes.map((hero) => hero.id))),
    highestFloorCleared,
    unlockedFloor
  );
  const selectedPartyId = normalizeSelectedPartyId(raw.selectedPartyId, parties, defaults.selectedPartyId);

  return {
    ...defaults,
    version: CURRENT_SAVE_VERSION,
    currencies: {
      ...defaults.currencies,
      ...raw.currencies,
      coins: normalizeNumber(raw.currencies.coins, defaults.currencies.coins, 0)
    },
    heroes,
    parties,
    selectedPartyId,
    towerRuns: normalizeTowerRuns(defaults.towerRuns, raw.towerRuns, parties),
    innRooms: normalizeInnRooms(defaults.innRooms, raw.innRooms),
    automation: normalizeAutomationState(defaults.automation, raw.automation),
    unlockedFloor,
    highestFloorCleared,
    firstClearFloorIds: raw.firstClearFloorIds.filter(
      (floor): floor is number => typeof floor === "number" && Number.isFinite(floor) && floor > 0
    ),
    inventory: normalizeInventory(defaults.inventory, raw.inventory),
    recentEvents: normalizeRecentEvents(raw.recentEvents),
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

  const normalizedHeroes = rawHeroes.filter(isRecord).map((rawHero, index) => {
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
      gear: normalizeHeroGear(rawHero.gear),
      training: normalizeHeroTraining(rawHero.training, fallback.training)
    };
  });

  for (const defaultHero of defaults) {
    if (!normalizedHeroes.some((hero) => hero.id === defaultHero.id)) {
      normalizedHeroes.push(defaultHero);
    }
  }

  return normalizedHeroes;
}

function normalizeHeroTraining(rawTraining: unknown, fallback: HeroTrainingState): HeroTrainingState {
  if (!isRecord(rawTraining)) {
    return fallback;
  }

  return {
    attackTrainingXp: clampNumber(rawTraining.attackTrainingXp, fallback.attackTrainingXp, 0, MAX_NORMALIZED_TRAINING_XP),
    attackTrainingLevel: Math.floor(
      clampNumber(rawTraining.attackTrainingLevel, fallback.attackTrainingLevel, 0, MAX_NORMALIZED_TRAINING_LEVEL)
    ),
    totalTrainingSeconds: clampNumber(
      rawTraining.totalTrainingSeconds,
      fallback.totalTrainingSeconds,
      0,
      MAX_NORMALIZED_TRAINING_SECONDS
    )
  };
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

function normalizeParties(defaults: PartyState[], rawParties: unknown[], knownHeroIds: Set<string>): PartyState[] {
  const normalizedParties = rawParties.filter(isRecord).map((rawParty, index) => {
    const fallback = defaults[index] ?? defaults[0];
    const maxSize = Math.floor(clampNumber(rawParty.maxSize, fallback.maxSize, 1, 6));
    const heroIds = Array.isArray(rawParty.heroIds)
      ? uniqueStrings(rawParty.heroIds).filter((heroId) => knownHeroIds.has(heroId)).slice(0, maxSize)
      : fallback.heroIds.filter((heroId) => knownHeroIds.has(heroId)).slice(0, maxSize);

    return {
      ...fallback,
      id: typeof rawParty.id === "string" && rawParty.id.length > 0 ? rawParty.id : fallback.id,
      name: typeof rawParty.name === "string" && rawParty.name.length > 0 ? rawParty.name : fallback.name,
      heroIds,
      maxSize,
      mode: normalizePartyMode(rawParty.mode, fallback.mode),
      selectedTargetFloor: Math.floor(normalizeNumber(rawParty.selectedTargetFloor, fallback.selectedTargetFloor, 1)),
      selectedMaterialId:
        typeof rawParty.selectedMaterialId === "string" || rawParty.selectedMaterialId === null
          ? rawParty.selectedMaterialId
          : fallback.selectedMaterialId,
      retreatHpPercent: Math.floor(clampNumber(rawParty.retreatHpPercent, fallback.retreatHpPercent, 1, 100)),
      isUnlocked: typeof rawParty.isUnlocked === "boolean" ? rawParty.isUnlocked : fallback.isUnlocked
    };
  });

  for (const defaultParty of defaults) {
    if (!normalizedParties.some((party) => party.id === defaultParty.id)) {
      normalizedParties.push({
        ...defaultParty,
        heroIds: defaultParty.heroIds.filter((heroId) => knownHeroIds.has(heroId))
      });
    }
  }

  const assignedHeroIds = new Set(normalizedParties.flatMap((party) => party.heroIds));
  return (normalizedParties.length > 0 ? normalizedParties : defaults).map((party) => {
    const defaultParty = defaults.find((candidate) => candidate.id === party.id);
    if (!defaultParty) {
      return party;
    }

    const missingDefaultHeroIds = defaultParty.heroIds.filter(
      (heroId) => knownHeroIds.has(heroId) && !assignedHeroIds.has(heroId)
    );
    if (missingDefaultHeroIds.length === 0) {
      return party;
    }

    return {
      ...party,
      heroIds: [...party.heroIds, ...missingDefaultHeroIds].slice(0, party.maxSize)
    };
  });
}

function normalizeSelectedPartyId(rawSelectedPartyId: unknown, parties: PartyState[], fallback: string): string {
  const selectedParty = typeof rawSelectedPartyId === "string"
    ? parties.find((party) => party.id === rawSelectedPartyId && party.isUnlocked)
    : null;

  return selectedParty?.id ?? parties.find((party) => party.isUnlocked)?.id ?? fallback;
}

function normalizeTowerRuns(
  defaults: TowerRunState[],
  rawTowerRuns: unknown[],
  parties: PartyState[]
): TowerRunState[] {
  const knownPartyIds = new Set(parties.map((party) => party.id));
  const normalizedRuns = rawTowerRuns.filter(isRecord).map((rawRun, index) => {
    const fallback = defaults[index] ?? defaults[0];
    const partyId = typeof rawRun.partyId === "string" && knownPartyIds.has(rawRun.partyId)
      ? rawRun.partyId
      : fallback.partyId;

    return {
      ...fallback,
      partyId,
      status: normalizeTowerRunStatus(rawRun.status, fallback.status),
      floor: Math.floor(normalizeNumber(rawRun.floor, fallback.floor, 1)),
      nodeIndex: Math.floor(normalizeNumber(rawRun.nodeIndex, fallback.nodeIndex, 0)),
      nodeProgress: clampNumber(rawRun.nodeProgress, fallback.nodeProgress, 0, 1),
      enemies: normalizeTowerEnemies(rawRun.enemies),
      heroCombatCooldowns: normalizeNumberRecord(rawRun.heroCombatCooldowns),
      enemyCombatCooldowns: normalizeNumberRecord(rawRun.enemyCombatCooldowns),
      lastCombatEventMessage:
        typeof rawRun.lastCombatEventMessage === "string" || rawRun.lastCombatEventMessage === null
          ? rawRun.lastCombatEventMessage
          : fallback.lastCombatEventMessage,
      combatStartedAt:
        typeof rawRun.combatStartedAt === "number" && Number.isFinite(rawRun.combatStartedAt)
          ? Math.max(0, rawRun.combatStartedAt)
          : null,
      lootBag: normalizeLootStacks(rawRun.lootBag),
      lastFailureReason:
        typeof rawRun.lastFailureReason === "string" || rawRun.lastFailureReason === null
          ? rawRun.lastFailureReason
          : fallback.lastFailureReason,
      startedAt: normalizeNumber(rawRun.startedAt, fallback.startedAt, 0)
    };
  });

  for (const defaultRun of defaults) {
    if (!normalizedRuns.some((run) => run.partyId === defaultRun.partyId)) {
      normalizedRuns.push(defaultRun);
    }
  }

  return normalizedRuns;
}

function normalizeTowerEnemies(rawEnemies: unknown): TowerRunEnemyState[] {
  if (!Array.isArray(rawEnemies)) {
    return [];
  }

  return rawEnemies.filter(isRecord).map((rawEnemy) => ({
    enemyId: typeof rawEnemy.enemyId === "string" ? rawEnemy.enemyId : "",
    currentHp:
      typeof rawEnemy.currentHp === "number" && Number.isFinite(rawEnemy.currentHp)
        ? Math.max(0, rawEnemy.currentHp)
        : null,
    status: normalizeTowerEnemyStatus(rawEnemy.status)
  }));
}

function normalizeInventory(defaults: GameState["inventory"], rawInventory: Record<string, unknown>): GameState["inventory"] {
  return {
    ...defaults,
    itemStacks: normalizeLootStacks(rawInventory.itemStacks)
  };
}

function normalizeLootStacks(rawLootStacks: unknown): LootStack[] {
  if (!Array.isArray(rawLootStacks)) {
    return [];
  }

  return rawLootStacks.filter(isRecord).reduce<LootStack[]>((stacks, rawStack) => {
    if (typeof rawStack.lootId !== "string") {
      return stacks;
    }

    const quantity = Math.floor(normalizeNumber(rawStack.quantity, 0, 0));
    if (quantity <= 0) {
      return stacks;
    }

    stacks.push({
      lootId: rawStack.lootId,
      quantity
    });
    return stacks;
  }, []);
}

function normalizeRecentEvents(rawEvents: unknown[]): RecentEvent[] {
  return rawEvents
    .filter(isRecord)
    .map((rawEvent, index): RecentEvent => ({
      id: typeof rawEvent.id === "string" && rawEvent.id.length > 0 ? rawEvent.id : `event_normalized_${index}`,
      type: normalizeRecentEventType(rawEvent.type),
      createdAt: normalizeNumber(rawEvent.createdAt, 0, 0),
      message: typeof rawEvent.message === "string" ? rawEvent.message : "",
      severity: normalizeRecentEventSeverity(rawEvent.severity),
      partyId: typeof rawEvent.partyId === "string" ? rawEvent.partyId : undefined,
      heroId: typeof rawEvent.heroId === "string" ? rawEvent.heroId : undefined,
      floor: typeof rawEvent.floor === "number" && Number.isFinite(rawEvent.floor) && rawEvent.floor > 0
        ? Math.floor(rawEvent.floor)
        : undefined
    }))
    .slice(0, RECENT_EVENT_LIMIT);
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

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
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

function normalizePartyMode(value: unknown, fallback: PartyMode): PartyMode {
  const validModes: PartyMode[] = ["push", "safe_farm", "material_hunt", "boss_attempt"];
  return typeof value === "string" && validModes.includes(value as PartyMode) ? (value as PartyMode) : fallback;
}

function normalizeTowerRunStatus(value: unknown, fallback: TowerRunStatus): TowerRunStatus {
  const validStatuses: TowerRunStatus[] = [
    "preparing",
    "traveling",
    "exploring",
    "fighting",
    "looting",
    "retreating",
    "wiped",
    "resting",
    "blocked",
    "boss_ready"
  ];

  return typeof value === "string" && validStatuses.includes(value as TowerRunStatus)
    ? (value as TowerRunStatus)
    : fallback;
}

function normalizeTowerEnemyStatus(value: unknown): TowerRunEnemyState["status"] {
  const validStatuses: Array<TowerRunEnemyState["status"]> = ["pending", "active", "defeated"];
  return typeof value === "string" && validStatuses.includes(value as TowerRunEnemyState["status"])
    ? (value as TowerRunEnemyState["status"])
    : "pending";
}

function normalizeRecentEventType(value: unknown): RecentEventType {
  const validTypes: RecentEventType[] = [
    "party_dispatched",
    "party_dispatch_blocked",
    "tower_floor_entered",
    "tower_node_reached",
    "tower_node_continued",
    "tower_node_continue_blocked",
    "tower_encounter_started",
    "tower_encounter_cleared",
    "floor_cleared",
    "floor_clear_blocked",
    "party_floor_reached",
    "party_wiped",
    "hero_defeated",
    "loot_found",
    "room_job_started",
    "room_job_blocked",
    "room_job_cancelled",
    "room_job_completed",
    "automation_triggered",
    "boss_unlocked",
    "upgrade_purchased",
    "save_loaded",
    "offline_report"
  ];

  return typeof value === "string" && validTypes.includes(value as RecentEventType)
    ? (value as RecentEventType)
    : "save_loaded";
}

function normalizeRecentEventSeverity(value: unknown): RecentEventSeverity {
  const validSeverities: RecentEventSeverity[] = ["info", "success", "warning", "danger"];
  return typeof value === "string" && validSeverities.includes(value as RecentEventSeverity)
    ? (value as RecentEventSeverity)
    : "info";
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

function normalizeNumberRecord(rawRecord: unknown): Record<string, number> {
  if (!isRecord(rawRecord)) {
    return {};
  }

  return Object.entries(rawRecord).reduce<Record<string, number>>((record, [key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      record[key] = Math.max(0, value);
    }

    return record;
  }, {});
}
