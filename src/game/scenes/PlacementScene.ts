import {
  SCENES, FONT, CANVAS_W, CANVAS_H, hex, C,
  GRID_SIZE, ROW_LABELS, COL_LABELS,
  CLASSIC_FLEET, ADVANCED_FLEET, ShipConfig,
} from "../config";
import { Board } from "../Board";
import { Orientation } from "../types";
import { Engine, GameScene } from "../Engine";

const CELL = 38;
const GX = 80;
const GY = 100;

export class PlacementScene implements GameScene {
  private engine!: Engine;
  private board!: Board;
  private fleet!: ShipConfig[];
  private remaining!: ShipConfig[];
  private selected: ShipConfig | null = null;
  private orientation: Orientation = "horizontal";
  private mx = 0;
  private my = 0;
  private msg = "Select a ship to place";
  private allPlaced = false;

  enter(engine: Engine): void {
    this.engine = engine;
    this.fleet = engine.gameMode === "advanced" ? [...ADVANCED_FLEET] : [...CLASSIC_FLEET];
    this.remaining = [...this.fleet];
    this.selected = null;
    this.orientation = "horizontal";
    this.allPlaced = false;
    this.msg = "Select a ship to place";
    this.board = new Board();
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.font = `30px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("STRATEGY PANEL", CANVAS_W / 2, 25);

    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText(`Mode: ${this.engine.gameMode.toUpperCase()}`, CANVAS_W / 2, 55);
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(this.msg, CANVAS_W / 2, 78);

    // Grid
    this.drawGrid(ctx);
    this.drawPlacedShips(ctx);
    this.drawPreview(ctx);
    this.drawPalette(ctx);
    this.drawButtons(ctx);
    this.drawMuteIcon(ctx);
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }

  onMouseDown(x: number, y: number, button: number): void {
    if (button === 2) {
      this.toggleOrientation();
      return;
    }

    // Mute
    if (x > CANVAS_W - 70 && y < 50) {
      this.engine.audio.toggleMute();
      return;
    }

    // Palette click
    const px = GX + GRID_SIZE * CELL + 40;
    const py = GY;
    for (let i = 0; i < this.remaining.length; i++) {
      const iy = py + i * 44;
      if (x >= px && x <= px + 200 && y >= iy && y <= iy + 30) {
        this.selected = this.remaining[i];
        this.msg = `Placing: ${this.selected.name} (${this.selected.length} cells) — R to rotate`;
        return;
      }
    }

    // Shuffle button
    const by = GY + Math.max(this.fleet.length, 7) * 44 + 30;
    if (this.inRect(x, y, px, by, 120, 36)) {
      this.board.placeRandom(this.fleet);
      this.remaining = [];
      this.selected = null;
      this.allPlaced = true;
      this.msg = "Fleet shuffled! Press PLAY to begin.";
      return;
    }

    // Trash button
    if (this.inRect(x, y, px + 140, by, 100, 36)) {
      this.board.clearAll();
      this.remaining = [...this.fleet];
      this.selected = null;
      this.allPlaced = false;
      this.msg = "Grid cleared. Select a ship to place.";
      return;
    }

    // Play button
    if (this.allPlaced && this.inRect(x, y, px, by + 60, 260, 48)) {
      this.engine.audio.sonarPing();
      this.engine.playerBoard = this.board;
      this.engine.switchScene(SCENES.BATTLE);
      return;
    }

    // Grid click
    const cell = this.cellAt(x, y);
    if (!cell) return;

    if (!this.selected) {
      // Pick up existing ship
      const ship = this.board.ships.find((s) =>
        s.cells.some((c) => c.row === cell.row && c.col === cell.col),
      );
      if (ship) {
        this.board.remove(ship);
        this.remaining.push(ship.config);
        this.selected = ship.config;
        this.orientation = ship.orientation;
        this.allPlaced = false;
        this.msg = `Picked up ${ship.config.name}. Click to re-place.`;
      }
      return;
    }

    // Place selected ship
    const result = this.board.place(this.selected, cell.row, cell.col, this.orientation);
    if (!result) return;

    this.remaining = this.remaining.filter((s) => s.id !== this.selected!.id);
    this.selected = null;
    if (this.remaining.length === 0) {
      this.allPlaced = true;
      this.msg = "All ships placed! Press PLAY to begin.";
    } else {
      this.msg = "Select another ship to place.";
    }
  }

  onKeyDown(key: string): void {
    if (key === "r" || key === "R") this.toggleOrientation();
  }

  private toggleOrientation(): void {
    this.orientation = this.orientation === "horizontal" ? "vertical" : "horizontal";
  }

  private cellAt(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - GX) / CELL);
    const row = Math.floor((y - GY) / CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = `rgba(26,138,26,0.5)`;
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_SIZE; r++) {
      ctx.beginPath();
      ctx.moveTo(GX, GY + r * CELL);
      ctx.lineTo(GX + GRID_SIZE * CELL, GY + r * CELL);
      ctx.stroke();
    }
    for (let c = 0; c <= GRID_SIZE; c++) {
      ctx.beginPath();
      ctx.moveTo(GX + c * CELL, GY);
      ctx.lineTo(GX + c * CELL, GY + GRID_SIZE * CELL);
      ctx.stroke();
    }

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let r = 0; r < GRID_SIZE; r++) {
      ctx.fillText(ROW_LABELS[r], GX - 20, GY + r * CELL + CELL / 2);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillText(COL_LABELS[c], GX + c * CELL + CELL / 2, GY + GRID_SIZE * CELL + 16);
    }
  }

  private drawPlacedShips(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(51,255,51,0.65)`;
    for (const ship of this.board.ships) {
      for (const cell of ship.cells) {
        ctx.beginPath();
        ctx.roundRect(GX + cell.col * CELL + 2, GY + cell.row * CELL + 2, CELL - 4, CELL - 4, 3);
        ctx.fill();
      }
    }
  }

  private drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.selected) return;
    const cell = this.cellAt(this.mx, this.my);
    if (!cell) return;
    const canPlace = this.board.canPlace(this.selected, cell.row, cell.col, this.orientation);
    ctx.fillStyle = canPlace ? "rgba(51,255,51,0.3)" : "rgba(255,42,42,0.3)";
    for (let i = 0; i < this.selected.length; i++) {
      const cr = this.orientation === "vertical" ? cell.row + i : cell.row;
      const cc = this.orientation === "horizontal" ? cell.col + i : cell.col;
      if (cr >= 0 && cr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
        ctx.fillRect(GX + cc * CELL + 1, GY + cr * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }

  private drawPalette(ctx: CanvasRenderingContext2D): void {
    const px = GX + GRID_SIZE * CELL + 40;
    const py = GY;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR FLEET", px, py - 20);

    this.remaining.forEach((cfg, i) => {
      const iy = py + i * 44;
      const isSel = this.selected?.id === cfg.id;
      ctx.fillStyle = isSel ? `rgba(51,255,51,0.8)` : `rgba(26,138,26,0.4)`;
      const w = cfg.length * 24;
      ctx.beginPath();
      ctx.roundRect(px, iy, w, 20, 4);
      ctx.fill();

      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = isSel ? hex(C.GREEN) : hex(C.DIM_GREEN);
      ctx.fillText(cfg.name, px + w + 10, iy + 10);
    });

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    const by = GY + Math.max(this.fleet.length, 7) * 44 + 80;
    ctx.fillText(`Orientation: ${this.orientation.toUpperCase()} (R)`, px, by);
  }

  private drawButtons(ctx: CanvasRenderingContext2D): void {
    const px = GX + GRID_SIZE * CELL + 40;
    const by = GY + Math.max(this.fleet.length, 7) * 44 + 30;

    this.drawBtn(ctx, px, by, 120, 36, "SHUFFLE");
    this.drawBtn(ctx, px + 140, by, 100, 36, "TRASH");

    if (this.allPlaced) {
      const hover = this.inRect(this.mx, this.my, px, by + 60, 260, 48);
      ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
      ctx.beginPath();
      ctx.roundRect(px, by + 60, 260, 48, 8);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.font = `22px ${FONT}`;
      ctx.fillText("▶  PLAY", px + 130, by + 84);
    }
  }

  private drawBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string): void {
    const hover = this.inRect(this.mx, this.my, x, y, w, h);
    ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private drawMuteIcon(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#222";
    ctx.fillRect(CANVAS_W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", CANVAS_W - 40, 30);
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
