// Click-to-open sections built on native <details><summary>: no JS is needed to open or close one.
// Screens redraw with innerHTML (every run step, every bug click), which would close a section the reader just
// opened. So the ids of open sections live in a module-level Set; disclose() re-applies `open` for them.
// ponytail: a section that is open by default and then closed by the reader reopens on the next redraw,
// because the Set only remembers open ids. Nothing uses open=true on a redrawn screen today.

const openIds = new Set();

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// summary: plain text (escaped). bodyHtml: trusted markup. id: stable name, needed only if the section is redrawn.
export function disclose(summary, bodyHtml, { open = false, id } = {}) {
  const isOpen = open || (id != null && openIds.has(id));
  const idAttr = id == null ? "" : ` data-did="${esc(id)}"`;
  return `<details class="disclose"${idAttr}${isOpen ? " open" : ""}><summary>${esc(summary)}</summary><div class="disclose-body">${bodyHtml}</div></details>`;
}

export function rememberOpen(id, isOpen) {
  if (isOpen) openIds.add(id);
  else openIds.delete(id);
}

export const isRemembered = (id) => openIds.has(id);

// One listener for the whole page. `toggle` does not bubble, so listen in the capture phase.
export function installDisclose(doc = document) {
  doc.addEventListener(
    "toggle",
    (ev) => {
      const d = ev.target;
      if (d?.tagName === "DETAILS" && d.dataset.did) rememberOpen(d.dataset.did, d.open);
    },
    true,
  );
}
