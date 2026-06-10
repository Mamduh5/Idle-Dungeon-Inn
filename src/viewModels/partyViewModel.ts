import { getHeroesForParty, getSelectedParty } from "../state/gameSelectors";
import { getSelectedPartyDispatchBlockReason } from "../systems/partyDispatchSystem";
import type { GameState } from "../types/gameState";
import type { HeroId, PartyId, PartyMode } from "../types/ids";

export interface PartyOptionViewModel {
  id: PartyId;
  name: string;
  isSelected: boolean;
  isUnlocked: boolean;
  mode: PartyMode;
  modeLabel: string;
  heroCountLabel: string;
}

export interface PartySlotSummaryViewModel {
  slotIndex: number;
  heroId: HeroId | null;
  label: string;
  statusLabel: string;
}

export interface PartyModeOptionViewModel {
  mode: PartyMode;
  label: string;
  isSelected: boolean;
}

export interface PartyViewModel {
  selectedPartyId: PartyId | null;
  selectedPartyName: string;
  selectedMode: PartyMode | null;
  selectedModeLabel: string;
  targetFloorLabel: string;
  canDispatch: boolean;
  dispatchBlockedReason: string | null;
  parties: PartyOptionViewModel[];
  slots: PartySlotSummaryViewModel[];
  modeOptions: PartyModeOptionViewModel[];
}

const PARTY_MODE_OPTIONS: PartyMode[] = ["push", "safe_farm", "material_hunt", "boss_attempt"];

export function getPartyViewModel(state: GameState): PartyViewModel {
  const selectedParty = getSelectedParty(state);
  const selectedHeroes = selectedParty ? getHeroesForParty(state, selectedParty.id) : [];
  const dispatchBlockedReason = getSelectedPartyDispatchBlockReason(state);

  return {
    selectedPartyId: selectedParty?.id ?? null,
    selectedPartyName: selectedParty?.name ?? "No Party",
    selectedMode: selectedParty?.mode ?? null,
    selectedModeLabel: selectedParty ? formatPartyMode(selectedParty.mode) : "No Mode",
    targetFloorLabel: `Target F${selectedParty?.selectedTargetFloor ?? state.unlockedFloor}`,
    canDispatch: dispatchBlockedReason === null,
    dispatchBlockedReason,
    parties: state.parties.map((party) => ({
      id: party.id,
      name: party.name,
      isSelected: party.id === selectedParty?.id,
      isUnlocked: party.isUnlocked,
      mode: party.mode,
      modeLabel: formatPartyMode(party.mode),
      heroCountLabel: `${party.heroIds.length}/${party.maxSize}`
    })),
    slots: Array.from({ length: selectedParty?.maxSize ?? 0 }, (_, slotIndex) => {
      const hero = selectedHeroes[slotIndex] ?? null;

      return {
        slotIndex,
        heroId: hero?.id ?? null,
        label: hero?.name ?? "Open Slot",
        statusLabel: hero ? formatStatusLabel(hero.status) : "empty"
      };
    }),
    modeOptions: PARTY_MODE_OPTIONS.map((mode) => ({
      mode,
      label: formatPartyMode(mode),
      isSelected: mode === selectedParty?.mode
    }))
  };
}

function formatPartyMode(mode: PartyMode): string {
  return mode
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
