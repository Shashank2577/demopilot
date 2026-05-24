# DemoPilot — Problems Log

> **Status — Round 1 + 1.5 complete (2026-05-24).** 22 of 24 originally-inventoried problems are fixed in the skill files. 1 new problem class (E1 — phantom dependencies) surfaced during fixing and got two passes: Round 1 caught the existence-gap; Round 1.5 corrected a wrong assumption about how the libraries are actually distributed (shadcn-style installers, not runtime imports). 1 deferred to Round 2 (D6). 1 per-project, not skill-level (C4).
>
> **Source:** Generated from the Prompture demo run. See `/Users/shashanksaxena/projects/demopilot/projects/prompture/output/demo.mp4` for the original failing artifact.

---

## Round 1 — What Got Fixed Where

| Issue | Status | Fixed in (file) |
|-------|--------|-----------------|
| A1 — content gate before recording | ✅ | pdv-render (STEP 3 `assertExpectedContent`) + pdv-explore (`expected_content` schema in findings.md) |
| A2 — account/data continuity | ✅ | pdv-render (STEP 2 `preflight-content-gate.js`); pdv-explore writes single `auth_state_path` to `.demopilot-state` |
| A3 — post-recording review gate | ✅ | pdv-render (STEP 8 `review.html` + decision server) |
| A4 — silent script no-ops | ✅ | pdv-render (STEP 5 `safeClick`/`safeHover` throw with selector + URL) |
| A5 — loading-state detection | ✅ | pdv-render (STEP 4 `waitForStableContent` helper) |
| A6 — tooltip dismissal | ✅ | pdv-render (STEP 5 tail: Escape → click(50,50) → 500ms → close) |
| A7 — OpenScreen polish step | ✅ | pdv-render (STEP 7) + tool-map.md "OpenScreen CLI" + pdv-validate probe #14 |
| A8 — screenshot persistence | ✅ | pdv-explore (Phase 1 "Screenshots MANDATORY" + parent assertion gate) |
| A9 — hash-named recordings | ✅ | pdv-render (STEP 5 immediate rename to `scene-NN-<slug>.webm`) |
| A10 — narration↔script mismatch | ✅ | pdv-explore emits `exploration/scene-steps.yaml`; pdv-build generates scripts deterministically (Phase 4C, no LLM) |
| B1 — Ken Burns mandatory | ✅ | pdv-build (Phase 4B Step 2 scene-type rules) + visual-excellence.md |
| B2 — animated overlays on recordings | ✅ | pdv-build (Phase 4B Step 2 motion-graphic vs recording-polish split) |
| B3 / D5 — visual progression rule | ✅ | pdv-build (Phase 4B Step 2 + per-scene brief animation choreography) + visual-excellence.md |
| B4 — hook is words on black | ✅ | pdv-build (Phase 4B Step 2 hook scene rule — pure text on black BANNED) |
| B5 — proof cards static | ✅ | Covered by B3/D5 visual-progression rule |
| B6 — CTA tiny static | ✅ | pdv-build (Phase 4B Step 2 CTA scene rule: ≥40% of frame, ≥2 motion states) |
| C1 — empty states shown | ✅ | Covered by A1 content gate |
| C2 — core metrics zero | ✅ | Covered by A2 account continuity |
| C3 — "WHAT WENT WRONG" visible | ✅ | Covered by A1 content gate (page-specific selector assertions) |
| C4 — wrong URL in CTA | ⚪ | Per-project (project's theme.ts / CTA template). Not a skill bug. |
| D1 — no Skiper/remotion-bits API contracts | ✅ | pdv-build Step 1.5 installs components per scene → Step 2 receives `INSTALLED_COMPONENTS` inventory with project-local imports; tool-map.md documents shadcn-installer pattern (no fabricated imports) |
| D2 — guessed CSS selectors | ✅ | pdv-build (Phase 4C deterministic generator + coord lint against findings.md) |
| D3 — design skill output not enforced | ✅ | pdv-build (Phase 4B Step 1 per-scene brief flow: Claude writes `<project>/scene-NN-brief.md`, fed to Gemini alongside theme.ts + API contracts) |
| D4 — motion-graphic vs recording undistinguished | ✅ | Covered by B2 split |
| D5 — no visual progression rule | ✅ | See B3/D5 above |
| D6 — per-scene human review between scenes | 🟡 | **Deferred to Round 2** — pipeline restructure, not a patch. Currently one Phase-0 design pass feeds all scenes. |
| D7 — approval doesn't gate pipeline | ✅ | pdv-render (STEP 8 `wait-for-decisions.js` blocks on decisions.json mtime + all `approved`) |
| D8 — no frame preview during render | ✅ | pdv-render (STEP 13: `--studio-first` flag or contact-sheet HTML opened at ~33%) |
| E1 — phantom dependencies (NEW) | ✅ | pdv-validate (probes #14 OpenScreen, #15 remotion-bits, #16 Skiper components) |

---

## E. New Class Surfaced During Fixing — Phantom Dependencies

### E1. Tools referenced by the pipeline but never installed/scaffolded

Discovered while inlining "concrete API contracts" into the Gemini prompt.

**Round 1 fix (existence gap):** pdv-validate now probes all three tools (OpenScreen, remotion-bits, Skiper). OpenScreen and remotion-bits fail loud with install instructions if absent. Skiper specs presence is informational.

**Round 1.5 fix (distribution-model correction):** the Round 1 fix assumed remotion-bits and Skiper exposed runtime package imports. Verified by installation:

- **`remotion-bits`** is npm-installable but exposes only a CLI (`npx remotion-bits find / fetch / mcp`). The runtime components must be **fetched per-scene** and copied into `<project>/src/components/<Name>.tsx`. Registry: 62 items (10 components, 9 utils/hooks, 40+ example bits). Sample component IDs: `animated-text`, `animated-counter`, `type-writer`, `matrix-rain`, `gradient-transition`, `staggered-motion`, `code-block`, `particle-system`, `scene-3d`, `scrolling-columns`. Also exposes an MCP server mode for optional integration.
- **Skiper** is a shadcn-compatible registry. 104 component specs are pre-cataloged at `~/.claude/skills/product-demo-video/skiper-components/skiperNN.md` (canonical location). Per-component install: `npx shadcn add @skiper-ui/skiperNN` → writes to `<project>/src/components/v1/skiperNN.tsx`. Verified component exports include skiper16 (`StickyCard_001`), skiper17 (`StickyCard002`), skiper27 (`RollingText`), skiper31 (text scroll), skiper90 (`Skiper90` + gradient cards).
- The previously-empty `skills/demopilot/ref/skiper-components/` dir is now redundant — the canonical specs path is documented; that empty dir is flagged for cleanup.

**New pipeline mechanic** to support the corrected distribution model:
- **pdv-build Phase 4B Step 1.5 — Component install gate.** Per scene, Claude's brief names `components:` (remotion-bits + Skiper IDs). Step 1.5 runs `npx remotion-bits fetch <name> --json` and `npx shadcn add @skiper-ui/skiperNN` per ID, writes the source files, and asserts file existence. Then it assembles an `INSTALLED_COMPONENTS` record (ID + project-local path + exports + verified usage example) which Gemini receives in Step 2. The Gemini prompt now hard-bans fabricated imports from `remotion-bits` / `@skiper-ui/...` — every import must be a `@/components/...` path tied to a Step-1.5 installation.

**Side effects on the user's project tree** (now documented in master SKILL.md):
- pdv-validate may run `npm install remotion-bits` in the project if absent.
- pdv-build runs `npx remotion-bits fetch` and `npx shadcn add` per-scene, writing component files into `<project>/src/components/` and `<project>/src/components/v1/`.
- All effects are scoped to the project dir; the new `<project>/components-inventory.md` audit file lists every component installed for a given run.

---

## File Changes — Round 1

| File | Owner agent | Key changes |
|------|-------------|-------------|
| `skills/demopilot/SKILL.md` | master orchestrator | New pipeline diagram, artifact map, `.demopilot-state` key map, 9 explicit gates, scene-type rules, model routing updated (script gen now deterministic) |
| `skills/pdv-validate/SKILL.md` | validate | Added probes #14 (OpenScreen), #15 (remotion-bits CLI + MCP reachability), #16 (Skiper specs at canonical path + shadcn CLI availability); new toolchain.json keys: `openscreen_cli`, `remotion_bits_resolved`, `remotion_bits_cli`, `remotion_bits_mcp_available`, `skiper_specs_dir`, `skiper_specs_count`, `shadcn_cli_available` |
| `skills/pdv-explore/SKILL.md` | explore | Screenshot persistence + assert gate; `expected_content` YAML per page; `exploration/scene-steps.yaml` machine-readable steps; single shared auth state |
| `skills/pdv-build/SKILL.md` | build | Two scene-type templates; per-scene brief flow with `components:` field; **Step 1.5 component install gate** (`npx remotion-bits fetch` + `npx shadcn add` per scene); `INSTALLED_COMPONENTS` inventory passed to Gemini with project-local imports only; deterministic recording-script generator; coord lint; viewport plumbed from state |
| `skills/pdv-render/SKILL.md` | render | Content gate; account continuity check; strict scripts; `waitForStableContent`; tooltip-dismissal tail; OpenScreen polish step; `review.html` + decision server gate; frame-preview contact sheet; viewport plumbed from state; `render_decisions_json` state key |
| `skills/demopilot/ref/visual-excellence.md` | refs | Recording vs motion-graphic rules; visual-progression rule; hook + CTA scene rules; Ken Burns demoted from mandatory |
| `skills/demopilot/ref/tool-map.md` | refs | remotion-bits documented as shadcn-style CLI installer (verified 62-item registry, install-then-import-from-`@/components/...` recipe); Skiper documented as shadcn registry with canonical specs at `~/.claude/skills/product-demo-video/skiper-components/` (104 specs); OpenScreen CLI section; Gemini-CLI prompt requires `components-inventory.md` and bans `from "remotion-bits"` / `from "@skiper-ui/..."` |
| `skills/demopilot/ref/common-mistakes.md` | refs | 12 new entries (silent no-ops, hash-named files, frozen tooltips, Ken Burns abuse, overlay-on-recording, missing screenshots, etc.) |

---

## Artifacts and `.demopilot-state` Keys (Post-Round-1)

**Pipeline artifacts:**
- `auth/auth-state.json` — single auth state for whole pipeline (Phase 0)
- `exploration/findings.md` — per-page with `expected_content` YAML block
- `exploration/screenshots/<slug>-{full,viewport}.png` — persisted, asserted before Phase 2
- `exploration/scene-steps.yaml` — machine-readable narration steps per scene
- `exploration/decisions.json` — storyboard approval, mtime-gated
- `exploration/expected_content.yaml` — extracted index of selectors by page
- `<project>/scene-NN-brief.md` — Claude-authored, fed to Gemini
- `<project>/src/scenes/Scene*.tsx` — Gemini-generated, lint-validated
- `<project>/scripts/record-scene-NN-<slug>.ts` — deterministic from scene-steps.yaml
- `<project>/public/recordings/scene-NN-<slug>.webm` — raw Playwright
- `<project>/public/recordings/scene-NN-<slug>-polished.mp4` — OpenScreen output (consumed by Remotion)
- `<project>/public/recordings/scene-NN-<slug>.interactions.json` — timestamps + coords feeding OpenScreen
- `<project>/recordings/review.html` — post-recording review UI
- `<project>/recordings/decisions.json` — review approval, mtime-gated
- `<project>/render-preview/frame-NNNN.png` — every-30th-frame samples

**`.demopilot-state` keys:**
- `auth_state_path` (set by pdv-explore Phase 0b)
- `findings_md` (set by pdv-explore Phase 1)
- `screenshots_dir` (set by pdv-explore Phase 1)
- `scene_steps_yaml` (set by pdv-explore Phase 2)
- `decisions_json` (set by pdv-explore Phase 2 — storyboard approval)
- `viewport` (set by pdv-render STEP 6 setup — default 1920×1080)
- `render_decisions_json` (set by pdv-render STEP 8 — review approval)
- `phase_completed` (incremented per phase)

---

## Round 2 Roadmap

**D6 — per-scene human review between scene builds.** Today: one Phase-0 design decision feeds every scene; user only reviews final video. Goal: build scene 1 → review → build scene 2 → review → ... Requires pipeline restructure (scenes become independently re-buildable units with persistent state and resume support). Defer until Round 1 demonstrably ships a clean demo.

---

## Original Inventory (preserved for reference)

### The Four Phantom Promises (post-mortem TL;DR)

| What the skill claimed                 | What actually happened (now fixed in Round 1)                       |
|----------------------------------------|---------------------------------------------------------------------|
| Design skills enforce quality          | Now encoded into theme.ts AND per-scene briefs (D3); Gemini gets concrete contracts (D1). |
| Skiper components are used             | tool-map.md has real imports + signatures (TODO(verify-install) where uncertain); pdv-validate probes installation; pipeline forbids fabricated imports. |
| Exploration screenshots drive approval | Subagent now saves PNGs to disk; parent skill asserts existence before Phase 2 unlocks. |
| Human approval gates each phase        | pdv-explore + pdv-render both block on decisions.json mtime + content; CLI fallback prompts. |

### Symptom → Root cause table (for posterity)

| Symptom seen in May 24 video                    | Root cause                                                  | Fix |
|-------------------------------------------------|-------------------------------------------------------------|-----|
| Screenshot-zoom on all product scenes           | B1 Ken Burns mandatory                                       | Removed from Gemini prompt; OpenScreen handles semantic zoom |
| Floating stat overlay cards                     | B2/D4 no scene-type split                                    | Two scene templates; corner label only on recordings |
| Empty showcase/commits/dashboard                | A1/A2/C1/C2 no content gate, wrong account                   | Content gate + account continuity check |
| Red X frozen for 10 seconds                     | B3/D5 no visual-progression rule                             | ≥3 visual states for >5s scenes |
| Stuck tooltips on commits page                  | A6 no tooltip dismissal                                      | Escape + neutral click tail |
| "LOADING..." captured in Product Signal         | A5 no loading-state detection                                | `waitForStableContent` helper |
| Hook is 9s of words on black                    | B4/D1 no Skiper contract                                     | Hook rule banned text-on-black; concrete API contracts inlined |
| Commit scene doesn't show narrated flow         | A10 script doesn't match narration                           | Deterministic generator from `scene-steps.yaml` |
| Cursor invisible / no zoom or click feedback    | A7 no Open Screen                                            | OpenScreen polish step, real semantic zoom |
| No human saw recordings before render           | A3/D7/D8 no post-recording review or gate                    | `review.html` + decision server, mtime gate, contact-sheet preview |
| Guessed selectors that no-op silently           | D2 ignored findings.md coords                                | Deterministic generator + coord lint |
| AI Slop component design                        | D1/D3 Gemini has no skill access / no contracts              | Per-scene briefs + concrete contracts in prompt |

---

## Round 1 + 1.5 — Done. Time to test.

Next concrete action: run `/pdv-validate prompture` to confirm `cli-anything-openscreen`, `remotion-bits` (CLI + registry + MCP), Skiper specs at `~/.claude/skills/product-demo-video/skiper-components/`, and `shadcn` CLI availability all report correctly. Then re-run the full pipeline on prompture and compare the output to the May 24 baseline.

Repo cleanup (non-blocking): delete the empty `skills/demopilot/ref/skiper-components/` directory now that the canonical specs path is documented.
