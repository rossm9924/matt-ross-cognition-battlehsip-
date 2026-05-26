import { GRID_SIZE } from "./config";
import { ShipInstance } from "./Board";
import { Coord, coordKey } from "./types";

export class BattleshipAI {
  private mode: "hunt" | "target" = "hunt";
  private targetQueue: Coord[] = [];
  private lastHits: Coord[] = [];
  private shotSet = new Set<string>();
  private minLen: number;

  constructor(minShipLength: number = 2) {
    this.minLen = minShipLength;
  }

  getNextShot(): Coord {
    // Target mode: follow up on hits
    while (this.targetQueue.length > 0) {
      const next = this.targetQueue.shift()!;
      const k = coordKey(next.row, next.col);
      if (
        !this.shotSet.has(k) &&
        next.row >= 0 && next.row < GRID_SIZE &&
        next.col >= 0 && next.col < GRID_SIZE
      ) {
        this.shotSet.add(k);
        return next;
      }
    }

    // Hunt mode: parity heuristic
    this.mode = "hunt";
    const candidates: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % this.minLen !== 0) continue;
        const k = coordKey(r, c);
        if (!this.shotSet.has(k)) candidates.push({ row: r, col: c });
      }
    }

    // Fallback: all remaining cells
    if (candidates.length === 0) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const k = coordKey(r, c);
          if (!this.shotSet.has(k)) candidates.push({ row: r, col: c });
        }
      }
    }

    if (candidates.length === 0) {
      return { row: 0, col: 0 };
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.shotSet.add(coordKey(pick.row, pick.col));
    return pick;
  }

  recordResult(coord: Coord, hit: boolean, sunkShip: ShipInstance | null): void {
    if (hit) {
      this.mode = "target";
      this.lastHits.push(coord);

      if (sunkShip) {
        // Remove cells belonging to the sunk ship from the queue/hits
        const sunkKeys = new Set(sunkShip.cells.map((c) => coordKey(c.row, c.col)));
        this.lastHits = this.lastHits.filter((h) => !sunkKeys.has(coordKey(h.row, h.col)));
        this.targetQueue = this.targetQueue.filter(
          (t) => !this.shotSet.has(coordKey(t.row, t.col)),
        );
        if (this.lastHits.length === 0) {
          this.mode = "hunt";
          this.targetQueue = [];
        }
      } else {
        // Queue orthogonal neighbors
        const dirs = [
          { row: -1, col: 0 },
          { row: 1, col: 0 },
          { row: 0, col: -1 },
          { row: 0, col: 1 },
        ];

        // If we have 2+ hits in a line, prioritize the direction
        if (this.lastHits.length >= 2) {
          const prev = this.lastHits[this.lastHits.length - 2];
          const dr = Math.sign(coord.row - prev.row);
          const dc = Math.sign(coord.col - prev.col);
          // Continue in same direction and reverse
          const forward = { row: coord.row + dr, col: coord.col + dc };
          const backward = { row: prev.row - dr, col: prev.col - dc };
          this.targetQueue.unshift(forward, backward);
        } else {
          for (const d of dirs) {
            this.targetQueue.push({ row: coord.row + d.row, col: coord.col + d.col });
          }
        }
      }
    }
  }
}
