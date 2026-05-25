"use client";

import { CellState, COLUMN_LABELS, GRID_SIZE } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GameGridProps {
  grid: CellState[][];
  shotHistory?: CellState[][];
  isInteractive: boolean;
  hoveredCells?: Set<string>;
  isValidHover?: boolean;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  showShips?: boolean;
  label: string;
}

export function GameGrid({
  grid,
  shotHistory,
  isInteractive,
  hoveredCells,
  isValidHover,
  onCellClick,
  onCellHover,
  onCellLeave,
  showShips = true,
  label,
}: GameGridProps) {
  const getCellDisplay = (row: number, col: number): string => {
    if (shotHistory) {
      const shotState = shotHistory[row][col];
      if (shotState === "hit") return "hit";
      if (shotState === "miss") return "miss";
      return "unknown";
    }

    const cellState = grid[row][col];
    if (cellState === "hit") return "hit";
    if (cellState === "miss") return "miss";
    if (cellState === "ship" && showShips) return "ship";
    return "empty";
  };

  const isHovered = (row: number, col: number): boolean => {
    return hoveredCells?.has(`${row},${col}`) ?? false;
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold mb-2 text-foreground/80">{label}</h3>
      <div className="inline-block">
        {/* Column headers */}
        <div className="flex">
          <div className="w-7 h-7" />
          {COLUMN_LABELS.map((label) => (
            <div
              key={label}
              className="w-8 h-7 flex items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <div key={row} className="flex">
            {/* Row label */}
            <div className="w-7 h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
              {row + 1}
            </div>

            {/* Cells */}
            {Array.from({ length: GRID_SIZE }, (_, col) => {
              const display = getCellDisplay(row, col);
              const hovered = isHovered(row, col);

              return (
                <button
                  key={`${row}-${col}`}
                  className={cn(
                    "w-8 h-8 border border-border/50 transition-colors duration-100 text-xs font-bold",
                    // Base states
                    display === "empty" && "bg-blue-950/30",
                    display === "unknown" && "bg-blue-950/30",
                    display === "ship" && "bg-blue-600/60",
                    display === "hit" && "bg-red-600 text-white",
                    display === "miss" && "bg-slate-400/40",
                    // Hover preview for placement
                    hovered && isValidHover && "bg-green-500/50",
                    hovered && !isValidHover && "bg-red-500/50",
                    // Interactive cursor
                    isInteractive &&
                      display !== "hit" &&
                      display !== "miss" &&
                      "cursor-crosshair hover:brightness-125",
                    !isInteractive && "cursor-default"
                  )}
                  onClick={() => {
                    if (isInteractive && onCellClick) {
                      onCellClick(row, col);
                    }
                  }}
                  onMouseEnter={() => {
                    if (onCellHover) {
                      onCellHover(row, col);
                    }
                  }}
                  onMouseLeave={() => {
                    if (onCellLeave) {
                      onCellLeave();
                    }
                  }}
                  disabled={!isInteractive}
                  aria-label={`${COLUMN_LABELS[col]}${row + 1}`}
                >
                  {display === "hit" && "X"}
                  {display === "miss" && "\u2022"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
