import {
  CellState,
  Coordinate,
  FLEET_CONFIG,
  GRID_SIZE,
  Orientation,
  Ship,
  ShipPlacement,
  ShotResult,
} from "./types";

// Serialize a coordinate to a string key
export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

// Create an empty grid
export function createEmptyGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "empty" as CellState)
  );
}

// Get the cells a ship would occupy given a placement
export function getShipCells(placement: ShipPlacement): Coordinate[] {
  const cells: Coordinate[] = [];
  for (let i = 0; i < placement.length; i++) {
    const row =
      placement.orientation === "vertical"
        ? placement.startRow + i
        : placement.startRow;
    const col =
      placement.orientation === "horizontal"
        ? placement.startCol + i
        : placement.startCol;
    cells.push({ row, col });
  }
  return cells;
}

// Check if a placement is valid (within bounds and no overlap)
export function isValidPlacement(
  placement: ShipPlacement,
  grid: CellState[][]
): boolean {
  const cells = getShipCells(placement);

  for (const cell of cells) {
    // Check bounds
    if (
      cell.row < 0 ||
      cell.row >= GRID_SIZE ||
      cell.col < 0 ||
      cell.col >= GRID_SIZE
    ) {
      return false;
    }
    // Check overlap
    if (grid[cell.row][cell.col] !== "empty") {
      return false;
    }
  }

  return true;
}

// Place a ship on the grid and return the Ship object
export function placeShip(
  placement: ShipPlacement,
  grid: CellState[][]
): Ship {
  const cells = getShipCells(placement);

  for (const cell of cells) {
    grid[cell.row][cell.col] = "ship";
  }

  return {
    name: placement.name,
    length: placement.length,
    cells,
    orientation: placement.orientation,
    hitCells: new Set<string>(),
    isSunk: false,
  };
}

// Randomly place all ships for AI
export function placeShipsRandomly(): {
  grid: CellState[][];
  ships: Ship[];
} {
  const grid = createEmptyGrid();
  const ships: Ship[] = [];

  for (const config of FLEET_CONFIG) {
    let placed = false;
    while (!placed) {
      const orientation: Orientation =
        Math.random() < 0.5 ? "horizontal" : "vertical";
      const maxRow =
        orientation === "vertical"
          ? GRID_SIZE - config.length
          : GRID_SIZE - 1;
      const maxCol =
        orientation === "horizontal"
          ? GRID_SIZE - config.length
          : GRID_SIZE - 1;

      const startRow = Math.floor(Math.random() * (maxRow + 1));
      const startCol = Math.floor(Math.random() * (maxCol + 1));

      const placement: ShipPlacement = {
        name: config.name,
        length: config.length,
        startRow,
        startCol,
        orientation,
      };

      if (isValidPlacement(placement, grid)) {
        const ship = placeShip(placement, grid);
        ships.push(ship);
        placed = true;
      }
    }
  }

  return { grid, ships };
}

// Process a shot on a target grid/ships
export function processShot(
  coordinate: Coordinate,
  targetGrid: CellState[][],
  targetShips: Ship[]
): ShotResult {
  const { row, col } = coordinate;
  const cellValue = targetGrid[row][col];

  if (cellValue === "ship") {
    targetGrid[row][col] = "hit";

    // Find which ship was hit
    const key = coordKey(row, col);
    for (const ship of targetShips) {
      const isPartOfShip = ship.cells.some(
        (c) => c.row === row && c.col === col
      );
      if (isPartOfShip) {
        ship.hitCells.add(key);
        if (ship.hitCells.size === ship.length) {
          ship.isSunk = true;
          return { coordinate, result: "hit", sunkShip: ship.name };
        }
        break;
      }
    }

    return { coordinate, result: "hit" };
  } else {
    targetGrid[row][col] = "miss";
    return { coordinate, result: "miss" };
  }
}

// Check if all ships are sunk
export function allShipsSunk(ships: Ship[]): boolean {
  return ships.every((ship) => ship.isSunk);
}

// Check if a coordinate has already been targeted
export function isAlreadyTargeted(
  row: number,
  col: number,
  shotHistory: CellState[][]
): boolean {
  return shotHistory[row][col] !== "empty";
}

// Get total number of ships expected
export function getTotalShipCount(): number {
  return FLEET_CONFIG.length;
}

// Get total number of ship cells
export function getTotalShipCells(): number {
  return FLEET_CONFIG.reduce((sum, ship) => sum + ship.length, 0);
}
