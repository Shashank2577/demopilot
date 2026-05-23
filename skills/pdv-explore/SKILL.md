---
name: pdv-explore
description: "Use as Step 2 of DemoPilot after /pdv-validate passes. Runs Phase 0 (design system), Phase 1 (deep app exploration with checklist+judgment passes per page), then generates a single Reveal.js file: slide 0 = spatial app map, slides 1+ = scene-by-scene approval with storytelling. One command, one browser tab, one approval step."
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

## PHASE 0 — Design System Bootstrap

**Switch to Opus.**

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

**Human checkpoint:** Confirm design direction before Phase 1.

---

## PHASE 1 — Deep App Exploration (Subagent)

**Dispatch an Explore subagent** — keeps all WebBridge output out of main context.

Read `webbridge_url` from `toolchain.json`. Use that URL — never assume port.

### Subagent prompt:

```
You are exploring the app at {AppURL} to build a DEEP PRODUCT UNDERSTANDING
for a demo video. This is NOT a screenshot task. Your goal is to understand
what every page does, what is interactive, and what would be compelling on video.

Read toolchain.json first:
cat projects/{productname}/toolchain.json

WebBridge URL: {webbridge_url from toolchain.json}

## EXPLORATION PROTOCOL

For EACH page (max 15 pages, follow sidebar navigation — never assume URLs):

### Pass 1 — Structured Checklist (complete before moving on)
Document all of:
1. Page title, confirmed URL (from browser address bar via evaluate), one-sentence purpose
2. Every navigation element visible: sidebar items, tabs, breadcrumbs, sub-menus, nested items
3. Every interactive element — for EACH one get confirmed pixel coordinates:
   curl -s -X POST {webbridge_url}/command \
     -H 'Content-Type: application/json' \
     -d '{"action":"evaluate","args":{"code":"JSON.stringify([...document.querySelectorAll(\"button,select,[role=button],[role=tab],[data-state]\")].map((el,i)=>{const r=el.getBoundingClientRect();return{i,tag:el.tagName,text:el.textContent?.trim().slice(0,40),cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2),visible:r.width>0}}))"},"session":"explore"}'
4. Click EVERY interactive element — document what changes, what opens, what loads
5. Any drill-downs: modals, slide-overs, nested subpages, expanded panels, tooltips
6. Data displayed: what do numbers/charts mean, what time range, what filters affect them
7. Relationships: does clicking anything here navigate to or affect another page?

### Pass 2 — Freeform Judgment (three notes per page)
1. What this page DOES — the job it accomplishes for the user (one sentence)
2. Most interesting interaction — the single thing that would surprise someone seeing it for the first time
3. Video potential — YES / MAYBE / NO, reason, suggested interaction sequence for recording

### Screenshots
Take TWO screenshots per page:
- {page}-initial.png — on load
- {page}-after.png — after the most interesting interaction
Save to projects/{productname}/exploration/screenshots/

Minimum time per page: explore until checklist is genuinely complete. Do not rush.

## OUTPUT FORMAT for findings.md

## {Page Name}
URL: {confirmed from browser}
Load time: {seconds}
Visual impact: {1-5}

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

Return: summary of all pages found, top 8 candidates ranked by video potential (not just visual impact).
```

Wait for subagent. Read `findings.md`.

---

## PHASE 2 — Story + Combined Approval UI

**Switch to Opus.**

No separate `continue` command needed. The app map and storyboard are generated together
in one Reveal.js file immediately after exploration completes.

### Step 1 — Write the story first

Before placing any scenes, write a one-paragraph "story of this video":
- What problem does the viewer have at the start?
- What moment do they realize the product solves it?
- What do they feel at the end that makes them want to act?

This paragraph drives scene ordering. Visual impact score is secondary to story logic.

### Step 2 — Curate 10–12 scenes in story order

Always include: Hook, Problem, Promise, [product screens], Stats/Social Proof, CTA.
Product screen scenes ordered by narrative logic — not by visual impact rank.

For each scene write:
```
Scene N — {Name}
Type: motion-graphic | screen-recording
Story position: {why here in the arc}
Emotional beat: {what viewer feels at this moment}
Question answered: {what question does this scene resolve}
Transition logic: {why this follows scene N-1}
URL: {from findings.md — never assumed, null for motion-graphic}
Interaction: {exact steps with pixel coords from findings.md}
Narration: {2-3 sentences — no ellipsis, use <break time="0.5s"/>}
Duration estimate: {seconds}
Music preset: tension | hopeful | corporate-bg | cta
Creative pattern: {from visual-excellence.md}
```

### Step 3 — Start file-write server (port-safe)

```bash
# Kill any previous instance first to avoid silent port conflict
lsof -ti:19876 | xargs kill -9 2>/dev/null; sleep 0.3

# Start server anchored to project root so decisions.json path is always correct
cd projects/{productname} && python3 - << 'PYEOF' &
import http.server, json, os
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers['Content-Length'])
        d = json.loads(self.rfile.read(n))
        path = d['path']
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        open(path, 'w').write(d['content'])
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
print("file-write server ready on 19876")
http.server.HTTPServer(('127.0.0.1', 19876), H).serve_forever()
PYEOF
echo "Server PID: $!"
```

### Step 4 — Generate combined Reveal.js file

Write `projects/{productname}/storyboard/phase1-report.html` — one file, two sections:

**Slide 0 — App Map** (replaces separate tldraw file):
- Grid of page cards derived from findings.md, grouped by nav section
- Each card: page name, URL, visual impact badge (1–5), "what it does", "most interesting interaction", video potential badge (YES/MAYBE/NO)
- Relationship arrows shown as styled connectors in HTML (no external lib needed)
- This is the confirmation that the agent understood the app — user reviews before approving scenes

**Slide 1 — Narrative Arc:**
- One-paragraph story of the video
- Scene sequence row with arrows

**Slides 2–N — One per scene:**
- Scene number + name + type badge
- Screenshot for recording scenes (`../exploration/screenshots/{page}-initial.png`), animated placeholder SVG for motion-graphic
- Story row: Emotional Beat | Question Answered | Transition Logic
- Narration (italic, blue left-border)
- Meta badges: timing, music preset, creative pattern
- Recording steps (recording scenes only)
- **✓ Approve / ~ Maybe / ✗ Remove** buttons

**Decisions persistence:**
- Every button click writes to `localStorage` AND POSTs `{ path: "storyboard/decisions.json", content: ... }` to port 19876
- The server is running from `projects/{productname}/` so the path resolves correctly
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

Write state file `projects/{productname}/.demopilot-state`:
```json
{
  "product": "{ProductName}",
  "phase_completed": "storyboard",
  "next_command": "/pdv-build \"{ProductName}\"",
  "decisions_json": "storyboard/decisions.json",
  "theme_ts": "src/theme.ts",
  "toolchain_json": "toolchain.json",
  "notes": "{N} scenes in storyboard. Slide 0 = app map. Approve scenes then run /pdv-build."
}
```

Tell user:
> "Review open. Slide 0 = full app map. Slides 1+ = scenes to approve.
> Navigate with arrow keys. When done, run: `/pdv-build \"{ProductName}\"`"
