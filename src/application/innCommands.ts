import { toggleAutoDispatch } from "../systems/automationSystem";
import { sendSelectedPartyToTower } from "../systems/partyDispatchSystem";
import { cancelHeroTrainingDrill, startHeroTrainingDrill } from "../systems/roomJobSystem";
import type { GameState } from "../types/gameState";
import type { HeroId } from "../types/ids";
import { getInnViewModel } from "./innViewModel";

export function handleInnTrainAction(state: GameState, heroId?: HeroId | null): GameState {
  const targetHeroId = heroId ?? getInnViewModel(state).trainingRoom.targetHeroId;
  return targetHeroId ? startHeroTrainingDrill(state, targetHeroId) : state;
}

export function handleInnCancelTrainingAction(state: GameState, heroId?: HeroId | null): GameState {
  const targetHeroId = heroId ?? getInnViewModel(state).trainingRoom.targetHeroId;
  return targetHeroId ? cancelHeroTrainingDrill(state, targetHeroId) : state;
}

export function handleInnTrainingAction(state: GameState, heroId?: HeroId | null): GameState {
  const viewModel = getInnViewModel(state);
  const targetHeroId = heroId ?? viewModel.trainingRoom.targetHeroId;

  if (!targetHeroId) {
    return state;
  }

  return viewModel.trainingRoom.isCancelAction
    ? cancelHeroTrainingDrill(state, targetHeroId)
    : startHeroTrainingDrill(state, targetHeroId);
}

export function handleInnToggleAutoDispatch(state: GameState): GameState {
  return toggleAutoDispatch(state);
}

export function handleInnSendSelectedParty(state: GameState): GameState {
  return sendSelectedPartyToTower(state);
}
