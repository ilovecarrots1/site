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
- Data: `app/data/*.js` (compounds a-f, neuro, interactions, learn,
  atlas, organs, brainmap, conditions a-c, bloodwork a-b, card-queries)
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
