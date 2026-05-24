---
name: pdv-explore
description: "Use as Step 2 of DemoPilot after /pdv-validate passes. Runs Phase 0 (design system + auth capture), Phase 1 (deep app exploration with screenshots-on-disk, structured expected_content probes, and coord-resolved interaction steps), then generates a single Reveal.js file: slide 0 = spatial app map, slides 1+ = scene-by-scene approval with storytelling and machine-readable narration steps. One command, one browser tab, one approval step."
argument-hint: "[ProductName] [AppURL] — e.g. 'Prompture https://prompture.sovix.xyz'"
---

# DemoPilot — Step 2: Explore + Storyboard

**Primary: Sonnet** | **Phase 0 design: Opus** | **Exploration subagent: Sonnet (Explore)**

## Setup: Parse Arguments

```
ProductName = first argument
AppURL      = second argument
ProjectRoot = projects/{productname}/
```

**First action: read state and toolchain**
```bash
cat projects/{productname}/.demopilot-state 2>/dev/null || echo "no state file yet"
cat projects/{productname}/toolchain.json 2>/dev/null || echo "ERROR: run /pdv-validate first"
```

If `toolchain.json` is missing, stop: "Run `/pdv-validate \"{ProductName}\"` first."

---

## PHASE 0 — Design System Bootstrap + Auth Capture

**Switch to Opus.**

### 0a. Design direction

Read `~/.claude/skills/demopilot/ref/design-stack.md` before any frontend work.

Invoke design stack:
1. `/ui-ux-pro-max` — palette + font + spacing recommendations
2. `/design-taste-frontend` — DESIGN_VARIANCE 7–9, check Creative Arsenal
3. `/emil-design-eng` — animation craft standards for this product

Ask user:
- "What type of product is this? (SaaS / developer tool / e-commerce / fintech / other)"
- "Primary brand color? (hex or 'none')"

**Present 3 design directions** (never one):
- Option A — e.g. Minimal Dark (Geist, deep navy, high contrast)
- Option B — e.g. Warm Gradient (Satoshi, amber, editorial feel)
- Option C — e.g. Technical Precision (Outfit, teal, data-forward)

Get explicit approval. Write `projects/{productname}/src/theme.ts`.

### 0b. Auth state capture (A2 — single source of truth)

**Rule: one auth state per pipeline run — never regenerate in later phases.** Phase 1 exploration, Phase 3 Playwright recording, and Phase 4 content-gate validation all use this same file.

Capture once now:

```bash
mkdir -p projects/{productname}/auth
AUTH_PATH="$(pwd)/projects/{productname}/auth/auth-state.json"

# Launch the user's browser session against AppURL via WebBridge, then export
# storage state. The exact endpoint comes from toolchain.json (auth_capture_url).
curl -s -X POST "$(jq -r .webbridge_url projects/{productname}/toolchain.json)/command" \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"storage_state_export\",\"args\":{\"path\":\"$AUTH_PATH\"},\"session\":\"auth\"}"

test -s "$AUTH_PATH" || { echo "ERROR: auth-state.json was not created"; exit 1; }
```

Ask the user to log in to `{AppURL}` in the WebBridge browser before running the export if storage_state_export reports an unauthenticated session.

Record the absolute path in `.demopilot-state` so downstream phases (pdv-build, pdv-render) reuse it without re-prompting:

```json
{
  "auth_state_path": "/abs/path/projects/{productname}/auth/auth-state.json"
}
```

**Human checkpoint:** Confirm design direction AND that the captured auth-state.json represents the account whose data should appear in the final video.

---

## PHASE 1 — Deep App Exploration (Subagent)

**Dispatch an Explore subagent** — keeps all WebBridge output out of main context.

Read `webbridge_url` and `auth_state_path` from `toolchain.json` / `.demopilot-state`. Use those values — never assume port, never create a new auth session.

### 1a. Pre-flight (parent skill — runs BEFORE dispatching subagent)

```bash
mkdir -p projects/{productname}/exploration/screenshots
mkdir -p projects/{productname}/exploration
: > projects/{productname}/exploration/findings.md
```

The subagent will write screenshot files into `exploration/screenshots/` and the parent skill will assert their existence afterward (1c).

### 1b. Subagent prompt

```
You are exploring the app at {AppURL} to build a DEEP PRODUCT UNDERSTANDING
for a demo video. This is NOT a screenshot task. Your goal is to understand
what every page does, what is interactive, and what would be compelling on video.

Read toolchain.json and state first:
cat projects/{productname}/toolchain.json
cat projects/{productname}/.demopilot-state

WebBridge URL: {webbridge_url from toolchain.json}
Auth state path: {auth_state_path from .demopilot-state}

Open the WebBridge session with storage_state loaded from auth_state_path.
Do NOT create a new login session. If the page redirects to /login the
auth file is stale — STOP and report back.

## EXPLORATION PROTOCOL

For EACH page (max 15 pages, follow sidebar navigation — never assume URLs):

### Pass 1 — Structured Checklist (complete before moving on)
Document all of:
1. Page title, confirmed URL (from browser address bar via evaluate), one-sentence purpose
2. Every navigation element visible: sidebar items, tabs, breadcrumbs, sub-menus, nested items
3. Every interactive element — for EACH one get confirmed pixel coordinates:
   curl -s -X POST {webbridge_url}/command \
     -H 'Content-Type: application/json' \
     -d '{"action":"evaluate","args":{"code":"JSON.stringify([...document.querySelectorAll(\"button,select,a,[role=button],[role=tab],[data-state]\")].map((el,i)=>{const r=el.getBoundingClientRect();return{i,tag:el.tagName,text:el.textContent?.trim().slice(0,40),cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2),visible:r.width>0}}))"},"session":"explore"}'
4. Click EVERY interactive element — document what changes, what opens, what loads
5. Any drill-downs: modals, slide-overs, nested subpages, expanded panels, tooltips
6. Data displayed: what do numbers/charts mean, what time range, what filters affect them
7. Relationships: does clicking anything here navigate to or affect another page?

### Pass 2 — Freeform Judgment (three notes per page)
1. What this page DOES — the job it accomplishes for the user (one sentence)
2. Most interesting interaction — the single thing that would surprise someone seeing it for the first time
3. Video potential — YES / MAYBE / NO, reason, suggested interaction sequence for recording

### Pass 3 — expected_content probe (REQUIRED — drives content gate)

For each page, probe REAL selectors that prove the page has meaningful data.
Do not guess — query the actual DOM and record selectors that returned >0 nodes.

For each candidate content selector, run:
  curl -s -X POST {webbridge_url}/command \
    -H 'Content-Type: application/json' \
    -d '{"action":"evaluate","args":{"code":"(()=>{const els=document.querySelectorAll(SELECTOR);return{count:els.length,sample:els[0]?.textContent?.trim().slice(0,80)||null}})()"},"session":"explore"}'

Pick 1–4 selectors per page that represent real content (rows, cards, metric
numbers, chart bars). Record min_count = max(1, observed_count - 1) so a
slightly different account still passes. Record a content_pattern (regex)
only when the value format is stable (e.g. "\d+%", "\$\d+").

If NO selectors return meaningful content (all-zero metrics, "no data yet"
empty state, loading skeleton), set expected_content: empty and add a top-level
flag video_worthy: false on that page entry. The user will be warned in the
storyboard approval UI.

### Screenshots (MANDATORY — files must exist on disk)

For each page, take TWO screenshots and SAVE THEM TO DISK via WebBridge.
Describing the page in findings.md does NOT satisfy this requirement.

  # Full-page screenshot
  curl -s -X POST {webbridge_url}/command \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"screenshot\",\"args\":{\"path\":\"projects/{productname}/exploration/screenshots/{slug}-full.png\",\"fullPage\":true},\"session\":\"explore\"}"

  # Viewport screenshot
  curl -s -X POST {webbridge_url}/command \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"screenshot\",\"args\":{\"path\":\"projects/{productname}/exploration/screenshots/{slug}-viewport.png\"},\"session\":\"explore\"}"

After each screenshot call, verify the file exists with `ls -la` before
moving on. If either file is 0 bytes or missing, retry the screenshot call.

{slug} = lowercased page name with non-alphanumerics replaced by '-'
         (e.g. /home/commits -> "home-commits", /showcase -> "showcase").

Minimum time per page: explore until checklist is genuinely complete. Do not rush.

## OUTPUT FORMAT for findings.md

For every page, write a block in EXACTLY this shape (YAML inside fenced block
for the machine-readable parts so downstream phases can parse it):

## {Page Name}
URL: {confirmed from browser}
Slug: {slug}
Load time: {seconds}
Visual impact: {1-5}
Screenshots:
  - exploration/screenshots/{slug}-full.png
  - exploration/screenshots/{slug}-viewport.png

```yaml
page: {confirmed URL}
slug: {slug}
video_worthy: true | false
expected_content:
  - selector: "tr[data-commit-id]"
    min_count: 3
    description: "at least 3 commit rows"
  - selector: "[data-role='match-rate']"
    content_pattern: "\\d+%"
    description: "match rate number"
# OR, when nothing real loads:
# expected_content: empty
```

### Checklist
- Navigation: {list all items}
- Interactive elements: [{name, coords: {x,y}, what it does}]
- Interactions discovered: {each click result}
- Drill-downs: {modals/subpages found}
- Data shown: {description of metrics/charts}
- Relationships: {links to other pages}

### Judgment
- What it does: {one sentence}
- Most interesting interaction: {description + pixel coords}
- Video potential: {YES/MAYBE/NO} — {reason + suggested sequence}

Write to: projects/{productname}/exploration/findings.md

Return: summary of all pages found, top 8 candidates ranked by video
potential (not just visual impact), and an explicit list of every screenshot
path you wrote to disk.
```

### 1c. Parent assertion gate (A8 — no proceed on missing screenshots)

After the subagent returns, the parent skill MUST verify every page in `findings.md` has both screenshot files on disk. Do not proceed to Phase 2 until this passes.

```bash
cd projects/{productname}

# Extract every slug from findings.md
SLUGS=$(grep -E '^Slug: ' exploration/findings.md | awk '{print $2}')

MISSING=()
for slug in $SLUGS; do
  for variant in full viewport; do
    f="exploration/screenshots/${slug}-${variant}.png"
    if [ ! -s "$f" ]; then
      MISSING+=("$f")
    fi
  done
done

if [ ${#MISSING[@]} -gt 0 ]; then
  printf 'MISSING SCREENSHOTS:\n%s\n' "${MISSING[@]}"
  # Re-dispatch the subagent with only the missing pages until clean.
  exit 1
fi
echo "screenshot gate: PASS"
```

If the gate fails, re-dispatch the Explore subagent scoped to the offending slugs and retry until every file exists and is non-empty. Do NOT proceed to Phase 2 with broken images.

---

## PHASE 2 — Story + Combined Approval UI

**Switch to Opus.**

No separate `continue` command needed. The app map and storyboard are generated together in one Reveal.js file immediately after exploration completes.

### Step 1 — Write the story first

Before placing any scenes, write a one-paragraph "story of this video":
- What problem does the viewer have at the start?
- What moment do they realize the product solves it?
- What do they feel at the end that makes them want to act?

This paragraph drives scene ordering. Visual impact score is secondary to story logic.

### Step 2 — Curate 10–12 scenes in story order

Always include: Hook, Problem, Promise, [product screens], Stats/Social Proof, CTA. Product screen scenes ordered by narrative logic — not by visual impact rank.

For each scene write:
```
Scene N — {Name}
Type: motion-graphic | screen-recording
Story position: {why here in the arc}
Emotional beat: {what viewer feels at this moment}
Question answered: {what question does this scene resolve}
Transition logic: {why this follows scene N-1}
URL: {from findings.md — never assumed, null for motion-graphic}
Narration: {2-3 sentences — no ellipsis, use <break time="0.5s"/>}
Duration estimate: {seconds}
Music preset: tension | hopeful | corporate-bg | cta
Creative pattern: {from visual-excellence.md}
```

### Step 3 — Resolve narration into machine-readable `steps` (A10)

For every screen-recording scene, the narration must be decomposed into a `steps:` block. Each step is an action with a coord-resolved target (where applicable). This block is the **single source of truth** that pdv-build consumes to generate recording scripts — recording scripts MUST NOT invent steps that are not in this list, and MUST NOT skip steps that are.

Allowed actions:

| action          | required fields                        | notes                                                                 |
|-----------------|----------------------------------------|-----------------------------------------------------------------------|
| `navigate`      | `url`                                  | navigates and waits for `load`                                        |
| `wait_stable`   | (none)                                 | waits for network idle + DOM mutation quiescence                      |
| `wait`          | `ms`                                   | hard pause (use sparingly)                                            |
| `hover`         | `target`, `coord: [x, y]`              | coord MUST come from WebBridge probe at exploration time              |
| `click`         | `target`, `coord: [x, y]`              | coord MUST come from WebBridge probe at exploration time              |
| `type`          | `target`, `coord: [x, y]`, `text`      | clicks first, then types                                              |
| `assert_visible`| `content` (selector OR text)           | recording fails fast if the content is absent at capture time         |

**Resolution procedure (subagent re-runs per scene during Step 3):**

1. Re-open the WebBridge `explore` session (same auth-state.json — never new).
2. Navigate to the scene's URL and `wait_stable`.
3. For every narrated interaction in order, probe the actual element via:
   ```bash
   curl -s -X POST {webbridge_url}/command -H 'Content-Type: application/json' \
     -d '{"action":"evaluate","args":{"code":"(()=>{const el=document.querySelector(SELECTOR);if(!el)return null;const r=el.getBoundingClientRect();return{cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2),visible:r.width>0}})()"},"session":"explore"}'
   ```
4. If the probe returns null or `visible:false`, mark the step **unresolved** and surface it to the user during storyboard approval. Do not invent a fallback coordinate.
5. Record the resolved coord under `coord: [x, y]`.

**Example output (yaml block written into the storyboard data and into `exploration/scene-steps.yaml`):**

```yaml
scene_07:
  narration: "Navigate to commits. Expand the top commit. See files touched per prompt. Click EXPLAIN."
  steps:
    - action: navigate
      url: /home/commits
    - action: wait_stable
    - action: hover
      target: commit_row_0
      coord: [820, 340]
    - action: click
      target: expand_chevron
      coord: [1680, 340]
    - action: assert_visible
      content: "prompts panel"
    - action: click
      target: explain_button
      coord: [950, 580]
    - action: wait
      ms: 2000
```

A scene whose narration contains an action with no resolvable target is **REJECTED** at this step. The user sees the rejection in the approval UI and must either edit the narration or drop the scene. No "let's hope the selector works at recording time."

Write the full mapping to `projects/{productname}/exploration/scene-steps.yaml`. This file is the contract pdv-build reads.

### Step 4 — Start file-write server (port-safe)

```bash
# Kill any previous instance first to avoid silent port conflict
lsof -ti:19876 | xargs kill -9 2>/dev/null; sleep 0.3

# Start server anchored to project root so decisions.json path is always correct
cd projects/{productname} && python3 - << 'PYEOF' &
import http.server, json, os, time
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers['Content-Length'])
        d = json.loads(self.rfile.read(n))
        path = d['path']
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        open(path, 'w').write(d['content'])
        os.utime(path, None)  # bump mtime — pdv-build/pdv-render watch this
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
print("file-write server ready on 19876")
http.server.HTTPServer(('127.0.0.1', 19876), H).serve_forever()
PYEOF
echo "Server PID: $!"
```

### Step 5 — Generate combined Reveal.js file

Write `projects/{productname}/storyboard/phase1-report.html` — one file, two sections.

**Slide 0 — App Map** (replaces separate tldraw file):
- Grid of page cards derived from findings.md, grouped by nav section
- Each card: page name, URL, visual impact badge (1–5), "what it does", "most interesting interaction", video potential badge (YES/MAYBE/NO)
- **Cards with `video_worthy: false` get a red banner: "EMPTY STATE — not recommended for recording"**
- Relationship arrows shown as styled connectors in HTML (no external lib needed)

**Slide 1 — Narrative Arc:**
- One-paragraph story of the video
- Scene sequence row with arrows

**Slides 2–N — One per scene:**
- Scene number + name + type badge
- **Screenshot for recording scenes uses the ACTUAL files saved in Phase 1: `../exploration/screenshots/{slug}-viewport.png`** — image src verified to exist before HTML write. Animated placeholder SVG for motion-graphic.
- Story row: Emotional Beat | Question Answered | Transition Logic
- Narration (italic, blue left-border)
- **Structured steps panel (read-only)** — render the `steps:` block from `scene-steps.yaml` as a styled table next to the screenshot. One row per step: `action | target | coord | content`. Unresolved steps render in red with the label `UNRESOLVED — fix narration or drop scene`.
- **expected_content panel** — render the page's expected_content block as a checklist. Pages with `expected_content: empty` show a prominent red warning banner: "This scene's page had no meaningful content during exploration. Recording will likely capture an empty state. Approving anyway?"
- Meta badges: timing, music preset, creative pattern
- **✓ Approve / ~ Maybe / ✗ Remove** buttons

**Decisions persistence:**
- Every button click writes to `localStorage` AND POSTs `{ path: "exploration/decisions.json", content: ... }` to port 19876
- The server is running from `projects/{productname}/` so the path resolves correctly
- The server bumps the file's mtime on every write — pdv-build and pdv-render watch this mtime as the gate signal (Agent 2 enforces this via D7)
- Status bar: `N approved · M maybe · R removed · P pending — run /pdv-build when ready`

**decisions.json format:**
```json
{
  "scene01-hook":     "approved",
  "scene02-problem":  "approved",
  "scene03-promise":  "maybe",
  "scene04-commits":  "approved"
}
```

Open: `open projects/{productname}/storyboard/phase1-report.html`

### Step 6 — Write state file

`projects/{productname}/.demopilot-state`:
```json
{
  "product": "{ProductName}",
  "phase_completed": "storyboard",
  "next_command": "/pdv-build \"{ProductName}\"",
  "auth_state_path": "/abs/path/projects/{productname}/auth/auth-state.json",
  "decisions_json": "exploration/decisions.json",
  "scene_steps_yaml": "exploration/scene-steps.yaml",
  "findings_md": "exploration/findings.md",
  "screenshots_dir": "exploration/screenshots",
  "theme_ts": "src/theme.ts",
  "toolchain_json": "toolchain.json",
  "notes": "{N} scenes in storyboard. Slide 0 = app map. Approve scenes then run /pdv-build."
}
```

`auth_state_path` is the single absolute path used by every subsequent phase. Never regenerate.

Tell user:
> "Review open. Slide 0 = full app map. Slides 1+ = scenes to approve.
> Each scene shows its narration AND the resolved step list. Red rows = unresolved steps you need to fix.
> Red banners = empty-state pages you probably shouldn't record.
> Navigate with arrow keys. When done, run: `/pdv-build \"{ProductName}\"`"
