export const GRID_SIZE = 10;
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

export const ROW_LABELS = "ABCDEFGHIJ".split("");
export const COL_LABELS = Array.from({ length: 10 }, (_, i) => String(i + 1));

export interface ShipConfig {
  name: string;
  length: number;
  id: string;
}

export const CLASSIC_FLEET: ShipConfig[] = [
  { name: "Carrier", length: 5, id: "carrier" },
  { name: "Battleship", length: 4, id: "battleship" },
  { name: "Cruiser", length: 3, id: "cruiser" },
  { name: "Submarine", length: 3, id: "submarine" },
  { name: "Destroyer", length: 2, id: "destroyer" },
];

export const ADVANCED_FLEET: ShipConfig[] = [
  { name: "Carrier", length: 5, id: "carrier" },
  { name: "Battleship", length: 4, id: "battleship" },
  { name: "Cruiser", length: 3, id: "cruiser" },
  { name: "Submarine", length: 3, id: "submarine" },
  { name: "Destroyer", length: 2, id: "destroyer" },
  { name: "Frigate", length: 3, id: "frigate" },
  { name: "Patrol Boat", length: 2, id: "patrol" },
];

export type Difficulty = "easy" | "normal" | "hard";

export function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

export const C = {
  BG: 0x000000,
  GREEN: 0x33ff33,
  DIM_GREEN: 0x1a8a1a,
  DARK_GREEN: 0x0d440d,
  HIT_RED: 0xff2a2a,
  MISS_WHITE: 0xcccccc,
  OCEAN: 0x2a6fb2,
  DEEP_OCEAN: 0x1a4f82,
  FOAM: 0xddeeff,
  ROCK: 0x667766,
  SHIP_GRAY: 0x778899,
  FLAME: 0xff6600,
  SMOKE: 0x444444,
  WHITE: 0xffffff,
  PANEL_BG: 0x111111,
  SUNK_OVERLAY: 0x661111,
};

export const SCORE_HIT = 15;
export const SCORE_SINK = 50;

export const FONT = '"Black Ops One", sans-serif';

export const SCENES = {
  TITLE: "title",
  MODE: "mode",
  PLACEMENT: "placement",
  BATTLE: "battle",
  GAMEOVER: "gameover",
};
