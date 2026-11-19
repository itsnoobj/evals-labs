import assert from 'node:assert/strict';
import { judgeFlowHtml } from '../../evals-lab/src/ui/judge-flow.js';
import { judgePrompt } from '../../evals-lab/src/evals/engine.js';
import { CASES, perfectRun } from '../../evals-lab/src/task/cases.js';

let n = 0; const ok = (v, m) => { assert.ok(v, m); n++; };
const c = CASES[0]; const prompt = judgePrompt(c, perfectRun(c));
const before = judgeFlowHtml({ prompt });
ok(before.includes('You are a strict grader'), 'shows the system prompt');
ok(before.includes('Question: '), 'shows the user message');
ok(before.includes('NOT ASKED') && before.includes('Not asked yet.'), 'before asking');
ok(before.includes('never sees the right card'), 'says the answer key is hidden');
const after = judgeFlowHtml({ prompt, grades: [5, 5, 3, 5, '?'], median: 5 });
ok(after.includes('Middle grade 5 of 5: PASS'), 'median verdict');
ok(after.includes('FAIL') && after.includes('NO NUMBER'), 'per-grade words');
ok(judgeFlowHtml({ prompt, grades: [1, 2, 2, 3, 3], median: 2 }).includes('2 of 5: FAIL'), 'low median fails');
ok(judgeFlowHtml({ prompt: { system: '<b>', user: '&' } }).includes('&lt;b&gt;'), 'escapes html');
console.log(`${n} checks passed`);
