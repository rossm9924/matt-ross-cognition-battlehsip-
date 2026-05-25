import {
  BOARD_SIZE,
  COLUMN_LABELS,
  Coord,
  Fleet,
  ShotRecord,
  coordKey,
} from "@/game/types";
import { cn } from "@/lib/utils";

interface BoardGridProps {
  fleet?: Fleet;
  shotsAgainst: ShotRecord[];
  onCellClick?: (c: Coord) => void;
  onCellHover?: (c: Coord | null) => void;
  preview?: { cells: Coord[]; valid: boolean };
  showShips?: boolean;
  label?: string;
  disabled?: boolean;
}

export function BoardGrid({
  fleet,
  shotsAgainst,
  onCellClick,
  onCellHover,
  preview,
  showShips = true,
  label,
  disabled = false,
}: BoardGridProps) {
  const shipCellSet = new Set<string>();
  if (fleet && showShips) {
    for (const s of fleet.ships) {
      for (const c of s.cells) shipCellSet.add(coordKey(c));
    }
  }
  const hitCellSet = new Set(
    shotsAgainst
      .filter((s) => s.result === "hit")
      .map((s) => coordKey(s.coord))
  );
  const missCellSet = new Set(
    shotsAgainst
      .filter((s) => s.result === "miss")
      .map((s) => coordKey(s.coord))
  );
  const previewSet = new Set(preview?.cells.map(coordKey));

  return (
    <div className="inline-block">
      {label && (
        <div className="mb-2 text-center text-sm font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <div
        className="grid gap-[2px] rounded-md bg-slate-200 p-2 dark:bg-slate-800"
        style={{
          gridTemplateColumns: `auto repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => onCellHover?.(null)}
      >
        <div />
        {COLUMN_LABELS.map((l) => (
          <div
            key={l}
            className="flex h-6 items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            {l}
          </div>
        ))}
        {Array.from({ length: BOARD_SIZE }).map((_, row) => (
          <RowCells
            key={row}
            row={row}
            shipCellSet={shipCellSet}
            hitCellSet={hitCellSet}
            missCellSet={missCellSet}
            previewSet={previewSet}
            previewValid={preview?.valid ?? true}
            onCellClick={onCellClick}
            onCellHover={onCellHover}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface RowCellsProps {
  row: number;
  shipCellSet: Set<string>;
  hitCellSet: Set<string>;
  missCellSet: Set<string>;
  previewSet: Set<string>;
  previewValid: boolean;
  onCellClick?: (c: Coord) => void;
  onCellHover?: (c: Coord | null) => void;
  disabled: boolean;
}

function RowCells(p: RowCellsProps) {
  return (
    <>
      <div className="flex w-6 items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
        {p.row + 1}
      </div>
      {Array.from({ length: BOARD_SIZE }).map((_, col) => {
        const key = `${p.row}-${col}`;
        const isShip = p.shipCellSet.has(key);
        const isHit = p.hitCellSet.has(key);
        const isMiss = p.missCellSet.has(key);
        const isPreview = p.previewSet.has(key);
        const clickable = !!p.onCellClick && !p.disabled && !isHit && !isMiss;
        return (
          <button
            key={key}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && p.onCellClick?.({ row: p.row, col })}
            onMouseEnter={() => p.onCellHover?.({ row: p.row, col })}
            className={cn(
              "flex aspect-square h-8 w-8 items-center justify-center text-xs font-bold transition-colors",
              "rounded-sm border border-slate-300/60 dark:border-slate-700/60",
              !isShip &&
                !isHit &&
                !isMiss &&
                !isPreview &&
                "bg-sky-50 hover:bg-sky-100 dark:bg-slate-900 dark:hover:bg-slate-700",
              isShip && !isHit && "bg-slate-500 dark:bg-slate-400",
              isHit && "bg-red-500 text-white",
              isMiss &&
                "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-200",
              isPreview && p.previewValid && "bg-emerald-400/70",
              isPreview && !p.previewValid && "bg-red-400/70",
              clickable && "hover:ring-2 hover:ring-primary",
              !clickable && "cursor-not-allowed"
            )}
          >
            {isHit ? "✕" : isMiss ? "•" : ""}
          </button>
        );
      })}
    </>
  );
}
