#!/usr/bin/env bash
set -e

SKILLS_DIR="$HOME/.claude/skills"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "DemoPilot — Installing skills to $SKILLS_DIR"
echo ""

# Create skills dir if needed
mkdir -p "$SKILLS_DIR"

# Copy each skill
SKILLS=("demopilot" "pdv-validate" "pdv-explore" "pdv-build" "pdv-render")

for skill in "${SKILLS[@]}"; do
  src="$REPO_DIR/skills/$skill"
  dst="$SKILLS_DIR/$skill"

  if [ -d "$dst" ]; then
    echo "  ↻  Updating: $skill"
    rm -rf "$dst"
  else
    echo "  ✓  Installing: $skill"
  fi

  cp -r "$src" "$dst"
done

echo ""
echo "✅ All 5 skills installed."
echo ""
echo "Usage:"
echo "  /pdv-validate \"YourProduct\""
echo "  /pdv-explore  \"YourProduct\" https://your-app.com"
echo "  /pdv-build    \"YourProduct\""
echo "  /pdv-render   \"YourProduct\""
echo ""
echo "Docs: https://github.com/$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/.git$//' || echo 'your-username/demopilot')"
