export interface CombatStats {
  hp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  skillPower: number;
  recovery: number;
  aggro: number;
  lootBonus: number;
}

export type CombatActorSide = "hero" | "enemy";

export type CombatEventType = "damage" | "actor_defeated" | "combat_started" | "combat_ended";

export interface CombatEvent {
  type: CombatEventType;
  actorSide: CombatActorSide;
  actorId: string;
  targetSide?: CombatActorSide;
  targetId?: string;
  amount?: number;
  message: string;
  createdAt: number;
}
