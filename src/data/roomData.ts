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
  }
};
