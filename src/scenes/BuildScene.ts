import Phaser from "phaser";
import { automationDefinitions } from "../data/automationData";
import { roomDefinitions } from "../data/roomData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getInnRoom } from "../state/gameSelectors";
import { clearSavedGameStateForDev, getGameState, updateGameState } from "../state/gameStore";
import { getAutoDispatchControlState, toggleAutoDispatch } from "../systems/automationSystem";
import { getFloor10BossCallout, getFloor10RoomRecommendation } from "../systems/bottleneckCalloutSystem";
import { tickGameState } from "../systems/gameTickSystem";
import {
  calculateBedRoomHealingPerSecondForLevel,
  calculateTrainingRoomXpPerSecondForLevel
} from "../systems/roomJobSystem";
import { getRoomUpgradePreview, purchaseRoomUpgrade, type RoomUpgradePreview } from "../systems/roomUpgradeSystem";
import type { GameState } from "../types/gameState";
import type { RoomId } from "../types/ids";
import type { InnRoomState } from "../types/roomTypes";
import {
  addCenteredLabel,
  addLabel,
  drawDivider,
  drawActionButton,
  drawPanel,
  drawStatusBadge
} from "../ui/components";
import { createSceneHud } from "../ui/sceneHud";
import { UI_COLORS, UI_HEX } from "../ui/theme";

const isDevBuild = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

export class BuildScene extends Phaser.Scene {
  public constructor() {
    super("BuildScene");
  }

  public create(): void {
    const state = getGameState();
    const bedRoom = getInnRoom(state, "bed_room");
    const trainingRoom = getInnRoom(state, "training_room");
    const bedUpgrade = getRoomUpgradePreview(state, "bed_room");
    const trainingUpgrade = getRoomUpgradePreview(state, "training_room");
    const bottleneckCallout = getFloor10BossCallout(state);
    const hasBottleneckCallout = Boolean(bottleneckCallout);

    this.drawBackdrop();
    this.drawPlanTable();
    this.drawBottleneckCallout(state);
    this.drawRoomPlan(48, hasBottleneckCallout ? 284 : 218, "bed_room", bedRoom, bedUpgrade, state);
    this.drawRoomPlan(206, hasBottleneckCallout ? 284 : 218, "training_room", trainingRoom, trainingUpgrade, state);
    this.drawAutomationPanel(state, hasBottleneckCallout ? 514 : 442);
    this.drawFuturePlans(hasBottleneckCallout ? 628 : 572);
    this.drawDevControls();

    createSceneHud(this, { title: "Build", activeLabel: "Build" });
  }

  public update(_time: number, delta: number): void {
    const now = Date.now();
    updateGameState((currentState) => tickGameState(currentState, delta, now));
  }

  private drawBackdrop(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x241916).setOrigin(0, 0);
    this.add.rectangle(0, 104, GAME_WIDTH, 658, 0x3a2a22, 1).setOrigin(0, 0);
    this.add.rectangle(26, 126, 338, 582, 0x4d382b, 1).setOrigin(0, 0).setStrokeStyle(2, UI_COLORS.gold);
    this.add.polygon(GAME_WIDTH / 2, 126, [0, -24, 166, 0, -166, 0], 0x2a1d18, 1).setStrokeStyle(2, UI_COLORS.gold);
    addCenteredLabel(this, GAME_WIDTH / 2, 142, "Inn Plans", {
      color: UI_HEX.gold,
      fontSize: 15,
      fontStyle: "700"
    });
  }

  private drawPlanTable(): void {
    this.add.rectangle(52, 166, 286, 42, 0x2d201b, 1).setOrigin(0, 0).setStrokeStyle(1, 0xb57745);
    this.add.rectangle(70, 160, 94, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    this.add.rectangle(178, 160, 68, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    this.add.rectangle(260, 160, 52, 18, UI_COLORS.parchment, 1).setStrokeStyle(1, 0x7a432d).setOrigin(0, 0);
    addCenteredLabel(this, GAME_WIDTH / 2, 188, "Spend tower coins on room upgrades", {
      color: UI_HEX.mutedCream,
      fontSize: 11,
      width: 250
    });
  }

  private drawBottleneckCallout(state: GameState): void {
    const callout = getFloor10BossCallout(state);
    if (!callout) {
      return;
    }

    drawPanel(this, 48, 216, 294, 60, 0x5a3524, UI_COLORS.gold, 0.98, 7);
    addLabel(this, 62, 224, callout.title, {
      color: UI_HEX.gold,
      fontSize: 11,
      fontStyle: "700",
      width: 120
    });
    addLabel(this, 62, 240, callout.buildMessage, {
      color: UI_HEX.cream,
      fontSize: 9,
      width: 266
    });
    callout.recommendations.forEach((recommendation, index) => {
      addLabel(this, 62, 258 + index * 9, recommendation.buildWhy, {
        color: UI_HEX.skyBlue,
        fontSize: 8,
        fontStyle: "700",
        width: 266
      });
    });
  }

  private drawRoomPlan(
    x: number,
    y: number,
    roomId: RoomId,
    room: InnRoomState | null,
    upgrade: RoomUpgradePreview | null,
    state: GameState
  ): void {
    const definition = roomDefinitions[roomId];
    const title = definition?.name ?? roomId;
    const effect = getRoomEffectLabel(roomId, room);
    const isAvailable = Boolean(room?.isUnlocked);
    const isFloorUnlocked = upgrade?.isFloorUnlocked ?? false;
    const recommendation = getFloor10RoomRecommendation(state, roomId);
    const fill = recommendation ? 0x7a432d : isAvailable ? 0x6f3d28 : 0x3b312c;
    const stroke = recommendation ? UI_COLORS.skyBlue : isAvailable ? UI_COLORS.gold : 0x8a7a69;
    drawPanel(this, x, y, 136, 214, fill, stroke, 0.98, 7);
    addLabel(this, x + 12, y + 14, title, {
      color: isAvailable ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 112
    });
    addLabel(this, x + 12, y + 36, `Lv ${room?.level ?? 0}`, {
      color: recommendation ? UI_HEX.skyBlue : isAvailable ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700"
    });

    if (recommendation) {
      drawStatusBadge(this, x + 22, y + 58, "Recommended", 0x1f4662);
    }

    if (title === "Bed Room") {
      this.add.rectangle(x + 22, y + 88, 78, 42, 0x3a241d, 1).setOrigin(0, 0).setStrokeStyle(2, UI_COLORS.gold);
      this.add.rectangle(x + 28, y + 94, 28, 14, 0xffe2b0, 1).setOrigin(0, 0);
      this.add.rectangle(x + 58, y + 96, 34, 28, UI_COLORS.hearth, 1).setOrigin(0, 0);
    } else {
      this.add.circle(x + 68, y + 102, 28, isAvailable ? UI_COLORS.gold : 0x6d5a49, 1);
      this.add.circle(x + 68, y + 102, 16, 0x3a241d, 1);
      this.add.rectangle(x + 36, y + 140, 64, 10, isAvailable ? 0xb07742 : 0x6d5a49, 1).setOrigin(0, 0);
    }

    drawStatusBadge(
      this,
      x + 14,
      y + 142,
      isAvailable ? "Unlocked" : isFloorUnlocked ? "Locked" : `Floor ${definition?.unlockFloor ?? "?"}`,
      isAvailable ? 0x275241 : 0x4a4038
    );

    if (roomId === "bed_room") {
      addCenteredLabel(this, x + 68, y + 164, "Safer retry pacing", {
        color: UI_HEX.mutedCream,
        fontSize: 9,
        width: 112
      });
    }

    if (!isAvailable) {
      this.add.rectangle(x, y, 136, 140, 0x11100f, 0.24).setOrigin(0, 0);
      drawDivider(this, x + 18, y + 80, x + 118, y + 142, UI_COLORS.mutedCream, 0.35);
    }

    addCenteredLabel(this, x + 68, y + 66, effect.split("_").join(" "), {
      color: isAvailable ? UI_HEX.parchment : UI_HEX.mutedCream,
      fontSize: 10,
      width: 112
    });

    if (upgrade) {
      drawActionButton(this, {
        x: x + 68,
        y: y + 184,
        width: 114,
        height: 36,
        label: upgrade.canPurchase ? upgrade.label : upgrade.reason ?? upgrade.label,
        enabled: upgrade.canPurchase,
        fill: recommendation ? UI_COLORS.skyBlue : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          updateGameState(purchaseRoomUpgrade(roomId));
          this.scene.restart();
        }
      });
    }
  }

  private drawAutomationPanel(state: ReturnType<typeof getGameState>, panelY: number): void {
    const control = getAutoDispatchControlState(state);
    const definition = automationDefinitions.auto_dispatch_board;

    drawPanel(this, 48, panelY, 294, 108, 0x2f241d, control.isUnlocked ? UI_COLORS.gold : 0x8a7a69, 0.98, 7);
    addLabel(this, 66, panelY + 16, definition.name, {
      color: control.isUnlocked ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 178
    });
    drawStatusBadge(
      this,
      246,
      panelY + 12,
      control.statusLabel,
      control.isEnabled ? 0x275241 : control.isUnlocked ? 0x4a4038 : 0x3b312c
    );
    addLabel(this, 66, panelY + 42, "Sends ready party back to tower.", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 174
    });

    if (control.isUnlocked) {
      addLabel(this, 66, panelY + 68, `Status: ${control.statusLabel}`, {
        color: control.isEnabled ? UI_HEX.success : UI_HEX.mutedCream,
        fontSize: 11,
        fontStyle: "700",
        width: 112
      });
      drawActionButton(this, {
        x: 278,
        y: panelY + 76,
        width: 104,
        height: 34,
        label: control.isEnabled ? "Turn OFF" : "Turn ON",
        enabled: true,
        fill: control.isEnabled ? 0x5d5249 : UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          updateGameState(toggleAutoDispatch);
          this.scene.restart();
        }
      });
    } else {
      addCenteredLabel(this, 256, panelY + 76, `Unlocks at Floor ${definition.unlockFloor}`, {
        color: UI_HEX.gold,
        fontSize: 11,
        fontStyle: "700",
        width: 126
      });
    }
  }

  private drawFuturePlans(panelY: number): void {
    drawPanel(this, 48, panelY, 294, 74, 0x2f241d, 0xb57745, 0.98, 7);
    addLabel(this, 66, panelY + 12, "Future Wings", {
      color: UI_HEX.cream,
      fontSize: 13,
      fontStyle: "700"
    });
    addLabel(this, 66, panelY + 34, "Later systems stay visible, but not clickable.", {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 252
    });

    const plans = [
      { label: "Kitchen", status: "future" },
      { label: "Workshop", status: "future" },
      { label: "Guest Beds", status: "future" }
    ];

    plans.forEach((plan, index) => {
      const optionX = 66 + index * 88;
      this.add.rectangle(optionX, panelY + 52, 70, 18, 0x45352b, 1).setStrokeStyle(1, 0x7f6757).setOrigin(0, 0);
      addCenteredLabel(this, optionX + 35, panelY + 61, plan.label, {
        color: UI_HEX.mutedCream,
        fontSize: 9,
        fontStyle: "700",
        width: 60
      });
    });
  }

  private drawDevControls(): void {
    if (!isDevBuild) {
      return;
    }

    drawActionButton(this, {
      x: GAME_WIDTH / 2,
      y: 730,
      width: 142,
      height: 32,
      label: "DEV: Clear Save",
      enabled: true,
      fill: 0x5d5249,
      stroke: UI_COLORS.gold,
      onClick: () => {
        clearSavedGameStateForDev();
        this.scene.start("InnScene");
      }
    });
  }
}

function getRoomEffectLabel(roomId: RoomId, room: InnRoomState | null): string {
  if (roomId === "bed_room") {
    const level = room?.isUnlocked ? room.level : 0;
    return `Healing ${calculateBedRoomHealingPerSecondForLevel(level)} HP/s`;
  }

  if (roomId === "training_room") {
    const level = room?.isUnlocked ? room.level : 0;
    return `Training ${calculateTrainingRoomXpPerSecondForLevel(level)} XP/s`;
  }

  return roomDefinitions[roomId]?.effectType.split("_").join(" ") ?? "unknown";
}
