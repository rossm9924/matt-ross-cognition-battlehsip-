import { CANVAS_W, CANVAS_H, FONT, hex, C, SCENES } from "./config";
import { GameMode, AIMode } from "./types";
import { Board } from "./Board";
import { AudioManager } from "./AudioManager";
import { CostTracker } from "./CostTracker";

export interface GameScene {
  enter(engine: Engine): void;
  leave?(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onMouseMove?(x: number, y: number): void;
  onMouseDown?(x: number, y: number, button: number): void;
  onKeyDown?(key: string): void;
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = CANVAS_W;
  height = CANVAS_H;
  audio = new AudioManager();

  gameMode: GameMode = "classic";
  aiMode: AIMode = "fast";
  costTracker: CostTracker | null = null;
  playerBoard: Board | null = null;
  score = 0;
  playerWon = false;
  showInfo = false;
  fastMode = false;

  private scenes = new Map<string, GameScene>();
  private current: GameScene | null = null;
  private currentName = "";
  private animId = 0;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.objectFit = "contain";
    this.canvas.style.display = "block";
    this.canvas.style.background = "#000";
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "Battleship War — Naval Combat Simulator. Use mouse to interact.");
    this.canvas.tabIndex = 0;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    this.canvas.addEventListener("mousemove", this.onMM);
    this.canvas.addEventListener("mousedown", this.onMD);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", this.onKD);
  }

  register(name: string, scene: GameScene): void {
    this.scenes.set(name, scene);
  }

  switchScene(name: string): void {
    this.current?.leave?.();
    this.current = this.scenes.get(name) ?? null;
    this.currentName = name;
    this.showInfo = false;
    this.current?.enter(this);
  }

  start(sceneName: string): void {
    this.switchScene(sceneName);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy(): void {
    cancelAnimationFrame(this.animId);
    this.canvas.removeEventListener("mousemove", this.onMM);
    this.canvas.removeEventListener("mousedown", this.onMD);
    document.removeEventListener("keydown", this.onKD);
    this.canvas.remove();
  }

  private coords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const aspect = this.width / this.height;
    const rAspect = rect.width / rect.height;
    let rw: number, rh: number, ox: number, oy: number;
    if (rAspect > aspect) {
      rh = rect.height;
      rw = rh * aspect;
      ox = (rect.width - rw) / 2;
      oy = 0;
    } else {
      rw = rect.width;
      rh = rw / aspect;
      ox = 0;
      oy = (rect.height - rh) / 2;
    }
    return {
      x: ((e.clientX - rect.left - ox) / rw) * this.width,
      y: ((e.clientY - rect.top - oy) / rh) * this.height,
    };
  }

  private onMM = (e: MouseEvent) => {
    const { x, y } = this.coords(e);
    this.current?.onMouseMove?.(x, y);
  };

  private onMD = (e: MouseEvent) => {
    const { x, y } = this.coords(e);
    if (this.handleTopBarClick(x, y)) return;
    this.current?.onMouseDown?.(x, y, e.button);
  };

  private onKD = (e: KeyboardEvent) => {
    this.current?.onKeyDown?.(e.key);
  };

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.current?.update(dt);
    this.current?.render(this.ctx);

    // Persistent top bar on non-title screens
    if (this.currentName !== SCENES.TITLE) {
      this.renderTopBar(this.ctx);
    }

    // Info overlay
    if (this.showInfo) {
      this.renderInfoOverlay(this.ctx);
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  handleTopBarClick(x: number, y: number): boolean {
    if (this.currentName === SCENES.TITLE) return false;

    // Info overlay dismissal
    if (this.showInfo) {
      this.showInfo = false;
      return true;
    }

    // ? button (top-left)
    if (x < 60 && y < 50) {
      this.showInfo = true;
      return true;
    }

    // Mute button (top-right)
    if (x > CANVAS_W - 70 && y < 50) {
      this.audio.toggleMute();
      return true;
    }

    // QUIT button
    if (x >= 70 && x <= 150 && y < 50) {
      this.switchScene(SCENES.TITLE);
      return true;
    }

    // FAST mode toggle
    if (x >= CANVAS_W - 130 && x <= CANVAS_W - 70 && y < 50) {
      this.fastMode = !this.fastMode;
      return true;
    }

    return false;
  }

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    // ? icon
    ctx.fillStyle = "#222";
    ctx.fillRect(14, 16, 32, 28);
    ctx.fillStyle = hex(C.GREEN);
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 30, 30);

    // QUIT button
    ctx.fillStyle = "#222";
    ctx.fillRect(70, 16, 70, 28);
    ctx.fillStyle = hex(C.HIT_RED);
    ctx.font = `12px ${FONT}`;
    ctx.fillText("QUIT", 105, 30);

    // FAST toggle
    ctx.fillStyle = this.fastMode ? hex(C.GREEN) : "#222";
    ctx.fillRect(CANVAS_W - 126, 16, 54, 28);
    ctx.fillStyle = this.fastMode ? "#000" : hex(C.DIM_GREEN);
    ctx.font = `11px ${FONT}`;
    ctx.fillText("FAST", CANVAS_W - 99, 30);

    // Mute icon
    ctx.fillStyle = "#222";
    ctx.fillRect(CANVAS_W - 56, 16, 32, 28);
    ctx.font = "20px sans-serif";
    ctx.fillText(this.audio.muted ? "🔇" : "🔊", CANVAS_W - 40, 30);
  }

  private renderInfoOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = hex(C.GREEN);
    ctx.font = `18px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const lines = [
      "BATTLESHIP WAR — RULES", "",
      "Place your fleet on the 14×14 grid.",
      "Take turns firing at the enemy grid.",
      "Hit = red marker, Miss = white dot.",
      "Sink all enemy ships to win!", "",
      "Click anywhere to close.",
    ];
    lines.forEach((l, i) => ctx.fillText(l, cx, cy - 100 + i * 30));
  }
}
