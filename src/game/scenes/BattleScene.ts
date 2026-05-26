import {
  SCENES, FONT, CANVAS_W, CANVAS_H, hex, C,
  GRID_SIZE, ROW_LABELS, COL_LABELS,
  CLASSIC_FLEET, ADVANCED_FLEET,
  SCORE_HIT, SCORE_SINK, ShipConfig,
} from "../config";
import { Board, isShipSunk } from "../Board";
import { BattleshipAI } from "../AI";
import { Engine, GameScene } from "../Engine";

type Phase = "player_turn" | "animating" | "enemy_turn" | "enemy_anim";

// Dual-grid layout: player grid left, enemy grid right
const CELL = 28;
const GRID_PX = GRID_SIZE * CELL; // 280px for 10×10

const P_GX = 40;  // player grid X
const P_GY = 80;  // player grid Y
const E_GX = 460;  // enemy grid X
const E_GY = 80;  // enemy grid Y

interface LogEntry {
  text: string;
  color: string;
  time: number;
}

interface SunkBanner {
  text: string;
  alpha: number;
  y: number;
}

export class BattleScene implements GameScene {
  private engine!: Engine;
  private playerBoard!: Board;
  private enemyBoard!: Board;
  private ai!: BattleshipAI;
  private phase: Phase = "player_turn";
  private score = 0;
  private mx = 0;
  private my = 0;
  private status = "YOUR TURN — Click enemy grid to fire";
  private sweepX = 0;
  private fleet!: ShipConfig[];
  private log: LogEntry[] = [];
  private sunkBanner: SunkBanner | null = null;

  // Keyboard cursor
  private cursorRow = 0;
  private cursorCol = 0;
  private cursorActive = false;

  enter(engine: Engine): void {
    this.engine = engine;
    this.playerBoard = engine.playerBoard!;
    this.fleet = engine.gameMode === "advanced" ? ADVANCED_FLEET : CLASSIC_FLEET;
    this.enemyBoard = new Board();
    this.enemyBoard.placeRandom(this.fleet);
    const minLen = Math.min(...this.fleet.map((f) => f.length));
    this.ai = new BattleshipAI(minLen, engine.difficulty);
    this.score = 0;
    this.phase = "player_turn";
    this.log = [];
    this.sunkBanner = null;
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.cursorActive = false;
    this.status = "YOUR TURN — Click enemy grid to fire";
    engine.resetStats();
  }

  update(dt: number): void {
    this.sweepX = (this.sweepX + 120 * dt) % GRID_PX;

    // Fade sunk banner
    if (this.sunkBanner) {
      this.sunkBanner.alpha -= dt * 0.5;
      this.sunkBanner.y -= dt * 15;
      if (this.sunkBanner.alpha <= 0) this.sunkBanner = null;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Full CRT/radar background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.renderTopBar(ctx);
    this.renderPlayerGrid(ctx);
    this.renderEnemyGrid(ctx);
    this.renderFleetPanels(ctx);
    this.renderBattleLog(ctx);
    this.renderHUD(ctx);
    this.renderSunkBanner(ctx);
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
    this.cursorActive = false;
  }

  onMouseDown(x: number, y: number): void {
    // Mute
    if (x > CANVAS_W - 70 && y < 50) {
      this.engine.audio.toggleMute();
      return;
    }
    // Quit to title
    if (x >= CANVAS_W / 2 - 40 && x <= CANVAS_W / 2 + 40 && y >= 4 && y <= 28) {
      this.engine.switchScene(SCENES.TITLE);
      return;
    }
    // Help icon
    if (x < 60 && y < 50) return;

    if (this.phase !== "player_turn") return;

    const cell = this.enemyCell(x, y);
    if (!cell) return;
    this.fireAt(cell.row, cell.col);
  }

  onKeyDown(key: string): void {
    if (this.phase !== "player_turn") return;

    this.cursorActive = true;
    switch (key) {
      case "ArrowUp":
        this.cursorRow = Math.max(0, this.cursorRow - 1);
        break;
      case "ArrowDown":
        this.cursorRow = Math.min(GRID_SIZE - 1, this.cursorRow + 1);
        break;
      case "ArrowLeft":
        this.cursorCol = Math.max(0, this.cursorCol - 1);
        break;
      case "ArrowRight":
        this.cursorCol = Math.min(GRID_SIZE - 1, this.cursorCol + 1);
        break;
      case "Enter":
      case " ":
        this.fireAt(this.cursorRow, this.cursorCol);
        break;
    }
  }

  private fireAt(row: number, col: number): void {
    if (this.enemyBoard.isShot(row, col)) return;

    this.phase = "animating";
    const result = this.enemyBoard.processShot(row, col);
    this.engine.shotsFired++;

    if (result.hit) {
      this.score += SCORE_HIT;
      this.engine.shotsHit++;
      if (result.sunkShip) {
        this.score += SCORE_SINK;
        this.engine.audio.sinkGroan();
        this.status = `You sank the ${result.sunkShip.config.name}!`;
        this.addLog(`SUNK: ${result.sunkShip.config.name}!`, hex(C.FLAME));
        this.sunkBanner = {
          text: `${result.sunkShip.config.name.toUpperCase()} DESTROYED`,
          alpha: 1.5,
          y: CANVAS_H / 2 - 20,
        };
      } else {
        this.status = `HIT at ${ROW_LABELS[row]}${COL_LABELS[col]}!`;
        this.addLog(`HIT at ${ROW_LABELS[row]}${COL_LABELS[col]}`, hex(C.HIT_RED));
      }
      this.engine.audio.explosion();
    } else {
      this.status = `Miss at ${ROW_LABELS[row]}${COL_LABELS[col]}.`;
      this.addLog(`Miss at ${ROW_LABELS[row]}${COL_LABELS[col]}`, hex(C.MISS_WHITE));
      this.engine.audio.splash();
    }

    const hs = parseInt(localStorage.getItem("battleshipWarHighScore") ?? "0", 10);
    if (this.score > hs) localStorage.setItem("battleshipWarHighScore", String(this.score));

    // No cinematic — inline feedback, fast pace
    setTimeout(() => {
      if (this.enemyBoard.allSunk()) {
        this.engine.score = this.score;
        this.engine.playerWon = true;
        this.engine.gameEndTime = Date.now();
        this.engine.audio.victory();
        this.engine.switchScene(SCENES.GAMEOVER);
        return;
      }
      this.phase = "enemy_turn";
      setTimeout(() => this.doEnemyTurn(), 400 + Math.random() * 200);
    }, 300);
  }

  /* ============ RENDER SECTIONS ============ */

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(17,17,17,0.9)";
    ctx.fillRect(0, 0, CANVAS_W, 32);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `18px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("BATTLE STATION", CANVAS_W / 2, 16);

    // Help
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("?", 20, 16);

    // Quit
    ctx.font = `10px ${FONT}`;
    const qHover = this.mx >= CANVAS_W / 2 - 40 && this.mx <= CANVAS_W / 2 + 40 &&
                   this.my >= 4 && this.my <= 28;
    ctx.fillStyle = qHover ? hex(C.GREEN) : "transparent";

    // Mute
    ctx.font = "16px sans-serif";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", CANVAS_W - 30, 16);

    // Mute label on hover
    if (this.mx > CANVAS_W - 60 && this.my < 32) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(CANVAS_W - 90, 34, 60, 20);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.fillText("SOUND", CANVAS_W - 60, 44);
    }
  }

  private renderPlayerGrid(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR WATERS", P_GX + GRID_PX / 2, P_GY - 20);

    // Grid border
    ctx.strokeStyle = hex(C.DIM_GREEN);
    ctx.lineWidth = 2;
    ctx.strokeRect(P_GX - 1, P_GY - 1, GRID_PX + 2, GRID_PX + 2);

    // Grid lines
    ctx.strokeStyle = "rgba(26,138,26,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(P_GX, P_GY + i * CELL);
      ctx.lineTo(P_GX + GRID_PX, P_GY + i * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(P_GX + i * CELL, P_GY);
      ctx.lineTo(P_GX + i * CELL, P_GY + GRID_PX);
      ctx.stroke();
    }

    // Labels
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    for (let r = 0; r < GRID_SIZE; r++) {
      ctx.fillText(ROW_LABELS[r], P_GX - 14, P_GY + r * CELL + CELL / 2);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillText(COL_LABELS[c], P_GX + c * CELL + CELL / 2, P_GY + GRID_PX + 12);
    }

    // Ships (player's own ships visible)
    for (const ship of this.playerBoard.ships) {
      const sunk = isShipSunk(ship);
      for (const cell of ship.cells) {
        const st = this.playerBoard.grid[cell.row][cell.col];
        if (st === "hit") continue; // drawn as hit marker below
        ctx.fillStyle = sunk ? "rgba(102,17,17,0.6)" : "rgba(51,255,51,0.35)";
        ctx.fillRect(P_GX + cell.col * CELL + 1, P_GY + cell.row * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    // Hit/miss markers from AI shots
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const st = this.playerBoard.grid[r][c];
        if (st === "hit") {
          ctx.fillStyle = "rgba(255,42,42,0.9)";
          ctx.fillRect(P_GX + c * CELL + 2, P_GY + r * CELL + 2, CELL - 4, CELL - 4);
          ctx.strokeStyle = "#ff6600";
          ctx.lineWidth = 1;
          ctx.strokeRect(P_GX + c * CELL + 2, P_GY + r * CELL + 2, CELL - 4, CELL - 4);
        } else if (st === "miss") {
          ctx.fillStyle = "rgba(200,200,200,0.7)";
          ctx.beginPath();
          ctx.arc(P_GX + c * CELL + CELL / 2, P_GY + r * CELL + CELL / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderEnemyGrid(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.HIT_RED);
    ctx.fillText("ENEMY WATERS", E_GX + GRID_PX / 2, E_GY - 20);

    // Grid border
    ctx.strokeStyle = hex(C.GREEN);
    ctx.lineWidth = 2;
    ctx.strokeRect(E_GX - 1, E_GY - 1, GRID_PX + 2, GRID_PX + 2);

    // Grid lines
    ctx.strokeStyle = "rgba(26,138,26,0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(E_GX, E_GY + i * CELL);
      ctx.lineTo(E_GX + GRID_PX, E_GY + i * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(E_GX + i * CELL, E_GY);
      ctx.lineTo(E_GX + i * CELL, E_GY + GRID_PX);
      ctx.stroke();
    }

    // Sweep line
    ctx.strokeStyle = "rgba(51,255,51,0.15)";
    ctx.lineWidth = 1;
    const sx = E_GX + this.sweepX;
    ctx.beginPath();
    ctx.moveTo(sx, E_GY);
    ctx.lineTo(sx, E_GY + GRID_PX);
    ctx.stroke();

    // Labels
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    for (let r = 0; r < GRID_SIZE; r++) {
      ctx.fillText(ROW_LABELS[r], E_GX - 14, E_GY + r * CELL + CELL / 2);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillText(COL_LABELS[c], E_GX + c * CELL + CELL / 2, E_GY + GRID_PX + 12);
    }

    // Markers
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const st = this.enemyBoard.grid[r][c];
        if (st === "hit") {
          ctx.fillStyle = "rgba(255,42,42,1.0)";
          ctx.fillRect(E_GX + c * CELL + 2, E_GY + r * CELL + 2, CELL - 4, CELL - 4);
          ctx.strokeStyle = "#ff6600";
          ctx.lineWidth = 1;
          ctx.strokeRect(E_GX + c * CELL + 2, E_GY + r * CELL + 2, CELL - 4, CELL - 4);
        } else if (st === "miss") {
          ctx.fillStyle = "rgba(200,200,200,0.7)";
          ctx.beginPath();
          ctx.arc(E_GX + c * CELL + CELL / 2, E_GY + r * CELL + CELL / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Sunk ship outlines
    for (const ship of this.enemyBoard.ships) {
      if (isShipSunk(ship)) {
        ctx.strokeStyle = hex(C.HIT_RED);
        ctx.lineWidth = 2;
        for (const cell of ship.cells) {
          ctx.strokeRect(E_GX + cell.col * CELL + 1, E_GY + cell.row * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Crosshair (mouse or keyboard)
    if (this.phase === "player_turn") {
      let hoverCell: { row: number; col: number } | null = null;
      if (this.cursorActive) {
        hoverCell = { row: this.cursorRow, col: this.cursorCol };
      } else {
        hoverCell = this.enemyCell(this.mx, this.my);
      }
      if (hoverCell) {
        const cx = E_GX + hoverCell.col * CELL + CELL / 2;
        const cy = E_GY + hoverCell.row * CELL + CELL / 2;
        ctx.strokeStyle = "rgba(51,255,51,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(E_GX, cy);
        ctx.lineTo(E_GX + GRID_PX, cy);
        ctx.moveTo(cx, E_GY);
        ctx.lineTo(cx, E_GY + GRID_PX);
        ctx.stroke();

        // Keyboard cursor box
        if (this.cursorActive) {
          ctx.strokeStyle = hex(C.GREEN);
          ctx.lineWidth = 2;
          ctx.strokeRect(E_GX + hoverCell.col * CELL + 1, E_GY + hoverCell.row * CELL + 1, CELL - 2, CELL - 2);
        }

        // Tooltip
        ctx.fillStyle = "#333";
        const tx = this.cursorActive ? E_GX + hoverCell.col * CELL + CELL + 4 : this.mx + 10;
        const ty = this.cursorActive ? E_GY + hoverCell.row * CELL - 4 : this.my - 22;
        ctx.fillRect(tx, ty, 36, 16);
        ctx.fillStyle = "#fff";
        ctx.font = `10px ${FONT}`;
        ctx.textAlign = "left";
        ctx.fillText(`${ROW_LABELS[hoverCell.row]}${COL_LABELS[hoverCell.col]}`, tx + 4, ty + 9);
      }
    }
  }

  private renderFleetPanels(ctx: CanvasRenderingContext2D): void {
    const fpX = E_GX + GRID_PX + 24;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Enemy fleet
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = hex(C.HIT_RED);
    ctx.fillText("ENEMY FLEET", fpX, E_GY);
    this.fleet.forEach((cfg, i) => {
      const ship = this.enemyBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      const hitCount = ship ? ship.hits.size : 0;
      const dots = Array.from({ length: cfg.length }, (_, di) =>
        di < hitCount ? "✕" : "●",
      ).join("");
      ctx.fillStyle = sunk ? hex(C.SUNK_OVERLAY) : hex(C.HIT_RED);
      ctx.font = `10px ${FONT}`;
      ctx.fillText(`${cfg.name} ${dots}`, fpX, E_GY + 18 + i * 20);
    });

    // Player fleet
    const pfY = E_GY + this.fleet.length * 20 + 50;
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR FLEET", fpX, pfY);
    this.fleet.forEach((cfg, i) => {
      const ship = this.playerBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      const hitCount = ship ? ship.hits.size : 0;
      const dots = Array.from({ length: cfg.length }, (_, di) =>
        di < hitCount ? "✕" : "●",
      ).join("");
      ctx.fillStyle = sunk ? hex(C.SUNK_OVERLAY) : hex(C.GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.fillText(`${cfg.name} ${dots}`, fpX, pfY + 18 + i * 20);
    });
  }

  private renderBattleLog(ctx: CanvasRenderingContext2D): void {
    const logX = 40;
    const logY = P_GY + GRID_PX + 35;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("BATTLE LOG", logX, logY);

    const maxEntries = 8;
    const entries = this.log.slice(-maxEntries);
    entries.forEach((entry, i) => {
      ctx.fillStyle = entry.color;
      ctx.font = `10px ${FONT}`;
      ctx.fillText(entry.text, logX, logY + 16 + i * 14);
    });
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Status bar
    ctx.fillStyle = "rgba(17,17,17,0.8)";
    ctx.fillRect(P_GX, 36, GRID_PX * 2 + (E_GX - P_GX - GRID_PX) + GRID_PX, 26);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = this.phase === "player_turn" ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.fillText(this.status, (P_GX + E_GX + GRID_PX) / 2, 49);

    // Score
    ctx.textAlign = "right";
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(`SCORE: ${this.score}`, CANVAS_W - 30, CANVAS_H - 20);

    // Turn indicator
    ctx.textAlign = "center";
    ctx.font = `10px ${FONT}`;
    if (this.phase === "player_turn") {
      ctx.fillStyle = hex(C.GREEN);
      ctx.fillText("▶ YOUR TURN", E_GX + GRID_PX / 2, E_GY + GRID_PX + 28);
    } else {
      ctx.fillStyle = hex(C.DIM_GREEN);
      ctx.fillText("⏳ OPPONENT'S TURN", E_GX + GRID_PX / 2, E_GY + GRID_PX + 28);
    }

    // Keyboard hint
    ctx.textAlign = "left";
    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = hex(C.DARK_GREEN);
    ctx.fillText("Arrow keys + Enter to fire", E_GX, CANVAS_H - 14);
  }

  private renderSunkBanner(ctx: CanvasRenderingContext2D): void {
    if (!this.sunkBanner) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.sunkBanner.alpha);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Banner background
    ctx.fillStyle = "rgba(255,42,42,0.15)";
    ctx.fillRect(0, this.sunkBanner.y - 20, CANVAS_W, 40);

    ctx.font = `28px ${FONT}`;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(this.sunkBanner.text, CANVAS_W / 2, this.sunkBanner.y);
    ctx.fillStyle = hex(C.FLAME);
    ctx.fillText(this.sunkBanner.text, CANVAS_W / 2, this.sunkBanner.y);
    ctx.restore();
  }

  /* ============ AI ============ */

  private doEnemyTurn(): void {
    this.phase = "enemy_anim";
    const coord = this.ai.getNextShot();
    const result = this.playerBoard.processShot(coord.row, coord.col);
    this.ai.recordResult(coord, result.hit, result.sunkShip);

    if (result.hit) {
      this.engine.audio.explosion();
      if (result.sunkShip) {
        this.engine.shipsLost++;
        this.engine.audio.sinkGroan();
        this.status = `AI sank your ${result.sunkShip.config.name}!`;
        this.addLog(`AI SUNK your ${result.sunkShip.config.name}!`, hex(C.HIT_RED));
        this.sunkBanner = {
          text: `YOUR ${result.sunkShip.config.name.toUpperCase()} SUNK`,
          alpha: 1.5,
          y: CANVAS_H / 2 - 20,
        };
      } else {
        this.status = `AI hit at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}!`;
        this.addLog(`AI HIT at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}`, "#ff8844");
      }
    } else {
      this.engine.audio.splash();
      this.status = `AI missed at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}.`;
      this.addLog(`AI miss at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}`, hex(C.DIM_GREEN));
    }

    setTimeout(() => {
      if (this.playerBoard.allSunk()) {
        this.engine.score = this.score;
        this.engine.playerWon = false;
        this.engine.gameEndTime = Date.now();
        this.engine.audio.defeat();
        this.engine.switchScene(SCENES.GAMEOVER);
        return;
      }
      this.phase = "player_turn";
      this.status = "YOUR TURN — Click enemy grid to fire";
    }, 600);
  }

  /* ============ HELPERS ============ */

  private enemyCell(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - E_GX) / CELL);
    const row = Math.floor((y - E_GY) / CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  private addLog(text: string, color: string): void {
    this.log.push({ text, color, time: Date.now() });
    if (this.log.length > 50) this.log.shift();
  }
}
