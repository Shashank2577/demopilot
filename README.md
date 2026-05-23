# DemoPilot 🎬

**The open-source demo video studio for founders.**  
Product demos · Feature walkthroughs · Pitch videos · Investor materials — all from your terminal.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/works%20with-Claude%20Code-purple.svg)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/skills-5%20installed-blue.svg)](#installation)

> Stop paying $300–800/month for Arcade, Supademo, or Synthesia.  
> DemoPilot gives you code-driven demo videos, pitch decks, and investor materials — automated, reproducible, and beautiful.

---

## Why DemoPilot?

| | Arcade / Supademo | Synthesia | **DemoPilot** |
|---|---|---|---|
| Real app recording | ✅ | ❌ | ✅ |
| Code-driven (reproducible) | ❌ | ❌ | ✅ |
| AI narration | ❌ | ✅ (avatars) | ✅ (voice only) |
| Per-scene AI music | ❌ | ❌ | ✅ |
| Pitch deck generation | ❌ | ❌ | ✅ (roadmap) |
| Works offline | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | ✅ |
| Monthly cost | $300–800 | $30–1000 | **$0** |

---

## What It Produces

- **Product demo videos** — real app recording + motion graphics, 2–4 min, 16:9 + 9:16 + GIF
- **Feature walkthroughs** — focused single-feature demos with narration
- **Sales explainer videos** — problem/solution narrative for top-of-funnel
- **Investor pitch videos** — Demo Day ready, narrative arc from pain to traction
- **Runbooks & handbooks** — animated technical documentation (coming soon)
- **Pitch decks** — Remotion-powered or PDF slides (coming soon)

---

## How It Works

Four commands. Three human review checkpoints. One great video.

```bash
/pdv-validate "ProductName"          # Check all tools are installed (Haiku, ~2 min)
/pdv-explore  "ProductName" <URL>    # Explore app, generate shot list (Sonnet, ~20 min)
                                     # → Review projects/ProductName/phase1-report.html
/pdv-build    "ProductName"          # Storyboard + build all Remotion scenes (Opus+Gemini, ~30 min)
                                     # → Review projects/ProductName/phase2-report.html  
/pdv-render   "ProductName"          # Narration + music + render + export (Haiku, ~15 min)
                                     # → Open projects/ProductName/output/phase3-report.html
```

**Total: ~65–90 min, ~20 min of your attention.**  
(vs 4–8 hours editing in Premiere or ScreenFlow)

---

## Installation

**One-line install** (copies all 5 skills to `~/.claude/skills/`):

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/demopilot/main/install.sh | bash
```

**Or clone and install manually:**

```bash
git clone https://github.com/YOUR_USERNAME/demopilot
cd demopilot
./install.sh
```

**Prerequisites** — run `/pdv-validate` to check automatically:

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js 18+ | Remotion render engine | `brew install node` |
| Python 3.9+ | Music + narration scripts | `brew install python` |
| ffmpeg | Video processing | `brew install ffmpeg` |
| Playwright | Headless recording | `npm i -g playwright` |
| Claude Code | AI orchestration | [claude.ai/code](https://claude.ai/code) |
| Remotion | Motion graphics | `npm create video@latest` |
| WebBridge / kimi-webbridge | Live app exploration | See [docs/tools/webbridge.md](docs/tools/webbridge.md) |
| Voicebox *(optional)* | High-quality narration | [voicebox.sh](https://voicebox.sh) |
| edge-tts *(fallback)* | Offline narration | `pip install edge-tts` |

---

## Architecture

```
demopilot/
  skills/
    demopilot/          # Master orchestrator skill (/demopilot)
      SKILL.md
      ref/              # Shared reference — loaded on demand, not on every message
        visual-excellence.md
        tool-map.md
        common-mistakes.md
        skiper-components/
    pdv-validate/       # Tool validation (/pdv-validate) — model: Haiku
    pdv-explore/        # App exploration + shot list (/pdv-explore) — model: Sonnet
    pdv-build/          # Storyboard + Remotion build (/pdv-build) — model: Opus + Gemini
    pdv-render/         # Narration + render + export (/pdv-render) — model: Haiku
  pipeline/             # TypeScript recording pipeline
  templates/            # Starter Remotion project
  docs/                 # Full documentation
```

All output files are namespaced by product:
```
projects/YourProduct/
  exploration/phase1-report.html    # Review before building
  storyboard/phase2-report.html     # Review before rendering
  output/
    demo.mp4                        # Final 16:9 video
    demo-9x16.mp4                   # Vertical for social
    demo-preview.gif                # First 8s for embeds
    phase3-report.html              # Quality report
```

---

## Model Routing

DemoPilot uses the right model for each task — no Opus tokens wasted on bash commands:

| Phase | Model | Why |
|-------|-------|-----|
| Validation | **Haiku** | Bash checks, no judgment needed |
| Design system | **Opus** | Sets quality ceiling for entire video |
| App exploration (subagent) | **Sonnet** | Navigation + coordinate extraction |
| Shot list curation | **Opus** | Narrative judgment — which scenes tell the story |
| Storyboard + narration | **Opus** | Voice, tone, arc — most creative phase |
| Remotion code (bulk) | **Gemini** | 1M context, writes all 10 scenes without compaction |
| Recording scripts | **Sonnet** | Mechanical code from Phase 1 coordinates |
| Narration + music gen | **Haiku** | Just running bash scripts |
| Render + export | **Haiku** | Just bash commands |

---

## Roadmap

- [x] Product demo video pipeline (v0.1)
- [ ] Pitch deck skill (integrates with existing `pptx` skill)
- [ ] Interactive walkthrough skill  
- [ ] Runbook / handbook skill
- [ ] Investor one-pager skill
- [ ] Multi-language narration
- [ ] Brand kit integration

---

## Stack

[Remotion](https://remotion.dev) · [remotion-bits](https://github.com/remotion-dev/remotion-bits) · [Playwright](https://playwright.dev) · [Skiper UI](https://skiper-ui.com) · [Voicebox](https://voicebox.sh) · [ACE-Step](https://acemusic.ai) · [Claude Code](https://claude.ai/code)

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — use it, fork it, build on it.
