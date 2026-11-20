import { runAgent } from "./agent.ts";
import { DEFAULT_TASK, MODEL } from "./config.ts";

const task = process.argv.slice(2).join(" ") || DEFAULT_TASK;
console.log(`> ${task}\n  (model: ${MODEL})\n`);

const finished = await runAgent(task);
process.exit(finished ? 0 : 1);
