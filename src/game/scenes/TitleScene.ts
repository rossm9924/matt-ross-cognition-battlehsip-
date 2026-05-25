import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
import { Engine, GameScene } from "../Engine";

export class TitleScene implements GameScene {
  private engine!: Engine;
  private mx = 0;
  private my = 0;
  private showInfo = false;

  enter(engine: Engine): void {
    this.engine = engine;
    this.showInfo = false;
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const W = CANVAS_W;
    const H = CANVAS_H;
    const cx = W / 2;
    const cy = H / 2;

    // Ocean gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a1e3c");
    grad.addColorStop(1, "#1a4f82");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ship silhouettes
    ctx.fillStyle = "rgba(20,20,40,0.6)";
    ctx.fillRect(200, cy + 60, 180, 18);
    ctx.fillRect(500, cy + 80, 250, 22);
    ctx.fillRect(850, cy + 50, 140, 14);

    // Title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `72px ${FONT}`;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.strokeText("BATTLESHIP WAR", cx, cy - 100);
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("BATTLESHIP WAR", cx, cy - 100);

    // Subtitle
    ctx.font = `18px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("NAVAL COMBAT SIMULATOR", cx, cy - 30);

    // Play button
    const bx = cx - 120, by = cy + 40, bw = 240, bh = 60;
    const hover = this.mx >= bx && this.mx <= bx + bw && this.my >= by && this.my <= by + bh;
    ctx.fillStyle = hover ? hex(C.GREEN) : hex(C.DIM_GREEN);
    this.roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    if (!hover) {
      ctx.strokeStyle = hex(C.GREEN);
      ctx.lineWidth = 2;
      this.roundRect(ctx, bx, by, bw, bh, 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#000";
    ctx.font = `28px ${FONT}`;
    ctx.fillText("▶  PLAY", cx, cy + 70);

    // Corner icons
    this.drawCornerIcon(ctx, 30, 30, "?");
    this.drawMuteIcon(ctx, W - 40, 30);

    // Info overlay
    if (this.showInfo) {
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `18px ${FONT}`;
      const lines = [
        "BATTLESHIP WAR — RULES", "",
        "Place your fleet on the 14×14 grid.",
        "Take turns firing at the enemy grid.",
        "Hit = red marker, Miss = green marker.",
        "Sink all enemy ships to win!", "",
        "Click anywhere to close.",
      ];
      lines.forEach((l, i) => ctx.fillText(l, cx, cy - 100 + i * 30));
    }
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }

  onMouseDown(x: number, y: number): void {
    if (this.showInfo) {
      this.showInfo = false;
      return;
    }
    // Info button
    if (x < 60 && y < 50) {
      this.showInfo = true;
      return;
    }
    // Mute
    if (x > CANVAS_W - 70 && y < 50) {
      this.engine.audio.toggleMute();
      return;
    }
    // Play button
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const bx = cx - 120, by = cy + 40, bw = 240, bh = 60;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
      this.engine.audio.sonarPing();
      this.engine.switchScene(SCENES.MODE);
    }
  }

  private drawCornerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, label: string): void {
    ctx.fillStyle = "#222";
    ctx.fillRect(x - 16, y - 14, 32, 28);
    ctx.fillStyle = hex(C.GREEN);
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }

  private drawMuteIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = "#222";
    ctx.fillRect(x - 16, y - 14, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", x, y);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
