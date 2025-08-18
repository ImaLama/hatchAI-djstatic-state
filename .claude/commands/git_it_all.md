---
allowed-tools: Bash(git:*), Grep(pattern:*), LS(path:*)
argument-hint: [optional commit prefix]
description: Intelligently commit and push all changes for djhatch-state
---

Analyze the current git status and help me commit all changes intelligently.

!git status --porcelain

Based on the changes above, please:
1. Group related files into logical commits
2. Generate meaningful commit messages following our standards
3. Execute git add, commit for each group
4. Push all commits to the remote branch

$ARGUMENTS

Remember to:
- Include TaskSpec trailers if applicable (e.g., "TaskSpec: 001-TS-2025-08-18-EXAMPLE status=qa")
- Follow our commit message conventions with Claude Code attribution
- Ask for confirmation before pushing
- Group by functionality:
  * Core architecture changes (templates, Taskfile.yml)
  * State management scripts (state-scripts/)
  * Documentation updates (_docs/, state-docs/)
  * Agent prompts (_state_agents/)
  * Configuration changes (.envrc, .claude/)
- Use descriptive commit messages that explain the "why" not just the "what"
- Include appropriate emoji prefixes if they help clarity
- End commits with Claude Code attribution:

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>