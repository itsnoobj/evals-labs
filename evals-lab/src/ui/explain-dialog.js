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
// Options of openExplain:
//   returnFocus()     returns the element to focus when the dialog closes (the clicked node may have been redrawn).
//   onClose()         called after the dialog closed.
//   onAction(event)   called for every click inside the dialog (use it for tabs inside a section).
// Calling openExplain while the dialog is open replaces the body in place and keeps the scroll position.
// The dialog does not follow a run by itself: it shows the data of the moment it was opened or last redrawn.
import { disclose } from "./disclose.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const EXPLAIN_TITLE_ID = "explain-title";

// lines: [{ state: "PASSED", text: "plain text" }]. The state is a word, so it never rests on colour.
export function runLinesHtml(lines) {
  return `<ul class="xp-lines">${lines
    .map(
      (l) =>
        `<li>${l.state ? `<b class="xp-state">${esc(l.state)}</b> ` : ""}${l.html ?? `<span>${esc(l.text)}</span>`}</li>`,
    )
    .join("")}</ul>`;
}

export function explainHtml({ title, what, why, visualHtml = "", thisRunHtml = "", moreSections = [] } = {}) {
  const sections = moreSections
    .map((s) => disclose(s.summary, s.html, { open: !!s.open, id: s.id, cls: "xp-sec" }))
    .join("");
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
  body.innerHTML = explainHtml(input);
  if (!d.open) d.showModal();
  body.scrollTop = scroll;
  if (!scroll) d.querySelector(".xd-close").focus({ preventScroll: true });
}

export const explainIsOpen = () => !!dlg?.open;
export const closeExplain = () => dlg?.open && dlg.close();
