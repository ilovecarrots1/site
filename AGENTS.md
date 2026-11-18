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

## Where we are right now — v4.1.0

- App is **v4.1.0**. `#/dev/audit` must show 12/12.
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
- `#/brain` defaults to a **3D hologram** (`app/lib/brain3d.js`, hand-rolled
  canvas renderer, zero deps): procedural gyrencephalic hemispheres,
  cerebellum folia, brainstem, synapse sparks, drag-orbit + inertia + pinch
  zoom, region hotspots wired to the same selection as the SVG. Toggle
  "3D / Schematic" in the map toolbar. Honors reduced-motion (static until
  interacted). Global polish pass lives at the bottom of `skin.css`.
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
   hard-reload, open `#/dev/audit` (12/12, 210 compounds / 218 pairs), check
   the neuron layer on `#/brain` (axons must be visible), install the PWA.
2. Optional: deploy `tools/ai-proxy-worker.js` with `npx wrangler deploy`
   (needs a Cloudflare account and the three secrets listed in the file).
3. Optional: Telegram digest. Create a bot with @BotFather, then send messages
   with a plain GET: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=<text>`.
   Keep the token in chat state or an env var, never in the repo.
4. Optional: downgrade SprintHost to a domain-only plan, hosting is no longer
   needed there.

## Working from the shell

The project lives in the Acode Terminal home (`~/neuro`, shown in Files as
**Terminal Public**). `bash` only exists when the open project is inside that
folder. Useful: `apk add git nodejs curl bind-tools`, `git pull`, `git push`
(needs a PAT), `npx wrangler`. Device storage is mounted at
`/mnt/user/0/emulated` if files must be copied out.
