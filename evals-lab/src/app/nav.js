// Navigation: quick path (3 screens) vs full path (all screens), the phone header title, the Next / Back footer.
// The pure helpers at the top take plain data and are tested in tests/app/nav.test.mjs. initNav() wires the DOM.
// Screen routing itself (hash -> visible section, aria-current) stays in ui.js showScreenFromHash().

export const ORDER = ["start", "run", "metrics", "golden", "compounding", "compare"];
export const QUICK = ["start", "run", "compare"];
const TITLES = {
  start: "Start",
  run: "1 Run",
  metrics: "2 Checks",
  golden: "3 Test set",
  compounding: "4 Errors add up",
  compare: "5 Side by side",
};
const PLAIN = {
  start: "Start",
  run: "Run",
  metrics: "Checks",
  golden: "Test set",
  compounding: "Errors add up",
  compare: "Side by side",
};
const PHONE_WIDTH = "(max-width: 760px)";
const STORAGE_KEY = "evals-lab-level";

export function visibleScreens(order, level) {
  return level === "quick" ? order.filter((id) => QUICK.includes(id)) : [...order];
}

// The next screen after `current` that the level shows, or null. Works when `current` itself is hidden.
export function nextScreen(order, current, level) {
  const i = order.indexOf(current);
  if (i < 0) return null;
  const shown = visibleScreens(order, level);
  return order.slice(i + 1).find((id) => shown.includes(id)) ?? null;
}

export function prevScreen(order, current, level) {
  const i = order.indexOf(current);
  if (i < 0) return null;
  const shown = visibleScreens(order, level);
  return order.slice(0, i).findLast((id) => shown.includes(id)) ?? null;
}

// A saved choice wins. Otherwise phones start on the quick path and wider screens on the full path.
export function pickLevel({ stored, isPhone }) {
  if (stored === "quick" || stored === "full") return stored;
  return isPhone ? "quick" : "full";
}

// Opening a screen the quick path hides (for example from a shared link) switches to the full path.
export function levelForScreen(level, id) {
  return level === "quick" && !QUICK.includes(id) ? "full" : level;
}

// After switching to the quick path while on a hidden screen: the nearest earlier visible screen.
export function screenForLevel(order, current, level) {
  if (visibleScreens(order, level).includes(current)) return current;
  return prevScreen(order, current, level) ?? visibleScreens(order, level)[0];
}

// Footer buttons for the current screen. back and next are { id, text }; back is null on the first screen.
// On the last visible screen next is "Start again". On the quick path labels have no numbers.
export function pagerFor(order, current, level) {
  const label = (id) => (level === "quick" ? PLAIN[id] : TITLES[id]);
  const next = nextScreen(order, current, level);
  const back = prevScreen(order, current, level);
  return {
    back: back ? { id: back, text: "\u2190 Back" } : null,
    next: next ? { id: next, text: `Next: ${label(next)} \u2192` } : { id: order[0], text: "Start again" },
  };
}

export function titleFor(id) {
  return TITLES[id] ?? "";
}

function readStored() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, sandboxed frame)
  }
}

function writeStored(level) {
  try {
    sessionStorage.setItem(STORAGE_KEY, level);
  } catch {
    // not remembered; the page still works
  }
}

export function initNav() {
  const $ = (id) => document.getElementById(id);
  const toggle = $("level-toggle");
  const title = $("screen-title");
  const back = $("pager-back");
  const next = $("pager-next");
  let level = pickLevel({ stored: readStored(), isPhone: matchMedia(PHONE_WIDTH).matches });
  let current = "start";

  const setLevel = (value) => {
    level = value;
    writeStored(level);
  };

  const render = () => {
    document.body.dataset.level = level;
    const full = level === "full";
    toggle.setAttribute("aria-pressed", String(full));
    toggle.textContent = full ? "Quick path" : "Show all screens";
    const shown = visibleScreens(ORDER, level);
    document.querySelectorAll("nav a.nav[data-screen]").forEach((a) => {
      a.hidden = !shown.includes(a.dataset.screen);
    });
    title.textContent = titleFor(current);
    const pager = pagerFor(ORDER, current, level);
    back.hidden = !pager.back;
    if (pager.back) {
      back.href = `#${pager.back.id}`;
      back.textContent = pager.back.text;
    }
    next.href = `#${pager.next.id}`;
    next.textContent = pager.next.text;
  };

  const route = () => {
    const id = location.hash.slice(1);
    if (ORDER.includes(id)) current = id; // other hashes (the skip link) keep the screen we are on
    const wanted = levelForScreen(level, current);
    if (wanted !== level) setLevel(wanted);
    render();
  };

  toggle.addEventListener("click", () => {
    setLevel(level === "full" ? "quick" : "full");
    const target = screenForLevel(ORDER, current, level);
    if (target !== current)
      location.hash = `#${target}`; // hashchange re-renders
    else render();
  });

  document.querySelectorAll("[data-tour]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLevel(btn.dataset.tour === "quick" ? "quick" : "full");
      render();
      location.hash = "#run";
    });
  });

  addEventListener("hashchange", route); // registered after ui.js's listener, so the section is already switched
  route();
}
