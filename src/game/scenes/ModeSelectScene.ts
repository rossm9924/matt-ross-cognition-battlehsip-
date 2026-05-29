import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
import { Engine, GameScene } from "../Engine";
import { CostTracker } from "../CostTracker";
import type { GameMode, AIMode } from "../types";

export class ModeSelectScene implements GameScene {
  private engine!: Engine;
  private mx = 0;
  private my = 0;
  private selectedGameMode: GameMode | null = null;

  enter(engine: Engine): void {
    this.engine = engine;
    this.selectedGameMode = null;
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

    if (!this.selectedGameMode) {
      this.renderGameModeSelect(ctx, cx);
    } else {
      this.renderAIModeSelect(ctx, cx);
    }

    // Mute icon
    ctx.fillStyle = "#222";
    ctx.fillRect(W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.engine.audio.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A", W - 40, 30);
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

    if (!this.selectedGameMode) {
      // Classic tile
      if (this.inRect(x, y, cx - 180 - 140, 200, 280, 360)) {
        this.engine.audio.sonarPing();
        this.selectedGameMode = "classic";
      }
      // Advanced tile
      if (this.inRect(x, y, cx + 180 - 140, 200, 280, 360)) {
        this.engine.audio.sonarPing();
        this.selectedGameMode = "advanced";
      }
    } else {
      // AI mode selection
      if (this.inRect(x, y, cx - 180 - 140, 220, 280, 300)) {
        this.selectAIMode("fast");
      }
      if (this.inRect(x, y, cx + 180 - 140, 220, 280, 300)) {
        this.selectAIMode("llm");
      }
      // Back button
      if (this.inRect(x, y, 30, CANVAS_H - 60, 100, 36)) {
        this.engine.audio.sonarPing();
        this.selectedGameMode = null;
      }
    }
  }

  private selectAIMode(mode: AIMode): void {
    this.engine.audio.sonarPing();
    this.engine.gameMode = this.selectedGameMode!;
    this.engine.aiMode = mode;
    if (mode === "llm") {
      this.engine.costTracker = new CostTracker(0.50);
    }
    this.engine.switchScene(SCENES.PLACEMENT);
  }

  private renderGameModeSelect(ctx: CanvasRenderingContext2D, cx: number): void {
    ctx.font = `48px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("GAME MODE", cx, 80);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("Select your battle configuration", cx, 130);

    this.drawTile(ctx, cx - 180, 200, "CLASSIC", "5 Ships\nStandard Fleet", [5, 5, 4, 3, 3]);
    this.drawTile(ctx, cx + 180, 200, "ADVANCED", "7 Ships\nExpanded Fleet", [5, 5, 4, 3, 3, 3, 2]);
  }

  private renderAIModeSelect(ctx: CanvasRenderingContext2D, cx: number): void {
    ctx.font = `48px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("AI OPPONENT", cx, 60);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText(
      `${this.selectedGameMode!.toUpperCase()} mode selected — choose your opponent`,
      cx, 110,
    );

    // Fast AI tile
    const fastX = cx - 180;
    const fastY = 220;
    const tileW = 280;
    const tileH = 300;
    const fastHover = this.inRect(this.mx, this.my, fastX - tileW / 2, fastY, tileW, tileH);

    ctx.fillStyle = fastHover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN);
    ctx.beginPath();
    ctx.roundRect(fastX - tileW / 2, fastY, tileW, tileH, 10);
    ctx.fill();
    ctx.strokeStyle = hex(C.GREEN);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `28px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("FAST AI", fastX, fastY + 40);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("Algorithmic", fastX, fastY + 80);
    ctx.fillText("Hunt & Target", fastX, fastY + 105);

    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("Free", fastX, fastY + 155);
    ctx.fillText("Instant response", fastX, fastY + 180);
    ctx.fillText("Deterministic strategy", fastX, fastY + 205);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("COST: FREE", fastX, fastY + tileH - 30);

    // LLM AI tile
    const llmX = cx + 180;
    const llmY = 220;
    const llmHover = this.inRect(this.mx, this.my, llmX - tileW / 2, llmY, tileW, tileH);

    ctx.fillStyle = llmHover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN);
    ctx.beginPath();
    ctx.roundRect(llmX - tileW / 2, llmY, tileW, tileH, 10);
    ctx.fill();
    ctx.strokeStyle = "#ff9900";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `28px ${FONT}`;
    ctx.fillStyle = "#ff9900";
    ctx.fillText("LLM AI", llmX, llmY + 40);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = "#ff9900";
    ctx.fillText("Claude (Anthropic)", llmX, llmY + 80);
    ctx.fillText("Reasoning-based", llmX, llmY + 105);

    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("~$0.10-0.50 per game", llmX, llmY + 155);
    ctx.fillText("1-3s per move", llmX, llmY + 180);
    ctx.fillText("Adaptive strategy", llmX, llmY + 205);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = "#cc6600";
    ctx.fillText("Requires API key in .env.local", llmX, llmY + 240);

    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = "#ff9900";
    ctx.fillText("COST: ~$0.10-0.50", llmX, llmY + tileH - 30);

    // Back button
    const backHover = this.inRect(this.mx, this.my, 30, CANVAS_H - 60, 100, 36);
    ctx.fillStyle = backHover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN);
    ctx.beginPath();
    ctx.roundRect(30, CANVAS_H - 60, 100, 36, 6);
    ctx.fill();
    ctx.strokeStyle = hex(C.GREEN);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("< BACK", 80, CANVAS_H - 42);
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
