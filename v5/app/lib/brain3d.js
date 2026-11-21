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

  /* __CHUNK2__ */
}