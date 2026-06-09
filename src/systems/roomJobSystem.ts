import { heroDefinitions } from "../data/heroData";
import { getInnRoom } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroId, RoomId } from "../types/ids";
import type { InnRoomState, RoomJob, RoomJobType } from "../types/roomTypes";

export const HERO_READY_HP_RATIO = 0.9;

export function getHeroMaxHp(hero: HeroInstance): number {
  return Math.max(1, heroDefinitions[hero.classId]?.baseStats.hp ?? hero.currentHp, 1);
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

export function normalizeRoomJobsForRuntime(room: InnRoomState): InnRoomState {
  return {
    ...room,
    activeJob: room.jobs.find((job) => job.status === "active")?.id ?? null,
    jobs: room.jobs.filter((job) => job.status !== "complete")
  };
}
