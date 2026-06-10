import { toggleAutoDispatch } from "../systems/automationSystem";
import { sendSelectedPartyToTower } from "../systems/partyDispatchSystem";
import {
  cancelHeroTrainingDrill,
  getActiveRoomJobs,
  getDefaultTrainingHero,
  getTrainingHeroSelectionOptions,
  startHeroTrainingDrill
} from "../systems/roomJobSystem";
import type { GameState } from "../types/gameState";
import type { HeroId } from "../types/ids";

export function selectTrainingHero(state: GameState, heroId: HeroId): GameState {
  if (!state.heroes.some((hero) => hero.id === heroId)) {
    return state;
  }

  return {
    ...state,
    selectedTrainingHeroId: heroId
  };
}

export function selectAdjacentTrainingHero(state: GameState, direction: "previous" | "next"): GameState {
  const options = getTrainingHeroSelectionOptions(state);
  if (options.length === 0) {
    return state;
  }

  const currentIndex = Math.max(
    0,
    options.findIndex((hero) => hero.id === state.selectedTrainingHeroId)
  );
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + offset + options.length) % options.length;

  return selectTrainingHero(state, options[nextIndex].id);
}

export function startTrainingFromInn(state: GameState, heroId?: HeroId | null, now?: number): GameState {
  const targetHeroId = heroId ?? getDefaultTrainingHero(state, state.selectedTrainingHeroId)?.id ?? null;
  return targetHeroId ? startHeroTrainingDrill(selectTrainingHero(state, targetHeroId), targetHeroId, now) : state;
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

  if (activeTrainingHeroId && heroId && heroId !== activeTrainingHeroId) {
    return startTrainingFromInn(cancelTrainingFromInn(state, activeTrainingHeroId), heroId);
  }

  return startTrainingFromInn(state, heroId);
}

export function handleInnSelectPreviousTrainingHero(state: GameState): GameState {
  return selectAdjacentTrainingHero(state, "previous");
}

export function handleInnSelectNextTrainingHero(state: GameState): GameState {
  return selectAdjacentTrainingHero(state, "next");
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
