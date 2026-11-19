// A visible picture of how the AI grader (LLM as judge) works. Pure: returns an HTML string, no DOM.
// Four boxes, left to right: what it reads, the prompt it is given, the 5 asks, the result.
// `prompt` comes from judgePrompt() in engine.js, `grades` from the 5 live asks (null until asked).
const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PASS_AT = 4; // same threshold as rubric_judge in engine.js: 4 or 5 passes

export function judgeFlowHtml({ prompt, grades = null, median = null } = {}) {
  const asked = Array.isArray(grades);
  const boxes = Array.from({ length: 5 }, (_, i) => {
    const g = asked ? grades[i] : null;
    const word = !asked ? 'NOT ASKED' : g === '?' || g == null ? 'NO NUMBER' : Number(g) >= PASS_AT ? 'PASS' : 'FAIL';
    // Not asked: the box stays empty (a word here would wrap letter by letter); the line under the boxes says it.
    return `<li class="jg-grade${asked ? '' : ' off'}" title="${word}"><b>${asked ? e(g ?? '?') : '–'}</b>${asked ? `<small>${word}</small>` : ''}</li>`;
  }).join('');
  const verdict = !asked ? 'Not asked yet.' : median == null ? 'No usable grade.'
    : `Middle grade ${e(median)} of 5: ${median >= PASS_AT ? 'PASS' : 'FAIL'} (needs ${PASS_AT} or more).`;
  return `<div class="jg" data-hook="judge-flow">
    <ol class="jg-row">
      <li class="jg-box"><span class="k">1 · It reads</span>
        <ul><li>the question</li><li>the tool results</li><li>the agent's reply</li></ul>
        <small>Not the answer key. It never sees the right card.</small></li>
      <li class="jg-arrow" aria-hidden="true">→</li>
      <li class="jg-box jg-wide"><span class="k">2 · It is told (the prompt)</span>
        <p class="jg-label">System message: the grader's job</p><pre>${e(prompt?.system ?? '')}</pre>
        <p class="jg-label">User message: this run, filled in</p><pre>${e(prompt?.user ?? '')}</pre></li>
      <li class="jg-arrow" aria-hidden="true">→</li>
      <li class="jg-box"><span class="k">3 · Same small model, asked 5 times</span>
        <p>Each ask answers with one number from 0 to 5. Randomness is on, so the 5 numbers can differ.</p></li>
      <li class="jg-arrow" aria-hidden="true">→</li>
      <li class="jg-box"><span class="k">4 · Result</span>
        <ol class="jg-grades" aria-label="The 5 grades">${boxes}</ol>
        <p><b>${verdict}</b></p>
        <small>A second opinion only. It is not part of the ship bar.</small></li>
    </ol>
    <p class="muted jg-warn">Known weakness: in our tests this small model gave 5 of 5 to every run, even one with a reward 10 times too high. That is why the plain-code checks stay.</p>
  </div>`;
}
