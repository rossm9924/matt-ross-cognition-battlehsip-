import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
import { Engine, GameScene } from "../Engine";
import type { GameMode } from "../types";

export class ModeSelectScene implements GameScene {
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

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `48px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("GAME MODE", cx, 80);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("Select your battle configuration", cx, 130);

    this.drawTile(ctx, cx - 180, 200, "CLASSIC", "5 Ships\nStandard Fleet", [5, 5, 4, 3, 3]);
    this.drawTile(ctx, cx + 180, 200, "ADVANCED", "7 Ships\nExpanded Fleet", [5, 5, 4, 3, 3, 3, 2]);

    // Mute icon
    ctx.fillStyle = "#222";
    ctx.fillRect(W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", W - 40, 30);
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
    const cx = CANVAS_W / 2;
    // Classic tile
    if (this.inRect(x, y, cx - 180 - 140, 200, 280, 360)) {
      this.selectMode("classic");
    }
    // Advanced tile
    if (this.inRect(x, y, cx + 180 - 140, 200, 280, 360)) {
      this.selectMode("advanced");
    }
  }

  private selectMode(mode: GameMode): void {
    this.engine.audio.sonarPing();
    this.engine.gameMode = mode;
    this.engine.switchScene(SCENES.PLACEMENT);
  }

  private drawTile(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    title: string, desc: string, ships: number[],
  ): void {
    const w = 280, h = 360;
    const hover = this.inRect(this.mx, this.my, x - w / 2, y, w, h);

    ctx.fillStyle = hover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN);
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = hex(C.GREEN);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `28px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(title, x, y + 35);

    // Ship silhouettes
    ctx.fillStyle = `rgba(51,255,51,0.6)`;
    ships.forEach((len, i) => {
      const sw = len * 22;
      ctx.beginPath();
      ctx.roundRect(x - sw / 2, y + 80 + i * 28, sw, 16, 4);
      ctx.fill();
    });

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    desc.split("\n").forEach((line, i) => {
      ctx.fillText(line, x, y + h - 55 + i * 20);
    });
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
