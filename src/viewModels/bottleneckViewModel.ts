import { analyzeBottleneck, type BottleneckCause, type BottleneckRecommendation } from "../systems/bottleneckAnalysisSystem";
import type { GameState } from "../types/gameState";

export interface BottleneckRecommendationViewModel extends BottleneckRecommendation {
  actionLabel: string;
}

export interface BottleneckViewModel {
  hasCurrentBlocker: boolean;
  floorLabel: string;
  title: string;
  cause: BottleneckCause;
  causeLabel: string;
  evidence: string[];
  recommendations: BottleneckRecommendationViewModel[];
  emptyStateLabel: string | null;
}

export function getBottleneckViewModel(state: GameState): BottleneckViewModel {
  const summary = analyzeBottleneck(state);

  return {
    hasCurrentBlocker: summary.recommendations.length > 0,
    floorLabel: `Floor ${summary.floor}`,
    title: summary.title,
    cause: summary.cause,
    causeLabel: formatCauseLabel(summary.cause),
    evidence: summary.evidence,
    recommendations: summary.recommendations.map((recommendation) => ({
      ...recommendation,
      actionLabel: recommendation.label
    })),
    emptyStateLabel: summary.recommendations.length > 0 ? null : "No current blocker."
  };
}

function formatCauseLabel(cause: BottleneckCause): string {
  return cause
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
