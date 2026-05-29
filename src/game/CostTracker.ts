const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export class CostTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private limit: number;

  constructor(costLimit: number = 0.50) {
    this.limit = costLimit;
  }

  addTokens(input: number, output: number): void {
    this.inputTokens += input;
    this.outputTokens += output;
  }

  getCost(): number {
    return (
      this.inputTokens * INPUT_COST_PER_TOKEN +
      this.outputTokens * OUTPUT_COST_PER_TOKEN
    );
  }

  isOverLimit(): boolean {
    return this.getCost() >= this.limit;
  }

  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
}
