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
| **Runbook / Handbook** | Animated technical walkthrough (coming soon) | roadmap |
| **Interactive Walkthrough** | Step-by-step product guide (coming soon) | roadmap |

**Everything produces a real file you can use.** Nothing is locked behind a paid wall.

---

## The 4 Commands (Always in This Order)

```
/pdv-validate "ProductName"           Step 1 — Check all tools (~2 min, Haiku)
/pdv-explore  "ProductName" <URL>     Step 2 — Explore app + shot list (~20 min, Sonnet)
                                      → Review: projects/ProductName/exploration/phase1-report.html
/pdv-build    "ProductName"           Step 3 — Storyboard + build scenes (~30 min, Opus + Gemini)  
                                      → Review: projects/ProductName/storyboard/phase2-report.html
/pdv-render   "ProductName"           Step 4 — Narration + music + render (~15 min, Haiku)
                                      → Open: projects/ProductName/output/phase3-report.html
```

**At every review step, you will see 2–3 design options to choose from.** You never get a single take-it-or-leave-it output.

---

## Output Formats (All Included)

- `projects/ProductName/output/demo.mp4` — 1920×1080, H.264
- `projects/ProductName/output/demo-9x16.mp4` — 1080×1920 (LinkedIn, TikTok, Reels)
- `projects/ProductName/output/demo-preview.gif` — first 8s for website embeds

---

## Design Stack (Always Active)

Every frontend piece — motion scenes, HTML reports, slides — uses all 5 of these:

| Tool | What it enforces |
|------|-----------------|
| `/ui-ux-pro-max` | Palette, fonts, spacing — sets quality ceiling |
| `/design-taste-frontend` | Anti-slop rules, Creative Arsenal patterns |
| `/emil-design-eng` | Animation craft, spring physics, micro-interactions |
| `npx impeccable detect` | Automated anti-pattern detection |
| Skiper UI | Premium animated component library |

Full rules: `~/.claude/skills/demopilot/ref/design-stack.md`

---

## Model Routing

| Phase | Model | Why |
|-------|-------|-----|
| Validation | Haiku | Just bash — no judgment needed |
| Design system (Phase 0) | Opus | Sets quality ceiling for the entire video |
| App exploration (subagent) | Sonnet | Navigation + coordinate extraction |
| Shot list curation | Opus | Narrative judgment |
| Storyboard + narration | Opus | Voice, tone, arc — most creative phase |
| Remotion code (bulk) | Gemini | 1M context, all scenes without compaction |
| Recording scripts | Sonnet | Mechanical code from Phase 1 findings |
| Narration + music + render | Haiku | Bash execution only |

---

## Token Efficiency

- ~65K–110K tokens total across 3 sessions (vs 250K+ in a single session)
- Phase 1 runs as a **subagent** — WebBridge output never enters your main context
- Gemini writes all Remotion TSX — no Claude compaction mid-session
- Each skill file is ≤200 lines — lightweight in every conversation

---

## Reference Files (loaded on demand, not on every message)

- `~/.claude/skills/demopilot/ref/visual-excellence.md` — anti-slop rules + creative arsenal
- `~/.claude/skills/demopilot/ref/tool-map.md` — all tool documentation
- `~/.claude/skills/demopilot/ref/common-mistakes.md` — debugging table
- `~/.claude/skills/demopilot/ref/design-stack.md` — mandatory design tool invocation rules

---

## Not Sure Where to Start?

Tell me what you want to make and I'll route you to the right command:

- *"I want to record a demo of my SaaS app"* → start with `/pdv-validate`
- *"I need a pitch video for investors"* → start with `/pdv-validate`, investor arc in `/pdv-explore`
- *"I want a short feature video for Twitter"* → start with `/pdv-validate`, short-form in `/pdv-explore`
- *"I need a pitch deck"* → `/pptx` skill, DemoPilot provides the design system
