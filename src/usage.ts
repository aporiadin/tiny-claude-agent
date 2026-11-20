import type Anthropic from "@anthropic-ai/sdk";

interface TurnStats {
  turn: number;
  stopReason: string;
  toolCalls: number;
  inputTokens: number; // everything sent: system + tools + full history
  outputTokens: number; // everything generated, including thinking you don't see
  ms: number;
}

/** Collects token usage and timing for each request the agent makes. */
export class UsageLog {
  private turns: TurnStats[] = [];

  record(turn: number, response: Anthropic.Message, ms: number): void {
    const u = response.usage;
    const stats: TurnStats = {
      turn,
      stopReason: response.stop_reason ?? "unknown",
      toolCalls: response.content.filter((b) => b.type === "tool_use").length,
      // Cached tokens are reported separately; add them so this is the full prompt size.
      inputTokens: u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
      outputTokens: u.output_tokens,
      ms,
    };
    this.turns.push(stats);

    const tools = stats.toolCalls ? ` (${stats.toolCalls} tool call${stats.toolCalls > 1 ? "s" : ""})` : "";
    console.log(
      `[turn ${turn}] ${stats.stopReason}${tools} · in ${fmt(stats.inputTokens)} · out ${fmt(stats.outputTokens)} · ${secs(ms)}`,
    );
  }

  printSummary(model: string): void {
    if (this.turns.length === 0) return;

    const row = (cells: string[]) =>
      console.log(cells[0].padEnd(7) + cells[1].padEnd(12) + cells.slice(2).map((c) => c.padStart(10)).join(""));

    console.log(`\n── Usage: ${model} ──`);
    row(["turn", "stop", "tools", "input", "output", "time"]);
    for (const t of this.turns) {
      row([String(t.turn), t.stopReason, String(t.toolCalls), fmt(t.inputTokens), fmt(t.outputTokens), secs(t.ms)]);
    }

    const sum = (key: "toolCalls" | "inputTokens" | "outputTokens" | "ms") =>
      this.turns.reduce((acc, t) => acc + t[key], 0);
    row([
      "total",
      `${this.turns.length} turns`,
      String(sum("toolCalls")),
      fmt(sum("inputTokens")),
      fmt(sum("outputTokens")),
      secs(sum("ms")),
    ]);
  }
}

const fmt = (n: number) => n.toLocaleString("en-US");
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
