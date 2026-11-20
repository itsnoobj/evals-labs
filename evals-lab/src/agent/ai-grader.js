// The LLM judge: ask the model for a 0 to 5 grade five times and take the middle one.
// Pure: no DOM. `chat` is the same function the agents use. Exports: gradeFiveTimes.
import { judgePrompt, parseJudge } from "../evals/engine.js";

// Returns { all: [number | "?" x5], median: number | null }. median is null when no reply held a grade.
export async function gradeFiveTimes(chat, c, run) {
  const { system, user } = judgePrompt(c, run);
  const all = [];
  for (let i = 0; i < 5; i++) {
    const reply = await chat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      seed: 200 + i,
      max_tokens: 8,
    });
    all.push(parseJudge(reply.text).score);
  }
  const valid = all.filter((s) => s !== null).sort((a, b) => a - b);
  return {
    all: all.map((s) => s ?? "?"),
    median: valid.length ? valid[Math.floor((valid.length - 1) / 2)] : null,
  };
}
