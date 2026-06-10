import { getHeroActiveRoomJob } from "../systems/roomJobSystem";
import type { GameState } from "../types/gameState";

export function getInnReadinessRenderKey(state: GameState): string {
  return state.heroes
    .map((hero) => {
      const job = getHeroActiveRoomJob(state, hero.id);
      return `${hero.id}:${Math.floor(hero.currentHp)}:${hero.status}:${hero.training.attackTrainingLevel}:${
        job?.id ?? "none"
      }:${job?.status ?? "none"}`;
    })
    .join("|");
}
