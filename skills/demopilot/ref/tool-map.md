# Tool Map Reference

## remotion-bits (PRIMARY animation library — shadcn-style installer)

`remotion-bits` is NPM-installed but exposes a **CLI**, not runtime imports. The
actual runtime components are FETCHED via the CLI and copied into the consuming
project. NEVER `import { ... } from "remotion-bits"` — that import does not
resolve at runtime.

### Install the CLI

```bash
npm install remotion-bits
```

### CLI commands (verified via `--help`)

```
remotion-bits find [query] [--query <text>] [--tag <tag>] [--limit <number>] [--json]
remotion-bits fetch <id-or-name> [--json]
remotion-bits mcp     # starts Remotion Bits MCP server on stdio
```

The MCP server mode exposes `find` / `fetch` over MCP — pdv-build can use this
to search and fetch components on demand during scene generation.

### Registry

62 items total. Default install paths (from `registry.json`):
- components → `src/components/`
- utilities  → `src/utils/`
- hooks      → `src/hooks/`
- bits (examples) → `src/compositions/` (or docs path)

Component IDs are kebab-case; files land in PascalCase. Sample catalog:

| id (kebab) | file path |
|------------|-----------|
| `animated-text` | `src/components/AnimatedText.tsx` |
| `animated-counter` | `src/components/AnimatedCounter.tsx` |
| `type-writer` | `src/components/TypeWriter.tsx` |
| `matrix-rain` | `src/components/MatrixRain.tsx` |
| `gradient-transition` | `src/components/GradientTransition.tsx` |
| `staggered-motion` | `src/components/StaggeredMotion.tsx` |
| `code-block` | `src/components/CodeBlock.tsx` |
| `particle-system` | `src/components/ParticleSystem/Particles.tsx` |
| `scene-3d` | `src/components/Scene3D/Scene3D.tsx` |
| `scrolling-columns` | `src/components/ScrollingImages.tsx` |

The PascalCase export names are NOT predictable from the kebab id — discover
them per-component via `fetch` (the returned source contains the actual
`export` statement). Do not guess.

### Usage recipe (per component, per scene)

```bash
cd projects/PRODUCT

# 1. Discover/confirm the component
npx remotion-bits find "typewriter" --json

# 2. Fetch its source (returns JSON with file path + source code)
npx remotion-bits fetch animated-text --json

# 3. Write the returned source to its registry-declared path
#    (e.g. src/components/AnimatedText.tsx)

# 4. Import locally
```

```tsx
import { AnimatedText } from "@/components/AnimatedText";
// Props/signature: read from the fetched source — do not guess
```

### Adapting external animation patterns to Remotion frames

Replace scroll/hover triggers with `useCurrentFrame()`:

```tsx
const frame = useCurrentFrame();
const progress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
```

## Skiper UI components (shadcn-compatible registry)

Skiper is a **shadcn-compatible component registry**. 104 component specs are
cataloged on disk:

```
/Users/shashanksaxena/.claude/skills/product-demo-video/skiper-components/skiper001.md
…
/Users/shashanksaxena/.claude/skills/product-demo-video/skiper-components/skiper104.md
```

Each `.md` spec contains: title, URL (`https://skiper-ui.com/v1/skiperNN`),
install command, import statement, signature, usage example. The `.md` does
NOT contain the component source — that comes from running `shadcn add`.

Export names are NOT predictable from the number — read the `.md` per component.
Verified examples:

| spec | export(s) | purpose |
|------|-----------|---------|
| `skiper16.md` | `StickyCard_001` | card stack scroll |
| `skiper17.md` | `StickyCard002`  | card stack with gsap |
| `skiper27.md` | `RollingText`    | rolling text animation |
| `skiper31.md` | `Skiper31Demo`   | text scroll animation |
| `skiper90.md` | `Skiper90`, `SkiperGradiantCard`, `GradiantCardBody`, `GradiantCardTitle` | gradient hover cards |

### Usage recipe (per component, per scene)

```bash
cd projects/PRODUCT

# 1. Read the spec
cat ~/.claude/skills/product-demo-video/skiper-components/skiper27.md

# 2. Install via shadcn (writes to src/components/v1/skiper27.tsx)
npx shadcn add @skiper-ui/skiper27
```

```tsx
import { RollingText } from "@/components/v1/skiper27";
// Props/signature: read from skiper27.md
```

### Pre-install gate (pdv-build responsibility)

Each Skiper component MUST be installed via shadcn before any TSX can import it.
pdv-build must:
1. Decide per scene which Skipers are needed (from the per-scene brief).
2. Run `npx shadcn add @skiper-ui/skiperNN` for each — in the project root.
3. Feed the corresponding `.md` spec contents into the Gemini prompt alongside
   the scene brief, so Gemini sees the real import + signature + example.

Generic "use Skiper" instructions to Gemini WITHOUT inlining the `.md` spec for
the selected component → Gemini falls back to plain `<div>` + inline styles.

Canonical specs location: `/Users/shashanksaxena/.claude/skills/product-demo-video/skiper-components/`.
The empty `skills/demopilot/ref/skiper-components/` directory in this repo
should be deleted (the path above is the source of truth).

Skiper URL pattern (for reference / browsing only):
`https://skiper-ui.com/v1/skiperN` (NO zero-padding: `/v1/skiper6` not `/v1/skiper006`).

## Remotion

**TransitionSeries (always use this):**
```tsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
// CRITICAL: @remotion/transitions version must exactly match remotion version

<AbsoluteFill>
  <Audio src={staticFile("music/bg.mp3")} volume={0.06} />
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={durationInFrames}>
      <SceneHook />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 20 })} />
    <TransitionSeries.Sequence durationInFrames={nextDuration}>
      <SceneProblem />
    </TransitionSeries.Sequence>
  </TransitionSeries>
</AbsoluteFill>
```

**Sequence duration rule:**
```bash
# ALWAYS verify actual WAV duration — never use assumed target
dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 public/narration/SCENE.wav)
frames=$(python3 -c "import math; print(math.ceil($dur * 30) + 45)")
# Use $frames as durationInFrames minimum
```

**OffthreadVideo (recording scenes):** NO `transform: scale(...)`. The MP4 has
been pre-polished by OpenScreen (see next section) with semantic zooms driven
by cursor coordinates. Layering a Remotion Ken Burns on top produces the
"screenshot zoom" slop look (see `visual-excellence.md` → "Scene Type Rules").

```tsx
<OffthreadVideo
  src={staticFile("recordings/scene04-commits-polished.mp4")}
  startFrom={f(0)}
  style={{ objectFit: "cover", width: "100%", height: "100%" }}
/>
```

Apply Ken Burns / scale interpolation **only** on motion-graphic scenes that
contain a still image and no other motion (rare — most motion graphics already
have animated content).

**Animated Callout Circles (Wow Moment):**
```tsx
const ring = spring({ frame: frame - 20, fps, config: THEME.spring });
<div style={{ position: "absolute", left: X-30, top: Y-30, width: 60, height: 60,
  borderRadius: "50%", border: `2px solid ${THEME.accent}`,
  opacity: interpolate(ring, [0,1], [0.8,0]),
  transform: `scale(${interpolate(ring, [0,1], [1,2])})` }} />
```
Replace X,Y with confirmed pixel coordinates from Phase 1 WebBridge evaluate.

## Music Generation

ACE-Step (`acestep`) is a Gradio web UI — it has no CLI generation flags. Always use the ffmpeg fallback.

**Music (ffmpeg — always used):**
```bash
# Generate ambient background track for full video duration
TOTAL_S=180  # replace with actual total from config.ts
ffmpeg -f lavfi -i "sine=frequency=55:duration=${TOTAL_S}" -f lavfi -i "sine=frequency=82:duration=${TOTAL_S}" \
  -filter_complex "[0]volume=0.08,aecho=0.6:0.4:800:0.3[a];[1]volume=0.05[b];[a][b]amix=inputs=2,lowpass=f=400[out]" \
  -map "[out]" -ar 44100 -ac 2 projects/PRODUCT/public/music/bg.mp3 -y
```

Use `volume={0.06}` on the `<Audio>` component in Remotion to keep music under narration.

## Voicebox (primary narration)

```bash
curl -s http://127.0.0.1:17493/profiles | python3 -m json.tool  # list profiles

gen_id=$(curl -s -X POST http://127.0.0.1:17493/generate \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"TEXT\",\"profile_id\":\"UUID\",\"engine\":\"kokoro\"}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")

VOICEBOX_DIR="$HOME/Library/Application Support/sh.voicebox.app/generations"
for i in $(seq 1 30); do
  [ -f "$VOICEBOX_DIR/${gen_id}.wav" ] && cp "$VOICEBOX_DIR/${gen_id}.wav" projects/PRODUCT/public/narration/SCENE.wav && break
  sleep 1
done
```

**Fallback 1 — Qwen3-TTS:**
```bash
python3 -m qwen_tts "TEXT" --speaker Chelsie \
  --instruct "Calm confidence, slower on numbers." \
  --output projects/PRODUCT/public/narration/SCENE.wav
```

**Fallback 2 — edge-tts (offline):**
```bash
edge-tts --voice en-US-AriaNeural --text "TEXT" --write-media projects/PRODUCT/public/narration/SCENE.wav
```

**Narration rules:**
- NEVER use `...` ellipsis — TTS vocalizes it. Use `<break time="0.5s"/>` or paragraph breaks
- 8–12 words per second of target audio
- Use specific numbers: "forty percent," "one hundred and seventy dollars"
- Em-dashes for natural pauses

## WebBridge (Phase 1 exploration only)

```bash
~/.kimi-webbridge/bin/kimi-webbridge status   # health check

# Navigate
curl -s -X POST http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d '{"action":"navigate","args":{"url":"URL"},"session":"explore"}'

# Get confirmed element coordinates
curl -s -X POST http://127.0.0.1:10086/command \
  -d '{"action":"evaluate","args":{"code":"JSON.stringify([...document.querySelectorAll(\".recharts-wrapper\")].map((el,i)=>{const r=el.getBoundingClientRect();return{i,cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2)}}))"},"session":"explore"}'
```

## Playwright + TimelineRecorder

**TimelineRecorder** (eliminates startFrom guessing):
```typescript
export class TimelineRecorder {
  private start = Date.now();
  private marks: { label: string; elapsed: number }[] = [];
  mark(label: string) { this.marks.push({ label, elapsed: (Date.now()-this.start)/1000 }); }
  startFromFrames(label: string, fps=30): number {
    const m = this.marks.find(m=>m.label===label);
    return m ? Math.ceil(m.elapsed*fps) : 0;
  }
}
```

**CRITICAL:** `:nth-of-type` only works for HTML tag names, NOT class names.  
Modern React apps have no `<tbody><tr>` — use `hover-xy` with WebBridge-confirmed coordinates.

```typescript
// Correct for recharts / virtual scroll / SVG
{ action: 'hover-xy', x: 1137, y: 536 }   // confirmed via WebBridge evaluate

// Correct for real table rows
{ action: 'hover-nth', selector: 'tbody tr', index: 0 }

// Correct for component-based rows
{ action: 'click-nth', selector: '.group.grid', index: 0 }
```

## OpenScreen CLI (post-recording polish)

`cli-anything-openscreen` v1.0.0 — turns a raw Playwright screen capture into a
polished MP4 with cursor-position semantic zooms, speed ramps, and annotations.
Eliminates the need for Remotion Ken Burns on recording scenes
(see `visual-excellence.md` → "Scene Type Rules").

### Install

```bash
uv tool install cli-anything-openscreen
# binary then available as: cli-anything-openscreen
```

### Verified subcommands

```
cli-anything-openscreen project new -v <video> -o <project_file>
cli-anything-openscreen --project <project_file> zoom add \
    --start <ms> --end <ms> --focus-x <0-1> --focus-y <0-1> --depth 1-6
cli-anything-openscreen --project <project_file> speed add \
    --start <ms> --end <ms> --multiplier <float>
cli-anything-openscreen --project <project_file> annotation add-text ...
cli-anything-openscreen --project <project_file> export render <output.mp4>
```

`--focus-x` and `--focus-y` are normalized 0–1 (divide pixel coordinates by
frame width/height). `--depth` 1–6 controls zoom intensity (4 is a good default
for click targets).

### Recipe — polish a Playwright recording with semantic zooms

Inputs:
- `raw.mp4` — the Playwright capture
- `interactions.json` — list of `{ t_ms, x_px, y_px, kind: "click" | "hover" }`
  emitted by the recording script (resolution assumed 1920×1080)

Steps:

```bash
# 1. Create project from raw video
cli-anything-openscreen project new -v raw.mp4 -o scene.openscreen

# 2. For each click at (x_px, y_px) at time t_ms — zoom in 400ms before, hold 1.5s after
#    focus_x = x_px / 1920, focus_y = y_px / 1080
cli-anything-openscreen --project scene.openscreen zoom add \
    --start $((t_ms - 400)) --end $((t_ms + 1500)) \
    --focus-x 0.59 --focus-y 0.50 --depth 4

# 3. For any quiet stretch > 2s with no interaction, speed it up
cli-anything-openscreen --project scene.openscreen speed add \
    --start <quiet_start_ms> --end <quiet_end_ms> --multiplier 1.8

# 4. Render the polished MP4
cli-anything-openscreen --project scene.openscreen export render scene-polished.mp4
```

Output: `scene-polished.mp4`. Reference this file (NOT `raw.mp4`) from the
Remotion `<OffthreadVideo>` for the corresponding recording scene.

## Gemini CLI (Phase 4A — bulk code generation)

Before invoking Gemini, pdv-build must:
1. Read the per-scene brief to decide which remotion-bits + Skiper components are
   needed for each scene.
2. `npx remotion-bits fetch <id> --json` each remotion-bits component and write
   its source into the project at the registry-declared path
   (e.g. `src/components/AnimatedText.tsx`).
3. `npx shadcn add @skiper-ui/skiperNN` each Skiper component selected.
4. Concatenate the chosen Skiper `.md` specs (from
   `~/.claude/skills/product-demo-video/skiper-components/`) plus the fetched
   remotion-bits source export signatures into a `components-inventory.md`
   under the project.

Gemini then receives the inventory file and is told to import from local
project paths, NOT from `remotion-bits` or `@skiper-ui/...`:

```bash
gemini -p "@projects/PRODUCT/src/theme.ts @projects/PRODUCT/storyboard/approved.md \
  @projects/PRODUCT/components-inventory.md \
  Write all 10 Remotion scene TSX files based on the approved storyboard. \
  Use THEME constants throughout. \
  Import remotion-bits components from local project paths (e.g. \
  import { AnimatedText } from '@/components/AnimatedText'), NEVER from the \
  'remotion-bits' package. \
  Import Skiper components from their installed shadcn path (e.g. \
  import { RollingText } from '@/components/v1/skiper27'), NEVER from \
  '@skiper-ui/...'. \
  Use ONLY the imports, exports, and signatures present in components-inventory.md \
  — do not invent props. \
  Output each file as a complete standalone component."
```

Use Gemini for anything requiring all scene files simultaneously — its 1M context prevents the compaction that corrupts earlier scenes.

## toolchain.json (written by /pdv-validate)

Written to `projects/{productname}/toolchain.json` after validation.
Every phase reads this — never assume tool paths.

```json
{
  "product": "{ProductName}",
  "validated_at": "{ISO timestamp}",
  "node": "/opt/homebrew/bin/node",
  "python3": "/opt/homebrew/opt/python@3.14/bin/python3.14",
  "edge_tts_python": "~/.local/share/uv/tools/edge-tts/bin/python3",
  "ffmpeg": "/opt/homebrew/bin/ffmpeg",
  "ffprobe": "/opt/homebrew/bin/ffprobe",
  "playwright": "npx playwright",
  "voicebox_url": "http://127.0.0.1:17493",
  "webbridge_url": "http://127.0.0.1:10086",
  "gemini": "/opt/homebrew/bin/gemini",
  "narration_strategy": "voicebox|edge-tts|none"
}
```

`narration_strategy` = `voicebox` if voicebox_url responds, `edge-tts` if edge_tts_python found, `none` otherwise.

## .demopilot-state (session handoff file)

Written at the end of every phase to `projects/{productname}/.demopilot-state`.
First action of every skill: read this file to confirm state and avoid re-doing work.

```json
{
  "product": "{ProductName}",
  "phase_completed": "validate|explore|storyboard|build|render",
  "next_command": "/pdv-xxx \"{ProductName}\"",
  "toolchain_json": "toolchain.json",
  "decisions_json": "storyboard/decisions.json",
  "notes": "human-readable summary of current state"
}
```

## tldraw (Phase 1 — app map output)

Self-contained HTML file. Loaded from CDN — no install.

```html
<script type="module">
  import { Tldraw, createTLStore, defaultShapeUtils } from 'https://esm.sh/@tldraw/tldraw@2';
  import { createRoot } from 'https://esm.sh/react-dom@18/client';
  import React from 'https://esm.sh/react@18';

  const store = createTLStore({ shapeUtils: defaultShapeUtils });
  store.loadSnapshot(SNAPSHOT);  // SNAPSHOT = tldraw scene JSON built from findings.md
  createRoot(document.getElementById('root')).render(
    React.createElement(Tldraw, { store, onMount: e => e.zoomToFit() })
  );
</script>
```

Card layout: 280×320px per page, 20px gap, sections in 2×N grid from findings.md nav order.
Arrow shapes for confirmed page relationships.

## Reveal.js (Phase 2 — storyboard approval)

Self-contained HTML, loaded from CDN — no install.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
<script>Reveal.initialize({ hash: true, transition: 'slide' });</script>
```

Decisions written on button click to `localStorage` AND POSTed to local file-write server at port 19876.
File-write server (5-line Python, started by agent):
```bash
python3 -c "
import http.server, json, os
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers['Content-Length']); d=json.loads(self.rfile.read(n))
        os.makedirs(os.path.dirname(d['path']),exist_ok=True)
        open(d['path'],'w').write(d['content'])
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self,*a): pass
http.server.HTTPServer(('127.0.0.1',19876),H).serve_forever()
" &
