import { SCENES, FONT, CANVAS_W, CANVAS_H, hex, C } from "../config";
import { Engine, GameScene } from "../Engine";
import type { GameMode, Difficulty } from "../types";

export class ModeSelectScene implements GameScene {
  private engine!: Engine;
  private mx = 0;
  private my = 0;
  private selectedDifficulty: Difficulty = "normal";
  private useLlm = false;
  private showInfo = false;

  enter(engine: Engine): void {
    this.engine = engine;
    this.selectedDifficulty = engine.difficulty;
    this.useLlm = engine.useLlm;
    this.showInfo = false;
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
    ctx.fillText("GAME MODE", cx, 100);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    ctx.fillText("Select your battle configuration", cx, 130);

    // Mode tiles — shifted up to make room for AI toggle
    this.drawTile(ctx, cx - 180, 160, "CLASSIC",
      "Standard 10x10 grid\n5 ships: Carrier, Battleship,\nCruiser, Submarine, Destroyer",
      [5, 4, 3, 3, 2]);
    this.drawTile(ctx, cx + 180, 160, "ADVANCED",
      "Standard 10x10 grid\n7 ships: adds Frigate\nand Patrol Boat",
      [5, 4, 3, 3, 3, 2, 2]);

    // AI opponent toggle
    this.drawAIToggle(ctx, cx, 520);

    // Difficulty selector
    this.drawDifficultySelector(ctx, cx, 620);

    // Mute label on hover
    if (this.mx > W - 60 && this.my < 36) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(W - 90, 38, 60, 20);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("SOUND", W - 60, 48);
    }

    // Rules tooltip on hover
    if (this.mx < 60 && this.my < 50 && !this.showInfo) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath();
      ctx.roundRect(50, 16, 64, 26, 4);
      ctx.fill();
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("RULES", 58, 30);
      ctx.textAlign = "center";
    }

    // Info overlay
    if (this.showInfo) {
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hex(C.GREEN);
      ctx.font = `18px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = [
        "BATTLESHIP WAR — RULES", "",
        "Place your fleet on the 10x10 grid.",
        "Take turns firing at the enemy grid.",
        "Hit = red marker, Miss = white dot.",
        "Sink all enemy ships to win!", "",
        "Use arrow keys + Enter to fire.",
        "R to rotate ships during placement.", "",
        "CLAUDE AI uses Anthropic's Claude",
        "to reason about each shot.", "",
        "Click anywhere to close.",
      ];
      lines.forEach((l, i) => ctx.fillText(l, cx, H / 2 - 140 + i * 26));
    }
  }

  onMouseMove(x: number, y: number): void {
    this.mx = x;
    this.my = y;
  }

  onMouseDown(x: number, y: number): void {
    // Close overlay
    if (this.showInfo) {
      this.showInfo = false;
      return;
    }
    // Help button
    if (x < 60 && y < 50) {
      this.showInfo = true;
      return;
    }
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
    if (this.inRect(x, y, cx - 180 - 130, 160, 260, 320)) {
      this.selectMode("classic");
    }
    // Advanced tile
    if (this.inRect(x, y, cx + 180 - 130, 160, 260, 320)) {
      this.selectMode("advanced");
    }

    // AI toggle buttons
    const toggleY = 550;
    const tbW = 180;
    const gap = 20;
    const classicX = cx - gap / 2 - tbW;
    const claudeX = cx + gap / 2;

    if (this.inRect(x, y, classicX, toggleY, tbW, 36)) {
      this.useLlm = false;
      this.engine.useLlm = false;
    }
    if (this.inRect(x, y, claudeX, toggleY, tbW, 36)) {
      this.useLlm = true;
      this.engine.useLlm = true;
    }

    // Difficulty buttons
    const difficulties: Difficulty[] = ["easy", "normal", "hard"];
    const btnW = 120;
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * 16;
    let bx = cx - totalW / 2;
    for (const diff of difficulties) {
      if (this.inRect(x, y, bx, 650, btnW, 36)) {
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
    this.engine.useLlm = this.useLlm;
    this.engine.switchScene(SCENES.PLACEMENT);
  }

  private drawAIToggle(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("AI OPPONENT", cx, y);

    const tbW = 180;
    const gap = 20;
    const classicX = cx - gap / 2 - tbW;
    const claudeX = cx + gap / 2;
    const btnY = y + 30;
    const btnH = 36;

    // Classic AI button
    const classicSelected = !this.useLlm;
    const classicHover = this.inRect(this.mx, this.my, classicX, btnY, tbW, btnH);
    ctx.fillStyle = classicSelected ? hex(C.GREEN) : (classicHover ? hex(C.DIM_GREEN) : hex(C.DARK_GREEN));
    ctx.beginPath();
    ctx.roundRect(classicX, btnY, tbW, btnH, 6);
    ctx.fill();
    if (classicSelected) {
      ctx.strokeStyle = hex(C.GREEN);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = classicSelected ? "#000" : hex(C.GREEN);
    ctx.font = `13px ${FONT}`;
    ctx.fillText("CLASSIC AI", classicX + tbW / 2, btnY + btnH / 2);

    // Claude AI button
    const claudeSelected = this.useLlm;
    const claudeHover = this.inRect(this.mx, this.my, claudeX, btnY, tbW, btnH);

    // Purple/blue gradient for Claude
    if (claudeSelected) {
      const grad = ctx.createLinearGradient(claudeX, btnY, claudeX + tbW, btnY);
      grad.addColorStop(0, "#7c3aed");
      grad.addColorStop(1, "#a855f7");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = claudeHover ? "#3b1f6e" : "#2a1550";
    }
    ctx.beginPath();
    ctx.roundRect(claudeX, btnY, tbW, btnH, 6);
    ctx.fill();
    if (claudeSelected) {
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = claudeSelected ? "#fff" : "#a855f7";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("CLAUDE AI", claudeX + tbW / 2, btnY + btnH / 2);

    // Description below
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = hex(C.DIM_GREEN);
    if (this.useLlm) {
      ctx.fillStyle = "#a855f7";
      ctx.fillText("Powered by Claude Sonnet — thinks about each move", cx, btnY + btnH + 16);
    } else {
      ctx.fillText("Algorithmic opponent — fast & offline", cx, btnY + btnH + 16);
    }
  }

  private drawDifficultySelector(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    ctx.fillText("DIFFICULTY", cx, y);

    const difficulties: { key: Difficulty; label: string; desc: string; descLlm: string }[] = [
      { key: "easy", label: "EASY", desc: "Random shots", descLlm: "Casual strategy" },
      { key: "normal", label: "NORMAL", desc: "Hunt & target", descLlm: "Hunt & target" },
      { key: "hard", label: "HARD", desc: "Parity strategy", descLlm: "Expert analysis" },
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
      ctx.fillText(this.useLlm ? d.descLlm : d.desc, bx + btnW / 2, y + 80);

      bx += btnW + 16;
    });
  }

  private drawTile(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    title: string, desc: string, ships: number[],
  ): void {
    const w = 260, h = 320;
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
    ctx.fillStyle = "rgba(0,60,0,0.7)";
    ships.forEach((len, i) => {
      const sw = len * 20;
      ctx.beginPath();
      ctx.roundRect(x - sw / 2 - 30, y + 60 + i * 24, sw, 14, 3);
      ctx.fill();

      ctx.font = `9px ${FONT}`;
      ctx.fillStyle = hex(C.GREEN);
      ctx.textAlign = "left";
      ctx.fillText(shipNames[i] || "", x - sw / 2 + sw - 20, y + 67 + i * 24);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,60,0,0.7)";
    });

    // Description
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = hex(C.GREEN);
    desc.split("\n").forEach((line, i) => {
      ctx.fillText(line, x, y + h - 55 + i * 16);
    });
  }

  private inRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
