import Anthropic from "@anthropic-ai/sdk";

function getApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  );
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: getApiKey() });
}

interface BoardState {
  grid: string[][];
  ships: {
    name: string;
    length: number;
    sunk: boolean;
    hitCount: number;
  }[];
  shotHistory: { row: number; col: number; result: "hit" | "miss" }[];
  remainingShips: { name: string; length: number }[];
}

type Difficulty = "easy" | "normal" | "hard";

function buildSystemPrompt(difficulty: Difficulty): string {
  const base = `You are a Battleship AI opponent playing on a 10x10 grid (rows A-J, columns 1-10).

RULES:
- Rows labeled A-J (A=row 0, B=row 1, ... J=row 9). Columns 1-10 (1=col 0, 2=col 1, ... 10=col 9).
- Ships are placed horizontally or vertically, never diagonally. Ships cannot overlap.
- You must choose a cell you haven't already fired at (not marked X or O).

`;

  const strategies: Record<Difficulty, string> = {
    easy: `STRATEGY: You are a casual player. Pick cells somewhat randomly. Don't overthink it — just pick an unexplored cell. You can occasionally make smart moves but mostly play casually. Sometimes pick cells near hits, sometimes don't.`,

    normal: `STRATEGY: You are a competent player using hunt-and-target strategy.
- In HUNT mode (no unsunk hits): fire at random unexplored cells, loosely preferring a checkerboard pattern.
- In TARGET mode (unsunk hits exist): fire at cells adjacent to unsunk hits to determine ship orientation, then follow the line until the ship sinks.
- Once a ship sinks, return to hunt mode.`,

    hard: `STRATEGY: You are an expert player using advanced probability analysis.
- Calculate probability density: for each remaining ship, count how many valid placements pass through each unexplored cell. Target the cell with the highest total count.
- When you have unsunk hits, strongly prioritize extending along the detected axis. Consider both endpoints.
- Use parity optimization: for the smallest remaining ship of length L, only consider cells where (row + col) % L == 0 in hunt mode.
- Eliminate impossible positions: cells surrounded by misses or board edges can't contain ships.
- Consider remaining ship lengths to narrow possible positions.`,
  };

  return base + strategies[difficulty] + `

You MUST respond with ONLY a JSON object in this exact format:
{"row": <number 0-9>, "col": <number 0-9>, "reasoning": "<brief 1-2 sentence explanation>"}

No other text, no markdown, no code blocks. Just the raw JSON.`;
}

function buildUserPrompt(board: BoardState): string {
  const lines: string[] = [];
  lines.push("Board state (your view of enemy waters):");
  lines.push("   1  2  3  4  5  6  7  8  9  10");

  const rowLabels = "ABCDEFGHIJ";
  for (let r = 0; r < 10; r++) {
    let row = `${rowLabels[r]}  `;
    for (let c = 0; c < 10; c++) {
      const cell = board.grid[r][c];
      if (cell === "hit") row += " X ";
      else if (cell === "miss") row += " O ";
      else row += " . ";
    }
    lines.push(row);
  }

  lines.push("");
  lines.push("Legend: . = unknown, X = hit, O = miss");
  lines.push(`Shots fired: ${board.shotHistory.length}`);

  lines.push("");
  lines.push("Remaining enemy ships:");
  for (const ship of board.remainingShips) {
    lines.push(`  - ${ship.name} (length ${ship.length})`);
  }

  const sunkShips = board.ships.filter((s) => s.sunk);
  if (sunkShips.length > 0) {
    lines.push("");
    lines.push("Sunk ships:");
    for (const ship of sunkShips) {
      lines.push(`  - ${ship.name} (length ${ship.length})`);
    }
  }

  const unsunkHits: string[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board.grid[r][c] === "hit") {
        unsunkHits.push(`${rowLabels[r]}${c + 1}`);
      }
    }
  }
  // Remove hits that belong to sunk ships
  const sunkCells = new Set<string>();
  for (const sh of board.shotHistory) {
    if (sh.result === "hit") {
      const isSunk = board.ships.some(
        (s) => s.sunk && s.hitCount === s.length
      );
      if (isSunk) {
        // Approximate: we can't perfectly determine which hits belong to sunk ships
        // from this data, but we include all hit cells and note sunk ships separately
      }
    }
  }

  if (unsunkHits.length > 0 && board.remainingShips.length < board.ships.length) {
    // There are sunk ships, so some hits may belong to them
    lines.push("");
    lines.push(`All hit cells: ${unsunkHits.join(", ")}`);
    lines.push("Note: Some hits belong to already-sunk ships listed above.");
  } else if (unsunkHits.length > 0) {
    lines.push("");
    lines.push(`Unsunk hit cells (active targets): ${unsunkHits.join(", ")}`);
    lines.push("PRIORITY: Fire adjacent to these hits to find and sink the ship.");
  }

  lines.push("");
  lines.push("Choose the best cell to fire at next.");

  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boardState, difficulty } = body as {
      boardState: BoardState;
      difficulty: Difficulty;
    };

    const apiKey = getApiKey();
    if (!apiKey) {
      return Response.json(
        {
          error: "API key not configured",
          details:
            "Set ANTHROPIC_API_KEY or CLAUDE_API_KEY in Vercel environment variables. " +
            "Go to Vercel → Project Settings → Environment Variables.",
        },
        { status: 500 }
      );
    }

    const client = getClient();
    const modelId =
      process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
    const systemPrompt = buildSystemPrompt(difficulty || "normal");
    const userPrompt = buildUserPrompt(boardState);

    const message = await client.messages.create({
      model: modelId,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const parsed = JSON.parse(text.trim());
    const row = Math.max(0, Math.min(9, Math.floor(parsed.row)));
    const col = Math.max(0, Math.min(9, Math.floor(parsed.col)));

    return Response.json({
      row,
      col,
      reasoning: parsed.reasoning || "",
      model: modelId,
      tokensUsed:
        (message.usage?.input_tokens || 0) +
        (message.usage?.output_tokens || 0),
    });
  } catch (error) {
    console.error("AI move error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isAuthError =
      message.includes("401") ||
      message.includes("authentication") ||
      message.includes("invalid") ||
      message.includes("api_key");
    return Response.json(
      {
        error: "Failed to get AI move",
        details: isAuthError
          ? "Invalid API key. Check that your ANTHROPIC_API_KEY is correct and active."
          : message,
      },
      { status: 500 }
    );
  }
}
