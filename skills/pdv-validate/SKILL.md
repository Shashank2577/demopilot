---
name: pdv-validate
description: "Use as the first step of DemoPilot before any video production. Checks all required tools are installed and running, validates WebBridge connectivity, and generates a validation HTML report. Always run before /pdv-explore."
argument-hint: "[ProductName] — e.g. 'OBSERVE'"
---

# DemoPilot — Step 1: Validate

**Model: Haiku** (no judgment needed — just health checks)

## What This Does

Checks every tool DemoPilot needs. Writes a report. Nothing else.

## Execution (run all checks, then write report)

```bash
# 1. Node + npm
node --version && npm --version

# 2. Python + pip
python3 --version && pip3 --version

# 3. ffmpeg
ffmpeg -version | head -1

# 4. Playwright
npx playwright --version 2>/dev/null || echo "MISSING: npm i -g playwright"

# 5. Remotion (check if installed in project)
npx remotion --version 2>/dev/null || echo "MISSING: npm create video@latest"

# 6. edge-tts (offline narration fallback)
edge-tts --version 2>/dev/null || echo "MISSING (optional): pip install edge-tts"

# 7. Qwen3-TTS (narration fallback)
python3 -c "import qwen_tts; print('qwen_tts OK')" 2>/dev/null || echo "MISSING (optional): pip install qwen-tts"

# 8. WebBridge (live app exploration)
~/.kimi-webbridge/bin/kimi-webbridge status 2>/dev/null || curl -s http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d '{"action":"ping","session":"validate"}' 2>/dev/null || echo "MISSING: install kimi-webbridge"

# 9. Voicebox (primary narration — optional)
curl -s --max-time 2 http://127.0.0.1:17493/profiles 2>/dev/null | python3 -m json.tool \
  || echo "NOT RUNNING (optional): start Voicebox app from voicebox.sh"

# 10. Gemini CLI (for bulk code generation)
gemini --version 2>/dev/null || echo "MISSING (optional): install Gemini CLI"

# 11. impeccable (quality gate)
npx impeccable --version 2>/dev/null || echo "MISSING (optional): npx impeccable detect"

# 12. ACE-Step music (optional)
acemusic --version 2>/dev/null || echo "MISSING (optional): pip install acemusic"
```

## Output: HTML Report

Create `projects/ProductName/validation-report.html` with:
- Green ✅ for each tool found
- Red ❌ for each required tool missing (with exact install command)
- Yellow ⚠️ for optional tools not found
- Summary: "Ready to proceed" or "Fix N required tools first"

**Required** (video won't work without): node, python3, ffmpeg, playwright, remotion  
**Optional** (graceful fallbacks exist): voicebox, qwen_tts, acemusic, gemini, impeccable  
**Recommended** (significantly better results): voicebox OR edge-tts, gemini, impeccable

## HTML Template

```html
<!DOCTYPE html><html><head><title>DemoPilot Validation — {ProductName}</title>
<style>body{font-family:system-ui;max-width:600px;margin:40px auto;padding:0 20px}
.ok{color:#22c55e}.miss{color:#ef4444}.opt{color:#f59e0b}
h1{font-size:1.5rem}table{width:100%;border-collapse:collapse}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb}</style></head>
<body>
<h1>DemoPilot Validation — {ProductName}</h1>
<p>Run: {timestamp}</p>
<table>
  <tr><td>Tool</td><td>Status</td><td>Action</td></tr>
  {rows}
</table>
<h2 class="{statusClass}">{summary}</h2>
<p>Next: <code>/pdv-explore "{ProductName}" {URL}</code></p>
</body></html>
```

Open the report in the browser and tell the user which tools to install before proceeding.
