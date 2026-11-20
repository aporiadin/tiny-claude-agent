import { runAgent } from "./agent.ts";
import { DEFAULT_TASK, EFFORT, MODEL } from "./config.ts";

const task = process.argv.slice(2).join(" ") || DEFAULT_TASK;
console.log(`> ${task}\n  (model: ${MODEL}, effort: ${EFFORT})\n`);

const finished = await runAgent(task);
process.exit(finished ? 0 : 1);
