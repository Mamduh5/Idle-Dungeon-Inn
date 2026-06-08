import Phaser from "phaser";
import { roomDefinitions } from "../data/roomData";
import { GAME_HEIGHT, GAME_WIDTH } from "../game/screen";
import { getInnRoom } from "../state/gameSelectors";
import { getGameState, updateGameState } from "../state/gameStore";
import { getRoomUpgradePreview, purchaseRoomUpgrade, type RoomUpgradePreview } from "../systems/roomUpgradeSystem";
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

    this.drawBackdrop();
    this.drawPlanTable();
    this.drawRoomPlan(48, 218, "bed_room", bedRoom, bedUpgrade);
    this.drawRoomPlan(206, 218, "training_room", trainingRoom, trainingUpgrade);
    this.drawFuturePlans();

    createSceneHud(this, { title: "Build", activeLabel: "Build" });
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

  private drawRoomPlan(
    x: number,
    y: number,
    roomId: RoomId,
    room: InnRoomState | null,
    upgrade: RoomUpgradePreview | null
  ): void {
    const definition = roomDefinitions[roomId];
    const title = definition?.name ?? roomId;
    const effect = definition?.effectType ?? "unknown";
    const isAvailable = Boolean(room?.isUnlocked);
    const isFloorUnlocked = upgrade?.isFloorUnlocked ?? false;
    const fill = isAvailable ? 0x6f3d28 : 0x3b312c;
    const stroke = isAvailable ? UI_COLORS.gold : 0x8a7a69;
    drawPanel(this, x, y, 136, 214, fill, stroke, 0.98, 7);
    addLabel(this, x + 12, y + 14, title, {
      color: isAvailable ? UI_HEX.cream : UI_HEX.mutedCream,
      fontSize: 14,
      fontStyle: "700",
      width: 112
    });
    addLabel(this, x + 12, y + 36, `Lv ${room?.level ?? 0}`, {
      color: isAvailable ? UI_HEX.gold : UI_HEX.mutedCream,
      fontSize: 12,
      fontStyle: "700"
    });

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
        fill: UI_COLORS.amber,
        stroke: UI_COLORS.gold,
        onClick: () => {
          updateGameState(purchaseRoomUpgrade(roomId));
          this.scene.restart();
        }
      });
    }
  }

  private drawFuturePlans(): void {
    drawPanel(this, 48, 442, 294, 146, 0x2f241d, 0xb57745, 0.98, 7);
    addLabel(this, 66, 460, "Future Wings", {
      color: UI_HEX.cream,
      fontSize: 14,
      fontStyle: "700"
    });
    addLabel(this, 66, 484, "Planned spaces stay visible, but no unavailable system is clickable.", {
      color: UI_HEX.mutedCream,
      fontSize: 12,
      width: 252
    });

    const plans = [
      { label: "Kitchen", status: "future" },
      { label: "Workshop", status: "future" },
      { label: "Guest Beds", status: "future" }
    ];

    plans.forEach((plan, index) => {
      const x = 66 + index * 88;
      this.add.rectangle(x, 530, 70, 42, 0x45352b, 1).setStrokeStyle(1, 0x7f6757).setOrigin(0, 0);
      addCenteredLabel(this, x + 35, 544, plan.label, {
        color: UI_HEX.mutedCream,
        fontSize: 10,
        fontStyle: "700",
        width: 60
      });
      addCenteredLabel(this, x + 35, 564, plan.status, {
        color: UI_HEX.gold,
        fontSize: 9
      });
    });

    addCenteredLabel(this, GAME_WIDTH / 2, 640, "More rooms will become purchasable as systems come online.", {
      color: UI_HEX.mutedCream,
      fontSize: 11,
      width: 272
    });
  }
}
