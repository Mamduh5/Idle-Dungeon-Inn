import type { CombatStats } from "./combatTypes";
import type { HeroClassId, HeroId, HeroStatus, LootId, PartyId, SkillId, TowerFloorId } from "./ids";

export interface HeroDefinition {
  classId: HeroClassId;
  name: string;
  role: string;
  baseStats: CombatStats;
  growth: Partial<CombatStats>;
  unlockFloor: TowerFloorId;
  startingSkillIds: SkillId[];
}

export interface HeroTrainingState {
  attackTrainingXp: number;
  attackTrainingLevel: number;
  totalTrainingSeconds: number;
}

export interface HeroInstance {
  id: HeroId;
  classId: HeroClassId;
  name: string;
  level: number;
  xp: number;
  currentHp: number;
  status: HeroStatus;
  assignedPartyId: PartyId | null;
  highestFloorCleared: TowerFloorId;
  defeats: number;
  traits: string[];
  gear: Record<string, LootId | null>;
  training: HeroTrainingState;
}
