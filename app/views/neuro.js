/* Brain map + neurotransmitter systems */

import { esc, icon, fmt, emptyState, evidenceChip } from "../core.js";
import { SYSTEMS, SYSTEM_BY_ID, BRAIN_REGIONS, REGION_BY_ID } from "../data/neuro.js";
import { COMPOUNDS, COMPOUND_BY_ID, getCompound, pubmedUrl } from "../data/compounds.js";
import { pageHead, backLink, classColor, callout, mechFlow, barList, liveBadge } from "./ui.js";

const state = { region: "prefrontal-cortex", highlight: "" };

function regionRadius(r) {
  return Math.max(4, Math.min(9.5, Math.sqrt(r.rx * r.ry) / 3.4));
}

function mapHtml() {
  const hot = BRAIN_REGIONS.map((r) => {
    const rad = regionRadius(r);
    const sys = r.systems.map((id) => SYSTEM_BY_ID.get(id)).filter(Boolean);
    const main = sys[0];
    const dim = state.highlight && !r.systems.includes(state.highlight);
    return `<g class="hot ${state.region === r.id ? "sel" : ""}" data-region="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.name)}" style="--dot:${main ? main.color : "var(--accent)"};opacity:${dim ? 0.32 : 1}">
      <circle class="hit" cx="${r.x}" cy="${r.y}" r="${rad + 9}"/>
      <circle cx="${r.x}" cy="${r.y}" r="${rad + 6}" fill="var(--dot)" fill-opacity="0.06"/>
      <circle class="core" cx="${r.x}" cy="${r.y}" r="${rad}"/>
      <circle class="ring" cx="${r.x}" cy="${r.y}" r="${rad + 2}"/>
      ${sys.length > 1 ? `<circle cx="${r.x}" cy="${r.y}" r="${rad - 2.6}" fill="none" stroke="var(--dot)" stroke-width="0.7" stroke-opacity="0.55"/>` : ""}
      <text x="${r.x}" y="${r.y - rad - 3.5}" text-anchor="middle">${esc(r.short)}</text>
    </g>`;
  }).join("");

  return `<svg class="brain-svg" viewBox="0 0 420 320" role="img" aria-label="Interactive sagittal brain map">
    <defs>
      <linearGradient id="cortexFill" x1="8%" y1="0%" x2="72%" y2="100%">
        <stop offset="0%" stop-color="#9d8cff" stop-opacity="0.18"/>
        <stop offset="46%" stop-color="#8b7bff" stop-opacity="0.075"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03"/>
      </linearGradient>
      <linearGradient id="stemFill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f2b23e" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#8b7bff" stop-opacity="0.05"/>
      </linearGradient>
      <linearGradient id="cbFill" x1="0%" y1="0%" x2="70%" y2="100%">
        <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#8b7bff" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.085"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="deepFill" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#8b7bff" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#8b7bff" stop-opacity="0"/>
      </radialGradient>
      <filter id="dotGlow" x="-90%" y="-90%" width="280%" height="280%">
        <feGaussianBlur stdDeviation="2.2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <clipPath id="cortexClip"><path d="M54 150 C54 118 70 88 104 74 C132 62 160 50 196 47 C236 44 276 52 308 70 C338 87 362 106 374 128 C382 143 380 158 370 170 C360 182 344 190 330 198 C314 207 296 214 276 220 C252 227 226 230 202 226 C180 222 162 214 148 206 C132 197 116 196 100 190 C78 181 55 170 54 150 Z"/></clipPath>
    </defs>

    <!-- cerebrum -->
    <path class="cortex" d="M54 150 C54 118 70 88 104 74 C132 62 160 50 196 47 C236 44 276 52 308 70 C338 87 362 106 374 128 C382 143 380 158 370 170 C360 182 344 190 330 198 C314 207 296 214 276 220 C252 227 226 230 202 226 C180 222 162 214 148 206 C132 197 116 196 100 190 C78 181 55 170 54 150 Z"/>

    <!-- gyri: folds clipped to the cortex so nothing spills past the outline -->
    <g clip-path="url(#cortexClip)">
      <path class="gyrus bright" d="M64 132 C92 120 118 100 136 78"/>
      <path class="gyrus" d="M60 156 C92 148 120 132 142 108"/>
      <path class="gyrus" d="M76 178 C104 172 132 158 156 136"/>
      <path class="gyrus" d="M96 196 C124 190 150 176 170 154"/>
      <path class="gyrus bright" d="M118 210 C144 206 168 194 188 172"/>
      <path class="gyrus" d="M148 84 C164 104 176 124 182 146"/>
      <path class="gyrus" d="M176 64 C192 88 202 112 206 136"/>
      <path class="gyrus bright" d="M206 60 C220 88 230 116 234 142"/>
      <path class="gyrus" d="M238 60 C250 90 258 118 260 146"/>
      <path class="gyrus" d="M272 68 C282 98 288 126 290 152"/>
      <path class="gyrus" d="M304 82 C312 108 318 134 320 160"/>
      <path class="gyrus bright" d="M196 152 C222 160 250 158 272 148"/>
      <path class="gyrus" d="M206 172 C236 180 264 176 288 164"/>
      <path class="gyrus" d="M218 194 C246 200 272 196 292 184"/>
      <path class="gyrus" d="M250 210 C274 214 296 210 312 200"/>
      <path class="gyrus" d="M340 128 C346 148 344 166 334 182"/>
      <path class="gyrus" d="M348 150 C352 166 348 180 340 190"/>
    </g>

    <!-- sulci -->
    <path class="sulcus" d="M96 88 C120 104 140 118 150 136 C160 154 158 172 150 190"/>
    <path class="sulcus" d="M168 62 C176 84 186 100 200 112"/>
    <path class="sulcus" d="M232 66 C238 88 246 104 258 118"/>
    <path class="sulcus" d="M290 84 C292 106 296 124 306 140"/>
    <path class="sulcus" d="M110 130 C132 136 152 140 172 140"/>
    <path class="sulcus" d="M196 148 C216 152 238 150 256 142"/>
    <path class="sulcus" d="M120 118 C140 120 158 116 172 108"/>

    <!-- temporal lobe line -->
    <path class="sulcus" d="M150 199 C176 210 206 214 236 208 C258 204 274 210 286 218"/>

    <!-- cerebellum -->
    <path class="cerebellum" d="M304 218 C312 202 336 196 352 204 C368 212 372 230 364 240 C354 252 328 250 314 242 C304 236 300 226 304 218 Z"/>
    <path class="folia" d="M308 224 C324 216 344 216 358 226"/>
    <path class="folia" d="M305 234 C324 227 346 227 362 237"/>
    <path class="folia" d="M307 244 C326 237 346 237 360 246"/>
    <path class="folia" d="M318 250 C330 245 344 245 354 250"/>

    <!-- brainstem: midbrain → pons → medulla -->
    <path class="brainstem" d="M252 192 C274 202 292 218 302 236 C312 254 318 272 320 288 C321 296 329 297 329 288 C330 264 322 238 306 218 C292 202 276 190 256 184 Z"/>
    <path class="gyrus" d="M264 198 C278 212 290 230 296 250"/>
    <path class="gyrus" d="M280 194 C296 210 306 232 312 254"/>

    <!-- deep structures: callosum, ventricles, thalamus, hippocampus -->
    <path class="deep" style="stroke-width:5;stroke-dasharray:none;opacity:.5" d="M176 170 C178 148 196 132 222 130 C250 128 274 142 280 164 C284 180 272 192 256 192" stroke-linecap="round"/>
    <path class="deep" style="opacity:.6" d="M188 152 C204 140 228 140 240 154 C250 165 246 178 232 182"/>
    <ellipse class="deep" cx="232" cy="132" rx="27" ry="21" style="opacity:.32"/>
    <ellipse cx="214" cy="160" rx="27" ry="17" fill="url(#deepFill)"/>
    <path class="deep" style="stroke-width:3;stroke-dasharray:none;opacity:.45" d="M240 174 C252 168 266 172 270 183 C274 195 263 202 252 199"/>

    <!-- projection tracts -->
    <path class="tract" d="M204 214 C182 200 162 184 148 170"/>
    <path class="tract" d="M148 170 C130 152 114 134 104 116"/>
    <path class="tract" d="M296 176 C266 150 228 132 196 122"/>
    <path class="tract" d="M284 208 C258 184 226 166 196 154"/>
    <path class="tract" d="M330 224 C310 200 288 182 264 168"/>

    <!-- slow cortical sweep -->
    <ellipse class="sweep" cx="206" cy="128" rx="152" ry="64" fill="url(#sweepGrad)" pointer-events="none"/>

    ${hot}
  </svg>`;
}

function regionPanel() {
  const r = REGION_BY_ID.get(state.region) || BRAIN_REGIONS[0];
  const systems = r.systems.map((id) => SYSTEM_BY_ID.get(id)).filter(Boolean);
  const drugs = (r.drugs || []).map((id) => COMPOUND_BY_ID.get(id)).filter(Boolean);

  return `<div class="card region-panel" style="padding:14px">
    <div class="row between" style="align-items:flex-start;gap:8px;margin-bottom:7px">
      <div><h3 style="font-size:16px">${esc(r.name)}</h3>
      <div class="tiny dim mono" style="margin-top:2px">${esc(r.short)} · ${r.functions.length} functions</div></div>
      <a class="btn ghost sm" href="#/brain/${esc(systems[0]?.id || "")}">${icon("activity", 13)} Pathways</a>
    </div>

    <p class="small muted" style="line-height:1.6;margin-bottom:10px">${esc(r.note)}</p>

    <div class="row wrap" style="gap:5px;margin-bottom:10px">
      ${systems.map((s) => `<a class="chip chip-btn" href="#/brain/${esc(s.id)}" style="--dot:${s.color}"><span class="dot" style="background:${s.color}"></span>${esc(s.abbr)}</a>`).join("")}
    </div>

    <div class="effect-box" style="margin-bottom:10px">
      <h4 style="color:var(--text-2)">${icon("target", 12)} Functions</h4>
      <ul>${r.functions.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
    </div>

    ${drugs.length ? `<div class="row wrap" style="gap:5px">
      <span class="tiny dim" style="width:100%;margin-bottom:2px">Compounds that act here</span>
      ${drugs.map((d) => `<a class="chip chip-btn" href="#/compounds/${esc(d.id)}"><span class="dot" style="background:${classColor(d.cls)}"></span>${esc(d.name)}</a>`).join("")}
    </div>` : ""}
  </div>`;
}

export const map = {
  render() {
    return `
    ${pageHead(
      "Brain map",
      "Tap a region to see its functions, the transmitter systems it depends on, and the compounds that act there.",
      `<button class="btn ghost sm" data-act="shuffle">${icon("refresh", 14)} Random region</button>`
    )}

    <div class="row wrap" style="gap:5px;margin-bottom:10px" id="sys-filter">
      <button class="chip chip-btn ${!state.highlight ? "on" : ""}" data-sys="">All systems</button>
      ${SYSTEMS.map((s) => `<button class="chip chip-btn ${state.highlight === s.id ? "on" : ""}" data-sys="${esc(s.id)}" style="--dot:${s.color}"><span class="dot" style="background:${s.color}"></span>${esc(s.abbr)}</button>`).join("")}
    </div>

    <div class="split" style="margin-bottom:24px">
      <div>
        <div class="brain-wrap" id="brain-wrap">${mapHtml()}</div>
        <p class="tiny dim" style="margin-top:8px;line-height:1.5">Sagittal schematic — frontal pole left, cerebellum and brainstem lower right. Not to anatomical scale; the ring marks regions with multiple systems.</p>
      </div>
      <div id="region-panel">${regionPanel()}</div>
    </div>

    <div class="block-head">
      <div><h2>Transmitter systems</h2><p class="block-sub">Synthesis, receptors, clearance and the points where drugs intervene</p></div>
    </div>
    <div class="grid grid-auto" style="gap:10px">
      ${SYSTEMS.map(systemCard).join("")}
    </div>`;
  },

  mount(root, ctx) {
    const wrap = root.querySelector("#brain-wrap");
    const panelEl = root.querySelector("#region-panel");

    const select = (id) => {
      state.region = id;
      wrap.innerHTML = mapHtml();
      panelEl.innerHTML = regionPanel();
      wrap.querySelector(`[data-region="${id}"]`)?.classList.add("sel");
    };

    wrap.addEventListener("click", (ev) => {
      const g = ev.target.closest("[data-region]");
      if (g) select(g.dataset.region);
    });
    wrap.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const g = ev.target.closest("[data-region]");
      if (g) {
        ev.preventDefault();
        select(g.dataset.region);
      }
    });

    root.querySelector("#sys-filter")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-sys]");
      if (!btn) return;
      state.highlight = btn.dataset.sys;
      root.querySelectorAll("#sys-filter [data-sys]").forEach((b) => b.classList.toggle("on", b === btn));
      wrap.innerHTML = mapHtml();
    });

    root.querySelector('[data-act="shuffle"]')?.addEventListener("click", () => {
      const pick = BRAIN_REGIONS[Math.floor(Math.random() * BRAIN_REGIONS.length)];
      select(pick.id);
    });
  },
};

function systemCard(s) {
  const count = COMPOUNDS.filter((c) => (c.flags || []).some((f) => (s.matchFlags || []).includes(f))).length;
  return `<a class="card hoverable" href="#/brain/${esc(s.id)}" style="--dot:${s.color};text-decoration:none;color:inherit">
    <div class="row between" style="align-items:flex-start;margin-bottom:6px">
      <div class="row" style="gap:8px;min-width:0">
        <span style="width:9px;height:9px;border-radius:50%;background:${s.color};flex:none;box-shadow:0 0 10px ${s.color}"></span>
        <div style="min-width:0">
          <div style="font-size:14.5px;font-weight:650">${esc(s.name)}</div>
          <div class="tiny dim">${esc(s.tagline)}</div>
        </div>
      </div>
      <span class="mono tiny" style="color:${s.color}">${esc(s.abbr)}</span>
    </div>
    <div class="row wrap" style="gap:5px">
      <span class="chip">${icon("target", 11)} ${s.receptors.length} receptors</span>
      <span class="chip">${icon("pill", 11)} ${count} compounds</span>
      <span class="chip">${icon("brain", 11)} ${s.regions.length} regions</span>
    </div>
  </a>`;
}

/* ------------------------------------------------------------------ */
/* System detail                                                       */
/* ------------------------------------------------------------------ */

function compoundChips(s) {
  const list = COMPOUNDS.filter((c) => (c.flags || []).some((f) => (s.matchFlags || []).includes(f)));
  if (!list.length) return "";
  return `<div class="row wrap" style="gap:5px">
    ${list.slice(0, 24).map((c) => `<a class="chip chip-btn" href="#/compounds/${esc(c.id)}" style="--dot:${classColor(c.cls)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.name)}</a>`).join("")}
    ${list.length > 24 ? `<span class="chip">+${list.length - 24} more</span>` : ""}
  </div>`;
}

function classBars(s) {
  const list = COMPOUNDS.filter((c) => (c.flags || []).some((f) => (s.matchFlags || []).includes(f)));
  if (!list.length) return "";
  const counts = new Map();
  list.forEach((c) => counts.set(c.cls, (counts.get(c.cls) || 0) + 1));
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cls, n]) => ({ label: cls, value: n, color: classColor(cls) }));
  return `<div style="margin-bottom:10px">${barList(rows)}</div>`;
}

export const system = {
  render(ctx) {
    const s = SYSTEM_BY_ID.get(String(ctx.params.id || "").toLowerCase());
    if (!s) {
      return `<div class="card">${emptyState("activity", "System not found", "That pathway is not in the database.", `<a class="btn ghost sm" href="#/brain">${icon("arrowLeft", 14)} Brain map</a>`)}</div>`;
    }
    const regions = (s.regions || []).map((id) => REGION_BY_ID.get(id)).filter(Boolean);

    return `
    <div class="row" style="margin-bottom:12px">
      ${backLink("#/brain", "Brain map")}
      <span class="spacer"></span>
      <a class="btn ghost sm" href="${pubmedUrl(s.pubmed || s.name)}" target="_blank" rel="noopener noreferrer">${icon("external", 13)} PubMed</a>
    </div>

    <header class="detail-head">
      <div class="row wrap" style="gap:7px">
        <span class="chip" style="color:${s.color};border-color:${s.color}55;background:${s.color}1a"><span class="dot" style="background:${s.color}"></span>${esc(s.abbr)}</span>
        <span class="chip">${s.receptors.length} receptor types</span>
        <span class="chip">${(s.synthesis || []).length} synthesis steps</span>
      </div>
      <h1 class="detail-title" style="color:${s.color}">${esc(s.name)}</h1>
      <p class="lead">${esc(s.tagline)}</p>
    </header>

    <div class="split" style="margin-bottom:22px">
      <div class="stack" style="gap:16px">

        <section class="card">
          <div class="card-head"><h3 style="font-size:14px">${icon("info", 14)} Overview</h3></div>
          <p class="small" style="line-height:1.65;color:var(--text-2)">${esc(s.summary)}</p>
          <div class="row wrap" style="gap:5px;margin-top:11px">
            ${s.functions.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3 style="font-size:14px">${icon("dna", 14)} Pathway, top to bottom</h3><span class="spacer"></span>${liveBadge("animated")}</div>
          ${mechFlow(
            (s.synthesis || []).slice(0, 5).map((st, i) => ({
              icon: i === 0 ? "atom" : i === 1 ? "flask" : i === 2 ? "target" : "activity",
              title: st.step,
              sub: [st.enzyme, st.cofactor ? `needs ${st.cofactor}` : ""].filter(Boolean).join(" · ") || st.detail || "",
            }))
          )}
          <p class="tiny dim" style="margin-top:10px;line-height:1.5">Every node is a step a drug can interrupt. Block an enzyme and you starve the next step; block a transporter and you flood the cleft; block a receptor and you silence the readout.</p>
        </section>

        <section class="card">
          <div class="card-head"><h3 style="font-size:14px">${icon("activity", 14)} Synthesis & release</h3></div>
          <div class="stack" style="gap:0">
            ${s.synthesis
              .map(
                (st, i) => `<div class="row top" style="gap:11px;padding:10px 0;${i ? "border-top:1px solid var(--line-soft)" : ""}">
                  <span style="width:22px;height:22px;border-radius:50%;border:1.5px solid ${s.color}66;display:grid;place-items:center;font-size:10.5px;font-family:var(--mono);color:${s.color};flex:none">${i + 1}</span>
                  <div style="min-width:0">
                    <div style="font-size:13.5px;font-weight:600">${esc(st.step)}</div>
                    ${st.enzyme ? `<div class="tiny" style="color:${s.color};margin-top:1px">${esc(st.enzyme)}${st.cofactor ? ` <span class="dim">· needs ${esc(st.cofactor)}</span>` : ""}</div>` : ""}
                    ${st.detail ? `<div class="tiny dim" style="margin-top:2px;line-height:1.5">${esc(st.detail)}</div>` : ""}
                    ${st.note ? `<div class="tiny dim" style="margin-top:2px;line-height:1.5">${esc(st.note)}</div>` : ""}
                  </div>
                </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3 style="font-size:14px">${icon("trash", 14)} Clearance</h3></div>
          <div class="list" style="margin:0 -14px">
            ${s.clearance
              .map(
                (c) => `<div class="list-row" style="padding:9px 14px">
                  <div class="grow"><div class="title" style="font-size:13px">${esc(c.mechanism)}</div>
                  <div class="sub" style="line-height:1.5">${esc(c.note)}</div></div>
                </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3 style="font-size:14px">${icon("target", 14)} Receptors</h3></div>
          <div class="grid grid-2" style="gap:8px">
            ${s.receptors
              .map(
                (r) => `<div class="card tight" style="background:var(--bg-1);padding:10px">
                  <div class="row between" style="margin-bottom:3px">
                    <strong style="font-size:13px">${esc(r.name)}</strong>
                    <span class="tag">${esc(r.type)}</span>
                  </div>
                  <div class="tiny" style="color:${/inhib/i.test(r.effect) ? "var(--warn)" : "var(--good)"};margin-bottom:3px">${esc(r.effect)}</div>
                  <div class="tiny dim" style="line-height:1.45">${esc(r.note)}</div>
                </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="card flush">
          <div style="padding:13px 14px;border-bottom:1px solid var(--line-soft)">
            <h3 style="font-size:14px">Intervention points</h3>
            <p class="tiny dim" style="margin-top:2px">Where pharmacology grips this pathway</p>
          </div>
          <div class="list">
            ${(s.interventions || [])
              .map(
                (p) => `<div class="list-row" style="align-items:flex-start;flex-wrap:wrap">
                  <div class="grow" style="min-width:180px">
                    <div class="title" style="font-size:13px"><span class="chip" style="height:19px;font-size:10px">${esc(p.point)}</span> ${esc(p.target)}</div>
                    ${p.note ? `<div class="sub" style="margin-top:4px;line-height:1.5">${esc(p.note)}</div>` : ""}
                    ${(p.drugs || []).length ? `<div class="row wrap" style="gap:4px;margin-top:6px">
                      ${p.drugs
                        .map((id) => {
                          const c = getCompound(id);
                          return c ? `<a class="chip chip-btn" href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>` : `<span class="chip dim">${esc(id)}</span>`;
                        })
                        .join("")}
                    </div>` : ""}
                  </div>
                </div>`
              )
              .join("")}
          </div>
        </section>
      </div>

      <aside class="col sticky-side" style="gap:14px">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:8px">Regions involved</div>
          <div class="stack" style="gap:5px">
            ${regions
              .map(
                (r) => `<a class="row between" href="#/brain" data-region-jump="${esc(r.id)}" style="padding:7px 9px;border-radius:9px;background:var(--bg-2);border:1px solid var(--line);color:inherit;text-decoration:none">
                  <span style="font-size:12.5px;font-weight:550">${esc(r.name)}</span>
                  ${icon("chevronRight", 13)}
                </a>`
              )
              .join("")}
          </div>
        </div>

        <div class="card">
          <div class="eyebrow" style="margin-bottom:8px">Compounds acting here</div>
          ${classBars(s)}
          ${compoundChips(s) || `<p class="tiny dim">No compounds in this database are flagged for ${esc(s.name)}.</p>`}
        </div>

        <div>${callout("info", "Why pathways beat lists", "A compound name tells you little. Knowing which step of which pathway it touches tells you what it will do, what it will interact with, and what tolerance will look like.")}</div>
      </aside>
    </div>`;
  },

  mount(root) {
    root.querySelectorAll("[data-region-jump]").forEach((el) => {
      el.addEventListener("click", () => {
        state.region = el.dataset.regionJump;
      });
    });
  },
};