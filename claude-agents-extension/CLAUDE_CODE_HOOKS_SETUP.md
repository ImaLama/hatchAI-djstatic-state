# 🔗 Claude Code Hooks Integration Setup

Complete guide to integrate Claude Code Stop hooks with your VSCode Agent Extension for automatic state updates.

## 🎯 What This Achieves

When you run `claude` and then exit (Ctrl+D, `exit`, or session ends), the VSCode status bar automatically updates:
- `🏭 🔵 FA-S-TC-001` (busy) → `🏭 ✅ FA-S-TC-001` (done)
- `🔍 🔵 QA-O-DC-123` (busy) → `🔍 ❌ QA-O-DC-123` (error) 

## 📋 Setup Steps

### Step 1: Configure Claude Code Hooks

Claude Code reads hooks from your home directory's `.claude/settings.json`:

```bash
# Create Claude Code settings directory
mkdir -p ~/.claude

# Configure both Start and Stop hooks for complete state flow
cat > ~/.claude/settings.json << 'EOF'
{
  "hooks": {
    "Start": [
      {
        "type": "command",
        "command": "/home/lama/projects/djhatch/_hatch_scripts/claude_start_hook.sh"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "/home/lama/projects/djhatch/_hatch_scripts/claude_stop_hook.sh"
      }
    ]
  }
}
EOF
```

### Step 2: Verify Hook Script Permissions

```bash
# Ensure both hook scripts are executable
chmod +x /home/lama/projects/djhatch/_hatch_scripts/claude_start_hook.sh
chmod +x /home/lama/projects/djhatch/_hatch_scripts/claude_stop_hook.sh

# Test the scripts work
export CLAUDE_AGENT_SESSION_ID="test-session"
export CLAUDE_AGENT_DISPLAY_NAME="FA-S-test"
/home/lama/projects/djhatch/_hatch_scripts/claude_start_hook.sh
/home/lama/projects/djhatch/_hatch_scripts/claude_stop_hook.sh
```

### Step 3: Test the Integration

#### Launch Agent with Environment Variables:

```bash
# Using enhanced asuperherohasemerged.sh (sets all required env vars)
_scripts/asuperherohasemerged.sh factory TC-001 --model opus

# This sets:
# - CLAUDE_AGENT_SESSION_ID="factory-TC-001" 
# - CLAUDE_AGENT_DISPLAY_NAME="FA-O-TC-001"
# - AGENT_TYPE="factory"
# - TASK_ID="TC-001"
# - CLAUDE_AGENT_MODEL="opus"
```

#### Verify Environment in Claude Session:

```bash
# Inside the Claude Code session, check:
echo $CLAUDE_AGENT_SESSION_ID    # Should show: factory-TC-001
echo $CLAUDE_AGENT_DISPLAY_NAME  # Should show: FA-O-TC-001
```

#### Test Complete State Flow:

1. **Launch**: VSCode shows `🏭 ⚪ FA-O-TC-001` (idle, ready for input)
2. **Give prompt**: Type something and press Enter  
3. **Start hook**: VSCode updates to `🏭 🔵 FA-O-TC-001` (busy, processing)
4. **Claude responds**: Wait for Claude's response to complete
5. **Stop hook**: VSCode updates to `🏭 🟢 FA-O-TC-001` (done, response complete)
6. **Auto-reset**: After 3 seconds, back to `🏭 ⚪ FA-O-TC-001` (idle, ready for next)
7. **Exit session**: (`exit` or Ctrl+D) → `🏭 🛑 FA-O-TC-001` (terminated)
8. **Check logs**: `tail _logs/hooks/start_hook.log` and `tail _logs/hooks/stop_hook.log`

## 🔧 How It Works

### Environment Variables Set by Launcher:

| Variable | Purpose | Example |
|----------|---------|---------|
| `CLAUDE_AGENT_SESSION_ID` | Tmux session name | `factory-TC-001` |
| `CLAUDE_AGENT_DISPLAY_NAME` | VSCode display name | `FA-O-TC-001` |
| `AGENT_TYPE` | Agent type | `factory` |
| `TASK_ID` | Task/DevCard ID | `TC-001` |
| `CLAUDE_AGENT_MODEL` | Claude model | `opus` |

### Complete Hook Processing Flow:

#### Start Hook Flow (User → Busy):
1. **User submits prompt** → Claude Code triggers Start hook
2. **Start hook reads** environment variables 
3. **Updates VSCode** to `busy` state via trigger file: `_logs/hooks/state_updates/FA-O-TC-001.trigger`
4. **VSCode extension** detects trigger file within 3 seconds
5. **Status bar shows**: `🏭 🔵 FA-O-TC-001` (busy, processing)

#### Stop Hook Flow (Busy → Done → Idle):
1. **Claude finishes processing** → Claude Code triggers Stop hook
2. **Stop hook reads** environment variables
3. **Updates VSCode** to `done` state via trigger file
4. **VSCode extension** detects trigger and shows: `🏭 🟢 FA-O-TC-001` (done)
5. **Auto-reset after 3 seconds**: Back to `🏭 ⚪ FA-O-TC-001` (idle, ready for next)

#### Termination Detection:
1. **Session ends** → tmux session monitor detects termination  
2. **Updates VSCode** to `terminated` state: `🏭 🛑 FA-O-TC-001`

### State Detection Logic:

```bash
# In claude_stop_hook.sh:
FINAL_STATE="done"  # Default assumption

# Check for errors
if [[ -n "${CLAUDE_EXIT_CODE:-}" ]] && [[ "$CLAUDE_EXIT_CODE" != "0" ]]; then
    FINAL_STATE="error"
fi

# You can extend this logic:
# - Parse Claude output for specific error patterns
# - Check if certain files were created/modified
# - Analyze session logs for completion status
```

## 🎨 Naming Convention in Action

### With Task IDs:
- **Launch**: `_scripts/asuperherohasemerged.sh factory TC-001 --model opus`
- **Display**: `🏭 🔵 FA-O-TC-001` (busy) → `🏭 ✅ FA-O-TC-001` (done)
- **Session**: `factory-TC-001`

### Without Task IDs:
- **Launch**: `_scripts/asuperherohasemerged.sh architect --model sonnet`  
- **Display**: `🏗️ 🔵 AR-S-alpha` (busy) → `🏗️ ✅ AR-S-alpha` (done)
- **Session**: `architect-alpha`

### Model Indicators:
- **S**: Sonnet (default)
- **O**: Opus (most capable)
- **H**: Haiku (fastest)

## 🔍 Troubleshooting

### Hook Not Triggering?

```bash
# Check Claude Code settings
cat ~/.claude/settings.json

# Test hook manually
export CLAUDE_AGENT_SESSION_ID="test-session"
export CLAUDE_AGENT_DISPLAY_NAME="FA-S-test"
/home/lama/projects/djhatch/_hatch_scripts/claude_stop_hook.sh

# Check hook logs
tail -f _logs/hooks/stop_hook.log
```

### VSCode Not Updating?

```bash
# Check if trigger files are created
ls -la _logs/hooks/state_updates/

# Check if extension is monitoring
# (VSCode Developer Console: Ctrl+Shift+I)

# Manual state update test
node claude-agents-extension/update_agent_state.js "FA-S-TC-001" done
```

### Environment Variables Missing?

```bash
# In tmux session, verify all variables:
env | grep CLAUDE_AGENT
env | grep AGENT_TYPE
env | grep TASK_ID

# If missing, check launcher script execution
_scripts/asuperherohasemerged.sh factory TC-001 --model opus
tmux attach -t factory-TC-001
# Then check env vars inside session
```

## 📁 File Structure

```
djhatch/
├── _hatch_scripts/
│   └── claude_stop_hook.sh              # Stop hook handler
├── _scripts/
│   └── asuperherohasemerged.sh           # Enhanced launcher with env vars
├── _logs/
│   ├── hooks/
│   │   ├── stop_hook.log                 # Hook execution log
│   │   ├── factory-TC-001.stop           # Legacy stop files
│   │   └── state_updates/
│   │       └── FA-S-TC-001.trigger       # VSCode state triggers
│   └── TC-001/
│       └── factory_handover.json         # Agent completion summary
├── claude-agents-extension/
│   ├── src/extension.ts                  # Enhanced with hook monitoring
│   └── update_agent_state.js             # Manual state updater
└── .vscode/
    └── claude_config.json                # VSCode/Claude integration config

~/.claude/
└── settings.json                         # Claude Code hook configuration
```

## 🚀 Advanced Usage

### Custom State Detection:

Edit `claude_stop_hook.sh` to add sophisticated state detection:

```bash
# Analyze Claude output for specific patterns
if grep -q "implementation complete" "$SESSION_LOG"; then
    FINAL_STATE="done"
elif grep -q "error\|failed\|exception" "$SESSION_LOG"; then
    FINAL_STATE="error"
elif grep -q "need more information" "$SESSION_LOG"; then
    FINAL_STATE="unknown"
fi
```

### Multiple Project Support:

```bash
# Different hook handlers per project
~/.claude/settings.json:
{
  "hooks": {
    "Stop": [
      {
        "type": "command", 
        "command": "$CLAUDE_PROJECT_DIR/_hatch_scripts/claude_stop_hook.sh"
      }
    ]
  }
}
```

Your Claude Code sessions now automatically update VSCode agent states on completion! 🎉