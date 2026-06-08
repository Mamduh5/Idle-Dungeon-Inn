import type { SkillId } from "./ids";

export interface SkillDefinition {
  skillId: SkillId;
  name: string;
  description: string;
  cooldownSeconds: number;
  powerMultiplier: number;
}
