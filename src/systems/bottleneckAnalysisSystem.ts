import { getHeroesForParty, getSelectedParty, getSelectedTowerRun } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";
import { getHeroReadyHpThreshold, getHeroTrainingAttackBonus } from "./roomJobSystem";
import { getBottleneckHintForRun } from "./bottleneckHintSystem";

export type BottleneckCause =
  | "low_hp"
  | "low_damage"
  | "low_training"
  | "slow_recovery"
  | "boss_checkpoint"
  | "party_wiped"
  | "unknown";

export interface BottleneckRecommendation {
  id: string;
  label: string;
  target: RoomId | "build" | "heroes" | "tower";
  reason: string;
}

export interface BottleneckSummary {
  floor: number;
  title: string;
  cause: BottleneckCause;
  evidence: string[];
  recommendations: BottleneckRecommendation[];
}

const BED_ROOM_RECOMMENDATION: BottleneckRecommendation = {
  id: "upgrade_bed_room",
  label: "Upgrade Bed Room",
  target: "bed_room",
  reason: "Improves recovery so wounded heroes can retry safely."
};

const TRAINING_ROOM_RECOMMENDATION: BottleneckRecommendation = {
  id: "train_hero_attack",
  label: "Train hero attack",
  target: "training_room",
  reason: "Adds hero-specific attack for checkpoint progress."
};

export function analyzeBottleneck(state: GameState): BottleneckSummary {
  const party = getSelectedParty(state);
  const run = getSelectedTowerRun(state);
  const heroes = party ? getHeroesForParty(state, party.id) : [];
  const hint = getBottleneckHintForRun(run);
  const latestEvent = state.recentEvents[0];
  const latestMessage = latestEvent?.message ?? "";
  const floor = run?.floor ?? state.unlockedFloor;
  const evidence = createBaseEvidence(state, floor, heroes, run?.lastFailureReason ?? hint ?? latestMessage);
  const isWiped = run?.status === "wiped" || latestEvent?.type === "party_wiped";
  const lowHpHero = heroes.find((hero) => hero.currentHp < getHeroReadyHpThreshold(hero));
  const hasFloor10CheckpointText = includesCheckpointText(hint) || includesCheckpointText(latestMessage) || includesCheckpointText(run?.lastFailureReason);
  const hasFloor20CheckpointText =
    includesFloor20CheckpointText(hint) ||
    includesFloor20CheckpointText(latestMessage) ||
    includesFloor20CheckpointText(run?.lastFailureReason);
  const wantsBedRoom = mentionsRoom(hint, "Bed Room") || mentionsRoom(latestMessage, "Bed Room") || mentionsRoom(run?.lastFailureReason, "Bed Room");
  const wantsTrainingRoom =
    mentionsRoom(hint, "Training Room") ||
    mentionsRoom(latestMessage, "Training Room") ||
    mentionsRoom(run?.lastFailureReason, "Training Room");
  const lowTrainingHero = heroes.find((hero) => getHeroTrainingAttackBonus(hero) <= 0);

  if (hasFloor10CheckpointText) {
    return {
      floor,
      title: "Floor 10 bottleneck",
      cause: "boss_checkpoint",
      evidence: uniqueEvidence([
        ...evidence,
        "Big Cave Slime is the first checkpoint boss.",
        hint ?? latestMessage
      ]),
      recommendations: createRecommendations(wantsBedRoom || Boolean(lowHpHero), wantsTrainingRoom || Boolean(lowTrainingHero))
    };
  }

  if (hasFloor20CheckpointText) {
    return {
      floor,
      title: "Floor 20 bottleneck",
      cause: "boss_checkpoint",
      evidence: uniqueEvidence([
        ...evidence,
        "Bone Captain is the Bone Hall checkpoint boss.",
        hint ?? latestMessage
      ]),
      recommendations: createRecommendations(wantsBedRoom || Boolean(lowHpHero), wantsTrainingRoom || Boolean(lowTrainingHero))
    };
  }

  if (isWiped && lowHpHero) {
    return {
      floor,
      title: "Recovery bottleneck",
      cause: "low_hp",
      evidence: uniqueEvidence([
        ...evidence,
        `${lowHpHero.name} has ${formatNumber(lowHpHero.currentHp)} HP and needs ${getHeroReadyHpThreshold(lowHpHero)} HP.`
      ]),
      recommendations: [BED_ROOM_RECOMMENDATION]
    };
  }

  if (isWiped && lowTrainingHero) {
    return {
      floor,
      title: "Damage bottleneck",
      cause: "low_training",
      evidence: uniqueEvidence([
        ...evidence,
        `${lowTrainingHero.name} has +${getHeroTrainingAttackBonus(lowTrainingHero)} training attack.`
      ]),
      recommendations: [TRAINING_ROOM_RECOMMENDATION]
    };
  }

  if (isWiped) {
    return {
      floor,
      title: "Party wiped",
      cause: "party_wiped",
      evidence,
      recommendations: [BED_ROOM_RECOMMENDATION, TRAINING_ROOM_RECOMMENDATION]
    };
  }

  return {
    floor,
    title: "No current bottleneck",
    cause: "unknown",
    evidence: ["No wipe or checkpoint blocker is active."],
    recommendations: []
  };
}

function createBaseEvidence(
  state: GameState,
  floor: number,
  heroes: ReturnType<typeof getHeroesForParty>,
  failureText: string | null
): string[] {
  const evidence = [`Current floor context: Floor ${floor}.`];

  for (const hero of heroes) {
    evidence.push(`${hero.name}: HP ${formatNumber(hero.currentHp)}/${getHeroReadyHpThreshold(hero)} ready threshold, +${getHeroTrainingAttackBonus(hero)} training ATK.`);
  }

  if (failureText) {
    evidence.push(failureText);
  }

  if (state.recentEvents[0]?.type) {
    evidence.push(`Latest event: ${state.recentEvents[0].type}.`);
  }

  return uniqueEvidence(evidence);
}

function createRecommendations(needsBedRoom: boolean, needsTrainingRoom: boolean): BottleneckRecommendation[] {
  const recommendations: BottleneckRecommendation[] = [];

  if (needsBedRoom) {
    recommendations.push(BED_ROOM_RECOMMENDATION);
  }

  if (needsTrainingRoom) {
    recommendations.push(TRAINING_ROOM_RECOMMENDATION);
  }

  return recommendations.length > 0 ? recommendations : [BED_ROOM_RECOMMENDATION, TRAINING_ROOM_RECOMMENDATION];
}

function mentionsRoom(text: string | null | undefined, roomName: string): boolean {
  return text?.includes(roomName) === true;
}

function includesCheckpointText(text: string | null | undefined): boolean {
  return text?.includes("Floor 10 checkpoint") === true || text?.includes("Big Cave Slime") === true || text?.includes("boss checkpoint") === true;
}

function includesFloor20CheckpointText(text: string | null | undefined): boolean {
  return text?.includes("Floor 20 checkpoint") === true || text?.includes("Bone Captain") === true;
}

function uniqueEvidence(evidence: string[]): string[] {
  return [...new Set(evidence.filter((item) => item.trim().length > 0))];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
