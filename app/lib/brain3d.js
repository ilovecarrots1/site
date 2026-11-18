/* ==========================================================================
   Brain 3D — hand-rolled procedural brain + canvas renderer. Zero deps.
   A soft pink point-cloud brain: two gyrencephalic hemispheres, cerebellum
   with folia, brainstem, sparse wireframe, travelling synapse sparks and
   projected region hotspots. Drag to orbit, pinch/wheel to zoom, inertia,
   auto-rotate. Honors prefers-reduced-motion (static until interacted).
   ========================================================================== */

const TAU = Math.PI * 2;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* --------------------------------------------------------------------------
   Geometry — deterministic, built once. Parts: 0 cortex, 1 cerebellum, 2 stem.
   -------------------------------------------------------------------------- */

export function buildGeometry() {
  const pts = [];
  const wires = [];
  const push = (x, y, z, p) => pts.push({ x, y, z, p });

  /* Cerebrum: half-ellipsoid per hemisphere, shaped + gyrified. */
  const R = 30;
  const C = 40;
  for (const s of [-1, 1]) {
    const grid = [];
    for (let i = 0; i <= R; i++) {
      const t = (i / R) * Math.PI;
      const row = [];
      for (let j = 0; j < C; j++) {
        const p = (s === 1 ? 0 : Math.PI) + (j / (C - 1)) * Math.PI;
        let x = 150 * Math.sin(t) * Math.cos(p);
        let y = 100 * Math.cos(t);
        let z = 62 * Math.sin(t) * Math.sin(p);
        if (x > 95) { y *= 0.94; z *= 0.94; }        /* frontal taper */
        if (x < -105) { y *= 0.9; z *= 0.9; }        /* occipital taper */
        if (y < -18 && x > -70 && x < 85) { z *= 1.14; y -= 7; } /* temporal bulge */
        const n =
          0.05 * Math.sin(6.5 * p + 2.2 * Math.sin(3 * t)) * Math.sin(4.2 * t + 1.3 * Math.sin(5 * p)) +
          0.028 * Math.sin(11 * p + 7 * t) +
          0.02 * Math.sin(17 * t + 9 * p + 2);
        x *= 1 + n; y *= 1 + n; z *= 1 + n;
        if (z * s < 9) z = s * (9 + (z * s - 9) * 0.22); /* medial flatten */
        z += s * 7;                                      /* longitudinal fissure */
        if (y < -80) y = -80 + (y + 80) * 0.35;          /* flat base */
        row.push(pts.length);
        push(x, y, z, 0);
      }
      grid.push(row);
    }
    for (let j = 0; j < C; j += 5) {
      const line = [];
      for (let i = 0; i <= R; i++) line.push(grid[i][j]);
      wires.push(line);
    }
    for (let i = 5; i < R; i += 5) wires.push(grid[i].slice());
  }

  /* Cerebellum: smaller ellipsoid with fine folia ridges. */
  const cbGrid = [];
  const cbR = 16;
  const cbC = 36;
  for (let i = 0; i <= cbR; i++) {
    const t = (i / cbR) * Math.PI;
    const row = [];
    for (let j = 0; j < cbC; j++) {
      const p = (j / cbC) * TAU;
      const f = 1 + 0.05 * Math.sin(13 * t) + 0.02 * Math.sin(9 * p);
      const x = 52 * Math.sin(t) * Math.cos(p) * f;
      const y = 36 * Math.cos(t) * f;
      const z = 54 * Math.sin(t) * Math.sin(p) * f;
      row.push(pts.length);
      push(x - 108, y - 64, z, 1);
    }
    cbGrid.push(row);
  }
  for (let i = 3; i < cbR; i += 4) wires.push(cbGrid[i].slice());

  /* Brainstem: tapered, slightly curved tube. */
  const stGrid = [];
  const stR = 9;
  const stC = 16;
  for (let k = 0; k <= stR; k++) {
    const u = k / stR;
    const cx = -34 - 16 * u;
    const cy = -72 - 54 * u;
    const r = 15 - 6.5 * u;
    const row = [];
    for (let j = 0; j < stC; j++) {
      const p = (j / stC) * TAU;
      row.push(pts.length);
      push(cx + r * 0.6 * Math.cos(p), cy, r * Math.sin(p), 2);
    }
    stGrid.push(row);
  }
  for (let j = 0; j < stC; j += 4) {
    const line = [];
    for (let k = 0; k <= stR; k++) line.push(stGrid[k][j]);
    wires.push(line);
  }

  /* Synapse sparks: travel between grid neighbours. */
  const sparks = [];
  const cortexCount = 2 * (R + 1) * C;
  for (let k = 0; k < 64; k++) {
    const a = Math.floor(hash(k * 3 + 1) * cortexCount);
    const b = hash(k * 7 + 2) > 0.5 ? a + 1 : a + C;
    if (b < cortexCount) sparks.push({ a, b, t: hash(k * 11 + 5), v: 0.004 + 0.007 * hash(k * 13 + 9) });
  }

  return { pts, wires, sparks };
}

/* --------------------------------------------------------------------------
   Renderer
   -------------------------------------------------------------------------- */

export function mountBrain3D(canvas, opts) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const geo = buildGeometry();
  const N = geo.pts.length;
  const reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionOff = () =>
    reduced || document.documentElement.getAttribute("data-motion") === "off";

  /* Region anchors: lift the 2D schematic coords onto the cortical surface. */
  const anchors = (opts.regions || []).map((r) => {
    const X = (r.x - 210) * 0.66;
    const Y = -(r.y - 152) * 0.66;
    const q = Math.max(0, 1 - (X / 150) ** 2 - (Y / 100) ** 2);
    let Z = 66 * Math.sqrt(q);
    if (r.layer === "deep") Z *= 0.25;
    else if (r.layer === "mid") Z *= 0.6;
    return { id: r.id, short: r.short || r.name, X, Y, Z: Z + 8, color: r.color || "#8b7bff" };
  });

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
  const css = colors.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`);

  /* Camera state */
  let yaw = 0.62;
  let pitch = 0.16;
  let zoom = 1;
  let vyaw = 0;
  let vpitch = 0;
  let auto = !motionOff();
  let lit = new Map();
  let focus = false;
  let dirty = true;
  let raf = 0;
  let visible = true;
  let W = 0;
  let H = 0;
  let dpr = 1;

  const proj = new Array(N);
  for (let i = 0; i < N; i++) proj[i] = { x: 0, y: 0, z: 0, i };
  const order = proj.slice();
  const anchorScreen = new Map();

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
    const cxp = W / 2;
    const cyp = H / 2 + 8 * zoom;
    const CAM = 560;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* Project all points */
    for (let i = 0; i < N; i++) {
      const p = geo.pts[i];
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
    order.sort((a, b) => b.z - a.z);

    /* Wireframe (far, faint) */
    ctx.lineWidth = 0.6;
    for (const line of geo.wires) {
      ctx.beginPath();
      for (let k = 0; k < line.length; k++) {
        const pr = proj[line[k]];
        if (k === 0) ctx.moveTo(pr.x, pr.y);
        else ctx.lineTo(pr.x, pr.y);
      }
      const mid = proj[line[Math.floor(line.length / 2)]];
      const depth = 1 - (mid.z + 160) / 320;
      ctx.strokeStyle = css[0];
      ctx.globalAlpha = 0.03 + 0.07 * Math.max(0, Math.min(1, depth));
      ctx.stroke();
    }

    /* Point cloud, painter's order */
    const t = now * 0.001;
    for (let k = 0; k < N; k++) {
      const pr = order[k];
      const p = geo.pts[pr.i];
      const depth = Math.max(0, Math.min(1, 1 - (pr.z + 160) / 320));
      let a = 0.1 + 0.55 * depth;
      if (focus) a *= 0.55;
      const r = (0.7 + 1.5 * depth) * Math.min(1.6, scale * 0.9);
      ctx.globalAlpha = a;
      ctx.fillStyle = css[p.p];
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r, 0, TAU);
      ctx.fill();
    }

    /* Synapse sparks */
    if (!motionOff()) {
      for (const s of geo.sparks) {
        s.t += s.v;
        if (s.t > 1) s.t -= 1;
        const A = proj[s.a];
        const B = proj[s.b];
        const x = A.x + (B.x - A.x) * s.t;
        const y = A.y + (B.y - A.y) * s.t;
        const fade = Math.sin(s.t * Math.PI);
        ctx.globalAlpha = 0.85 * fade;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 1.4 * scale * 0.9, 0, TAU);
        ctx.fill();
      }
    }

    /* Region hotspots */
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
      const front = z2 > -10;
      const level = lit.get(a.id) || 0;
      anchorScreen.set(a.id, { x: sx, y: syc, front });

      let alpha = front ? 0.85 : 0.22;
      if (focus && !level) alpha *= 0.4;
      if (level === 1) alpha = Math.max(alpha, 0.8);
      if (level === 2) alpha = 1;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(sx, syc, level === 2 ? 4 : 2.6, 0, TAU);
      ctx.fill();

      if (level > 0) {
        const pulse = motionOff() ? 0.5 : (t * 1.4 + a.X * 0.01) % 1;
        ctx.globalAlpha = alpha * (1 - pulse) * 0.7;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx, syc, 5 + pulse * 11, 0, TAU);
        ctx.stroke();
      }

      if ((front && !focus) || level > 0) {
        ctx.globalAlpha = level > 0 ? 0.95 : front ? 0.5 : 0.15;
        ctx.fillStyle = level > 0 ? "#ffffff" : a.color;
        ctx.fillText(a.short, sx, syc + 14);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- loop control ------------------------------------------------------ */

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const idle = motionOff();
    if (auto && !idle && !dragging) yaw += 0.0032;
    if (!dragging && (Math.abs(vyaw) > 0.0004 || Math.abs(vpitch) > 0.0004)) {
      yaw += vyaw;
      pitch = Math.max(-1.15, Math.min(1.15, pitch + vpitch));
      vyaw *= 0.94;
      vpitch *= 0.94;
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
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  /* ---- interaction ------------------------------------------------------- */

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const ptrs = new Map();
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let pinch = 0;

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        vyaw = 0;
        vpitch = 0;
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      kick();
    },
    sig
  );

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) {
          zoom = Math.max(0.55, Math.min(2.4, zoom * (d / pinch)));
          dirty = true;
        }
        pinch = d;
        kick();
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      yaw += dx * 0.0052;
      pitch = Math.max(-1.15, Math.min(1.15, pitch + dy * 0.0042));
      vyaw = dx * 0.0052;
      vpitch = dy * 0.0042;
      dirty = true;
      kick();
    },
    sig
  );

  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = 0;
    if (ptrs.size === 0) {
      dragging = false;
      if (moved < 7) {
        /* Click: hit-test hotspots */
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let best = null;
        let bestD = 18;
        for (const [id, p] of anchorScreen) {
          if (!p.front) continue;
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < bestD) {
            bestD = d;
            best = id;
          }
        }
        if (best && opts.onSelect) opts.onSelect(best);
      }
      kick();
    }
  }
  canvas.addEventListener("pointerup", endPtr, sig);
  canvas.addEventListener("pointercancel", endPtr, sig);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = Math.max(0.55, Math.min(2.4, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      dirty = true;
      kick();
    },
    { passive: false, signal: ac.signal }
  );

  canvas.addEventListener(
    "dblclick",
    () => {
      yaw = 0.62;
      pitch = 0.16;
      zoom = 1;
      vyaw = 0;
      vpitch = 0;
      dirty = true;
      kick();
    },
    sig
  );

  /* ---- lifecycle --------------------------------------------------------- */

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        dirty = true;
        kick();
      }
    },
    { threshold: 0.02 }
  );
  io.observe(canvas);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        dirty = true;
        kick();
      }
    },
    sig
  );

  resize();
  sync();

  return {
    sync,
    kick,
    setAuto(b) {
      auto = !!b && !motionOff();
      dirty = true;
      kick();
      return auto;
    },
    isAuto() {
      return auto;
    },
    reset() {
      yaw = 0.62;
      pitch = 0.16;
      zoom = 1;
      vyaw = 0;
      vpitch = 0;
      dirty = true;
      kick();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ac.abort();
      ro.disconnect();
      io.disconnect();
    },
  };
}

export default { buildGeometry, mountBrain3D };