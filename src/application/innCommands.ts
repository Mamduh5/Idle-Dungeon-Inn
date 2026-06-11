import { toggleAutoDispatch } from "../systems/automationSystem";
import { sendSelectedPartyToTower } from "../systems/partyDispatchSystem";
import {
  cancelHeroTrainingDrill,
  getActiveRoomJobs,
  getDefaultTrainingHero,
  startHeroTrainingDrill
} from "../systems/roomJobSystem";
import type { GameState } from "../types/gameState";
import type { HeroId } from "../types/ids";

export function selectTrainingHeroFromInn(state: GameState, heroId: HeroId | null): GameState {
  if (!heroId || !state.heroes.some((hero) => hero.id === heroId)) {
    return state;
  }

  return {
    ...state,
    selectedTrainingHeroId: heroId
  };
}

export function startTrainingFromInn(state: GameState, heroId?: HeroId | null, now?: number): GameState {
  const targetHeroId = heroId ?? getDefaultTrainingHero(state, state.selectedTrainingHeroId)?.id ?? null;
  return targetHeroId ? startHeroTrainingDrill(state, targetHeroId, now) : state;
}

export function cancelTrainingFromInn(state: GameState, heroId?: HeroId | null, now?: number): GameState {
  const targetHeroId = heroId ?? getActiveTrainingHeroId(state);
  return targetHeroId ? cancelHeroTrainingDrill(state, targetHeroId, now) : state;
}

export function toggleAutoDispatchFromInn(state: GameState, now?: number): GameState {
  return toggleAutoDispatch(state, now);
}

export function sendSelectedPartyFromInn(state: GameState, now?: number): GameState {
  return sendSelectedPartyToTower(state, { now });
}

export function handleInnTrainAction(state: GameState, heroId?: HeroId | null): GameState {
  return startTrainingFromInn(state, heroId);
}

export function handleInnCancelTrainingAction(state: GameState, heroId?: HeroId | null): GameState {
  return cancelTrainingFromInn(state, heroId);
}

export function handleInnTrainingAction(state: GameState, heroId?: HeroId | null): GameState {
  const activeTrainingHeroId = getActiveTrainingHeroId(state);

  if (activeTrainingHeroId && (!heroId || heroId === activeTrainingHeroId)) {
    return cancelTrainingFromInn(state, activeTrainingHeroId);
  }

  return startTrainingFromInn(state, heroId);
}

export function handleInnToggleAutoDispatch(state: GameState): GameState {
  return toggleAutoDispatchFromInn(state);
}

export function handleInnSendSelectedParty(state: GameState): GameState {
  return sendSelectedPartyFromInn(state);
}

function getActiveTrainingHeroId(state: GameState): HeroId | null {
  return getActiveRoomJobs(state, "training_room").find((job) => job.jobType === "training")?.heroId ?? null;
}
