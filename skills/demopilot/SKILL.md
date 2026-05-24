---
name: demopilot
description: "Use when starting any product demo video, pitch video, feature walkthrough, investor pitch, or sales explainer. Master orchestrator for the DemoPilot pipeline. Shows full capabilities and routes to the right 4-command sequence."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — What You Can Build

DemoPilot is an open-source studio for everything founders need to present their product. Pick what you want to make:

## What You Can Make

| Output | What it is | Commands |
|--------|-----------|---------|
| **Product Demo Video** | 2–4 min video of your real app with narration + music | `/pdv-validate` → `/pdv-explore` → `/pdv-build` → `/pdv-render` |
| **Feature Walkthrough** | Focused demo of one feature, short-form | Same 4 commands, single-scene shot list |
| **Investor Pitch Video** | Demo Day ready narrative: problem → product → traction → ask | Same 4 commands, investor narrative arc |
| **Sales Explainer Video** | Top-of-funnel problem/solution, no app recording needed | Same 4 commands, motion-graphic-only mode |
| **Pitch Deck** | Animated slide deck (uses `/pptx` skill) | `/pptx` with DemoPilot design system |

**Everything produces a real file you can use.** Nothing is locked behind a paid wall.

---

## The 4 Commands (Always in This Order)

```
/pdv-validate "ProductName"           Step 1 — Validate toolchain (~2 min, Haiku)
/pdv-explore  "ProductName" <URL>     Step 2 — Design + Auth + Explore + Storyboard (~25 min)
                                      → Approve: projects/ProductName/storyboard/phase1-report.html
/pdv-build    "ProductName"           Step 3 — Narration + per-scene briefs + scene TSX (~30 min)
                                      → Review: projects/ProductName/storyboard/phase2-report.html
/pdv-render   "ProductName"           Step 4 — Record + polish + review + render (~20 min)
                                      → Open: projects/ProductName/output/phase3-report.html
```

Three human-gated checkpoints — storyboard approval, recording review, optional studio preview — sit between the four commands. The pipeline blocks on each one; nothing renders silently.

---

## Pipeline Diagram (Phases + Gates)

```
Phase 0  pdv-validate     → toolchain.json
                            (paths to ffmpeg, ffprobe, edge-tts, voicebox, openscreen, webbridge)

Phase 1  pdv-explore      → Phase 0a: design stack runs → src/theme.ts
                          → Phase 0b: capture auth-state.json ONCE (single source of truth)
                          → Phase 1:  Explore subagent (Sonnet, WebBridge)
                              · checklist + judgment per page
                              · expected_content YAML probe per page
                              · 2 screenshots/page persisted to disk
                              · coord-resolved interaction steps per scene
                              → findings.md
                              → exploration/screenshots/<slug>-{full,viewport}.png
                              → exploration/scene-steps.yaml
                          → Phase 2:  Combined Reveal.js (app map + storyboard)
                              ⛔ GATE: decisions.json mtime change unblocks pipeline

Phase 3  pdv-build        → narration MP3s first (lock frame counts)
                          → Phase 4B Step 1:   Claude writes scene-NN-brief.md per scene
                              (now includes `components:` field with remotion-bits + Skiper IDs)
                          → Phase 4B Step 1.5: Component install gate (NEW)
                              · npx remotion-bits fetch <name> --json per component
                              · npx shadcn add @skiper-ui/skiperNN per component
                              · file-existence check; abort scene on failure
                              · writes components-inventory.md (INSTALLED_COMPONENTS record)
                          → Phase 4B Step 2:   Gemini generates SceneNN.tsx
                              (receives INSTALLED_COMPONENTS inventory; imports only from @/components/...)
                          → recording scripts derived DETERMINISTICALLY from scene-steps.yaml
                              (no LLM hallucination of selectors)
                          → coord lint + impeccable batch gate
                          → phase2-report.html

Phase 4  pdv-render       → reuse auth-state.json (no regeneration)
                          → Pre-recording content gate (findings.md expected_content)
                          → Pre-recording account/data continuity check (fresh screenshots)
                          → Playwright records, strict mode (safeClick throws on miss,
                              waitForStableContent before every interaction,
                              tooltip-dismissal tail)
                          → OpenScreen polish (cli-anything-openscreen):
                              semantic zoom-to-click + speed over dead stretches
                          → recordings/review.html opens in browser
                              ⛔ GATE: recordings/decisions.json — every scene must be approved
                                       per-scene re-record loop supported
                          → sync check (narration ≤ recording)
                          → music (ffmpeg lavfi)

Phase 5  pdv-render       → optional --studio-first → Remotion Studio live preview
                          → default: contact sheet (every 30th frame as PNG)
                              ⛔ GATE: user can abort background render from contact sheet
                          → final render: demo.mp4 + demo-9x16.mp4 + demo-preview.gif
                          → phase3-report.html
```

---

## Side Effects on Your Project Tree

DemoPilot writes to your project's source tree during builds — this is by design, not a bug. Specifically:

- `pdv-validate` may run `npm install remotion-bits` in the project if missing.
- `pdv-build` runs `npx remotion-bits fetch <name>` and `npx shadcn add @skiper-ui/skiperNN` per scene, writing component source files into `<project>/src/components/` and `<project>/src/components/v1/`.
- These installs are scoped to the project directory passed at pipeline start. They do NOT modify global state, your other projects, or your home directory beyond standard npm cache.
- To audit which components got installed for a given run, see `<project>/components-inventory.md`.
- If you want to keep your project tree pristine, run the full pipeline against a throwaway scaffolded project and copy only the final output MP4 out.

Canonical Skiper specs live at `~/.claude/skills/product-demo-video/skiper-components/skiperNN.md` (104 specs). pdv-build reads these on demand; they are NOT vendored into this repo.

---

## Child Skill Map

| Skill | What it produces | What it consumes |
|-------|-----------------|------------------|
| `pdv-validate` | `toolchain.json` (interpreter paths, service URLs) | nothing |
| `pdv-explore`  | `src/theme.ts`, `auth/auth-state.json`, `exploration/findings.md` (with `expected_content` YAML blocks), `exploration/screenshots/*.png`, `exploration/scene-steps.yaml`, `storyboard/phase1-report.html`, `exploration/decisions.json` | `toolchain.json` |
| `pdv-build`    | `public/narration/scene*.mp3`, `config.ts` (locked frame counts), `scene-NN-brief.md` per scene, `src/scenes/SceneNN*.tsx`, `scripts/record-scene-*.ts`, `storyboard/interactions.json`, `storyboard/phase2-report.html` | `theme.ts`, `findings.md`, `scene-steps.yaml`, `decisions.json` |
| `pdv-render`   | `public/recordings/scene-NN-<slug>.webm` → `.mp4` → `-polished.mp4`, `*.interactions.json`, `recordings/review.html`, `recordings/decisions.json`, `render-preview/contact-sheet.html`, `output/demo.mp4`, `output/demo-9x16.mp4`, `output/demo-preview.gif`, `output/phase3-report.html` | `auth-state.json`, `findings.md`, `config.ts`, scene TSX, recording scripts |

---

## Artifact File Map

```
projects/{productname}/
├── .demopilot-state                       state contract between phases
├── toolchain.json                         pdv-validate output
├── auth/
│   └── auth-state.json                    ONE auth state, captured Phase 0b, reused everywhere
├── src/
│   ├── theme.ts                           design stack output → tokens
│   ├── Root.tsx
│   ├── components/
│   │   ├── <Name>.tsx                     remotion-bits source (npx remotion-bits fetch)
│   │   └── v1/skiperNN.tsx                Skiper source (npx shadcn add @skiper-ui/skiperNN)
│   └── scenes/SceneNN<Name>.tsx           Gemini-generated, imports only from @/components/...
├── config.ts                              locked SCENE_DURATIONS + TOTAL_FRAMES
├── scene-NN-brief.md                      Claude's per-scene brief for Gemini (includes components: list)
├── components-inventory.md                INSTALLED_COMPONENTS record: id + project-local path + exports + usage example
├── exploration/
│   ├── findings.md                        text + per-page expected_content YAML
│   ├── scene-steps.yaml                   machine-readable steps (action/target/coord/wait/assert)
│   ├── decisions.json                     storyboard approval gate
│   └── screenshots/
│       ├── <slug>-full.png                MANDATORY, gated before Phase 2
│       └── <slug>-viewport.png            MANDATORY, gated before Phase 2
├── storyboard/
│   ├── phase1-report.html                 Reveal.js: slide 0 app map + slides 1+ per-scene approval
│   ├── interactions.json                  click/hover timestamps for OpenScreen
│   └── phase2-report.html                 build summary
├── scripts/
│   ├── record-scene-*.ts                  deterministic, derived from scene-steps.yaml
│   └── lib/{content-gate,wait-stable}.ts  shared helpers
├── public/
│   ├── narration/scene*.mp3
│   ├── music/bg.mp3
│   └── recordings/
│       ├── raw/page@<sha>.webm            transient; renamed immediately
│       ├── scene-NN-<slug>.webm           Playwright output (renamed)
│       ├── scene-NN-<slug>.mp4            ffmpeg transcode
│       ├── scene-NN-<slug>-polished.mp4   OpenScreen output — Remotion reads THIS
│       ├── scene-NN-<slug>.interactions.json
│       ├── decisions.json                 post-recording approval gate
│       └── review.html                    browser review UI
├── render-preview/
│   ├── frame-NNNN.png                     every-30th-frame strobe
│   └── contact-sheet.html                 abort-render-from-here gate
└── output/
    ├── demo.mp4                           1920×1080
    ├── demo-9x16.mp4                      vertical
    ├── demo-preview.gif                   first 8s
    └── phase3-report.html
```

---

## `.demopilot-state` Keys (Contract Between Phases)

| Key | Set by | Consumed by |
|-----|--------|-------------|
| `auth_state_path` (absolute) | pdv-explore Phase 0b | pdv-build, pdv-render (NEVER regenerated downstream) |
| `findings_md` | pdv-explore | pdv-build (coord source), pdv-render (content gate source) |
| `scene_steps_yaml` | pdv-explore | pdv-build (recording script generation) |
| `screenshots_dir` | pdv-explore | pdv-explore Phase 2 (storyboard images) |
| `decisions_json` | pdv-explore Phase 2 | pdv-build (which scenes to build) |
| `viewport` | pdv-explore | pdv-render (recording size match) |
| `polished_recordings_dir` | pdv-render Step 7 | pdv-render Step 9+ (sync, render) |
| `render_decisions_json` | pdv-render Step 8 | pdv-render Step 9 (block until all approved) |
| `phase_completed` | every phase | next phase guard (`validate` → `storyboard` → `build` → `render`) |

---

## Pipeline Gates (Explicit Stops)

1. **Phase 0b auth check** — user must confirm the captured account is the one whose data should appear in the video.
2. **Phase 1 screenshot gate** — every page in `findings.md` must have both `-full.png` and `-viewport.png` on disk before Phase 2 builds the approval UI.
3. **Phase 2 storyboard gate** — `exploration/decisions.json` mtime change required before pdv-build proceeds. Reveal.js POSTs to a file-write server; pipeline watches mtime, not the open-in-browser event.
4. **Phase 3 coord lint** — every `hover-xy` / `click-xy` in generated recording scripts must resolve to a coord recorded in `findings.md`. No CSS-class guesses.
5. **Phase 4 pre-recording content gate** — `findings.md`'s `expected_content` must hold against a fresh page load before any interaction runs. Aborts with named pages on failure.
6. **Phase 4 account/data continuity** — fresh screenshot of every page-to-be-recorded under the recording auth; same expected_content check; abort if the account is missing data.
7. **Phase 4 recording strictness** — `safeClick` / `safeHover` throw on missing locators; `waitForStableContent` runs before every interaction; mandatory tooltip-dismissal tail (Escape + neutral click + 500ms).
8. **Phase 4 post-recording review gate** — `recordings/review.html` shows thumbnails + video + narration per scene. `recordings/decisions.json` must contain `approved` for every scene id from `config.ts`. Per-scene `rerecord` re-runs only that scene + its OpenScreen polish.
9. **Phase 5 contact-sheet gate** — every 30th frame written to `render-preview/`; user can kill the background render from the contact sheet HTML before the final MP4 commits. `--studio-first` flag opens Remotion Studio for live preview instead.

---

## Scene Types (Two Templates)

| Type | When | Overlay rules |
|------|------|---------------|
| `motion-graphic` | Hook, Problem, Stats narrative, Proof, CTA | Animated text, count-ups, gradient transitions, animated borders encouraged. Hook MUST have a product visual or strong motion graphic — pure text on black is banned. CTA must fill ≥40% of frame with ≥2 motion states. |
| `recording-polish` | Product walkthrough scenes | `<OffthreadVideo>` reads the OpenScreen-polished MP4. NO transform/scale (no Ken Burns — semantic zoom comes from OpenScreen). NO floating cards over the recording. ONE corner label max (≤280px wide), animated in once. |

Per-scene briefs (`scene-NN-brief.md`) encode the type-specific rules + visual progression timing (≥3 states for any scene >5s) before Gemini sees the prompt.

---

## Design Stack (Phase 0a Only — Output Encoded for Gemini)

These run inside Claude in pdv-explore Phase 0a:

| Tool | What it enforces |
|------|------------------|
| `/ui-ux-pro-max` | Palette, fonts, spacing — quality ceiling |
| `/design-taste-frontend` | Anti-slop rules, Creative Arsenal patterns |
| `/emil-design-eng` | Animation craft, spring physics, micro-interactions |
| `/taste`, `/impeccable` | Cross-cutting taste + automated anti-pattern detection |
| Skiper UI | Premium animated component library (referenced via tool-map.md API contracts) |

**Critical:** Gemini runs as a subprocess and has NO skill access. To preserve the design stack's reasoning, Claude encodes it into two artifacts that Gemini reads:

1. `src/theme.ts` — tokens (colors, fonts, spring, stagger).
2. `scene-NN-brief.md` — per-scene visual concept, color usage, layout spec, animation choreography, anti-slop notes specific to that narration.

Gemini receives `theme.ts` + `scene-NN-brief.md` + concrete remotion-bits / Skiper API contracts + `scene-steps.yaml` — never a generic "use Skiper" prompt.

Full rules: `~/.claude/skills/demopilot/ref/design-stack.md`

---

## Model Routing

| Phase | Model | Why |
|-------|-------|-----|
| Validation | Haiku | Just bash + path probing |
| Design system (0a) | Opus | Sets quality ceiling for entire video |
| Auth capture (0b) | Haiku | Mechanical — single WebBridge call |
| Exploration subagent | Sonnet | Navigation + coord extraction; output isolated from main context |
| Storyboard curation | Opus | Narrative judgment, scene ordering |
| Per-scene briefs | Opus | Visual concept synthesis from design stack output |
| Remotion TSX | Gemini | 1M context, all scenes without compaction |
| Recording scripts | none | DETERMINISTIC translation of `scene-steps.yaml` — no LLM |

> Optional optimization: `npx remotion-bits mcp` starts an MCP server exposing find/fetch tools. pdv-build can use this in lieu of subprocess calls when an MCP runtime is available — subprocess is the default.
| Render + polish | Haiku | Bash execution |
| Quality gates | Sonnet | impeccable detect, sync check |

---

## Reference Files (loaded on demand)

- `ref/visual-excellence.md` — anti-slop rules + Creative Arsenal patterns
- `ref/tool-map.md` — concrete API contracts for remotion-bits + Skiper UI (injected into Gemini prompts)
- `ref/common-mistakes.md` — debugging table for known failure modes
- `ref/design-stack.md` — mandatory design tool invocation rules for Phase 0a
- `PROBLEMS.md` — post-mortem log from the Prompture run (May 2026); maps every fix in this pipeline to the symptom it addresses

---

## Known Roadmap Items

- **D6 — Per-scene human review between scenes (round 2)**: a future Phase 2 iteration where the user is interrupted between each scene's generation to inspect quality as it lands, not after the full render. Not yet implemented; current pipeline gates at storyboard, recording review, and contact sheet only.
- **Repo cleanup**: empty `skills/demopilot/ref/skiper-components/` directory should be deleted — canonical specs now live at `~/.claude/skills/product-demo-video/skiper-components/`.

---

## Not Sure Where to Start?

Tell me what you want to make and I'll route you to the right command:

- *"I want to record a demo of my SaaS app"* → start with `/pdv-validate`
- *"I need a pitch video for investors"* → `/pdv-validate`, investor arc selected in `/pdv-explore`
- *"I want a short feature video for Twitter"* → `/pdv-validate`, short-form in `/pdv-explore`
- *"I need a pitch deck"* → `/pptx` skill; DemoPilot supplies the design system
