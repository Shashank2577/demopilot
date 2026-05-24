# Visual Excellence Reference

## Anti-Slop Rules (Non-Negotiable)

Run `npx impeccable detect` on every scene before final render.

### Color & Typography — NEVER
- No AI purple (`#6366f1`, `#8b5cf6`, `#a855f7`) as primary accent
- No Inter font — use Geist, Outfit, or Satoshi
- No pure `#000000` or `#ffffff` backgrounds — use `#0a0a0a` / `#fafafa`
- No `opacity: 0.5` gray text on gray backgrounds

### Layout — NEVER
- No 3-column feature cards (icon + title + 2 lines of copy)
- No centered hero + subtext + two CTA buttons + hero image
- No stock photography — only real product screenshots or motion graphics
- No fake round numbers without a source ("50% faster", "10x better")

### Motion — RULES
- Spring spec: `stiffness: 100, damping: 20` (not Remotion's default)
- Stagger: 30–50ms between items — never all-at-once
- Easing: `ease-out-expo` entrances, `ease-in-expo` exits
- Duration: micro-interactions 150–250ms, scene transitions 400–600ms
- Every animation must express cause-effect, never decorative only

## Scene Type Rules — Recording vs Motion-Graphic

Every scene is one of two types. They follow DIFFERENT visual rules. Do not mix them.

### Recording scenes (an `<OffthreadVideo>` of the real product)

The polished recording IS the content. Do not decorate it.

- **Ken Burns: BANNED.** Recording scenes get a pre-polished MP4 from OpenScreen
  (see `tool-map.md` → "OpenScreen CLI") that already contains semantic
  zoom-to-element effects driven by actual cursor coordinates. Applying a Remotion
  `scale = 1 + frame * 0.0002` transform on top produces the "screenshot zoom"
  slop look.
- **NO animated overlay cards** sliding in over the video (stat cards, badges,
  feature callouts). This is the PowerPoint-over-screenshot feel.
- **NO radial-gradient vignette** layered on the recording.
- **NO `scale` / `transform` on the `<OffthreadVideo>` itself.** `objectFit: "cover"` only.
- **Allowed decoration:** ONE corner label (bottom-left or bottom-right), small,
  e.g. scene title `"PROMPTS / view"`. That's it.
- **Allowed motion graphics adjacent to recording:** callout circles at confirmed
  pixel coordinates from `findings.md`, drawing in over 15–20 frames, then fading
  — these point AT the recording, they don't sit on top of it.

### Motion-graphic scenes (no recording — pure Remotion composition)

Full Creative Arsenal allowed. Use Skiper components, remotion-bits, conic-gradient
borders, Typewriter, AnimatedNumber, gradient transitions, 3D perspective text, etc.

## Visual Progression Rule (long scenes)

Any scene whose narration duration > 5s MUST have ≥3 distinct visual states
with timed transitions across the scene.

**Banned pattern:** spring animation completes in 15 frames, then holds the
same frame for 200+ frames.

**Acceptable progression patterns:**
- text reveal (0–30f) → diagram morph (60–120f) → callout pulse (150–180f)
- count-up number (0–60f) → unit label slides in (60–90f) → context line types (90–150f)
- recording plays (0–N) → callout circle draws on (N to N+20) → label fades in (N+20 to N+40)
- card slides in (0–20f) → border draw-on (20–60f) → counter increments (60–120f) → CTA arrow nudges (120–150f)

Each scene's TSX must show at least 3 timed `interpolate` / `spring` calls
operating on DIFFERENT elements at DIFFERENT frame ranges.

## Hook Scene Rule

The Hook scene (first scene) cannot be pure text on black. It MUST include
either:
- A product visual (recording snippet, screenshot, or in-progress motion graphic
  of the product UI), OR
- A strong motion graphic (animated diagram, particle system, gradient morph,
  large-format Typewriter on a gradient/textured background, conic-gradient ring)

Word-by-word reveal on a flat `#0a0a0a` background = bail in 3 seconds. Banned.

## CTA Scene Rule

The CTA end card cannot be a small centered card holding still for 6 seconds.

- **Size:** the CTA card / call-to-action element must fill ≥40% of frame
  (use viewport math: card width ≥ `0.4 * width` or card area ≥ `0.4 * width * height`).
- **Motion:** at least 2 distinct motion states. Examples:
  border draw-on + scale settle, conic-gradient rotation + URL counter type-in,
  arrow nudge + accent pulse, gradient sweep + button hover-like glow.
- **URL is correct.** Verify the displayed domain against findings.md before render.

## Design System Template

```ts
// src/theme.ts — write this in Phase 0, use everywhere
export const THEME = {
  accent: "#your-brand-hex",       // saturation < 80%, not purple
  bg: "#0a0a0a",
  surface: "#111111",
  text: { primary: "#f5f5f5", secondary: "#a1a1aa" },
  font: { heading: "Geist", body: "Outfit" },  // NOT Inter
  spring: { stiffness: 100, damping: 20 },
  stagger: 40,
} as const;
```

## Creative Arsenal — Act-to-Pattern Map

These patterns are for **motion-graphic scenes only** unless the row explicitly
references a recording.

| Act | Scene type | Premium Pattern | Skiper | remotion-bits |
|-----|-----------|-----------------|--------|---------------|
| Hook | motion-graphic | Rolling typewriter headline over gradient/product visual | skiper027/031 | `Typewriter` |
| Problem | motion-graphic | SVG node-link with stroke-dasharray draw-on | custom | `AnimatedText` |
| Promise | motion-graphic | 3D perspective text + gradient flash | skiper028/088 | `AnimatedText` word-split |
| Tour | **recording** | Polished OpenScreen MP4 + corner label + optional callout circle | skiper016/017 (frame for browser chrome only, no overlay on video) | — |
| Wow | recording or motion-graphic | Animated Callout Circles at confirmed coordinates pointing at recording | custom | — |
| Stats | motion-graphic | Count-up numbers with unit label | skiper037/069 | `AnimatedNumber` |
| Pricing | motion-graphic | Animated table, competitor line-through | skiper090 | — |
| CTA | motion-graphic | Rotating conic-gradient border card filling ≥40% of frame | skiper090 | — |

## Skiper UI API

URL: `https://skiper-ui.com/v1/skiperN` (NO zero-padding: `/v1/skiper6` not `/v1/skiper006`)
Local snippets: `~/.claude/skills/demopilot/ref/skiper-components/`
Concrete imports + signatures + examples: see `tool-map.md` → "Skiper UI components".

## Quality Gate Commands

```bash
npx impeccable detect     # anti-patterns
npx impeccable /animate   # motion audit
npx impeccable /color     # contrast + palette
```
