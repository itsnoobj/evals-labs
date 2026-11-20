// Reusable explain pop-up built on the native <dialog>. Styles: src/styles/explain.css.
//
//   explainHtml({ title, what, why, visualHtml, thisRunHtml, moreSections })  -> body markup (pure, runs in node)
//   runLinesHtml([{ state, text }])                                           -> the "in this run" lines
//   openExplain(input, { returnFocus, onClose, onAction })                    -> shows the dialog (browser only)
//   closeExplain()
//
// Input fields:
//   title, what, why  plain text, escaped here. `what` and `why`: one sentence, 15 words or fewer (node-explainers.js).
//   visualHtml        trusted markup, shown next to `what` (for example nodeVisualHtml()).
//   thisRunHtml       trusted markup for the "in this run" block (runLinesHtml() builds it from real run data).
//   moreSections      [{ summary, html, id?, open? }] closed click-to-open sections (disclose.js). `html` is trusted.
//                     Give `id` to keep a section open across a redraw of the dialog.
//   askTerms          [term] glossary words of the screen (glossary.js). Only those the pop-up text uses go into the
//                     last section, "Ask your own AI": a copyable prompt for a chatbot of the learner's choice (ask-prompt.js).
// Options of openExplain:
//   returnFocus()     returns the element to focus when the dialog closes (the clicked node may have been redrawn).
//   onClose()         called after the dialog closed.
//   onAction(event)   called for every click inside the dialog (use it for tabs inside a section).
// Calling openExplain while the dialog is open replaces the body in place and keeps the scroll position.
// The dialog does not follow a run by itself: it shows the data of the moment it was opened or last redrawn.
import { disclose, rememberOpen } from "./disclose.js";
import { buildAskPrompt } from "./ask-prompt.js";
import { GLOSSARY } from "./glossary.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const EXPLAIN_TITLE_ID = "explain-title";
// The small square mark in the corner of every element that opens this pop-up. The button around it carries the name.
export const QMARK = '<span class="qmark" aria-hidden="true">?</span>';

// lines: [{ state: "PASSED", text: "plain text" }]. The state is a word, so it never rests on colour.
export function runLinesHtml(lines) {
  return `<ul class="xp-lines">${lines
    .map(
      (l) =>
        `<li>${l.state ? `<b class="xp-state">${esc(l.state)}</b> ` : ""}${l.html ?? `<span>${esc(l.text)}</span>`}</li>`,
    )
    .join("")}</ul>`;
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
// The "in this run" lines as plain text, read back from the markup so the prompt holds only what the pop-up shows.
const plainRunLines = (html) =>
  [...String(html).matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) =>
      m[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/&(?:amp|lt|gt|quot|#39);/g, (x) => ENTITIES[x])
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

const regexSafe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A term counts as used when the pop-up text has it as whole words ("test set (golden set)" also matches "test set").
function usedTerms(names, text) {
  return names
    .filter((term) => GLOSSARY[term])
    .filter((term) =>
      [term, ...term.split(/\s*[()]\s*/)].some((t) => t && new RegExp(`\\b${regexSafe(t)}\\b`, "i").test(text)),
    )
    .map((term) => ({ term, text: GLOSSARY[term] }));
}

export const ASK_SECTION_ID = "ask-own-ai";
export const ASK_COPIED = "Copied";
export const ASK_FALLBACK = "Press Ctrl/Cmd+C to copy";

function askSectionHtml({ title, what, why, thisRunHtml, askTerms = [] }) {
  const runLines = plainRunLines(thisRunHtml);
  const terms = usedTerms(askTerms, [title, what, why, ...runLines].join(" "));
  const prompt = buildAskPrompt({ title, what, why, runLines, terms });
  return disclose(
    "Ask your own AI",
    `<div class="xp-ask"><p>Copy this prompt into a chatbot you use. It can be wrong: check its answer against this pop-up.</p>` +
      `<textarea class="xp-ask-text" rows="8" readonly spellcheck="false" aria-label="Prompt to copy">${esc(prompt)}</textarea>` +
      `<div class="xp-ask-bar"><button type="button" class="xp-copy" data-ask-copy>COPY PROMPT</button>` +
      `<span class="xp-ask-msg" role="status" aria-live="polite"></span></div>` +
      `<p class="muted xp-ask-note">Nothing is sent from this page.</p></div>`,
    { id: ASK_SECTION_ID, cls: "xp-sec" },
  );
}

export function explainHtml(input = {}) {
  const { title, what, why, visualHtml = "", thisRunHtml = "", moreSections = [] } = input;
  const sections =
    moreSections.map((s) => disclose(s.summary, s.html, { open: !!s.open, id: s.id, cls: "xp-sec" })).join("") +
    askSectionHtml({ title, what, why, thisRunHtml, askTerms: input.askTerms });
  return (
    `<h3 class="xp-title" id="${EXPLAIN_TITLE_ID}">${esc(title)}</h3>` +
    `<section class="xp-block xp-what"><div class="xp-text"><p class="xp-label">WHAT IT IS</p><p class="xp-sentence">${esc(what)}</p></div>` +
    (visualHtml ? `<div class="xp-visual">${visualHtml}</div>` : "") +
    `</section>` +
    `<section class="xp-block xp-why"><p class="xp-label">WHY IT MATTERS</p><p class="xp-sentence">${esc(why)}</p></section>` +
    `<section class="xp-block xp-run"><p class="xp-label">IN THIS RUN</p>${thisRunHtml}</section>` +
    (sections ? `<div class="xp-more">${sections}</div>` : "")
  );
}

let dlg = null;
let handlers = {};
let copiedTimer = 0;

// Shows words, not colour: "Copied" for 2 seconds, or the fallback text with the prompt selected.
async function copyAskPrompt(btn) {
  const box = btn.closest(".xp-ask");
  const text = box.querySelector(".xp-ask-text");
  const msg = box.querySelector(".xp-ask-msg");
  clearTimeout(copiedTimer);
  try {
    await navigator.clipboard.writeText(text.value);
    msg.textContent = ASK_COPIED;
    copiedTimer = setTimeout(() => {
      msg.textContent = "";
    }, 2000);
  } catch {
    text.focus();
    text.select();
    msg.textContent = ASK_FALLBACK;
  }
}

function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement("dialog");
  dlg.className = "xdialog";
  dlg.setAttribute("aria-labelledby", EXPLAIN_TITLE_ID);
  dlg.innerHTML =
    '<div class="xd-bar"><button type="button" class="xd-close" data-xclose>CLOSE</button></div><div class="xd-body"></div>';
  dlg.addEventListener("click", (ev) => {
    // The dialog has no padding, so a click whose target is the dialog itself landed on the backdrop.
    if (ev.target === dlg || ev.target.closest?.("[data-xclose]")) return dlg.close();
    const copy = ev.target.closest?.("[data-ask-copy]");
    if (copy) return copyAskPrompt(copy);
    handlers.onAction?.(ev);
  });
  // Fires for the CLOSE button, Esc and the backdrop alike.
  dlg.addEventListener("close", () => {
    const { returnFocus, onClose } = handlers;
    handlers = {};
    onClose?.();
    (returnFocus?.() ?? null)?.focus?.({ preventScroll: true });
  });
  document.body.append(dlg);
  return dlg;
}

export function openExplain(input, { returnFocus, onClose, onAction } = {}) {
  const d = ensureDialog();
  const body = d.querySelector(".xd-body");
  const scroll = d.open ? body.scrollTop : 0;
  handlers = { returnFocus, onClose, onAction };
  // A new pop-up starts with "Ask your own AI" closed; a redraw of the same pop-up keeps what the reader chose.
  if (!d.open) rememberOpen(ASK_SECTION_ID, false);
  body.innerHTML = explainHtml(input);
  if (!d.open) d.showModal();
  body.scrollTop = scroll;
  if (!scroll) d.querySelector(".xd-close").focus({ preventScroll: true });
}

export const explainIsOpen = () => !!dlg?.open;
export const closeExplain = () => dlg?.open && dlg.close();
