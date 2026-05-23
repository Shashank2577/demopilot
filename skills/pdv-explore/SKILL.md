---
name: pdv-explore
description: "Use as Step 2 of DemoPilot after /pdv-validate passes. Runs Phase 0 (design system), Phase 1 (app exploration via subagent), and Phase 2 (shot list curation). Takes ProductName and app URL as arguments. Outputs phase1-report.html for human review before building."
argument-hint: "[ProductName] [AppURL] — e.g. 'OBSERVE https://app.observe.xyz'"
---

# DemoPilot — Step 2: Explore + Shot List

**Primary model: Sonnet** | **Phase 0 design: Opus** | **Phase 1 subagent: Sonnet (Explore)**

## Setup: Parse Arguments

```
ProductName = first argument (e.g. "OBSERVE")
AppURL = second argument (e.g. "https://app.observe.xyz")
ProjectRoot = "projects/{productname}/"   ← lowercase, no spaces
```

Create directory: `projects/{productname}/exploration/screenshots/`

---

## PHASE 0 — Design System Bootstrap

**Switch to Opus for this phase.**

**Read `~/.claude/skills/demopilot/ref/design-stack.md` before touching any frontend.**

Invoke the design stack in order:
1. `/ui-ux-pro-max` — get palette + font + spacing recommendations
2. `/design-taste-frontend` — set DESIGN_VARIANCE to 7–9, check Creative Arsenal
3. `/emil-design-eng` — define animation craft standards for this product

Then:
- Ask user: "What type of product is this? (SaaS / developer tool / e-commerce / fintech / other)"
- Ask user: "What's the primary brand color if you have one? (or 'none')"
- Get palette recommendation from ui-ux-pro-max: `--domain color`
- Get font pairing: `--domain typography`

**Present 3 design directions as options (never one):**
Show the user three distinct directions with palette swatches + font sample + mood:
- Option A — e.g., Minimal Dark (Geist, deep navy, high contrast)
- Option B — e.g., Warm Gradient (Satoshi, amber accent, editorial)
- Option C — e.g., Technical Precision (Outfit, teal, data-forward)

Get explicit approval on one direction before writing theme.ts.

Write `projects/{productname}/src/theme.ts`:

```ts
export const THEME = {
  accent: "{approved-hex}",       // saturation < 80%, not purple
  bg: "#0a0a0a",
  surface: "#111111",
  text: { primary: "#f5f5f5", secondary: "#a1a1aa" },
  font: { heading: "{approved-heading}", body: "{approved-body}" },
  spring: { stiffness: 100, damping: 20 },
  stagger: 40,
} as const;
```

**Human checkpoint:** Show palette + fonts. Confirm before Phase 1.

---

## PHASE 1 — App Exploration (Subagent)

**Dispatch an Explore subagent** — keeps all WebBridge output OUT of the main context.

Subagent prompt:
```
Explore the app at {AppURL} using WebBridge at http://127.0.0.1:10086.

1. Check WebBridge health: ~/.kimi-webbridge/bin/kimi-webbridge status
2. Navigate to {AppURL}
3. From the sidebar, click EVERY navigation link — never assume URLs
4. For each page (max 15 pages):
   a. Screenshot → save to projects/{productname}/exploration/screenshots/{page}-initial.png
   b. Read accessibility tree snapshot
   c. Interact: click dropdowns, table rows, hover charts, expand panels
   d. Screenshot after interaction → {page}-after.png
   e. For charts/tables: use evaluate to get confirmed pixel coordinates:
      curl -s -X POST http://127.0.0.1:10086/command \
        -d '{"action":"evaluate","args":{"code":"JSON.stringify([...document.querySelectorAll(\".recharts-wrapper\")].map((el,i)=>{const r=el.getBoundingClientRect();return{i,cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2)}}))"},"session":"explore"}'
5. Write projects/{productname}/exploration/findings.md with:
   - Page name | Real URL | Load time (s) | Impressiveness 1-5 | Interactive elements + confirmed pixel coordinates
Return ONLY a summary of pages found and your top 10 candidates ranked by visual impact.
```

Wait for subagent to complete. Read `findings.md`.

---

## PHASE 2 — Shot List

**Switch back to Opus for curation.**

Using `findings.md`, rank and select 10–12 scenes:

For each scene write:
```
Scene N — {Page Name}
URL: {from findings.md — never assumed}
Interaction: {exact steps: hover-xy at x,y | click-nth .group.grid index 0}
startFrom: {load time in seconds from findings.md}
Duration: {seconds of actual product interaction to show}
Creative pattern: {from visual-excellence.md Creative Arsenal table}
Music preset: tension | hopeful | corporate-bg | cta
Viewer feels: {one emotion or insight}
```

Also plan motion graphic scenes (Hook, Problem, Promise, Stats, Pricing, CTA) with remotion-bits component.

**Human checkpoint:** Present shot list. Get approval. Write to `projects/{productname}/exploration/shotlist-approved.md`.

---

## Output: phase1-report.html

**Always include 3 design direction option cards** in the report — not just the shot list.
The user must confirm a design direction before `/pdv-build` starts.

Write `projects/{productname}/exploration/phase1-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Phase 1 — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:960px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
.card{background:#111;border-radius:8px;overflow:hidden;border:1px solid #222}
.card img{width:100%;height:140px;object-fit:cover}
.card-body{padding:12px}
.score{background:#22c55e22;color:#22c55e;padding:2px 8px;border-radius:4px;font-size:12px}
/* Design direction options */
.options-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:24px 0}
.option-card{background:#111;border:2px solid #222;border-radius:12px;padding:20px;cursor:pointer;transition:border-color .2s}
.option-card:hover,.option-card.selected{border-color:#3b82f6}
.palette{display:flex;gap:6px;margin:12px 0}
.swatch{width:32px;height:32px;border-radius:6px}
.font-sample{font-size:18px;font-weight:700;margin:8px 0}
.option-label{font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em}
.select-btn{width:100%;padding:8px;background:#18181b;border:1px solid #333;border-radius:6px;color:#f5f5f5;cursor:pointer;margin-top:12px;font-size:13px}
.select-btn:hover{background:#27272a}
table{width:100%;border-collapse:collapse;margin:24px 0}
td,th{padding:10px 12px;border-bottom:1px solid #222;font-size:13px}
th{color:#a1a1aa;font-weight:500}
code{background:#1a1a1a;padding:2px 6px;border-radius:3px;font-size:12px}
</style></head><body>
<h1>Phase 1 Report — {ProductName}</h1>
<p style="color:#a1a1aa">Explored {N} pages · {M} scenes selected</p>

<h2>Step 1: Choose a Design Direction</h2>
<p style="color:#a1a1aa">Select one direction before /pdv-build begins. Each option has different palette, typography, and motion character.</p>
<div class="options-grid">
  <div class="option-card" id="optA">
    <span class="option-label">Option A</span>
    <div class="font-sample" style="font-family:{fontA}">{headingA}</div>
    <div class="palette">
      <div class="swatch" style="background:{bg-A}"></div>
      <div class="swatch" style="background:{accent-A}"></div>
      <div class="swatch" style="background:{surface-A}"></div>
    </div>
    <p style="font-size:13px;color:#a1a1aa">{mood-A description}</p>
    <button class="select-btn" onclick="selectOption('A')">Use Option A</button>
  </div>
  <div class="option-card" id="optB">
    <span class="option-label">Option B</span>
    <div class="font-sample" style="font-family:{fontB}">{headingB}</div>
    <div class="palette">
      <div class="swatch" style="background:{bg-B}"></div>
      <div class="swatch" style="background:{accent-B}"></div>
      <div class="swatch" style="background:{surface-B}"></div>
    </div>
    <p style="font-size:13px;color:#a1a1aa">{mood-B description}</p>
    <button class="select-btn" onclick="selectOption('B')">Use Option B</button>
  </div>
  <div class="option-card" id="optC">
    <span class="option-label">Option C</span>
    <div class="font-sample" style="font-family:{fontC}">{headingC}</div>
    <div class="palette">
      <div class="swatch" style="background:{bg-C}"></div>
      <div class="swatch" style="background:{accent-C}"></div>
      <div class="swatch" style="background:{surface-C}"></div>
    </div>
    <p style="font-size:13px;color:#a1a1aa">{mood-C description}</p>
    <button class="select-btn" onclick="selectOption('C')">Use Option C</button>
  </div>
</div>
<div id="selected" style="display:none;padding:12px;background:#052e16;border-radius:8px;color:#22c55e;margin-bottom:24px">
  ✓ Selected: <strong id="selectedLabel"></strong> — Tell the assistant which option you chose, then run <code>/pdv-build "{ProductName}"</code>
</div>

<h2>Step 2: Approve Shot List</h2>
<table>
<tr><th>#</th><th>Scene</th><th>URL</th><th>Interaction</th><th>startFrom</th><th>Music</th><th>Pattern</th></tr>
{shot list rows}
</table>

<h2>Screenshots</h2>
<div class="grid">{screenshot cards}</div>

<script>
function selectOption(opt) {
  document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('opt'+opt).classList.add('selected');
  document.getElementById('selected').style.display='block';
  document.getElementById('selectedLabel').textContent = 'Option ' + opt;
}
</script>
</body></html>
```

Tell the user: "Review phase1-report.html then run `/pdv-build "{ProductName}"`"
