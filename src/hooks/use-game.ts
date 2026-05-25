"use client";

import { useCallback, useRef, useState } from "react";
import {
  createAIState,
  deduplicateHitQueue,
  getAIShot,
  updateAIState,
} from "@/lib/ai";
import {
  allShipsSunk,
  createEmptyGrid,
  isAlreadyTargeted,
  isValidPlacement,
  placeShip,
  placeShipsRandomly,
  processShot,
} from "@/lib/game-logic";
import {
  CellState,
  COLUMN_LABELS,
  Difficulty,
  FLEET_CONFIG,
  GameState,
  Orientation,
  Ship,
  ShipPlacement,
} from "@/lib/types";

interface AIStateRef {
  shotHistory: CellState[][];
  hitQueue: { row: number; col: number }[];
  lastHits: { row: number; col: number }[];
  huntDirection: "horizontal" | "vertical" | null;
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState>({
    phase: "setup",
    difficulty: "medium",
    playerGrid: createEmptyGrid(),
    aiGrid: createEmptyGrid(),
    playerShips: [],
    aiShips: [],
    playerShotHistory: createEmptyGrid(),
    aiShotHistory: createEmptyGrid(),
    isPlayerTurn: true,
    winner: null,
    lastShotResult: null,
    message: "Place your ships on the grid",
  });

  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [placementOrientation, setPlacementOrientation] =
    useState<Orientation>("horizontal");
  const [hoveredCells, setHoveredCells] = useState<Set<string>>(new Set());
  const [isValidHover, setIsValidHover] = useState(false);

  const aiStateRef = useRef<AIStateRef | null>(null);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    setGameState((prev) => ({ ...prev, difficulty }));
  }, []);

  const startGame = useCallback((difficulty: Difficulty) => {
    const { grid: aiGrid, ships: aiShips } = placeShipsRandomly();
    setGameState({
      phase: "setup",
      difficulty,
      playerGrid: createEmptyGrid(),
      aiGrid,
      playerShips: [],
      aiShips,
      playerShotHistory: createEmptyGrid(),
      aiShotHistory: createEmptyGrid(),
      isPlayerTurn: true,
      winner: null,
      lastShotResult: null,
      message: `Place your ${FLEET_CONFIG[0].name} (${FLEET_CONFIG[0].length} cells)`,
    });
    setCurrentShipIndex(0);
    setPlacementOrientation("horizontal");
    aiStateRef.current = null;
  }, []);

  const handleCellHover = useCallback(
    (row: number, col: number) => {
      if (gameState.phase !== "setup" || currentShipIndex >= FLEET_CONFIG.length)
        return;

      const shipConfig = FLEET_CONFIG[currentShipIndex];
      const placement: ShipPlacement = {
        name: shipConfig.name,
        length: shipConfig.length,
        startRow: row,
        startCol: col,
        orientation: placementOrientation,
      };

      const cells = new Set<string>();
      const valid = isValidPlacement(placement, gameState.playerGrid);

      for (let i = 0; i < shipConfig.length; i++) {
        const r =
          placementOrientation === "vertical" ? row + i : row;
        const c =
          placementOrientation === "horizontal" ? col + i : col;
        if (r >= 0 && r < 10 && c >= 0 && c < 10) {
          cells.add(`${r},${c}`);
        }
      }

      setHoveredCells(cells);
      setIsValidHover(valid);
    },
    [gameState.phase, gameState.playerGrid, currentShipIndex, placementOrientation]
  );

  const handleCellLeave = useCallback(() => {
    setHoveredCells(new Set());
    setIsValidHover(false);
  }, []);

  const placePlayerShip = useCallback(
    (row: number, col: number) => {
      if (
        gameState.phase !== "setup" ||
        currentShipIndex >= FLEET_CONFIG.length
      )
        return;

      const shipConfig = FLEET_CONFIG[currentShipIndex];
      const placement: ShipPlacement = {
        name: shipConfig.name,
        length: shipConfig.length,
        startRow: row,
        startCol: col,
        orientation: placementOrientation,
      };

      if (!isValidPlacement(placement, gameState.playerGrid)) return;

      const newGrid = gameState.playerGrid.map((r) => [...r]);
      const ship = placeShip(placement, newGrid);

      const nextIndex = currentShipIndex + 1;
      const allPlaced = nextIndex >= FLEET_CONFIG.length;

      setGameState((prev) => ({
        ...prev,
        playerGrid: newGrid,
        playerShips: [...prev.playerShips, ship],
        message: allPlaced
          ? 'All ships placed! Click "Start Battle" to begin.'
          : `Place your ${FLEET_CONFIG[nextIndex].name} (${FLEET_CONFIG[nextIndex].length} cells)`,
      }));
      setCurrentShipIndex(nextIndex);
      setHoveredCells(new Set());
    },
    [gameState.phase, gameState.playerGrid, currentShipIndex, placementOrientation]
  );

  const toggleOrientation = useCallback(() => {
    setPlacementOrientation((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
  }, []);

  const randomizePlacement = useCallback(() => {
    const { grid, ships } = placeShipsRandomly();
    setGameState((prev) => ({
      ...prev,
      playerGrid: grid,
      playerShips: ships,
      message: 'All ships placed! Click "Start Battle" to begin.',
    }));
    setCurrentShipIndex(FLEET_CONFIG.length);
  }, []);

  const resetPlacement = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      playerGrid: createEmptyGrid(),
      playerShips: [],
      message: `Place your ${FLEET_CONFIG[0].name} (${FLEET_CONFIG[0].length} cells)`,
    }));
    setCurrentShipIndex(0);
  }, []);

  const startBattle = useCallback(() => {
    if (gameState.playerShips.length < FLEET_CONFIG.length) return;

    const shotHistory = createEmptyGrid();
    aiStateRef.current = createAIState(shotHistory);

    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      isPlayerTurn: true,
      aiShotHistory: shotHistory,
      message: "Your turn! Click on the enemy grid to fire.",
    }));
  }, [gameState.playerShips.length]);

  const performAITurn = useCallback(
    () => {
      setGameState((prev) => {
        if (prev.winner || prev.phase !== "playing") return prev;

        const aiState = aiStateRef.current;
        if (!aiState) return prev;

        const newPlayerGrid = prev.playerGrid.map((r) => [...r]);
        const newAiShotHistory = aiState.shotHistory.map((r) => [...r]);
        const newPlayerShips: Ship[] = prev.playerShips.map((s) => ({
          ...s,
          hitCells: new Set(s.hitCells),
        }));

        deduplicateHitQueue(aiState);
        const shot = getAIShot(prev.difficulty, aiState, newPlayerShips);

        if (!shot) return { ...prev, isPlayerTurn: true, message: "AI has no moves left. Your turn!" };

        const result = processShot(shot, newPlayerGrid, newPlayerShips);

        newAiShotHistory[shot.row][shot.col] = result.result;
        aiState.shotHistory = newAiShotHistory;

        updateAIState(
          aiState,
          shot,
          result.result,
          result.sunkShip,
          prev.difficulty
        );

        let message: string;
        if (result.sunkShip) {
          message = `AI sank your ${result.sunkShip}!`;
        } else if (result.result === "hit") {
          message = `AI hit at ${COLUMN_LABELS[shot.col]}${shot.row + 1}!`;
        } else {
          message = `AI missed at ${COLUMN_LABELS[shot.col]}${shot.row + 1}.`;
        }

        if (allShipsSunk(newPlayerShips)) {
          return {
            ...prev,
            playerGrid: newPlayerGrid,
            playerShips: newPlayerShips,
            aiShotHistory: newAiShotHistory,
            lastShotResult: result,
            winner: "ai" as const,
            phase: "gameover" as const,
            isPlayerTurn: true,
            message: "AI wins! All your ships have been sunk.",
          };
        }

        return {
          ...prev,
          playerGrid: newPlayerGrid,
          playerShips: newPlayerShips,
          aiShotHistory: newAiShotHistory,
          lastShotResult: result,
          isPlayerTurn: true,
          message: message + " Your turn!",
        };
      });
    },
    []
  );

  const playerShoot = useCallback(
    (row: number, col: number) => {
      if (
        gameState.phase !== "playing" ||
        !gameState.isPlayerTurn ||
        gameState.winner
      )
        return;

      if (isAlreadyTargeted(row, col, gameState.playerShotHistory)) return;

      const newAiGrid = gameState.aiGrid.map((r) => [...r]);
      const newPlayerShotHistory = gameState.playerShotHistory.map((r) => [...r]);
      const newAiShips: Ship[] = gameState.aiShips.map((s) => ({
        ...s,
        hitCells: new Set(s.hitCells),
      }));

      const result = processShot({ row, col }, newAiGrid, newAiShips);

      newPlayerShotHistory[row][col] = result.result;

      let message: string;
      if (result.sunkShip) {
        message = `You sank the AI's ${result.sunkShip}!`;
      } else if (result.result === "hit") {
        message = `Hit at ${COLUMN_LABELS[col]}${row + 1}!`;
      } else {
        message = `Miss at ${COLUMN_LABELS[col]}${row + 1}.`;
      }

      if (allShipsSunk(newAiShips)) {
        setGameState((prev) => ({
          ...prev,
          aiGrid: newAiGrid,
          aiShips: newAiShips,
          playerShotHistory: newPlayerShotHistory,
          lastShotResult: result,
          winner: "player",
          phase: "gameover",
          message: "You win! You sank all enemy ships!",
        }));
        return;
      }

      setGameState((prev) => ({
        ...prev,
        aiGrid: newAiGrid,
        aiShips: newAiShips,
        playerShotHistory: newPlayerShotHistory,
        lastShotResult: result,
        isPlayerTurn: false,
        message,
      }));

      setTimeout(() => {
        performAITurn();
      }, 800);
    },
    [gameState, performAITurn]
  );

  const resetGame = useCallback(() => {
    setGameState({
      phase: "setup",
      difficulty: gameState.difficulty,
      playerGrid: createEmptyGrid(),
      aiGrid: createEmptyGrid(),
      playerShips: [],
      aiShips: [],
      playerShotHistory: createEmptyGrid(),
      aiShotHistory: createEmptyGrid(),
      isPlayerTurn: true,
      winner: null,
      lastShotResult: null,
      message: "Place your ships on the grid",
    });
    setCurrentShipIndex(0);
    setPlacementOrientation("horizontal");
    aiStateRef.current = null;
  }, [gameState.difficulty]);

  return {
    gameState,
    currentShipIndex,
    placementOrientation,
    hoveredCells,
    isValidHover,
    setDifficulty,
    startGame,
    handleCellHover,
    handleCellLeave,
    placePlayerShip,
    toggleOrientation,
    randomizePlacement,
    resetPlacement,
    startBattle,
    playerShoot,
    resetGame,
  };
}
