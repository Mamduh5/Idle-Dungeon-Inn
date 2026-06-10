import { heroDefinitions } from "../data/heroData";
import { getInnRoom } from "../state/gameSelectors";
import { appendRecentEvent } from "../state/recentEvents";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroId, RoomId } from "../types/ids";
import type { RecentEvent } from "../types/recentEventTypes";
import type { InnRoomState, RoomJob, RoomJobType } from "../types/roomTypes";

export const HERO_READY_HP_RATIO = 0.9;
export const TRAINING_XP_PER_ATTACK_LEVEL = 60;
export const MAX_TRAINING_ATTACK_LEVEL = 999;
export const MAX_TRAINING_TOTAL_SECONDS = 9_999_999;

export function getHeroMaxHp(hero: HeroInstance): number {
  const baseHp = heroDefinitions[hero.classId]?.baseStats.hp;
  const fallbackHp = Number.isFinite(hero.currentHp) ? hero.currentHp : 1;
  return Math.max(1, Number.isFinite(baseHp) ? baseHp : fallbackHp);
}

export function getHeroReadyHpThreshold(hero: HeroInstance): number {
  return Math.ceil(getHeroMaxHp(hero) * HERO_READY_HP_RATIO);
}

export function isHeroHpReady(hero: HeroInstance): boolean {
  return hero.currentHp >= getHeroReadyHpThreshold(hero);
}

export function isHeroDispatchReady(state: GameState, hero: HeroInstance): boolean {
  if (hero.status === "in_tower" || hero.status === "defeated" || hero.status === "resting") {
    return false;
  }

  if (!isHeroHpReady(hero)) {
    return false;
  }

  return getHeroActiveRoomJob(state, hero.id) === null;
}

export function getRoomJobCapacity(state: GameState, roomId: RoomId): number {
  const room = getInnRoom(state, roomId);

  if (!room?.isUnlocked || room.level <= 0) {
    return 0;
  }

  return 1;
}

export function getActiveRoomJobs(state: GameState, roomId: RoomId): RoomJob[] {
  const room = getInnRoom(state, roomId);
  return (room?.jobs ?? []).filter((job) => job.status === "active");
}

export function getHeroActiveRoomJob(state: GameState, heroId: HeroId): RoomJob | null {
  for (const room of state.innRooms) {
    const job = room.jobs.find((candidate) => candidate.heroId === heroId && candidate.status === "active");
    if (job) {
      return job;
    }
  }

  return null;
}

export function canAssignHeroToRoomJob(
  state: GameState,
  heroId: HeroId,
  roomId: RoomId,
  jobType: RoomJobType
): boolean {
  const room = getInnRoom(state, roomId);
  const hero = state.heroes.find((candidate) => candidate.id === heroId);

  if (!room?.isUnlocked || !hero) {
    return false;
  }

  if (!isRoomJobTypeSupported(roomId, jobType)) {
    return false;
  }

  const existingHeroJob = getHeroActiveRoomJob(state, heroId);
  if (existingHeroJob && existingHeroJob.roomId !== roomId) {
    return false;
  }

  const activeJobs = getActiveRoomJobs(state, roomId).filter((job) => job.heroId !== heroId);
  return activeJobs.length < getRoomJobCapacity(state, roomId);
}

export function assignHeroToRoomJob(
  state: GameState,
  heroId: HeroId,
  roomId: RoomId,
  jobType: RoomJobType,
  now = Date.now()
): GameState {
  if (!canAssignHeroToRoomJob(state, heroId, roomId, jobType)) {
    return state;
  }

  const job = createRoomJob(roomId, heroId, jobType, now);
  const rooms = state.innRooms.map((room) => {
    if (room.roomId !== roomId) {
      return room;
    }

    const existingJob = room.jobs.find(
      (candidate) => candidate.heroId === heroId && candidate.jobType === jobType && candidate.status === "active"
    );

    if (existingJob) {
      return room;
    }

    return {
      ...room,
      activeJob: job.id,
      jobs: [...room.jobs.filter((candidate) => candidate.status !== "complete"), job]
    };
  });

  return {
    ...state,
    innRooms: rooms
  };
}

export function completeRoomJob(state: GameState, jobId: string, now = Date.now()): GameState {
  let changed = false;
  const rooms = state.innRooms.map((room) => {
    let roomChanged = false;
    const jobs = room.jobs.map((job) => {
      if (job.id !== jobId || job.status === "complete") {
        return job;
      }

      changed = true;
      roomChanged = true;
      return {
        ...job,
        status: "complete" as const,
        progress: 1,
        updatedAt: now
      };
    });

    if (!roomChanged) {
      return room;
    }

    return {
      ...room,
      activeJob: jobs.find((job) => job.status === "active")?.id ?? null,
      jobs
    };
  });

  return changed ? { ...state, innRooms: rooms } : state;
}

export function tickRoomJobs(state: GameState, deltaMs: number, now: number): GameState {
  if (deltaMs <= 0) {
    return state;
  }

  let nextState = state;
  for (const room of state.innRooms) {
    for (const job of room.jobs) {
      if (job.status !== "active") {
        continue;
      }

      if (job.jobType === "healing") {
        nextState = tickHealingJob(nextState, room.roomId, job, deltaMs, now);
      }

      if (job.jobType === "training") {
        nextState = tickTrainingJob(nextState, room.roomId, job, deltaMs, now);
      }
    }
  }

  return nextState;
}

export function assignHeroToBedHealingIfNeeded(state: GameState, heroId: HeroId, now = Date.now()): GameState {
  const hero = state.heroes.find((candidate) => candidate.id === heroId);

  if (!hero || hero.currentHp <= 0 || isHeroHpReady(hero)) {
    return state;
  }

  const restingState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === heroId
        ? {
            ...candidate,
            status: "resting" as const
          }
        : candidate
    )
  };

  return assignHeroToRoomJob(restingState, heroId, "bed_room", "healing", now);
}

export function updateHeroReadinessAfterInnReturn(state: GameState, heroIds: HeroId[], now = Date.now()): GameState {
  let nextState = state;
  const targetHeroIds = new Set(heroIds);

  nextState = {
    ...nextState,
    heroes: nextState.heroes.map((hero) => {
      if (!targetHeroIds.has(hero.id)) {
        return hero;
      }

      return {
        ...hero,
        status: isHeroHpReady(hero) ? "ready" : "resting"
      };
    })
  };

  for (const heroId of heroIds) {
    nextState = assignHeroToBedHealingIfNeeded(nextState, heroId, now);
  }

  return nextState;
}

export function calculateBedRoomHealingPerSecondForLevel(level: number): number {
  const bedLevel = Math.max(0, Math.floor(level));

  if (bedLevel <= 0) {
    return 0;
  }

  return 2 + (bedLevel - 1) * 1.5;
}

export function calculateBedRoomHealingPerSecond(state: GameState): number {
  const room = getInnRoom(state, "bed_room");
  return room?.isUnlocked ? calculateBedRoomHealingPerSecondForLevel(room.level) : 0;
}

export function calculateTrainingRoomXpPerSecondForLevel(level: number): number {
  const trainingLevel = Math.max(0, Math.floor(level));

  if (trainingLevel <= 0) {
    return 0;
  }

  return 1 + (trainingLevel - 1) * 0.5;
}

export function calculateTrainingRoomXpPerSecond(state: GameState): number {
  const room = getInnRoom(state, "training_room");
  return room?.isUnlocked ? calculateTrainingRoomXpPerSecondForLevel(room.level) : 0;
}

export function getHeroTrainingAttackBonus(hero: HeroInstance): number {
  return Math.min(MAX_TRAINING_ATTACK_LEVEL, Math.max(0, Math.floor(getFiniteNumber(hero.training.attackTrainingLevel, 0))));
}

export function assignHeroToTrainingRoom(state: GameState, heroId: HeroId, now = Date.now()): GameState {
  const hero = state.heroes.find((candidate) => candidate.id === heroId);

  if (!hero || getTrainingRoomAssignmentBlockReason(state, heroId)) {
    return state;
  }

  if (!canAssignHeroToRoomJob(state, heroId, "training_room", "training")) {
    return state;
  }

  const trainingState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === heroId
        ? {
            ...candidate,
            status: "training" as const
          }
        : candidate
    )
  };

  return assignHeroToRoomJob(trainingState, heroId, "training_room", "training", now);
}

export function getTrainingRoomAssignmentBlockReason(state: GameState, heroId: HeroId): string | null {
  const room = getInnRoom(state, "training_room");
  const hero = state.heroes.find((candidate) => candidate.id === heroId);

  if (!room?.isUnlocked || room.level <= 0) {
    return "Training Room is locked.";
  }

  if (!hero) {
    return "No hero selected.";
  }

  if (hero.status === "in_tower") {
    return `${hero.name} is in tower.`;
  }

  if (hero.status === "defeated" || hero.currentHp <= 0) {
    return `${hero.name} is defeated.`;
  }

  if (hero.status === "resting") {
    return `${hero.name} is resting.`;
  }

  const existingHeroJob = getHeroActiveRoomJob(state, heroId);
  if (existingHeroJob?.roomId === "training_room" && existingHeroJob.jobType === "training") {
    return `${hero.name} is already training.`;
  }

  if (existingHeroJob?.roomId === "bed_room" && existingHeroJob.jobType === "healing") {
    return `${hero.name} is resting.`;
  }

  if (existingHeroJob) {
    return `${hero.name} has an active room job.`;
  }

  if (getActiveRoomJobs(state, "training_room").length >= getRoomJobCapacity(state, "training_room")) {
    return "Training Room job slot is full.";
  }

  return null;
}

export function startHeroTrainingDrill(state: GameState, heroId: HeroId, now = Date.now()): GameState {
  const hero = state.heroes.find((candidate) => candidate.id === heroId);
  const blockReason = getTrainingRoomAssignmentBlockReason(state, heroId);

  if (blockReason) {
    return withRoomJobEvent(state, {
      id: `event_training_blocked_${heroId}_${now}`,
      type: "room_job_blocked",
      createdAt: now,
      message: blockReason,
      severity: "warning",
      heroId
    });
  }

  const nextState = assignHeroToTrainingRoom(state, heroId, now);
  if (nextState === state || !hero) {
    return nextState;
  }

  return withRoomJobEvent(nextState, {
    id: `event_training_started_${heroId}_${now}`,
    type: "room_job_started",
    createdAt: now,
    message: `${hero.name} started a training drill.`,
    severity: "success",
    heroId
  });
}

export function cancelHeroTrainingDrill(state: GameState, heroId: HeroId, now = Date.now()): GameState {
  const hero = state.heroes.find((candidate) => candidate.id === heroId);
  const activeJob = getHeroActiveRoomJob(state, heroId);

  if (!hero || activeJob?.roomId !== "training_room" || activeJob.jobType !== "training") {
    return state;
  }

  const nextHeroStatus = hero.currentHp <= 0 ? "defeated" : isHeroHpReady(hero) ? "ready" : "resting";
  const nextState: GameState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === heroId
        ? {
            ...candidate,
            status: nextHeroStatus
          }
        : candidate
    ),
    innRooms: state.innRooms.map((room) => {
      if (room.roomId !== "training_room") {
        return room;
      }

      const jobs = room.jobs.filter((job) => job.id !== activeJob.id);
      return {
        ...room,
        activeJob: jobs.find((job) => job.status === "active")?.id ?? null,
        jobs
      };
    }),
    lastActiveAt: now
  };

  return withRoomJobEvent(nextState, {
    id: `event_training_cancelled_${heroId}_${now}`,
    type: "room_job_cancelled",
    createdAt: now,
    message: `${hero.name} stopped training.`,
    severity: "info",
    heroId
  });
}

function tickHealingJob(state: GameState, roomId: RoomId, job: RoomJob, deltaMs: number, now: number): GameState {
  const room = getInnRoom(state, roomId);
  const healingPerSecond = room?.isUnlocked ? calculateBedRoomHealingPerSecondForLevel(room.level) : 0;

  if (healingPerSecond <= 0) {
    return state;
  }

  const hero = state.heroes.find((candidate) => candidate.id === job.heroId);
  if (!hero) {
    return completeRoomJob(state, job.id, now);
  }

  const maxHp = getHeroMaxHp(hero);
  const healingAmount = healingPerSecond * (deltaMs / 1000);
  const nextHp = Math.min(maxHp, hero.currentHp + healingAmount);
  const progress = Math.min(1, nextHp / getHeroReadyHpThreshold(hero));
  const isReady = nextHp >= getHeroReadyHpThreshold(hero);

  let nextState: GameState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === hero.id
        ? {
            ...candidate,
            currentHp: nextHp,
            status: isReady ? "ready" : "resting"
          }
        : candidate
    ),
    innRooms: state.innRooms.map((candidate) =>
      candidate.roomId === roomId
        ? {
            ...candidate,
            jobs: candidate.jobs.map((candidateJob) =>
              candidateJob.id === job.id
                ? {
                    ...candidateJob,
                    progress,
                    updatedAt: now
                  }
                : candidateJob
            )
          }
        : candidate
    ),
    lastActiveAt: now
  };

  if (isReady) {
    nextState = completeRoomJob(nextState, job.id, now);
  }

  return nextState;
}

function tickTrainingJob(state: GameState, roomId: RoomId, job: RoomJob, deltaMs: number, now: number): GameState {
  const room = getInnRoom(state, roomId);
  const xpPerSecond = room?.isUnlocked ? calculateTrainingRoomXpPerSecondForLevel(room.level) : 0;

  if (xpPerSecond <= 0) {
    return state;
  }

  const hero = state.heroes.find((candidate) => candidate.id === job.heroId);
  if (!hero) {
    return completeRoomJob(state, job.id, now);
  }

  const addedSeconds = deltaMs / 1000;
  const gainedXp = xpPerSecond * addedSeconds;
  const currentTrainingXp = clampNumber(hero.training.attackTrainingXp, 0, 0, TRAINING_XP_PER_ATTACK_LEVEL);
  const currentTrainingLevel = Math.min(
    MAX_TRAINING_ATTACK_LEVEL,
    Math.max(0, Math.floor(getFiniteNumber(hero.training.attackTrainingLevel, 0)))
  );
  const currentTrainingSeconds = clampNumber(hero.training.totalTrainingSeconds, 0, 0, MAX_TRAINING_TOTAL_SECONDS);
  const totalXp = currentTrainingXp + gainedXp;
  const gainedLevels = Math.floor(totalXp / TRAINING_XP_PER_ATTACK_LEVEL);
  const nextXp = totalXp % TRAINING_XP_PER_ATTACK_LEVEL;
  const nextTrainingLevel = Math.min(MAX_TRAINING_ATTACK_LEVEL, currentTrainingLevel + gainedLevels);
  const nextTraining = {
    attackTrainingXp: nextTrainingLevel >= MAX_TRAINING_ATTACK_LEVEL ? 0 : gainedLevels > 0 ? nextXp : totalXp,
    attackTrainingLevel: nextTrainingLevel,
    totalTrainingSeconds: Math.min(MAX_TRAINING_TOTAL_SECONDS, currentTrainingSeconds + addedSeconds)
  };
  const progress = Math.min(1, nextTraining.attackTrainingXp / TRAINING_XP_PER_ATTACK_LEVEL);
  const shouldComplete = gainedLevels > 0 || nextTrainingLevel >= MAX_TRAINING_ATTACK_LEVEL;

  let nextState: GameState = {
    ...state,
    heroes: state.heroes.map((candidate) =>
      candidate.id === hero.id
        ? {
            ...candidate,
            status: shouldComplete ? (isHeroHpReady(candidate) ? "ready" : "resting") : "training",
            training: nextTraining
          }
        : candidate
    ),
    innRooms: state.innRooms.map((candidate) =>
      candidate.roomId === roomId
        ? {
            ...candidate,
            jobs: candidate.jobs.map((candidateJob) =>
              candidateJob.id === job.id
                ? {
                    ...candidateJob,
                    progress,
                    updatedAt: now
                  }
                : candidateJob
            )
          }
        : candidate
    ),
    lastActiveAt: now
  };

  if (shouldComplete) {
    nextState = completeRoomJob(nextState, job.id, now);
  }

  return nextState;
}

function createRoomJob(roomId: RoomId, heroId: HeroId, jobType: RoomJobType, now: number): RoomJob {
  return {
    id: `room_job_${roomId}_${heroId}_${jobType}`,
    roomId,
    heroId,
    jobType,
    status: "active",
    progress: 0,
    startedAt: now,
    updatedAt: now
  };
}

function isRoomJobTypeSupported(roomId: RoomId, jobType: RoomJobType): boolean {
  if (roomId === "bed_room") {
    return jobType === "healing";
  }

  if (roomId === "training_room") {
    return jobType === "training";
  }

  return true;
}

function withRoomJobEvent(state: GameState, event: RecentEvent): GameState {
  return {
    ...state,
    recentEvents: appendRecentEvent(state.recentEvents, event),
    lastActiveAt: event.createdAt
  };
}

function getFiniteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

export function normalizeRoomJobsForRuntime(room: InnRoomState): InnRoomState {
  return {
    ...room,
    activeJob: room.jobs.find((job) => job.status === "active")?.id ?? null,
    jobs: room.jobs.filter((job) => job.status !== "complete")
  };
}
