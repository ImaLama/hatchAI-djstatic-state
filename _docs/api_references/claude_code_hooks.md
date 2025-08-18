# Claude Code Hooks Reference

**Source**: [Anthropic Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)  
**Last Updated**: August 2025  
**Local Reference**: For djhatch-state project

## Overview

Claude Code hooks are shell commands that execute automatically at specific points in Claude Code's workflow, providing deterministic control over the agent's behavior. They enable automation of tasks like code formatting, logging, notifications, and enforcing development conventions.

⚠️ **Security Warning**: Hooks run automatically with your current environment's credentials. Review implementations carefully.

## Configuration

### Location
Hooks are configured in Claude Code settings files:
- Global: `~/.claude/settings.json`
- Project: `.claude/settings.json`

### Basic Structure
```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-shell-command"
          }
        ]
      }
    ]
  }
}
```

### Interactive Configuration
Use the `/hooks` slash command in Claude Code for menu-driven configuration.

## Hook Events

### PreToolUse
- **When**: Before any tool is called
- **Purpose**: Validate, block, or modify tool calls
- **Blocking**: Can prevent tool execution (exit code 2)
- **Example**: Code formatting, permission checks

### PostToolUse  
- **When**: After a tool completes successfully
- **Purpose**: Post-processing, logging, notifications
- **Example**: File formatting, commit hooks, notifications

### UserPromptSubmit
- **When**: User submits a prompt, before Claude processes it
- **Purpose**: Preprocess user input, logging
- **Example**: Input validation, prompt logging

### Notification
- **When**: Claude Code sends notifications
- **Purpose**: Custom notification handling
- **Example**: Desktop notifications, chat alerts

### Stop
- **When**: Claude Code finishes responding to user
- **Purpose**: End-of-response processing
- **Example**: Summary logging, cleanup tasks

### SubagentStop
- **When**: A subagent completes its task
- **Purpose**: Subagent-specific post-processing
- **Example**: Subagent result logging

### PreCompact
- **When**: Before Claude Code compacts conversation
- **Purpose**: Pre-compact processing
- **Example**: Backup conversation state

### SessionStart
- **When**: Claude Code starts or resumes a session
- **Purpose**: Session initialization
- **Example**: Environment setup, welcome notifications

## Matcher Patterns

### Exact Match
```json
"matcher": "Write"     // Matches only the Write tool
"matcher": "Bash"      // Matches only the Bash tool
```

### Wildcard
```json
"matcher": "*"         // Matches all tools
"matcher": ""          // Also matches all tools
```

### Regex Patterns
```json
"matcher": "Edit|Write"           // Matches Edit OR Write tools
"matcher": "Notebook.*"           // Matches any tool starting with "Notebook"
"matcher": ".*test.*"             // Matches any tool containing "test"
```

## Environment Variables

Claude Code provides these environment variables to hooks:

### Standard Variables
- `$CLAUDE_PROJECT_DIR`: Project root directory path
- `$CLAUDE_SESSION_ID`: Current session identifier
- `$CLAUDE_TRANSCRIPT_PATH`: Path to conversation transcript
- `$CLAUDE_CWD`: Current working directory

### Event-Specific Variables
- `$CLAUDE_NOTIFICATION`: Notification content (Notification event only)
- Tool-specific data passed as JSON to hook input

## Hook Input/Output

### Input Format
Hooks receive JSON via stdin:
```json
{
  "session_id": "...",
  "transcript_path": "...", 
  "cwd": "...",
  "event_data": { /* event-specific data */ }
}
```

### Output Control

#### Exit Codes
- `0`: Success (continue normally)
- `2`: Blocking error (prevents tool execution for PreToolUse)
- Other: Non-blocking error (logged but continues)

#### JSON Output
For advanced control, hooks can output JSON to stdout:
```json
{
  "block": true,
  "message": "Custom error message",
  "context": { /* additional context */ }
}
```

## Common Examples

### Code Formatting (PostToolUse)
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write $CLAUDE_PROJECT_DIR/**/*.{js,ts,json}"
          }
        ]
      }
    ]
  }
}
```

### Command Logging (All Tools)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command", 
            "command": "echo \"$(date): Tool executed\" >> $CLAUDE_PROJECT_DIR/.claude_log"
          }
        ]
      }
    ]
  }
}
```

### Desktop Notifications
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e \"display notification \\\"$CLAUDE_NOTIFICATION\\\" with title \\\"Claude Code\\\"\""
          }
        ]
      }
    ]
  }
}
```

### Git Commit on File Changes
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "cd $CLAUDE_PROJECT_DIR && git add -A && git commit -m \"Auto-commit: File modified by Claude\""
          }
        ]
      }
    ]
  }
}
```

### Blocking Sensitive File Access
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'if echo \"$1\" | grep -q \".env\\|secrets\"; then exit 2; fi'"
          }
        ]
      }
    ]
  }
}
```

## Best Practices

### Security
- ✅ Review all hook commands carefully
- ✅ Test hooks in safe environments first
- ✅ Use specific matchers instead of wildcards when possible
- ❌ Never expose sensitive credentials in hook commands
- ❌ Avoid hooks that modify system-critical files

### Performance
- ✅ Keep hook commands fast and efficient
- ✅ Use async operations for non-critical tasks
- ✅ Limit hook frequency for high-volume events
- ❌ Avoid long-running processes in hooks
- ❌ Don't block critical workflow with slow hooks

### Debugging
- ✅ Use echo/logging for hook debugging
- ✅ Test hooks with simple commands first
- ✅ Check exit codes and output
- ❌ Don't assume hooks executed successfully
- ❌ Avoid silent failures

### Maintenance
- ✅ Document hook purposes and configurations
- ✅ Version control hook configurations
- ✅ Regularly review and update hooks
- ❌ Don't create overly complex hook chains
- ❌ Avoid hooks that depend on external services

## Use Cases for djhatch-state

### State Management Hooks
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "cd $CLAUDE_PROJECT_DIR && task loc-check"
          }
        ]
      }
    ]
  }
}
```

### TaskSpec Creation Logging
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'if echo \"$0\" | grep -q \"task taskspec-new\"; then echo \"$(date): TaskSpec created\" >> $CLAUDE_PROJECT_DIR/_logs/taskspec.log; fi'"
          }
        ]
      }
    ]
  }
}
```

### Mount Status Monitoring
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "cd $CLAUDE_PROJECT_DIR && task mount-status"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues
1. **Hook not executing**: Check matcher pattern and event type
2. **Permission errors**: Verify script permissions and environment
3. **Path issues**: Use absolute paths or `$CLAUDE_PROJECT_DIR`
4. **Silent failures**: Add logging/echo to hook commands

### Debugging Commands
```bash
# Test hook manually
echo '{"session_id":"test","cwd":"'$(pwd)'"}' | your-hook-command

# Check hook configuration
cat ~/.claude/settings.json | jq '.hooks'

# Enable hook debugging
export CLAUDE_HOOKS_DEBUG=1
```

## References

- [Official Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

**Note**: This reference is based on documentation available as of August 2025. Check official documentation for the latest updates and features.