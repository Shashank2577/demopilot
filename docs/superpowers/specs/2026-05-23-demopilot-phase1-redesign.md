# DemoPilot Phase 1 Redesign — Deep Exploration + Visual Approval

**Date:** 2026-05-23  
**Scope:** `/pdv-explore` skill internals only — 4-command pipeline interface unchanged  
**Approach:** A — extend pdv-explore in place, no new commands  

---

## Problem

The current Phase 1 subagent treats exploration as a visual capture task:
navigate → wait 3 seconds → screenshot → next page. This produces surface documentation
with no understanding of what each page does, what is interactive, what drill-downs exist,
or what relationships exist between pages. Scenes are selected based on screenshot aesthetics
alone, not product understanding. The output (static HTML report) is text-heavy and gives
the user no spatial sense of the app or per-scene approval control.

---

## Solution Overview

Three changes to `/pdv-explore`:

1. **Phase 1 subagent** — rewritten with structured checklist + freeform judgment passes per page
2. **tldraw canvas** — replaces static screenshot grid; spatial app map with annotations and relationships
3. **Reveal.js storyboard** — replaces phase1-report.html; slide-per-scene with approve/maybe/remove buttons writing to `decisions.json`

`/pdv-build` reads `decisions.json` instead of the old shot list — only approved scenes get built.

---

## Phase 1 — Deep Exploration Subagent

### Two-pass structure per page (max 15 pages)

**Pass 1 — Structured checklist** (must complete before moving to next page):

| Item | What to document |
|------|-----------------|
| Identity | Page title, URL, one-sentence purpose |
| Navigation | All sidebar items, tabs, breadcrumbs, submenus visible from this page |
| Interactive elements | Every button, dropdown, filter, date picker, toggle, table row, chart area — with confirmed pixel coordinates via `getBoundingClientRect()` |
| Interactions | Click each interactive element — document what changes, what opens, what loads |
| Drill-downs | Any modal dialogs, slide-overs, nested subpages, expanded panels |
| Data | What numbers/charts are shown, what time range, which filters affect them |
| Relationships | Does anything on this page link to or affect another page? Document the connection. |

Minimum interaction time per page: **3 minutes of real exploration** before moving on.
Agent must not move to next page until checklist is complete.

**Pass 2 — Freeform judgment** (three notes, feeds tldraw annotations):

1. **What this page does** — the job it accomplishes for the user (one sentence)
2. **Most interesting interaction** — the one thing that would surprise someone seeing it for the first time
3. **Video potential** — would this look compelling on screen, why, what interaction sequence would be most interesting to watch

### Output: `exploration/findings.md`

One structured entry per page, both passes, confirmed pixel coordinates.
Format:
```
## {Page Name}
URL: {confirmed URL}
Load time: {seconds}
Visual impact: {1-5}

### Checklist
- Navigation: {items}
- Interactive elements: [{name, selector, coords: {x,y}}]
- Interactions discovered: {what each click revealed}
- Drill-downs: {any subpages/modals}
- Data shown: {description}
- Relationships: {links to other pages}

### Judgment
- What it does: {one sentence}
- Most interesting interaction: {description}
- Video potential: {YES/MAYBE/NO} — {reason + suggested interaction sequence}
```

---

## tldraw Canvas — App Map

### Purpose
Spatial, read-only overview of the entire app. User reviews this before the storyboard phase
to confirm the agent understood the product correctly.

### Generation
Agent writes `exploration/app-map.json` in tldraw scene JSON format.
Served via `exploration/app-map.html` — loads `@tldraw/tldraw` from CDN, no install.
Agent runs `open exploration/app-map.html` automatically.

### Canvas layout
Pages are grouped spatially by app section, derived from findings.md navigation structure.
Sections are placed in a 2×N grid (top-left, top-right, bottom-left, bottom-right, etc.)
in the order they appear in the app's sidebar — not hardcoded to any specific app.

Arrows drawn between pages that have confirmed relationships from findings.md.

### Per-page card contents
- Screenshot thumbnail (top)
- Page name + URL
- Visual impact score badge (1–5, color-coded)
- "What it does" — one sentence
- "Most interesting interaction" — one sentence
- Video potential badge: YES (green) / MAYBE (yellow) / NO (grey)

### User action
Browse canvas, zoom in, read annotations. Read-only — no editing required.
When ready: type `/pdv-explore continue` in chat → agent proceeds to Reveal.js storyboard.

---

## Reveal.js Storyboard — Scene Approval

### Purpose
Scene-by-scene approval UI. User navigates slides, reviews each proposed scene,
and makes explicit approve/maybe/remove decisions before any recording or building starts.

### Trigger
`/pdv-explore continue "ProductName"` — second invocation of pdv-explore after user has reviewed the tldraw canvas.
The `continue` keyword is the first argument; it signals the agent to skip Phase 0+1 and go straight to storyboard generation.
The argument-hint in pdv-explore's frontmatter must document both forms:
- First run: `/pdv-explore "ProductName" <URL>`
- Second run: `/pdv-explore continue "ProductName"`

Agent reads findings.md, curates 10–12 scenes, generates storyboard.

### Generation
Single self-contained `storyboard/phase1-report.html`:
- Reveal.js loaded from CDN
- Decisions written via `localStorage` + `fetch` POST to a local file-write endpoint
- Agent starts a 5-line Python `http.server` script automatically to handle file writes
- Opens with `open storyboard/phase1-report.html`

### Per-scene slide contents
For screen recording scenes:
- Scene number + page name (header)
- Screenshot (full-width background, dimmed)
- Narration draft (2–3 sentences of voiceover)
- Interaction sequence (step-by-step what recording will show)
- Music preset badge (tension / hopeful / corporate-bg / cta)
- Timing estimate (seconds)
- Creative pattern name from visual-excellence.md
- Buttons: **✓ Approve** / **~ Maybe** / **✗ Remove**

For motion graphic scenes (Hook, Problem, Promise, Stats, CTA):
- Animation concept mockup instead of screenshot
- Same narration, timing, music, buttons

### decisions.json format
```json
{
  "scene01-hook":     "approved",
  "scene02-problem":  "approved",
  "scene03-promise":  "maybe",
  "scene04-commits":  "approved",
  "scene05-showcase": "removed"
}
```
Written to `storyboard/decisions.json` on every button click.

### Status bar
Persistent bottom bar: `{N} approved · {M} maybe · {R} removed — run /pdv-build when ready`

---

## Handoff to /pdv-build

`/pdv-build "ProductName"` reads `storyboard/decisions.json`:
- `approved` → built normally
- `maybe` → built but flagged with a warning in phase2-report
- `removed` → skipped entirely

This replaces the previous hardcoded shot list approach.

---

## Post-Mortem Extensions (from Prompture production run)

### PM-1: pdv-validate must prove tools work, not just exist

**Problem:** edge-tts was installed inside a uv venv at a non-standard path. The session spent
30+ minutes in circles: pip blocked → --user blocked → pipx missing → eventually found at
`~/.local/share/uv/tools/edge-tts/bin/python3`. Validate just checked existence, not callability.

**Fix:** Every tool check must actually *invoke* the tool and capture output. On success, write
the exact working invocation path to `projects/{name}/toolchain.json`:

```json
{
  "node": "/opt/homebrew/bin/node",
  "python3": "/opt/homebrew/opt/python@3.14/bin/python3.14",
  "edge_tts_python": "~/.local/share/uv/tools/edge-tts/bin/python3",
  "ffmpeg": "/opt/homebrew/bin/ffmpeg",
  "playwright": "npx playwright",
  "voicebox_url": "http://127.0.0.1:17493",
  "webbridge_url": "http://127.0.0.1:10086"
}
```

Every subsequent phase reads `toolchain.json` — no tool path is ever assumed again.
If validate hasn't run, `/pdv-explore` and `/pdv-build` refuse to start.

---

### PM-2: Audio architecture declared in Phase 0, never changed

**Problem:** Original design used ffmpeg post-processing for audio. This meant:
- Remotion Studio couldn't preview audio → looked broken during review
- Triggered full mid-session re-architecture: inject `<Audio>` into 10 scene files
- ffmpeg mix attempt then failed with wrong `atrim` syntax — more lost time

**Fix:** pdv-build declares upfront: **all audio uses native Remotion `<Audio>` components**.
No ffmpeg audio mixing. Music and narration are both `<Audio>` inside each `<Sequence>`.
This is written into the Gemini prompt as a hard rule, not a suggestion.

---

### PM-3: Narration-first build order

**Problem:** Narration was generated *after* Remotion scenes were coded. Timing mismatches
were discovered only after the first full render — 9 of 11 scenes needed frame count
adjustments, requiring a full second render cycle (~20-30 min lost).

**Fix:** Strict build order in pdv-build:
1. Generate all narration MP3s → measure actual durations with ffprobe
2. Compute frame counts from real durations (duration_seconds × 30, rounded up to nearest 30)
3. Write `config.ts` with locked frame counts
4. Write `Root.tsx` composition
5. ONLY THEN generate Remotion scene TSX via Gemini

Scene code is always written to match measured audio. Never the reverse.

---

### PM-4: Pre-assembly sync check gate

**Problem:** Recording durations vs narration durations were never compared before assembly.
Scene04: 20s recording, 25.2s narration (5s shortfall). Scene10: 14s recording, 5.6s narration
(8s silent video). Only caught after full render.

**Fix:** After recordings and narration both exist, run mandatory sync check before any render:

```bash
# For each scene with a recording:
ffprobe -v quiet -show_entries format=duration -of csv=p=0 public/recordings/sceneXX.mp4
ffprobe -v quiet -show_entries format=duration -of csv=p=0 public/narration/sceneXX.mp3
# Recording duration must be >= narration duration
# If not: pause, show mismatch table, ask user how to resolve before continuing
```

If any scene fails the check, pdv-render stops and reports the mismatch table.
Never silently produce a video with frozen frames or silent gaps.

---

### PM-5: Session handoff file

**Problem:** Production ran across 6+ separate Claude sessions. Each session re-read files
to reconstruct state, wasting tokens and time. No structured "here is where we are" existed.

**Fix:** At the end of every phase, write `projects/{name}/.demopilot-state`:

```json
{
  "product": "Prompture",
  "phase_completed": "explore",
  "next_command": "/pdv-build \"Prompture\"",
  "decisions_json": "storyboard/decisions.json",
  "theme_ts": "src/theme.ts",
  "toolchain_json": "toolchain.json",
  "notes": "11 scenes approved, 2 maybe, 0 removed"
}
```

Every skill reads `.demopilot-state` as its first action — reports current state to user,
confirms the right next step, then proceeds.

---

### PM-6: Storytelling pass in Reveal.js storyboard

**Problem:** Scenes were sequenced by visual impact score, not story logic. No narrative arc
was defined. The result was technically correct scenes with no story intent — flat, no
interactions, no emotional journey. User's exact words: "where is the voice over? this is bad,
no interactions."

**Fix:** Reveal.js storyboard adds storytelling layer per scene:

Each slide includes three new fields:
- **Emotional beat** — what does the viewer *feel* at this moment? (e.g., "recognition — they've had this problem")
- **Question answered** — what question does this scene resolve? (e.g., "can Prompture show me what my team is actually building?")
- **Transition logic** — why does this scene follow the previous one? (e.g., "we showed the problem, now we show the exact moment it's solved")

The storyboard also has a **narrative arc overview slide** at the start:
Hook → Problem → Promise → [product scenes in story order] → Social proof → CTA

Scene ordering in the storyboard is driven by story logic first, visual impact second.
The agent must write a one-paragraph "story of this video" before placing any scenes.

---

## Files Changed

| File | Change |
|------|--------|
| `~/.claude/skills/pdv-validate/SKILL.md` | Rewrite: actually invoke each tool, write toolchain.json |
| `~/.claude/skills/pdv-explore/SKILL.md` | Full rewrite: deep exploration + tldraw + Reveal.js with storytelling |
| `~/.claude/skills/pdv-build/SKILL.md` | Rewrite: narration-first order, native Audio, sync check gate, reads decisions.json + toolchain.json |
| `~/.claude/skills/demopilot/ref/tool-map.md` | Add tldraw, Reveal.js, toolchain.json, .demopilot-state entries |

No changes to: `/pdv-render`, `/demopilot` master skill, design stack ref files.

---

## What Does Not Change

- 4-command pipeline interface: validate → explore → build → render
- Phase 0 design system bootstrap (Opus, ui-ux-pro-max, design-taste-frontend, emil-design-eng)
- phase2-report.html and phase3-report.html from build and render phases
- Model routing table
