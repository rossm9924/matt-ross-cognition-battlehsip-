import { GRID_SIZE, ROW_LABELS, COL_LABELS } from "./config";
import { Board, ShipInstance, isShipSunk } from "./Board";
import { BattleshipAI } from "./AI";
import { CostTracker } from "./CostTracker";
import { Coord, CellState, coordKey } from "./types";

export class LLMAI {
  private shotSet = new Set<string>();
  private shotHistory: { coord: Coord; hit: boolean; sunkName: string | null }[] = [];
  private fallbackAI: BattleshipAI;
  private costTracker: CostTracker;
  private useFallback = false;

  constructor(
    private apiUrl: string,
    costTracker: CostTracker,
    minShipLength: number = 2,
  ) {
    this.costTracker = costTracker;
    this.fallbackAI = new BattleshipAI(minShipLength);
  }

  async getNextShot(playerBoard: Board): Promise<Coord> {
    if (this.useFallback || this.costTracker.isOverLimit()) {
      return this.fallbackAI.getNextShot();
    }

    try {
      const prompt = this.serializeGameState(playerBoard);
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        console.warn("LLM API error, falling back to fast AI");
        return this.fallbackAI.getNextShot();
      }

      const data = await response.json();

      if (data.usage) {
        this.costTracker.addTokens(
          data.usage.input_tokens ?? 0,
          data.usage.output_tokens ?? 0,
        );
      }

      if (this.costTracker.isOverLimit()) {
        this.useFallback = true;
      }

      const coord = this.parseResponse(data.text ?? "");
      if (coord && !this.shotSet.has(coordKey(coord.row, coord.col))) {
        this.shotSet.add(coordKey(coord.row, coord.col));
        return coord;
      }

      return this.fallbackAI.getNextShot();
    } catch {
      console.warn("LLM request failed, falling back to fast AI");
      return this.fallbackAI.getNextShot();
    }
  }

  recordResult(coord: Coord, hit: boolean, sunkShip: ShipInstance | null): void {
    this.shotHistory.push({
      coord,
      hit,
      sunkName: sunkShip ? sunkShip.config.name : null,
    });
    this.fallbackAI.recordResult(coord, hit, sunkShip);
  }

  get isFallbackActive(): boolean {
    return this.useFallback;
  }

  private serializeGameState(playerBoard: Board): string {
    const lines: string[] = [];
    lines.push("You are playing Battleship on a " + GRID_SIZE + "x" + GRID_SIZE + " grid.");
    lines.push("Rows are labeled " + ROW_LABELS.join(",") + ". Columns are labeled " + COL_LABELS.join(",") + ".");
    lines.push("");
    lines.push("Your shots so far:");

    if (this.shotHistory.length === 0) {
      lines.push("  (none yet)");
    } else {
      for (const s of this.shotHistory) {
        const label = ROW_LABELS[s.coord.row] + COL_LABELS[s.coord.col];
        let result = s.hit ? "HIT" : "MISS";
        if (s.sunkName) result += " (sank " + s.sunkName + ")";
        lines.push("  " + label + ": " + result);
      }
    }

    lines.push("");
    lines.push("Current board knowledge (. = unknown, X = hit, O = miss):");

    const header = "  " + COL_LABELS.map((l) => l.padStart(3)).join("");
    lines.push(header);

    for (let r = 0; r < GRID_SIZE; r++) {
      let row = ROW_LABELS[r] + " ";
      for (let c = 0; c < GRID_SIZE; c++) {
        const state: CellState = playerBoard.grid[r][c];
        let ch = ".";
        if (state === "hit") ch = "X";
        else if (state === "miss") ch = "O";
        row += ch.padStart(3);
      }
      lines.push(row);
    }

    lines.push("");
    lines.push("Remaining ships to find:");
    for (const ship of playerBoard.ships) {
      if (!isShipSunk(ship)) {
        lines.push("  " + ship.config.name + " (length " + ship.config.length + ")");
      }
    }

    lines.push("");
    lines.push("Choose your next shot. Respond with ONLY the coordinate (e.g. A5). Pick a cell marked '.' that you haven't shot yet.");

    return lines.join("\n");
  }

  private parseResponse(text: string): Coord | null {
    const match = text.match(/([A-N])(\d{1,2})/i);
    if (!match) return null;

    const rowChar = match[1].toUpperCase();
    const colNum = parseInt(match[2], 10);

    const row = ROW_LABELS.indexOf(rowChar);
    const col = colNum - 1;

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;

    return { row, col };
  }
}
