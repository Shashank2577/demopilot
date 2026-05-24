---
name: pdv-validate
description: "Use as the first step of DemoPilot before any video production. Actually invokes every tool to prove it works, discovers exact interpreter paths, and writes toolchain.json. Always run before /pdv-explore."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 1: Validate

**Model: Haiku** (bash execution only — no judgment needed)

## What This Does

Proves every tool actually works by running it. Writes exact working paths to `toolchain.json`.
Every subsequent phase reads `toolchain.json` — no tool path is ever assumed again.
Verifies post-recording polish CLI (OpenScreen) and the Remotion component libraries the Gemini prompt expects to import.

## Setup

```
ProductName = argument (e.g. "OBSERVE")
ProjectRoot = projects/{productname}/    ← lowercase, no spaces
```

```bash
mkdir -p projects/{productname}
```

---

## Checks — Run Each, Capture Output

### 1. Node
```bash
node --version && which node
```

### 2. Python — find the real interpreter
```bash
python3 --version && which python3
# Also check common alt paths:
/opt/homebrew/opt/python@3.14/bin/python3.14 --version 2>/dev/null && echo "py314 OK"
/opt/homebrew/opt/python@3.13/bin/python3.13 --version 2>/dev/null && echo "py313 OK"
```

### 3. ffmpeg — must produce output
```bash
ffmpeg -version 2>&1 | head -1 && which ffmpeg
```

### 4. ffprobe — needed for duration measurement
```bash
ffprobe -version 2>&1 | head -1
```

### 5. Playwright
```bash
npx playwright --version 2>/dev/null && echo "playwright OK" || echo "MISSING: npm i -g playwright"
```

### 6. edge-tts — probe all known locations
```bash
# Standard
edge-tts --version 2>/dev/null && echo "edge-tts: system"

# uv venv location (most common on macOS)
~/.local/share/uv/tools/edge-tts/bin/python3 -m edge_tts --version 2>/dev/null && echo "edge-tts: uv-venv"

# pipx location
~/.local/pipx/venvs/edge-tts/bin/python3 -m edge_tts --version 2>/dev/null && echo "edge-tts: pipx"

# Find any edge_tts module across python envs
find ~/.local ~/.uv /opt/homebrew -name "edge_tts" -type d 2>/dev/null | head -5
```

Record the FIRST working path as `edge_tts_python`.

### 7. Voicebox (primary TTS — optional)
```bash
curl -s --max-time 2 http://127.0.0.1:17493/profiles 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('voicebox OK, profiles:', len(d))" 2>/dev/null || echo "NOT RUNNING (optional)"
```

### 8. WebBridge — must respond to ping
```bash
curl -s --max-time 3 \
  -H 'Content-Type: application/json' \
  -d '{"action":"ping","session":"validate"}' \
  http://127.0.0.1:10086/command 2>/dev/null | python3 -c "import sys,json; print('webbridge OK:', json.load(sys.stdin))" 2>/dev/null \
  || echo "MISSING: install and start kimi-webbridge"
```

### 9. Gemini CLI
```bash
gemini --version 2>/dev/null && which gemini || echo "MISSING (optional): install Gemini CLI"
```

### 10. impeccable
```bash
npx impeccable --version 2>/dev/null || echo "MISSING (optional)"
```

### 11. ACE-Step music (informational only — ffmpeg fallback always used)
```bash
# acestep is a Gradio web UI, not a CLI generator — ffmpeg ambient track is always used instead
echo "Music: ffmpeg ambient fallback (no acemusic CLI available)"
```

### 12. Remotion peer dependencies (required for render)
```bash
# culori must be present — webpack fails silently without it (exit code 0, video not produced)
node -e "require('culori'); console.log('culori OK')" 2>/dev/null \
  && echo "culori: found in node_modules" \
  || (cd projects/{productname} && npm install culori 2>/dev/null && echo "culori: installed" || echo "WARNING: install culori in projects/{productname} before render")
```

### 13. Auth state (if app requires login)
```bash
ls projects/{productname}/scripts/auth-state.json 2>/dev/null \
  && echo "auth-state.json: exists" \
  || echo "INFO: no auth-state.json — run Playwright codegen if app requires login"
```

**Auth state validity is NOT checked here** — it is checked live in pdv-render Step 1 by navigating to the app and confirming the page title is not a login/sign-in page.

### 14. OpenScreen CLI (required for pdv-render)
```bash
cli-anything-openscreen --version 2>/dev/null && which cli-anything-openscreen \
  || echo "MISSING: uv tool install cli-anything-openscreen"
```
Record path as `openscreen_cli` in toolchain.json. **Required** — pdv-render aborts at the polish step without it. Fail validation with install instructions if missing.

### 15. remotion-bits (required for pdv-build scene generation)
```bash
cd projects/{productname} 2>/dev/null && node -e "require.resolve('remotion-bits')" 2>/dev/null \
  && (npx remotion-bits find --limit 1 --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('remotion-bits: CLI OK,', len(d) if isinstance(d, list) else 'reachable')" 2>/dev/null || echo "remotion-bits: installed but CLI/registry unreachable") \
  || echo "MISSING in projects/{productname}: cd projects/{productname} && npm install remotion-bits"

cd projects/{productname} 2>/dev/null && npx remotion-bits mcp --help >/dev/null 2>&1 && echo "remotion-bits mcp: available" || echo "remotion-bits mcp: not available"
```
remotion-bits is shadcn-like. Installing the package gives you a CLI (`npx remotion-bits find/fetch/mcp`). Actual components are fetched per-scene by pdv-build and copied into `projects/{productname}/src/components/`. Per-project dependency. At first validation pass, `projects/{productname}` may not yet contain `package.json` (scaffolded later by pdv-explore). If `require.resolve` fails, record `remotion_bits_resolved: false`. **pdv-build re-verifies before invoking Gemini** and aborts if still false. Install command: `cd projects/{productname} && npm install remotion-bits`.

Record `remotion_bits_resolved` (bool), `remotion_bits_cli` (string, `"npx remotion-bits"`), and `remotion_bits_mcp_available` (bool) in toolchain.json.

### 16. Skiper components (optional — informational)
```bash
SKIPER_SPECS_DIR="$HOME/.claude/skills/product-demo-video/skiper-components"
if [ -d "$SKIPER_SPECS_DIR" ]; then
  COUNT=$(find "$SKIPER_SPECS_DIR" -name "skiper*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "skiper-specs: $COUNT components cataloged at $SKIPER_SPECS_DIR"
else
  echo "skiper-specs: MISSING — install product-demo-video skill or set SKIPER_SPECS_DIR"
fi

cd projects/{productname} 2>/dev/null && npx shadcn --version 2>/dev/null && echo "shadcn CLI: OK" \
  || echo "shadcn: MISSING — cd projects/{productname} && npx shadcn@latest init to enable Skiper installs"
```
Skiper distributes via shadcn. 104 component specs are cataloged at `~/.claude/skills/product-demo-video/skiper-components/`. Each spec lists its install command (`npx shadcn add @skiper-ui/skiperNN`). pdv-build decides per scene which Skipers to install, runs `shadcn add`, then feeds the corresponding .md spec to Gemini.

Record `skiper_specs_dir` (string, absolute path or null), `skiper_specs_count` (int), and `shadcn_cli_available` (bool) in toolchain.json.

---

## Write toolchain.json

After all checks, write `projects/{productname}/toolchain.json` with every confirmed path:

```json
{
  "product": "{ProductName}",
  "validated_at": "{ISO timestamp}",
  "node": "{which node output}",
  "python3": "{which python3 output}",
  "edge_tts_python": "{first working edge-tts interpreter path, or null}",
  "ffmpeg": "{which ffmpeg output}",
  "ffprobe": "{which ffprobe output}",
  "playwright": "npx playwright",
  "voicebox_url": "{http://127.0.0.1:17493 if responding, else null}",
  "webbridge_url": "{http://127.0.0.1:10086 if responding, else null}",
  "gemini": "{which gemini output, or null}",
  "openscreen_cli": "{which cli-anything-openscreen output, or null}",
  "remotion_bits_resolved": "{true|false — re-checked by pdv-build}",
  "remotion_bits_cli": "{npx remotion-bits, or null}",
  "remotion_bits_mcp_available": "{true|false}",
  "skiper_specs_dir": "{absolute path to skiper-components spec dir, or null}",
  "skiper_specs_count": "{integer count of skiper*.md files in specs dir}",
  "shadcn_cli_available": "{true|false}",
  "narration_strategy": "{voicebox|edge-tts|none — best available}"
}
```

`narration_strategy` logic:
- `voicebox` if voicebox_url is non-null
- `edge-tts` if edge_tts_python is non-null
- `none` if neither — warn user, video will have no narration

---

## Output: HTML Report + toolchain.json

Create `projects/{productname}/validation-report.html`:

```html
<!DOCTYPE html><html><head>
<title>DemoPilot Validation — {ProductName}</title>
<style>
body{font-family:system-ui;max-width:640px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5}
h1{font-size:1.4rem;margin-bottom:4px}
.ts{color:#71717a;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:16px 0}
td,th{padding:10px 12px;border-bottom:1px solid #222;font-size:13px;text-align:left}
th{color:#a1a1aa;font-weight:500}
.ok{color:#22c55e}.miss{color:#ef4444}.opt{color:#f59e0b}
.summary{padding:14px 16px;border-radius:8px;margin:20px 0;font-weight:600}
.summary.ready{background:#052e16;color:#22c55e}
.summary.blocked{background:#450a0a;color:#ef4444}
code{background:#1a1a1a;padding:2px 6px;border-radius:3px;font-size:12px}
.path{font-size:11px;color:#71717a;font-family:monospace}
</style></head>
<body>
<h1>DemoPilot Validation — {ProductName}</h1>
<p class="ts">Run: {timestamp}</p>

<table>
<tr><th>Tool</th><th>Status</th><th>Path / Note</th></tr>
{rows — each row: tool name | ✅ OK / ❌ MISSING / ⚠️ Optional | path or install command}
</table>

<div class="summary {ready|blocked}">
  {✅ All required tools found. Ready to explore. | ❌ Fix {N} required tools before continuing.}
</div>

<p>Narration strategy: <strong>{voicebox|edge-tts|none}</strong></p>
<p>toolchain.json written to: <code>projects/{productname}/toolchain.json</code></p>
<p>Next: <code>/pdv-explore "{ProductName}" {URL}</code></p>
</body></html>
```

**Required** (video won't work without): node, python3, ffmpeg, ffprobe, playwright, culori (installed in project), openscreen_cli, remotion-bits (per-project, re-verified by pdv-build)
**Recommended** (significantly better results): voicebox OR edge-tts, webbridge, gemini, impeccable
**Optional** (graceful fallbacks): acemusic, skiper-components
**Informational** (check exists, validity confirmed at render time): auth-state.json

Open report in browser. If any required tool is missing, stop and tell user exactly what to install.
If narration_strategy is `none`, warn prominently — the video will render silent.
