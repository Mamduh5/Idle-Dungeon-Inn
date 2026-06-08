import type { AutomationDefinition } from "../types/automationTypes";
import type { AutomationId } from "../types/ids";

export const automationDefinitions: Record<AutomationId, AutomationDefinition> = {
  auto_dispatch_board: {
    automationId: "auto_dispatch_board",
    name: "Auto-Dispatch Board",
    description: "Placeholder automation for sending ready parties back to the tower.",
    unlockFloor: 1,
    maxLevel: 5
  }
};
