import type { HeroId, LootId, PartyId, PartyMode, TowerFloorId } from "./ids";

export interface PartyState {
  id: PartyId;
  name: string;
  heroIds: HeroId[];
  maxSize: number;
  mode: PartyMode;
  selectedTargetFloor: TowerFloorId;
  selectedMaterialId: LootId | null;
  retreatHpPercent: number;
  isUnlocked: boolean;
}
