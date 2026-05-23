---
name: pdv-build
description: "Use as Step 3 of DemoPilot after reviewing the Reveal.js storyboard and running /pdv-explore continue. Narration-first build: generates audio, locks frame counts, then builds Remotion scenes via Gemini and Playwright recording scripts. Outputs phase2-report.html."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 3: Build

**Remotion code: Gemini** | **Recording scripts: Sonnet** | **Quality: batch impeccable**

## Setup

**First action: read state and toolchain**
```bash
cat projects/{productname}/.demopilot-state
cat projects/{productname}/toolchain.json
```

If `.demopilot-state` is missing or `phase_completed` is not `storyboard`:
Stop — "Run `/pdv-explore \"{ProductName}\"` and approve the storyboard first."

If `toolchain.json` is missing:
Stop — "Run `/pdv-validate \"{ProductName}\"` first."

```
ProductName  = argument
ProjectRoot  = projects/{productname}/
EDGE_TTS_PY  = toolchain.json → edge_tts_python
VOICEBOX_URL = toolchain.json → voicebox_url
NARRATION    = toolchain.json → narration_strategy
```

Read `ProjectRoot/storyboard/decisions.json` — only `approved` and `maybe` scenes are built.
Read `ProjectRoot/src/theme.ts`
Read `~/.claude/skills/demopilot/ref/visual-excellence.md`

Do NOT re-invoke design skills — theme.ts already encodes all design decisions from pdv-explore.
Design rules are embedded directly in the Gemini prompt below.

---

## PHASE 3 — Auto-generate approved.md from decisions.json

No Opus re-draft. Parse `decisions.json` + `storyboard/phase1-report.html` mechanically.
Extract for each approved/maybe scene: scene id, name, type, narration text, URL, interaction steps,
music preset, emotional beat, timing estimate. Write to `projects/{productname}/storyboard/approved.md`.

This is a read-and-reformat operation — not a creative step.

---

## PHASE 4A — NARRATION FIRST (before any Remotion code)

**This order is mandatory. Never write scene TSX before narration is measured.**

### Step 1: Generate all narration MP3s

Use `narration_strategy` from toolchain.json:

**If voicebox:**
```bash
# For each scene, POST to voicebox API:
curl -s -X POST {VOICEBOX_URL}/generate \
  -H 'Content-Type: application/json' \
  -d '{"profile_id":"{profile}","text":"{narration text}","output":"projects/{productname}/public/narration/scene{NN}.mp3"}'
```

**If edge-tts:**
Write `projects/{productname}/scripts/gen-narration.py` using `{EDGE_TTS_PY}` as interpreter:
```python
import asyncio, edge_tts, os

NARRATIONS = {
    "scene01": "{narration text scene 1}",
    "scene02": "{narration text scene 2}",
    # ... all scenes
}

VOICE = "en-US-AriaNeural"

async def main():
    os.makedirs("public/narration", exist_ok=True)
    for scene_id, text in NARRATIONS.items():
        communicate = edge_tts.Communicate(text, VOICE)
        path = f"public/narration/{scene_id}.mp3"
        await communicate.save(path)
        size = os.path.getsize(path)
        print(f"{scene_id}: {size} bytes {'OK' if size > 1000 else 'WARNING: too small'}")

asyncio.run(main())
```

Run with the confirmed interpreter:
```bash
cd projects/{productname}
{EDGE_TTS_PY} scripts/gen-narration.py
```

Verify all files > 1KB. If any file is 0 bytes or missing, stop and debug before continuing.

### Step 2: Measure all durations with ffprobe

```bash
for f in projects/{productname}/public/narration/scene*.mp3; do
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  echo "$(basename $f .mp3): ${dur}s"
done
```

Record every duration. These numbers are the source of truth.

### Step 3: Compute and lock frame counts

For each scene:
```
frames = ceil(duration_seconds * 30 / 30) * 30   # round up to nearest 30 frames
```

Write `projects/{productname}/config.ts` with locked frame counts:
```typescript
export const SCENE_DURATIONS: Record<string, number> = {
  scene01: {frames},  // {duration}s narration
  scene02: {frames},
  // ... all scenes
};

export const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a,b) => a+b, 0)
  - (Object.keys(SCENE_DURATIONS).length - 1) * 20; // subtract transition overlaps
```

Write `projects/{productname}/src/Root.tsx` with MainVideo composition using locked frame counts.

**Only now proceed to scene code generation.**

---

## PHASE 4B — Remotion Scene Components (via Gemini)

**Use Gemini — prevents Claude context compaction across 10+ scene files.**

```bash
gemini -p "@projects/{productname}/src/theme.ts \
  @projects/{productname}/storyboard/approved.md \
  @projects/{productname}/config.ts \
  Write complete Remotion v4 TSX scene files for all scenes in approved.md.

  MANDATORY RULES — no exceptions:

  AUDIO:
  - Every scene uses native <Audio src={staticFile('narration/sceneNN.mp3')} /> from 'remotion'
  - NO ffmpeg audio mixing. Audio lives inside the Remotion composition.

  DESIGN (from theme.ts — do not deviate):
  - Use THEME constants throughout — never hardcode colors, fonts, or spring values
  - No Inter font anywhere
  - Import remotion-bits: AnimatedText, Typewriter, AnimatedNumber, GradientTransition

  ANIMATION CRAFT (emil-design-eng rules):
  - Spring config: always THEME.spring = {stiffness:100, damping:20}
  - Stagger: always THEME.stagger = 40ms between elements
  - Easing: cubic-bezier(0.23, 1, 0.32, 1) for entrances
  - Every animation must be interruptible — use spring(), not linear interpolate for motion
  - No instant state changes — every visual change needs at least 8 frames of transition

  CREATIVE ARSENAL (design-taste-frontend patterns — pick one per scene):
  - Cinematic reveal: content slides in from edge with depth blur
  - Spotlight card: dark bg, single element illuminated
  - Stagger cascade: elements enter in sequence, each triggering the next
  - Data surge: numbers count up with color pulse at peak
  - Ken Burns: slow zoom + pan on any static image or recording
  - Never: flat fade-in of entire slide, static text walls, uncoordinated simultaneous motion

  COMPOSITION:
  - Use TransitionSeries with fade() transitions between scenes (20 frames each)
  - Ken Burns on every OffthreadVideo: const scale = 1 + useCurrentFrame() * 0.0002
  - Frame counts come from config.ts SCENE_DURATIONS — never hardcode durations
  - React hooks: never call conditionally or inside loops

  Output each as a complete file: src/scenes/SceneNN{Name}.tsx"
```

Copy output files to `projects/{productname}/src/scenes/`.

**Batch quality gate — runs ONCE across all scenes after Gemini output is copied:**
```bash
cd projects/{productname}
npx impeccable detect    # anti-patterns across all src/scenes/*.tsx
npx impeccable /animate  # motion audit
npx impeccable /color    # contrast check
```

Review impeccable output. Fix any blockers in batch. Do not run per-scene — Gemini wrote
all scenes consistently, issues will be systematic not isolated.

---

## PHASE 4C — Playwright Recording Scripts (Sonnet)

For each screen-recording scene in approved.md, write `projects/{productname}/scripts/record-{scene}.ts`:

```typescript
import { RecordingScript } from "../../../pipeline/types";

export const record{SceneName}: RecordingScript = {
  id: "{scene-id}",
  productName: "{ProductName}",
  url: "{url-from-findings.md}",        // NEVER assumed — always from findings
  viewport: { width: 1920, height: 1080 },
  steps: [
    { action: "navigate", url: "{url}" },
    { action: "wait", ms: {load_time_ms_from_findings} },
    { action: "hover-xy", x: {cx}, y: {cy} },  // coords from findings.md only
    { action: "wait", ms: 1500 },
    { action: "click-nth", selector: ".group.grid", index: 0 },
    { action: "wait", ms: 2000 },
  ],
};
```

---

## Output: phase2-report.html

Write `projects/{productname}/storyboard/phase2-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Phase 2 — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
.scene-card{background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:12px 0}
.act-tag{background:#18181b;color:#a1a1aa;padding:2px 8px;border-radius:4px;font-size:12px}
.narration{color:#a1a1aa;font-style:italic;margin:8px 0;font-size:14px}
.duration{color:#22c55e;font-size:13px}
.maybe{border-color:#d97706}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #222;font-size:13px}
th{color:#a1a1aa;font-weight:500}
code{background:#1a1a1a;padding:2px 6px;border-radius:3px;font-size:12px}
</style></head><body>
<h1>Phase 2 Report — {ProductName}</h1>
<p style="color:#a1a1aa">Total: {total_frames} frames · {total_seconds}s · {scene_count} scenes</p>
<p style="color:#a1a1aa">Narration: {narration_strategy} · Sync check: ✅ passed</p>

{scene cards: act name, decision badge (approved/maybe), emotional beat, narration preview, measured duration, components, music preset}

<h2>Files Generated</h2>
<table>
<tr><th>Scene</th><th>TSX</th><th>Recording Script</th><th>Narration</th><th>Frames</th></tr>
{rows}
</table>

<p>Next: <code>/pdv-render "{ProductName}"</code></p>
</body></html>
```

Write state file `projects/{productname}/.demopilot-state`:
```json
{
  "product": "{ProductName}",
  "phase_completed": "build",
  "next_command": "/pdv-render \"{ProductName}\"",
  "toolchain_json": "toolchain.json",
  "total_frames": {total_frames},
  "total_seconds": {total_seconds},
  "notes": "{N} scenes built. Sync check passed. Ready to render."
}
```

Tell user: "Review phase2-report.html then run `/pdv-render \"{ProductName}\"`"
