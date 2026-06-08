import type { SkillDefinition } from "../types/skillTypes";

export const skillDefinitions: Record<string, SkillDefinition> = {
  basic_slash: {
    skillId: "basic_slash",
    name: "Basic Slash",
    description: "A simple starter attack placeholder.",
    cooldownSeconds: 4,
    powerMultiplier: 1
  }
};
