import {
  SCENES, FONT, CANVAS_W, CANVAS_H, hex, C,
  GRID_SIZE, ROW_LABELS, COL_LABELS,
  CLASSIC_FLEET, ADVANCED_FLEET,
  SCORE_HIT, SCORE_SINK, ShipConfig,
} from "../config";
import { Board, isShipSunk, ShotResult } from "../Board";
import { BattleshipAI } from "../AI";
import { Engine, GameScene } from "../Engine";

type Phase = "player_turn" | "animating" | "enemy_turn" | "enemy_anim";

const CELL = 32;
const RGX = 120; // radar grid X
const RGY = 110; // radar grid Y

const ISO_TW = 36;
const ISO_TH = 18;
const ISO_E_OX = 320;
const ISO_E_OY = 140;
const ISO_P_OX = 740;
const ISO_P_OY = 340;

interface ShellAnim {
  fromX: number; fromY: number;
  toX: number; toY: number;
  midX: number; midY: number;
  t: number;
  duration: number;
  result: ShotResult;
  onDone: () => void;
}

interface FxParticle {
  x: number; y: number;
  r: number; color: string;
  life: number; maxLife: number;
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
  private viewMode: "radar" | "iso" = "radar";
  private fadeAlpha = 1;
  private fadingTo: "radar" | "iso" | null = null;
  private shell: ShellAnim | null = null;
  private particles: FxParticle[] = [];
  private sweepX = 0;
  private fleet!: ShipConfig[];

  enter(engine: Engine): void {
    this.engine = engine;
    this.playerBoard = engine.playerBoard!;
    this.fleet = engine.gameMode === "advanced" ? ADVANCED_FLEET : CLASSIC_FLEET;
    this.enemyBoard = new Board();
    this.enemyBoard.placeRandom(this.fleet);
    const minLen = Math.min(...this.fleet.map((f) => f.length));
    this.ai = new BattleshipAI(minLen);
    this.score = 0;
    this.phase = "player_turn";
    this.viewMode = "radar";
    this.fadeAlpha = 1;
    this.fadingTo = null;
    this.shell = null;
    this.particles = [];
    this.status = "YOUR TURN — Click enemy grid to fire";
  }

  update(dt: number): void {
    this.sweepX = (this.sweepX + 120 * dt) % (GRID_SIZE * CELL);

    // Fade transition
    if (this.fadingTo) {
      this.fadeAlpha -= dt * 4;
      if (this.fadeAlpha <= 0) {
        this.viewMode = this.fadingTo;
        this.fadingTo = null;
        this.fadeAlpha = 0;
        // Fade in
        this.fadingTo = null;
      }
    } else if (this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 4);
    }

    // Shell animation
    if (this.shell) {
      this.shell.t += dt / this.shell.duration;
      if (this.shell.t >= 1) {
        this.shell.t = 1;
        const done = this.shell.onDone;
        const res = this.shell.result;
        this.shell = null;
        // Spawn particles
        if (res.hit) {
          this.engine.audio.explosion();
          this.spawnExplosion(
            this.isoX(res.coord.row, res.coord.col, this.phase === "enemy_anim"),
            this.isoY(res.coord.row, res.coord.col, this.phase === "enemy_anim"),
          );
        } else {
          this.engine.audio.splash();
          this.spawnSplash(
            this.isoX(res.coord.row, res.coord.col, this.phase === "enemy_anim"),
            this.isoY(res.coord.row, res.coord.col, this.phase === "enemy_anim"),
          );
        }
        setTimeout(done, 600);
      }
    }

    // Particles
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.r += dt * 20;
      return p.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    if (this.viewMode === "radar") {
      this.renderRadar(ctx);
    } else {
      this.renderIso(ctx);
    }

    ctx.restore();

    // UI always visible
    this.renderHUD(ctx);
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }

  onMouseDown(x: number, y: number): void {
    // Mute
    if (x > CANVAS_W - 70 && y < 50) {
      this.engine.audio.toggleMute();
      return;
    }
    if (this.phase !== "player_turn" || this.viewMode !== "radar") return;

    const cell = this.radarCell(x, y);
    if (!cell) return;
    if (this.enemyBoard.isShot(cell.row, cell.col)) return;

    this.phase = "animating";
    const result = this.enemyBoard.processShot(cell.row, cell.col);

    if (result.hit) {
      this.score += SCORE_HIT;
      if (result.sunkShip) {
        this.score += SCORE_SINK;
        this.engine.audio.sinkGroan();
        this.status = `You sank the ${result.sunkShip.config.name}!`;
      } else {
        this.status = `HIT at ${ROW_LABELS[cell.row]}${COL_LABELS[cell.col]}!`;
      }
    } else {
      this.status = `Miss at ${ROW_LABELS[cell.row]}${COL_LABELS[cell.col]}.`;
    }

    // Save high score
    const hs = parseInt(localStorage.getItem("battleshipWarHighScore") ?? "0", 10);
    if (this.score > hs) localStorage.setItem("battleshipWarHighScore", String(this.score));

    this.engine.audio.shoot();
    this.startFade("iso", () => {
      this.fireShell(false, cell.row, cell.col, result, () => {
        if (this.enemyBoard.allSunk()) {
          this.engine.score = this.score;
          this.engine.playerWon = true;
          this.engine.audio.victory();
          this.engine.switchScene(SCENES.GAMEOVER);
          return;
        }
        this.phase = "enemy_turn";
        setTimeout(() => this.doEnemyTurn(), 600 + Math.random() * 300);
      });
    });
  }

  /* ============ RADAR VIEW ============ */

  private renderRadar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `26px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("BATTLE STATION", CANVAS_W / 2, 20);

    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(this.status, CANVAS_W / 2, 52);

    // Grid border
    ctx.strokeStyle = hex(C.GREEN);
    ctx.lineWidth = 2;
    ctx.strokeRect(RGX - 2, RGY - 2, GRID_SIZE * CELL + 4, GRID_SIZE * CELL + 4);

    // Grid lines
    ctx.strokeStyle = `rgba(26,138,26,0.4)`;
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_SIZE; r++) {
      ctx.beginPath();
      ctx.moveTo(RGX, RGY + r * CELL);
      ctx.lineTo(RGX + GRID_SIZE * CELL, RGY + r * CELL);
      ctx.stroke();
    }
    for (let c = 0; c <= GRID_SIZE; c++) {
      ctx.beginPath();
      ctx.moveTo(RGX + c * CELL, RGY);
      ctx.lineTo(RGX + c * CELL, RGY + GRID_SIZE * CELL);
      ctx.stroke();
    }

    // Labels
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    for (let r = 0; r < GRID_SIZE; r++) {
      ctx.fillText(ROW_LABELS[r], RGX - 18, RGY + r * CELL + CELL / 2);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      ctx.fillText(COL_LABELS[c], RGX + c * CELL + CELL / 2, RGY + GRID_SIZE * CELL + 14);
    }

    // Sweep line
    ctx.strokeStyle = `rgba(51,255,51,0.15)`;
    ctx.lineWidth = 1;
    const sx = RGX + this.sweepX;
    ctx.beginPath();
    ctx.moveTo(sx, RGY);
    ctx.lineTo(sx, RGY + GRID_SIZE * CELL);
    ctx.stroke();

    // Markers
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const st = this.enemyBoard.grid[r][c];
        if (st === "hit") {
          ctx.fillStyle = `rgba(255,42,42,0.9)`;
          ctx.fillRect(RGX + c * CELL + 3, RGY + r * CELL + 3, CELL - 6, CELL - 6);
        } else if (st === "miss") {
          ctx.fillStyle = `rgba(34,102,34,0.5)`;
          ctx.fillRect(RGX + c * CELL + 4, RGY + r * CELL + 4, CELL - 8, CELL - 8);
        }
      }
    }

    // Sunk ship outlines
    for (const ship of this.enemyBoard.ships) {
      if (isShipSunk(ship)) {
        ctx.strokeStyle = hex(C.HIT_RED);
        ctx.lineWidth = 2;
        for (const cell of ship.cells) {
          ctx.strokeRect(RGX + cell.col * CELL + 1, RGY + cell.row * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Crosshair
    if (this.phase === "player_turn") {
      const cell = this.radarCell(this.mx, this.my);
      if (cell) {
        const cx = RGX + cell.col * CELL + CELL / 2;
        const cy = RGY + cell.row * CELL + CELL / 2;
        ctx.strokeStyle = `rgba(51,255,51,0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RGX, cy);
        ctx.lineTo(RGX + GRID_SIZE * CELL, cy);
        ctx.moveTo(cx, RGY);
        ctx.lineTo(cx, RGY + GRID_SIZE * CELL);
        ctx.stroke();

        // Tooltip
        ctx.fillStyle = "#333";
        ctx.fillRect(this.mx + 10, this.my - 22, 40, 18);
        ctx.fillStyle = "#fff";
        ctx.font = `11px ${FONT}`;
        ctx.textAlign = "left";
        ctx.fillText(`${ROW_LABELS[cell.row]}${COL_LABELS[cell.col]}`, this.mx + 14, this.my - 13);
      }
    }

    // Fleet panels
    this.drawFleetPanels(ctx);
  }

  /* ============ ISOMETRIC VIEW ============ */

  private renderIso(ctx: CanvasRenderingContext2D): void {
    // Ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#142e4a");
    grad.addColorStop(1, "#2a6fb2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Enemy grid (upper-left)
    this.drawIsoGrid(ctx, ISO_E_OX, ISO_E_OY, this.enemyBoard, false);
    // Player grid (lower-right)
    this.drawIsoGrid(ctx, ISO_P_OX, ISO_P_OY, this.playerBoard, true);

    // Grid labels
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.textAlign = "center";
    ctx.fillText("ENEMY WATERS", ISO_E_OX, ISO_E_OY - 20);
    ctx.fillText("YOUR WATERS", ISO_P_OX, ISO_P_OY - 20);

    // Shell
    if (this.shell) {
      const t = this.shell.t;
      const sx = (1 - t) * (1 - t) * this.shell.fromX + 2 * (1 - t) * t * this.shell.midX + t * t * this.shell.toX;
      const sy = (1 - t) * (1 - t) * this.shell.fromY + 2 * (1 - t) * t * this.shell.midY + t * t * this.shell.toY;
      ctx.fillStyle = hex(C.FLAME);
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.strokeStyle = `rgba(255,102,0,0.4)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.shell.fromX, this.shell.fromY);
      for (let i = 0; i <= 20; i++) {
        const tt = (i / 20) * t;
        const px = (1 - tt) * (1 - tt) * this.shell.fromX + 2 * (1 - tt) * tt * this.shell.midX + tt * tt * this.shell.toX;
        const py = (1 - tt) * (1 - tt) * this.shell.fromY + 2 * (1 - tt) * tt * this.shell.midY + tt * tt * this.shell.toY;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Side fleet panels
    ctx.textAlign = "left";
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR FLEET", 20, 100);
    this.fleet.forEach((cfg, i) => {
      const ship = this.playerBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      ctx.fillStyle = sunk ? "#661111" : hex(C.GREEN);
      ctx.fillText(`${sunk ? "✕" : "●"} ${cfg.name}`, 20, 120 + i * 18);
    });

    ctx.fillStyle = hex(C.HIT_RED);
    ctx.fillText("ENEMY FLEET", 20, 350);
    this.fleet.forEach((cfg, i) => {
      const ship = this.enemyBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      ctx.fillStyle = sunk ? "#661111" : hex(C.HIT_RED);
      ctx.fillText(`${sunk ? "✕" : "●"} ${cfg.name}`, 20, 370 + i * 18);
    });

    // Score
    ctx.textAlign = "right";
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(`SCORE: ${this.score}`, CANVAS_W - 30, CANVAS_H - 20);
  }

  private drawIsoGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, board: Board, showShips: boolean): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = ox + (c - r) * (ISO_TW / 2);
        const y = oy + (c + r) * (ISO_TH / 2);
        const state = board.grid[r][c];

        let fill = "#2a6fb2";
        let alpha = 0.6;
        if (state === "hit") { fill = "#ff2a2a"; alpha = 0.8; }
        else if (state === "miss") { fill = "#ddeeff"; alpha = 0.4; }
        else if (showShips && state === "ship") { fill = "#778899"; alpha = 0.7; }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(x, y - ISO_TH / 2);
        ctx.lineTo(x + ISO_TW / 2, y);
        ctx.lineTo(x, y + ISO_TH / 2);
        ctx.lineTo(x - ISO_TW / 2, y);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#1a4f82";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ============ HUD ============ */

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    // Score (always visible)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(`SCORE: ${this.score}`, CANVAS_W - 30, CANVAS_H - 20);

    // Mute icon
    ctx.fillStyle = "#222";
    ctx.fillRect(CANVAS_W - 56, 6, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", CANVAS_W - 40, 20);

    // Status text (iso view)
    if (this.viewMode === "iso") {
      ctx.textAlign = "center";
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = hex(C.GREEN);
      ctx.fillText(this.status, CANVAS_W / 2, 30);
    }
  }

  private drawFleetPanels(ctx: CanvasRenderingContext2D): void {
    const epx = RGX + GRID_SIZE * CELL + 30;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Enemy fleet
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.HIT_RED);
    ctx.fillText("ENEMY FLEET", epx, RGY - 10);
    this.fleet.forEach((cfg, i) => {
      const ship = this.enemyBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      const hitCount = ship ? ship.hits.size : 0;
      const dots = Array.from({ length: cfg.length }, (_, di) =>
        di < hitCount ? "✕" : "●",
      ).join("");
      ctx.fillStyle = sunk ? "#661111" : hex(C.HIT_RED);
      ctx.font = `11px ${FONT}`;
      ctx.fillText(`${cfg.name} ${dots}`, epx, RGY + 10 + i * 22);
    });

    // Player fleet
    const ppx = RGX;
    const ppy = RGY + GRID_SIZE * CELL + 35;
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR FLEET", ppx, ppy);
    this.fleet.forEach((cfg, i) => {
      const ship = this.playerBoard.ships.find((s) => s.config.id === cfg.id);
      const sunk = ship ? isShipSunk(ship) : false;
      const hitCount = ship ? ship.hits.size : 0;
      const dots = Array.from({ length: cfg.length }, (_, di) =>
        di < hitCount ? "✕" : "●",
      ).join("");
      ctx.fillStyle = sunk ? "#661111" : hex(C.GREEN);
      ctx.font = `11px ${FONT}`;
      ctx.fillText(`${cfg.name} ${dots}`, ppx + (i % 4) * 200, ppy + 18 + Math.floor(i / 4) * 20);
    });
  }

  /* ============ TRANSITIONS & ANIMATIONS ============ */

  private startFade(to: "radar" | "iso", cb: () => void): void {
    this.fadingTo = to;
    this.fadeAlpha = 1;
    const check = () => {
      if (this.viewMode === to && this.fadeAlpha >= 0.9) {
        cb();
      } else {
        requestAnimationFrame(check);
      }
    };
    // Allow fade to process in update loop
    setTimeout(check, 350);
  }

  private fireShell(toPlayer: boolean, row: number, col: number, result: ShotResult, onDone: () => void): void {
    const ox = toPlayer ? ISO_P_OX : ISO_E_OX;
    const oy = toPlayer ? ISO_P_OY : ISO_E_OY;
    const toX = ox + (col - row) * (ISO_TW / 2);
    const toY = oy + (col + row) * (ISO_TH / 2);
    const fromOx = toPlayer ? ISO_E_OX : ISO_P_OX;
    const fromOy = toPlayer ? ISO_E_OY - 60 : ISO_P_OY - 60;

    this.shell = {
      fromX: fromOx, fromY: fromOy,
      toX, toY,
      midX: (fromOx + toX) / 2,
      midY: Math.min(fromOy, toY) - 120,
      t: 0,
      duration: 0.6,
      result,
      onDone,
    };
  }

  private isoX(row: number, col: number, isPlayer: boolean): number {
    const ox = isPlayer ? ISO_P_OX : ISO_E_OX;
    return ox + (col - row) * (ISO_TW / 2);
  }

  private isoY(row: number, col: number, isPlayer: boolean): number {
    const oy = isPlayer ? ISO_P_OY : ISO_E_OY;
    return oy + (col + row) * (ISO_TH / 2);
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        r: 4 + Math.random() * 6,
        color: i < 4 ? hex(C.FLAME) : (i < 6 ? hex(C.HIT_RED) : hex(C.SMOKE)),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
      });
    }
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        r: 3 + Math.random() * 4,
        color: hex(C.FOAM),
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  }

  /* ============ AI ============ */

  private doEnemyTurn(): void {
    this.phase = "enemy_anim";
    const coord = this.ai.getNextShot();
    const result = this.playerBoard.processShot(coord.row, coord.col);
    this.ai.recordResult(coord, result.hit, result.sunkShip);

    if (result.hit) {
      if (result.sunkShip) {
        this.status = `AI sank your ${result.sunkShip.config.name}!`;
      } else {
        this.status = `AI hit at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}!`;
      }
    } else {
      this.status = `AI missed at ${ROW_LABELS[coord.row]}${COL_LABELS[coord.col]}.`;
    }

    this.engine.audio.shoot();
    this.fireShell(true, coord.row, coord.col, result, () => {
      if (this.playerBoard.allSunk()) {
        this.engine.score = this.score;
        this.engine.playerWon = false;
        this.engine.audio.defeat();
        this.engine.switchScene(SCENES.GAMEOVER);
        return;
      }
      // Fade back to radar
      this.startFade("radar", () => {
        this.phase = "player_turn";
        this.status = "YOUR TURN — Click enemy grid to fire";
      });
    });
  }

  /* ============ HELPERS ============ */

  private radarCell(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - RGX) / CELL);
    const row = Math.floor((y - RGY) / CELL);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }
}
