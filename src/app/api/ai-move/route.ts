import Anthropic from "@anthropic-ai/sdk";

function extractJson(text: string): { row: number; col: number; reasoning?: string } {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  throw new Error("Incomplete JSON object in response");
}

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
  const base = `OUTPUT FORMAT: You must respond with exactly one JSON object and nothing else.
{"row": <0-9>, "col": <0-9>, "reasoning": "<1 sentence>"}

You are a Battleship AI on a 10x10 grid. Rows A-J (A=0..J=9), Columns 1-10 (1=col 0..10=col 9).
Do not fire at cells marked X (hit) or O (miss).

`;

  const strategies: Record<Difficulty, string> = {
    easy: `Play casually. Pick somewhat random unexplored cells.`,

    normal: `Use hunt-and-target: random shots in hunt mode, adjacent shots near unsunk hits in target mode.`,

    hard: `Use probability density analysis. Prioritize extending unsunk hit sequences along their axis. Use parity optimization for hunt mode.`,
  };

  return base + strategies[difficulty] + `

Respond with ONLY the JSON object. No explanation outside the JSON.`;
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

    const maxAttempts = 3;
    let lastError: Error | null = null;
    let totalTokens = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const messages: { role: "user"; content: string }[] =
        attempt === 0
          ? [{ role: "user", content: userPrompt }]
          : [
              {
                role: "user",
                content:
                  userPrompt +
                  "\n\nIMPORTANT: Respond with ONLY a JSON object like {\"row\": 0, \"col\": 0, \"reasoning\": \"...\"} — nothing else.",
              },
            ];

      const message = await client.messages.create({
        model: modelId,
        max_tokens: 512,
        system: systemPrompt,
        messages,
      });

      totalTokens +=
        (message.usage?.input_tokens || 0) +
        (message.usage?.output_tokens || 0);

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";

      try {
        const parsed = extractJson(text);
        const row = Math.max(0, Math.min(9, Math.floor(parsed.row)));
        const col = Math.max(0, Math.min(9, Math.floor(parsed.col)));

        return Response.json({
          row,
          col,
          reasoning: parsed.reasoning || "",
          model: modelId,
          tokensUsed: totalTokens,
        });
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    throw lastError || new Error("Failed to parse AI response after retries");
  } catch (error) {
    console.error("AI move error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isAuthError =
      message.includes("401") ||
      message.includes("authentication_error") ||
      message.includes("invalid x-api-key") ||
      message.includes("invalid api key");
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
