"use client";

import { useState } from "react";
import { BattlePhase } from "@/components/battle-phase";
import { DifficultySelect } from "@/components/difficulty-select";
import { GameOver } from "@/components/game-over";
import { SetupPhase } from "@/components/setup-phase";
import { useGame } from "@/hooks/use-game";
import { Difficulty } from "@/lib/types";

export function BattleshipGame() {
  const [difficultySelected, setDifficultySelected] = useState(false);

  const {
    gameState,
    currentShipIndex,
    placementOrientation,
    hoveredCells,
    isValidHover,
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
  } = useGame();

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setDifficultySelected(true);
    startGame(difficulty);
  };

  const handleChangeDifficulty = () => {
    setDifficultySelected(false);
    resetGame();
  };

  const handlePlayAgain = () => {
    startGame(gameState.difficulty);
  };

  if (!difficultySelected) {
    return <DifficultySelect onSelect={handleDifficultySelect} />;
  }

  if (gameState.phase === "gameover") {
    return (
      <GameOver
        gameState={gameState}
        onPlayAgain={handlePlayAgain}
        onChangeDifficulty={handleChangeDifficulty}
      />
    );
  }

  if (gameState.phase === "setup") {
    return (
      <SetupPhase
        gameState={gameState}
        currentShipIndex={currentShipIndex}
        placementOrientation={placementOrientation}
        hoveredCells={hoveredCells}
        isValidHover={isValidHover}
        onCellClick={placePlayerShip}
        onCellHover={handleCellHover}
        onCellLeave={handleCellLeave}
        onToggleOrientation={toggleOrientation}
        onRandomize={randomizePlacement}
        onReset={resetPlacement}
        onStartBattle={startBattle}
      />
    );
  }

  return (
    <BattlePhase gameState={gameState} onPlayerShoot={playerShoot} />
  );
}
