---
name: pdv-render
description: "Use as Step 4 (final step) of DemoPilot after reviewing phase2-report.html. Runs Playwright recordings (strict, content-gated), OpenScreen polish, sync check, music, Remotion render with frame preview. Produces phase3-report.html."
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
AUTH_STATE   = .demopilot-state → auth_state_path  (set by pdv-explore)
```

Read `ProjectRoot/config.ts` — scene list and locked frame counts.
Read `ProjectRoot/exploration/findings.md` — `expected_content` blocks per page (schema set by pdv-explore).

---

## STEP 0 — OpenScreen CLI Check

```bash
command -v cli-anything-openscreen >/dev/null || {
  echo "FATAL: cli-anything-openscreen not on PATH."
  echo "Install with:  uv tool install cli-anything-openscreen"
  echo "Then verify:   cli-anything-openscreen --version  (expect 1.0.0)"
  exit 1
}
cli-anything-openscreen --version
```

No silent fallback to raw recordings. The polish step is mandatory.

---

## STEP 1 — Auth Check (reuse pdv-explore auth state)

```bash
AUTH=$(python3 -c "import json; print(json.load(open('projects/{productname}/.demopilot-state'))['auth_state_path'])")
ls "$AUTH" 2>/dev/null && echo "auth-state.json found at $AUTH" || {
  echo "FATAL: auth-state.json missing. pdv-explore is responsible for producing it."
  echo "Re-run /pdv-explore \"{ProductName}\" — do not regenerate auth here."
  exit 1
}
```

Validate it is still active — file size does not prove session validity:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: process.env.AUTH });
  const page = await ctx.newPage();
  await page.goto(process.env.APP_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const title = await page.title();
  const url = page.url();
  console.log('title:', title, 'url:', url);
  if (/sign.?in|log.?in|auth|login/i.test(title) || /sign.?in|log.?in|auth|login/i.test(url)) {
    console.error('AUTH_EXPIRED'); process.exit(1);
  }
  console.log('AUTH_VALID');
  await browser.close();
})();
" 2>&1
```

If `AUTH_EXPIRED`: stop and tell user to re-run `/pdv-explore "{ProductName}"`. Do not regenerate auth in pdv-render.

---

## STEP 2 — A2 Account/Data Continuity Pre-Flight

Before any recording starts: visit every page that will be recorded with the auth-state, screenshot it, and run the same content-gate (A1) check against `exploration/findings.md`. Abort if the recording account is missing data the explorer saw.

```bash
node projects/{productname}/scripts/preflight-content-gate.js
```

`preflight-content-gate.js` must:

1. Load `exploration/findings.md`, parse every `expected_content:` YAML block keyed by `page:`.
2. For each page: open with stored auth, screenshot to `preflight/<page-slug>.png`, run the content-gate (Step 3).
3. On any failure, exit 1 and print:

```
Recording account is missing data. Seed it or switch account. Pages affected:
  - /home/commits (expected ≥3 commits, found 0)
  - /home/stats (expected match_rate \d+%, found "0%")
```

Pipeline halts on non-zero exit. No fix-forward.

---

## STEP 3 — A1 Content Gate (per scene, runs inside recording script)

Every recording script imports `assertExpectedContent(page, pageKey)` from `scripts/lib/content-gate.ts`. It reads the `expected_content` block for `pageKey` from `exploration/findings.md` and for each entry:

```ts
// Schema (from pdv-explore findings.md):
// page: /home/commits
// expected_content:
//   - selector: "tr[data-commit-id]"
//     min_count: 3
//   - selector: "[data-role='match-rate']"
//     content_pattern: "\\d+%"

const els = page.locator(entry.selector);
const n = await els.count();
if (n < (entry.min_count ?? 1)) {
  throw new Error(
    `CONTENT_GATE_FAIL page=${pageKey} selector=${entry.selector} expected>=${entry.min_count ?? 1} found=${n}`
  );
}
if (entry.content_pattern) {
  const text = (await els.first().textContent()) ?? "";
  if (!new RegExp(entry.content_pattern).test(text)) {
    throw new Error(
      `CONTENT_GATE_FAIL page=${pageKey} selector=${entry.selector} pattern=${entry.content_pattern} text="${text}"`
    );
  }
}
```

Called immediately after `waitForStableContent` (Step 4) and before any interaction in the script. A failure aborts the recording with the page + selector named.

---

## STEP 4 — A5 Loading-State Detection

`scripts/lib/wait-stable.ts` exports `waitForStableContent(page, opts?)`. Poll every 200ms, max 10s, until ALL conditions hold:

```ts
export async function waitForStableContent(
  page: Page,
  opts: { timeoutMs?: number } = {}
) {
  const deadline = Date.now() + (opts.timeoutMs ?? 10_000);
  while (Date.now() < deadline) {
    const stable = await page.evaluate(() => {
      const bodyText = document.body.innerText || "";
      if (/loading|please wait|fetching/i.test(bodyText)) return false;

      if (document.querySelector('[aria-busy="true"]')) return false;

      const skeletons = document.querySelectorAll(
        "[class*='skeleton'], [class*='placeholder-shimmer'], [class*='Skeleton'], [data-skeleton]"
      );
      for (const el of skeletons) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return false;
      }

      const spinners = document.querySelectorAll(
        "[class*='spinner'], [class*='Spinner'], svg[class*='spin'], [role='progressbar']"
      );
      for (const el of spinners) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return false;
      }
      return true;
    });
    if (stable) return;
    await page.waitForTimeout(200);
  }
  throw new Error("WAIT_STABLE_TIMEOUT: loading indicators still visible after 10s");
}
```

Call after every navigation and after every click that triggers async data. No exceptions.

---

## STEP 5 — Recording Script Template (strict mode)

Every per-scene script `scripts/record-scene-NN-<slug>.ts` follows this template. **No silent guards. No `if (count > 0)` checks.** Locators that miss throw.

```ts
import { chromium, Page } from "playwright";
import { assertExpectedContent } from "./lib/content-gate";
import { waitForStableContent } from "./lib/wait-stable";
import { writeFileSync, renameSync, existsSync } from "fs";
import * as path from "path";

const SCENE_ID = "scene-NN";
const SLUG = "<slug>";
const PAGE_KEY = "/home/commits";  // matches findings.md
const APP_URL = process.env.APP_URL!;
const AUTH = process.env.AUTH!;
const STRICT = (process.env.STRICT ?? "1") === "1";  // default ON

const interactions: Array<{
  action: string;
  time_ms: number;
  coord_x: number;
  coord_y: number;
  label: string;
}> = [];

function record(action: string, x: number, y: number, label: string, t0: number) {
  interactions.push({
    action,
    time_ms: Date.now() - t0,
    coord_x: x,
    coord_y: y,
    label,
  });
}

async function safeClick(page: Page, selector: string, label: string, t0: number) {
  const loc = page.locator(selector);
  const n = await loc.count();
  if (n === 0) {
    const url = page.url();
    throw new Error(`STRICT_FAIL click selector="${selector}" url="${url}" — missing`);
  }
  const box = await loc.first().boundingBox();
  if (!box) throw new Error(`STRICT_FAIL click selector="${selector}" — no bounding box`);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  record("click", x, y, label, t0);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: "public/recordings/raw",
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await ctx.newPage();
  const t0 = Date.now();

  await page.goto(`${APP_URL}${PAGE_KEY}`, { waitUntil: "domcontentloaded" });
  await waitForStableContent(page);
  await assertExpectedContent(page, PAGE_KEY);

  // -- narrated interactions go here. Each one MUST call safeClick / safeHover.
  // -- Example:
  // await safeClick(page, "tr[data-commit-id]:first-child [data-role='expand']", "expand_commit", t0);
  // await waitForStableContent(page);
  // await safeClick(page, "button[data-role='explain']", "click_explain", t0);
  // await waitForStableContent(page);

  // === A6 tooltip dismissal — mandatory tail ===
  await page.keyboard.press("Escape");
  await page.mouse.click(50, 50);
  await page.waitForTimeout(500);

  // === A9 rename — write interactions.json next to the renamed video ===
  await ctx.close();
  await browser.close();

  // Playwright wrote page@<sha>.webm into public/recordings/raw — pick the newest, rename.
  const fs = await import("fs");
  const files = fs
    .readdirSync("public/recordings/raw")
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, t: fs.statSync(path.join("public/recordings/raw", f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (files.length === 0) throw new Error("STRICT_FAIL: no .webm produced");
  const src = path.join("public/recordings/raw", files[0].f);
  const dst = path.join("public/recordings", `${SCENE_ID}-${SLUG}.webm`);
  renameSync(src, dst);
  writeFileSync(
    path.join("public/recordings", `${SCENE_ID}-${SLUG}.interactions.json`),
    JSON.stringify(interactions, null, 2)
  );
  console.log(`OK ${SCENE_ID}-${SLUG}: ${interactions.length} interactions recorded`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
```

Strict rules enforced by this template:

- **A4** — no `if (count > 0)`; `safeClick` / `safeHover` throw on miss with selector + URL.
- **A5** — `waitForStableContent` after every navigation and click.
- **A6** — Escape + click(50,50) + 500ms wait before `ctx.close()`.
- **A9** — newest `page@<sha>.webm` renamed to `scene-NN-<slug>.webm` immediately. No hash-named files leak to `public/recordings/`.
- `interactions.json` is the contract Agent 1 (`pdv-build`) emits guidance for and that Step 7 (OpenScreen) consumes.

---

## STEP 6 — Run Recordings

Write viewport to `.demopilot-state.viewport` on context creation (defaults `{width: 1920, height: 1080}`; override per project).

```bash
cd projects/{productname}
export APP_URL="<from .demopilot-state>"
export AUTH="$(python3 -c "import json; print(json.load(open('.demopilot-state'))['auth_state_path'])")"
export STRICT=1

python3 -c "
import json, os
p = '.demopilot-state'
s = json.load(open(p)) if os.path.exists(p) else {}
s.setdefault('viewport', {'width': 1920, 'height': 1080})
json.dump(s, open(p, 'w'), indent=2)
"

mkdir -p public/recordings/raw

for script in scripts/record-scene-*.ts; do
  echo "=== $script ==="
  npx ts-node "$script" || { echo "STRICT_FAIL in $script — aborting"; exit 1; }
done

# Verify every expected scene-NN-*.webm exists, no leftover hashes
ls public/recordings/*.webm
if ls public/recordings/page@*.webm 2>/dev/null; then
  echo "FATAL: hash-named recordings present — A9 rename failed"
  exit 1
fi
```

---

## STEP 7 — A7 OpenScreen Polish

Convert each raw `.webm` → `.mp4`, build an OpenScreen project per scene, apply zoom around every click (from `interactions.json`) and speed-up over dead stretches, then render `-polished.mp4`.

```bash
cd projects/{productname}/public/recordings

for webm in scene-*.webm; do
  base="${webm%.webm}"
  mp4="${base}.mp4"
  proj="${base}.openscreen"
  polished="${base}-polished.mp4"
  inter="${base}.interactions.json"

  # webm -> mp4
  {FFMPEG} -i "$webm" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p "$mp4" -y

  # new openscreen project
  cli-anything-openscreen project new -v "$mp4" -o "$proj"

  # zooms + speed-ups from interactions.json
  python3 - << PYEOF
import json, subprocess, os, sys
inter = json.load(open("$inter"))
proj  = "$proj"
try:
    vp = json.load(open("../../.demopilot-state")).get("viewport") or {}
    W, H = int(vp["width"]), int(vp["height"])
except Exception:
    print("WARNING: .demopilot-state.viewport missing — defaulting to 1920x1080", file=sys.stderr)
    W, H = 1920, 1080

# Zoom around every click: focus on the clicked coordinate.
for ev in inter:
    if ev["action"] not in ("click", "hover"):
        continue
    t = ev["time_ms"]
    start = max(0, t - 400)
    end   = t + 1500
    fx = round(ev["coord_x"] / W, 4)
    fy = round(ev["coord_y"] / H, 4)
    subprocess.run([
        "cli-anything-openscreen", "--project", proj,
        "zoom", "add",
        "--start", str(start), "--end", str(end),
        "--focus-x", str(fx), "--focus-y", str(fy),
        "--depth", "4",
    ], check=True)

# Speed-up dead stretches (>2s between events)
events = sorted(inter, key=lambda e: e["time_ms"])
prev = 0
for ev in events:
    gap = ev["time_ms"] - prev
    if gap > 2000:
        subprocess.run([
            "cli-anything-openscreen", "--project", proj,
            "speed", "add",
            "--start", str(prev + 200),
            "--end",   str(ev["time_ms"] - 200),
            "--multiplier", "1.8",
        ], check=True)
    prev = ev["time_ms"]
PYEOF

  # render polished
  cli-anything-openscreen --project "$proj" export render "$polished"
done

# Archive raw webm — Remotion consumes ONLY -polished.mp4
mkdir -p archive
mv scene-*.webm archive/
ls scene-*-polished.mp4
```

Remotion `OffthreadVideo` `src` references must point at `scene-NN-<slug>-polished.mp4`. The Ken Burns hack (B1) is removed in pdv-build; zoom now comes from real semantic events here.

---

## STEP 8 — A3/D7 Post-Recording Review Gate

Before any render, generate `recordings/review.html` and block until every scene is approved.

```bash
cd projects/{productname}
node scripts/build-review-ui.js
open public/recordings/review.html

# Wait for decisions.json to show every scene approved.
node scripts/wait-for-decisions.js || {
  echo "Re-recording requested. Re-running scripts for flagged scenes only."
  node scripts/rerecord-flagged.js
  node scripts/build-review-ui.js
  open public/recordings/review.html
  node scripts/wait-for-decisions.js || exit 1
}
```

`build-review-ui.js`:

- For each `scene-NN-<slug>-polished.mp4`:
  - Extract first + last frame as PNG via ffmpeg (`-ss 0` and `-sseof -0.1`).
  - Read duration via ffprobe.
  - Read narration text from `public/narration/scene-NN.txt`.
- Emit HTML: per-scene card with first-frame thumb, last-frame thumb, duration, `<video controls src="scene-NN-...-polished.mp4">`, narration paragraph.
- Per-scene buttons: **Approve** and **Re-record**. A header has **Approve all**.
- Button handlers POST to a tiny local server (or write directly via `file://` + a tiny `node scripts/decision-server.js` on localhost:8731 launched alongside `open review.html`) into `recordings/decisions.json`:

```json
{
  "scene-01-hook":     "approved",
  "scene-04-showcase": "rerecord",
  "scene-07-commits":  "approved"
}
```

`wait-for-decisions.js`:

- Watch `recordings/decisions.json` mtime (chokidar / fs.watch).
- Read it; require every scene id from `config.ts` to have a status.
- Exit 0 only when **all** statuses are `approved`.
- If any are `rerecord`, exit 2 (signals the bash loop above to re-record only those scenes).
- CLI fallback (no GUI): if `--cli` is passed, print `Press Enter when you've finished reviewing recordings/review.html (or set decisions.json).` and read from stdin, then re-check. **No silent default approval.** A missing or partial decisions.json keeps blocking.

`rerecord-flagged.js`:

- Reads `decisions.json`, finds entries with `rerecord`, re-runs only those `scripts/record-scene-NN-*.ts`, archives the previous polished MP4 to `archive/`, re-runs Step 7 OpenScreen polish for those scenes only.

Pipeline does not advance to sync check until `wait-for-decisions.js` exits 0.

After approval, persist the approval file path to state:

```bash
python3 -c "
import json, os
p = '.demopilot-state'
s = json.load(open(p)) if os.path.exists(p) else {}
s['render_decisions_json'] = os.path.abspath('public/recordings/decisions.json')
json.dump(s, open(p, 'w'), indent=2)
"
```

---

## STEP 9 — Sync Check (recordings vs narration)

Run after approval gate. Never skip.

```bash
python3 - << 'EOF'
import subprocess, glob, os, sys

def dur(path):
    r = subprocess.run(
        ["{FFPROBE}","-v","quiet","-show_entries","format=duration","-of","csv=p=0",path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip()) if r.stdout.strip() else None

nar_dir = "projects/{productname}/public/narration"
rec_dir = "projects/{productname}/public/recordings"
mismatches = []

for nar_file in sorted(glob.glob(f"{nar_dir}/scene*.mp3")):
    scene_id = os.path.basename(nar_file).replace(".mp3","")
    recs = glob.glob(f"{rec_dir}/{scene_id}*-polished.mp4")
    if not recs:
        continue  # motion-graphic scene — no recording

    nar_s = dur(nar_file)
    rec_s = dur(recs[0])
    if nar_s and rec_s and rec_s < nar_s - 0.5:
        mismatches.append((scene_id, rec_s, nar_s, nar_s - rec_s))
        print(f"MISMATCH {scene_id}: recording {rec_s:.1f}s < narration {nar_s:.1f}s")
    else:
        print(f"OK       {scene_id}: {rec_s:.1f}s rec >= {nar_s:.1f}s nar")

if mismatches:
    print(f"\n{len(mismatches)} mismatch(es). Fix options per scene:")
    for sid, r, n, diff in mismatches:
        print(f"  {sid}: extend recording by {diff:.1f}s OR trim narration")
    sys.exit(1)
print("\nSync check passed.")
EOF
```

Exit 1 → ask user which resolution per scene; loop back to recording or regenerate narration. Never render with known mismatches.

---

## STEP 10 — Generate Music

```bash
mkdir -p projects/{productname}/public/music

TOTAL_S=$(python3 -c "
import re
d = open('projects/{productname}/config.ts').read()
m = re.search(r'TOTAL_FRAMES\s*=\s*(\d+)', d)
frames = int(m.group(1)) if m else sum(int(x) for x in re.findall(r':\s*(\d+)', d) if 100 < int(x) < 3000)
print(frames // 30 + 10)
")

{FFMPEG} -f lavfi -i "sine=frequency=55:duration=${TOTAL_S}" \
  -f lavfi -i "sine=frequency=82:duration=${TOTAL_S}" \
  -filter_complex "[0]volume=0.08,aecho=0.6:0.4:800:0.3[a];[1]volume=0.05[b];[a][b]amix=inputs=2,lowpass=f=400[out]" \
  -map "[out]" -ar 44100 -ac 2 projects/{productname}/public/music/bg.mp3 -y
```

Remotion: `<Audio src={staticFile('music/bg.mp3')} volume={0.06} />`.

---

## STEP 11 — Verify Narration (do not regenerate)

```bash
missing=0
for f in projects/{productname}/public/narration/scene*.mp3; do
  size=$(wc -c < "$f" 2>/dev/null || echo 0)
  [ "$size" -lt 1000 ] && echo "WARNING: $f too small ($size bytes)" && missing=$((missing+1))
done
[ "$missing" -gt 0 ] && echo "Re-run /pdv-build to regenerate narration" && exit 1
echo "Narration: all files present"
```

---

## STEP 12 — Quality Gate (Sonnet)

```bash
cd projects/{productname}
npx impeccable detect
npx impeccable /animate
npx impeccable /color
```

Fix blockers. Switch back to Haiku.

---

## STEP 13 — D8 Frame Preview During Render

Two paths; pick one.

### Option A — `--studio-first` (preferred for iteration)

If invoked as `/pdv-render "{ProductName}" --studio-first`:

```bash
cd projects/{productname}
npx remotion studio
```

Block until user confirms `studio looks good — render now` on stdin, then continue.

### Option B — frame-strobe during render (default)

```bash
cd projects/{productname}
mkdir -p render-preview
rm -f render-preview/frame-*.png

# Kick off main render in background
(npx remotion render src/index.ts MainVideo output/demo.mp4 \
   --codec h264 --crf 18 --scale 1 --log verbose \
   > render.log 2>&1) &
RENDER_PID=$!

# Strobe: every 30 frames, dump a PNG by re-rendering that single frame.
TOTAL_FRAMES=$(python3 -c "import re; print(re.search(r'TOTAL_FRAMES\s*=\s*(\d+)', open('config.ts').read()).group(1))")
THIRD=$((TOTAL_FRAMES / 3))

for ((f=0; f<TOTAL_FRAMES; f+=30)); do
  npx remotion still src/index.ts MainVideo "render-preview/frame-$(printf '%04d' $f).png" \
    --frame=$f >/dev/null 2>&1 &
done
wait

# When ~33% of strobes are on disk, open a contact sheet HTML and ask the user.
node scripts/build-frame-contact-sheet.js render-preview
open render-preview/contact-sheet.html
read -r -p "Render running in background. Abort if a frame looks wrong (y/Enter): " ans
if [ "$ans" = "y" ]; then
  kill $RENDER_PID
  echo "Render aborted by user from contact sheet."
  exit 1
fi

wait $RENDER_PID
```

`build-frame-contact-sheet.js` writes an HTML grid of every `frame-NNNN.png` with the frame number labeled. If any look broken, the user kills the background render before it finishes.

After main render:

```bash
# 9:16 vertical
npx remotion render src/index.ts MainVideo output/demo-9x16.mp4 \
  --width 1080 --height 1920 --codec h264

# GIF preview (first 8s)
{FFMPEG} -i output/demo.mp4 -t 8 \
  -vf "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  output/demo-preview.gif -y

{FFPROBE} -v quiet -show_entries format=duration,size -of csv=p=0 output/demo.mp4
```

---

## STEP 14 — phase3-report.html

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
</style></head><body>
<h1>DemoPilot Output — {ProductName}</h1>
<p style="color:#71717a">{timestamp} · {total_s}s · {scene_count} scenes</p>

<video controls src="demo.mp4"></video>

<div class="downloads">
  <a class="btn" href="demo.mp4">16:9 MP4</a>
  <a class="btn" href="demo-9x16.mp4">9:16 MP4</a>
  <a class="btn" href="demo-preview.gif">GIF Preview</a>
  <a class="btn" href="../public/recordings/review.html">Recording Review</a>
  <a class="btn" href="../render-preview/contact-sheet.html">Frame Contact Sheet</a>
</div>

<h2>Content Gate (preflight)</h2>
<table><tr><th>Page</th><th>Selector</th><th>Expected</th><th>Found</th><th>Status</th></tr>
{preflight rows from STEP 2 log}
</table>

<h2>Recording Approvals</h2>
<table><tr><th>Scene</th><th>Polished MP4</th><th>Decision</th></tr>
{rows from recordings/decisions.json}
</table>

<h2>Sync Check</h2>
<table><tr><th>Scene</th><th>Narration</th><th>Recording</th><th>Status</th></tr>
{sync rows}
</table>

<h2>Scene Timing</h2>
<table><tr><th>Scene</th><th>Frames</th><th>Duration</th><th>Music</th><th>Type</th></tr>
{timing rows from config.ts}
</table>

</body></html>
```

Write `projects/{productname}/.demopilot-state`:

```json
{
  "product": "{ProductName}",
  "phase_completed": "render",
  "next_command": null,
  "output_mp4": "output/demo.mp4",
  "output_vertical": "output/demo-9x16.mp4",
  "output_gif": "output/demo-preview.gif",
  "decisions": "public/recordings/decisions.json",
  "render_decisions_json": "public/recordings/decisions.json",
  "notes": "Render complete. {total_s}s video at output/demo.mp4"
}
```

Tell user: "Your demo is ready. Open `projects/{productname}/output/phase3-report.html` to preview and download."
