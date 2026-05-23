# Contributing to DemoPilot

## Ways to Contribute

- **New skill families** — pitch decks, runbooks, interactive walkthroughs
- **TTS engine integrations** — new narration engines
- **Music presets** — new ACE-Step or alternative music generators
- **Remotion scene templates** — new scene types for the Creative Arsenal
- **Bug fixes** — recording pipeline, selector issues, timing bugs
- **Documentation** — phase guides, tool setup, examples

## Skill Authoring

New skill families follow the same 4-file pattern:
```
skills/
  {family}-validate/SKILL.md
  {family}-explore/SKILL.md
  {family}-build/SKILL.md
  {family}-render/SKILL.md
```

Keep each skill file under 200 lines. Heavy reference goes in `skills/demopilot/ref/`.

## Pull Request Guidelines

- One skill family or one feature per PR
- Include a brief description of what the skill does and which paid tool it replaces
- Test with at least one real product before submitting

## Issues

Use GitHub Issues for bugs, feature requests, and new skill family proposals.
