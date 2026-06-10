import { toggleAutoDispatch } from "../systems/automationSystem";
import type { GameState } from "../types/gameState";
import type { HeroId, PartyId, PartyMode, RoomId } from "../types/ids";
import { purchaseRoomUpgradeFromBuild } from "./buildCommands";
import {
  cancelTrainingFromInn,
  sendSelectedPartyFromInn,
  startTrainingFromInn
} from "./innCommands";
import { assignHeroToParty, selectParty, setPartyMode } from "./partyCommands";
import { recoverSelectedPartyFromTower } from "./towerCommands";

export type GameCommand =
  | { type: "inn/start_training"; heroId?: HeroId | null; now?: number }
  | { type: "inn/cancel_training"; heroId?: HeroId | null; now?: number }
  | { type: "inn/send_selected_party"; now?: number }
  | { type: "tower/recover_selected_party"; now?: number }
  | { type: "automation/toggle_auto_dispatch"; now?: number }
  | { type: "build/purchase_room_upgrade"; roomId: RoomId; now?: number }
  | { type: "heroes/assign_to_party"; heroId: HeroId; partyId: PartyId; slotIndex?: number }
  | { type: "party/set_mode"; partyId: PartyId; mode: PartyMode }
  | { type: "party/select"; partyId: PartyId };

export function runGameCommand(state: GameState, command: GameCommand): GameState {
  switch (command.type) {
    case "inn/start_training":
      return startTrainingFromInn(state, command.heroId, command.now);
    case "inn/cancel_training":
      return cancelTrainingFromInn(state, command.heroId, command.now);
    case "inn/send_selected_party":
      return sendSelectedPartyFromInn(state, command.now);
    case "tower/recover_selected_party":
      return recoverSelectedPartyFromTower(state, command.now);
    case "automation/toggle_auto_dispatch":
      return toggleAutoDispatch(state, command.now);
    case "build/purchase_room_upgrade":
      return purchaseRoomUpgradeFromBuild(state, command.roomId, command.now);
    case "heroes/assign_to_party":
      return assignHeroToParty(state, command.heroId, command.partyId, command.slotIndex);
    case "party/set_mode":
      return setPartyMode(state, command.partyId, command.mode);
    case "party/select":
      return selectParty(state, command.partyId);
    default:
      return state;
  }
}
