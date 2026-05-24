# Common Mistakes

| Mistake | Fix |
|---------|-----|
| `...` ellipsis in narration text | Use `<break time="0.5s"/>` or a new paragraph |
| Using `target_duration` for sequence frames | Always ffprobe actual WAV — use `actual_duration` |
| Skiper API `/v1/skiper001` returns 404 | No zero-padding: use `/v1/skiper1` |
| CSS `:nth-of-type` on class names silently fails | Use `hover-xy` with WebBridge-confirmed coords |
| Sequence shorter than narration audio | Minimum: `Math.ceil(actual_duration * fps) + 45` |
| Inter font anywhere | Use Geist, Outfit, or Satoshi |
| Purple as accent color | Pick any other hue, saturation < 80% |
| All animations enter simultaneously | Stagger 30–50ms between elements |
| Background music drowning narration | `volume={0.06}` maximum |
| `startFrom` guessed from code review | Use TimelineRecorder — measure actual elapsed time |
| `@remotion/transitions` version mismatch | Must exactly match `remotion` package version |
| Assumed URLs (wrong URLs = 404 recordings) | Always navigate from sidebar in Phase 1 |
| Claude context compaction corrupting scenes | Use Gemini for bulk TSX generation |
| Files not namespaced by product | All paths under `projects/ProductName/` |
| Phase 1 screenshots filling main context | Delegate to Explore subagent — returns findings.md only |
| `fs.rmdirSync` in recording pipeline (Node ≥ 16) | Use `fs.rmSync(path, { recursive: true, force: true })` |
| culori missing — webpack fails silently, exit code 0 | Run `npm install culori` in project root before first render |
| Recording TSX references wrong filename | Format is always `{scene_id}-{name}.mp4` e.g. `scene04-commits.mp4` |
| React early return before hook calls — frame 60 crash | Move ALL hook calls (useCurrentFrame, spring, interpolate) ABOVE any conditional return |
| auth-state.json exists but Clerk/SSO redirects to login | auth-state.json can expire — validate by navigating to dashboard and checking page title ≠ "Sign In" |
| Recording script silently no-ops on empty page — `if (count > 0)` guard skips missing selector, captures blank | Remove ALL `if (count > 0)` guards from recording scripts; throw on missing selector so Phase 4 fails loudly. Empty page = pipeline aborts, not silent pass. |
| Hash-named `.webm` files in `recordings/` (`page@<sha256>.webm`) — no audit trail when renames mis-order | Immediately after each `ctx.close()`, rename the produced file to `scene-NN-<slug>.mp4` inside the recording script — never trust a separate later rename pass. |
| Tooltip / hover popover frozen in last frame of recording | Before `ctx.close()`: press Escape, move mouse to a neutral coordinate (`page.mouse.move(10, 10)`), click on empty body area, `await page.waitForTimeout(500)`. |
| Ken Burns applied to every recording — looks like screenshot zoom | Ken Burns is for motion-graphic scenes with a still image only. Recording scenes get an OpenScreen-polished MP4 with real cursor-driven zooms — NO `transform: scale(...)` on the `<OffthreadVideo>`. |
| Animated overlay cards on top of a recording (PowerPoint feel) | Recording scenes get ONE small corner label max. No `position: absolute` stat cards / badges / feature callouts over the video. Move data overlays to a dedicated motion-graphic scene before or after the recording. |
| Exploration screenshots in subagent memory but never on disk — approval UI shows broken images | Every `page.screenshot()` MUST use `path: 'exploration/screenshots/<page>.png'` and the subagent MUST `fs.statSync(path)` after each capture to assert the file exists. Subagent return value lists the paths, not descriptions. |
| Recording script doesn't match narration's described navigation (Sonnet hallucinates new-tab clicks, wrong-element expands) | Generate recording scripts from the **structured narration steps array** (`[{action, target, expected}, ...]`) extracted from storyboard JSON, NOT from prose. Each step's `target` must reference a coordinate or selector confirmed in `findings.md`. |
| Gemini wrote plain `<div>`s with inline styles instead of Skiper components | Gemini prompt MUST inline the concrete import + signature + minimal usage example from `tool-map.md` for every Skiper / remotion-bits component the scene is supposed to use. Saying "use Skiper" without contracts → fallback to plain React every time. |
| Empty page recorded as "successful" demo (zero commits, 0% match rate, "NO DATA YET") | Phase 4 pre-flight: for every recording scene, assert the `expected_content` from `findings.md` (e.g. `"≥3 commit rows"`, `"match rate > 0%"`) is present on the page before starting recordings. If absent → abort with a content-gate error, surface to user. |
| Wrong account used in Phase 4 — demo shows zero data even though Phase 1 saw real data | Pre-flight account-data continuity check at start of Phase 4: navigate to a known data page, run the same content assertions used in Phase 1, compare against `findings.md` counts. If counts differ by more than tolerance → abort, ask user to fix auth. |
| User never saw the actual recordings before final render — only the storyboard | Post-recording review gate: after Phase 4 recordings complete, open a Reveal.js review UI showing each polished MP4 side-by-side with its narration; pipeline blocks on `decisions.json` having `{recordings_approved: true}` (timestamp newer than the recording mtimes) before invoking `pdv-render`. |
| "LOADING..." captured in recording | Add `waitForStableContent(page, selector)` helper that polls `textContent` until it stops changing for 500ms AND does not match `/loading|…|spinner/i`. Call before every interaction in recording scripts. `waitForNetworkIdle` + `waitForTimeout` is not enough. |
