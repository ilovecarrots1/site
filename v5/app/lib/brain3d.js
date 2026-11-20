/* ==========================================================================
   Brain 3D — hand-rolled procedural brain + canvas renderer. Zero deps.
   Gross anatomy follows the real cerebrum (~140 x 167 x 93 mm, W/L ~ 0.84,
   H/L ~ 0.56): two hemispheres almost touching (thin longitudinal fissure),
   DIRECTIONAL gyri — horizontal ridges in frontal/temporal lobes, vertical
   pre/postcentral ridges around the central sulcus — broad rounded crests
   with narrow clefts, deep Sylvian/central/STS fissures darkened by baked AO,
   cerebellum with fine transverse folia under the occipital lobe, tapered
   brainstem. Every face carries a region id: click -> red tint -> region card.
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

/* --------------------------------------------------------------------------
   Geometry — deterministic, built once.
   verts: [{x,y,z,ao}]  faces: [{a,b,c,nx,ny,nz,cx,cy,cz,ao,part,region}]
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
    faces.push({
      a, b, c, nx: nx / len, ny: ny / len, nz: nz / len,
      cx, cy, cz, ao: (A.ao + B.ao + C.ao) / 3, part,
      region: regionAt(cx, cy, cz, part),
    });
  }

  /* ---- Cerebrum: two shaped, gyrified, fissure-carved hemispheres -------- */
  const R = 30, C = 40;
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
        groove += 12 * lat * win * Math.exp(-Math.pow((y - (-14 + 0.10 * x)) / 5, 2));   /* Sylvian */
        groove += 6.5 * lat * win * Math.exp(-Math.pow((y + 38) / 4.5, 2));              /* superior temporal */
        const cwin = ss(4, 20, y) * (1 - ss(72, 82, y));
        groove += 8 * lat * cwin * Math.exp(-Math.pow((x - (22 - 0.26 * y)) / 4.2, 2));  /* central sulcus */
        if (groove > 0) { x -= groove * ux; y -= groove * uy; z -= groove * uz; }
        const ao = clamp(1 - 0.045 * groove - 0.02 * Math.max(0, -disp), 0.5, 1);
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
  const cbR = 20, cbC = 34;
  const cbGrid = [];
  for (let i = 0; i <= cbR; i++) {
    const t = (i / cbR) * Math.PI;
    const row = [];
    for (let j = 0; j < cbC; j++) {
      const p = (j / cbC) * TAU;
      const fol = Math.sin(9 * t);
      const f = 1 + 0.045 * Math.sign(fol) * Math.pow(Math.abs(fol), 0.6) + 0.02 * Math.sin(7 * p);
      const x = 48 * Math.sin(t) * Math.cos(p) * f - 104;
      const y = 30 * Math.cos(t) * f - 76;
      const z = 70 * Math.sin(t) * Math.sin(p) * f;
      const ao = clamp(0.8 + (f - 1) * 3, 0.6, 1);
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
  const stR = 10, stC = 16;
  const stGrid = [];
  for (let k = 0; k <= stR; k++) {
    const u = k / stR;
    const cx = -22 - 18 * u;
    const cy = -58 - 64 * u;
    const r = 13 * (1 - u * 0.5) + 3.2 * Math.exp(-Math.pow((u - 0.32) / 0.18, 2));
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

  /* ---- Synapse sparks (subtle) ------------------------------------------- */
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
  const BUCKETS = 48;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shadeCache = colors.map((base) => {
    const tints = [base, mix(base, bad, 0.32), mix(base, bad, 0.84)];
    return tints.map((tc) => {
      const arr = [];
      for (let b = 0; b < BUCKETS; b++) {
        const sh = 0.18 + 0.82 * (b / (BUCKETS - 1));
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
    const q = Math.max(0, 1 - (X / 145) ** 2 - (Y / 82) ** 2);
    let Z = 112 * Math.sqrt(q);
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
  /* half-vector between key light and view (0,0,-1) for a soft specular sheen */
  const Hl = Math.hypot(LX, LY, LZ - 1);
  const HX = LX / Hl, HY = LY / Hl, HZ = (LZ - 1) / Hl;

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

    /* ambient vignette + soft ground shadow give the model a stage */
    const amb = ctx.createRadialGradient(cxp, cyp * 0.86, 8, cxp, cyp, Math.max(W, H) * 0.78);
    amb.addColorStop(0, "rgba(255,255,255,0.05)");
    amb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);
    const gy = cyp + 122 * scale, grx = 150 * scale, gry = 24 * scale;
    const gsh = ctx.createRadialGradient(cxp, gy, 1, cxp, gy, grx);
    gsh.addColorStop(0, "rgba(0,0,0,0.32)");
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
      const diff = Math.max(0, nx1 * LX + ny2 * LY + nz2 * LZ);
      const cx1 = fc.cx * cy + fc.cz * sy;
      const cz1 = -fc.cx * sy + fc.cz * cy;
      fdepth[i] = fc.cy * sp + cz1 * cp;
      fc._d = diff;
      fc._nx = nx1; fc._ny = ny2; fc._nz = nz2;
      /* baked AO + silhouette rim darkening define the folds */
      const rim = Math.pow(1 - Math.abs(nz2), 3);
      fc._k = fc.ao * (1 - 0.22 * rim);
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
      let diff = fc._d * fc._k;
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
      /* specular sheen on faces angled toward the key light */
      const hd = fc._nx * HX + fc._ny * HY + fc._nz * HZ;
      if (hd > 0.55) {
        const spec = Math.pow(hd, 16) * 0.30;
        if (spec > 0.02) {
          ctx.globalAlpha = Math.min(0.28, spec);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
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
        ctx.globalAlpha = 0.5 * Math.sin(s.t * Math.PI);
        ctx.beginPath();
        ctx.arc(x, y, 1.0 * scale, 0, TAU);
        ctx.fill();
      }
    }

    /* region hotspots + labels (decluttered: text only when lit / zoomed) */
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
      const showDot = level > 0 || (a.surface && front);
      if (!showDot) continue;

      let alpha = level > 0 ? (front ? 0.9 : 0.25) : 0.5;
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
      const showLabel = level > 0 || (a.surface && front && zoom > 1.5 && !focus);
      if (showLabel) {
        ctx.globalAlpha = level > 0 ? 0.95 : 0.6;
        ctx.fillStyle = level > 0 ? "#ffffff" : a.color;
        ctx.fillText(a.short, sx, syc + 13);
      }
    }
    ctx.globalAlpha = 1;
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
    if (dirty || (auto && !idle) || (!idle && geo.sparks.length)) {
      draw(now || 0);
      dirty = false;
    }
    if (auto && !idle) raf = requestAnimationFrame(frame);
    else if (Math.abs(vyaw) > 0.0004 || Math.abs(vpitch) > 0.0004) raf = requestAnimationFrame(frame);
    else if (!idle && geo.sparks.length) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && visible && !document.hidden && canvas.isConnected) raf = requestAnimationFrame(frame);
  }

  /* ---- interaction ------------------------------------------------------- */

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const ptrs = new Map();
  let dragging = false, moved = 0, lastX = 0, lastY = 0, pinch = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; vyaw = 0; vpitch = 0;
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    kick();
  }, sig);

  canvas.addEventListener("pointermove", (e) => {
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

  function pip(px, py, f) {
    const d1 = (px - f.bx) * (f.ay - f.by) - (f.ax - f.bx) * (py - f.by);
    const d2 = (px - f.cx) * (f.by - f.cy) - (f.bx - f.cx) * (py - f.cy);
    const d3 = (px - f.ax) * (f.cy - f.ay) - (f.cx - f.ax) * (py - f.ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }

  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = 0;
    if (ptrs.size === 0) {
      dragging = false;
      if (moved < 7) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        /* nearest surface face under the cursor */
        let best = null, bestD = Infinity;
        for (const f of hitFaces) {
          if (f.d < bestD && pip(x, y, f)) { bestD = f.d; best = f.region; }
        }
        /* fall back to a deep-nucleus hotspot */
        if (!best) {
          let bd = 18;
          for (const [id, p] of anchorScreen) {
            if (!p.front) continue;
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < bd) { bd = d; best = id; }
          }
        }
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