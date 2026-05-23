---
name: demopilot
description: "Use when starting a new product demo video, pitch video, or feature walkthrough from scratch. Master orchestrator for the DemoPilot 4-command pipeline. Run /pdv-validate first, then /pdv-explore, /pdv-build, /pdv-render in sequence. Each command takes 'ProductName' as its first argument."
argument-hint: "[ProductName] — e.g. 'OBSERVE' or 'MyStartup'"
---

# DemoPilot — Master Orchestrator

Four commands. Three HTML review gates. One production-ready demo video.

## The Workflow

```
Step 1:  /pdv-validate "ProductName"         ~2 min   Haiku
Step 2:  /pdv-explore  "ProductName" <URL>   ~20 min  Sonnet + subagent
         → Review: projects/ProductName/exploration/phase1-report.html
Step 3:  /pdv-build    "ProductName"         ~30 min  Opus + Gemini
         → Review: projects/ProductName/storyboard/phase2-report.html
Step 4:  /pdv-render   "ProductName"         ~15 min  Haiku + Sonnet QA
         → Open:   projects/ProductName/output/phase3-report.html
```

**All output files live under `projects/ProductName/` — never mix products.**

## Model Routing Quick Reference

| Command | Primary model | Delegate to |
|---------|--------------|-------------|
| `/pdv-validate` | Haiku | — |
| `/pdv-explore` | Sonnet | Explore subagent (Phase 1 WebBridge) |
| `/pdv-build` storyboard | **Opus** | — |
| `/pdv-build` code | Sonnet | **Gemini** via `gemini -p` for bulk TSX |
| `/pdv-render` | Haiku | Sonnet for quality review pass |

## What Gets Built

- **Motion graphic scenes** (70%): Hook, Problem, Promise, Stats, Pricing, CTA
- **Screen recordings** (30%): Real app interactions via Playwright
- **Narration**: Voicebox (primary) → Qwen3-TTS → edge-tts (fallback)
- **Music**: ACE-Step per-scene presets → ffmpeg sine fallback

## Output Formats

- `projects/ProductName/output/demo.mp4` — 1920×1080, H.264
- `projects/ProductName/output/demo-9x16.mp4` — 1080×1920 (social)
- `projects/ProductName/output/demo-preview.gif` — first 8s

## Reference Files (load only when needed)

- `~/.claude/skills/demopilot/ref/visual-excellence.md` — anti-slop rules + creative arsenal
- `~/.claude/skills/demopilot/ref/tool-map.md` — all tool documentation
- `~/.claude/skills/demopilot/ref/common-mistakes.md` — debugging table

## Integrated External Skills

DemoPilot does not reinvent existing skills. These are invoked at the right phase:

| Skill | When invoked | Purpose |
|-------|-------------|---------|
| `/ui-ux-pro-max` | Phase 0 (in pdv-explore) | Palette + font pairing + spacing |
| `/pptx` | Pitch deck mode (roadmap) | Slide generation |
| `design-taste-frontend` | Phase 4A (in pdv-build) | Anti-slop visual review |
| `remotion-best-practices` | Phase 4A (in pdv-build) | Remotion-specific patterns |

## 8-Act Video Structure

| Act | Time | Job |
|-----|------|-----|
| 1. Hook | 0–5s | Pain statement. No product yet. |
| 2. Problem | 5–20s | The world BEFORE. Chaos, cost, complexity. |
| 3. Promise | 20–25s | Logo reveal. One unforgettable line. |
| 4. Product Tour | 25–150s | Real interactions. Ken Burns. Narration. |
| 5. Wow Moments | embedded | 2–3 jaw-drops with Callout Circles. |
| 6. Social Proof | 150–165s | Specific numbers counting up. |
| 7. Pricing Contrast | 165–175s | Side-by-side. No words needed. |
| 8. CTA | 175–180s | One ask. Low friction. |

Split: **30% recordings, 70% motion graphics.**
