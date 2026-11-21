/* Human organ map — what every organ does, which hormones it makes,
 * which diseases live there and which compounds in the library act on it.
 */

import { esc, icon, emptyState } from "../core.js";
import { ORGANS, ORGAN_BY_ID, ORGAN_GROUPS } from "../data/organs.js";
import { pathwaysForOrgan, TARGETS } from "../data/atlas.js";
import { COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEM_BY_ID } from "../data/neuro.js";
import { pageHead, backLink, chipRow, callout } from "./ui.js";

const SEX_OF = { prostate: "male", testes: "male", ovaries: "female", uterus: "female", breast: "female" };

/* Stylised body, drawn once. Organ nodes are positioned from the data file. */
function bodySvg(selected, sex) {
  return `<svg class="body-svg" viewBox="0 0 300 640" role="img" aria-label="Human organ map">
    <defs>
      <radialGradient id="organGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".55"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,.055)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,.015)"/>
      </linearGradient>
    </defs>

    <g class="body-shape">
      <ellipse cx="150" cy="52" rx="30" ry="34"/>
      <rect x="140" y="80" width="20" height="28" rx="8"/>
      <path d="M104 118 Q150 100 196 118 L190 250 Q190 268 176 276 L124 276 Q110 268 110 250 Z"/>
      <ellipse cx="150" cy="286" rx="32" ry="20"/>
    </g>
    <g class="body-limb">
      <path d="M108 126 L94 214 L98 300"/>
      <path d="M192 126 L206 214 L202 300"/>
      <path d="M134 298 L128 430 L130 566"/>
      <path d="M166 298 L172 430 L170 566"/>
    </g>

    <g class="organ-nodes">
      ${ORGANS.map((o) => {
        const sexOf = SEX_OF[o.id];
        const dim = sexOf && sex !== "all" && sexOf !== sex;
        const sel = o.id === selected;
        const rx = Math.max(3.5, o.rx);
        const ry = Math.max(3.5, o.ry);
        const hit = Math.max(rx, ry) + 9;
        return `<g class="organ-node${sel ? " sel" : ""}${dim ? " dim" : ""}"
            data-organ="${esc(o.id)}" tabindex="0" role="button"
            aria-label="${esc(o.name)}" style="--g:${groupHue(o.group)}">
          ${sel ? `<circle class="organ-ring" cx="${o.x}" cy="${o.y}" r="${hit + 4}"/>` : ""}
          <circle class="organ-hit" cx="${o.x}" cy="${o.y}" r="${hit}"/>
          <ellipse class="organ-dot" cx="${o.x}" cy="${o.y}" rx="${rx}" ry="${ry}"/>
          ${sel ? `<text class="organ-label" x="${o.x}" y="${o.y - ry - 7}" text-anchor="middle">${esc(o.name)}</text>` : ""}
        </g>`;
      }).join("")}
    </g>
  </svg>`;
}

function groupHue(group) {
  return (
    {
      Neuro: "#5fb8a6",
      Endocrine: "#b89b5e",
      Viscera: "#7fae7a",
      Cardiorespiratory: "#c96f5a",
      Reproductive: "#6ba3c7",
      Structural: "#8fa3b8",
    }[group] || "var(--accent)"
  );
}

function organDetail(o) {
  const pathways = pathwaysForOrgan(o.id).slice(0, 6);
  const comps = (o.drugs || []).filter((id) => COMPOUND_BY_ID.get(id));
  return `
  <div class="od-head">
    <div style="min-width:0">
      <div class="eyebrow">${esc(o.group)} · ${esc(o.system || "")}</div>
      <h2 class="od-title">${esc(o.name)}</h2>
    </div>
    <span class="chip chip-accent" style="flex:none">${icon("activity", 12)} ${(o.diseases || []).length} conditions</span>
  </div>
  <p class="od-sum">${esc(o.summary)}</p>

  ${
    (o.hormones || []).length
      ? `<div class="block">
          <div class="block-head"><div><h2 style="font-size:13px">Hormones and signals</h2></div></div>
          <div class="row wrap" style="gap:6px">${o.hormones
            .map((h) => `<span class="chip chip-xs">${esc(h)}</span>`)
            .join("")}</div>
        </div>`
      : ""
  }

  <div class="block">
    <div class="block-head"><div><h2 style="font-size:13px">What it does</h2></div></div>
    <ul class="clean">${(o.functions || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
  </div>

  <div class="block">
    <div class="block-head"><div><h2 style="font-size:13px">Diseases and failure modes</h2></div></div>
    <div class="stack" style="gap:7px">
      ${(o.diseases || [])
        .map(
          (d) => `<div class="dis-row">
            <div class="dis-name">${esc(d.name)}</div>
            <div class="dis-note">${esc(d.note || "")}</div>
          </div>`
        )
        .join("")}
    </div>
  </div>

  ${
    comps.length
      ? `<div class="block">
          <div class="block-head"><div><h2 style="font-size:13px">Compounds in this library that act here</h2></div></div>
          <div class="row wrap" style="gap:6px">${comps
            .map((id) => {
              const c = COMPOUND_BY_ID.get(id);
              return `<a class="chip chip-btn chip-accent" href="#/compounds/${esc(id)}">${esc(c.name)}</a>`;
            })
            .join("")}</div>
        </div>`
      : ""
  }

  ${
    (o.systems || []).length
      ? `<div class="row wrap" style="gap:6px">${o.systems
          .map((id) => {
            const s = SYSTEM_BY_ID.get(id);
            return s ? `<a class="chip chip-btn" href="#/brain/${esc(id)}"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</a>` : "";
          })
          .join("")}</div>`
      : ""
  }

  ${
    pathways.length
      ? `<div class="block">
          <div class="block-head"><div><h2 style="font-size:13px">Pathways running here</h2></div></div>
          <div class="row wrap" style="gap:6px">${pathways
            .map((p) => `<a class="chip chip-btn" href="#/atlas/${esc(p.id)}">${icon("atom", 12)} ${esc(p.name)}</a>`)
            .join("")}</div>
        </div>`
      : ""
  }

  <div class="row wrap" style="gap:8px;margin-top:4px">
    <a class="btn ghost sm" href="#/research?q=${encodeURIComponent(
      `${o.name} ${(o.hormones || [])[0] || ""} physiology review`
    )}">${icon("microscope", 14)} Live papers</a>
    <a class="btn ghost sm" href="#/compounds?q=${encodeURIComponent(o.name)}">${icon("pill", 14)} Compounds</a>
  </div>

  <p class="od-note">${esc(o.note || "")}</p>`;
}

export function organs(ctx) {
  const wanted = String(ctx.params.id || ctx.query.organ || "").toLowerCase();
  const selected = ORGAN_BY_ID.has(wanted) ? wanted : "brain";
  const group = ctx.query.group || "";
  const sex = ctx.query.sex || "all";
  const detail = ORGAN_BY_ID.get(selected);

  return `${pageHead(
    "Human organ map",
    "Twenty-nine organs and tissues: what each one does, the hormones it makes or answers to, how it fails, and which compounds in this library touch it.",
    `<a class="btn soft sm" href="#/atlas">${icon("atom", 15)} Atlas</a>`,
    "Anatomy"
  )}
  <div class="split split-wide organ-layout">
    <div class="stack">
      <div class="card organ-map-card">
        <div class="row between wrap" style="gap:8px;margin-bottom:8px">
          <div class="row wrap" style="gap:4px" id="organ-sex">
            <button class="chip chip-btn ${sex === "all" ? "on" : ""}" data-sex="all">All</button>
            <button class="chip chip-btn ${sex === "male" ? "on" : ""}" data-sex="male">Male</button>
            <button class="chip chip-btn ${sex === "female" ? "on" : ""}" data-sex="female">Female</button>
          </div>
          <span class="tiny dim">Tap any marker</span>
        </div>
        <div class="organ-map-wrap">${bodySvg(selected, sex)}</div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Browse by system</h3><span class="spacer"></span><span class="tiny dim">${ORGANS.length} organs</span></div>
        ${chipRow(ORGAN_GROUPS, group, "group", { allLabel: "All" })}
        <div class="organ-list">
          ${ORGANS.map(
            (o) =>
              `<a class="organ-chip${o.id === selected ? " on" : ""}" href="#/organs/${esc(o.id)}" data-group="${esc(o.group)}" style="--g:${groupHue(o.group)}">
                <span class="oc-dot"></span><span class="oc-name">${esc(o.name)}</span>
              </a>`
          ).join("")}
        </div>
      </div>
    </div>

    <aside class="stack sticky-side">
      <section class="card organ-detail" id="organ-detail">${detail ? organDetail(detail) : ""}</section>
      <section class="card tight">
        <p class="small dim" style="line-height:1.6">Anatomy here is simplified and schematic: shapes show where an organ sits and roughly how large it is, not surgical detail.</p>
      </section>
    </aside>
  </div>`;
}

export function mount(root, ctx) {
  const select = (id) => {
    const o = ORGAN_BY_ID.get(id);
    if (!o) return;
    const host = root.querySelector("#organ-detail");
    if (host) {
      host.innerHTML = organDetail(o);
      host.classList.remove("fade-in");
      void host.offsetWidth;
      host.classList.add("fade-in");
    }
    root.querySelectorAll("[data-organ]").forEach((g) => g.classList.toggle("sel", g.dataset.organ === id));
    root.querySelectorAll(".organ-chip").forEach((c) => c.classList.toggle("on", c.getAttribute("href") === `#/organs/${id}`));
    const label = root.querySelector(".organ-label");
    if (label) label.remove();
    const node = root.querySelector(`[data-organ="${id}"]`);
    if (node) {
      const dot = node.querySelector(".organ-dot");
      if (dot) {
        const cx = dot.getAttribute("cx");
        const cy = dot.getAttribute("cy");
        const ry = Number(dot.getAttribute("ry"));
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("class", "organ-label");
        t.setAttribute("x", cx);
        t.setAttribute("y", String(Number(cy) - ry - 7));
        t.setAttribute("text-anchor", "middle");
        t.textContent = o.name;
        node.appendChild(t);
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("class", "organ-ring");
        ring.setAttribute("cx", cx);
        ring.setAttribute("cy", cy);
        ring.setAttribute("r", String(Math.max(o.rx, o.ry) + 13));
        node.insertBefore(ring, node.firstChild);
      }
    }
    if (location.hash !== `#/organs?organ=${id}`) {
      try {
        history.replaceState(null, "", `#/organs/${id}`);
      } catch (err) {
        /* ignore */
      }
    }
  };

  root.addEventListener("click", (ev) => {
    const sexBtn = ev.target.closest("[data-sex]");
    if (sexBtn) {
      const sex = sexBtn.dataset.sex || "all";
      root.querySelectorAll("[data-sex]").forEach((b) => b.classList.toggle("on", b.dataset.sex === sex));
      root.querySelectorAll("[data-organ]").forEach((g) => {
        const id = g.dataset.organ;
        const sx = SEX_OF[id];
        g.classList.toggle("dim", Boolean(sx && sex !== "all" && sx !== sex));
      });
      return;
    }
    const groupBtn = ev.target.closest(".chip-btn[data-group]");
    if (groupBtn) {
      const val = groupBtn.dataset.group || "";
      root.querySelectorAll(".chip-btn[data-group]").forEach((b) => b.classList.toggle("on", (b.dataset.group || "") === val));
      root.querySelectorAll(".organ-chip").forEach((c) => c.classList.toggle("hide", Boolean(val) && c.dataset.group !== val));
      return;
    }
    const node = ev.target.closest("[data-organ]");
    if (node) {
      ev.preventDefault();
      select(node.dataset.organ);
    }
  });

  root.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const node = ev.target.closest("[data-organ]");
    if (!node) return;
    ev.preventDefault();
    select(node.dataset.organ);
  });

  const wanted = String(ctx.params.id || ctx.query.organ || "").toLowerCase();
  if (wanted && ORGAN_BY_ID.has(wanted)) {
    // keep the initial selection visually consistent on direct links
    root.querySelectorAll(".organ-chip").forEach((c) => c.classList.toggle("on", c.getAttribute("href") === `#/organs/${wanted}`));
  }
}

export default { render: organs, mount };