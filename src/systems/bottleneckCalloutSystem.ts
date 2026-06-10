import { getSelectedTowerRun } from "../state/gameSelectors";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";
import { getBottleneckHintForRun } from "./bottleneckHintSystem";

export interface BottleneckRoomRecommendation {
  roomId: RoomId;
  buildLabel: string;
  buildWhy: string;
  innBadge: string;
}

export interface Floor10BossCallout {
  hint: string;
  title: string;
  buildMessage: string;
  recommendations: BottleneckRoomRecommendation[];
}

const CHECKPOINT_MARKERS = ["Floor 10 checkpoint", "Big Cave Slime", "Floor 20 checkpoint", "Bone Captain", "boss checkpoint"];

const BED_ROOM_RECOMMENDATION: BottleneckRoomRecommendation = {
  roomId: "bed_room",
  buildLabel: "Bed Room",
  buildWhy: "Bed Room: improves recovery/retry pacing.",
  innBadge: "Recommended after checkpoint wipe"
};

const TRAINING_ROOM_RECOMMENDATION: BottleneckRoomRecommendation = {
  roomId: "training_room",
  buildLabel: "Training Room",
  buildWhy: "Training Room: improves attack/checkpoint progress.",
  innBadge: "Recommended for boss damage"
};

export function getLatestActionableBottleneckHint(state: GameState): string | null {
  const selectedRunHint = getBottleneckHintForRun(getSelectedTowerRun(state));
  if (selectedRunHint) {
    return selectedRunHint;
  }

  const latestEvent = state.recentEvents[0];
  if (latestEvent && isFloor10BossBottleneckText(latestEvent.message)) {
    return latestEvent.message;
  }

  return null;
}

export function getRecommendedUpgradeRoomIds(state: GameState): RoomId[] {
  return getFloor10BossCallout(state)?.recommendations.map((recommendation) => recommendation.roomId) ?? [];
}

export function getFloor10BossCallout(state: GameState): Floor10BossCallout | null {
  const hint = getLatestActionableBottleneckHint(state);
  if (!hint || !isFloor10BossBottleneckText(hint)) {
    return null;
  }

  const recommendations = getRecommendationsFromHint(hint);
  if (recommendations.length === 0) {
    return null;
  }

  return {
    hint,
    title: createCalloutTitle(hint),
    buildMessage: createBuildMessage(hint, recommendations),
    recommendations
  };
}

export function getFloor10RoomRecommendation(
  state: GameState,
  roomId: RoomId
): BottleneckRoomRecommendation | null {
  return getFloor10BossCallout(state)?.recommendations.find((recommendation) => recommendation.roomId === roomId) ?? null;
}

function getRecommendationsFromHint(hint: string): BottleneckRoomRecommendation[] {
  const recommendations: BottleneckRoomRecommendation[] = [];

  if (hint.includes("Bed Room")) {
    recommendations.push(BED_ROOM_RECOMMENDATION);
  }

  if (hint.includes("Training Room")) {
    recommendations.push(TRAINING_ROOM_RECOMMENDATION);
  }

  return recommendations;
}

function createBuildMessage(hint: string, recommendations: BottleneckRoomRecommendation[]): string {
  const hasBedRoom = recommendations.some((recommendation) => recommendation.roomId === "bed_room");
  const hasTrainingRoom = recommendations.some((recommendation) => recommendation.roomId === "training_room");
  const checkpointLabel = hint.includes("Floor 20") || hint.includes("Bone Captain") ? "Floor 20" : "Floor 10";

  if (hasBedRoom && hasTrainingRoom) {
    return `${checkpointLabel} blocked your party. Upgrade Bed Room for safer retries or Training Room for more damage.`;
  }

  if (hasBedRoom) {
    return `${checkpointLabel} blocked your party. Upgrade Bed Room for safer recovery before retrying.`;
  }

  return `${checkpointLabel} blocked your party. Upgrade Training Room for more boss damage.`;
}

function isFloor10BossBottleneckText(message: string): boolean {
  return CHECKPOINT_MARKERS.some((marker) => message.includes(marker));
}

function createCalloutTitle(hint: string): string {
  return hint.includes("Floor 20") || hint.includes("Bone Captain") ? "Floor 20 bottleneck" : "Floor 10 bottleneck";
}
