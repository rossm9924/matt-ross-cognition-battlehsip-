import { CellState, Coordinate, Difficulty, FLEET_CONFIG, GRID_SIZE, Ship } from "./types";
import { coordKey } from "./game-logic";

interface AIState {
  shotHistory: CellState[][];
  hitQueue: Coordinate[]; // adjacent cells to explore after a hit
  lastHits: Coordinate[]; // consecutive hits to determine ship direction
  huntDirection: "horizontal" | "vertical" | null;
}

export function createAIState(shotHistory: CellState[][]): AIState {
  return {
    shotHistory,
    hitQueue: [],
    lastHits: [],
    huntDirection: null,
  };
}

// Easy AI: purely random valid shots
function getEasyShot(shotHistory: CellState[][]): Coordinate | null {
  const available: Coordinate[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (shotHistory[row][col] === "empty") {
        available.push({ row, col });
      }
    }
  }
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Get valid adjacent cells
function getAdjacentCells(
  coord: Coordinate,
  shotHistory: CellState[][]
): Coordinate[] {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  return directions
    .map((d) => ({ row: coord.row + d.row, col: coord.col + d.col }))
    .filter(
      (c) =>
        c.row >= 0 &&
        c.row < GRID_SIZE &&
        c.col >= 0 &&
        c.col < GRID_SIZE &&
        shotHistory[c.row][c.col] === "empty"
    );
}

// Medium AI: random until a hit, then hunts adjacent cells
function getMediumShot(aiState: AIState): Coordinate | null {
  // If we have cells to hunt, try those first
  while (aiState.hitQueue.length > 0) {
    const target = aiState.hitQueue.shift()!;
    if (aiState.shotHistory[target.row][target.col] === "empty") {
      return target;
    }
  }

  // Otherwise random
  return getEasyShot(aiState.shotHistory);
}

// Hard AI: probability-based targeting
function getHardShot(
  aiState: AIState,
  playerShips: Ship[]
): Coordinate | null {
  // If we have cells in the hunt queue, prioritize those
  while (aiState.hitQueue.length > 0) {
    const target = aiState.hitQueue.shift()!;
    if (aiState.shotHistory[target.row][target.col] === "empty") {
      return target;
    }
  }

  // Calculate probability density for each cell
  const probGrid: number[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 0)
  );

  // Get remaining (unsunk) ship lengths
  const remainingLengths = FLEET_CONFIG
    .filter((config) => {
      const ship = playerShips.find((s) => s.name === config.name);
      return ship && !ship.isSunk;
    })
    .map((config) => config.length);

  // For each remaining ship length, count how many ways it can be placed through each cell
  for (const length of remainingLengths) {
    // Horizontal placements
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE - length; col++) {
        let valid = true;
        for (let i = 0; i < length; i++) {
          const state = aiState.shotHistory[row][col + i];
          if (state === "miss" || state === "hit") {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let i = 0; i < length; i++) {
            probGrid[row][col + i]++;
          }
        }
      }
    }

    // Vertical placements
    for (let row = 0; row <= GRID_SIZE - length; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        let valid = true;
        for (let i = 0; i < length; i++) {
          const state = aiState.shotHistory[row + i][col];
          if (state === "miss" || state === "hit") {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (let i = 0; i < length; i++) {
            probGrid[row + i][col]++;
          }
        }
      }
    }
  }

  // Zero out already-shot cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (aiState.shotHistory[row][col] !== "empty") {
        probGrid[row][col] = 0;
      }
    }
  }

  // Find the cell(s) with the highest probability
  let maxProb = 0;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (probGrid[row][col] > maxProb) {
        maxProb = probGrid[row][col];
      }
    }
  }

  const bestCells: Coordinate[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (probGrid[row][col] === maxProb && maxProb > 0) {
        bestCells.push({ row, col });
      }
    }
  }

  if (bestCells.length === 0) {
    return getEasyShot(aiState.shotHistory);
  }

  return bestCells[Math.floor(Math.random() * bestCells.length)];
}


export function getAIShot(
  difficulty: Difficulty,
  aiState: AIState,
  playerShips: Ship[]
): Coordinate | null {
  switch (difficulty) {
    case "easy":
      return getEasyShot(aiState.shotHistory);
    case "medium":
      return getMediumShot(aiState);
    case "hard":
      return getHardShot(aiState, playerShips);
  }
}

// Update AI state after a shot result
export function updateAIState(
  aiState: AIState,
  coordinate: Coordinate,
  result: "hit" | "miss",
  sunkShip: string | undefined,
  difficulty: Difficulty
): void {
  if (result === "hit") {
    if (difficulty === "medium" || difficulty === "hard") {
      if (sunkShip) {
        // Ship sunk, clear the hunt queue of cells related to this ship
        aiState.lastHits = [];
        aiState.huntDirection = null;
        // Don't clear the entire queue — there might be other ships being hunted
      } else {
        // Add adjacent cells to hunt queue
        const adjacents = getAdjacentCells(coordinate, aiState.shotHistory);

        if (aiState.lastHits.length > 0 && difficulty === "hard") {
          // Determine direction from consecutive hits
          const lastHit = aiState.lastHits[aiState.lastHits.length - 1];
          if (lastHit.row === coordinate.row) {
            aiState.huntDirection = "horizontal";
            // Prioritize cells in the same row
            const directional = adjacents.filter(
              (c) => c.row === coordinate.row
            );
            const others = adjacents.filter(
              (c) => c.row !== coordinate.row
            );
            aiState.hitQueue.unshift(...directional);
            aiState.hitQueue.push(...others);
          } else if (lastHit.col === coordinate.col) {
            aiState.huntDirection = "vertical";
            const directional = adjacents.filter(
              (c) => c.col === coordinate.col
            );
            const others = adjacents.filter(
              (c) => c.col !== coordinate.col
            );
            aiState.hitQueue.unshift(...directional);
            aiState.hitQueue.push(...others);
          } else {
            aiState.hitQueue.push(...adjacents);
          }
        } else {
          aiState.hitQueue.push(...adjacents);
        }

        aiState.lastHits.push(coordinate);
      }
    }
  }
}

// Deduplicate the hit queue
export function deduplicateHitQueue(aiState: AIState): void {
  const seen = new Set<string>();
  aiState.hitQueue = aiState.hitQueue.filter((c) => {
    const key = coordKey(c.row, c.col);
    if (seen.has(key)) return false;
    if (aiState.shotHistory[c.row][c.col] !== "empty") return false;
    seen.add(key);
    return true;
  });
}
