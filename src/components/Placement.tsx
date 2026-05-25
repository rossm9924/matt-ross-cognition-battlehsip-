import { useEffect, useMemo, useState } from "react";
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
import {
  canPlaceShip,
  emptyFleet,
  placeShip,
  randomPlaceFleet,
  shipCells,
} from "@/game/board";
import { Coord, FLEET_SPEC, Fleet, Orientation } from "@/game/types";
import { RotateCw, Shuffle, Trash2 } from "lucide-react";

interface PlacementProps {
  onConfirm: (fleet: Fleet) => void;
  onBack: () => void;
}

export function Placement({ onConfirm, onBack }: PlacementProps) {
  const [fleet, setFleet] = useState<Fleet>(emptyFleet());
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hoverStart, setHoverStart] = useState<Coord | null>(null);

  const nextShip = FLEET_SPEC[fleet.ships.length];
  const done = fleet.ships.length === FLEET_SPEC.length;

  const preview = useMemo(() => {
    if (!hoverStart || !nextShip || done) return undefined;
    const cells = shipCells(hoverStart, nextShip.length, orientation);
    const check = canPlaceShip(fleet, cells);
    return { cells, valid: check.ok };
  }, [hoverStart, nextShip, orientation, fleet, done]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") {
        setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCellClick = (c: Coord) => {
    if (!nextShip) return;
    const result = placeShip(
      fleet,
      nextShip.name,
      nextShip.length,
      c,
      orientation
    );
    if (result.ok) {
      setFleet(result.fleet);
    }
  };

  const handleRandom = () => setFleet(randomPlaceFleet());
  const handleReset = () => setFleet(emptyFleet());
  const handleRotate = () =>
    setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));

  return (
    <div className="mx-auto max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Place your fleet</CardTitle>
          <CardDescription>
            Click a cell to place your next ship. Press R or click Rotate to
            switch direction. Green preview means valid placement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div>
              <BoardGrid
                fleet={fleet}
                shotsAgainst={[]}
                onCellClick={done ? undefined : handleCellClick}
                onCellHover={setHoverStart}
                preview={preview}
                label="Your fleet grid"
                disabled={done}
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  disabled={done}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  Rotate ({orientation})
                </Button>
                <Button variant="outline" size="sm" onClick={handleRandom}>
                  <Shuffle className="mr-1 h-4 w-4" />
                  Auto-place
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={fleet.ships.length === 0}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Fleet
              </h3>
              <div className="space-y-2">
                {FLEET_SPEC.map((spec, idx) => {
                  const placed = idx < fleet.ships.length;
                  const isNext = idx === fleet.ships.length;
                  return (
                    <div
                      key={spec.name}
                      className={
                        "flex items-center justify-between rounded-md border p-3 " +
                        (isNext ? "border-primary bg-primary/5" : "")
                      }
                    >
                      <div>
                        <div className="font-medium">{spec.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Length {spec.length}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: spec.length }).map((_, i) => (
                            <div
                              key={i}
                              className={
                                "h-4 w-4 rounded-sm " +
                                (placed
                                  ? "bg-slate-500"
                                  : "bg-slate-200 dark:bg-slate-700")
                              }
                            />
                          ))}
                        </div>
                        {placed ? (
                          <Badge variant="secondary">Placed</Badge>
                        ) : isNext ? (
                          <Badge>Next</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!done}
                  onClick={() => onConfirm(fleet)}
                >
                  Start battle
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
