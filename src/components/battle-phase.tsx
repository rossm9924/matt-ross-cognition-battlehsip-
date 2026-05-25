"use client";

import { GameGrid } from "@/components/game-grid";
import { ShipStatus } from "@/components/ship-status";
import { Card, CardContent } from "@/components/ui/card";
import { GameState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BattlePhaseProps {
  gameState: GameState;
  onPlayerShoot: (row: number, col: number) => void;
}

export function BattlePhase({ gameState, onPlayerShoot }: BattlePhaseProps) {
  const lastResult = gameState.lastShotResult;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Status bar */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Battle</h2>
        <p className="text-sm text-muted-foreground">
          Difficulty: <span className="capitalize font-medium">{gameState.difficulty}</span>
        </p>
        <div
          className={cn(
            "text-sm font-medium px-4 py-2 rounded-md",
            lastResult?.result === "hit"
              ? "bg-red-500/10 text-red-600"
              : lastResult?.result === "miss"
                ? "bg-slate-500/10 text-slate-600"
                : "bg-blue-500/10 text-blue-600",
            !gameState.isPlayerTurn && "animate-pulse"
          )}
        >
          {gameState.message}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Player's tracking grid (shows shots at AI) */}
        <div className="flex flex-col gap-4">
          <GameGrid
            grid={gameState.aiGrid}
            shotHistory={gameState.playerShotHistory}

            isInteractive={gameState.isPlayerTurn && !gameState.winner}
            onCellClick={onPlayerShoot}
            showShips={false}
            label="Enemy Waters (Click to Fire)"
          />
          <Card>
            <CardContent className="pt-4">
              <ShipStatus
                ships={gameState.aiShips}
                label="Enemy Fleet"
              />
            </CardContent>
          </Card>
        </div>

        {/* Player's own grid (shows their ships + AI hits) */}
        <div className="flex flex-col gap-4">
          <GameGrid
            grid={gameState.playerGrid}

            isInteractive={false}
            showShips={true}
            label="Your Fleet"
          />
          <Card>
            <CardContent className="pt-4">
              <ShipStatus
                ships={gameState.playerShips}
                label="Your Fleet Status"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
