---
name: pdv-render
description: "Use as Step 4 (final step) of DemoPilot after reviewing phase2-report.html. Generates narration audio, per-scene music, runs recordings, renders the final video, exports all formats, and produces a quality report. Always the last command in the pipeline."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 4: Render

**Bash execution: Haiku** | **Quality review pass: Sonnet**

## Setup

```
ProductName = argument (e.g. "OBSERVE")
ProjectRoot = "projects/{productname}/"
Read: ProjectRoot/storyboard/approved.md   (narration texts)
Read: ProjectRoot/config.ts               (scene list)
```

---

## PHASE 4C — Generate Narration

**Try Voicebox first. Fall back to Qwen3-TTS, then edge-tts.**

```bash
# Check which TTS is available
if curl -s --max-time 2 http://127.0.0.1:17493/profiles > /dev/null 2>&1; then
  TTS_ENGINE="voicebox"
elif python3 -c "import qwen_tts" 2>/dev/null; then
  TTS_ENGINE="qwen3"
else
  TTS_ENGINE="edge-tts"
fi
echo "Using: $TTS_ENGINE"
```

For each scene in the storyboard, generate narration:

**Voicebox:**
```bash
gen_id=$(curl -s -X POST http://127.0.0.1:17493/generate \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"{NARRATION_TEXT}\",\"profile_id\":\"{PROFILE_UUID}\",\"engine\":\"kokoro\"}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
VOICEBOX_DIR="$HOME/Library/Application Support/sh.voicebox.app/generations"
for i in $(seq 1 30); do
  [ -f "$VOICEBOX_DIR/${gen_id}.wav" ] && cp "$VOICEBOX_DIR/${gen_id}.wav" {ProjectRoot}/public/narration/{scene}.wav && break
  sleep 1
done
```

**Qwen3-TTS fallback:**
```bash
python3 -m qwen_tts "{NARRATION_TEXT}" --speaker Chelsie \
  --instruct "Calm confidence. Slower on numbers and key terms." \
  --output {ProjectRoot}/public/narration/{scene}.wav
```

**edge-tts fallback:**
```bash
edge-tts --voice en-US-AriaNeural --text "{NARRATION_TEXT}" \
  --write-media {ProjectRoot}/public/narration/{scene}.wav
```

**CRITICAL — verify every WAV duration:**
```bash
for f in {ProjectRoot}/public/narration/*.wav; do
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  frames=$(python3 -c "import math; print(math.ceil($dur * 30) + 45)")
  echo "$(basename $f): ${dur}s → min ${frames} frames"
done
```

Update `durationInFrames` in each scene component to match actual WAV duration. Never use target duration.

---

## PHASE 4D — Generate Music

```bash
if command -v acemusic &>/dev/null; then
  acemusic generate --preset tension      --duration 20  --output {ProjectRoot}/public/music/01-hook.mp3
  acemusic generate --preset tension      --duration 30  --output {ProjectRoot}/public/music/02-problem.mp3
  acemusic generate --preset hopeful      --duration 120 --output {ProjectRoot}/public/music/04-tour.mp3
  acemusic generate --preset corporate-bg --duration 20  --output {ProjectRoot}/public/music/06-stats.mp3
  acemusic generate --preset cta          --duration 10  --output {ProjectRoot}/public/music/08-cta.mp3
else
  # ffmpeg fallback — no API needed
  ffmpeg -f lavfi -i "sine=frequency=55:duration=300" -f lavfi -i "sine=frequency=82:duration=300" \
    -filter_complex "[0]volume=0.08,aecho=0.6:0.4:800:0.3[a];[1]volume=0.05[b];[a][b]amix=inputs=2,lowpass=f=400[out]" \
    -map "[out]" -ar 44100 -ac 2 {ProjectRoot}/public/music/bg.mp3 -y
fi
```

---

## PHASE 4B — Run Screen Recordings

```bash
cd {ProjectRoot}

# Record each scene
npx ts-node ../../../pipeline/bin/pipeline.ts --phase record --product "{ProductName}"

# Process (crop, compress)
npx ts-node ../../../pipeline/bin/pipeline.ts --phase process --product "{ProductName}"

# Verify recordings exist + have duration
for f in public/recordings/*.mp4; do
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  echo "$(basename $f): ${dur}s"
done
```

---

## PHASE 5 — Quality Gate + Render

**Switch to Sonnet for quality gate review.**

```bash
cd {ProjectRoot}

# Quality gate
npx impeccable detect       # fail if anti-patterns found
npx impeccable /animate     # motion audit
npx impeccable /color       # contrast check
```

Review impeccable output. Fix any blockers before rendering.

**Render:**
```bash
# 16:9 main
npx remotion render src/index.ts VideoComposition {ProjectRoot}/output/demo.mp4 \
  --codec h264 --crf 18 --scale 1 --log verbose

# 9:16 vertical (social)
npx remotion render src/index.ts VideoComposition {ProjectRoot}/output/demo-9x16.mp4 \
  --width 1080 --height 1920 --codec h264

# GIF preview (first 8s)
ffmpeg -i {ProjectRoot}/output/demo.mp4 -t 8 \
  -vf "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  {ProjectRoot}/output/demo-preview.gif -y
```

---

## Output: phase3-report.html

Write `projects/{productname}/output/phase3-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Output — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
.ok{color:#22c55e}.warn{color:#f59e0b}.fail{color:#ef4444}
.downloads{display:flex;gap:12px;margin:24px 0}
.btn{background:#18181b;border:1px solid #333;padding:10px 20px;border-radius:6px;color:#f5f5f5;text-decoration:none;font-size:14px}
video{width:100%;border-radius:8px;margin:16px 0}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #222;font-size:13px}
</style></head><body>

<h1>DemoPilot Output — {ProductName}</h1>

<video controls src="demo.mp4"></video>

<div class="downloads">
  <a class="btn" href="demo.mp4">Download 16:9 MP4</a>
  <a class="btn" href="demo-9x16.mp4">Download 9:16 MP4</a>
  <a class="btn" href="demo-preview.gif">Download GIF</a>
</div>

<h2>Quality Gate</h2>
<p class="{statusClass}">{impeccable summary}</p>

<h2>Scene Timing</h2>
<table>
<tr><th>Scene</th><th>Target</th><th>Actual WAV</th><th>Frames</th><th>Status</th></tr>
{timing rows}
</table>

</body></html>
```

**Final message to user:**
"Your demo is ready. Open `projects/{ProductName}/output/phase3-report.html` to preview and download all formats."
