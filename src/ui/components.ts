import Phaser from "phaser";
import { UI_COLORS, UI_FONT, UI_HEX } from "./theme";

export interface LabelOptions {
  color?: string;
  fontSize?: number;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  width?: number;
}

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  enabled: boolean;
  onClick?: () => void;
  fill?: number;
  stroke?: number;
  textColor?: string;
}

export interface ActorOptions {
  name?: string;
  status?: string;
  hpRatio?: number;
  facing?: "left" | "right";
  palette?: "hero" | "away" | "enemy" | "defeated";
}

export function addLabel(scene: Phaser.Scene, x: number, y: number, text: string, options: LabelOptions = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    align: options.align ?? "left",
    color: options.color ?? UI_HEX.cream,
    fontFamily: UI_FONT,
    fontSize: `${options.fontSize ?? 13}px`,
    fontStyle: options.fontStyle,
    wordWrap: options.width ? { width: options.width } : undefined
  });
}

export function addCenteredLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options: LabelOptions = {}
): Phaser.GameObjects.Text {
  return addLabel(scene, x, y, text, { ...options, align: "center" }).setOrigin(0.5);
}

export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number,
  stroke: number,
  alpha = 1,
  radius = 7
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, alpha);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(2, stroke, 0.9);
  graphics.strokeRoundedRect(x, y, width, height, radius);
  return graphics;
}

export function drawDivider(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, color: number, alpha = 0.65): void {
  scene.add.line(0, 0, x1, y1, x2, y2, color, alpha).setOrigin(0, 0);
}

export function drawActionButton(scene: Phaser.Scene, options: ButtonOptions): Phaser.GameObjects.Zone {
  const fill = options.enabled ? options.fill ?? UI_COLORS.amber : 0x5d5249;
  const stroke = options.enabled ? options.stroke ?? UI_COLORS.gold : 0x8a7a69;
  drawPanel(scene, options.x - options.width / 2, options.y - options.height / 2, options.width, options.height, fill, stroke, 1, 7);

  addCenteredLabel(scene, options.x, options.y, options.label, {
    color: options.textColor ?? (options.enabled ? UI_HEX.dark : UI_HEX.mutedCream),
    fontSize: 14,
    fontStyle: "700",
    width: options.width - 18
  });

  const zone = scene.add.zone(options.x, options.y, options.width, options.height).setOrigin(0.5);
  if (options.enabled && options.onClick) {
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerup", options.onClick);
  }
  return zone;
}

export function drawHpBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  label: string,
  fill: number = UI_COLORS.hearth
): void {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  scene.add.rectangle(x, y, width, height, UI_COLORS.deepInk, 1).setOrigin(0, 0).setStrokeStyle(1, 0x6b5b54, 0.95);
  scene.add.rectangle(x, y, Math.max(2, width * clamped), height, fill, 1).setOrigin(0, 0);
  addLabel(scene, x, y - 16, label, {
    color: UI_HEX.cream,
    fontSize: 11,
    fontStyle: "700",
    width
  });
}

export function drawProgressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  progress: number,
  label: string,
  fill: number = UI_COLORS.skyBlue
): void {
  const clamped = Phaser.Math.Clamp(progress, 0, 1);
  scene.add.rectangle(x, y, width, 10, UI_COLORS.deepInk, 1).setOrigin(0, 0).setStrokeStyle(1, UI_COLORS.towerStone);
  scene.add.rectangle(x, y, width * clamped, 10, fill, 1).setOrigin(0, 0);
  addCenteredLabel(scene, x + width / 2, y + 25, `${label} ${Math.round(clamped * 100)}%`, {
    color: UI_HEX.mutedCream,
    fontSize: 11
  });
}

export function drawStatusBadge(scene: Phaser.Scene, x: number, y: number, label: string, fill: number, color = UI_HEX.cream): void {
  drawPanel(scene, x, y, 92, 24, fill, UI_COLORS.parchment, 0.92, 6);
  addCenteredLabel(scene, x + 46, y + 12, label, {
    color,
    fontSize: 11,
    fontStyle: "700",
    width: 82
  });
}

export function drawTinyHero(scene: Phaser.Scene, x: number, y: number, options: ActorOptions = {}): void {
  const facing = options.facing ?? "right";
  const bodyColor = options.palette === "away" ? UI_COLORS.skyBlue : options.palette === "defeated" ? 0x6b5a58 : 0x4d6fa3;
  const trimColor = options.palette === "defeated" ? 0x9a8b82 : UI_COLORS.gold;
  const swordX = facing === "right" ? x + 22 : x - 22;

  scene.add.ellipse(x, y + 28, 48, 11, UI_COLORS.shadow, 0.25);
  scene.add.rectangle(x, y + 6, 24, 34, bodyColor, 1).setStrokeStyle(1, trimColor);
  scene.add.circle(x, y - 18, 14, 0xffd86f, 1).setStrokeStyle(1, 0x8f5935);
  scene.add.rectangle(x - 14, y - 27, 28, 7, UI_COLORS.darkTimber, 1).setOrigin(0, 0);
  scene.add.rectangle(swordX, y + 4, 5, 27, 0xc9d7df, 1).setStrokeStyle(1, 0x6a7a86);
  scene.add.rectangle(swordX - 5, y + 9, 11, 4, trimColor, 1);

  if (options.palette === "defeated") {
    drawDivider(scene, x - 22, y + 3, x + 22, y + 3, UI_COLORS.danger, 0.8);
  }

  if (options.name) {
    addCenteredLabel(scene, x, y + 49, options.name, {
      color: UI_HEX.cream,
      fontSize: 11,
      fontStyle: "700",
      width: 86
    });
  }

  if (options.status) {
    addCenteredLabel(scene, x, y + 64, options.status, {
      color: UI_HEX.mutedCream,
      fontSize: 10,
      width: 86
    });
  }
}

export function drawTinyEnemy(scene: Phaser.Scene, x: number, y: number, options: ActorOptions = {}): void {
  const defeated = options.palette === "defeated";
  const body = defeated ? 0x59605a : UI_COLORS.moss;
  const eye = defeated ? 0x9a8b82 : UI_COLORS.gold;

  scene.add.ellipse(x, y + 30, 54, 12, UI_COLORS.shadow, 0.32);
  scene.add.circle(x, y, 25, body, 1).setStrokeStyle(2, defeated ? 0x8c8c7e : 0xbff5cc);
  scene.add.circle(x - 8, y - 5, 3, eye, 1);
  scene.add.circle(x + 8, y - 5, 3, eye, 1);
  scene.add.arc(x, y + 7, 11, 0, Math.PI, false, defeated ? 0x9a8b82 : UI_COLORS.deepInk, 1);
  scene.add.rectangle(x - 28, y + 18, 56, 8, defeated ? 0x5d5149 : 0x315b3e, 1).setOrigin(0, 0);

  if (options.name) {
    addCenteredLabel(scene, x, y + 50, options.name, {
      color: UI_HEX.cream,
      fontSize: 11,
      fontStyle: "700",
      width: 96
    });
  }
}

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
