import type { AutomationId, TowerFloorId } from "./ids";

export interface AutomationDefinition {
  automationId: AutomationId;
  name: string;
  description: string;
  unlockFloor: TowerFloorId;
  maxLevel: number;
}

export interface AutomationState {
  autoDispatchLevel: number;
  autoLootLevel: number;
  autoHealLevel: number;
  autoRepairLevel: number;
  autoSkillLevel: number;
  autoRetryLevel: number;
  enabled: Record<AutomationId, boolean>;
}
