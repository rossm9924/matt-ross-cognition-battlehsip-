"use client";

import { BattlePhase } from "@/components/battle-phase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameState } from "@/lib/types";

interface GameOverProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}

export function GameOver({
  gameState,
  onPlayAgain,
  onChangeDifficulty,
}: GameOverProps) {
  const playerWon = gameState.winner === "player";

  return (
    <div className="relative">
      <BattlePhase
        gameState={gameState}
        onPlayerShoot={() => {}}
      />

      <Dialog open={true}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {playerWon ? "Victory!" : "Defeat"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {playerWon
                ? "Congratulations! You sank all enemy ships!"
                : "The AI has sunk all your ships. Better luck next time!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onPlayAgain} className="flex-1">
              Play Again
            </Button>
            <Button
              variant="outline"
              onClick={onChangeDifficulty}
              className="flex-1"
            >
              Change Difficulty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
