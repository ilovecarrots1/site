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

## Where we are right now — v4.4.0

- App is **v4.4.0**. `#/dev/audit` must show 12/12.
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

### v4.3.1 brain geometry fix — APPLIED, awaiting push + visual QA

User rejected the v1 solid brain: "looks like an oval", "gap between
hemispheres is huge", "pink dough". Researched real anatomy FIRST
(brain ~140x167x93 mm, W/L 0.84, H/L 0.56; frontal/temporal gyri run
HORIZONTAL, pre/postcentral gyri VERTICAL; broad rounded crests with
narrow clefts; sources: verywellmind brain-size, IMAIOS cerebral gyri,
Kenhub lateral view). Rewrote `app/lib/brain3d.js` (613 lines) in FOUR
chunks (write + 3 marker edits - single-shot writes get truncated).

What changed vs v1:
- Base radii 145/82/118 (was 150/100/62): W/L 0.83, cerebrum H/L 0.52.
- Medial walls +/-2.54 -> fissure gap 5.08 (was 28).
- Smooth lobar shaping via smoothstep/gaussian (no hard creases):
  frontal taper, pointed occipital, temporal gaussian bulge.
- DIRECTIONAL gyri: vert blend band x[-22,34] above y~10 uses sin(9p)
  (vertical ridges), elsewhere sin(7.5t) (horizontal ridges), warped
  phases, broad crests `pow(|w|,0.55)` positive-biased, ~+/-4% relief.
- Deep narrow Sylvian (12) / STS (6.5) / central (8) fissures + baked
  per-vert AO (0.5..1) darkening clefts; rim darkening in the renderer.
- Cerebellum center (-104,-76), radii 48/30/70, sharpened folia; stem
  unchanged. Mesh: cortex R26/C34, cb 18/30, stem 10/16 ->
  2582 verts / 4832 faces / 28 sparks.
- Renderer: 32 shade buckets (0.22..1.0), diff = _d * ao * (1-0.22*rim);
  labels decluttered (dots always for surface+front, text only when lit
  or zoom>1.5); sparks alpha 0.5.
- Eval PASSED: 0 NaN / 0 inward normals / 0 unknown regions, exactly the
  12 SURFACE_REGIONS tagged, hit-test picks nearest visible face at 3 yaws.
- Public API unchanged; brain.js untouched; version stays 4.3.0 (unpushed).

Remaining: user pushes to main, hard-reloads, visual QA of #/brain -> 3D.
The model cannot see images - bugs must come back as text. The wider
textual bug list from the user is still outstanding.

### v4.4.0 — selectable EN/RU + full visual overhaul — APPLIED, awaiting push + QA

Two user requests landed: «локализация НА ВЫБОР ен/ру в настройках» and
«полное обновление интерфейса, ебануто красивое, не только кнопочки снизу».

**i18n = runtime DOM overlay, NOT 24 view rewrites.** New `app/lib/i18n.js`
(380 ln, zero deps): views keep emitting Russian source strings; when
`lang === "en"` a RU→EN dictionary (PHRASES exact-match + PATTERNS regex for
numbered strings) is applied to text nodes + `placeholder/aria-label/title`
after every render. Idempotent, no-op in RU. Compound names/ids/dose notes are
English already → never match. `data-notx` opts a subtree out; SCRIPT/STYLE/
TEXTAREA skipped. API: `LANGS, getLang, setLang, t(ru), applyI18n(root)`.
- `store.data.settings.lang` ("ru" default) persists in `neurodiff.state.v2`.
- `core.js`: imports `t`, `defaultState().settings.lang="ru"`, `toast()` wraps
  message in `t()`. Dose-disclaimer invariant untouched (audit reads data, not
  DOM; `doseNote()`/HAS_DISCLAIMER stay English).
- `main.js`: boot `setLang(store...lang)`; `renderRoute()` ends with
  `applyI18n()` (whole body) + `wireReveals(host)`; `nd:lang` listener rebuilds
  shell (`mountShell`) + `renderRoute()`; `shellScrollWired` guard so re-mount
  doesn't stack scroll listeners. `openDrawer`/`openSearch`/search `paint()`
  call `applyI18n` on their subtree so overlays translate too.
- `settings.js`: «Язык / Language» segmented toggle (`#set-lang`, LANGS) at top
  of Appearance; click → `store.set("settings.lang")` + `setLang` + `nd:lang`.
- Coverage: shell/nav/home/settings/core evidence+disclaimers/toasts/search/
  drawer fully EN. Deep monograph prose + some view-specific strings not yet in
  the dictionary stay RU in EN mode (graceful fallback). Expand = add lines to
  PHRASES/PATTERNS, no view edits. Next: sweep lab/taper/interactions/compounds
  detail strings into the dictionary.

**Visual overhaul = additive `skin.css` v4.4 block** (after v4.2). Budget
unchanged: transform/opacity only, one grain tile, reduced-motion +
`data-motion="off"` guarded. Surface tints scoped to `[data-skin="aurora"]` so
scope/prism keep their identity. Added: ambient `.bgfx` opacity breathe +
inset vignette + accent-2 blob; topbar accent horizon; `::selection` accent;
card depth (layered sheen background, accent edge, deeper shadow, hover lift
`translateY(-3px)` on `.hoverable`/`a.card`/`.compound-card`); hero radial glow
+ orb glow; `.btn.primary` gloss sweep (`::after` translateX, isolation:isolate,
z-index:-1 behind text); gradient meter/bar fills; typography hierarchy
(clamp h1, uppercase eyebrows); brand/nav glow. **Scroll reveals**: `wireReveals`
in main.js adds `.nd-reveal` (opacity0/translateY16) to nested `.card`/
`.compound-card` (NOT direct #view children — those keep the entrance animation,
one animation per element), IntersectionObserver adds `.nd-in`. No inline
styles, no JS = visible, motion-off = visible.

Version bumped to **4.4.0**: core.js:7, sw.js:5/6 (+`lib/i18n.js` added to SHELL),
index.html ×4 `?v=`, settings.js chip. Eval: main/i18n/core/settings parse ok;
i18n functional test passes (ru no-op, phrases/numbers/emoji/search translate).
Nothing pushed.

Remaining: user pushes to main, hard-reloads, QA — Settings → Language → English
(shell/home/settings/search flip), visual pass on mobile 320px (no overlap, no
h-scroll), reduced-motion + data-motion off, `#/dev/audit` 12/12 (210/218).
Then expand EN dictionary to remaining views. The model cannot see images —
visual bugs must come back as text.

### v4.4.1 — interaction-checker bug sweep — APPLIED, awaiting push + QA

User: «багов пизда, люди жалуются» — `#/lab/interactions` «не находит» semax+selank,
tirzepatide+retatrutide («тирза+ретта»), GH+any AI («гр+иа»). Three root causes fixed:

1. **Cyrillic search was dead.** `searchCompounds`/`resolveCompound` matched only Latin
   name/aliases/cls/tags; `resolveCompound` stripped `[^a-z0-9]`, so «семакс/тирза/гр/иа» → 0.
   Added a RU layer in `compounds.js`: `RU_TRANSLIT` (Cyrillic→Latin; translit variant only
   if ≥3 chars to avoid 2-letter noise like «иа»→«ia»), `RU_ALIASES` (RU names + slang →
   canonical id: семакс, селанк, тирза/тирзепатид, ретта/ретатрутид, сема/оземпик,
   гр/гх/соматропин→somatropin, ибутаморен/мк677, игф, анастрозол/летрозол/экземестан,
   ипаморелин/серморелин/гхрп/бпк/тб, кофеин/никотин/мелатонин/креатин/литий/кетамин/
   ашваганда/омега3/инсулин), `RU_CLASS_TOKENS` (иа/ингибитор ароматазы→"Aromatase inhibitor",
   аас/анаболики/стероиды→"Anabolic steroid", секретагоги→"Growth hormone secretagogue",
   глп1/инкретины→"GLP-1 agonist"). Both functions score across query variants + alias-id
   boost (130) + class boost (95). Canonical names/ids stay English; dose invariant untouched.
   Eval: 18 RU/slang queries resolve; «иа» lists all 3 AIs; Latin still works.
2. **Missing class rules.** No FLAG rule linked incretin/gh-axis/ai, so even Latin-added
   pairs returned «Известных взаимодействий нет». Added 3 to `FLAG_RULES_BASE`
   (`interactions.js`): `incretin+incretin` (major — redundant GLP-1/GIP/glucagon, GI →
   dehydration/AKI + hypo risk), `gh-axis+gh-axis` (moderate — additive IGF-1, insulin
   resistance/oedema/arthralgia), `gh-axis+ai` (moderate — metabolic + bone strain). Added
   `gh-axis` flag to `igf-1-lr3` (`compounds-f.js`) so IGF+GH fires too. Flag rules 63→66;
   pairs stay 218; compounds stay 210. Eval: tirz+reta & sema+tirz → major; GH+AI,
   mk677+letrozole, GH+GH, IGF+GH → moderate; **semax+selank → [] (correct — no documented
   interaction, honest empty-state, NOT a bug; search fix lets users add it).**
3. **Bloodwork audit was broken (NOT 12/12).** bloodwork-a/b referenced `somatotropin`
   (15×) but the compound id is `somatropin`; plus a dangling `calcium-carbonate` (no such
   compound). audit.js «Bloodwork → compound links resolve» was failing. Fixed:
   somatotropin→somatropin globally, removed calcium-carbonate from bloodwork-b:300.
   Eval: badBloodworkIds=[] → 12/12 restored.
4. **Right-click on brain zones opened the browser's native context menu.** No
   `contextmenu` handler existed on any brain surface. Added `e.preventDefault()` on the
   3D canvas (`brain3d.js`, AbortController-scoped via `sig`) and on the schematic +
   anatomy SVG stages (`brain.js`, loop over `[stage, stageAnat]`). The 3D canvas is also
   covered by its own listener; side-panel text stays right-clickable for copy. Element-
   level listeners die with the DOM on re-mount (no stacking). User report: «на пкм зоны
   мозга … открывает в браузере хуйню эту». («Ваше имя» in the same message is NOT an app
   string — grep over app/ found nothing; likely a paste artifact from a complaint form.)

Version **4.4.1** stamped (core.js:7, sw.js:5/6, index.html ×4, settings.js chip). All
touched files syntax-ok; RU search + engine + bloodwork link audit eval-verified. Nothing
pushed. Harness note: `readFull` must paginate by LINES (limit≤300) — a 50KB byte-truncated
read gives no `Use offset` banner; and strip must remove `<harness>…</harness>` blocks
non-greedily (not to-end-of-string) or multi-page files get cut. Large compound-e/f reads
are unreliable; test logic with synthetic records carrying real ids/cls/flags instead.

Remaining: push to main, hard-reload, QA `#/lab/interactions` — type «тирза», «ретта», «гр»,
«иа», «семакс», «селанк» (Cyrillic now resolves), confirm tirz+reta major / GH+AI moderate,
`#/dev/audit` 12/12 (210/218/66). Then continue EN dictionary expansion + the wider textual
bug list (still outstanding).

### Secret experimental build — "LAB INSTRUMENT" skin — APPLIED, awaiting push + visual QA

User request: a secret test page at `https://neurodifference.ru/enrnejis8e8w.html` —
SAME app, functions/routes/data untouched, but the ENTIRE visual language radically
regenerated. Only the COLORS were taken from an old product prompt (ignore its
Next.js/TS/shop stack). Main version must not be affected.

**Isolation strategy = separate entry + additive scoped stylesheet, zero functional edits:**
- `enrnejis8e8w.html` (repo root) — byte-clone of the `index.html` shell PLUS
  `data-lab="1"` on `<html>`, `<meta name="robots" content="noindex,nofollow">`,
  title "…LAB · experimental", and ONE extra `<link ./app/x-skin.css?v=4.4.1>`
  loaded AFTER styles/skin/clinic. Same `./app/main.js?v=4.4.1`, same manifest/fonts.
  `index.html` itself was NOT touched (grep confirms no x-skin / data-lab there).
- `app/x-skin.css` (NEW, 610 ln / 24.6 KB, braces 159/159 balanced) — every rule
  scoped to `html[data-lab="1"]`. Palette tokens redefined with `!important` so they
  beat even an inline custom `--accent` that `applyAppearance()` may set. main.js
  boot only manages data-skin/accent/density/motion + data-scrolled + layer-open;
  it NEVER touches `data-lab`, so the flag survives boot. main never loads x-skin.
- `sw.js` navigate handler BUGFIX: it used to cache EVERY successful navigation as
  `./index.html` (so visiting the secret page would overwrite the main offline
  shell). Now it only caches when `url.pathname` ends with `/` or `/index.html`.
  Online the secret page is served network-first as-is; x-skin.css is cached by the
  assets SWR handler on first fetch (NOT added to SHELL — main stays lean). VERSION
  stays nd-v4.4.1 (logic fix rides along; byte-change triggers SW update). sw.js
  syntax eval-ok.

**Design language ("technical dossier / instrument panel"):** flat panels
(#14171C / #191D24) with 1px hairlines #262B33, sharp 10–12px corners (was soft
14–26px pills), monospace JetBrains-Mono overlines/counters/labels (CAPS .06–.09em),
blueprint grid background (.bgfx::before) + faint instrument glows (transform drift
kept) + one grain/scanline tile. Single instrument blue #58A6FF; green #3FB950 =
human/ok, orange #D29922 = preclinical/warn, red #F85149 = critical. Cards get blue
CORNER BRACKETS (::before, inset 6px / 10px arms, in the padding zone so never over
copy, pointer-events none, z-index 0 under `.card>*{z-index:1}`); compound-card class
colour becomes a 3px left tick. Buttons rectangular hairline keys, primary solid blue
+ dark ink (aurora gloss ::after killed). Chips square 5px mono tags, square dots.
Meters/bars square 2px tracks + static segment ticks. Sidebar = technical rail, active
item left blue bar; bottom-nav flattened from aurora floating pill to an instrument
segment bar (active = square top tick, ≤5 items kept). Hero = blueprint readout panel;
orb = blue/teal/green conic dial (orbHalo scale/opacity kept). live-dot = blue SQUARE
pulse. Callouts/disclaimer/toast = sharp panels + coloured left bar. Overlay/drawer/
sheet = flat hairline panels + static backdrop blur. Aurora/prism decorative pseudos
(.card.spot::after, a.card::after, .compound-card::after, .hero-card::after,
.sub-plate::after, .btn.primary::after) explicitly neutralised so nothing overlaps.

**Invariants honoured:** transform/opacity animations only, one animation per element,
one grain tile, no blurred ANIMATED divs (blur on topbar/nav/scrim is static), no fixed
heights on text containers, mobile-first 320px (grid-auto minmax(min(100%,230px)),
@360 tweaks), reduced-motion + `html[data-lab][data-motion="off"]` guards kill
animations/transitions and force `.nd-reveal` visible. `--bad` used (never --danger).
Dose-disclaimer / PubMed / bloodwork / compound-id invariants untouched (no data edits).

Remaining: user pushes to main, hard-reloads, opens `/enrnejis8e8w.html` and visually
QAs the radical reskin across routes + mobile 320px + reduced-motion. Main `/` must
look exactly as before (4.4.1). The model cannot see images — visual bugs must come
back as text (route → what looked wrong → expected). If the user approves the lab
look, it can later be promoted to a selectable skin; for now it is secret-only.

## Working from the shell

The project lives in the Acode Terminal home (`~/neuro`, shown in Files as
**Terminal Public**). `bash` only exists when the open project is inside that
folder. Useful: `apk add git nodejs curl bind-tools`, `git pull`, `git push`
(needs a PAT), `npx wrangler`. Device storage is mounted at
`/mnt/user/0/emulated` if files must be copied out.
