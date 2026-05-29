import Anthropic from "@anthropic-ai/sdk";

const RATE_LIMIT_WINDOW_MS = 2000;
let lastRequestTime = 0;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
    return Response.json(
      { error: "Rate limited — wait before next request" },
      { status: 429 },
    );
  }
  lastRequestTime = now;

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt;
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system:
        "You are an AI playing Battleship. Analyze the board state and choose the best cell to fire at. " +
        "Respond with ONLY the coordinate (e.g. A5). No explanation needed.",
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock ? textBlock.text : "";

    return Response.json({
      text,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return Response.json(
      { error: "Anthropic API request failed" },
      { status: 502 },
    );
  }
}
