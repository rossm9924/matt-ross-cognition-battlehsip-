import { useEffect, useState } from "react";
import { BoardGrid } from "./BoardGrid";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { applyShot, hasBeenTargeted, recordShotTaken } from "@/game/board";
import { chooseAIShot } from "@/game/ai";
import {
  Coord,
  Difficulty,
  Fleet,
  Owner,
  PlayerState,
  ShipName,
  coordLabel,
  FLEET_SPEC,
} from "@/game/types";

interface GameProps {
  playerFleet: Fleet;
  aiFleet: Fleet;
  difficulty: Difficulty;
  onExit: () => void;
}

export function Game({ playerFleet, aiFleet, difficulty, onExit }: GameProps) {
  const [player, setPlayer] = useState<PlayerState>({
    fleet: playerFleet,
    shotsTaken: [],
  });
  const [ai, setAi] = useState<PlayerState>({
    fleet: aiFleet,
    shotsTaken: [],
  });
  const [turn, setTurn] = useState<Owner>("player");
  const [winner, setWinner] = useState<Owner | null>(null);
  const [log, setLog] = useState<string[]>([
    `Game start. Difficulty: ${difficulty}. You go first.`,
  ]);
  const [aiThinking, setAiThinking] = useState(false);

  const handlePlayerShot = (c: Coord) => {
    if (turn !== "player" || winner) return;
    if (hasBeenTargeted(player.shotsTaken, c)) return;

    const outcome = applyShot(ai.fleet, c);
    setAi((prev) => ({ ...prev, fleet: outcome.fleet }));
    setPlayer((prev) => ({
      ...prev,
      shotsTaken: recordShotTaken(prev.shotsTaken, c, outcome),
    }));
    const lines: string[] = [
      `You fired at ${coordLabel(c)}: ${outcome.result.toUpperCase()}.`,
    ];
    if (outcome.sunkShip) {
      lines.push(`You sank the AI's ${outcome.sunkShip}!`);
    }
    if (outcome.allSunk) {
      lines.push("Victory — all AI ships destroyed.");
      setLog((l) => [...lines, ...l]);
      setWinner("player");
      return;
    }
    setLog((l) => [...lines, ...l]);
    setTurn("ai");
  };

  // AI turn effect
  useEffect(() => {
    if (turn !== "ai" || winner) return;
    setAiThinking(true);
    const t = setTimeout(() => {
      const c = chooseAIShot(difficulty, ai.shotsTaken);
      const outcome = applyShot(player.fleet, c);
      setPlayer((prev) => ({ ...prev, fleet: outcome.fleet }));
      setAi((prev) => ({
        ...prev,
        shotsTaken: recordShotTaken(prev.shotsTaken, c, outcome),
      }));
      const lines: string[] = [
        `AI fired at ${coordLabel(c)}: ${outcome.result.toUpperCase()}.`,
      ];
      if (outcome.sunkShip) {
        lines.push(`The AI sank your ${outcome.sunkShip}!`);
      }
      if (outcome.allSunk) {
        lines.push("Defeat — your fleet has been destroyed.");
        setLog((l) => [...lines, ...l]);
        setWinner("ai");
        setAiThinking(false);
        return;
      }
      setLog((l) => [...lines, ...l]);
      setAiThinking(false);
      setTurn("player");
    }, 600);
    return () => clearTimeout(t);
  }, [turn, winner, difficulty, ai.shotsTaken, player.fleet]);

  return (
    <div className="mx-auto max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Battle in progress</CardTitle>
              <CardDescription>
                Difficulty:{" "}
                <span className="font-medium capitalize">{difficulty}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {winner ? (
                <Badge
                  variant={winner === "player" ? "default" : "destructive"}
                  className="text-sm"
                >
                  {winner === "player" ? "You won!" : "AI won"}
                </Badge>
              ) : (
                <Badge variant={turn === "player" ? "default" : "secondary"}>
                  {turn === "player"
                    ? "Your turn"
                    : aiThinking
                      ? "AI thinking…"
                      : "AI turn"}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={onExit}>
                Quit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col items-center">
              <BoardGrid
                shotsAgainst={player.shotsTaken}
                onCellClick={
                  turn === "player" && !winner ? handlePlayerShot : undefined
                }
                label="AI fleet (your shots)"
                disabled={turn !== "player" || !!winner}
              />
              <FleetStatus
                shipsSunkByYou={uniqueSunk(player.shotsTaken)}
                title="AI ships sunk"
              />
            </div>
            <div className="flex flex-col items-center">
              <BoardGrid
                fleet={player.fleet}
                shotsAgainst={ai.shotsTaken}
                label="Your fleet (AI shots)"
              />
              <FleetStatus
                shipsSunkByYou={uniqueSunk(ai.shotsTaken)}
                title="Your ships sunk"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Battle log
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
              {log.map((line, i) => (
                <div key={i} className="py-0.5 font-mono">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function uniqueSunk(shots: { sunkShip?: ShipName }[]): ShipName[] {
  const out: ShipName[] = [];
  const seen = new Set<string>();
  for (const s of shots) {
    if (s.sunkShip && !seen.has(s.sunkShip)) {
      seen.add(s.sunkShip);
      out.push(s.sunkShip);
    }
  }
  return out;
}

function FleetStatus({
  shipsSunkByYou,
  title,
}: {
  shipsSunkByYou: ShipName[];
  title: string;
}) {
  return (
    <div className="mt-4 w-full max-w-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({shipsSunkByYou.length} / {FLEET_SPEC.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {FLEET_SPEC.map((s) => {
          const sunk = shipsSunkByYou.includes(s.name);
          return (
            <Badge
              key={s.name}
              variant={sunk ? "destructive" : "outline"}
              className="text-xs"
            >
              {s.name}
              {sunk ? " ✕" : ""}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
