// Pure string renderer for the "which cards are in play" matrix. Styles: cards.css.
import { cardImageHtml } from "./card-image.js";

const MAX_RATE = 10; // highest rate in cases.js (HDFC Swiggy on Swiggy); bar width = rate / MAX_RATE

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const humanise = (id) => {
  const s = String(id).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// labels: optional { categoryId: "plain label" } (CATEGORY_LABELS in cases.js). Missing ids fall back to humanise().
// bestCard: one card id, or an array of ids when the top reward is tied.
export function cardsMatrixHtml({
  cards,
  categories,
  selectedCategory = null,
  bestCard = null,
  caption = "",
  labels = {},
}) {
  const bestIds = bestCard === null ? [] : [].concat(bestCard);
  const head = categories
    .map((cat) => {
      const sel = cat === selectedCategory;
      const label = sel ? '<span class="lbl">this question</span>' : "";
      return `<th scope="col"${sel ? ' class="sel"' : ""}>${label}${esc(labels[cat] ?? humanise(cat))}</th>`;
    })
    .join("");

  const rows = Object.entries(cards)
    .map(([id, card]) => {
      const isBest = bestIds.includes(id);
      const tag = isBest ? '<b class="tag">BEST</b>' : "";
      const cells = categories
        .map((cat) => {
          const rate = Number(card.rates?.[cat]) || 0;
          const cls = [cat === selectedCategory ? "sel" : "", isBest && cat === selectedCategory ? "best" : ""]
            .filter(Boolean)
            .join(" ");
          const w = Math.min(100, Math.max(0, (rate / MAX_RATE) * 100));
          const style = rate > 0 ? ` style="--w:${w.toFixed(1)}%"` : "";
          const bestTag = cls.includes("best") ? '<b class="tag">BEST</b>' : "";
          return `<td${cls ? ` class="${cls}"` : ""}${style}><span class="n">${esc(rate)}%</span>${bestTag}</td>`;
        })
        .join("");
      return `<tr><th scope="row">${cardImageHtml(card.name)}<span class="nm">${esc(card.name)}</span>${tag}</th>${cells}</tr>`;
    })
    .join("");

  const cap = caption ? `<caption>${esc(caption)}</caption>` : "";
  return `<div class="cardsmx"><table>${cap}<thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
