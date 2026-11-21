/* ==========================================================================
   Brain 3D v5 — procedural brain, rewritten renderer. Zero deps, canvas 2D.
   Gross anatomy follows the real cerebrum (~140 x 167 x 93 mm, W/L ~ 0.84):
   two hemispheres almost touching, DIRECTIONAL gyri (horizontal ridges in
   frontal/temporal lobes, vertical pre/postcentral ridges), broad rounded
   crests with narrow clefts, deep Sylvian / central / STS / intraparietal
   fissures darkened by baked AO, cerebellum with fine transverse folia under
   the occipital lobe, tapered brainstem (midbrain -> pons -> medulla -> cord).

   What is new vs v4:
   - per-LOBE tissue tones derived from one base palette (no uniform dough);
   - two-light rig (warm key + cool fill) + Blinn specular sheen + depth cue;
   - selection tints toward the skin --accent (not red), lit regions get a
     crystalline edge; focus mode ghosts the unlit cortex (x-ray) so deep
     nuclei glow through, with faint pathway lines between lit anchors;
   - mouse hover picks a region, lightens it and shows a canvas tooltip;
   - adaptive quality: sustained slow frames drop specular / sparks / dpr.
   Public API unchanged: mountBrain3D(canvas, {regions, palette, getLit,
   onSelect}) -> {sync, kick, setAuto, isAuto, reset, destroy}; buildGeometry().
   Drag orbit + inertia, pinch/wheel zoom, auto-rotate, reduced-motion honored.
   ========================================================================== */

const TAU = Math.PI * 2;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

/* --------------------------------------------------------------------------
   Region tagging — surface point -> one of the 28 region ids.
   x: anterior(+)/posterior(-), y: superior(+)/inferior(-), z: left/right.
   Deep/mid nuclei are internal; they are reached through their hotspots.
   -------------------------------------------------------------------------- */

function regionAt(x, y, z, part) {
  if (part === 1) return "cerebellum";
  if (part === 2) {
    if (y > -88) return "pons";
    if (y > -112) return "medulla";
    return "spinal-cord";
  }
  const az = Math.abs(z);
  if (x > 112 && y < -36) return "olfactory-bulb";
  if (x < -88) return "occipital-cortex";
  if (x > 55) return y < -22 ? "orbitofrontal" : "prefrontal-cortex";
  if (y < -24 && az > 26 && x > -85) return "temporal-cortex";
  if (az > 30 && x > -25 && x < 40 && y > -28 && y < 4) return "insula";
  if (az < 18 && x > -12 && x < 72 && y > -10 && y < 48) return "anterior-cingulate";
  if (y > 34) return x > -8 ? "motor-cortex" : "parietal-cortex";
  if (y > 14 && x <= -8) return "parietal-cortex";
  if (x > 20) return "prefrontal-cortex";
  if (x < -40) return "occipital-cortex";
  return "parietal-cortex";
}

/* Each surface region maps to a tissue tone (index into the renderer's tone
   table). Tones are subtle shifts of ONE base palette, so the brain reads as
   a single organ with anatomically distinct lobes — not a patchwork. */
const TONE_OF = {
  "prefrontal-cortex": 0, orbitofrontal: 0,
  "motor-cortex": 1, "parietal-cortex": 1,
  "temporal-cortex": 2,
  "occipital-cortex": 3,
  insula: 4,
  "anterior-cingulate": 5,
  "olfactory-bulb": 6,
  cerebellum: 7,
  pons: 8, medulla: 8, "spinal-cord": 8,
};

/* --------------------------------------------------------------------------
   Geometry — deterministic, built once per mount.
   verts: [{x,y,z,ao}]
   faces: [{a,b,c,nx,ny,nz,cx,cy,cz,ao,part,region,tone}]
   -------------------------------------------------------------------------- */

export function buildGeometry() {
  const verts = [];
  const faces = [];
  const V = (x, y, z, ao) => verts.push({ x, y, z, ao: ao == null ? 1 : ao }) - 1;

  const centroids = {};
  const tag = (x, y, z, part) => {
    const id = regionAt(x, y, z, part);
    const c = centroids[id] || (centroids[id] = { x: 0, y: 0, z: 0, n: 0 });
    c.x += x; c.y += y; c.z += z; c.n++;
    return id;
  };

  function addFace(a, b, c, part) {
    const A = verts[a], B = verts[b], C = verts[c];
    const cx = (A.x + B.x + C.x) / 3;
    const cy = (A.y + B.y + C.y) / 3;
    const cz = (A.z + B.z + C.z) / 3;
    let nx = (B.y - A.y) * (C.z - A.z) - (B.z - A.z) * (C.y - A.y);
    let ny = (B.z - A.z) * (C.x - A.x) - (B.x - A.x) * (C.z - A.z);
    let nz = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    /* orient outward from the part's local centre / axis */
    let rx, ry, rz;
    if (part === 2) {
      const u = clamp((-58 - cy) / 64, 0, 1);
      rx = cx - (-22 - 18 * u); ry = 0; rz = cz;
    } else if (part === 1) {
      rx = cx + 104; ry = cy + 76; rz = cz;
    } else {
      rx = cx; ry = cy; rz = cz;
    }
    if (nx * rx + ny * ry + nz * rz < 0) { nx = -nx; ny = -ny; nz = -nz; const t = b; b = c; c = t; }
    const len = Math.hypot(nx, ny, nz) || 1;
    const region = regionAt(cx, cy, cz, part);
    faces.push({
      a, b, c, nx: nx / len, ny: ny / len, nz: nz / len,
      cx, cy, cz, ao: (A.ao + B.ao + C.ao) / 3, part, region,
      tone: TONE_OF[region] != null ? TONE_OF[region] : 1,
    });
  }

  /* ---- Cerebrum: two shaped, gyrified, fissure-carved hemispheres -------- */
  const R = 30, C = 42;
  const cortexCount = 2 * (R + 1) * C;
  for (const s of [-1, 1]) {
    const grid = [];
    for (let i = 0; i <= R; i++) {
      const t = (i / R) * Math.PI;
      const row = [];
      for (let j = 0; j < C; j++) {
        const p = (s === 1 ? 0 : Math.PI) + (j / (C - 1)) * Math.PI;
        const st = Math.sin(t), ct = Math.cos(t);
        let x = 145 * st * Math.cos(p);
        let y = 82 * ct;
        let z = 118 * st * Math.sin(p);
        /* smooth lobar shaping (real silhouette, no hard creases) */
        const fr = ss(70, 145, x);                 /* frontal pole rounds in */
        y *= 1 - 0.10 * fr; z *= 1 - 0.12 * fr;
        const oc = ss(-80, -145, x);               /* occipital pole tapers */
        y *= 1 - 0.16 * oc; z *= 1 - 0.20 * oc;
        const tb = Math.exp(-Math.pow((x - 15) / 85, 2)) * Math.exp(-Math.pow((y + 38) / 26, 2));
        z *= 1 + 0.15 * tb; y -= 10 * tb;          /* temporal lobe bulge */
        /* ellipsoid normal for displacement */
        let ux = x / 21025, uy = y / 6724, uz = z / 13924;
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        /* DIRECTIONAL gyri: horizontal ridges in frontal/temporal lobes,
           vertical ridges in the pre/postcentral band. Broad rounded crests,
           narrow clefts (pow < 1 on |w|, positive-biased). */
        const vert = ss(58, 34, x) * (1 - ss(-22, -46, x)) * ss(-12, 10, y);
        const h = Math.sin(7.5 * t + 1.6 * Math.sin(2.3 * p) + 0.5 * Math.sin(5.1 * p));
        const v = Math.sin(9.0 * p + 1.4 * Math.sin(3.1 * t));
        const w = (1 - vert) * h + vert * v;
        const g = Math.pow(Math.abs(w), 0.55);
        const fine = 0.30 * Math.sin(11.5 * p + 7.0 * t + 1.9 * Math.sin(4.2 * t));
        const fade = clamp((z * s - 2) / 18, 0, 1) * clamp((y + 66) / 20, 0, 1);
        const disp = (9.0 * (g - 0.55) + 1.6 * fine) * fade;
        x += disp * ux; y += disp * uy; z += disp * uz;
        /* major fissures — narrow, deep clefts carved after the folds */
        const az = Math.abs(z);
        const lat = ss(26, 46, az);
        const win = ss(-82, -60, x) * (1 - ss(80, 100, x));
        let groove = 0;
        groove += 13 * lat * win * Math.exp(-Math.pow((y - (-14 + 0.10 * x)) / 5.4, 2));  /* Sylvian */
        groove += 6.5 * lat * win * Math.exp(-Math.pow((y + 38) / 4.5, 2));               /* superior temporal */
        const cwin = ss(4, 20, y) * (1 - ss(72, 82, y));
        groove += 8.5 * lat * cwin * Math.exp(-Math.pow((x - (22 - 0.26 * y)) / 4.2, 2)); /* central sulcus */
        const pwin = ss(-70, -40, x) * (1 - ss(-6, 14, x)) * ss(24, 40, y);
        groove += 5 * lat * pwin * Math.exp(-Math.pow((y - 46) / 4.5, 2));                /* intraparietal */
        const fwin = ss(58, 84, x) * (1 - ss(120, 140, y)) * ss(-6, 8, y);
        groove += 4.5 * lat * fwin * Math.exp(-Math.pow((y - 16) / 4.0, 2));              /* inferior frontal */
        if (groove > 0) { x -= groove * ux; y -= groove * uy; z -= groove * uz; }
        const ao = clamp(1 - 0.05 * groove - 0.02 * Math.max(0, -disp), 0.45, 1);
        /* medial walls almost touch — thin longitudinal fissure (~5 units) */
        if (z * s < 2) z = s * (2 + (z * s - 2) * 0.18);
        z += s * 0.9;
        if (y < -66) y = -66 + (y + 66) * 0.35;    /* flat base */
        tag(x, y, z, 0);
        row.push(V(x, y, z, ao));
      }
      grid.push(row);
    }
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C - 1; j++) {
        addFace(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], 0);
        addFace(grid[i][j], grid[i + 1][j + 1], grid[i][j + 1], 0);
      }
  }

  /* ---- Cerebellum: under the occipital lobe, fine transverse folia ------- */
  const cbR = 22, cbC = 36;
  const cbGrid = [];
  for (let i = 0; i <= cbR; i++) {
    const t = (i / cbR) * Math.PI;
    const row = [];
    for (let j = 0; j < cbC; j++) {
      const p = (j / cbC) * TAU;
      const fol = Math.sin(10 * t);
      const f = 1 + 0.05 * Math.sign(fol) * Math.pow(Math.abs(fol), 0.6) + 0.02 * Math.sin(7 * p);
      const x = 48 * Math.sin(t) * Math.cos(p) * f - 104;
      const y = 30 * Math.cos(t) * f - 76;
      const z = 70 * Math.sin(t) * Math.sin(p) * f;
      const ao = clamp(0.78 + (f - 1) * 3, 0.55, 1);
      tag(x, y, z, 1);
      row.push(V(x, y, z, ao));
    }
    cbGrid.push(row);
  }
  for (let i = 0; i < cbR; i++)
    for (let j = 0; j < cbC; j++) {
      const j1 = (j + 1) % cbC;
      addFace(cbGrid[i][j], cbGrid[i + 1][j], cbGrid[i + 1][j1], 1);
      addFace(cbGrid[i][j], cbGrid[i + 1][j1], cbGrid[i][j1], 1);
    }

  /* ---- Brainstem: midbrain -> pons bulge -> medulla -> cord -------------- */
  const stR = 12, stC = 18;
  const stGrid = [];
  for (let k = 0; k <= stR; k++) {
    const u = k / stR;
    const cx = -22 - 18 * u;
    const cy = -58 - 64 * u;
    const r = 13 * (1 - u * 0.5) + 3.4 * Math.exp(-Math.pow((u - 0.32) / 0.18, 2));
    const row = [];
    for (let j = 0; j < stC; j++) {
      const p = (j / stC) * TAU;
      const x = cx + r * 0.62 * Math.cos(p);
      const z = r * Math.sin(p);
      tag(x, cy, z, 2);
      row.push(V(x, cy, z, 0.92));
    }
    stGrid.push(row);
  }
  for (let k = 0; k < stR; k++)
    for (let j = 0; j < stC; j++) {
      const j1 = (j + 1) % stC;
      addFace(stGrid[k][j], stGrid[k + 1][j], stGrid[k + 1][j1], 2);
      addFace(stGrid[k][j], stGrid[k + 1][j1], stGrid[k][j1], 2);
    }

  /* ---- Synapse sparks (subtle, skipped in low-quality / reduced-motion) -- */
  const sparks = [];
  for (let k = 0; k < 28; k++) {
    const a = Math.floor(hash(k * 3 + 1) * cortexCount);
    const b = hash(k * 7 + 2) > 0.5 ? a + 1 : a + C;
    if (b < cortexCount) sparks.push({ a, b, t: hash(k * 11 + 5), v: 0.004 + 0.007 * hash(k * 13 + 9) });
  }

  for (const id in centroids) {
    const c = centroids[id];
    centroids[id] = { x: c.x / c.n, y: c.y / c.n, z: c.z / c.n, n: c.n };
  }

  return { verts, faces, sparks, centroids };
}

/* --------------------------------------------------------------------------
   Renderer
   -------------------------------------------------------------------------- */

export function mountBrain3D(canvas, opts) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const geo = buildGeometry();
  const NV = geo.verts.length;
  const NF = geo.faces.length;
  const reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionOff = () =>
    reduced || document.documentElement.getAttribute("data-motion") === "off";

  const pal = opts.palette || {};
  const rgb = (c, fb) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim());
    if (!m) return fb;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /* One tissue base per part; lobe tones are subtle shifts of the cortex base. */
  const bases = [
    rgb(pal.cortex, [201, 167, 155]),
    rgb(pal.cerebellum, [176, 138, 128]),
    rgb(pal.stem, [203, 185, 164]),
  ];
  /* tone table: [source part, per-channel multiplier] — frontal a touch
     lighter/warmer, occipital cooler/darker, insula recessed, etc. */
  const TONE_DEF = [
    [0, [1.05, 1.03, 1.00]],
    [0, [1.00, 1.00, 1.00]],
    [0, [0.97, 0.94, 0.93]],
    [0, [0.90, 0.91, 0.95]],
    [0, [0.84, 0.82, 0.82]],
    [0, [1.02, 1.00, 0.99]],
    [0, [1.08, 1.05, 1.00]],
    [1, [1.00, 1.00, 1.00]],
    [2, [1.00, 1.00, 1.00]],
  ];
  const tones = TONE_DEF.map(([src, k]) => {
    const b = bases[src];
    return [clamp(b[0] * k[0], 0, 255), clamp(b[1] * k[1], 0, 255), clamp(b[2] * k[2], 0, 255)];
  });

  /* selection follows the active skin's --accent (teal in Field Lab) */
  let acc = [63, 184, 163];
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    acc = rgb(v, acc);
  } catch (e) { /* keep fallback */ }
  const accLight = [clamp(acc[0] + 90, 0, 255), clamp(acc[1] + 90, 0, 255), clamp(acc[2] + 90, 0, 255)];

  /* shade cache: [tone][litLevel][bucket] -> css rgb string.
     Top buckets blend toward white for a glossy crest. */
  const BUCKETS = 40;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const WHITE = [255, 255, 255];
  const shadeCache = tones.map((base) => {
    const tints = [base, mix(base, acc, 0.30), mix(base, acc, 0.80)];
    return tints.map((tc) => {
      const arr = [];
      for (let b = 0; b < BUCKETS; b++) {
        const sh = 0.16 + 0.84 * (b / (BUCKETS - 1));
        let c = [tc[0] * sh, tc[1] * sh, tc[2] * sh];
        if (b > BUCKETS - 6) c = mix(c, WHITE, ((b - (BUCKETS - 6)) / 5) * 0.16);
        arr.push(`rgb(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))})`);
      }
      return arr;
    });
  });
  const hoverCache = tones.map((base) => {
    const hc = mix(base, WHITE, 0.12);
    const arr = [];
    for (let b = 0; b < BUCKETS; b++) {
      const sh = 0.16 + 0.84 * (b / (BUCKETS - 1));
      arr.push(`rgb(${Math.round(clamp(hc[0] * sh, 0, 255))},${Math.round(clamp(hc[1] * sh, 0, 255))},${Math.round(clamp(hc[2] * sh, 0, 255))})`);
    }
    return arr;
  });

  /* Hotspot anchors: surface regions sit on their real centroid; deep / mid
     nuclei keep the schematic inward projection and show only when lit. */
  const anchors = (opts.regions || []).map((r) => {
    const c = geo.centroids[r.id];
    if (c && c.n > 0) {
      return { id: r.id, short: r.short || r.name, X: c.x, Y: c.y, Z: c.z, color: r.color || "#3fb8a3", surface: true };
    }
    const X = (r.x - 210) * 0.66;
    const Y = -(r.y - 152) * 0.66;
    const q = Math.max(0, 1 - (X / 145) ** 2 - (Y / 82) ** 2);
    let Z = 112 * Math.sqrt(q);
    if (r.layer === "deep") Z *= 0.25;
    else if (r.layer === "mid") Z *= 0.6;
    return { id: r.id, short: r.short || r.name, X, Y, Z: Z + 8, color: r.color || "#3fb8a3", surface: false };
  });
  const anchorById = new Map(anchors.map((a) => [a.id, a]));

  /* Camera state */
  let yaw = 0.62, pitch = 0.16, zoom = 1;
  let vyaw = 0, vpitch = 0;
  let auto = !motionOff();
  let lit = new Map();
  let focus = false;
  let dirty = true, raf = 0, visible = true;
  let W = 0, H = 0, dpr = 1;
  let hoverRegion = null, hoverX = 0, hoverY = 0, lastHoverPick = 0;
  let lowQ = false, emaMs = 12;

  const proj = new Array(NV);
  for (let i = 0; i < NV; i++) proj[i] = { x: 0, y: 0, z: 0 };
  const fdepth = new Float64Array(NF);
  const order = new Array(NF);
  for (let i = 0; i < NF; i++) order[i] = i;
  const anchorScreen = new Map();
  let hitFaces = [];

  /* two-light rig: warm key upper-left-front, cool fill from the right */
  const Ll = Math.hypot(-0.38, 0.60, -0.69);
  const LX = -0.38 / Ll, LY = 0.60 / Ll, LZ = -0.69 / Ll;
  const Fl = Math.hypot(0.55, 0.12, -0.82);
  const FX = 0.55 / Fl, FY = 0.12 / Fl, FZ = -0.82 / Fl;
  /* half-vector between key light and view (0,0,-1) for the specular sheen */
  const Hl = Math.hypot(LX, LY, LZ - 1);
  const HX = LX / Hl, HY = LY / Hl, HZ = (LZ - 1) / Hl;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(lowQ ? 1.5 : 2, window.devicePixelRatio || 1);
    W = Math.max(80, rect.width);
    H = Math.max(80, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    dirty = true;
    kick();
  }

  function sync() {
    const st = (opts.getLit && opts.getLit()) || { lit: new Map(), focus: false };
    lit = st.lit || new Map();
    focus = !!st.focus;
    dirty = true;
    kick();
  }

  /* __CHUNK3__ */
}