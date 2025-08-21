# Claude Agents Extension v0.7.2 - Installation Instructions

## ✅ Ready for Installation

The extension has been built and tested. It will discover **13 active tmux sessions** out of 42 in the state file.

### Validated Sessions (will get terminal panels):
- architect-1755683754 (busy)
- architect-1755691818 (idle) 
- factory-TC-123 (idle)
- factory-TC-999 (busy)
- architect-1755700020 (idle)
- planner-1755701013 (idle)
- qa-022-TS-2025-08-20-MOUNT-DIRS-RENAME (idle)
- planner-1755731305 (idle)
- architect-1755731694 (idle)
- architect-1755764135 (idle)
- planner-1755765065 (busy)
- planner-1755765326 (busy)
- architect-1755767122 (busy)

## Installation Options

### Option 1: VSCode GUI Installation
1. Open VSCode
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: `Extensions: Install from VSIX...`
4. Select: `/home/lama/projects/djhatch-state/claude-agents-extension/claude-agents-0.7.2.vsix`
5. Click "Reload Window" when prompted

### Option 2: Command Line Installation
```bash
# If VSCode is running and server is available:
code --install-extension /home/lama/projects/djhatch-state/claude-agents-extension/claude-agents-0.7.2.vsix

# Force reload VSCode after installation
```

### Option 3: Manual Extension Directory Installation
```bash
# Extract to VSCode extensions directory
mkdir -p ~/.vscode/extensions/claude-agents-0.7.2
unzip /home/lama/projects/djhatch-state/claude-agents-extension/claude-agents-0.7.2.vsix -d ~/.vscode/extensions/claude-agents-0.7.2
```

## Expected Behavior After Installation

1. **Auto-Discovery on Startup**: Extension will run 1 second after VSCode loads
2. **Terminal Creation**: 13 terminal panels will be created for active tmux sessions
3. **Status Bar**: Agent indicators with emojis will appear in the status bar
4. **Notification**: "🔗 Discovered 13 active agent session(s)" message
5. **Session Filtering**: Dead sessions are automatically skipped

## Security Features

- ✅ **Command injection protection**: Session names are sanitized
- ✅ **Race condition fixes**: Safe terminal and map cleanup
- ✅ **Error recovery**: Individual session failures don't break discovery
- ✅ **Workspace portability**: Uses relative paths, not hardcoded locations

## Verification Steps

After installation:
1. Check status bar for agent indicators (🏗️, 📋, 🏭, 🔍, etc.)
2. Open terminal panel - should show 13 agent terminals
3. Click on agent terminals to switch between sessions
4. Use `Ctrl+Alt+A` keyboard shortcut to show session list

## Troubleshooting

If extension doesn't load:
- Check VSCode Developer Console (`Help > Toggle Developer Tools`)
- Look for "claude-agents" extension logs
- Verify workspace is `/home/lama/projects/djhatch-state` or contains `_featstate/agent_states.json`

## File Locations

- **Extension Package**: `claude-agents-0.7.2.vsix` (94.73KB)
- **Source Code**: `src/extension.ts` (updated with security fixes)
- **State File**: `_featstate/agent_states.json` (monitored for changes)