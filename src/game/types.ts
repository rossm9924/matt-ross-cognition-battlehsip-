export type CellState = "empty" | "ship" | "hit" | "miss";
export type Orientation = "horizontal" | "vertical";
export type GameMode = "classic" | "advanced";
export type AIMode = "fast" | "llm";

export interface Coord {
  row: number;
  col: number;
}

export function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}
