import type { RoomId } from "../types/ids";
import type { RoomDefinition } from "../types/roomTypes";

export const roomDefinitions: Record<RoomId, RoomDefinition> = {
  bed_room: {
    roomId: "bed_room",
    name: "Bed Room",
    description: "A quiet place for heroes to recover between tower attempts.",
    baseCost: 25,
    costGrowth: 1.35,
    effectType: "rest_recovery",
    unlockFloor: 1
  },
  training_room: {
    roomId: "training_room",
    name: "Training Room",
    description: "Trains selected heroes over time for personal attack bonuses.",
    baseCost: 60,
    costGrowth: 1.45,
    effectType: "hero_training",
    unlockFloor: 2
  },
  kitchen: {
    roomId: "kitchen",
    name: "Kitchen",
    description: "Prepares future food buffs for safer tower attempts.",
    baseCost: 90,
    costGrowth: 1.4,
    effectType: "food_prep",
    unlockFloor: 3
  },
  forge: {
    roomId: "forge",
    name: "Forge",
    description: "Foundation for hero-specific gear upgrades.",
    baseCost: 220,
    costGrowth: 1.5,
    effectType: "gear_upgrade",
    unlockFloor: 12
  },
  tavern: {
    roomId: "tavern",
    name: "Tavern",
    description: "Explains party management and future party capacity.",
    baseCost: 400,
    costGrowth: 1.55,
    effectType: "party_capacity",
    unlockFloor: 20
  },
  library: {
    roomId: "library",
    name: "Library",
    description: "Improves local automation timing.",
    baseCost: 180,
    costGrowth: 1.45,
    effectType: "automation_research",
    unlockFloor: 8
  },
  gate_room: {
    roomId: "gate_room",
    name: "Gate Room",
    description: "Shortens tower travel time.",
    baseCost: 240,
    costGrowth: 1.5,
    effectType: "travel_prep",
    unlockFloor: 11
  }
};
