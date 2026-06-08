import type { GameState } from "../types/gameState";

export const initialGameState: GameState = {
  coins: 0,
  party: {
    activePartyId: "starter-party",
    parties: [
      {
        id: "starter-party",
        name: "Lantern Party",
        heroIds: ["starter-hero"]
      }
    ]
  },
  heroes: [
    {
      id: "starter-hero",
      name: "Mira",
      role: "Vanguard",
      level: 1
    }
  ],
  towerRun: {
    currentFloor: 1,
    bestFloor: 1,
    activePartyId: "starter-party",
    isRunning: false
  },
  recentEvents: [
    {
      id: "welcome",
      message: "The inn is open.",
      createdAt: 0
    }
  ]
};
