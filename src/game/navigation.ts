export const NAV_ITEMS = [
  { label: "Inn", sceneKey: "InnScene" },
  { label: "Tower", sceneKey: "TowerScene" },
  { label: "Heroes", sceneKey: "HeroesScene" },
  { label: "Build", sceneKey: "BuildScene" }
] as const;

export type NavLabel = (typeof NAV_ITEMS)[number]["label"];
export type SceneKey = (typeof NAV_ITEMS)[number]["sceneKey"];
