"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Difficulty } from "@/lib/types";

interface DifficultySelectProps {
  onSelect: (difficulty: Difficulty) => void;
}

const difficulties: {
  value: Difficulty;
  label: string;
  description: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    description: "AI fires randomly. Great for beginners.",
  },
  {
    value: "medium",
    label: "Medium",
    description: "AI hunts adjacent cells after a hit.",
  },
  {
    value: "hard",
    label: "Hard",
    description: "AI uses probability targeting. A real challenge.",
  },
];

export function DifficultySelect({ onSelect }: DifficultySelectProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Battleship</h1>
        <p className="text-muted-foreground">
          Select a difficulty to start the game
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full px-4">
        {difficulties.map((diff) => (
          <Card
            key={diff.value}
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
            onClick={() => onSelect(diff.value)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{diff.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{diff.description}</CardDescription>
              <Button className="w-full mt-4" variant="outline">
                Select
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
