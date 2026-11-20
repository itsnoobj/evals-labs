// Click-to-open sections built on native <details><summary>: no JS is needed to open or close one.
// Screens redraw with innerHTML (every run step, every bug click), which would close a section the reader just
// opened. So the ids a reader opened, and the ids a reader closed, live in two module-level Sets and disclose()
// re-applies them. A closed id wins over `open: true`, so a section that is open by default stays closed once the
// reader closes it (the wiring phases rely on this).

const openIds = new Set();
const closedIds = new Set();

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// summary: plain text (escaped). bodyHtml: trusted markup. id: stable name, needed only if the section is redrawn.
// cls: extra class names (trusted) for the <details>.
export function disclose(summary, bodyHtml, { open = false, id, cls = "" } = {}) {
  const isOpen = id != null && closedIds.has(id) ? false : open || (id != null && openIds.has(id));
  const idAttr = id == null ? "" : ` data-did="${esc(id)}"`;
  return `<details class="disclose${cls ? ` ${cls}` : ""}"${idAttr}${isOpen ? " open" : ""}><summary>${esc(summary)}</summary><div class="disclose-body">${bodyHtml}</div></details>`;
}

export function rememberOpen(id, isOpen) {
  if (isOpen) {
    openIds.add(id);
    closedIds.delete(id);
  } else {
    openIds.delete(id);
    closedIds.add(id);
  }
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
