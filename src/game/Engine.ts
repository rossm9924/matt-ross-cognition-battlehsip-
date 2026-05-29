import { CANVAS_W, CANVAS_H } from "./config";
import { GameMode, AIMode, Difficulty } from "./types";
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
  difficulty: Difficulty = "normal";
  playerBoard: Board | null = null;
  score = 0;
  playerWon = false;

  // Stats for game over (#15)
  shotsFired = 0;
  shotsHit = 0;
  shipsLost = 0;
  gameStartTime = 0;
  gameEndTime = 0;

  private scenes = new Map<string, GameScene>();
  private current: GameScene | null = null;
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
    this.current?.enter(this);
  }

  start(sceneName: string): void {
    this.switchScene(sceneName);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  resetStats(): void {
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.shipsLost = 0;
    this.gameStartTime = Date.now();
    this.gameEndTime = 0;
    this.score = 0;
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
    this.animId = requestAnimationFrame(this.loop);
  };
}
