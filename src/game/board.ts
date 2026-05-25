import {
  BOARD_SIZE,
  Coord,
  FLEET_SPEC,
  Fleet,
  Orientation,
  PlayerState,
  Ship,
  ShipName,
  ShotRecord,
  coordKey,
  inBounds,
} from "./types";

export function shipCells(
  start: Coord,
  length: number,
  orientation: Orientation
): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < length; i++) {
    cells.push({
      row: orientation === "vertical" ? start.row + i : start.row,
      col: orientation === "horizontal" ? start.col + i : start.col,
    });
  }
  return cells;
}

export function canPlaceShip(
  fleet: Fleet,
  cells: Coord[]
): { ok: true } | { ok: false; reason: string } {
  for (const c of cells) {
    if (!inBounds(c)) return { ok: false, reason: "Out of bounds" };
  }
  const occupied = new Set<string>();
  for (const s of fleet.ships) {
    for (const c of s.cells) occupied.add(coordKey(c));
  }
  for (const c of cells) {
    if (occupied.has(coordKey(c))) return { ok: false, reason: "Overlap" };
  }
  return { ok: true };
}

export function placeShip(
  fleet: Fleet,
  name: ShipName,
  length: number,
  start: Coord,
  orientation: Orientation
): { ok: true; fleet: Fleet } | { ok: false; reason: string } {
  const cells = shipCells(start, length, orientation);
  const check = canPlaceShip(fleet, cells);
  if (!check.ok) return check;
  const ship: Ship = {
    name,
    length,
    cells,
    hits: new Array(length).fill(false),
  };
  return {
    ok: true,
    fleet: { ...fleet, ships: [...fleet.ships, ship] },
  };
}

export function emptyFleet(): Fleet {
  return { ships: [], shotsReceived: [] };
}

export function emptyPlayerState(): PlayerState {
  return { fleet: emptyFleet(), shotsTaken: [] };
}

export function randomPlaceFleet(): Fleet {
  let fleet = emptyFleet();
  for (const spec of FLEET_SPEC) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const orientation: Orientation =
        Math.random() < 0.5 ? "horizontal" : "vertical";
      const maxRow =
        orientation === "vertical" ? BOARD_SIZE - spec.length : BOARD_SIZE - 1;
      const maxCol =
        orientation === "horizontal"
          ? BOARD_SIZE - spec.length
          : BOARD_SIZE - 1;
      const start: Coord = {
        row: Math.floor(Math.random() * (maxRow + 1)),
        col: Math.floor(Math.random() * (maxCol + 1)),
      };
      const result = placeShip(fleet, spec.name, spec.length, start, orientation);
      if (result.ok) {
        fleet = result.fleet;
        placed = true;
      }
    }
    if (!placed) {
      // Extremely unlikely; restart entirely
      return randomPlaceFleet();
    }
  }
  return fleet;
}

export interface ShotOutcome {
  result: "hit" | "miss";
  sunkShip?: ShipName;
  fleet: Fleet;
  allSunk: boolean;
}

export function applyShot(fleet: Fleet, coord: Coord): ShotOutcome {
  let didHit = false;
  let sunkShip: ShipName | undefined;
  const updatedShips: Ship[] = fleet.ships.map((s) => {
    const idx = s.cells.findIndex(
      (c) => c.row === coord.row && c.col === coord.col
    );
    if (idx === -1) return s;
    didHit = true;
    const newHits = s.hits.slice();
    newHits[idx] = true;
    const updated: Ship = { ...s, hits: newHits };
    if (newHits.every(Boolean) && !s.hits.every(Boolean)) {
      sunkShip = s.name;
    }
    return updated;
  });
  const record: ShotRecord = {
    coord,
    result: didHit ? "hit" : "miss",
    ...(sunkShip ? { sunkShip } : {}),
  };
  const allSunk =
    updatedShips.length > 0 && updatedShips.every((s) => s.hits.every(Boolean));
  return {
    result: didHit ? "hit" : "miss",
    sunkShip,
    fleet: {
      ships: updatedShips,
      shotsReceived: [...fleet.shotsReceived, record],
    },
    allSunk,
  };
}

export function hasBeenTargeted(
  shotsTaken: ShotRecord[],
  coord: Coord
): boolean {
  return shotsTaken.some(
    (s) => s.coord.row === coord.row && s.coord.col === coord.col
  );
}

export function recordShotTaken(
  shotsTaken: ShotRecord[],
  coord: Coord,
  outcome: ShotOutcome
): ShotRecord[] {
  return [
    ...shotsTaken,
    {
      coord,
      result: outcome.result,
      ...(outcome.sunkShip ? { sunkShip: outcome.sunkShip } : {}),
    },
  ];
}
