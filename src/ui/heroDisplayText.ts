import { getHeroMaxHp } from "../systems/roomJobSystem";
import type { HeroInstance } from "../types/heroTypes";

export interface HeroHpDisplayText {
  currentHp: number;
  maxHp: number;
  ratio: number;
  label: string;
}

export function getHeroHpDisplayText(hero: HeroInstance): HeroHpDisplayText {
  const maxHp = getFiniteDisplayNumber(getHeroMaxHp(hero), 1);
  const currentHp = clampDisplayNumber(hero.currentHp, 0, maxHp);

  return {
    currentHp,
    maxHp,
    ratio: currentHp / maxHp,
    label: `HP ${formatDisplayNumber(currentHp)}/${formatDisplayNumber(maxHp)}`
  };
}

export function formatDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.max(0, value);
  if (normalized >= 1_000_000) {
    return `${Math.floor(normalized / 1_000_000)}M`;
  }

  if (normalized >= 10_000) {
    return `${Math.floor(normalized / 1_000)}K`;
  }

  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
}

function getFiniteDisplayNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clampDisplayNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
