import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Saves the exact request body sent on each turn and the full response that came back,
 * one JSON file each, plus a summary.txt, in a new folder per run: runs/<time>_<model>_<effort>/
 * Only the body is saved, not the HTTP headers, so the API key never ends up on disk.
 */
export class Transcript {
  readonly dir: string;

  constructor(model: string, effort: string) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    this.dir = path.join("runs", `${stamp}_${model}_${effort}`);
    mkdirSync(this.dir, { recursive: true });
  }

  /** Writes turn-01-request.json, turn-01-response.json, ... (serialized immediately). */
  save(turn: number, kind: "request" | "response", payload: unknown): void {
    const file = path.join(this.dir, `turn-${String(turn).padStart(2, "0")}-${kind}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
  }

  /** Writes summary.txt: the task, how the run ended, and the usage table. */
  saveSummary(text: string): void {
    writeFileSync(path.join(this.dir, "summary.txt"), text + "\n");
  }
}
