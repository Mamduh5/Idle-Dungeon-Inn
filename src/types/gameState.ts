import type { AutomationState } from "./automationTypes";
import type { CurrencyState } from "./economyTypes";
import type { HeroInstance } from "./heroTypes";
import type { PartyId, TowerFloorId } from "./ids";
import type { InventoryState } from "./lootTypes";
import type { PartyState } from "./partyTypes";
import type { RecentEvent } from "./recentEventTypes";
import type { InnRoomState } from "./roomTypes";
import type { TowerRunState } from "./towerTypes";

export interface GameState {
  version: number;
  currencies: CurrencyState;
  heroes: HeroInstance[];
  parties: PartyState[];
  selectedPartyId: PartyId;
  towerRuns: TowerRunState[];
  innRooms: InnRoomState[];
  automation: AutomationState;
  unlockedFloor: TowerFloorId;
  highestFloorCleared: TowerFloorId;
  firstClearFloorIds: TowerFloorId[];
  inventory: InventoryState;
  recentEvents: RecentEvent[];
  lastActiveAt: number;
}
