---
name: pdv-build
description: "Use as Step 3 of DemoPilot after reviewing the Reveal.js storyboard and running /pdv-explore continue. Narration-first build: generates audio, locks frame counts, writes per-scene design briefs, builds Remotion scenes via Gemini, generates deterministic Playwright recording scripts from structured narration steps. Outputs phase2-report.html."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 3: Build

**Remotion code: Gemini (per-scene brief)** | **Recording scripts: deterministic from structured steps** | **Quality: batch impeccable**

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

Read absolute paths from `.demopilot-state`:
- `DECISIONS_JSON` = `.demopilot-state.decisions_json` (canonical: `exploration/decisions.json`) — only `approved` and `maybe` scenes are built
- `SCENE_STEPS_YAML` = `.demopilot-state.scene_steps_yaml` (canonical: `exploration/scene-steps.yaml`) — structured narration with per-scene steps (produced by pdv-explore, see A10 below)
- `VIEWPORT` = `.demopilot-state.viewport` (default `{width: 1920, height: 1080}` with a warning if missing)
- `ProjectRoot/exploration/findings.md` — confirmed coordinates per page
- `ProjectRoot/exploration/expected_content.yaml` — expected-content list keyed by `page:` (entries: `selector`, `min_count`, `content_pattern`, `description`)
- `ProjectRoot/src/theme.ts`
- `~/.claude/skills/demopilot/ref/visual-excellence.md`

Do NOT re-invoke design skills — theme.ts already encodes all design decisions from pdv-explore.
Per-scene design rules are written into per-scene briefs (see Phase 4B below).

---

## PHASE 3 — Auto-generate approved.md from decisions.json

No Opus re-draft. Parse `DECISIONS_JSON` + `storyboard/phase1-report.html` mechanically.
Extract for each approved/maybe scene: scene id, name, type (motion-graphic | recording-polish), narration text, URL, structured steps (from `SCENE_STEPS_YAML`), music preset, emotional beat, timing estimate. Write to `projects/{productname}/storyboard/approved.md`.

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

**Only now proceed to per-scene brief authoring + scene code generation.**

---

## PHASE 4A.5 — Structured Narration Schema (A10)

`pdv-explore` emits `SCENE_STEPS_YAML` (canonical: `exploration/scene-steps.yaml`) with a machine-readable steps block per scene.
**pdv-build does NOT regenerate narration text or hallucinate navigation** — recording scripts are derived directly from these steps.

Required schema (one entry per scene):

```yaml
scene_07:
  type: recording-polish            # or motion-graphic
  page: commits                     # matches expected_content.yaml page key; used in recording filename: scene-07-commits-polished.mp4
  url: /home/commits
  narration: "Navigate to commits. Expand the top commit, see the underlying prompts, then click EXPLAIN."
  steps:
    - action: navigate
      url: /home/commits
    - action: wait_stable
    - action: assert_visible
      content: ".commits-list .row"   # selector OR literal text — resolved against expected_content.yaml entries for page: commits
    - action: hover
      target: commit_row_0
      coord: [820, 340]             # from exploration/findings.md
    - action: click
      target: expand_chevron
      coord: [1680, 340]
    - action: wait_stable
    - action: assert_visible
      content: "prompts panel"
    - action: click
      target: explain_button
      coord: [950, 580]
    - action: wait
      ms: 2000
    - action: dismiss_tooltips      # mouse moves to neutral position before close
```

`assert_visible.content` is resolved against `expected_content.yaml` by looking up entries under `page:` (matching the scene's `page:` field) and matching either the entry's `selector` or `content_pattern`. There is no named-key lookup.

If `SCENE_STEPS_YAML` is missing or any recording-polish scene lacks a `steps:` block, **stop and fail with the offending scene id**. Do not attempt to author steps from narration prose — that is pdv-explore's job.

Emit `projects/{productname}/storyboard/interactions.json` (consumed by pdv-render's OpenScreen polish step for zoom timestamps):

```json
{
  "scene07": {
    "page": "commits",
    "interactions": [
      { "t": "hover", "coord": [820, 340], "frame_offset": 30 },
      { "t": "click", "coord": [1680, 340], "frame_offset": 75 },
      { "t": "click", "coord": [950, 580], "frame_offset": 165 }
    ]
  }
}
```

`frame_offset` = elapsed milliseconds from scene start ÷ (1000/30), computed from the cumulative `wait` + `wait_stable` time in the steps block.

---

## PHASE 4B — Per-Scene Design Brief + Remotion Scene Generation

**Critical change from prior versions:** Gemini does NOT receive a generic "write all scenes" prompt anymore.
For each approved scene, Claude (this skill) writes `scene-NN-brief.md` first, then invokes Gemini once per scene with that brief.

### Step 1 — Write per-scene brief (Claude)

For each scene in `approved.md`, write `projects/{productname}/scene-NN-brief.md`:

```markdown
# Scene NN — {SceneName}

**Type:** motion-graphic | recording-polish
**Duration:** {frames} frames ({seconds}s)
**Narration:** "{exact narration text}"

## Visual concept (1–2 sentences, specific to THIS narration)
{e.g. "Hero stat card emerging from below with a count-up animation, anchored by a vertical accent bar in THEME.accent. Background uses theme.bgGradient with a subtle particle drift."}

## Color usage from theme.ts
- Background: THEME.bg (#0a0a0a)
- Primary text: THEME.fg (#f5f5f5)
- Accent: THEME.accent ({hex})
- Secondary accent (if any): THEME.accent2 ({hex})
- Only these slots — no ad-hoc colors

## Layout specification
- Hero element: centered, fills {%} of frame, anchor {top|center|bottom}
- Supporting elements: {positions, sizes}
- For recording-polish: corner label position only ({corner}, max 280px wide). NO overlays on top of the recording surface.

## Animation choreography (timed visual states — satisfies visual progression rule)
For any scene > 5 seconds, list ≥3 distinct visual states with timed transitions:
- frame 0–30: state A ({describe})
- frame 30–90: transition to state B ({describe transition})
- frame 90–{end-60}: state B sustained with secondary motion ({e.g. count-up, subtle drift})
- frame {end-60}–{end}: state C ({exit cue or hold for transition})

## Anti-slop notes (specific to THIS scene)
- {e.g. "Do NOT animate the entire card in via fade. Use stagger of THEME.stagger between the icon, label, value, and unit."}
- {e.g. "Do NOT add a radial-gradient vignette."}

## components (REQUIRED — Step 1.5 installs these into the project source tree)
remotion-bits:
  - animated-text
  - type-writer        # e.g. for terminal-style reveal
  - animated-counter   # e.g. for count-up scenes
skiper:
  - skiper27           # RollingText — hero headline reveal
  - skiper90           # Skiper90 + gradient cards
# Any name listed here MUST resolve to a real registry entry. Step 1.5 fails the
# scene if `npx remotion-bits fetch <name>` or `npx shadcn add @skiper-ui/skiperNN`
# does not produce a file on disk.

## Recording integration (recording-polish scenes only)
- Recording file: staticFile('recordings/scene-NN-<slug>-polished.mp4')
- NO transform on the OffthreadVideo (no scale, no Ken Burns). The OpenScreen-polished MP4 already includes semantic zoom-to-element.
- Allowed overlay: ONE corner label (top-left or top-right), animated in once. No floating stat cards over the recording.
```

### Step 1.5 — Component install gate (runs BEFORE Gemini for each scene)

`remotion-bits` and `@skiper-ui/...` are shadcn-style installers, NOT runtime npm packages.
Components must be fetched into the project's source tree before Gemini sees them. Skip this step and Gemini hallucinates imports.

For each entry under `components.remotion-bits:` in `scene-NN-brief.md`:

```bash
cd ${ProjectRoot}
INSTALL_JSON=$(npx remotion-bits fetch <name> --json)
# JSON shape: { "name": "...", "exports": [...], "relativePath": "src/components/<File>.tsx", "source": "..." }
REL=$(echo "$INSTALL_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['relativePath'])")
SRC=$(echo "$INSTALL_JSON" | python3 -c "import json,sys;print(json.load(sys.stdin)['source'])")
mkdir -p "$(dirname "$REL")"
printf '%s' "$SRC" > "$REL"
test -s "$REL" || { echo "FAIL scene-NN install: remotion-bits/<name> did not write $REL"; exit 1; }
```

For each entry under `components.skiper:`:

```bash
cd ${ProjectRoot}
npx shadcn add @skiper-ui/<skiperNN>
# Installs into src/components/v1/<skiperNN>.tsx (project-local)
test -s src/components/v1/<skiperNN>.tsx \
  || { echo "FAIL scene-NN install: skiper/<skiperNN> did not write src/components/v1/<skiperNN>.tsx"; exit 1; }
```

Build the `INSTALLED_COMPONENTS` list for this scene by recording, per component:
- Component ID (e.g. `animated-text`, `skiper27`)
- Project-local import path (e.g. `@/components/AnimatedText`, `@/components/v1/skiper27`)
- Exported names (from the fetch JSON `exports` field, or from the Skiper spec file)
- Verified usage example (from fetch JSON for remotion-bits; from `~/.claude/skills/product-demo-video/skiper-components/<skiperNN>.md` for Skiper)

If ANY install fails, abort the scene with the failing component ID and the underlying error. Do not invoke Gemini.

Optional optimization: `npx remotion-bits mcp` starts a stdio MCP server exposing `find` and `fetch` tools. When the MCP system makes these tools available, Claude MAY call them in place of the `npx remotion-bits fetch --json` subprocess above. Same contract — produces the same `INSTALLED_COMPONENTS` records. Not required; subprocess path is the default.

### Step 2 — Invoke Gemini per scene (B1, B2, B3/D5, B4, B6, D1, D3, D4)

Run once per scene:

```bash
gemini -p "@projects/{productname}/src/theme.ts \
  @projects/{productname}/config.ts \
  @projects/{productname}/scene-NN-brief.md \
  @${SCENE_STEPS_YAML} \
  Write the Remotion v4 TSX file for the scene described in scene-NN-brief.md.

  ============================================================
  INSTALLED COMPONENTS — these are the ONLY non-Remotion-core
  components available for this scene. They were fetched into
  the project source tree by Step 1.5. Use them.
  ============================================================

  Component specs and signatures are inlined per scene from the
  Step 1.5 install output. For Skiper components, specs come from
  ~/.claude/skills/product-demo-video/skiper-components/skiperNN.md
  (104 specs available). For remotion-bits, specs come from
  \`npx remotion-bits fetch <name> --json\` (exports + verified
  usage example).

  For EACH installed component, this section shows:
    - Real import statement using project-local paths
    - Exported names (read from fetch JSON or skiper-components/*.md, not guessed)
    - Verified usage example from the spec

  Example block populated by Claude before sending this prompt:

  \`\`\`tsx
  // remotion-bits: animated-text  (installed to src/components/AnimatedText.tsx)
  import { AnimatedText } from '@/components/AnimatedText';
  // Exports: AnimatedText
  // Verified usage (from fetch --json):
  <AnimatedText
    text='Ship faster'
    split='char'                     // 'char' | 'word'
    staggerMs={THEME.stagger}
    animation='fadeUp'               // 'fadeUp' | 'fadeIn' | 'slide'
    spring={THEME.spring}
  />

  // remotion-bits: type-writer  (installed to src/components/TypeWriter.tsx)
  import { TypeWriter } from '@/components/TypeWriter';
  // Exports: TypeWriter
  <TypeWriter text='Monitoring 847 services...' cursorChar='_' speedMs={40} />

  // remotion-bits: animated-counter  (installed to src/components/AnimatedCounter.tsx)
  import { AnimatedCounter } from '@/components/AnimatedCounter';
  // Exports: AnimatedCounter
  <AnimatedCounter from={0} to={170} suffix='/day' duration={90} spring={THEME.spring} />

  // skiper: skiper27  (installed to src/components/v1/skiper27.tsx)
  import { RollingText } from '@/components/v1/skiper27';
  // Exports: RollingText  (from skiper-components/skiper27.md)
  // Verified usage (from spec):
  <RollingText text='SHIP FASTER' />

  // skiper: skiper90  (installed to src/components/v1/skiper90.tsx)
  import { Skiper90 } from '@/components/v1/skiper90';
  // Exports: Skiper90  (from skiper-components/skiper90.md)
  <Skiper90 />
  \`\`\`

  Available remotion-bits names that Claude can pull into a brief:
    animated-text, animated-counter, type-writer, matrix-rain,
    gradient-transition, staggered-motion, code-block,
    particle-system, scene-3d, scrolling-columns
  Available Skiper names (notable): skiper16 (StickyCard_001),
    skiper17 (StickyCard002), skiper27 (RollingText),
    skiper31 (text scroll), skiper90 (Skiper90 + gradient cards).
  Full list of 104 Skiper specs lives in
  ~/.claude/skills/product-demo-video/skiper-components/.

  Remotion core (always available — runtime package):
  \`\`\`tsx
  import { AbsoluteFill, Audio, OffthreadVideo, staticFile,
           useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
  \`\`\`

  IMPORT DISCIPLINE — hard rule:
  - Components NOT listed in INSTALLED COMPONENTS above are unavailable.
    If you need something else, write plain React with theme.ts colors —
    DO NOT fabricate imports from remotion-bits, skiper-ui, or any other registry.
  - NEVER write \`from 'remotion-bits'\` or \`from '@skiper-ui/...'\`. Those are
    installer names, not runtime modules. Always import from the project-local
    paths shown above (\`@/components/...\` or \`@/components/v1/...\`).

  ============================================================
  HARD RULES — no exceptions
  ============================================================

  AUDIO:
  - Every scene mounts <Audio src={staticFile('narration/scene-NN.mp3')} />.
  - NO ffmpeg audio mixing. Audio lives inside the Remotion composition.

  THEME:
  - Use THEME constants from src/theme.ts. NEVER hardcode colors, font families, or spring configs.
  - Spring: THEME.spring (always). Stagger: THEME.stagger (always).
  - No Inter font anywhere.

  REACT HOOKS (violating this causes a frame 60 crash):
  - Call ALL hooks (useCurrentFrame, useVideoConfig, spring, interpolate) at the TOP of the component, BEFORE any conditional logic.
  - NEVER place a hook call after an early return, inside an if block, or inside a loop.
  - NEVER use early returns to guard rendering — use conditional JSX (ternary or &&) AFTER all hooks are called.

  COMPOSITION:
  - Use TransitionSeries with fade() transitions between scenes (20 frames each).
  - Frame counts come from config.ts SCENE_DURATIONS — never hardcode durations.

  ============================================================
  SCENE TYPE RULES (B1, B2, B4, B6, D4)
  ============================================================

  IF scene-NN-brief.md says type = motion-graphic
  (Hook, Problem, Stats narrative, Proof, CTA):
    - Overlays, animated text, count-ups, gradient transitions, animated borders ARE encouraged.
    - Hook scene MUST include a product visual OR a strong motion graphic (Skiper027, animated chart, glyph). Pure text on a black background is BANNED — fail the scene.
    - CTA scene MUST fill >= 40% of frame and animate through >= 2 motion states (e.g. border draw + scale-in + counter or url reveal). A small centered static card is BANNED.
    - Use the Creative Arsenal pattern noted in scene-NN-brief.md (cinematic reveal / spotlight / stagger cascade / data surge).

  IF scene-NN-brief.md says type = recording-polish
  (product walkthrough using a recorded MP4):
    - The recording IS the content. The OpenScreen-polished MP4 already has cursor, click ripples, zoom-to-element, and semantic speed.
    - NO transform on the OffthreadVideo. No scale, no Ken Burns, no parallax.
        Wrong: style={{ transform: \`scale(\${1 + frame*0.0002})\` }}
        Right: style={{ objectFit: 'cover' }}
    - NO animated overlay cards over the recording surface (no floating PROMPTS/SPEND/TOKENS cards, no callout boxes covering UI).
    - NO radial-gradient vignette.
    - Allowed overlay: ONE small corner label (max 280px wide, top-left or top-right) that animates in once at scene start and stays static. Use AnimatedText for the label only.
    - Recording filename rule: OffthreadVideo src = staticFile('recordings/scene-NN-<slug>-polished.mp4') exactly as written in scene-NN-brief.md. Always reference the -polished.mp4 variant produced by pdv-render's OpenScreen polish step.

  ============================================================
  VISUAL PROGRESSION RULE (B3, D5)
  ============================================================

  For ANY scene whose duration > 5 seconds (150 frames at 30fps):
  - MUST have >= 3 distinct visual states with timed transitions, as defined in scene-NN-brief.md.
  - BANNED pattern: spring animation that completes in 15–30 frames followed by 150+ frames of static content.
  - Each visual state transition must take >= 8 frames (no instant cuts inside a scene).
  - For recording-polish scenes the 'states' may live inside the polished recording itself (cursor moves, zooms, click ripples) — but the surrounding Remotion frame still owes a corner-label or context-strip transition at the >=5s mark.

  ============================================================
  OUTPUT
  ============================================================
  Output a single complete file: src/scenes/SceneNN{Name}.tsx
  No prose, no markdown, no triple backticks around the file."
```

Copy each Gemini output to `projects/{productname}/src/scenes/SceneNN{Name}.tsx`.

### Step 3 — Batch quality gate (runs ONCE across all scenes)

```bash
cd projects/{productname}
npx impeccable detect    # anti-patterns across all src/scenes/*.tsx
npx impeccable /animate  # motion audit
npx impeccable /color    # contrast check
```

Plus the recording-polish slop guard:

```bash
# Any OffthreadVideo with a transform: scale() — B1 violation
grep -nE "OffthreadVideo[\s\S]*?transform:\s*\`?scale" projects/{productname}/src/scenes/*.tsx \
  && { echo "FAIL: OffthreadVideo with scale transform (B1)"; exit 1; }

# Any recording-polish scene with absolute-positioned non-label overlays — B2 violation
# (Reviewed manually against scene-NN-brief.md; impeccable detect flags suspicious cases.)
```

Fix any blockers in batch — issues will be systematic, not isolated.

---

## PHASE 4C — Deterministic Playwright Recording Scripts (D2, A10)

**No Sonnet hallucination.** Scripts are generated directly from `SCENE_STEPS_YAML` steps + `findings.md` coordinates + `expected_content.yaml` entries. No LLM in this path.

**Filename rule:** Raw recording output is named `scene-NN-<slug>.mp4`. pdv-render's OpenScreen polish step produces `scene-NN-<slug>-polished.mp4` (the variant the TSX references).

`VIEWPORT` is read from `.demopilot-state.viewport` (default `{width: 1920, height: 1080}` with a warning if missing) so pdv-render's OpenScreen polish step reads the same key.

For each recording-polish scene, generate `projects/{productname}/scripts/record-{scene}.ts` by mechanically translating the `steps:` block:

```typescript
import { RecordingScript } from "../../../pipeline/types";

const VIEWPORT = STATE.viewport ?? { width: 1920, height: 1080 };

export const record{SceneName}: RecordingScript = {
  id: "scene-NN",
  productName: "{ProductName}",
  url: "{url-from-steps[0]}",
  viewport: VIEWPORT,
  recordVideo: { dir: "public/recordings", size: VIEWPORT },
  steps: [
    // mechanically expanded from SCENE_STEPS_YAML scene_NN.steps
    { action: "navigate", url: "{url}" },
    { action: "wait-stable" },
    { action: "assert-visible", content: "{selector-or-text}" },  // resolved against expected_content.yaml under page: {page}
    { action: "hover-xy", x: {cx}, y: {cy} },
    { action: "wait", ms: 1200 },
    { action: "click-xy", x: {cx}, y: {cy} },
    { action: "wait-stable" },
    { action: "click-xy", x: {cx}, y: {cy} },
    { action: "wait", ms: 2000 },
    { action: "dismiss-tooltips" },     // moves mouse to (10, 10), waits 400ms
  ],
};
```

When the Playwright `newContext({ recordVideo: { size: VIEWPORT } })` call is emitted, `VIEWPORT` is the same `.demopilot-state.viewport` value — never a hardcoded literal.

### Coordinate lint (D2) — MUST pass before render

After generation, lint each script. Every `hover-xy` / `click-xy` coordinate must be present in `exploration/findings.md` for the page being recorded.

```bash
# Pseudo-code for the lint step (implement in scripts/lint-recordings.ts):
# for each record-*.ts:
#   parse url -> page_name
#   collect all (x,y) tuples from hover-xy / click-xy actions
#   load exploration/findings.md
#   extract coords listed under the page_name section
#   if any (x,y) in script is NOT in findings -> FAIL
```

Failure message must be specific, e.g.:

```
FAIL scene-07-commits: coord (1680, 340) not found in findings.md
  Available coords for /home/commits:
    commit_row_0       (820, 340)
    expand_chevron_0   (1690, 342)
    explain_button     (950, 580)
  Did you mean (1690, 342)? Fix scene-steps.yaml scene_07.steps[3].coord and re-run.
```

If the lint fails, the build stops. No `page.click('.group, [class*=match]')` CSS-class guesses are permitted — every click and hover must resolve to a confirmed coordinate from Phase 1 exploration.

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
<p style="color:#a1a1aa">Narration: {narration_strategy} · Sync check: ✅ passed · Coord lint: ✅ passed</p>

{scene cards: act name, decision badge (approved/maybe), type (motion-graphic | recording-polish), emotional beat, narration preview, brief link, measured duration, components, music preset}

<h2>Files Generated</h2>
<table>
<tr><th>Scene</th><th>Type</th><th>Brief</th><th>TSX</th><th>Recording Script</th><th>Narration</th><th>Frames</th></tr>
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
  "decisions_json": "{absolute path from prior state}",
  "scene_steps_yaml": "{absolute path from prior state}",
  "viewport": {viewport from prior state},
  "interactions_json": "storyboard/interactions.json",
  "total_frames": {total_frames},
  "total_seconds": {total_seconds},
  "notes": "{N} scenes built. Coord lint passed. Per-scene briefs in scene-*-brief.md. Ready to render."
}
```

Tell user: "Review phase2-report.html then run `/pdv-render \"{ProductName}\"`"
