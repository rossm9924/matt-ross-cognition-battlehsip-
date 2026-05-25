export type CellState = "empty" | "ship" | "hit" | "miss";

export type Orientation = "horizontal" | "vertical";

export type Difficulty = "easy" | "medium" | "hard";

export type GamePhase = "setup" | "playing" | "gameover";

export interface Coordinate {
  row: number; // 0-9
  col: number; // 0-9
}

export interface Ship {
  name: string;
  length: number;
  cells: Coordinate[];
  orientation: Orientation;
  hitCells: Set<string>; // serialized "row,col"
  isSunk: boolean;
}

export interface ShipPlacement {
  name: string;
  length: number;
  startRow: number;
  startCol: number;
  orientation: Orientation;
}

export const FLEET_CONFIG = [
  { name: "Carrier", length: 5 },
  { name: "Battleship", length: 4 },
  { name: "Destroyer", length: 3 },
  { name: "Submarine", length: 3 },
  { name: "Patrol Boat", length: 2 },
] as const;

export const GRID_SIZE = 10;

export const COLUMN_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export interface ShotResult {
  coordinate: Coordinate;
  result: "hit" | "miss";
  sunkShip?: string; // name of ship if sunk
}

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  playerGrid: CellState[][];
  aiGrid: CellState[][];
  playerShips: Ship[];
  aiShips: Ship[];
  playerShotHistory: CellState[][]; // tracks player's shots on AI grid
  aiShotHistory: CellState[][]; // tracks AI's shots on player grid
  isPlayerTurn: boolean;
  winner: "player" | "ai" | null;
  lastShotResult: ShotResult | null;
  message: string;
}
