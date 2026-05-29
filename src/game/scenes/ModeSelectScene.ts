import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
import { Engine, GameScene } from "../Engine";
import type { GameMode, Difficulty } from "../types";

export class ModeSelectScene implements GameScene {
  private engine!: Engine;
  private mx = 0;
  private my = 0;
  private selectedDifficulty: Difficulty = "normal";

  enter(engine: Engine): void {
    this.engine = engine;
    this.selectedDifficulty = engine.difficulty;
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    const W = CANVAS_W;
    const H = CANVAS_H;
    const cx = W / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Top bar
    ctx.fillStyle = "rgba(17,17,17,0.9)";
    ctx.fillRect(0, 0, W, 36);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("?", 20, 18);
    ctx.font = `10px ${FONT}`;
    ctx.fillText("QUIT", cx, 18);
    ctx.font = "16px sans-serif";
    ctx.fillText(this.engine.audio.muted ? "🔇" : "🔊", W - 30, 18);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `42px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("GAME MODE", cx, 80);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("Select your battle configuration", cx, 115);

    // Mode tiles
    this.drawTile(ctx, cx - 180, 150, "CLASSIC",
      "Standard 10×10 grid\n5 ships: Carrier, Battleship,\nCruiser, Submarine, Destroyer",
      [5, 4, 3, 3, 2]);
    this.drawTile(ctx, cx + 180, 150, "ADVANCED",
      "Standard 10×10 grid\n7 ships: adds Frigate\nand Patrol Boat",
      [5, 4, 3, 3, 3, 2, 2]);

    // Difficulty selector
    this.drawDifficultySelector(ctx, cx, 530);

    // Mute label on hover
    if (this.mx > W - 60 && this.my < 36) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(W - 90, 38, 60, 20);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("SOUND", W - 60, 48);
    }
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
    // Quit
    if (x >= CANVAS_W / 2 - 40 && x <= CANVAS_W / 2 + 40 && y < 36) {
      this.engine.switchScene(SCENES.TITLE);
      return;
    }

    const cx = CANVAS_W / 2;

    // Classic tile
    if (this.inRect(x, y, cx - 180 - 130, 150, 260, 340)) {
      this.selectMode("classic");
    }
    // Advanced tile
    if (this.inRect(x, y, cx + 180 - 130, 150, 260, 340)) {
      this.selectMode("advanced");
    }

    // Difficulty buttons
    const difficulties: Difficulty[] = ["easy", "normal", "hard"];
    const btnW = 120;
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * 16;
    let bx = cx - totalW / 2;
    for (const diff of difficulties) {
      if (this.inRect(x, y, bx, 560, btnW, 36)) {
        this.selectedDifficulty = diff;
        this.engine.difficulty = diff;
      }
      bx += btnW + 16;
    }
  }

  private selectMode(mode: GameMode): void {
    this.engine.audio.sonarPing();
    this.engine.gameMode = mode;
    this.engine.difficulty = this.selectedDifficulty;
    this.engine.switchScene(SCENES.PLACEMENT);
  }

  private drawDifficultySelector(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("AI DIFFICULTY", cx, y);

    const difficulties: { key: Difficulty; label: string; desc: string }[] = [
      { key: "easy", label: "EASY", desc: "Random shots" },
      { key: "normal", label: "NORMAL", desc: "Hunt & target" },
      { key: "hard", label: "HARD", desc: "Parity strategy" },
    ];

    const btnW = 120;
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * 16;
    let bx = cx - totalW / 2;

    difficulties.forEach((d) => {
      const selected = this.selectedDifficulty === d.key;
      const hover = this.inRect(this.mx, this.my, bx, y + 30, btnW, 36);

      ctx.fillStyle = selected ? hex(C.GREEN) : (hover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN));
      ctx.beginPath();
      ctx.roundRect(bx, y + 30, btnW, 36, 6);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = hex(C.GREEN);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = selected ? "#000" : hex(C.GREEN);
      ctx.font = `14px ${FONT}`;
      ctx.fillText(d.label, bx + btnW / 2, y + 44);

      ctx.fillStyle = hex(C.DIM_GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.fillText(d.desc, bx + btnW / 2, y + 80);

      bx += btnW + 16;
    });
  }

  private drawTile(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    title: string, desc: string, ships: number[],
  ): void {
    const w = 260, h = 340;
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
    ctx.font = `24px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText(title, x, y + 30);

    // Ship silhouettes with labels
    const shipNames = title === "CLASSIC"
      ? ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"]
      : ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer", "Frigate", "Patrol"];
    ctx.fillStyle = "rgba(51,255,51,0.6)";
    ships.forEach((len, i) => {
      const sw = len * 20;
      ctx.beginPath();
      ctx.roundRect(x - sw / 2 - 30, y + 65 + i * 26, sw, 14, 3);
      ctx.fill();

      ctx.font = `9px ${FONT}`;
      ctx.fillStyle = hex(C.DIM_GREEN);
      ctx.textAlign = "left";
      ctx.fillText(shipNames[i] || "", x - sw / 2 + sw - 20, y + 72 + i * 26);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(51,255,51,0.6)";
    });

    // Description
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    desc.split("\n").forEach((line, i) => {
      ctx.fillText(line, x, y + h - 60 + i * 16);
    });
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
