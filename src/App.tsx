import { useState } from "react";
import { Menu } from "./components/Menu";
import { Placement } from "./components/Placement";
import { Game } from "./components/Game";
import { Difficulty, Fleet, GamePhase } from "./game/types";
import { randomPlaceFleet } from "./game/board";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerFleet, setPlayerFleet] = useState<Fleet | null>(null);
  const [aiFleet, setAiFleet] = useState<Fleet | null>(null);

  const startGame = (d: Difficulty) => {
    setDifficulty(d);
    setPhase("placement");
  };

  const confirmPlacement = (fleet: Fleet) => {
    setPlayerFleet(fleet);
    setAiFleet(randomPlaceFleet());
    setPhase("playing");
  };

  const exitGame = () => {
    setPhase("menu");
    setPlayerFleet(null);
    setAiFleet(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <header className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight">
          Battleship <span className="text-primary">AI</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Single-player Battleship against three AI difficulty levels.
        </p>
      </header>
      <main>
        {phase === "menu" && <Menu onStart={startGame} />}
        {phase === "placement" && (
          <Placement
            onConfirm={confirmPlacement}
            onBack={() => setPhase("menu")}
          />
        )}
        {phase === "playing" && playerFleet && aiFleet && (
          <Game
            playerFleet={playerFleet}
            aiFleet={aiFleet}
            difficulty={difficulty}
            onExit={exitGame}
          />
        )}
      </main>
    </div>
  );
}
