import { SCENES } from "../config";
import { Engine, GameScene } from "../Engine";

export class BootScene implements GameScene {
  private engine!: Engine;

  enter(engine: Engine): void {
    this.engine = engine;
    document.fonts.load('16px "Black Ops One"').then(() => {
      this.engine.switchScene(SCENES.TITLE);
    }).catch(() => {
      this.engine.switchScene(SCENES.TITLE);
    });
  }

  update(): void {}

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = "#33FF33";
    ctx.font = '20px monospace';
    ctx.textAlign = "center";
    ctx.fillText("Loading...", 640, 400);
  }
}
