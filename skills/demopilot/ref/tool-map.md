# Tool Map Reference

## remotion-bits (PRIMARY animation library)

```bash
npm install remotion-bits
```

```tsx
import { AnimatedText, Typewriter, GradientTransition, AnimatedNumber } from "remotion-bits";

// Hook — character stagger
<AnimatedText text="..." split="char" staggerMs={THEME.stagger} animation="fadeUp" spring={THEME.spring} />

// Stats — count-up
<AnimatedNumber from={0} to={170} suffix="/day" duration={90} spring={THEME.spring} />

// Typewriter
<Typewriter text="Monitoring 847 services..." cursorChar="_" speedMs={40} />

// Background gradient
<GradientTransition from="#0a0a0a" to="#111827" />
```

**Adapting Skiper (replace scroll/hover with frame):**
```tsx
const frame = useCurrentFrame();
const progress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
```

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

**Ken Burns (prevents static dead-frames):**
```tsx
const scale = 1 + useCurrentFrame() * 0.0002;
<OffthreadVideo src={...} startFrom={f(9)} style={{ transform: `scale(${scale})`, objectFit: "cover" }} />
```

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

## Gemini CLI (Phase 4A — bulk code generation)

```bash
# Write all Remotion scene components without Claude context compaction
gemini -p "@projects/PRODUCT/src/theme.ts @projects/PRODUCT/storyboard/approved.md \
  Write all 10 Remotion scene TSX files based on the approved storyboard. \
  Use THEME constants throughout. Use remotion-bits AnimatedText, Typewriter, AnimatedNumber. \
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
