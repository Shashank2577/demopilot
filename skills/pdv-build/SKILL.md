---
name: pdv-build
description: "Use as Step 3 of DemoPilot after reviewing phase1-report.html. Writes the storyboard, generates Remotion scene components via Gemini, and writes Playwright RecordingScripts. Outputs phase2-report.html for human review before rendering."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 3: Build

**Storyboard: Opus** | **Remotion code: Gemini** | **Recording scripts: Sonnet** | **Quality review: full design stack**

## Setup

```
ProductName = argument (e.g. "OBSERVE")
ProjectRoot = "projects/{productname}/"
Read: ProjectRoot/exploration/findings.md
Read: ProjectRoot/exploration/shotlist-approved.md
Read: ProjectRoot/src/theme.ts
```

**Read these before any frontend work:**
- `~/.claude/skills/demopilot/ref/design-stack.md` — mandatory tool invocation rules
- `~/.claude/skills/demopilot/ref/visual-excellence.md` — anti-slop + creative arsenal

**Invoke the design stack now (before writing a single line of TSX):**
1. `/design-taste-frontend` — set DESIGN_VARIANCE dial, review Creative Arsenal for each act
2. `/emil-design-eng` — confirm animation craft standards (spring, stagger, easing)
3. For each motion graphic scene: check Skiper UI before building anything custom

---

## PHASE 3 — Storyboard + Narration

**Opus for this entire phase.**

For each scene in the approved shot list, write:
```
Scene N: {Act Name}
Type: recording | motion-graphic
Duration target: {N}s (narration will determine actual duration — never truncate)
On screen: {exact description}
Narration: {text}
  Rules:
  - NO ... ellipsis (TTS vocalizes it). Use <break time="0.5s"/> or paragraph break
  - 8-12 words per second
  - Specific numbers: "forty percent", "one hundred and seventy dollars"
  - Em-dashes for natural pauses
Components: {remotion-bits component | Skiper skiper{N} | custom}
Music preset: {tension|hopeful|corporate-bg|cta}
```

**Duration rule:** Narration drives length. Never truncate narration to hit a time target. Remove scenes instead.

Write storyboard to: `projects/{productname}/storyboard/storyboard.md`

**Human checkpoint:** Show storyboard. Get narration tone approval before generating code.

Write approved storyboard to: `projects/{productname}/storyboard/approved.md`

---

## PHASE 4A — Remotion Scene Components (via Gemini)

**Use Gemini CLI for all TSX generation — prevents Claude context compaction across 10+ scene files.**

```bash
gemini -p "@projects/{productname}/src/theme.ts \
  @projects/{productname}/storyboard/approved.md \
  Write complete Remotion TSX scene files for all scenes in the storyboard.
  Rules:
  - Use THEME constants from theme.ts throughout — never hardcode colors/fonts/springs
  - Import remotion-bits: AnimatedText, Typewriter, AnimatedNumber, GradientTransition
  - Use TransitionSeries with fade() transitions (20 frames)
  - Ken Burns on every OffthreadVideo: const scale = 1 + useCurrentFrame() * 0.0002
  - Spring config: always THEME.spring = {stiffness:100, damping:20}
  - Stagger: always THEME.stagger = 40ms
  - No Inter font anywhere
  Output each as a complete file: src/scenes/SceneN.tsx"
```

Copy the output files to `projects/{productname}/src/scenes/`.

**Per-scene quality gate (mandatory for every scene, not just at the end):**
1. `/design-taste-frontend` — anti-slop check against Creative Arsenal
2. `/emil-design-eng` — animation craft review (spring, stagger, interruptibility)
3. Skiper check — could any Skiper component replace custom code?
```bash
cd projects/{productname}
npx impeccable detect    # anti-patterns
npx impeccable /animate  # motion audit
npx impeccable /color    # contrast
```
Fix ALL issues before moving to the next scene. Never batch fixes at the end.

---

## PHASE 4B — Playwright RecordingScripts (Sonnet)

For each recording scene in the shot list, write `projects/{productname}/scripts/record-{scene}.ts`:

```typescript
import { RecordingScript } from "../../../pipeline/types";
import { TimelineRecorder } from "../../../pipeline/record/timeline-recorder";

export const record{SceneName}: RecordingScript = {
  id: "{scene-id}",
  productName: "{ProductName}",           // always include product name
  url: "{url-from-findings.md}",          // from Phase 1 — never assumed
  viewport: { width: 1920, height: 1080 },
  steps: [
    { action: "navigate", url: "{url}" },
    { action: "wait", ms: {load-time-ms} },
    // Use hover-xy for charts/SVG/virtual scroll — never :nth-of-type on class names
    { action: "hover-xy", x: {cx}, y: {cy} },    // coords from findings.md
    { action: "wait", ms: 1500 },
    { action: "click-nth", selector: ".group.grid", index: 0 },
    { action: "wait", ms: 2000 },
  ],
};
```

Also write `projects/{productname}/config.ts` wiring all scenes + product metadata:
```typescript
export const PROJECT_CONFIG = {
  productName: "{ProductName}",
  projectRoot: "projects/{productname}",
  scenes: [/* all RecordingScript imports */],
};
```

---

## Output: phase2-report.html

**Present 3 storyboard opening directions** before the full scene list — the user picks one.
Options should differ in narrative tone (e.g., Urgent vs Empathetic vs Confident), not just visual style.
Use the `/design-taste-frontend` and `/emil-design-eng` skills to inform the motion character of each option.

Write `projects/{productname}/storyboard/phase2-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Phase 2 — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
.scene-card{background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:12px 0}
.act-tag{background:#18181b;color:#a1a1aa;padding:2px 8px;border-radius:4px;font-size:12px}
.narration{color:#a1a1aa;font-style:italic;margin:8px 0}
.duration{color:#22c55e;font-size:13px}
.components{font-size:12px;color:#6366f1}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #222}
</style></head><body>
<h1>Phase 2 Report — {ProductName}</h1>
<p style="color:#a1a1aa">Estimated runtime: {total}s ({M}m {N}s) · {K} scenes</p>

{scene cards with act name, narration preview, duration, components used, music preset}

<h2>Scene Files Generated</h2>
<table>
<tr><th>Scene</th><th>File</th><th>Type</th><th>Status</th></tr>
{rows: recording scripts + Remotion components}
</table>

<p>Next step: <code>/pdv-render "{ProductName}"</code></p>
</body></html>
```

Tell the user: "Review phase2-report.html then run `/pdv-render "{ProductName}"`"
