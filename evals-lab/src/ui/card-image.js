// Official issuer card art, keyed by the card name used in cases.js (CARDS[id].name).
// Paths are relative to evals-lab/index.html so they work under the GitHub Pages sub-path.
// Source and licence note per image: assets/cards/SOURCES.md. A null entry means no trustworthy image: show a placeholder.
// w/h are the file's pixel size; the img is shown at a fixed width (default 72 px) with the same aspect ratio.
export const CARD_IMAGES = {
  "HDFC Infinia": { src: "assets/cards/hdfc_infinia.webp", w: 480, h: 305 },
  "HDFC Swiggy": { src: "assets/cards/hdfc_swiggy.webp", w: 310, h: 175 },
  "ICICI Amazon Pay": { src: "assets/cards/icici_amazon_pay.webp", w: 480, h: 303 },
  "IDFC First Power+": { src: "assets/cards/idfc_first_power_plus.webp", w: 315, h: 197 },
};

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Placeholder aspect ratio is a standard card (85.6 x 54 mm).
const CARD_RATIO = 54 / 85.6;

export function cardImageHtml(cardName, width = 72) {
  const entry = CARD_IMAGES[cardName];
  if (!entry) {
    return `<span class="card-art card-art--none" style="width:${width}px;height:${Math.round(width * CARD_RATIO)}px">${esc(cardName)}</span>`;
  }
  const height = Math.round((width * entry.h) / entry.w);
  return `<img class="card-art" src="${esc(entry.src)}" alt="${esc(cardName)} card" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
}
