import { GRID_SIZE } from "./config";
import { ShipInstance } from "./Board";
import { Coord, Difficulty, coordKey } from "./types";

export class BattleshipAI {
  private mode: "hunt" | "target" = "hunt";
  private targetQueue: Coord[] = [];
  private lastHits: Coord[] = [];
  private shotSet = new Set<string>();
  private minLen: number;
  private difficulty: Difficulty;

  constructor(minShipLength: number = 2, difficulty: Difficulty = "normal") {
    this.minLen = minShipLength;
    this.difficulty = difficulty;
  }

  getNextShot(): Coord {
    if (this.difficulty === "easy") {
      return this.getRandomShot();
    }

    // Target mode: follow up on hits (normal + hard)
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

    // Hunt mode
    this.mode = "hunt";

    if (this.difficulty === "hard") {
      return this.getParityShot();
    }

    // Normal: parity with some randomness
    return this.getParityShot();
  }

  private getRandomShot(): Coord {
    const candidates: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const k = coordKey(r, c);
        if (!this.shotSet.has(k)) candidates.push({ row: r, col: c });
      }
    }
    if (candidates.length === 0) return { row: 0, col: 0 };
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.shotSet.add(coordKey(pick.row, pick.col));
    return pick;
  }

  private getParityShot(): Coord {
    const candidates: Coord[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % this.minLen !== 0) continue;
        const k = coordKey(r, c);
        if (!this.shotSet.has(k)) candidates.push({ row: r, col: c });
      }
    }

    if (candidates.length === 0) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const k = coordKey(r, c);
          if (!this.shotSet.has(k)) candidates.push({ row: r, col: c });
        }
      }
    }

    if (candidates.length === 0) return { row: 0, col: 0 };

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.shotSet.add(coordKey(pick.row, pick.col));
    return pick;
  }

  recordResult(coord: Coord, hit: boolean, sunkShip: ShipInstance | null): void {
    if (this.difficulty === "easy" && !hit) return;

    if (hit) {
      this.mode = "target";
      this.lastHits.push(coord);

      if (sunkShip) {
        const sunkKeys = new Set(sunkShip.cells.map((c) => coordKey(c.row, c.col)));
        this.lastHits = this.lastHits.filter((h) => !sunkKeys.has(coordKey(h.row, h.col)));
        this.targetQueue = this.targetQueue.filter(
          (t) => !this.shotSet.has(coordKey(t.row, t.col)),
        );
        if (this.lastHits.length === 0) {
          this.mode = "hunt";
          this.targetQueue = [];
        }
      } else if (this.difficulty !== "easy") {
        const dirs = [
          { row: -1, col: 0 },
          { row: 1, col: 0 },
          { row: 0, col: -1 },
          { row: 0, col: 1 },
        ];

        if (this.lastHits.length >= 2) {
          const prev = this.lastHits[this.lastHits.length - 2];
          const dr = Math.sign(coord.row - prev.row);
          const dc = Math.sign(coord.col - prev.col);
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
