import { heroDefinitions } from "../data/heroData";
import { getHeroesForParty, getSelectedParty } from "../state/gameSelectors";
import { getHeroActiveRoomJob } from "../systems/roomJobSystem";
import type { GameState } from "../types/gameState";
import type { HeroInstance } from "../types/heroTypes";
import type { HeroId, HeroStatus } from "../types/ids";
import { getHeroHpDisplayText } from "../ui/heroDisplayText";
import { getHeroTrainingRosterText } from "../ui/trainingRoomText";

export interface HeroRosterCardViewModel {
  id: HeroId;
  name: string;
  levelLabel: string;
  classLabel: string;
  status: HeroStatus;
  statusLabel: string;
  hpLabel: string;
  hpRatio: number;
  trainingBonusLabel: string;
  trainingProgressLabel: string;
  currentRoomJobLabel: string | null;
  hero: HeroInstance;
}

export interface HeroPartySlotViewModel {
  slotIndex: number;
  hero: HeroRosterCardViewModel | null;
  label: string;
  statusLabel: string;
}

export interface HeroesViewModel {
  partyName: string;
  maxPartySize: number;
  roster: HeroRosterCardViewModel[];
  partySlots: HeroPartySlotViewModel[];
}

export function getHeroesViewModel(state: GameState): HeroesViewModel {
  const party = getSelectedParty(state);
  const partyHeroes = party ? getHeroesForParty(state, party.id) : [];
  const partyHeroIds = new Set(partyHeroes.map((hero) => hero.id));
  const orderedHeroes = [...partyHeroes, ...state.heroes.filter((hero) => !partyHeroIds.has(hero.id))];
  const roster = orderedHeroes.map((hero) => createHeroRosterCard(state, hero));

  return {
    partyName: party?.name ?? "No Party",
    maxPartySize: party?.maxSize ?? 3,
    roster,
    partySlots: Array.from({ length: party?.maxSize ?? 3 }, (_, slotIndex) => {
      const hero = partyHeroes[slotIndex] ?? null;
      const card = hero ? roster.find((candidate) => candidate.id === hero.id) ?? createHeroRosterCard(state, hero) : null;

      return {
        slotIndex,
        hero: card,
        label: card?.name ?? "Future",
        statusLabel: card?.statusLabel ?? "slot"
      };
    })
  };
}

function createHeroRosterCard(state: GameState, hero: HeroInstance): HeroRosterCardViewModel {
  const definition = heroDefinitions[hero.classId];
  const hpDisplay = getHeroHpDisplayText(hero);
  const trainingText = getHeroTrainingRosterText(state, hero);
  const activeRoomJob = getHeroActiveRoomJob(state, hero.id);

  return {
    id: hero.id,
    name: hero.name,
    levelLabel: `${hero.name} Lv ${hero.level}`,
    classLabel: definition?.name ?? hero.classId,
    status: hero.status,
    statusLabel: trainingText.statusLabel,
    hpLabel: hpDisplay.label,
    hpRatio: hpDisplay.ratio,
    trainingBonusLabel: trainingText.bonusLabel,
    trainingProgressLabel: trainingText.progressLabel,
    currentRoomJobLabel: activeRoomJob ? `${formatStatusLabel(activeRoomJob.jobType)} in ${activeRoomJob.roomId}` : null,
    hero
  };
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
