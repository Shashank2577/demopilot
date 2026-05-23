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

| Act | Premium Pattern | Skiper | remotion-bits |
|-----|----------------|--------|---------------|
| Hook | Rolling typewriter headline | skiper027/031 | `Typewriter` |
| Problem | SVG node-link with stroke-dasharray draw-on | custom | `AnimatedText` |
| Promise | 3D perspective text + gradient flash | skiper028/088 | `AnimatedText` word-split |
| Tour | Browser mockup + Ken Burns on recording | skiper016/017 | — |
| Wow | Animated Callout Circles at coordinates | custom | — |
| Stats | Count-up numbers with unit label | skiper037/069 | `AnimatedNumber` |
| Pricing | Animated table, competitor line-through | skiper090 | — |
| CTA | Rotating conic-gradient border card | skiper090 | — |

## Skiper UI API

URL: `https://skiper-ui.com/v1/skiperN` (NO zero-padding: `/v1/skiper6` not `/v1/skiper006`)
Local snippets: `~/.claude/skills/demopilot/ref/skiper-components/`

## Quality Gate Commands

```bash
npx impeccable detect     # anti-patterns
npx impeccable /animate   # motion audit
npx impeccable /color     # contrast + palette
```
