// The words and marker for the two boxes in "Choose how to run" (Live AI, Recorded runs). Pure: no DOM.
// Exports: modelBoxes. Used by src/app/model-bar.js; tests/ui/model-box.test.mjs.

// kind: "not-loaded" | "loading" | "ready" (live model in use) | "replay" (recorded runs in use).
// label: the text setStatus() was given, used for "Load failed". pct: download percent, 0 to 100.
// hadLive: a live model was loaded earlier. hasRecorded: data/recorded-runs.json was read.
// selected: "live" when the live AI is chosen but not loaded yet (it loads on the first run): the Live AI box is then IN USE.
// Returns, per box: status (drives the square marker), label (visible words), inUse (IN USE tag and heavier border).
export function modelBoxes({ kind, label = "", pct = 0, hadLive = false, hasRecorded = false, selected = "" }) {
  const live =
    kind === "ready"
      ? { status: "ready", label: "Ready (live model)", inUse: true }
      : kind === "loading"
        ? { status: "loading", label: `Loading ${pct}%`, inUse: false }
        : kind === "replay" && hadLive
          ? { status: "not-loaded", label: "Loaded, not in use", inUse: false }
          : label === "Load failed"
            ? { status: "not-loaded", label, inUse: false }
            : selected === "live"
              ? { status: "not-loaded", label: "Not loaded yet, loads on first use", inUse: true }
              : { status: "not-loaded", label: "Not loaded", inUse: false };
  const replay =
    kind === "replay"
      ? { status: "ready", label: "In use", inUse: true }
      : { status: "not-loaded", label: hasRecorded ? "Available" : "Not available", inUse: false };
  return { live, replay };
}
