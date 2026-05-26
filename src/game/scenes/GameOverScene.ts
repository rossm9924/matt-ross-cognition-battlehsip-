import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
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
    ctx.strokeText(won ? "VICTORY" : "DEFEAT", cx, cy - 130);
    ctx.fillStyle = won ? hex(C.GREEN) : hex(C.HIT_RED);
    ctx.fillText(won ? "VICTORY" : "DEFEAT", cx, cy - 130);

    ctx.font = `18px ${FONT}`;
    ctx.fillStyle = won ? hex(C.DIM_GREEN) : "#aa2222";
    ctx.fillText(
      won ? "All enemy ships destroyed!" : "Your fleet has been destroyed.",
      cx, cy - 50,
    );

    // Score
    ctx.font = `32px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(`SCORE: ${score}`, cx, cy + 10);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText(`HIGH SCORE: ${hs}`, cx, cy + 50);

    // Buttons
    this.drawBtn(ctx, cx - 140, cy + 100, 280, 50, "PLAY AGAIN");
    this.drawBtn(ctx, cx - 140, cy + 170, 280, 50, "CHANGE MODE");

    // Mute
    ctx.fillStyle = "#222";
    ctx.fillRect(W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", W - 40, 30);
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
    if (this.inRect(x, y, cx - 140, cy + 100, 280, 50)) {
      this.engine.audio.sonarPing();
      this.engine.switchScene(SCENES.PLACEMENT);
    }

    // Change Mode
    if (this.inRect(x, y, cx - 140, cy + 170, 280, 50)) {
      this.engine.audio.sonarPing();
      this.engine.switchScene(SCENES.MODE);
    }
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
