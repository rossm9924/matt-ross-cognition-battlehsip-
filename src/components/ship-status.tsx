"use client";

import { Badge } from "@/components/ui/badge";
import { FLEET_CONFIG, Ship } from "@/lib/types";

interface ShipStatusProps {
  ships: Ship[];
  label: string;
}

export function ShipStatus({ ships, label }: ShipStatusProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground/80">{label}</h4>
      <div className="space-y-1">
        {FLEET_CONFIG.map((config) => {
          const ship = ships.find((s) => s.name === config.name);
          const isSunk = ship?.isSunk ?? false;
          const hitsOnShip = ship?.hitCells.size ?? 0;

          return (
            <div
              key={config.name}
              className="flex items-center justify-between gap-2"
            >
              <span
                className={`text-xs ${isSunk ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {config.name}
              </span>
              <div className="flex items-center gap-1">
                {/* Ship length indicator */}
                <div className="flex gap-0.5">
                  {Array.from({ length: config.length }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-sm ${
                        ship
                          ? i < hitsOnShip
                            ? "bg-red-500"
                            : isSunk
                              ? "bg-muted"
                              : "bg-blue-500"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                {isSunk && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                    SUNK
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
