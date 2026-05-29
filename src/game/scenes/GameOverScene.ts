import {
  SCENES, FONT, CANVAS_W, CANVAS_H, hex, C,
  CLASSIC_FLEET, ADVANCED_FLEET,
} from "../config";
import { isShipSunk } from "../Board";
import { Engine, GameScene } from "../Engine";

export class GameOverScene implements GameScene {
  private engine!: Engine;
  private mx = 0;
  private my = 0;

  enter(engine: Engine): void {
    this.engine = engine;
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const W = CANVAS_W;
    const H = CANVAS_H;
    const cx = W / 2;
    const cy = H / 2;
    const won = this.engine.playerWon;
    const score = this.engine.score;
    const hs = Math.max(score, parseInt(localStorage.getItem("battleshipWarHighScore") ?? "0", 10));

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (won) {
      grad.addColorStop(0, "#051a05");
      grad.addColorStop(1, "#0d440d");
    } else {
      grad.addColorStop(0, "#1a0505");
      grad.addColorStop(1, "#440d0d");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `80px ${FONT}`;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.strokeText(won ? "VICTORY" : "DEFEAT", cx, 100);
    ctx.fillStyle = won ? hex(C.GREEN) : hex(C.HIT_RED);
    ctx.fillText(won ? "VICTORY" : "DEFEAT", cx, 100);

    ctx.font = `18px ${FONT}`;
    ctx.fillStyle = won ? hex(C.DIM_GREEN) : "#aa2222";
    ctx.fillText(
      won ? "All enemy ships destroyed!" : "Your fleet has been destroyed.",
      cx, 170,
    );

    // Score
    ctx.font = `32px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(`SCORE: ${score}`, cx, 220);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText(`HIGH SCORE: ${hs}`, cx, 255);

    // Stats panel (#15)
    this.renderStats(ctx, cx, 290);

    // Ship summary
    this.renderShipSummary(ctx, cx, 420);

    // Buttons
    this.drawBtn(ctx, cx - 140, cy + 190, 280, 50, "PLAY AGAIN");
    this.drawBtn(ctx, cx - 140, cy + 260, 280, 50, "CHANGE MODE");

    // Mute
    ctx.fillStyle = "#222";
    ctx.fillRect(W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", W - 40, 30);
  }

  private renderStats(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    const shotsFired = this.engine.shotsFired;
    const shotsHit = this.engine.shotsHit;
    const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    const shipsLost = this.engine.shipsLost;

    let elapsed = "—";
    if (this.engine.gameStartTime > 0 && this.engine.gameEndTime > 0) {
      const ms = this.engine.gameEndTime - this.engine.gameStartTime;
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      elapsed = `${min}:${sec.toString().padStart(2, "0")}`;
    }

    // Stats box
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const bw = 360, bh = 120;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, y, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = hex(C.DIM_GREEN);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("BATTLE STATISTICS", cx, y + 18);

    ctx.font = `12px ${FONT}`;
    const stats = [
      [`Shots Fired: ${shotsFired}`, `Hits: ${shotsHit}`],
      [`Accuracy: ${accuracy}%`, `Ships Lost: ${shipsLost}`],
      [`Time: ${elapsed}`, `Difficulty: ${this.engine.difficulty.toUpperCase()}`],
    ];

    stats.forEach((row, i) => {
      ctx.fillStyle = hex(C.GREEN);
      ctx.textAlign = "right";
      ctx.fillText(row[0], cx - 10, y + 45 + i * 24);
      ctx.textAlign = "left";
      ctx.fillText(row[1], cx + 10, y + 45 + i * 24);
    });
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }

  onMouseDown(x: number, y: number): void {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    // Mute
    if (x > CANVAS_W - 70 && y < 50) {
      this.engine.audio.toggleMute();
      return;
    }

    // Play Again
    if (this.inRect(x, y, cx - 140, cy + 190, 280, 50)) {
      this.engine.audio.sonarPing();
      this.engine.switchScene(SCENES.PLACEMENT);
    }

    // Change Mode
    if (this.inRect(x, y, cx - 140, cy + 260, 280, 50)) {
      this.engine.audio.sonarPing();
      this.engine.switchScene(SCENES.MODE);
    }
  }

  private renderShipSummary(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    const fleet = this.engine.gameMode === "advanced" ? ADVANCED_FLEET : CLASSIC_FLEET;
    const playerBoard = this.engine.playerBoard;
    const enemyBoard = this.engine.enemyBoard;
    if (!playerBoard || !enemyBoard) return;

    const colW = 180;
    const leftX = cx - colW - 10;
    const rightX = cx + 10;

    ctx.textAlign = "center";
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("FLEET STATUS", cx, y);

    // Column headers
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("YOUR FLEET", leftX, y + 18);
    ctx.fillStyle = hex(C.HIT_RED);
    ctx.fillText("ENEMY FLEET", rightX, y + 18);

    fleet.forEach((cfg, i) => {
      const rowY = y + 34 + i * 16;

      // Player ship status
      const pShip = playerBoard.ships.find((s) => s.config.id === cfg.id);
      const pSunk = pShip ? isShipSunk(pShip) : false;
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillStyle = pSunk ? hex(C.SUNK_OVERLAY) : hex(C.GREEN);
      ctx.fillText(`${pSunk ? "✕" : "●"} ${cfg.name}`, leftX, rowY);

      // Enemy ship status
      const eShip = enemyBoard.ships.find((s) => s.config.id === cfg.id);
      const eSunk = eShip ? isShipSunk(eShip) : false;
      ctx.fillStyle = eSunk ? hex(C.SUNK_OVERLAY) : hex(C.HIT_RED);
      ctx.fillText(`${eSunk ? "✕" : "●"} ${cfg.name}`, rightX, rowY);
    });
  }

  private drawBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string): void {
    const hover = this.inRect(this.mx, this.my, x, y, w, h);
    ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
