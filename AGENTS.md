# NeuroDifference — agent brief

Read this before touching anything. It exists so any agent (Acode AI Agent,
Claude Code, opencode, aider) starts with full context instead of re-deriving it.

## What this is

A no-build, vanilla ES-module PWA: a neuropharmacology reference in English.
No bundler, no npm, no TypeScript, no framework. Hand-written CSS.
Editing files is the whole build step.

- Runtime: `app/core.js` (helpers, store, toast, md, icons)
- Router + shell: `app/main.js` (hash router)
- Views: `app/views/*.js`, each exports `{ render(ctx), mount(root, ctx) }`
  or named exports that `main.js` special-cases
- Data: `app/data/*.js` (compounds a-j, neuro, interactions + interactions-g,
  learn, atlas, organs, brainmap, conditions a-c, bloodwork a-b, card-queries)
- Styles: `app/styles.css`, `app/clinic.css`, `app/skin.css`
- Service worker: `sw.js` (version constant lives at the top - bump it)

## Hard invariants - do not break

1. **Dose disclaimer.** Every `doses[].note` must state education-only.
   Enforced in code via `DOSE_DISCLAIMER` / `HAS_DISCLAIMER` / `doseNote()` in
   `app/data/compounds.js`. Never bypass the merge map; `#/dev/audit` checks it.
2. **Compound ids.** Every `compounds[]` / `drugs[]` id must exist in the
   148-id whitelist. Unknown ids fail the audit.
3. **Animation budget.** Animate `transform` and `opacity` only. No blurred
   animated divs - use soft `radial-gradient`. One tiled grain pattern.
   Respect `prefers-reduced-motion` and `data-motion="off"`.
4. **Never overlap text.** No fixed heights on text containers, no absolute
   text over variable content. Mobile is the priority viewport.
5. **PubMed results are never persisted.** In-memory `Map`, TTL 30 min, max 24
   entries, 340 ms serialized queue. No localStorage, no DB.
6. **Bloodwork ranges are universal.** No sex branching.
7. **`callout()` escapes its body.** Never pass HTML to it.
8. **Views return HTML strings.** `render()` never returns `{redirect}`.

## Routes

`#/` · `#/compounds` · `#/compounds/:id` · `#/brain` · `#/brain/:id` ·
`#/learn` · `#/learn/:courseId/:lessonId` · `#/cards` · `#/evidence` ·
`#/research` · `#/ask` · `#/notes` · `#/settings` · `#/atlas` · `#/atlas/:id` ·
`#/atlas/target/:id` · `#/organs` · `#/organs/:id` · `#/map` · `#/calc` ·
`#/conditions` · `#/conditions/:id` · `#/bloodwork` · `#/bloodwork/:id` ·
`#/pk` · `#/stack` · `#/symptoms` · `#/emergency` · `#/lab` ·
`#/lab/interactions` · `#/lab/taper` · `#/compare` · `#/dev/audit`

Self-check: `#/dev/audit` must be 12/12 green after any data change.

## Deploy

Primary: **GitHub Pages** - repo `ilovecarrots1/site`, branch `main`, root.
Live at `https://neurodifference.ru/` (custom domain, Let's Encrypt).
`index.html` at repo root is the app; `app/`, `manifest.json`, `sw.js` are
siblings. Push to `main` = deploy.

Secondary leftovers:

- `index-standalone.html` - single-file build (~1.3 MB). Kept as a
  drag-and-drop fallback for hosts where folders are painful.
- `preview.html` - same app inlined, used for offline preview.
- `promo.html` - release teaser (vertical 1080x1920, 7 scenes, ~30 s).
  Pure CSS/JS, no assets, no deps. `?fs=1&once=1` for a clean screen
  recording, `?rec=1` hides the control bar, `?scene=N` jumps.
- SprintHost (`141.8.192.182`) still serves an old copy over FTP. Not the
  source of truth. Domain DNS is managed there (`ns1..ns4.sprinthost`); mail
  and FTP records stay; only apex `A`/`AAAA` + `www` `CNAME` point to GitHub.
- Diagnostics: `deploy-check.html` (file/status table), `dns-check.html`
  (NS/A/answer monitor), `tools/ai-proxy-worker.js` (Cloudflare Worker that
  pins provider egress to one IP when the API key gets rate-limited for
  multi-IP usage).

DNS target for GitHub Pages:

```
A     @     185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153
AAAA  @     2606:50c0:8000::153 2606:50c0:8001::153 2606:50c0:8002::153 2606:50c0:8003::153
CNAME www   ilovecarrots1.github.io.
```

Do not hand-write a `CNAME` file - GitHub creates it from Settings -> Pages.

## Conventions

- UI text in English, conversation in Russian.
- CSS vars only: `--bg..--bg-3`, `--line`, `--text..--text-3`, `--accent*`,
  `--good/--ok/--warn/--bad/--critical`, `--radius*`, `--pad`, `--gap`,
  `--tap`, `--shadow-1..3`. There is no `--danger`.
- Skins are `data-skin` on `<html>`; custom accent is `data-accent="custom"`
  plus inline `--accent*`.
- Breakpoints: 900 / 1000 / 1180 px. Mobile = bottom nav + drawer.
- Store key `neurodiff.state.v2`; schema version in `store.v`.

## Secrets - never commit

FTP password, provider API keys, the Telegram bot token. Keep them in
conversation state or environment, never in a tracked file. This repo is
public.

## Where we are right now — v4.3.0

- App is **v4.3.0**. `#/dev/audit` must show 12/12.
- **210 compounds**: 148 legacy + 62 new in `compounds-g/h/i/j.js`
  (antidepressants/anxiolytics · hypnotics/neurosteroids · antipsychotics/
  anticonvulsants · addiction medicine/migraine/Parkinson's).
- **218 pair rules + 63 class rules** (`interactions.js` merges
  `interactions-g.js`), 14 everyday substances, **28-term phenomena glossary**
  with live filter at the bottom of `#/lab/interactions`.
- Brain map rebuilt: layered SVG shell (45 gyri, 12 sulci, callosal, brainstem,
  cerebellum folia) + neuron layer (24 axons, 17 somas, 24 pulses). Neuron ids
  resolve via `NEURON_MAP` — somas are NOT part of `REGIONS`, never use
  `REGION_MAP` for the neuron layer.
- `#/brain` defaults to a **pink anatomical SVG** (`app/data/brain-anatomy.js`,
  28 clickable zones: 12 lateral + 21 medial/deep via the "Глубокие структуры"
  toggle). Click/Enter → red highlight (`var(--bad)`) → the existing region
  card through the same `select()`. Toolbar chips: Анатомия / 3D / Схема.
- Secondary **3D mode** (`app/lib/brain3d.js`, hand-rolled canvas, zero deps)
  is now a **solid lambert-shaded surface** (v4.3 rewrite): 2104 verts /
  3900 tris, two gyrified hemispheres with carved Sylvian / central /
  superior-temporal fissures, cerebellum folia, tapered brainstem tagged
  pons/medulla/spinal-cord. Every face carries a region id; click =
  point-in-triangle hit-test on visible faces (nearest wins), deep nuclei
  fall back to hotspot picking. Selection tints faces toward `--bad`.
  Back-face cull + painter sort, shade cache [part][lit][24 buckets].
  Drag-orbit + inertia + pinch zoom, hotspots wired to the same selection.
  Lifecycle: the frame loop self-destructs when the canvas leaves the DOM,
  and `brain.js` destroys the previous instance on re-mount (`live3d`).
  Honors reduced-motion (static until interacted).
- **UI chrome is Russian** (nav, home, compounds, lab, taper, settings, brain,
  ui helpers, EVIDENCE labels, SEVERITY labels, disclaimers, toasts). Drug/
  compound names, ids and `doseNote()` stay English — the dose-disclaimer
  invariant regex is English on purpose.
- **v4.2 static visual pass** at the bottom of `skin.css`: floating pill
  bottom-nav with active pill, accent-tinted card surfaces, pill chips,
  stronger button hierarchy, gradient hero headline (guarded by @supports),
  accent eyebrows. The live-dot ring animation lives only in `skin.css`
  (`nd-pulse`); the old `liveRing` keyframes were removed from `styles.css`.
- Animation budget clean: transform/opacity only. Meter/bar fills use scaleX,
  live-dot ring uses scale, mech-link dashes use translateY on a pseudo.
- PubMed key is user-supplied (Settings → Research), localStorage only.
- `index-standalone.html` / `preview.html` are stale v3 single-file fallbacks;
  the live app is the module build. `promo.html` / `promo-ru.html` untouched.
- Hosting was migrated from SprintHost to **GitHub Pages**. Repo root is the site.
- `CNAME` exists in the repo, so the custom domain `neurodifference.ru` is
  saved in Settings -> Pages.
- DNS verified through `dns.google`: 4x A and 4x AAAA resolve to GitHub Pages
  IPs, `www` CNAME points to `ilovecarrots1.github.io.`, there are **no CAA
  records**, and no leftover SprintHost A/AAAA entries remain.
- **HTTPS is live.** The Let's Encrypt certificate was issued; all of these
  return 200 over TLS: `/`, `/manifest.json`, `/sw.js`, `/app/main.js`,
  `/promo.html`. The earlier "domain is not properly configured to support
  HTTPS" banner in Settings -> Pages is resolved — if Enforce HTTPS is still
  greyed out, reload the page; the toggle should be available now.
- `promo.html` — vertical 1080x1920 release teaser, 7 scenes, ~30 s, zero
  deps, transform/opacity only. `?fs=1&once=1` = tap to fullscreen + one clean
  run, `?rec=1` = hide controls, `?scene=N` = jump. Not precached by the SW.
- The old SprintHost copy is still reachable over FTP at `141.8.192.182`
  (user `playnd`). It is a backup only. Never write its password into a file.

### Next steps for the next agent

1. ~~Verify the deploy~~ **done 2026-11-17**: `/`, `/manifest.json`, `/sw.js`,
   `/app/main.js`, `/promo.html` all 200 over HTTPS. After the v4 push:
   hard-reload, open `#/dev/audit` (12/12, 210 compounds / 218 pairs), tap a
   zone on `#/brain` (anatomy default, red highlight + region card), flip
   "Глубокие структуры", check the neuron layer in Схема mode, install the PWA.
2. Optional: deploy `tools/ai-proxy-worker.js` with `npx wrangler deploy`
   (needs a Cloudflare account and the three secrets listed in the file).
3. Optional: Telegram digest. Create a bot with @BotFather, then send messages
   with a plain GET: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=<text>`.
   Keep the token in chat state or an env var, never in the repo.
4. Optional: downgrade SprintHost to a domain-only plan, hosting is no longer
   needed there.

### v4.3.0 procedural 3D brain upgrade — DONE in working tree, awaiting push + visual QA

- User wanted a real MSD-style clickable 3D brain. Legal OBJ sources exist
  (BodyParts3D / Anatomography, CC BY-SA 2.1 JP, (c) DBCLS) but the in-editor
  tools cannot fetch them: `fetch_content` caps every response at ~24 KB, there
  is no shell, and the real meshes are 60 KB-32 MB (binary .bin, Git-LFS .obj,
  STL zips). The Anatomography web API returns PNG images only. A user-uploaded
  model file in the workspace WOULD be readable via `tools.read` paging - that
  path stays open if they ever drop an .obj/.gltf into the repo.
- User chose: **upgrade the hand-written procedural brain now** (no external
  mesh). The rewrite LANDED in `app/lib/brain3d.js` (two-chunk write; the first
  single-shot attempt was truncated and never applied - always verify writes).
  Eval-verified: syntax ok, 0 NaN, 0 inward/degenerate normals, bounds
  x[-161,158] y[-128,105] z[-74,73], all 12 surface regions tagged (exactly
  SURFACE_REGIONS), 0 unknown-region faces, hit-test returns nearest visible
  face. `brain.js` needed no changes (public API unchanged). Version bumped
  to 4.3.0 in core.js / sw.js / index.html (4x) / settings.js chip.
- Agreed design for the rewrite (keep the public API
  `mountBrain3D(canvas,{regions,palette,getLit,onSelect})` ->
  `{sync,kick,setAuto,isAuto,reset,destroy}` and `buildGeometry()`):
  solid lambert-shaded surface instead of point cloud; cortex two hemispheres
  (R=24,C=32) with gyrification + carved Sylvian/central/superior-temporal
  fissures; cerebellum folia; tapered brainstem tagged pons/medulla/spinal-cord;
  per-face `region` via `regionAt(x,y,z,part)`; back-face cull + painter sort;
  shade cache [part][litLevel][24 buckets]; selection tints faces toward the
  skin `--bad` token; click = point-in-triangle hit-test on visible faces,
  fallback to deep-nucleus hotspots; anchors for surface regions use real
  per-region centroids, deep/mid keep the schematic inward projection and show
  only when lit. Keep the camera/interaction/lifecycle block unchanged.
- Remaining: user pushes to main, hard-reloads, visual QA of `#/brain` -> 3D
  (rotate, click parts -> red highlight + card, deep structures via lit
  hotspots, pinch zoom, reduced-motion). The model cannot see images - bugs
  must come back as text (what was tapped -> expected -> actual). A textual
  bug list from the user is still outstanding for the wider bug sweep.
  No attribution needed (procedural, no mesh).

### v4.3.1 brain geometry fix — DRAFTED, NOT APPLIED (user rejected v1 look)

User verdict on the v1 solid brain: (1) looks like an oval, not a brain;
(2) gap between hemispheres is huge; (3) overall ugly. `app/lib/brain3d.js`
is STILL v1 (592 lines) - the v2 write was truncated and never applied.
Exact fix spec (apply as a two-chunk write, then eval):

- Proportions: v1 was L304 x W146 (W/L 0.48 = skinny egg). Real cerebrum
  W/L ~0.8. New base radii: x=140, y=95, z=105 per hemisphere.
  Ellipsoid-normal denominators: 19600 / 9025 / 11025.
- Gap: v1 medial walls at z=+/-14 (canyon 28). New:
  `if (z*s < 2) z = s*(2 + (z*s-2)*0.18); z += s*0.9;` -> walls +/-2.5, gap ~5.
- Smooth shaping (replace hard ifs), helper `ss(a,b,x)` = smoothstep:
  frontal `fr=ss(65,140,x); y*=1-0.10*fr; z*=1-0.12*fr`;
  occipital `oc=ss(-75,-140,x); y*=1-0.16*oc; z*=1-0.20*oc`;
  temporal gaussian `tb=exp(-((x-15)/85)^2)*exp(-((y+42)/30)^2);
  z*=1+0.17*tb; y-=11*tb`.
- Gyri (sharpened warped ridges, absolute displacement along the normal):
  `w=0.65*sin(6.2p+2.0*sin(2.9t)+0.7*sin(7.3t))+0.35*sin(5.1t+1.7*sin(3.8p));
  ridge=sign(w)*pow(|w|,0.62); fine=0.30*sin(11.5p+7t+1.9*sin(4.2t));
  fade=clamp((z*s-2)/16,0,1)*clamp((y+78)/22,0,1);
  disp=(7.0*ridge+2.0*fine)*fade`.
- Fissures (narrow/deep, carved AFTER folds): lat=ss(24,42,|z|);
  win=ss(-80,-58,x)*(1-ss(78,98,x));
  Sylvian `12*lat*win*exp(-((y-(-17+0.11x))/5.5)^2)`;
  STS `6.5*lat*win*exp(-((y+44)/5)^2)`;
  central `8*lat*cwin*exp(-((x-(24-0.28y))/4.5)^2)`,
  cwin=ss(6,24,y)*(1-ss(86,98,y)).
- Baked AO per vert: `ao=clamp(1-0.045*groove-0.02*max(0,-disp),0.5,1)`;
  verts carry ao, face ao = avg of its 3 verts. Cerebellum
  ao=clamp(0.8+(f-1)*3,0.6,1); stem ao=0.92.
- Mesh: cortex R=26,C=34; cerebellum cbR=18,cbC=30, center(-102,-84),
  radii 48/30/58, folia `f=1+0.045*sign(sin9t)*pow(|sin9t|,0.6)+0.02*sin7p`;
  stem stR=10,stC=16, cx=-22-18u, cy=-58-64u,
  r=13*(1-u*0.5)+3.2*exp(-((u-0.32)/0.18)^2). addFace orientation refs:
  stem axis u=clamp((-58-cy)/64,0,1), axisX=-22-18u; cerebellum center
  (-102,-84). Sparks: 28.
- regionAt tweaks: olfactory x>112 && y<-40; occipital x<-88; frontal x>55
  (orbitofrontal if y<-24); temporal y<-28 && az>24 && x>-85;
  insula az>30, x[-25,40], y[-30,4]; cingulate az<18, x[-12,72], y[-12,56];
  motor y>40 (x>-8); parietal y>16 && x<=-8; stem y>-88 pons /
  y>-112 medulla / else spinal-cord.
- Renderer: BUCKETS=32, sh=0.22+0.78*b/31; in the cull pass stash
  fc._d=diffuse and fc._k=ao*(1-0.22*rim) where rim=pow(1-|nz2|,3);
  fill diff=fc._d*fc._k (focus dim *0.78 on level 0). Deep-anchor
  projection: /140, /95, Z=100*sqrt(q). Labels declutter: dots always for
  surface+front (alpha ~0.5), TEXT only if level>0 OR
  (surface && front && zoom>1.5 && !focus). Sparks alpha 0.5, radius 1.0*scale.
- After applying: eval (syntax, gap ~5, W/L ~0.8, outward normals, region
  coverage, hit-test), keep version 4.3.0 (nothing pushed yet), short RU
  report. Write the file in TWO chunks (write + edit on a __TAIL__ marker) -
  single-shot writes of this file get truncated.

## Working from the shell

The project lives in the Acode Terminal home (`~/neuro`, shown in Files as
**Terminal Public**). `bash` only exists when the open project is inside that
folder. Useful: `apk add git nodejs curl bind-tools`, `git pull`, `git push`
(needs a PAT), `npx wrangler`. Device storage is mounted at
`/mnt/user/0/emulated` if files must be copied out.
