import { GRID_SIZE, ShipConfig } from "./config";
import { CellState, Coord, Orientation, coordKey } from "./types";

export interface ShipInstance {
  config: ShipConfig;
  cells: Coord[];
  orientation: Orientation;
  hits: Set<string>;
}

export function isShipSunk(ship: ShipInstance): boolean {
  return ship.hits.size >= ship.config.length;
}

export interface ShotResult {
  coord: Coord;
  hit: boolean;
  sunkShip: ShipInstance | null;
}

export class Board {
  size: number;
  grid: CellState[][];
  ships: ShipInstance[] = [];

  constructor(size: number = GRID_SIZE) {
    this.size = size;
    this.grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, (): CellState => "empty"),
    );
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  canPlace(
    cfg: ShipConfig,
    r: number,
    c: number,
    ori: Orientation,
  ): boolean {
    for (let i = 0; i < cfg.length; i++) {
      const cr = ori === "vertical" ? r + i : r;
      const cc = ori === "horizontal" ? c + i : c;
      if (!this.inBounds(cr, cc)) return false;
      if (this.grid[cr][cc] !== "empty") return false;
    }
    return true;
  }

  place(cfg: ShipConfig, r: number, c: number, ori: Orientation): ShipInstance | null {
    if (!this.canPlace(cfg, r, c, ori)) return null;
    const cells: Coord[] = [];
    for (let i = 0; i < cfg.length; i++) {
      const cr = ori === "vertical" ? r + i : r;
      const cc = ori === "horizontal" ? c + i : c;
      cells.push({ row: cr, col: cc });
      this.grid[cr][cc] = "ship";
    }
    const ship: ShipInstance = { config: cfg, cells, orientation: ori, hits: new Set() };
    this.ships.push(ship);
    return ship;
  }

  remove(ship: ShipInstance): void {
    for (const c of ship.cells) {
      this.grid[c.row][c.col] = "empty";
    }
    this.ships = this.ships.filter((s) => s !== ship);
  }

  clearAll(): void {
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) this.grid[r][c] = "empty";
    this.ships = [];
  }

  placeRandom(fleet: ShipConfig[]): void {
    this.clearAll();
    for (const cfg of fleet) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const ori: Orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
        const maxR = ori === "vertical" ? this.size - cfg.length : this.size - 1;
        const maxC = ori === "horizontal" ? this.size - cfg.length : this.size - 1;
        const r = Math.floor(Math.random() * (maxR + 1));
        const c = Math.floor(Math.random() * (maxC + 1));
        if (this.canPlace(cfg, r, c, ori)) {
          this.place(cfg, r, c, ori);
          placed = true;
        }
      }
    }
  }

  processShot(r: number, c: number): ShotResult {
    const coord = { row: r, col: c };
    if (this.grid[r][c] === "ship") {
      this.grid[r][c] = "hit";
      const key = coordKey(r, c);
      for (const ship of this.ships) {
        if (ship.cells.some((sc) => sc.row === r && sc.col === c)) {
          ship.hits.add(key);
          return { coord, hit: true, sunkShip: isShipSunk(ship) ? ship : null };
        }
      }
      return { coord, hit: true, sunkShip: null };
    }
    this.grid[r][c] = "miss";
    return { coord, hit: false, sunkShip: null };
  }

  isShot(r: number, c: number): boolean {
    return this.grid[r][c] === "hit" || this.grid[r][c] === "miss";
  }

  allSunk(): boolean {
    return this.ships.length > 0 && this.ships.every((s) => isShipSunk(s));
  }
}
