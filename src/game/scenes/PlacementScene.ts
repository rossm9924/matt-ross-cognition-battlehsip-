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

// Mobile portrait layout: larger grid, fleet below
const M_CELL = 50;
const M_GRID_PX = GRID_SIZE * M_CELL; // 500px
const M_GX = (CANVAS_W - M_GRID_PX) / 2; // 390 centered
const M_GY = 70;

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
  private pickedOrigin: { row: number; col: number } | null = null;

  enter(engine: Engine): void {
    this.engine = engine;
    this.fleet = engine.gameMode === "advanced" ? [...ADVANCED_FLEET] : [...CLASSIC_FLEET];
    this.remaining = [...this.fleet];
    this.selected = null;
    this.orientation = "horizontal";
    this.allPlaced = false;
    this.msg = "Select a ship to place";
    this.pickedOrigin = null;
    this.board = new Board();
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.renderTopBar(ctx);

    if (this.engine.portrait) {
      this.renderMobile(ctx);
    } else {
      this.renderDesktop(ctx);
    }
  }

  private renderDesktop(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.font = `30px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("STRATEGY PANEL", CANVAS_W / 2, 55);

    const gridCenterX = GX + (GRID_SIZE * CELL) / 2;
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText(`Mode: ${this.engine.gameMode.toUpperCase()} | Difficulty: ${this.engine.difficulty.toUpperCase()}`, gridCenterX, 78);
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(this.msg, gridCenterX, 94);

    // Grid
    this.drawGrid(ctx);
    this.drawPlacedShips(ctx);
    this.drawPreview(ctx);
    this.drawPalette(ctx);
    this.drawButtons(ctx);
  }

  private renderMobile(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Status message at top
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(this.msg, CANVAS_W / 2, 52);

    // Large grid
    this.drawMobileGrid(ctx);
    this.drawMobilePlacedShips(ctx);
    this.drawMobilePreview(ctx);

    // Fleet and buttons below grid
    this.drawMobileControls(ctx);
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

    // Top bar interactions
    if (y < 36) {
      // Mute
      if (x > CANVAS_W - 60) {
        this.engine.audio.toggleMute();
        return;
      }
      // Quit
      if (x >= CANVAS_W / 2 - 40 && x <= CANVAS_W / 2 + 40) {
        this.engine.switchScene(SCENES.TITLE);
        return;
      }
      return;
    }

    if (this.engine.portrait) {
      this.onMobileClick(x, y);
      return;
    }

    // Palette click
    const px = GX + GRID_SIZE * CELL + 40;
    const py = GY;
    for (let i = 0; i < this.fleet.length; i++) {
      const iy = py + i * 36;
      const cfg = this.fleet[i];
      const isPlaced = !this.remaining.find((r) => r.id === cfg.id);
      if (x >= px && x <= px + 200 && y >= iy && y <= iy + 26) {
        if (isPlaced) {
          // Select placed ship in-place (keep visible)
          const ship = this.board.ships.find((s) => s.config.id === cfg.id);
          if (ship) {
            const origin = ship.cells[0];
            this.board.remove(ship);
            this.remaining.push(ship.config);
            this.selected = ship.config;
            this.orientation = ship.orientation;
            this.pickedOrigin = { row: origin.row, col: origin.col };
            this.allPlaced = false;
            this.board.place(ship.config, origin.row, origin.col, ship.orientation);
            this.msg = `Selected ${ship.config.name}. Rotate or click to re-place.`;
          }
        } else {
          this.selected = cfg;
          this.pickedOrigin = null;
          this.msg = `Placing: ${cfg.name} (${cfg.length} cells) — R to rotate`;
        }
        return;
      }
    }

    // Shuffle button
    const by = GY + Math.max(this.fleet.length, 5) * 36 + 16;
    if (this.inRect(x, y, px, by, 120, 36)) {
      this.doShuffle();
      return;
    }

    // Trash button
    if (this.inRect(x, y, px + 140, by, 100, 36)) {
      this.doTrash();
      return;
    }

    // Rotate button
    const rotateBtnY = by + 50;
    if (this.inRect(x, y, px, rotateBtnY, 260, 36)) {
      this.toggleOrientation();
      return;
    }

    // Play button (below rotate button)
    const playBtnY = rotateBtnY + 50;
    if (this.allPlaced && this.inRect(x, y, px, playBtnY, 260, 48)) {
      this.doPlay();
      return;
    }

    // Grid click
    const cell = this.cellAt(x, y);
    if (!cell) return;

    if (!this.selected) {
      // Select existing ship in-place (don't remove yet)
      const ship = this.board.ships.find((s) =>
        s.cells.some((c) => c.row === cell.row && c.col === cell.col),
      );
      if (ship) {
        const origin = ship.cells[0];
        this.board.remove(ship);
        this.remaining.push(ship.config);
        this.selected = ship.config;
        this.orientation = ship.orientation;
        this.pickedOrigin = { row: origin.row, col: origin.col };
        this.allPlaced = false;
        this.board.place(ship.config, origin.row, origin.col, ship.orientation);
        this.msg = `Selected ${ship.config.name}. Rotate or click to re-place.`;
      }
      return;
    }

    // Remove from old position if we're moving a picked-up ship
    if (this.pickedOrigin) {
      const oldShip = this.board.ships.find((s) => s.config.id === this.selected!.id);
      if (oldShip) this.board.remove(oldShip);
    }

    // Place selected ship
    const result = this.board.place(this.selected, cell.row, cell.col, this.orientation);
    if (!result) {
      // Re-place at origin if move failed
      if (this.pickedOrigin) {
        this.board.place(this.selected, this.pickedOrigin.row, this.pickedOrigin.col, this.orientation);
      }
      return;
    }

    this.pickedOrigin = null;
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
    if (key === "Escape") {
      this.selected = null;
      this.msg = "Selection cancelled. Select a ship to place.";
    }
  }

  private toggleOrientation(): void {
    const newOri: Orientation = this.orientation === "horizontal" ? "vertical" : "horizontal";

    // If a ship is selected and placed on the board, rotate it in-place
    if (this.selected && this.pickedOrigin) {
      const oldShip = this.board.ships.find((s) => s.config.id === this.selected!.id);
      if (oldShip) {
        this.board.remove(oldShip);
        if (this.board.canPlace(this.selected, this.pickedOrigin.row, this.pickedOrigin.col, newOri)) {
          this.board.place(this.selected, this.pickedOrigin.row, this.pickedOrigin.col, newOri);
          this.orientation = newOri;
        } else {
          this.board.place(this.selected, this.pickedOrigin.row, this.pickedOrigin.col, this.orientation);
          this.msg = `Can't rotate ${this.selected.name} here — not enough room.`;
          return;
        }
      } else {
        this.orientation = newOri;
      }
    } else {
      this.orientation = newOri;
    }
  }

  private cellAt(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - GX) / CELL);
    const row = Math.floor((y - GY) / CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(17,17,17,0.9)";
    ctx.fillRect(0, 0, CANVAS_W, 36);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Help
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("?", 20, 18);

    // Quit
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("QUIT", CANVAS_W / 2, 18);

    // Mute
    ctx.font = "16px sans-serif";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", CANVAS_W - 30, 18);

    // Mute label on hover
    if (this.mx > CANVAS_W - 60 && this.my < 36) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(CANVAS_W - 90, 38, 60, 20);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.fillText("SOUND", CANVAS_W - 60, 48);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgba(26,138,26,0.5)";
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
    ctx.fillStyle = "rgba(51,255,51,0.65)";
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

    // Ship name label near preview
    ctx.textAlign = "center";
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = canPlace ? hex(C.GREEN) : hex(C.HIT_RED);
    const labelRow = this.orientation === "vertical" ? cell.row + this.selected.length : cell.row + 1;
    const labelCol = this.orientation === "horizontal" ? cell.col + Math.floor(this.selected.length / 2) : cell.col;
    if (labelRow < GRID_SIZE + 2 && labelCol < GRID_SIZE) {
      ctx.fillText(
        this.selected.name,
        GX + labelCol * CELL + CELL / 2,
        GY + Math.min(labelRow, GRID_SIZE) * CELL + CELL / 2 + 2,
      );
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

    // Show ALL ships with placed/unplaced status (#8)
    this.fleet.forEach((cfg, i) => {
      const iy = py + i * 36;
      const isRemaining = this.remaining.some((r) => r.id === cfg.id);
      const isSel = this.selected?.id === cfg.id;
      const isPlaced = !isRemaining && !isSel;

      // Ship bar
      const w = cfg.length * 24;
      if (isPlaced) {
        ctx.fillStyle = "rgba(26,138,26,0.3)";
      } else if (isSel) {
        ctx.fillStyle = "rgba(51,255,51,0.8)";
      } else {
        ctx.fillStyle = "rgba(26,138,26,0.5)";
      }
      ctx.beginPath();
      ctx.roundRect(px, iy, w, 20, 4);
      ctx.fill();

      // Label
      ctx.font = `11px ${FONT}`;
      if (isPlaced) {
        ctx.fillStyle = hex(C.DIM_GREEN);
        ctx.fillText(`✓ ${cfg.name}`, px + w + 8, iy + 10);
      } else if (isSel) {
        ctx.fillStyle = hex(C.GREEN);
        ctx.fillText(`▶ ${cfg.name}`, px + w + 8, iy + 10);
      } else {
        ctx.fillStyle = hex(C.GREEN);
        ctx.fillText(cfg.name, px + w + 8, iy + 10);
      }
    });
  }

  private drawButtons(ctx: CanvasRenderingContext2D): void {
    const px = GX + GRID_SIZE * CELL + 40;
    const by = GY + Math.max(this.fleet.length, 5) * 36 + 16;

    this.drawBtn(ctx, px, by, 120, 36, "SHUFFLE");
    this.drawBtn(ctx, px + 140, by, 100, 36, "TRASH");

    const rotateBtnY = by + 50;
    this.drawRotateBtn(ctx, px, rotateBtnY);

    const playBtnY = rotateBtnY + 50;
    if (this.allPlaced) {
      const hover = this.inRect(this.mx, this.my, px, playBtnY, 260, 48);
      ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
      ctx.beginPath();
      ctx.roundRect(px, playBtnY, 260, 48, 8);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.font = `22px ${FONT}`;
      ctx.fillText("▶  PLAY", px + 130, playBtnY + 24);
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

  private drawRotateBtn(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const hover = this.inRect(this.mx, this.my, x, y, 260, 36);
    ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.beginPath();
    ctx.roundRect(x, y, 260, 36, 6);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`↻  ${this.orientation.toUpperCase()}  (R to rotate)`, x + 130, y + 18);
  }

  /* ============ SHARED ACTIONS ============ */

  private doShuffle(): void {
    this.board.placeRandom(this.fleet);
    this.remaining = [];
    this.selected = null;
    this.pickedOrigin = null;
    this.allPlaced = true;
    this.msg = "Fleet shuffled! Tap PLAY to begin.";
  }

  private doTrash(): void {
    this.board.clearAll();
    this.remaining = [...this.fleet];
    this.selected = null;
    this.pickedOrigin = null;
    this.allPlaced = false;
    this.msg = "Grid cleared. Tap a ship to place.";
  }

  private doPlay(): void {
    this.engine.audio.sonarPing();
    this.engine.playerBoard = this.board;
    this.engine.switchScene(SCENES.BATTLE);
  }

  private selectShipById(cfg: ShipConfig): void {
    const isPlaced = !this.remaining.find((r) => r.id === cfg.id);
    if (isPlaced) {
      const ship = this.board.ships.find((s) => s.config.id === cfg.id);
      if (ship) {
        const origin = ship.cells[0];
        this.board.remove(ship);
        this.remaining.push(ship.config);
        this.selected = ship.config;
        this.orientation = ship.orientation;
        this.pickedOrigin = { row: origin.row, col: origin.col };
        this.allPlaced = false;
        this.board.place(ship.config, origin.row, origin.col, ship.orientation);
        this.msg = `Selected ${ship.config.name}. Rotate or tap to re-place.`;
      }
    } else {
      this.selected = cfg;
      this.pickedOrigin = null;
      this.msg = `Placing: ${cfg.name} (${cfg.length} cells)`;
    }
  }

  private handleGridClick(cell: { row: number; col: number }): void {
    if (!this.selected) {
      const ship = this.board.ships.find((s) =>
        s.cells.some((c) => c.row === cell.row && c.col === cell.col),
      );
      if (ship) {
        const origin = ship.cells[0];
        this.board.remove(ship);
        this.remaining.push(ship.config);
        this.selected = ship.config;
        this.orientation = ship.orientation;
        this.pickedOrigin = { row: origin.row, col: origin.col };
        this.allPlaced = false;
        this.board.place(ship.config, origin.row, origin.col, ship.orientation);
        this.msg = `Selected ${ship.config.name}. Rotate or tap to re-place.`;
      }
      return;
    }

    if (this.pickedOrigin) {
      const oldShip = this.board.ships.find((s) => s.config.id === this.selected!.id);
      if (oldShip) this.board.remove(oldShip);
    }

    const result = this.board.place(this.selected, cell.row, cell.col, this.orientation);
    if (!result) {
      if (this.pickedOrigin) {
        this.board.place(this.selected, this.pickedOrigin.row, this.pickedOrigin.col, this.orientation);
      }
      return;
    }

    this.pickedOrigin = null;
    this.remaining = this.remaining.filter((s) => s.id !== this.selected!.id);
    this.selected = null;
    if (this.remaining.length === 0) {
      this.allPlaced = true;
      this.msg = "All ships placed! Tap PLAY to begin.";
    } else {
      this.msg = "Tap another ship to place.";
    }
  }

  /* ============ MOBILE ============ */

  private mobileCellAt(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - M_GX) / M_CELL);
    const row = Math.floor((y - M_GY) / M_CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  private onMobileClick(x: number, y: number): void {
    const controlsY = M_GY + M_GRID_PX + 24;
    const btnW = 180;
    const btnH = 44;
    const gap = 16;
    const cx = CANVAS_W / 2;

    // Row 1: SHUFFLE and TRASH
    const row1Y = controlsY + 24;
    if (this.inRect(x, y, cx - btnW - gap / 2, row1Y, btnW, btnH)) {
      this.doShuffle();
      return;
    }
    if (this.inRect(x, y, cx + gap / 2, row1Y, btnW, btnH)) {
      this.doTrash();
      return;
    }

    // Row 2: ROTATE
    const row2Y = row1Y + btnH + gap;
    if (this.inRect(x, y, cx - btnW - gap / 2, row2Y, btnW * 2 + gap, btnH)) {
      this.toggleOrientation();
      return;
    }

    // Row 3: PLAY (if all placed)
    const row3Y = row2Y + btnH + gap;
    if (this.allPlaced && this.inRect(x, y, cx - btnW - gap / 2, row3Y, btnW * 2 + gap, 52)) {
      this.doPlay();
      return;
    }

    // Fleet ships in a horizontal row below buttons
    const fleetY = row3Y + 60;
    const totalFleetW = this.fleet.length * 130;
    let fx = (CANVAS_W - totalFleetW) / 2;
    for (const cfg of this.fleet) {
      if (this.inRect(x, y, fx, fleetY, 120, 30)) {
        this.selectShipById(cfg);
        return;
      }
      fx += 130;
    }

    // Grid click
    const cell = this.mobileCellAt(x, y);
    if (cell) {
      this.handleGridClick(cell);
    }
  }

  private drawMobileGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgba(26,138,26,0.5)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_SIZE; r++) {
      ctx.beginPath();
      ctx.moveTo(M_GX, M_GY + r * M_CELL);
      ctx.lineTo(M_GX + M_GRID_PX, M_GY + r * M_CELL);
      ctx.stroke();
    }
    for (let c = 0; c <= GRID_SIZE; c++) {
      ctx.beginPath();
      ctx.moveTo(M_GX + c * M_CELL, M_GY);
      ctx.lineTo(M_GX + c * M_CELL, M_GY + M_GRID_PX);
      ctx.stroke();
    }

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let r = 0; r < GRID_SIZE; r++) {
      ctx.fillText(ROW_LABELS[r], M_GX - 20, M_GY + r * M_CELL + M_CELL / 2);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillText(COL_LABELS[c], M_GX + c * M_CELL + M_CELL / 2, M_GY + M_GRID_PX + 16);
    }
  }

  private drawMobilePlacedShips(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(51,255,51,0.65)";
    for (const ship of this.board.ships) {
      for (const cell of ship.cells) {
        ctx.beginPath();
        ctx.roundRect(M_GX + cell.col * M_CELL + 3, M_GY + cell.row * M_CELL + 3, M_CELL - 6, M_CELL - 6, 4);
        ctx.fill();
      }
    }
  }

  private drawMobilePreview(ctx: CanvasRenderingContext2D): void {
    if (!this.selected) return;
    const cell = this.mobileCellAt(this.mx, this.my);
    if (!cell) return;
    const canPlace = this.board.canPlace(this.selected, cell.row, cell.col, this.orientation);
    ctx.fillStyle = canPlace ? "rgba(51,255,51,0.3)" : "rgba(255,42,42,0.3)";
    for (let i = 0; i < this.selected.length; i++) {
      const cr = this.orientation === "vertical" ? cell.row + i : cell.row;
      const cc = this.orientation === "horizontal" ? cell.col + i : cell.col;
      if (cr >= 0 && cr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
        ctx.fillRect(M_GX + cc * M_CELL + 1, M_GY + cr * M_CELL + 1, M_CELL - 2, M_CELL - 2);
      }
    }
  }

  private drawMobileControls(ctx: CanvasRenderingContext2D): void {
    const controlsY = M_GY + M_GRID_PX + 24;
    const btnW = 180;
    const btnH = 44;
    const gap = 16;
    const cx = CANVAS_W / 2;

    // Row 1: SHUFFLE and TRASH
    const row1Y = controlsY + 24;
    this.drawMobileBtn(ctx, cx - btnW - gap / 2, row1Y, btnW, btnH, "SHUFFLE");
    this.drawMobileBtn(ctx, cx + gap / 2, row1Y, btnW, btnH, "TRASH");

    // Row 2: ROTATE
    const row2Y = row1Y + btnH + gap;
    const rotateHover = this.inRect(this.mx, this.my, cx - btnW - gap / 2, row2Y, btnW * 2 + gap, btnH);
    ctx.fillStyle = rotateHover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.beginPath();
    ctx.roundRect(cx - btnW - gap / 2, row2Y, btnW * 2 + gap, btnH, 8);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`↻  ${this.orientation.toUpperCase()}`, cx, row2Y + btnH / 2);

    // Row 3: PLAY (if all placed)
    const row3Y = row2Y + btnH + gap;
    if (this.allPlaced) {
      const playHover = this.inRect(this.mx, this.my, cx - btnW - gap / 2, row3Y, btnW * 2 + gap, 52);
      ctx.fillStyle = playHover ? hex(C.GREEN) : hex(C.DIM_GREEN);
      ctx.beginPath();
      ctx.roundRect(cx - btnW - gap / 2, row3Y, btnW * 2 + gap, 52, 8);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = `22px ${FONT}`;
      ctx.fillText("▶  PLAY", cx, row3Y + 26);
    }

    // Fleet indicators in a horizontal row
    const fleetY = row3Y + 60;
    const totalFleetW = this.fleet.length * 130;
    let fx = (CANVAS_W - totalFleetW) / 2;
    ctx.textAlign = "center";
    this.fleet.forEach((cfg) => {
      const isRemaining = this.remaining.some((r) => r.id === cfg.id);
      const isSel = this.selected?.id === cfg.id;
      const isPlaced = !isRemaining && !isSel;

      ctx.fillStyle = isSel ? "rgba(51,255,51,0.8)" : (isPlaced ? "rgba(26,138,26,0.3)" : "rgba(26,138,26,0.5)");
      ctx.beginPath();
      ctx.roundRect(fx, fleetY, 120, 30, 6);
      ctx.fill();

      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = isPlaced ? hex(C.DIM_GREEN) : hex(C.GREEN);
      const label = isPlaced ? `✓ ${cfg.name}` : (isSel ? `▶ ${cfg.name}` : cfg.name);
      ctx.fillText(label, fx + 60, fleetY + 15);
      fx += 130;
    });
  }

  private drawMobileBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string): void {
    const hover = this.inRect(this.mx, this.my, x, y, w, h);
    ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
