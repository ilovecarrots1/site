/* Brain map + neurotransmitter systems */

import { esc, icon, fmt, emptyState, evidenceChip } from "../core.js";
import { SYSTEMS, SYSTEM_BY_ID, BRAIN_REGIONS, REGION_BY_ID } from "../data/neuro.js";
import { COMPOUNDS, COMPOUND_BY_ID, getCompound, pubmedUrl } from "../data/compounds.js";
import { pageHead, backLink, classColor, callout } from "./ui.js";

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
    return `<g class="hot ${state.region === r.id ? "sel" : ""}" data-region="${esc(r.id)}" style="--dot:${main ? main.color : "var(--accent)"};opacity:${dim ? 0.32 : 1}">
      <circle class="hit" cx="${r.x}" cy="${r.y}" r="${rad + 9}"/>
      <circle class="core" cx="${r.x}" cy="${r.y}" r="${rad}"/>
      ${sys.length > 1 ? `<circle cx="${r.x}" cy="${r.y}" r="${rad - 2.6}" fill="none" stroke="var(--dot)" stroke-width="0.7" stroke-opacity="0.55"/>` : ""}
      <text x="${r.x}" y="${r.y - rad - 3.5}" text-anchor="middle">${esc(r.short)}</text>
    </g>`;
  }).join("");

  return `<svg class="brain-svg" viewBox="0 0 420 320" role="img" aria-label="Interactive sagittal brain map">
    <defs>
      <linearGradient id="brainFill" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.045"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.012"/>
      </linearGradient>
    </defs>

    <!-- cerebrum -->
    <path class="outline" fill="url(#brainFill)" d="M46 150 C46 94 92 54 150 49 C206 44 258 58 296 77 C330 94 356 113 366 139 C374 159 371 177 357 191 C343 205 322 205 306 215 C291 225 267 233 243 232 C207 231 176 219 150 199 C122 177 74 187 56 169 C48 161 46 156 46 150 Z"/>

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
    <path class="outline" d="M300 214 C324 202 352 210 358 232 C364 254 344 270 322 266 C302 262 288 238 300 214 Z"/>
    <path class="sulcus" d="M304 226 C316 220 332 220 344 228"/>
    <path class="sulcus" d="M302 240 C316 234 334 234 348 242"/>
    <path class="sulcus" d="M306 252 C318 246 336 246 348 252"/>

    <!-- brainstem -->
    <path class="outline" d="M288 226 C296 246 298 268 296 292 C295 300 306 302 308 294 C312 268 314 246 312 228 Z"/>

    <!-- pineal stalk hint -->
    <path class="sulcus" d="M268 158 C276 156 284 158 288 164"/>

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