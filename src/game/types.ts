export const BOARD_SIZE = 10;
export const COLUMN_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

export type ShipName =
  | "Carrier"
  | "Battleship"
  | "Destroyer"
  | "Submarine"
  | "Patrol Boat";

export interface ShipSpec {
  name: ShipName;
  length: number;
}

export const FLEET_SPEC: ReadonlyArray<ShipSpec> = [
  { name: "Carrier", length: 5 },
  { name: "Battleship", length: 4 },
  { name: "Destroyer", length: 3 },
  { name: "Submarine", length: 3 },
  { name: "Patrol Boat", length: 2 },
];

export type Orientation = "horizontal" | "vertical";

export interface Coord {
  row: number;
  col: number;
}

export interface Ship {
  name: ShipName;
  length: number;
  cells: Coord[];
  hits: boolean[];
}

export type CellState = "empty" | "ship" | "hit" | "miss";

export type Owner = "player" | "ai";

export type Difficulty = "easy" | "medium" | "hard";

export type GamePhase = "menu" | "placement" | "playing" | "ended";

export interface ShotRecord {
  coord: Coord;
  result: "hit" | "miss";
  sunkShip?: ShipName;
}

export interface Fleet {
  ships: Ship[];
  shotsReceived: ShotRecord[];
}

export interface PlayerState {
  fleet: Fleet;
  shotsTaken: ShotRecord[];
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  player: PlayerState;
  ai: PlayerState;
  turn: Owner;
  winner: Owner | null;
  message: string;
}

export function coordKey(c: Coord): string {
  return `${c.row}-${c.col}`;
}

export function coordLabel(c: Coord): string {
  return `${COLUMN_LABELS[c.col]}${c.row + 1}`;
}

export function inBounds(c: Coord): boolean {
  return c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE;
}
