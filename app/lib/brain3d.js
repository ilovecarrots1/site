/* ==========================================================================
   Brain 3D — hand-rolled procedural brain + canvas renderer. Zero deps.
   A solid, lambert-shaded pink brain: two gyrencephalic hemispheres carved
   with the major fissures (Sylvian, central, superior temporal), a cerebellum
   with fine folia and a tapered brainstem (pons -> medulla -> cord). Every
   surface face carries a region id, so clicking a part highlights it red and
   opens the existing region card. Drag to orbit, pinch/wheel to zoom, inertia,
   auto-rotate. Honors prefers-reduced-motion (static until interacted).
   ========================================================================== */

const TAU = Math.PI * 2;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* --------------------------------------------------------------------------
   Region tagging — map a 3D surface point to one of the 28 region ids.
   x: anterior(+) / posterior(-), y: superior(+) / inferior(-), z: left/right.
   Deep / mid nuclei are internal and are reached through their hotspots.
   -------------------------------------------------------------------------- */

function regionAt(x, y, z, part) {
  if (part === 1) return "cerebellum";
  if (part === 2) {
    if (y > -92) return "pons";
    if (y > -116) return "medulla";
    return "spinal-cord";
  }
  const az = Math.abs(z);
  if (x > 118 && y < -38) return "olfactory-bulb";
  if (x < -92) return "occipital-cortex";
  if (x > 58) return y < -22 ? "orbitofrontal" : "prefrontal-cortex";
  if (y < -26 && az > 22 && x > -85) return "temporal-cortex";
  if (az > 30 && x > -22 && x < 38 && y > -26 && y < 8) return "insula";
  if (az < 16 && x > -12 && x < 72 && y > -12 && y < 56) return "anterior-cingulate";
  if (y > 42) return x > -8 ? "motor-cortex" : "parietal-cortex";
  if (y > 18 && x <= -8) return "parietal-cortex";
  if (x > 20) return "prefrontal-cortex";
  if (x < -40) return "occipital-cortex";
  return "parietal-cortex";
}

/* --------------------------------------------------------------------------
   Geometry — deterministic, built once.
   verts: [{x,y,z}]  faces: [{a,b,c,nx,ny,nz,cx,cy,cz,part,region}]
   sparks: travelling synapse dots between neighbouring cortical verts.
   centroids: per-region surface centroid (for accurate hotspot anchors).
   -------------------------------------------------------------------------- */

export function buildGeometry() {
  const verts = [];
  const faces = [];
  const V = (x, y, z) => verts.push({ x, y, z }) - 1;

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
      const u = clamp((-68 - cy) / 60, 0, 1);
      rx = cx - (-30 - 18 * u); ry = 0; rz = cz;
    } else if (part === 1) {
      rx = cx + 108; ry = cy + 64; rz = cz;
    } else {
      rx = cx; ry = cy; rz = cz;
    }
    if (nx * rx + ny * ry + nz * rz < 0) { nx = -nx; ny = -ny; nz = -nz; const t = b; b = c; c = t; }
    const len = Math.hypot(nx, ny, nz) || 1;
    faces.push({
      a, b, c, nx: nx / len, ny: ny / len, nz: nz / len,
      cx, cy, cz, part, region: regionAt(cx, cy, cz, part),
    });
  }

  /* ---- Cerebrum: two shaped, gyrified, fissure-carved hemispheres -------- */
  const R = 24, C = 32;
  const cortexCount = 2 * (R + 1) * C;
  for (const s of [-1, 1]) {
    const grid = [];
    for (let i = 0; i <= R; i++) {
      const t = (i / R) * Math.PI;
      const row = [];
      for (let j = 0; j < C; j++) {
        const p = (s === 1 ? 0 : Math.PI) + (j / (C - 1)) * Math.PI;
        const st = Math.sin(t), ct = Math.cos(t);
        let x = 150 * st * Math.cos(p);
        let y = 100 * ct;
        let z = 62 * st * Math.sin(p);
        if (x > 95) { y *= 0.94; z *= 0.94; }            /* frontal taper */
        if (x < -105) { y *= 0.9; z *= 0.9; }            /* occipital taper */
        if (y < -18 && x > -70 && x < 85) { z *= 1.14; y -= 7; } /* temporal bulge */
        /* gyrencephalic folding — worm-like interference ridges */
        const n =
          0.055 * Math.sin(5.0 * p + 1.8 * Math.sin(2.6 * t)) * Math.sin(3.6 * t + 1.1 * Math.sin(4.0 * p)) +
          0.030 * Math.sin(9.0 * p + 5.0 * t + 0.7) +
          0.018 * Math.sin(14.0 * t + 8.0 * p + 2.1) +
          0.012 * Math.sin(20.0 * p + 13.0 * t);
        x *= 1 + n; y *= 1 + n; z *= 1 + n;
        /* carve the major fissures perpendicular to the ellipsoid surface */
        let ux = x / 22500, uy = y / 10000, uz = z / 3844;
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const az = Math.abs(z);
        let groove = 0;
        if (az > 26 && x > -78 && x < 88) {              /* Sylvian / lateral */
          groove += 7.5 * Math.exp(-Math.pow((y - (-16 + 0.12 * x)) / 9, 2));
          groove += 4.5 * Math.exp(-Math.pow((y + 40) / 8, 2)); /* superior temporal */
        }
        if (y > 16 && az > 12) {                          /* central sulcus */
          groove += 5.5 * Math.exp(-Math.pow((x - (26 - 0.32 * y)) / 8, 2));
        }
        if (groove > 0) { x -= groove * ux; y -= groove * uy; z -= groove * uz; }
        if (z * s < 9) z = s * (9 + (z * s - 9) * 0.22);  /* medial flatten */
        z += s * 7;                                       /* longitudinal fissure */
        if (y < -80) y = -80 + (y + 80) * 0.35;           /* flat base */
        tag(x, y, z, 0);
        row.push(V(x, y, z));
      }
      grid.push(row);
    }
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C - 1; j++) {
        addFace(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], 0);
        addFace(grid[i][j], grid[i + 1][j + 1], grid[i][j + 1], 0);
      }
  }

  /* ---- Cerebellum: ellipsoid with fine horizontal folia ------------------ */
  const cbR = 12, cbC = 28;
  const cbGrid = [];
  for (let i = 0; i <= cbR; i++) {
    const t = (i / cbR) * Math.PI;
    const row = [];
    for (let j = 0; j < cbC; j++) {
      const p = (j / cbC) * TAU;
      const f = 1 + 0.06 * Math.sin(11 * t) + 0.025 * Math.sin(7 * p);
      const x = 52 * Math.sin(t) * Math.cos(p) * f - 108;
      const y = 36 * Math.cos(t) * f - 64;
      const z = 54 * Math.sin(t) * Math.sin(p) * f;
      tag(x, y, z, 1);
      row.push(V(x, y, z));
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
  const stR = 9, stC = 14;
  const stGrid = [];
  for (let k = 0; k <= stR; k++) {
    const u = k / stR;
    const cx = -30 - 18 * u;
    const cy = -68 - 60 * u;
    const r = 14 * (1 - u * 0.5) + 3.2 * Math.exp(-Math.pow((u - 0.34) / 0.18, 2));
    const row = [];
    for (let j = 0; j < stC; j++) {
      const p = (j / stC) * TAU;
      const x = cx + r * 0.62 * Math.cos(p);
      const z = r * Math.sin(p);
      tag(x, cy, z, 2);
      row.push(V(x, cy, z));
    }
    stGrid.push(row);
  }
  for (let k = 0; k < stR; k++)
    for (let j = 0; j < stC; j++) {
      const j1 = (j + 1) % stC;
      addFace(stGrid[k][j], stGrid[k + 1][j], stGrid[k + 1][j1], 2);
      addFace(stGrid[k][j], stGrid[k + 1][j1], stGrid[k][j1], 2);
    }

  /* ---- Synapse sparks ---------------------------------------------------- */
  const sparks = [];
  for (let k = 0; k < 48; k++) {
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
  const colors = [
    rgb(pal.cortex, [232, 144, 156]),
    rgb(pal.cerebellum, [217, 127, 140]),
    rgb(pal.stem, [201, 114, 126]),
  ];
  /* selection red follows the active skin's --bad token */
  let bad = [255, 84, 112];
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--bad").trim();
    bad = rgb(v, bad);
  } catch (e) { /* keep fallback */ }

  /* shade cache: [part][litLevel][bucket] -> css rgb string */
  const BUCKETS = 24;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shadeCache = colors.map((base) => {
    const tints = [base, mix(base, bad, 0.32), mix(base, bad, 0.84)];
    return tints.map((tc) => {
      const arr = [];
      for (let b = 0; b < BUCKETS; b++) {
        const sh = 0.30 + 0.70 * (b / (BUCKETS - 1));
        arr.push(`rgb(${Math.round(clamp(tc[0] * sh, 0, 255))},${Math.round(clamp(tc[1] * sh, 0, 255))},${Math.round(clamp(tc[2] * sh, 0, 255))})`);
      }
      return arr;
    });
  });

  /* Hotspot anchors: surface regions sit on their real centroid; deep / mid
     nuclei keep the schematic inward projection and show only when lit. */
  const anchors = (opts.regions || []).map((r) => {
    const c = geo.centroids[r.id];
    if (c && c.n > 0) {
      return { id: r.id, short: r.short || r.name, X: c.x, Y: c.y, Z: c.z, color: r.color || "#8b7bff", surface: true };
    }
    const X = (r.x - 210) * 0.66;
    const Y = -(r.y - 152) * 0.66;
    const q = Math.max(0, 1 - (X / 150) ** 2 - (Y / 100) ** 2);
    let Z = 66 * Math.sqrt(q);
    if (r.layer === "deep") Z *= 0.25;
    else if (r.layer === "mid") Z *= 0.6;
    return { id: r.id, short: r.short || r.name, X, Y, Z: Z + 8, color: r.color || "#8b7bff", surface: false };
  });

  /* Camera state */
  let yaw = 0.62, pitch = 0.16, zoom = 1;
  let vyaw = 0, vpitch = 0;
  let auto = !motionOff();
  let lit = new Map();
  let focus = false;
  let dirty = true, raf = 0, visible = true;
  let W = 0, H = 0, dpr = 1;

  const proj = new Array(NV);
  for (let i = 0; i < NV; i++) proj[i] = { x: 0, y: 0, z: 0 };
  const fdepth = new Float64Array(NF);
  const order = new Array(NF);
  for (let i = 0; i < NF; i++) order[i] = i;
  const anchorScreen = new Map();
  let hitFaces = [];

  /* fixed camera-space light: upper-left, toward the viewer */
  const Ll = Math.hypot(-0.35, 0.62, -0.70);
  const LX = -0.35 / Ll, LY = 0.62 / Ll, LZ = -0.70 / Ll;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
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
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = (Math.min(W, H * 1.3) / 340) * zoom;
    const cxp = W / 2, cyp = H / 2 + 8 * zoom;
    const CAM = 560;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

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
      const diff = Math.max(0, nx1 * LX + ny2 * LY + nz2 * LZ);
      const cx1 = fc.cx * cy + fc.cz * sy;
      const cz1 = -fc.cx * sy + fc.cz * cy;
      fdepth[i] = fc.cy * sp + cz1 * cp;
      fc._d = diff;
      order[nv++] = i;
    }
    const vis = order.slice(0, nv);
    vis.sort((a, b) => fdepth[b] - fdepth[a]);

    /* fill far -> near */
    hitFaces = [];
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.6;
    for (let k = 0; k < nv; k++) {
      const i = vis[k];
      const fc = geo.faces[i];
      const level = lit.get(fc.region) || 0;
      let diff = fc._d;
      if (focus && level === 0) diff *= 0.78;
      const bucket = clamp(Math.round(diff * (BUCKETS - 1)), 0, BUCKETS - 1);
      const A = proj[fc.a], B = proj[fc.b], Cc = proj[fc.c];
      const col = shadeCache[fc.part][level][bucket];
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.strokeStyle = col;   /* hairline seam hides raster gaps */
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(Cc.x, Cc.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (fc.region) hitFaces.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, cx: Cc.x, cy: Cc.y, d: fdepth[i], region: fc.region });
    }

    /* synapse sparks */
    const t = now * 0.001;
    if (!motionOff()) {
      ctx.fillStyle = "#ffffff";
      for (const s of geo.sparks) {
        s.t += s.v;
        if (s.t > 1) s.t -= 1;
        const A = proj[s.a], B = proj[s.b];
        const x = A.x + (B.x - A.x) * s.t;
        const y = A.y + (B.y - A.y) * s.t;
        ctx.globalAlpha = 0.7 * Math.sin(s.t * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * scale, 0, TAU);
        ctx.fill();
      }
    }

    /* region hotspots + labels */
    anchorScreen.clear();
    ctx.textAlign = "center";
    ctx.font = "600 10px system-ui, sans-serif";
    for (const a of anchors) {
      const x1 = a.X * cy + a.Z * sy;
      const z1 = -a.X * sy + a.Z * cy;
      const y2 = a.Y * cp - z1 * sp;
      const z2 = a.Y * sp + z1 * cp;
      const f = CAM / (CAM + z2);
      const sx = cxp + x1 * f * scale;
      const syc = cyp - y2 * f * scale;
      const front = z2 < 6;
      const level = lit.get(a.id) || 0;
      anchorScreen.set(a.id, { x: sx, y: syc, front });
      const show = level > 0 || (a.surface && front && !focus);
      if (!show) continue;

      let alpha = front ? 0.9 : 0.25;
      if (focus && !level) alpha *= 0.4;
      if (level === 2) alpha = 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = level === 2 ? "#ffffff" : a.color;
      ctx.beginPath();
      ctx.arc(sx, syc, level === 2 ? 3.4 : 2.2, 0, TAU);
      ctx.fill();

      if (level > 0) {
        const pulse = motionOff() ? 0.5 : (t * 1.4 + a.X * 0.01) % 1;
        ctx.globalAlpha = alpha * (1 - pulse) * 0.7;
        ctx.strokeStyle = level === 2 ? "#ffffff" : a.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx, syc, 5 + pulse * 11, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = level > 0 ? 0.95 : front ? 0.6 : 0.2;
      ctx.fillStyle = level > 0 ? "#ffffff" : a.color;
      ctx.fillText(a.short, sx, syc + 13);
    }
    ctx.globalAlpha = 1;
  }

  /* __TAIL__ */