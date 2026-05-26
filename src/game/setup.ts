import { SCENES } from "./config";
import { Engine } from "./Engine";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { ModeSelectScene } from "./scenes/ModeSelectScene";
import { PlacementScene } from "./scenes/PlacementScene";
import { BattleScene } from "./scenes/BattleScene";
import { GameOverScene } from "./scenes/GameOverScene";

export function createGame(container: HTMLElement): Engine {
  const engine = new Engine(container);
  engine.register("boot", new BootScene());
  engine.register(SCENES.TITLE, new TitleScene());
  engine.register(SCENES.MODE, new ModeSelectScene());
  engine.register(SCENES.PLACEMENT, new PlacementScene());
  engine.register(SCENES.BATTLE, new BattleScene());
  engine.register(SCENES.GAMEOVER, new GameOverScene());
  engine.start("boot");
  return engine;
}
