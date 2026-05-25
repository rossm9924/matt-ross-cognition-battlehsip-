import {
  BOARD_SIZE,
  Coord,
  Difficulty,
  FLEET_SPEC,
  ShotRecord,
  coordKey,
  inBounds,
} from "./types";

function allCells(): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) cells.push({ row: r, col: c });
  }
  return cells;
}

function untargetedCells(shots: ShotRecord[]): Coord[] {
  const taken = new Set(shots.map((s) => coordKey(s.coord)));
  return allCells().filter((c) => !taken.has(coordKey(c)));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chooseEasy(shots: ShotRecord[]): Coord {
  const candidates = untargetedCells(shots);
  return pickRandom(candidates);
}

// Build a set of unresolved hit clusters: contiguous hits whose
// ships aren't yet declared sunk.
function unresolvedHits(shots: ShotRecord[]): Coord[] {
  const hits = shots.filter((s) => s.result === "hit");
  if (hits.length === 0) return [];

  // A hit is "resolved" if it belongs to a contiguous cluster that
  // contains a sunkShip declaration whose length matches the cluster.
  // Conservatively: if any sunkShip declaration exists, mark the
  // contiguous cluster around each declared sunk hit as resolved.
  const hitSet = new Set(hits.map((h) => coordKey(h.coord)));
  const sunkCoords = shots
    .filter((s) => s.result === "hit" && s.sunkShip)
    .map((s) => s.coord);

  const resolved = new Set<string>();
  for (const sc of sunkCoords) {
    // Flood through contiguous hits
    const stack = [sc];
    while (stack.length) {
      const cur = stack.pop()!;
      const key = coordKey(cur);
      if (resolved.has(key)) continue;
      if (!hitSet.has(key)) continue;
      resolved.add(key);
      stack.push(
        { row: cur.row + 1, col: cur.col },
        { row: cur.row - 1, col: cur.col },
        { row: cur.row, col: cur.col + 1 },
        { row: cur.row, col: cur.col - 1 }
      );
    }
  }
  return hits.map((h) => h.coord).filter((c) => !resolved.has(coordKey(c)));
}

function chooseMedium(shots: ShotRecord[]): Coord {
  const live = unresolvedHits(shots);
  const taken = new Set(shots.map((s) => coordKey(s.coord)));

  if (live.length >= 2) {
    // Try to extend along the line formed by two collinear hits.
    const sorted = [...live].sort((a, b) =>
      a.row === b.row ? a.col - b.col : a.row - b.row
    );
    // Find two adjacent collinear hits
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
        // Horizontal: try ends
        const candidates = [
          { row: a.row, col: Math.min(a.col, b.col) - 1 },
          { row: a.row, col: Math.max(a.col, b.col) + 1 },
        ].filter((c) => inBounds(c) && !taken.has(coordKey(c)));
        if (candidates.length) return pickRandom(candidates);
      }
      if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
        const candidates = [
          { row: Math.min(a.row, b.row) - 1, col: a.col },
          { row: Math.max(a.row, b.row) + 1, col: a.col },
        ].filter((c) => inBounds(c) && !taken.has(coordKey(c)));
        if (candidates.length) return pickRandom(candidates);
      }
    }
  }

  if (live.length >= 1) {
    const candidates: Coord[] = [];
    for (const h of live) {
      const neighbors: Coord[] = [
        { row: h.row + 1, col: h.col },
        { row: h.row - 1, col: h.col },
        { row: h.row, col: h.col + 1 },
        { row: h.row, col: h.col - 1 },
      ];
      for (const n of neighbors) {
        if (inBounds(n) && !taken.has(coordKey(n))) candidates.push(n);
      }
    }
    if (candidates.length) return pickRandom(candidates);
  }

  // Hunt mode: random untargeted
  return pickRandom(untargetedCells(shots));
}

function remainingShipLengths(shots: ShotRecord[]): number[] {
  const sunkNames = new Set(
    shots.filter((s) => s.sunkShip).map((s) => s.sunkShip as string)
  );
  return FLEET_SPEC.filter((s) => !sunkNames.has(s.name)).map((s) => s.length);
}

function chooseHard(shots: ShotRecord[]): Coord {
  const live = unresolvedHits(shots);
  const taken = new Set(shots.map((s) => coordKey(s.coord)));
  const misses = new Set(
    shots.filter((s) => s.result === "miss").map((s) => coordKey(s.coord))
  );

  // Target mode: if there are unresolved hits, extend the line if possible.
  if (live.length >= 1) {
    // Group contiguous unresolved hits
    const liveSet = new Set(live.map((c) => coordKey(c)));
    const visited = new Set<string>();
    const clusters: Coord[][] = [];
    for (const h of live) {
      if (visited.has(coordKey(h))) continue;
      const cluster: Coord[] = [];
      const stack = [h];
      while (stack.length) {
        const cur = stack.pop()!;
        const k = coordKey(cur);
        if (visited.has(k)) continue;
        if (!liveSet.has(k)) continue;
        visited.add(k);
        cluster.push(cur);
        stack.push(
          { row: cur.row + 1, col: cur.col },
          { row: cur.row - 1, col: cur.col },
          { row: cur.row, col: cur.col + 1 },
          { row: cur.row, col: cur.col - 1 }
        );
      }
      clusters.push(cluster);
    }

    // Prefer extending a cluster of size >= 2 along its axis
    for (const cluster of clusters) {
      if (cluster.length >= 2) {
        const sameRow = cluster.every((c) => c.row === cluster[0].row);
        const sameCol = cluster.every((c) => c.col === cluster[0].col);
        if (sameRow) {
          const cols = cluster.map((c) => c.col).sort((a, b) => a - b);
          const row = cluster[0].row;
          const ends = [
            { row, col: cols[0] - 1 },
            { row, col: cols[cols.length - 1] + 1 },
          ].filter((c) => inBounds(c) && !taken.has(coordKey(c)));
          if (ends.length) return pickRandom(ends);
        } else if (sameCol) {
          const rows = cluster.map((c) => c.row).sort((a, b) => a - b);
          const col = cluster[0].col;
          const ends = [
            { row: rows[0] - 1, col },
            { row: rows[rows.length - 1] + 1, col },
          ].filter((c) => inBounds(c) && !taken.has(coordKey(c)));
          if (ends.length) return pickRandom(ends);
        }
      }
    }

    // Otherwise, attack neighbors of a single-hit cluster
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const h = cluster[0];
        const neighbors = [
          { row: h.row + 1, col: h.col },
          { row: h.row - 1, col: h.col },
          { row: h.row, col: h.col + 1 },
          { row: h.row, col: h.col - 1 },
        ].filter((c) => inBounds(c) && !taken.has(coordKey(c)));
        if (neighbors.length) return pickRandom(neighbors);
      }
    }
  }

  // Hunt mode: probability density. For each remaining ship length,
  // count how many ways it can be placed across every cell, given
  // current misses (cannot overlap) and known unresolved hits (must
  // be covered if adjacent — but to keep it tractable we only avoid
  // misses here).
  const lengths = remainingShipLengths(shots);
  const score: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    new Array(BOARD_SIZE).fill(0)
  );

  for (const L of lengths) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c <= BOARD_SIZE - L; c++) {
        let ok = true;
        for (let i = 0; i < L; i++) {
          const k = `${r}-${c + i}`;
          if (misses.has(k)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (let i = 0; i < L; i++) {
            const k = `${r}-${c + i}`;
            if (!taken.has(k)) score[r][c + i] += 1;
          }
        }
      }
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r <= BOARD_SIZE - L; r++) {
        let ok = true;
        for (let i = 0; i < L; i++) {
          const k = `${r + i}-${c}`;
          if (misses.has(k)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (let i = 0; i < L; i++) {
            const k = `${r + i}-${c}`;
            if (!taken.has(k)) score[r + i][c] += 1;
          }
        }
      }
    }
  }

  // Pick the highest-scoring untargeted cell
  let best: Coord[] = [];
  let bestScore = -1;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (taken.has(`${r}-${c}`)) continue;
      const s = score[r][c];
      if (s > bestScore) {
        bestScore = s;
        best = [{ row: r, col: c }];
      } else if (s === bestScore) {
        best.push({ row: r, col: c });
      }
    }
  }
  if (best.length === 0) return pickRandom(untargetedCells(shots));
  return pickRandom(best);
}

export function chooseAIShot(
  difficulty: Difficulty,
  shotsTaken: ShotRecord[]
): Coord {
  switch (difficulty) {
    case "easy":
      return chooseEasy(shotsTaken);
    case "medium":
      return chooseMedium(shotsTaken);
    case "hard":
      return chooseHard(shotsTaken);
  }
}
