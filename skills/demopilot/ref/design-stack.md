# Mandatory Frontend Design Stack

**Every time you create any frontend output — motion graphic scenes, HTML review files, report pages, scene components, walkthroughs, runbooks, pitch decks — you MUST invoke all of these. No exceptions.**

## The 5 Tools (Always Used Together)

### 1. `/ui-ux-pro-max`
Invoke FIRST. Sets the design system: palette, font pairing, spacing scale, component style.
- Run at Phase 0 before any component is built
- Use `--domain color` for palette, `--domain typography` for fonts
- Never skip this — it sets the quality ceiling for everything that follows

### 2. `/design-taste-frontend` (taste-skill)
Anti-slop enforcement + Creative Arsenal patterns.
- DESIGN_VARIANCE dial: push to 7–9/10 (avoid safe/generic)
- MOTION_INTENSITY dial: 6–8/10 for demos
- VISUAL_DENSITY: match the product's information density
- Spring spec from taste-skill: `stiffness: 100, damping: 20`
- Check before writing any component: "Would this pass the taste filter?"

### 3. `/emil-design-eng`
Animation craft + micro-interaction quality.
- Invoke when writing any animation, transition, or interactive element
- Spring physics over cubic-bezier wherever possible
- Every transition must have spatial meaning (not just opacity fade)
- Interruptible animations — never block user input
- Scale feedback: 0.95 on press, 1.0 on release

### 4. `npx impeccable detect` (CLI quality gate)
Automated anti-pattern detection. Run after every scene component is written.
```bash
npx impeccable detect     # anti-patterns
npx impeccable /animate   # motion audit
npx impeccable /color     # contrast check
```
Fix every issue before moving forward. Zero tolerance.

### 5. Skiper UI (`https://skiper-ui.com/v1/skiperN`)
Component library for premium animated patterns. Check before building anything from scratch.
- API: `https://skiper-ui.com/v1/skiperN` (NO zero-padding)
- Local snippets: `~/.claude/skills/demopilot/ref/skiper-components/`
- Always prefer an existing Skiper component over custom implementation

## Invocation Order

```
1. /ui-ux-pro-max          → get palette + fonts + spacing
2. /design-taste-frontend  → set DESIGN_VARIANCE dial, check Creative Arsenal
3. /emil-design-eng        → define animation craft standards
4. BUILD the component     → using all three above
5. npx impeccable detect   → verify zero anti-patterns
6. Skiper check            → could any Skiper component replace custom code?
```

## Applies To ALL Frontend Work Including

- Remotion scene components (SceneHook, SceneTour, etc.)
- HTML review gates (phase1-report.html, phase2-report.html, phase3-report.html)
- theme.ts design system file
- Pipeline report pages
- Future: pitch deck slides, walkthrough frames, runbook pages

## When Giving HTML to the User

NEVER give a single option. Always present **2–3 design directions** as clickable option cards in the HTML itself:

```html
<!-- Each design direction gets its own preview card -->
<div class="options-grid">
  <div class="option-card" data-option="A">
    <div class="preview"><!-- mini preview --></div>
    <h3>Option A — Minimal Dark</h3>
    <p>Clean, typographic focus. Best for developer tools.</p>
    <button onclick="selectOption('A')">Use This Direction</button>
  </div>
  <div class="option-card" data-option="B">
    <!-- ... -->
  </div>
  <div class="option-card" data-option="C">
    <!-- ... -->
  </div>
</div>
```

Options should differ meaningfully: e.g., Minimal vs Dynamic vs Cinematic, or Dark vs Light vs Gradient. Not cosmetic variations — actual design directions.
