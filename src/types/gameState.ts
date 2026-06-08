export interface HeroState {
  id: string;
  name: string;
  role: string;
  level: number;
}

export interface PartyState {
  activePartyId: string;
  parties: Array<{
    id: string;
    name: string;
    heroIds: string[];
  }>;
}

export interface TowerRunState {
  currentFloor: number;
  bestFloor: number;
  activePartyId: string | null;
  isRunning: boolean;
}

export interface RecentEvent {
  id: string;
  message: string;
  createdAt: number;
}

export interface GameState {
  coins: number;
  heroes: HeroState[];
  party: PartyState;
  towerRun: TowerRunState;
  recentEvents: RecentEvent[];
}
