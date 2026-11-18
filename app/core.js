/* NeuroDifference core runtime
 * Zero dependencies. Small utilities, state store, markdown, icons, toasts.
 */

export const VERSION = "4.1.0";

/* ------------------------------------------------------------------ */
/* DOM + string helpers                                                */
/* ------------------------------------------------------------------ */

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape a value for safe interpolation into HTML. */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Create an element from an HTML string. */
export function frag(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function on(root, eventName, selector, handler) {
  root.addEventListener(eventName, (ev) => {
    const target = ev.target instanceof Element ? ev.target.closest(selector) : null;
    if (target && root.contains(target)) handler(ev, target);
  });
}

export function debounce(fn, wait = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 120) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        fn(...args);
      }, remaining);
    }
  };
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const fmt = {
  /** "5 h" / "45 min" / "2.4 days" */
  duration(hours) {
    if (hours === null || hours === undefined || Number.isNaN(hours)) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${trimNum(hours)} h`;
    return `${trimNum(hours / 24)} days`;
  },
  num(n, digits = 1) {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return trimNum(n, digits);
  },
  mg(n) {
    if (n === null || n === undefined) return "—";
    return `${trimNum(n)} mg`;
  },
  pct(n, digits = 0) {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    return `${(n * 100).toFixed(digits)}%`;
  },
  date(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  },
  relTime(iso) {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.round(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d} d ago`;
    return fmt.date(iso);
  },
};

function trimNum(n, digits = 1) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(rounded);
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function dayKey(d = new Date()) {
  const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(aKey, bKey) {
  if (!aKey || !bKey) return Infinity;
  const a = new Date(`${aKey}T00:00:00`);
  const b = new Date(`${bKey}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Markdown-lite renderer (safe: escapes first, then formats)           */
/* ------------------------------------------------------------------ */

function inlineMd(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = /^(https?:\/\/|#|\/|mailto:)/i.test(href) ? href : "#";
    const ext = /^https?:/i.test(safe);
    return `<a href="${safe}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  return out;
}

/** Render a small markdown subset. HTML inside the source is escaped. */
export function md(source) {
  if (!source) return "";
  const lines = String(source).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let listType = null;
  let inCode = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inlineMd).join("<br>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (/^```/.test(line)) {
      flushPara();
      closeList();
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push('<pre class="md-code"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(esc(raw));
      continue;
    }
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h md-h${level}">${inlineMd(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      closeList();
      out.push('<hr class="md-hr">');
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      closeList();
      out.push(`<blockquote class="md-quote">${inlineMd(quote[1])}</blockquote>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (listType !== "ul") {
        closeList();
        out.push('<ul class="md-list">');
        listType = "ul";
      }
      out.push(`<li>${inlineMd(bullet[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushPara();
      if (listType !== "ol") {
        closeList();
        out.push('<ol class="md-list">');
        listType = "ol";
      }
      out.push(`<li>${inlineMd(ordered[1])}</li>`);
      continue;
    }
    // "Term — definition" style rows become definition rows.
    para.push(line);
  }
  flushPara();
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, stroke based, no network)                        */
/* ------------------------------------------------------------------ */

const ICON_PATHS = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  pill: "M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7l-6 6Zm-3-9 7 7M8.5 3.5h7a5 5 0 0 1 0 10h-7",
  brain: "M9.5 3A3.5 3.5 0 0 0 6 6.5c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 4 11.3c0 1.4.8 2.6 2 3.2a3.5 3.5 0 0 0 3.5 5.5V3Zm5 0a3.5 3.5 0 0 1 3.5 3.5c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 20 11.3c0 1.4-.8 2.6-2 3.2a3.5 3.5 0 0 1-3.5 5.5V3Z",
  flask: "M9 3h6M10 3v5.2L4.6 18A2.4 2.4 0 0 0 6.8 21h10.4a2.4 2.4 0 0 0 2.2-3L14 8.2V3M7.5 14h9",
  book: "M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15.5H5.5A1.5 1.5 0 0 0 4 20V4.5Zm0 15.5h15M8 7h7",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4",
  message: "M21 12a8 8 0 0 1-8 8H8l-4 3v-4.6A8 8 0 1 1 21 12Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2-1.2L15 3H9l-.5 2.6a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2 1.2L9 21h6l.5-2.6a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  plus: "M12 5v14M5 12h14",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m6 15 6-6 6 6",
  star: "m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.5Z",
  check: "m4 12.5 5 5L20 6.5",
  x: "M6 6l12 12M18 6 6 18",
  alert: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.5m0 3V17",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2",
  zap: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  activity: "M3 12h3l3-8 4 16 3-8h5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  download: "M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16",
  upload: "M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 20h16",
  arrowLeft: "M20 12H4m0 0 6-6m-6 6 6 6",
  arrowRight: "M4 12h16m0 0-6-6m6 6-6 6",
  edit: "M4 20h4L20 8l-4-4L4 16v4Zm10-14 4 4",
  send: "M4 12 21 4l-8 17-2.5-7L4 12Z",
  flag: "M6 21V4h12l-2.5 4.5L18 13H6",
  tag: "M3 3h8l10 10-8 8L3 11V3Zm5 3.5h.01",
  pin: "M12 17v4M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10L5.6 18.4",
  menu: "M4 7h16M4 12h16M4 17h16",
  external: "M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  copy: "M9 9h10v12H9zM5 15H3V3h12v2",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  sparkles: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  play: "m8 5 11 7-11 7V5Z",
  stopwatch: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12v4l3 2M9 2.5h6",
  shield: "M12 3 5 5.5V11c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V5.5L12 3Z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  leaf: "M20 4c-8 0-14 3-14 9a7 7 0 0 0 7 7c6 0 7-8 7-16ZM6.5 20c1-5 4-8.5 9-11",
  wave: "M2 12c2.5-6 5-6 7.5 0S15 18 17.5 12 20 6 22 12",
  link: "M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  eye_off: "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.5 6.7C4.2 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1m2.6-2C20.1 14.1 21.5 12 21.5 12S18 5.5 12 5.5c-.7 0-1.4.1-2 .2",
  spark: "M12 2v5m0 10v5M2 12h5m10 0h5",
  scale: "M12 3v18M7 21h10M5 7h14M5 7 2.5 13h5L5 7Zm14 0-2.5 6h5L19 7Z",
  brain2: "M12 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 6 0v-9a3 3 0 0 0-3-3ZM9 9H7a2.5 2.5 0 1 0 0 5h2m6-5h2a2.5 2.5 0 1 1 0 5h-2",
  microscope: "M6 20h12M9 20V9.5M13.5 4.5l3 3-6.5 6.5-3-3 6.5-6.5ZM12 12l3.5 3.5M14 15.5h4a3 3 0 0 1 0 4.5H14M8 6.5 6 4.5M11 3.5l1.5 1.5",
  dna: "M5 3c0 6 14 6 14 12M19 3c0 6-14 6-14 12M5 21c0-2 1-3.4 2.5-4.5M19 21c0-2-1-3.4-2.5-4.5M7.5 6.5h9M7.5 9.5h9M9 15h6",
  atom: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0-2c0-4 1.6-7 3.6-7 2 0 1.9 3.4-.4 7-1.8 2.8-4.4 4.4-6.4 3.4-2-1-1.3-4 1-6.4C11.6 7.2 14 6.5 15 8",
  lock: "M6 11h12v10H6V11Zm2.5 0V7.5a3.5 3.5 0 0 1 7 0V11",
  unlock: "M6 11h12v10H6V11Zm2.5 0V7.5a3.5 3.5 0 0 1 6.8-1.2",
  gift: "M4 12h16v9H4v-9Zm-1-4h18v4H3V8Zm9 0v13M12 8c-1.5 0-4-.7-4-2.5S11 4 12 8Zm0 0c1.5 0 4-.7 4-2.5S13 4 12 8Z",
  bookmark: "M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1Z",
  quote: "M9 6c-3 1.5-4.5 4-4.5 7 0 3 1.5 5 4 5s3.5-1.7 3.5-3.6S10.5 11 8.6 11c-.5 0-.9.1-1.2.2C8 9.4 9.2 8 11 7L9 6Zm10 0c-3 1.5-4.5 4-4.5 7 0 3 1.5 5 4 5s3.5-1.7 3.5-3.6S20.5 11 18.6 11c-.5 0-.9.1-1.2.2C18 9.4 19.2 8 21 7l-2-1Z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  wifiOff: "M3 3l18 18M9 16.5a4 4 0 0 1 5 0M6 13a9 9 0 0 1 3-2M18.5 12.5A9 9 0 0 0 14 10.4M2.5 9.5a14 14 0 0 1 4-2.4M21.5 9.5a14 14 0 0 0-9.8-3M12 20h.01",
  sliders: "M5 21V14M5 10V3M12 21v-9M12 8V3M19 21v-5M19 12V3M2.5 14h5M9.5 8h5M16.5 16h5",
  trend: "M3 17l5.5-6 4 4L21 6m0 0h-5m5 0v5",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z",
  calculator: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01",
  body: "M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM9 10h6l1 4-2 1v6M9 10 8 14l2 1v6M12 15v6",
};

export function icon(name, size = 18, cls = "") {
  const path = ICON_PATHS[name] || ICON_PATHS.info;
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

export const ICONS = ICON_PATHS;

/* ------------------------------------------------------------------ */
/* Persistent store                                                    */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "neurodiff.state.v2";

function defaultState() {
  return {
    v: 2,
    createdAt: new Date().toISOString(),
    profile: { xp: 0, streak: 0, lastActive: null, quizzes: 0, correct: 0 },
    lessons: {},
    srs: {},
    saved: [],
    stack: [],
    labs: {},
    pk: { days: 7, rows: [] },
    symptomPick: [],
    notes: [],
    studies: [],
    history: [],
    settings: {
      accent: "violet",
      accentHex: "",
      skin: "aurora",
      density: "comfortable",
      scale: 100,
      motion: true,
      evidence: "all",
      caffeineHalfLife: 5,
      subHidden: false,
    },
  };
}

function mergeDefaults(target, defaults) {
  for (const key of Object.keys(defaults)) {
    const dv = defaults[key];
    const tv = target[key];
    const dvIsArr = Array.isArray(dv);
    const tvIsArr = Array.isArray(tv);
    // Replace anything missing or of the wrong shape, so a malformed backup can
    // never leave `store.data.profile` null and brick every view.
    if (tv === undefined || tv === null || typeof tv !== typeof dv || dvIsArr !== tvIsArr) {
      target[key] = dvIsArr ? dv.slice() : dv && typeof dv === "object" ? JSON.parse(JSON.stringify(dv)) : dv;
    } else if (dv && typeof dv === "object" && !dvIsArr && tv && typeof tv === "object" && !tvIsArr) {
      mergeDefaults(tv, dv);
    }
  }
  return target;
}

const listeners = new Set();
let saveWarned = false;

export const store = {
  data: defaultState(),

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this.data = mergeDefaults(parsed, defaultState());
        }
      }
    } catch (err) {
      console.warn("[neurodiff] state restore failed", err);
      this.data = defaultState();
    }
    return this.data;
  },

  /** @returns {boolean} false when the browser refused to persist the state. */
  save() {
    let ok = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      ok = false;
      console.warn("[neurodiff] state save failed", err);
      if (!saveWarned) {
        saveWarned = true;
        try {
          window.dispatchEvent(new CustomEvent("nd:savefail"));
        } catch (e) {
          /* no window during tests */
        }
      }
    }
    for (const fn of listeners) {
      try {
        fn(this.data);
      } catch (err) {
        console.warn("[neurodiff] listener failed", err);
      }
    }
    return ok;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Mutate state then persist + notify. */
  update(mutator) {
    const result = mutator(this.data);
    this.save();
    return result;
  },

  set(path, value) {
    const parts = path.split(".");
    let node = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
    this.save();
  },

  get(path, fallback = undefined) {
    const parts = path.split(".");
    let node = this.data;
    for (const part of parts) {
      if (node === null || node === undefined) return fallback;
      node = node[part];
    }
    return node === undefined ? fallback : node;
  },

  reset() {
    this.data = defaultState();
    this.save();
  },

  export() {
    return JSON.stringify(this.data, null, 2);
  },

  import(json) {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Not a NeuroDifference backup");
    }
    const hasProfile = parsed.profile && typeof parsed.profile === "object" && !Array.isArray(parsed.profile);
    if (!hasProfile) throw new Error("Backup has no profile — refusing to overwrite your data");
    if (parsed.v != null && Number(parsed.v) > 2) throw new Error("Backup comes from a newer version of this app");
    const previous = this.data;
    this.data = mergeDefaults(parsed, defaultState());
    if (!this.save()) {
      this.data = previous;
      throw new Error("Could not write the backup to storage");
    }
    return this.data;
  },
};

/* ------------------------------------------------------------------ */
/* Profile / gamification                                             */
/* ------------------------------------------------------------------ */

export function awardXP(amount = 10, reason = "") {
  return store.update((s) => {
    s.profile.xp = (s.profile.xp || 0) + amount;
    const today = dayKey();
    const gap = daysBetween(s.profile.lastActive, today);
    if (s.profile.lastActive !== today) {
      s.profile.streak = gap === 1 ? (s.profile.streak || 0) + 1 : 1;
      s.profile.lastActive = today;
    }
    return { xp: s.profile.xp, streak: s.profile.streak, amount, reason };
  });
}

export function touchStreak() {
  const today = dayKey();
  const s = store.data;
  if (s.profile.lastActive === today) return s.profile.streak || 0;
  const gap = daysBetween(s.profile.lastActive, today);
  return store.update((st) => {
    st.profile.streak = gap === 1 ? (st.profile.streak || 0) + 1 : 1;
    st.profile.lastActive = today;
    return st.profile.streak;
  });
}

export function levelFor(xp) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
  const floorXp = (level - 1) ** 2 * 60;
  const nextXp = level ** 2 * 60;
  return {
    level,
    xp,
    into: xp - floorXp,
    need: nextXp - floorXp,
    progress: clamp((xp - floorXp) / (nextXp - floorXp), 0, 1),
  };
}

/* ------------------------------------------------------------------ */
/* Toasts                                                             */
/* ------------------------------------------------------------------ */

let toastHost = null;

export function toast(message, kind = "info", timeout = 2600) {
  if (!toastHost || !toastHost.isConnected) toastHost = document.getElementById("toast-host");
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    toastHost.setAttribute("role", "status");
    toastHost.setAttribute("aria-live", "polite");
    document.body.appendChild(toastHost);
  }
  const node = document.createElement("div");
  node.className = `toast toast-${kind}`;
  const ic = kind === "success" ? "check" : kind === "danger" ? "alert" : kind === "warn" ? "alert" : "info";
  node.innerHTML = `${icon(ic, 16)}<span>${esc(message)}</span>`;
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add("in"));
  const kill = () => {
    node.classList.remove("in");
    setTimeout(() => node.remove(), 220);
  };
  const timer = setTimeout(kill, timeout);
  node.addEventListener("click", () => {
    clearTimeout(timer);
    kill();
  });
  return kill;
}

/* ------------------------------------------------------------------ */
/* Clipboard                                                          */
/* ------------------------------------------------------------------ */

export async function copyText(text, okMessage = "Copied") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(okMessage, "success");
    return true;
  } catch (err) {
    toast("Could not copy on this device", "danger");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Search scoring                                                     */
/* ------------------------------------------------------------------ */

export function scoreMatch(needle, haystack) {
  const q = needle.trim().toLowerCase();
  if (!q) return 0;
  const hay = String(haystack).toLowerCase();
  if (!hay) return 0;
  if (hay === q) return 100;
  if (hay.startsWith(q)) return 80;
  if (hay.includes(q)) return 55;
  // token prefix matches
  const tokens = hay.split(/[^a-z0-9α-ω]+/i).filter(Boolean);
  let score = 0;
  for (const token of tokens) {
    if (token.startsWith(q)) score = Math.max(score, 45);
    else if (q.length > 3 && token.includes(q)) score = Math.max(score, 30);
  }
  if (score) return score;
  // subsequence fallback ("bpc157" -> "BPC-157")
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return 18;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Misc UI helpers                                                    */
/* ------------------------------------------------------------------ */

export const EVIDENCE = {
  strong: { label: "Strong human evidence", short: "Strong", tone: "good" },
  moderate: { label: "Moderate evidence", short: "Moderate", tone: "ok" },
  limited: { label: "Limited human data", short: "Limited", tone: "warn" },
  preclinical: { label: "Preclinical / animal", short: "Preclinical", tone: "warn" },
  anecdotal: { label: "Anecdotal only", short: "Anecdotal", tone: "bad" },
};

export function evidenceChip(level) {
  const meta = EVIDENCE[level] || EVIDENCE.limited;
  return `<span class="chip chip-${meta.tone}" title="${esc(meta.label)}"><span class="dot"></span>${esc(meta.short)}</span>`;
}

export function emptyState(iconName, title, text, actionHtml = "") {
  return `<div class="empty">
    <div class="empty-ic">${icon(iconName, 26)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${actionHtml}
  </div>`;
}

export function disclaimer(compact = false) {
  if (compact) {
    return `<p class="disclaimer-mini">${icon("info", 14)} Educational reference only — not medical advice.</p>`;
  }
  return `<div class="disclaimer">${icon("shield", 18)}
    <div><strong>Educational reference, not medical advice.</strong>
    NeuroDifference summarises published pharmacology for study and harm-reduction literacy.
    Doses are literature reference points, never a prescription. Anything you put in your body —
    especially prescriptions, peptides, or combinations — belongs in a conversation with a clinician or pharmacist.</div>
  </div>`;
}

export function section(title, bodyHtml, { id = "", action = "", sub = "" } = {}) {
  return `<section class="block"${id ? ` id="${esc(id)}"` : ""}>
    <header class="block-head">
      <div>
        <h2>${esc(title)}</h2>
        ${sub ? `<p class="block-sub">${esc(sub)}</p>` : ""}
      </div>
      ${action}
    </header>
    ${bodyHtml}
  </section>`;
}