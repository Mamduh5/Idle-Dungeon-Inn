export type HeroId = string;
export type PartyId = string;
export type HeroClassId = string;
export type RoomId = string;
export type EnemyId = string;
export type TowerFloorId = number;
export type TowerNodeId = string;
export type AutomationId = string;
export type LootId = string;
export type SkillId = string;
export type UpgradeId = string;

export type TowerNodeType = "combat" | "elite" | "treasure" | "trap" | "camp" | "boss" | "exit";
export type PartyMode = "push" | "safe_farm" | "material_hunt" | "boss_attempt";
export type HeroStatus = "idle" | "assigned" | "resting" | "defeated" | "in_tower" | "wounded" | "ready" | "eating" | "training" | "gearing";
