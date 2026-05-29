import { GRID_SIZE } from "./config";
import { Board, ShipInstance, isShipSunk } from "./Board";
import { Coord, Difficulty, coordKey } from "./types";

interface AIMoveResponse {
  row: number;
  col: number;
  reasoning: string;
  model: string;
  tokensUsed: number;
}

export class LlmAI {
  private shotSet = new Set<string>();
  private difficulty: Difficulty;
  private playerBoard: Board;
  private shotHistory: { row: number; col: number; result: "hit" | "miss" }[] = [];
  lastReasoning = "";
  lastTokensUsed = 0;
  pending = false;

  constructor(playerBoard: Board, difficulty: Difficulty) {
    this.playerBoard = playerBoard;
    this.difficulty = difficulty;
  }

  async getNextShot(): Promise<Coord> {
    this.pending = true;
    try {
      const boardState = this.buildBoardState();
      const response = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState, difficulty: this.difficulty }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: AIMoveResponse = await response.json();
      this.lastReasoning = data.reasoning;
      this.lastTokensUsed = data.tokensUsed;

      const row = Math.max(0, Math.min(GRID_SIZE - 1, data.row));
      const col = Math.max(0, Math.min(GRID_SIZE - 1, data.col));

      if (this.shotSet.has(coordKey(row, col))) {
        return this.getFallbackShot();
      }

      this.shotSet.add(coordKey(row, col));
      return { row, col };
    } catch {
      this.lastReasoning = "API error — using fallback random shot";
      return this.getFallbackShot();
    } finally {
      this.pending = false;
    }
  }

  recordResult(coord: Coord, hit: boolean): void {
    this.shotHistory.push({
      row: coord.row,
      col: coord.col,
      result: hit ? "hit" : "miss",
    });
  }

  private buildBoardState() {
    const grid: string[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: string[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const st = this.playerBoard.grid[r][c];
        if (st === "hit") row.push("hit");
        else if (st === "miss") row.push("miss");
        else row.push("unknown");
      }
      grid.push(row);
    }

    const ships = this.playerBoard.ships.map((s: ShipInstance) => ({
      name: s.config.name,
      length: s.config.length,
      sunk: isShipSunk(s),
      hitCount: s.hits.size,
    }));

    const remainingShips = this.playerBoard.ships
      .filter((s: ShipInstance) => !isShipSunk(s))
      .map((s: ShipInstance) => ({
        name: s.config.name,
        length: s.config.length,
      }));

    return {
      grid,
      ships,
      shotHistory: this.shotHistory,
      remainingShips,
    };
  }

  private getFallbackShot(): Coord {
    const candidates: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!this.shotSet.has(coordKey(r, c))) {
          candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length === 0) return { row: 0, col: 0 };
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.shotSet.add(coordKey(pick.row, pick.col));
    return pick;
  }
}
