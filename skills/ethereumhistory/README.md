# Ethereum History — ClawHub skill

This folder contains the **SKILL.md** and instructions for publishing Ethereum History as a skill on [ClawHub](https://www.clawhub.ai/).

## Upload options

### Option 1: Web upload

1. Go to [ClawHub → Publish a skill](https://www.clawhub.ai/upload) and sign in.
2. Upload this folder (`skills/ethereumhistory`) or a zip of it. The registry expects a **SKILL.md** file (and optionally other files) in the uploaded bundle.

### Option 2: CLI (if ClawHub supports sync)

From the repo root:

```bash
# If clawhub CLI is installed and you're in the skill folder
cd skills/ethereumhistory
clawhub sync
```

Or from repo root, if the CLI accepts a path:

```bash
clawhub sync skills/ethereumhistory
```

Check [ClawHub docs](https://www.clawhub.ai/) for the current publish command.

## What’s in this folder

- **SKILL.md** — AgentSkills-format skill (YAML frontmatter + Markdown). Required for ClawHub. Describes when to use the skill and how to call the Ethereum History agent API.
- **README.md** — This file (upload instructions).

The live API and machine-readable manifest are served by the app:

- **Manifest:** `GET https://ethereumhistory.com/api/agent/manifest`
- **Contract facts:** `GET https://ethereumhistory.com/api/agent/contracts/{address}`
- **Discovery / temporal:** `GET https://ethereumhistory.com/api/agent/contracts?...`
