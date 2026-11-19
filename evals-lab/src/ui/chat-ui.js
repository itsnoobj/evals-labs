// Pure HTML-string renderer: one agent run as a chat window. No DOM, no engine import.
// The end-to-end flow graph lives in wiring-graph.js. Everything under class "wire" is internals; chat.css shows it only inside a parent with .show-wiring.
// Wire blocks are <section class="wire ..."> and never nest, so tests can strip them with a regex.
import { rankBarsHtml, timelineHtml } from "./run-visuals.js";

const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const clip = (v, n = 220) => {
  const s = typeof v === "string" ? v : (JSON.stringify(v) ?? "");
  return s.length > n ? `${s.slice(0, n)}…` : s;
};
const inr = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : String(n ?? ""));
const human = (c) => String(c ?? "").replace(/_/g, " ");
const wire = (cls, inner) => `<section class="wire ${cls}">${inner}</section>`;
const bubble = (inner, cls = "") => `<div class="msg msg-agent"><div class="bubble${cls}">${inner}</div></div>`;
const isErr = (o) => !!o && typeof o === "object" && o.error != null;

// ---- chat bubbles -----------------------------------------------------------
function cardVisual(final, steps, cardNames) {
  const rank = [...steps]
    .reverse()
    .find((s) => s.kind === "tool" && s.tool === "rank_cards" && !isErr(s.output) && Array.isArray(s.output?.ranked));
  const row = rank?.output.ranked.find((r) => r.card === final.card);
  const name = cardNames[final.card] ?? final.card;
  return (
    `<div class="msg msg-agent"><div class="ccard">` +
    `<span class="ccard-chip"></span><b class="ccard-name">${e(name)}</b>` +
    `<span class="ccard-lines"><i></i><i></i><i></i></span>` +
    `<span class="ccard-reward">Earns ₹${e(final.reward_inr)} back</span>` +
    (row ? `<span class="ccard-rate">${e(row.rate_pct)}%</span>` : "") +
    `</div></div>`
  );
}

function finalHtml(s, steps, cardNames) {
  const fb = s.source === "fallback" ? ' <span class="tag">Built from the lookup result</span>' : "";
  if (s.card == null) return bubble(`${e(s.reply)} <span class="tag bad">No answer given</span>`);
  const reply = s.reply || fb ? bubble(`${e(s.reply)}${fb}`) : "";
  return cardVisual(s, steps, cardNames) + reply;
}

function agentHtml(s, steps, cardNames, labels) {
  if (s.kind === "invalid") return bubble(e("The assistant sent a reply that could not be read"));
  if (s.kind === "final") return finalHtml(s, steps, cardNames);
  const known = s.tool === "classify_merchant" || s.tool === "rank_cards";
  if (!known || isErr(s.output)) return bubble(`The lookup failed${isErr(s.output) ? `: ${e(s.output.error)}` : ""}`);
  if (s.tool === "classify_merchant") {
    const cat = s.output?.category;
    return (
      bubble("Checking what kind of spending this is…") + (cat ? bubble(`It is ${e(labels[cat] ?? human(cat))}`) : "")
    );
  }
  const n = Array.isArray(s.output?.ranked) ? s.output.ranked.length : 4;
  return bubble(`<p>Comparing your ${n} cards for ₹${e(inr(s.args?.amount))}…</p>${rankBarsHtml(s.output, cardNames)}`);
}

// ---- wire blocks ------------------------------------------------------------
const dl = (k, v) => `<dt>${k}</dt><dd><code>${e(v)}</code></dd>`;

function stepWire(s, i) {
  const name = s.kind === "final" ? "answer" : s.kind === "invalid" ? "unreadable reply" : (s.tool ?? "tool");
  let rows;
  if (s.kind === "invalid") rows = dl("raw text", clip(s.raw ?? "", 600));
  else if (s.kind === "final") rows = dl("got back", clip({ card: s.card, reward_inr: s.reward_inr, reply: s.reply }));
  else rows = dl("asked", clip(s.args)) + dl("got back", clip(s.output));
  return wire(
    "wire-step",
    `<h4>Step ${i + 1} · <span class="mono">${e(name)}</span></h4><dl class="io">${rows}</dl>` +
      `<p class="meta">${e(Number(s.ms) || 0)} ms · ${e(Number(s.tokens) || 0)} text pieces</p>`,
  );
}

const problemList = (v) =>
  v?.problems?.length ? `<ul>${v.problems.map((p) => `<li>${e(p)}</li>`).join("")}</ul>` : "";

function compactStep(s) {
  if (s.kind === "final") return `answer: ${s.card ?? "none"}, ₹${s.reward_inr ?? "none"}`;
  if (s.kind === "invalid") return `unreadable: ${clip(s.raw ?? "", 80)}`;
  return `${s.tool}(${clip(s.args, 80)}) → ${clip(s.output, 80)}`;
}

function rejectedWire(a, i) {
  return wire(
    "wire-rejected",
    `<h4>Try ${i + 1}: rejected by the checker</h4>${problemList(a.verdict)}` +
      `<ol class="compact">${(a.steps ?? []).map((s) => `<li class="mono">${e(compactStep(s))}</li>`).join("")}</ol>`,
  );
}

function eventsWire(events) {
  const li = events
    .map(
      (ev) =>
        `<li>${typeof ev.t === "number" ? `<span class="meta">${e(ev.t)} ms</span> ` : ""}` +
        `<b>Try ${e((Number(ev.attempt) || 0) + 1)}</b> ${e(ev.text)}</li>`,
    )
    .join("");
  return wire("wire-events", `<h4>Checker log</h4><ol class="evlog">${li}</ol>`);
}

function scoreWire(scores, metrics) {
  const li = metrics
    .map((m) => {
      const r = scores[m.id];
      const [cls, sq, word, wc] =
        r?.pass === true
          ? ["pass", "ok", "PASS", "w-ok"]
          : r?.pass === false
            ? ["fail", "bad", "FAIL", "w-bad"]
            : ["skip", "half", "NOT RUN", "w-off"];
      return (
        `<li class="sc sc-${cls}"><i class="sq ${sq}"></i><b>${e(m.label)}</b> <span class="w ${wc}">${word}</span>` +
        (r?.reason ? `<small>${e(r.reason)}</small>` : "") +
        "</li>"
      );
    })
    .join("");
  return wire("wire-scores", `<h4>The 8 checks</h4><ul class="sc-grid">${li}</ul>`);
}

// ---- result strip -----------------------------------------------------------
// A typed question has no answer key (expected is null): say so in words instead of MATCH / NO MATCH.
const noKeyHtml = () =>
  '<div class="chat-res off"><span class="res-word"><i class="sq half"></i>NO KEY</span>' +
  "<div><p>No answer key for your own question. The checks that need a key were not run.</p></div></div>";

// The input guardrail stopped the question, so there is nothing to compare with a key.
const blockedResultHtml = () =>
  '<div class="chat-res off"><span class="res-word"><i class="sq half"></i>BLOCKED</span>' +
  '<div><p class="k">Input guardrail</p><p>The question was stopped before the model ran, so there is no answer to check.</p></div></div>';

function resultHtml(steps, expected, outcome, cardNames) {
  if (expected == null) return noKeyHtml();
  const final = steps.find((s) => s.kind === "final");
  const nm = (id) => (id == null ? "none" : (cardNames[id] ?? id));
  const reward = final?.reward_inr;
  const got = `${nm(final?.card)} · ${reward == null ? "none" : `₹${reward}`}`;
  // Ties: `accept` lists every card with the top reward. Old callers pass only `card`.
  const accept = Array.isArray(expected.accept) && expected.accept.length ? expected.accept : [expected.card];
  const match = !!final && accept.includes(final.card) && Math.abs(Number(reward) - expected.reward_inr) <= 0.5;
  const [cls, sq, word] =
    outcome === "refused" ? ["off", "half", "NO ANSWER"] : match ? ["ok", "ok", "MATCH"] : ["bad", "bad", "NO MATCH"];
  return (
    `<div class="chat-res ${cls}"><span class="res-word"><i class="sq ${sq}"></i>${word}</span>` +
    `<div><p class="k">Answer key check</p><p class="mono">Expected ${e(accept.map(nm).join(" or "))} · ₹${e(expected.reward_inr)}</p>` +
    `<p class="mono">Got ${e(got)}</p></div></div>`
  );
}

// ---- main -------------------------------------------------------------------
// The system prompt is the only thing the AI is told besides the question. It holds no card rates:
// the rates live in the lookup tools, which are plain code.
function systemHtml(prompt, careful) {
  if (!prompt) return "";
  const extra = careful
    ? "The careful agent also sends a safety net (a format that only allows valid steps) and uses low randomness."
    : "The simple agent sends nothing else: no format limit, default randomness.";
  return (
    `<details class="sys-prompt"><summary>System prompt: what the AI is told before your question</summary>` +
    `<pre>${e(prompt)}</pre><p>It contains no card rates. The AI knows none. The rates sit in the lookup tools (plain code), ` +
    `and the AI only chooses which tool to call and copies numbers from the result. ${e(extra)}</p></details>`
  );
}

export function chatHtml(opts = {}) {
  const {
    kind = "simple",
    title,
    subtitle,
    practices = [],
    question,
    attempts = [],
    shown = 0,
    events = [],
    outcome = null,
    pending = false,
    expected = null,
    cardNames = {},
    categoryLabels = {},
    scores = null,
    metrics = [],
    systemPrompt = "",
  } = opts;
  const steps = attempts[shown]?.steps ?? [];
  const careful = kind === "careful";
  const chips = practices
    .map(
      (p) =>
        `<li class="chat-chip ${p.on ? "on" : "off"}"><i class="sq${p.on ? " ok" : ""}"></i>` +
        `${e(p.label)} <b>${p.on ? "ON" : "OFF"}</b></li>`,
    )
    .join("");
  const blocked = outcome === "blocked";
  const why = events.find((ev) => ev.t === "guard_in_fail")?.text ?? "the question did not pass the input guardrail.";
  const body = blocked
    ? bubble(`Stopped before the model ran: ${e(why)} <span class="tag bad">Blocked by a guardrail</span>`)
    : steps.map((s, i) => agentHtml(s, steps, cardNames, categoryLabels) + stepWire(s, i)).join("");
  const verdict = attempts[shown]?.verdict;
  const verdictWire = verdict
    ? wire(
        "wire-verdict",
        `<h4>Checker verdict on the shown answer</h4>` +
          (verdict.ok ? "<p>No problems found.</p>" : problemList(verdict)),
      )
    : "";
  const rejected = attempts.map((a, i) => (i === shown ? "" : rejectedWire(a, i))).join("");
  const log = events.length ? eventsWire(events) : "";
  const score = scores && metrics.length ? scoreWire(scores, metrics) : "";
  const tl = steps.length ? wire("wire-timeline", `<h4>Timeline</h4>${timelineHtml(steps)}`) : "";
  const typing = pending
    ? '<div class="msg msg-agent"><div class="bubble typing" role="status" aria-label="The assistant is typing"><i></i><i></i><i></i></div></div>'
    : "";
  // No result block before the first step arrives, so an idle chat stays quiet.
  const res = pending
    ? ""
    : blocked
      ? blockedResultHtml()
      : expected || steps.length
        ? resultHtml(steps, expected, outcome, cardNames)
        : "";
  return (
    `<div class="chat chat-${careful ? "careful" : "simple"}">` +
    `<header class="chat-head"><span class="chat-av" aria-hidden="true">${e(
      String(title ?? "?")
        .charAt(0)
        .toUpperCase(),
    )}</span>` +
    `<div><h3>${e(title)}</h3><p class="chat-sub">${e(subtitle)}</p></div><ul class="chat-chips">${chips}</ul></header>` +
    `${systemHtml(systemPrompt, careful)}` +
    `<div class="chat-msgs"><div class="msg msg-user"><div class="bubble">${e(question)}</div></div>` +
    `${body}${typing}${verdictWire}${rejected}${log}${score}${tl}</div>${res}</div>`
  );
}
