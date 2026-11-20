// The slim bar under the top nav, on every screen: is the live AI loaded, loading (with the percent), or not.
// Pure: plain data in, an HTML string out. Status is always words plus a square (never colour alone).
// Exports: modelStatusHtml. Used by src/app/model-bar.js; tests/ui/model-status.test.mjs.
import { shortModelName } from "./ask-row.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const MAX_REASON = 80;
const short = (s) => {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > MAX_REASON ? `${t.slice(0, MAX_REASON - 1)}…` : t;
};

// kind: "not-loaded" | "loading" | "ready" (live AI in use) | "replay" (recorded runs in use). pct: download percent, 0 to 100.
// modelId: the loaded model. error: why the last load failed ("" = none). hadLive: a live model was loaded earlier.
// hasRecorded: data/recorded-runs.json was read. secure: the page can load the model (https or localhost).
// Buttons carry data-mstat="load" or "replay"; the caller binds one click listener on the bar.
export function modelStatusHtml({
  kind = "not-loaded",
  pct = 0,
  modelId = "",
  error = "",
  hadLive = false,
  hasRecorded = false,
  secure = true,
} = {}) {
  const btn = (action, label, disabled = false) =>
    `<button type="button" class="mstat-btn" data-mstat="${action}"${disabled ? " disabled" : ""}>${esc(label)}</button>`;
  const row = (sq, status, text, extra = "") =>
    `<div class="mstat-row" data-status="${status}"><i class="sq ${sq}"></i><span>${text}</span>${extra}</div>`;
  if (kind === "loading") {
    const n = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    // The bar sits inside the row so the whole bar stays one line tall (it wraps on a phone).
    return row(
      "half",
      "loading",
      `AI: loading ${n}%`,
      `<div class="mstat-bar" role="progressbar" aria-label="AI download" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><i class="mstat-fill" style="--w:${n}%"></i></div>`,
    );
  }
  if (kind === "ready") {
    return row("ok", "ready", `AI: ready · ${esc(shortModelName(modelId))} runs in your browser`);
  }
  if (error) {
    const why = `AI: load failed · ${esc(short(error))}`;
    if (kind === "replay") return row("bad", "failed", `${why} · using recorded runs`);
    return row("bad", "failed", `${why} · use recorded runs`, hasRecorded ? btn("replay", "USE RECORDED RUNS") : "");
  }
  if (kind === "replay") {
    return hadLive
      ? row("half", "replay", "Using recorded runs (AI loaded, not in use)", btn("load", "USE LIVE AI"))
      : row(
          "half",
          "replay",
          "Using recorded runs (no AI loaded)",
          secure ? btn("load", "LOAD AI (about 880 MB)") : "",
        );
  }
  return row(
    "",
    "not-loaded",
    "AI: not loaded",
    ` <span aria-hidden="true">·</span> ${btn("load", "LOAD (about 880 MB)", !secure)}${secure ? "" : '<span class="mstat-why">Needs https or localhost</span>'}`,
  );
}
