import assert from 'node:assert/strict';
import { checkDetailHtml } from '../../evals-lab/src/ui/check-details.js';
import { METRICS, judgePrompt, scoreRun } from '../../evals-lab/src/evals/engine.js';
import { CASES, perfectRun } from '../../evals-lab/src/task/cases.js';

const c = CASES[0]; const run = perfectRun(c); const scores = scoreRun(c, run);
const m = (id) => METRICS.find((x) => x.id === id);
let n = 0; const ok = (v, msg) => { assert.ok(v, msg); n++; };

const code = checkDetailHtml(m('grounded'), scores.grounded);
ok(code.includes('Plain code'), 'code check says plain code');
ok(!code.includes('system prompt'), 'code check has no prompt');
ok(code.includes('PASS'), 'perfect run passes');

const prompt = judgePrompt(c, run);
const j = checkDetailHtml(m('rubric_judge'), scores.rubric_judge, { prompt, grades: null, median: null });
ok(j.includes('You are a strict grader'), 'shows the real system prompt');
ok(j.includes('Question: ' + c.query.replace(/'/g, '&#39;')), 'shows the user message with the question');
ok(j.includes('not asked yet'), 'no grades yet');
const j2 = checkDetailHtml(m('rubric_judge'), scores.rubric_judge, { prompt, grades: [5, 5, 4, 5, 5], median: 5 });
ok(j2.includes('5, 5, 4, 5, 5') && j2.includes('middle grade: 5'), 'shows grades');
ok(checkDetailHtml(m('rubric_judge'), null, { prompt: { system: '<b>x</b>', user: 'u' } }).includes('&lt;b&gt;x'), 'escapes html');
ok(checkDetailHtml(null) === '', 'null metric gives empty');
console.log(`${n} checks passed`);
