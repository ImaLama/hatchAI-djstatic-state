# 🦸‍♂️ Claude Agents VSCode Extension Setup Guide

Complete step-by-step guide to set up dynamic terminal panel management for Claude Code agents with beautiful visual indicators.

## 📋 Prerequisites

- VSCode with Remote-SSH extension (for remote development)
- Node.js 16+ (for extension development)
- tmux (for session persistence)
- Claude Code CLI installed and configured
- Your existing djhatch project structure

## 🚀 Installation Steps

### Step 1: Install Extension Dependencies

```bash
cd /home/lama/projects/djhatch/claude-agents-extension
npm install
```

### Step 2: Compile Extension

```bash
npm run compile
```

### Step 3: Install Extension in VSCode

#### Method A: Development Install
1. Open VSCode in your project directory
2. Press `F5` to launch extension development host
3. In the new window, open your djhatch project
4. Extension will be active with all commands available

#### Method B: Package and Install
```bash
# Install vsce (VSCode extension packager)
npm install -g vsce

# Package extension
vsce package

# Install the generated .vsix file
code --install-extension claude-agents-0.0.1.vsix
```

### Step 4: Configure VSCode Settings

Add to your workspace `.vscode/settings.json`:

```json
{
    "claude-agents.sessionPoolSize": 5,
    "claude-agents.defaultModel": "sonnet",
    "claude-agents.projectId": "djhatch",
    "claude-agents.autoCapture": true,
    "terminal.integrated.tabs.enabled": true,
    "terminal.integrated.tabs.showActions": "singleTerminal"
}
```

### Step 5: Set Up Keyboard Shortcuts

Add to `.vscode/keybindings.json`:

```json
[
    {
        "key": "ctrl+alt+a",
        "command": "claude-agents.spawnAgent",
        "when": "!terminalFocus"
    },
    {
        "key": "ctrl+alt+l",
        "command": "claude-agents.listAgents"
    },
    {
        "key": "ctrl+alt+k",
        "command": "claude-agents.killAgent"
    }
]
```

## 🎨 Visual Features

### Agent Type Icons
- 🏗️ **architect** - Architecture and design
- 📋 **planner** - Task planning and breakdown  
- 🏭 **factory** - Code implementation
- 🔍 **qa** - Quality assurance and testing
- 🕸️ **weaver** - Workflow coordination
- 🛡️ **security** - Security analysis
- 🦆 **darkwingduck** - Emergency operations

### State Indicators
- ⚪ **idle** - Session ready, waiting for task
- 🔵 **busy** - Agent actively working
- ✅ **done** - Task completed successfully
- ❌ **error** - Agent encountered error
- ⚠️ **warning** - Requires attention

### Terminal Panel Names
Your terminal tabs will show:
```
🔵 FACTORY-TC-001    ✅ QA-TC-001    ⚪ PLANNER-FS-002
```

## 📱 Usage

### Method 1: Command Palette (Recommended)
1. Press `Ctrl+Shift+P`
2. Type "Claude Agents: Spawn Agent"
3. Select agent type from dropdown
4. Enter task ID (e.g., TC-001)
5. Beautiful terminal panel appears with icon and state

### Method 2: Keyboard Shortcut
1. Press `Ctrl+Alt+A` 
2. Follow the prompts
3. Agent spawns in named terminal panel

### Method 3: Status Bar
1. Click "🤖 Claude Agents" in status bar
2. Same as Method 1

### Method 4: Direct Script Usage
```bash
# Enhanced launcher with full features
_scripts/asuperherohasemerged.sh factory TC-001

# POC launcher with session pool management
_hatch_scripts/poc_superlauncher.sh qa TC-001 --session-pool 5
```

## 🔄 Session Management

### Session Persistence
- Sessions survive VSCode restarts
- Agents continue running in tmux
- Reconnect from any client (laptop/desktop)
- Full session capture and logging

### Multi-Project Support
```bash
# Project A
_hatch_scripts/poc_superlauncher.sh factory TC-001 --project-id proj-a

# Project B  
_hatch_scripts/poc_superlauncher.sh planner FS-001 --project-id proj-b
```

### Session Pool Management
- Automatic reuse of idle sessions
- Configurable pool sizes per agent type
- Smart session allocation
- Clean termination and cleanup

## 🛠️ Advanced Configuration

### Custom Agent Types
Add new agent types by:

1. **Extension (src/extension.ts):**
```typescript
// Add to getAgentIcon() method
'newagent': 'custom-icon-name'

// Add to agent type dropdown
{ label: '🆕 newagent', value: 'newagent' }
```

2. **Script (_scripts/asuperherohasemerged.sh):**
```bash
# Add to case statement
"newagent")
    export AGENT_TYPE=NEWAGENT DEPLOYMENT_ENV=DEV
    claude --model sonnet "[AGENT_TYPE:NEWAGENT,ENV:DEV] Custom prompt..."
    ;;
```

### Custom Icons and Colors
Modify `getAgentIcon()` and `getAgentColor()` in `src/extension.ts`:

```typescript
private getAgentIcon(agentType: string): vscode.ThemeIcon {
    const icons: { [key: string]: string } = {
        'architect': 'gear',           // ⚙️
        'factory': 'tools',            // 🔧
        'qa': 'bug',                   // 🐛
        'security': 'shield',          // 🛡️
        // Add your custom mappings
    };
    return new vscode.ThemeIcon(icons[agentType] || 'robot');
}
```

## 🔍 Troubleshooting

### Extension Not Loading
```bash
# Check compilation errors
npm run compile

# Check VSCode Developer Console
Ctrl+Shift+I → Console tab
```

### Tmux Sessions Not Persisting
```bash
# Verify tmux is running
tmux list-sessions

# Check session capture
_hatch_scripts/tmux_session_capture.sh list
```

### Icons Not Showing
- Ensure VSCode theme supports icons
- Check terminal.integrated.tabs.enabled: true
- Update VSCode to latest version

### Remote-SSH Issues
```bash
# Ensure extension installed on remote
code --list-extensions | grep claude-agents

# Check remote workspace settings
cat .vscode/settings.json
```

## 🎯 What You Get

### Perfect Remote Transferability
- **Laptop → Server**: Same interface, same shortcuts
- **Desktop → Server**: Identical experience  
- **Mobile → Server**: Full functionality via VSCode web

### Visual Organization
```
VSCode Terminal Panel:
┌─────────────────────────────────────────────────┐
│ 🔵 FACTORY-TC-001 │ ✅ QA-TC-001 │ ⚪ PLANNER-FS-002 │
├─────────────────────┼──────────────┼─────────────────┤
│ Implementing TC-001  │ Review passed │ Planning next   │
│ Session: factory-... │ All tests ✅  │ Ready for task  │
└─────────────────────┴──────────────┴─────────────────┘
```

### Session Persistence
- Agents survive disconnections
- Resume exactly where left off
- Complete audit trail in logs
- No work lost on network issues

## 🚀 Next Steps

1. **Test the setup**: Spawn a factory agent for TC-001
2. **Verify persistence**: Disconnect and reconnect VSCode
3. **Try multi-agent**: Run factory + QA simultaneously
4. **Customize icons**: Add your own agent types and visual themes
5. **Scale up**: Add more projects and session pools

Your terminal panels will now show beautiful, informative agent sessions with full persistence across any remote connection! 🎉