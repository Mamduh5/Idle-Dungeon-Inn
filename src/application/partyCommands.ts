import type { GameState } from "../types/gameState";
import type { HeroId, PartyId, PartyMode } from "../types/ids";

export function assignHeroToParty(
  state: GameState,
  heroId: HeroId,
  partyId: PartyId,
  slotIndex?: number
): GameState {
  const hero = state.heroes.find((candidate) => candidate.id === heroId);
  const targetParty = state.parties.find((candidate) => candidate.id === partyId);

  if (!hero || !targetParty?.isUnlocked) {
    return state;
  }

  const partiesWithoutHero = state.parties.map((party) => ({
    ...party,
    heroIds: party.heroIds.filter((candidateHeroId) => candidateHeroId !== heroId)
  }));
  const nextParties = partiesWithoutHero.map((party) => {
    if (party.id !== partyId) {
      return party;
    }

    const nextHeroIds = [...party.heroIds];
    if (typeof slotIndex === "number" && Number.isFinite(slotIndex)) {
      const clampedSlot = Math.max(0, Math.min(Math.floor(slotIndex), party.maxSize - 1));
      nextHeroIds[clampedSlot] = heroId;
    } else if (nextHeroIds.length < party.maxSize) {
      nextHeroIds.push(heroId);
    } else {
      return party;
    }

    return {
      ...party,
      heroIds: nextHeroIds.slice(0, party.maxSize)
    };
  });
  const changedParty = nextParties.find((party) => party.id === partyId);

  if (!changedParty?.heroIds.includes(heroId)) {
    return state;
  }

  return {
    ...state,
    parties: nextParties,
    heroes: state.heroes.map((candidate) =>
      candidate.id === heroId
        ? {
            ...candidate,
            assignedPartyId: partyId
          }
        : candidate.assignedPartyId === partyId && !changedParty.heroIds.includes(candidate.id)
          ? {
              ...candidate,
              assignedPartyId: null
            }
          : candidate
    )
  };
}

export function setPartyMode(state: GameState, partyId: PartyId, mode: PartyMode): GameState {
  if (!state.parties.some((party) => party.id === partyId && party.isUnlocked)) {
    return state;
  }

  return {
    ...state,
    parties: state.parties.map((party) =>
      party.id === partyId
        ? {
            ...party,
            mode
          }
        : party
    )
  };
}

export function selectParty(state: GameState, partyId: PartyId): GameState {
  const party = state.parties.find((candidate) => candidate.id === partyId);

  if (!party?.isUnlocked) {
    return state;
  }

  return {
    ...state,
    selectedPartyId: partyId
  };
}
