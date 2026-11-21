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

  function draw(now) {
    const t0 = performance.now();
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = (Math.min(W, H * 1.3) / 340) * zoom;
    const cxp = W / 2, cyp = H / 2 + 8 * zoom;
    const CAM = 560;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* ambient vignette + soft ground shadow give the model a stage */
    const amb = ctx.createRadialGradient(cxp, cyp * 0.86, 8, cxp, cyp, Math.max(W, H) * 0.78);
    amb.addColorStop(0, "rgba(255,255,255,0.05)");
    amb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);
    const gy = cyp + 122 * scale, grx = 150 * scale, gry = 24 * scale;
    const gsh = ctx.createRadialGradient(cxp, gy, 1, cxp, gy, grx);
    gsh.addColorStop(0, "rgba(0,0,0,0.34)");
    gsh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(cxp, gy);
    ctx.scale(1, gry / grx);
    ctx.translate(-cxp, -gy);
    ctx.fillStyle = gsh;
    ctx.beginPath();
    ctx.arc(cxp, gy, grx, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* project every vertex */
    for (let i = 0; i < NV; i++) {
      const p = geo.verts[i];
      const x1 = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cp - z1 * sp;
      const z2 = p.y * sp + z1 * cp;
      const f = CAM / (CAM + z2);
      const pr = proj[i];
      pr.x = cxp + x1 * f * scale;
      pr.y = cyp - y2 * f * scale;
      pr.z = z2;
    }

    /* shade + cull faces, gather visible */
    let nv = 0;
    for (let i = 0; i < NF; i++) {
      const fc = geo.faces[i];
      const nx1 = fc.nx * cy + fc.nz * sy;
      const nz1 = -fc.nx * sy + fc.nz * cy;
      const ny2 = fc.ny * cp - nz1 * sp;
      const nz2 = fc.ny * sp + nz1 * cp;
      if (nz2 >= 0) continue;                          /* back-face */
      const key = Math.max(0, nx1 * LX + ny2 * LY + nz2 * LZ);
      const fill = Math.max(0, nx1 * FX + ny2 * FY + nz2 * FZ);
      const cx1 = fc.cx * cy + fc.cz * sy;
      const cz1 = -fc.cx * sy + fc.cz * cy;
      const depth = fc.cy * sp + cz1 * cp;
      fdepth[i] = depth;
      /* baked AO + silhouette rim darkening + a whisper of depth cue */
      const rim = Math.pow(1 - Math.abs(nz2), 3);
      const dc = 1 - 0.10 * clamp((depth + 120) / 260, 0, 1);
      fc._d = (0.16 + 0.88 * key + 0.20 * fill) * fc.ao * (1 - 0.20 * rim) * dc;
      fc._nx = nx1; fc._ny = ny2; fc._nz = nz2;
      order[nv++] = i;
    }
    const vis = order.slice(0, nv);
    vis.sort((a, b) => fdepth[b] - fdepth[a]);

    /* fill far -> near; focus mode ghosts unlit cortex (x-ray) */
    hitFaces = [];
    ctx.lineJoin = "round";
    const edgeStyle = `rgba(${Math.round(accLight[0])},${Math.round(accLight[1])},${Math.round(accLight[2])},0.45)`;
    for (let k = 0; k < nv; k++) {
      const i = vis[k];
      const fc = geo.faces[i];
      const level = lit.get(fc.region) || 0;
      const bucket = clamp(Math.round(fc._d * (BUCKETS - 1)), 0, BUCKETS - 1);
      const A = proj[fc.a], B = proj[fc.b], Cc = proj[fc.c];
      let col;
      if (level === 0 && hoverRegion === fc.region) col = hoverCache[fc.tone][bucket];
      else col = shadeCache[fc.tone][level][bucket];
      ctx.globalAlpha = focus && level === 0 ? 0.30 : 1;
      ctx.fillStyle = col;
      ctx.strokeStyle = col;   /* hairline seam hides raster gaps */
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(Cc.x, Cc.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      /* crystalline edge on the selected region */
      if (level === 2) {
        ctx.strokeStyle = edgeStyle;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      /* specular sheen on faces angled toward the key light */
      if (!lowQ) {
        const hd = fc._nx * HX + fc._ny * HY + fc._nz * HZ;
        if (hd > 0.6) {
          const spec = Math.pow(hd, 24) * 0.35;
          if (spec > 0.02) {
            ctx.globalAlpha = Math.min(0.30, spec);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          }
        }
      }
      if (fc.region) hitFaces.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, cx: Cc.x, cy: Cc.y, d: fdepth[i], region: fc.region });
    }
    ctx.globalAlpha = 1;

    /* synapse sparks */
    const t = now * 0.001;
    if (!motionOff() && !lowQ) {
      ctx.fillStyle = "#eafff8";
      for (const s of geo.sparks) {
        s.t += s.v;
        if (s.t > 1) s.t -= 1;
        const A = proj[s.a], B = proj[s.b];
        const x = A.x + (B.x - A.x) * s.t;
        const y = A.y + (B.y - A.y) * s.t;
        ctx.globalAlpha = 0.45 * Math.sin(s.t * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 1.0 * scale, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* project anchors once (used by pathway lines, hotspots, labels) */
    anchorScreen.clear();
    for (const a of anchors) {
      const x1 = a.X * cy + a.Z * sy;
      const z1 = -a.X * sy + a.Z * cy;
      const y2 = a.Y * cp - z1 * sp;
      const z2 = a.Y * sp + z1 * cp;
      const f = CAM / (CAM + z2);
      anchorScreen.set(a.id, { x: cxp + x1 * f * scale, y: cyp - y2 * f * scale, front: z2 < 6, a });
    }

    /* faint pathway lines between lit anchors in focus mode */
    if (focus) {
      const litPts = [];
      for (const [id, p] of anchorScreen) if ((lit.get(id) || 0) > 0) litPts.push(p);
      if (litPts.length > 1 && litPts.length <= 10) {
        ctx.strokeStyle = edgeStyle;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < litPts.length; i++)
          for (let j = i + 1; j < litPts.length; j++) {
            ctx.moveTo(litPts[i].x, litPts[i].y);
            ctx.lineTo(litPts[j].x, litPts[j].y);
          }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    /* region hotspots + labels (decluttered: text only when lit / zoomed) */
    ctx.textAlign = "center";
    ctx.font = "600 10px system-ui, sans-serif";
    for (const [id, p] of anchorScreen) {
      const a = p.a;
      const level = lit.get(id) || 0;
      const showDot = level > 0 || (a.surface && p.front);
      if (!showDot) continue;
      let alpha = level > 0 ? (p.front ? 0.9 : 0.25) : 0.5;
      if (focus && !level) alpha *= 0.4;
      if (level === 2) alpha = 1;
      /* soft glow halo for lit nuclei (reads through the ghosted cortex) */
      if (level > 0) {
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillStyle = level === 2 ? "#ffffff" : a.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = level === 2 ? "#ffffff" : a.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, level === 2 ? 3.4 : 2.2, 0, TAU);
      ctx.fill();
      if (level > 0) {
        const pulse = motionOff() ? 0.5 : (t * 1.4 + a.X * 0.01) % 1;
        ctx.globalAlpha = alpha * (1 - pulse) * 0.7;
        ctx.strokeStyle = level === 2 ? "#ffffff" : a.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 + pulse * 11, 0, TAU);
        ctx.stroke();
      }
      const showLabel = level > 0 || (a.surface && p.front && zoom > 1.5 && !focus);
      if (showLabel) {
        ctx.globalAlpha = level > 0 ? 0.95 : 0.6;
        ctx.fillStyle = level > 0 ? "#ffffff" : a.color;
        ctx.fillText(a.short, p.x, p.y + 13);
      }
    }
    ctx.globalAlpha = 1;

    /* hover tooltip (mouse only) — drawn on canvas, never overlaps DOM text */
    if (hoverRegion && !dragging) {
      const a = anchorById.get(hoverRegion);
      const label = a ? a.short : hoverRegion;
      ctx.font = "600 11px system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const bw = tw + 18, bh = 24;
      let bx = hoverX + 14, by = hoverY - bh - 8;
      bx = clamp(bx, 6, W - bw - 6);
      by = clamp(by, 6, H - bh - 6);
      ctx.beginPath();
      const r = 7;
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
      ctx.arcTo(bx, by + bh, bx, by, r);
      ctx.arcTo(bx, by, bx + bw, by, r);
      ctx.closePath();
      ctx.fillStyle = "rgba(12,14,12,0.92)";
      ctx.fill();
      ctx.strokeStyle = `rgba(${Math.round(acc[0])},${Math.round(acc[1])},${Math.round(acc[2])},0.55)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#e9ebe6";
      ctx.textAlign = "left";
      ctx.fillText(label, bx + 9, by + 16);
      ctx.textAlign = "center";
    }

    /* adaptive quality: sustained slow frames drop sheen / sparks / dpr */
    const dt = performance.now() - t0;
    emaMs = emaMs * 0.9 + dt * 0.1;
    if (!lowQ && emaMs > 26) { lowQ = true; resize(); }
    else if (lowQ && emaMs < 13) { lowQ = false; resize(); }
  }

  /* ---- loop control ------------------------------------------------------ */

  function frame(now) {
    raf = 0;
    if (!canvas.isConnected) { ac.abort(); ro.disconnect(); io.disconnect(); return; }
    if (!visible || document.hidden) return;
    const idle = motionOff();
    if (auto && !idle && !dragging) yaw += 0.0032;
    if (!dragging && (Math.abs(vyaw) > 0.0004 || Math.abs(vpitch) > 0.0004)) {
      yaw += vyaw;
      pitch = clamp(pitch + vpitch, -1.15, 1.15);
      vyaw *= 0.94; vpitch *= 0.94;
      dirty = true;
    }
    const sparksActive = !idle && !lowQ && geo.sparks.length;
    if (dirty || (auto && !idle) || sparksActive) {
      draw(now || 0);
      dirty = false;
    }
    if (auto && !idle) raf = requestAnimationFrame(frame);
    else if (Math.abs(vyaw) > 0.0004 || Math.abs(vpitch) > 0.0004) raf = requestAnimationFrame(frame);
    else if (sparksActive) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && visible && !document.hidden && canvas.isConnected) raf = requestAnimationFrame(frame);
  }

  /* ---- interaction ------------------------------------------------------- */

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const ptrs = new Map();
  let dragging = false, moved = 0, lastX = 0, lastY = 0, pinch = 0;

  function pip(px, py, f) {
    const d1 = (px - f.bx) * (f.ay - f.by) - (f.ax - f.bx) * (py - f.by);
    const d2 = (px - f.cx) * (f.by - f.cy) - (f.bx - f.cx) * (py - f.cy);
    const d3 = (px - f.ax) * (f.cy - f.ay) - (f.cx - f.ax) * (py - f.ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }

  /* nearest visible surface face under the point, else a front hotspot */
  function pick(x, y) {
    let best = null, bestD = Infinity;
    for (const f of hitFaces) {
      if (f.d < bestD && pip(x, y, f)) { bestD = f.d; best = f.region; }
    }
    if (!best) {
      let bd = 18;
      for (const [id, p] of anchorScreen) {
        if (!p.front) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = id; }
      }
    }
    return best;
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; vyaw = 0; vpitch = 0;
      hoverRegion = null;
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    kick();
  }, sig);

  canvas.addEventListener("pointermove", (e) => {
    /* mouse hover (no buttons): throttled region pick + tooltip */
    if (e.pointerType === "mouse" && !dragging && ptrs.size === 0) {
      const now = performance.now();
      if (now - lastHoverPick > 90) {
        lastHoverPick = now;
        const rect = canvas.getBoundingClientRect();
        hoverX = e.clientX - rect.left; hoverY = e.clientY - rect.top;
        const id = pick(hoverX, hoverY);
        if (id !== hoverRegion) { hoverRegion = id; dirty = true; }
        else dirty = true;   /* tooltip follows the cursor */
        canvas.style.cursor = id ? "pointer" : "grab";
        kick();
      }
      return;
    }
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) { zoom = clamp(zoom * (d / pinch), 0.55, 2.4); dirty = true; }
      pinch = d; kick(); return;
    }
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    yaw += dx * 0.0052;
    pitch = clamp(pitch + dy * 0.0042, -1.15, 1.15);
    vyaw = dx * 0.0052; vpitch = dy * 0.0042;
    dirty = true; kick();
  }, sig);

  canvas.addEventListener("pointerleave", () => {
    if (hoverRegion) { hoverRegion = null; dirty = true; kick(); }
    canvas.style.cursor = "grab";
  }, sig);

  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = 0;
    if (ptrs.size === 0) {
      dragging = false;
      if (moved < 7) {
        const rect = canvas.getBoundingClientRect();
        const best = pick(e.clientX - rect.left, e.clientY - rect.top);
        if (best && opts.onSelect) opts.onSelect(best);
      }
      kick();
    }
  }
  canvas.addEventListener("pointerup", endPtr, sig);
  canvas.addEventListener("pointercancel", endPtr, sig);

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom = clamp(zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.55, 2.4);
    dirty = true; kick();
  }, { passive: false, signal: ac.signal });

  canvas.addEventListener("dblclick", () => {
    yaw = 0.62; pitch = 0.16; zoom = 1; vyaw = 0; vpitch = 0; dirty = true; kick();
  }, sig);

  /* Right-click must not pop the browser's native context menu over the model. */
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), sig);

  /* ---- lifecycle --------------------------------------------------------- */

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) { dirty = true; kick(); }
  }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { dirty = true; kick(); }
  }, sig);

  resize();
  sync();

  return {
    sync, kick,
    setAuto(b) { auto = !!b; dirty = true; kick(); },
    isAuto() { return auto; },
    reset() {
      yaw = 0.62; pitch = 0.16; zoom = 1; vyaw = 0; vpitch = 0;
      dirty = true; kick();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ac.abort();
      ro.disconnect();
      io.disconnect();
    },
  };
}

export default { buildGeometry, mountBrain3D };