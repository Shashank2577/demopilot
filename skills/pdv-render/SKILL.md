---
name: pdv-render
description: "Use as Step 4 (final step) of DemoPilot after reviewing phase2-report.html. Runs Playwright recordings, sync-checks timing, generates music, renders final video in all formats, produces phase3-report.html."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 4: Render

**Model: Haiku** (bash execution) | **Quality gate: Sonnet**

## Setup — Read State First

```bash
cat projects/{productname}/.demopilot-state
cat projects/{productname}/toolchain.json
```

If `phase_completed` is not `build`: stop — "Run `/pdv-build \"{ProductName}\"` first."
If `toolchain.json` is missing: stop — "Run `/pdv-validate \"{ProductName}\"` first."

```
ProductName  = argument
ProjectRoot  = projects/{productname}/
FFMPEG       = toolchain.json → ffmpeg
FFPROBE      = toolchain.json → ffprobe
```

Read `ProjectRoot/config.ts` — scene list and locked frame counts.

---

## STEP 1 — Auth Check

```bash
ls projects/{productname}/scripts/auth-state.json 2>/dev/null \
  && echo "auth-state.json found" \
  || echo "WARNING: auth-state.json missing — recordings will fail on auth-gated pages"
```

If missing and app requires login, stop and tell user:
"Run the browser auth setup first: open the app in Chrome, log in, then run:
`npx playwright codegen --save-storage=projects/{productname}/scripts/auth-state.json {AppURL}`"

If auth-state.json exists, **validate it is still active** — the file can be expired or invalidated by a new session without its size changing:

```bash
# Navigate to app with stored auth — check the resulting page title
# A redirect to login means the auth state is stale
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: 'projects/{productname}/scripts/auth-state.json' });
  const page = await ctx.newPage();
  await page.goto('{AppURL}', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const title = await page.title();
  const url = page.url();
  console.log('title:', title, 'url:', url);
  const isLoginPage = /sign.?in|log.?in|auth|login/i.test(title) || /sign.?in|log.?in|auth|login/i.test(url);
  if (isLoginPage) { console.error('AUTH_EXPIRED'); process.exit(1); }
  console.log('AUTH_VALID');
  await browser.close();
})();
" 2>&1
```

If output contains `AUTH_EXPIRED`, stop:
"auth-state.json is stale — re-run: `npx playwright codegen --save-storage=projects/{productname}/scripts/auth-state.json {AppURL}` then log in."

If public app (no auth required), continue.

---

## STEP 2 — Run Screen Recordings

```bash
cd projects/{productname}

# Run recordings with auth state if available
npx ts-node ../../../pipeline/bin/pipeline.ts --phase record --product "{ProductName}"

# Verify all recordings exist and have duration > 0
echo "=== RECORDING VERIFICATION ==="
for f in public/recordings/*.mp4; do
  dur=$({FFPROBE} -v quiet -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
  [ -z "$dur" ] && echo "MISSING/BROKEN: $f" || echo "OK $(basename $f): ${dur}s"
done
```

If any recording is missing or 0 bytes, stop — report which scenes failed, do not continue to render.

---

## STEP 3 — Sync Check (recordings vs narration)

**Run after recordings exist. Never skip.**

```bash
python3 - << 'EOF'
import subprocess, glob, os, sys

def dur(path):
    r = subprocess.run(
        ["{FFPROBE}","-v","quiet","-show_entries","format=duration","-of","csv=p=0",path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip()) if r.stdout.strip() else None

nar_dir  = "projects/{productname}/public/narration"
rec_dir  = "projects/{productname}/public/recordings"
mismatches = []

for nar_file in sorted(glob.glob(f"{nar_dir}/scene*.mp3")):
    scene_id = os.path.basename(nar_file).replace(".mp3","")
    recs = glob.glob(f"{rec_dir}/{scene_id}*.mp4")
    if not recs:
        continue  # motion-graphic scene — no recording expected

    nar_s = dur(nar_file)
    rec_s = dur(recs[0])
    if nar_s and rec_s and rec_s < nar_s - 0.5:  # 0.5s tolerance
        mismatches.append((scene_id, rec_s, nar_s, nar_s - rec_s))
        print(f"MISMATCH {scene_id}: recording {rec_s:.1f}s < narration {nar_s:.1f}s (shortfall {nar_s-rec_s:.1f}s)")
    else:
        print(f"OK       {scene_id}: {rec_s:.1f}s rec >= {nar_s:.1f}s nar")

if mismatches:
    print(f"\n{len(mismatches)} mismatch(es). Fix options per scene:")
    for sid, r, n, diff in mismatches:
        print(f"  {sid}: extend recording by {diff:.1f}s (slow-motion or loop last frame) OR trim narration")
    sys.exit(1)
else:
    print("\nSync check passed.")
    sys.exit(0)
EOF
```

If exit code 1: show table, ask user which resolution to apply per scene, then re-record or re-generate narration. Never render with known mismatches.

---

## STEP 4 — Generate Music

Read `config.ts` for actual total frame count. Never hardcode durations.

```bash
mkdir -p projects/{productname}/public/music

# Compute total video duration from config.ts TOTAL_FRAMES
TOTAL_S=$(python3 -c "
import re
d = open('projects/{productname}/config.ts').read()
m = re.search(r'TOTAL_FRAMES\s*=\s*(\d+)', d)
frames = int(m.group(1)) if m else sum(int(x) for x in re.findall(r':\s*(\d+)', d) if 100 < int(x) < 3000)
print(frames // 30 + 10)
")

echo "Generating ${TOTAL_S}s ambient music track..."

{FFMPEG} -f lavfi -i "sine=frequency=55:duration=${TOTAL_S}" \
  -f lavfi -i "sine=frequency=82:duration=${TOTAL_S}" \
  -filter_complex "[0]volume=0.08,aecho=0.6:0.4:800:0.3[a];[1]volume=0.05[b];[a][b]amix=inputs=2,lowpass=f=400[out]" \
  -map "[out]" -ar 44100 -ac 2 projects/{productname}/public/music/bg.mp3 -y

echo "Music generated: projects/{productname}/public/music/bg.mp3 (${TOTAL_S}s)"
```

In Remotion Root.tsx use `<Audio src={staticFile('music/bg.mp3')} volume={0.06} />` — keeps music under narration.

---

## STEP 5 — Skip Narration (already done in pdv-build)

```bash
# Verify narration exists — do NOT regenerate
missing=0
for f in projects/{productname}/public/narration/scene*.mp3; do
  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  [ "$size" -lt 1000 ] && echo "WARNING: $f too small ($size bytes)" && missing=$((missing+1))
done
[ "$missing" -gt 0 ] && echo "Re-run /pdv-build to regenerate narration" && exit 1
echo "Narration: all files present"
```

---

## STEP 6 — Quality Gate

**Switch to Sonnet.**

```bash
cd projects/{productname}
npx impeccable detect
npx impeccable /animate
npx impeccable /color
```

Review output. Fix any blockers. Switch back to Haiku for render.

---

## STEP 7 — Render

```bash
cd projects/{productname}

# 16:9 main
npx remotion render src/index.ts MainVideo output/demo.mp4 \
  --codec h264 --crf 18 --scale 1 --log verbose

# 9:16 vertical
npx remotion render src/index.ts MainVideo output/demo-9x16.mp4 \
  --width 1080 --height 1920 --codec h264

# GIF preview (first 8s)
{FFMPEG} -i output/demo.mp4 -t 8 \
  -vf "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  output/demo-preview.gif -y
```

Verify output:
```bash
{FFPROBE} -v quiet -show_entries format=duration,size -of csv=p=0 output/demo.mp4
```

If render fails, check `--log verbose` output for the first error line. Common causes in `common-mistakes.md`.

---

## STEP 8 — phase3-report.html

Write `projects/{productname}/output/phase3-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Output — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
.ok{color:#22c55e}.warn{color:#f59e0b}.fail{color:#ef4444}
.downloads{display:flex;gap:12px;margin:24px 0;flex-wrap:wrap}
.btn{background:#18181b;border:1px solid #333;padding:10px 20px;border-radius:6px;color:#f5f5f5;text-decoration:none;font-size:14px}
video{width:100%;border-radius:8px;margin:16px 0;max-height:500px}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #222;font-size:13px}
th{color:#a1a1aa;font-weight:500}
.badge{padding:2px 8px;border-radius:4px;font-size:12px}
</style></head><body>
<h1>DemoPilot Output — {ProductName}</h1>
<p style="color:#71717a">{timestamp} · {total_s}s · {scene_count} scenes</p>

<video controls src="demo.mp4"></video>

<div class="downloads">
  <a class="btn" href="demo.mp4">⬇ 16:9 MP4</a>
  <a class="btn" href="demo-9x16.mp4">⬇ 9:16 MP4</a>
  <a class="btn" href="demo-preview.gif">⬇ GIF Preview</a>
</div>

<h2>Sync Check</h2>
<table>
<tr><th>Scene</th><th>Narration</th><th>Recording</th><th>Status</th></tr>
{sync rows — one per recording scene}
</table>

<h2>Scene Timing</h2>
<table>
<tr><th>Scene</th><th>Frames</th><th>Duration</th><th>Music</th><th>Type</th></tr>
{timing rows from config.ts}
</table>

</body></html>
```

Write state file `projects/{productname}/.demopilot-state`:
```json
{
  "product": "{ProductName}",
  "phase_completed": "render",
  "next_command": null,
  "output_mp4": "output/demo.mp4",
  "output_vertical": "output/demo-9x16.mp4",
  "output_gif": "output/demo-preview.gif",
  "notes": "Render complete. {total_s}s video at output/demo.mp4"
}
```

Tell user: "Your demo is ready. Open `projects/{productname}/output/phase3-report.html` to preview and download."
