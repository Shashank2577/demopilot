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
| Static `OffthreadVideo` looks like a screenshot | Ken Burns: `scale = 1 + frame * 0.0002` |
| All animations enter simultaneously | Stagger 30–50ms between elements |
| Background music drowning narration | `volume={0.06}` maximum |
| `startFrom` guessed from code review | Use TimelineRecorder — measure actual elapsed time |
| `@remotion/transitions` version mismatch | Must exactly match `remotion` package version |
| Assumed URLs (wrong URLs = 404 recordings) | Always navigate from sidebar in Phase 1 |
| Claude context compaction corrupting scenes | Use Gemini for bulk TSX generation |
| Files not namespaced by product | All paths under `projects/ProductName/` |
| Phase 1 screenshots filling main context | Delegate to Explore subagent — returns findings.md only |
