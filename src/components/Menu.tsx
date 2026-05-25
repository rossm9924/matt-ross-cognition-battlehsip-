import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Difficulty } from "@/game/types";
import { Anchor } from "lucide-react";

interface MenuProps {
  onStart: (difficulty: Difficulty) => void;
}

export function Menu({ onStart }: MenuProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Anchor className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Battleship</CardTitle>
          <CardDescription>
            Place your fleet, then sink the AI's ships before it sinks yours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Choose difficulty</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
            >
              <DifficultyOption
                value="easy"
                title="Easy"
                description="AI fires at random."
              />
              <DifficultyOption
                value="medium"
                title="Medium"
                description="AI hunts intelligently after a hit."
              />
              <DifficultyOption
                value="hard"
                title="Hard"
                description="AI uses probability density targeting."
              />
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => onStart(difficulty)}>
            Begin
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function DifficultyOption({
  value,
  title,
  description,
}: {
  value: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent">
      <RadioGroupItem value={value} id={`diff-${value}`} className="mt-1" />
      <Label htmlFor={`diff-${value}`} className="flex-1 cursor-pointer">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </Label>
    </div>
  );
}
