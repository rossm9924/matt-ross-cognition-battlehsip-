"use client";

import { GameGrid } from "@/components/game-grid";
import { ShipStatus } from "@/components/ship-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FLEET_CONFIG, GameState, Orientation } from "@/lib/types";

interface SetupPhaseProps {
  gameState: GameState;
  currentShipIndex: number;
  placementOrientation: Orientation;
  hoveredCells: Set<string>;
  isValidHover: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  onCellLeave: () => void;
  onToggleOrientation: () => void;
  onRandomize: () => void;
  onReset: () => void;
  onStartBattle: () => void;
}

export function SetupPhase({
  gameState,
  currentShipIndex,
  placementOrientation,
  hoveredCells,
  isValidHover,
  onCellClick,
  onCellHover,
  onCellLeave,
  onToggleOrientation,
  onRandomize,
  onReset,
  onStartBattle,
}: SetupPhaseProps) {
  const allPlaced = currentShipIndex >= FLEET_CONFIG.length;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Ship Placement</h2>
        <p className="text-sm text-muted-foreground">
          Difficulty: <span className="capitalize font-medium">{gameState.difficulty}</span>
        </p>
        <p className="text-sm text-muted-foreground">{gameState.message}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <GameGrid
          grid={gameState.playerGrid}

          isInteractive={!allPlaced}
          hoveredCells={hoveredCells}
          isValidHover={isValidHover}
          onCellClick={onCellClick}
          onCellHover={onCellHover}
          onCellLeave={onCellLeave}
          showShips={true}
          label="Your Grid"
        />

        <Card className="w-56">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!allPlaced && (
              <>
                <div className="text-xs text-muted-foreground">
                  Placing:{" "}
                  <span className="font-medium text-foreground">
                    {FLEET_CONFIG[currentShipIndex].name}
                  </span>{" "}
                  ({FLEET_CONFIG[currentShipIndex].length} cells)
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onToggleOrientation}
                >
                  Rotate ({placementOrientation === "horizontal" ? "H" : "V"})
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={onRandomize}
            >
              Random Placement
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onReset}
            >
              Reset
            </Button>
            {allPlaced && (
              <Button
                size="sm"
                className="w-full"
                onClick={onStartBattle}
              >
                Start Battle
              </Button>
            )}

            <div className="border-t pt-3">
              <ShipStatus
                ships={gameState.playerShips}
                label="Your Fleet"

              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
