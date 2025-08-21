"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
class AgentManager {
    constructor() {
        this.agents = new Map();
        this.phoneticAlphabet = [
            'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
            'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango',
            'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu'
        ];
        this.agentCounters = new Map();
    }
    // Icon mapping for agent types (VSCode icons)
    getAgentIcon(agentType) {
        const icons = {
            'architect': 'settings-gear',
            'planner': 'list-ordered',
            'factory': 'tools',
            'qa': 'search',
            'weaver': 'git-merge',
            'security': 'shield',
            'darkwingduck': 'flame'
        };
        return new vscode.ThemeIcon(icons[agentType] || 'robot');
    }
    // Emoji icons for agent types (for status bar and terminal names)
    getAgentEmoji(agentType) {
        const emojis = {
            'architect': '🏗️',
            'planner': '📋',
            'factory': '🏭',
            'qa': '🔍',
            'weaver': '🕸️',
            'security': '🛡️',
            'darkwingduck': '🦆'
        };
        return emojis[agentType] || '🤖';
    }
    // Get shortened agent name (first 2 letters) - static for centralized use
    static getAgentShortName(agentType) {
        const shortNames = {
            'architect': 'AR',
            'planner': 'PL',
            'factory': 'FA',
            'qa': 'QA',
            'weaver': 'WE',
            'security': 'SE',
            'darkwingduck': 'DD'
        };
        return shortNames[agentType] || agentType.substring(0, 2).toUpperCase();
    }
    // Instance method for backward compatibility
    getAgentShortName(agentType) {
        return AgentManager.getAgentShortName(agentType);
    }
    // Get model indicator letter - static for centralized use
    static getModelIndicator(model) {
        const modelIndicators = {
            'sonnet': 'S',
            'opus': 'O',
            'haiku': 'H'
        };
        return modelIndicators[model.toLowerCase()] || 'S'; // Default to Sonnet
    }
    // Instance method for backward compatibility
    getModelIndicator(model) {
        return AgentManager.getModelIndicator(model);
    }
    // Centralized display name generation following standard: 📋 ⚪ PL-S-013 format
    static generateDisplayName(sessionId, agentType, model = 'sonnet', taskId) {
        const shortName = AgentManager.getAgentShortName(agentType);
        const modelIndicator = AgentManager.getModelIndicator(model);
        if (taskId) {
            // Extract just the number from TaskSpec IDs like "002-TS-2025-08-18-STATE-LOGGING"
            // or "TC-001" -> "001", or keep short IDs as-is
            let shortTaskId = taskId;
            // Pattern 1: ###-TS-YYYY-MM-DD-* format
            const tsMatch = taskId.match(/^(\d+)-TS-/);
            if (tsMatch) {
                shortTaskId = tsMatch[1]; // Just the number (e.g., "002")
            }
            // Pattern 2: TC-### or DC-### format
            else if (taskId.match(/^[A-Z]{2}-(\d+)$/)) {
                shortTaskId = taskId.substring(3); // Just the number (e.g., "001")
            }
            // Pattern 3: Already a number or very short
            else if (taskId.length <= 3) {
                shortTaskId = taskId;
            }
            // Pattern 4: Long arbitrary string - take first 3 chars
            else if (taskId.length > 8) {
                shortTaskId = taskId.substring(0, 3);
            }
            const displayName = `${shortName}-${modelIndicator}-${shortTaskId}`;
            // Cap at 10 characters for status bar
            return {
                displayName: displayName.length > 10 ? displayName.substring(0, 10) : displayName
            };
        }
        else {
            // For sessions without task IDs, extract last 3 digits from session ID
            const digitMatch = sessionId.match(/(\d{3,})$/);
            const sessionSuffix = digitMatch ? digitMatch[1].slice(-3) :
                (sessionId.length >= 3 ? sessionId.slice(-3) : sessionId);
            const displayName = `${shortName}-${modelIndicator}-${sessionSuffix}`;
            return {
                displayName: displayName.length > 10 ? displayName.substring(0, 10) : displayName
            };
        }
    }
    // Instance method for backward compatibility
    generateDisplayName(agentType, model, taskId) {
        // Use a dummy session ID for instance calls - this should be phased out
        const dummySessionId = `${agentType}-${Date.now()}`;
        return AgentManager.generateDisplayName(dummySessionId, agentType, model, taskId);
    }
    // State icon mapping  
    getStateIcon(state) {
        const stateIcons = {
            'idle': '⚪',
            'busy': '🔵',
            'done': '🟢',
            'error': '❌',
            'unknown': '❓',
            'terminated': '🛑',
            'stopped': '🛑' // User cancelled (ESC)
        };
        return stateIcons[state];
    }
    // Compact state indicator for status bar (single char)
    getCompactStateIndicator(state) {
        const indicators = {
            'idle': '○',
            'busy': '●',
            'done': '✓',
            'error': '✗',
            'unknown': '?',
            'terminated': '×',
            'stopped': '■' // Square for stopped/cancelled
        };
        return indicators[state];
    }
    // Color mapping for agent types
    getAgentColor(agentType) {
        const colors = {
            'architect': 'terminal.ansiMagenta',
            'planner': 'terminal.ansiBlue',
            'factory': 'terminal.ansiGreen',
            'qa': 'terminal.ansiYellow',
            'weaver': 'terminal.ansiCyan',
            'security': 'terminal.ansiRed',
            'darkwingduck': 'terminal.ansiWhite'
        };
        return new vscode.ThemeColor(colors[agentType] || 'terminal.ansiWhite');
    }
    // Programmatic spawning without UI prompts
    spawnAgentProgrammatic(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { agentType, taskId, model = 'sonnet' } = options;
            // Validate agent type
            const validTypes = ['architect', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
            if (!validTypes.includes(agentType)) {
                throw new Error(`Invalid agent type: ${agentType}`);
            }
            // Generate display name and session name
            const nameInfo = this.generateDisplayName(agentType, model, taskId);
            const displayName = nameInfo.displayName;
            const phoneticName = nameInfo.phoneticName;
            const sessionName = taskId ? `${agentType}-${taskId}` : `${agentType}-${phoneticName}`;
            const agentEmoji = this.getAgentEmoji(agentType);
            const terminalName = `${agentEmoji} ${this.getStateIcon('idle')} ${displayName}`;
            // Create terminal
            const terminal = vscode.window.createTerminal({
                name: terminalName,
                iconPath: this.getAgentIcon(agentType),
                color: this.getAgentColor(agentType),
                cwd: vscode.workspace.rootPath
            });
            // Create status bar item (compact format) - use dynamic priority based on agent count
            const currentAgentCount = this.agents.size;
            const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - currentAgentCount);
            statusBarItem.text = `${agentEmoji}${displayName}○`; // Start with idle state indicator
            statusBarItem.tooltip = `Agent: ${agentType}\n${taskId ? `Task: ${taskId}` : `Phonetic: ${phoneticName}`}\nState: idle`;
            statusBarItem.command = 'claude-agents.listAgents';
            // Set initial background color to yellow for idle state
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            statusBarItem.show();
            // Store agent info
            const agentTerminal = {
                terminal,
                agentType,
                taskId,
                model,
                state: 'idle',
                sessionName,
                statusBarItem,
                phoneticName,
                displayName
            };
            this.agents.set(sessionName, agentTerminal);
            // Launch agent
            if (taskId) {
                terminal.sendText(`_scripts/asuperherohasemerged.sh ${agentType} ${taskId} --model ${model} --no-attach`);
            }
            else {
                terminal.sendText(`_scripts/asuperherohasemerged.sh ${agentType} --model ${model} --no-attach`);
            }
            setTimeout(() => {
                // DISABLED: printf commands interfere with Claude Code input
                // terminal.sendText(`printf '\\033]0;${terminalName}\\007'`);
                terminal.sendText(`tmux attach -t "${sessionName}"`);
            }, 2000);
            terminal.show();
            this.monitorAgent(sessionName);
            return { displayName, sessionName, terminal };
        });
    }
    spawnAgent() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get agent type
            const agentType = yield vscode.window.showQuickPick([
                { label: '🏗️  architect', value: 'architect' },
                { label: '📋  planner', value: 'planner' },
                { label: '🏭  factory', value: 'factory' },
                { label: '🔍  qa', value: 'qa' },
                { label: '🕸️  weaver', value: 'weaver' },
                { label: '🛡️  security', value: 'security' },
                { label: '🦆  darkwingduck', value: 'darkwingduck' }
            ], { placeHolder: 'Select agent type' });
            if (!agentType)
                return;
            // Get task ID (optional)
            const taskId = yield vscode.window.showInputBox({
                prompt: 'Enter Task/DevCard ID (e.g., TC-001, DC-123) or leave empty for phonetic naming',
                value: ''
            });
            // Get model selection
            const modelSelection = yield vscode.window.showQuickPick([
                { label: 'Sonnet (S) - Default balanced model', value: 'sonnet' },
                { label: 'Opus (O) - Most capable model', value: 'opus' },
                { label: 'Haiku (H) - Fastest model', value: 'haiku' }
            ], { placeHolder: 'Select Claude model' });
            if (!modelSelection)
                return;
            const model = modelSelection.value;
            // Generate display name (with phonetic fallback if no task ID)
            const nameInfo = this.generateDisplayName(agentType.value, model, taskId || undefined);
            const displayName = nameInfo.displayName;
            const phoneticName = nameInfo.phoneticName;
            const sessionName = taskId ? `${agentType.value}-${taskId}` : `${agentType.value}-${phoneticName}`;
            const agentEmoji = this.getAgentEmoji(agentType.value);
            const terminalName = `${agentEmoji} ${this.getStateIcon('idle')} ${displayName}`;
            // Create terminal with dynamic properties
            const terminal = vscode.window.createTerminal({
                name: terminalName,
                iconPath: this.getAgentIcon(agentType.value),
                color: this.getAgentColor(agentType.value),
                cwd: vscode.workspace.rootPath
            });
            // Create status bar item for this agent (compact format) - use dynamic priority based on agent count
            const currentAgentCount = this.getAgentCount();
            const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - currentAgentCount);
            statusBarItem.text = `${agentEmoji}${displayName}○`; // Start with idle state indicator
            statusBarItem.tooltip = `Agent: ${agentType.value}\n${taskId ? `Task: ${taskId}` : `Phonetic: ${phoneticName}`}\nState: idle`;
            statusBarItem.command = 'claude-agents.listAgents';
            // Set initial background color to yellow for idle state
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            statusBarItem.show();
            // Store agent info
            const agentTerminal = {
                terminal,
                agentType: agentType.value,
                taskId: taskId || undefined,
                model,
                state: 'idle',
                sessionName,
                statusBarItem,
                phoneticName,
                displayName
            };
            this.agents.set(sessionName, agentTerminal);
            // Launch the agent using asuperherohasemerged.sh with model parameter and VSCode-specific options
            if (taskId) {
                terminal.sendText(`_scripts/asuperherohasemerged.sh ${agentType.value} ${taskId} --model ${model} --no-attach`);
            }
            else {
                terminal.sendText(`_scripts/asuperherohasemerged.sh ${agentType.value} --model ${model} --no-attach`);
            }
            // After script execution, attach to the tmux session with proper naming
            setTimeout(() => {
                // Set terminal title to match our naming convention
                // DISABLED: printf commands interfere with Claude Code input
                // terminal.sendText(`printf '\\033]0;${terminalName}\\007'`);
                // Attach to the tmux session
                terminal.sendText(`tmux attach -t "${sessionName}"`);
            }, 2000); // Wait 2 seconds for session creation
            terminal.show();
            // Start monitoring for state changes
            this.monitorAgent(sessionName);
        });
    }
    monitorAgent(sessionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const agent = this.agents.get(sessionName);
            if (!agent)
                return;
            // Agent starts idle - Start hook will transition to busy when user gives input
            // Set up file watchers for hook integration
            const workspaceRoot = vscode.workspace.rootPath || '';
            const stopFile = path.join(workspaceRoot, '_logs', 'hooks', `${sessionName}.stop`);
            const triggerDir = path.join(workspaceRoot, '_logs', 'hooks', 'state_updates');
            const displayName = agent.displayName || sessionName;
            const triggerFile = path.join(triggerDir, `${displayName}.trigger`);
            const sessionTriggerFile = path.join(triggerDir, `${sessionName}.trigger`);
            // Monitor stop/trigger files AND session termination
            const checkCompletion = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Check session trigger file first (primary method using session ID)
                    try {
                        const triggerStat = yield vscode.workspace.fs.stat(vscode.Uri.file(sessionTriggerFile));
                        if (triggerStat) {
                            const triggerContent = yield vscode.workspace.fs.readFile(vscode.Uri.file(sessionTriggerFile));
                            const content = Buffer.from(triggerContent).toString('utf8');
                            const parts = content.trim().split(':');
                            const [state, timestamp, updatedDisplayName] = parts;
                            if (state && ['idle', 'busy', 'done', 'error', 'unknown', 'terminated'].includes(state)) {
                                // Update display name if provided in trigger file
                                if (updatedDisplayName && agent) {
                                    agent.displayName = updatedDisplayName;
                                }
                                this.updateAgentState(sessionName, state);
                                // Only clear monitoring for terminal states
                                if (state === 'terminated') {
                                    clearInterval(checkCompletion);
                                }
                                // Clean up trigger file
                                vscode.workspace.fs.delete(vscode.Uri.file(sessionTriggerFile));
                                return;
                            }
                        }
                    }
                    catch (triggerError) {
                        // Session trigger file doesn't exist, try fallback method
                    }
                    // Fallback: Check display name trigger file (for backward compatibility)
                    try {
                        const triggerStat = yield vscode.workspace.fs.stat(vscode.Uri.file(triggerFile));
                        if (triggerStat) {
                            const triggerContent = yield vscode.workspace.fs.readFile(vscode.Uri.file(triggerFile));
                            const content = Buffer.from(triggerContent).toString('utf8');
                            const [state, timestamp] = content.trim().split(':');
                            if (state && ['idle', 'busy', 'done', 'error', 'unknown', 'terminated'].includes(state)) {
                                this.updateAgentState(sessionName, state);
                                // Only clear monitoring for terminal states
                                if (state === 'terminated') {
                                    clearInterval(checkCompletion);
                                }
                                // Clean up trigger file
                                vscode.workspace.fs.delete(vscode.Uri.file(triggerFile));
                                return;
                            }
                        }
                    }
                    catch (triggerError) {
                        // Display name trigger file doesn't exist either
                    }
                    // Fallback: Check legacy stop file
                    try {
                        const stopStat = yield vscode.workspace.fs.stat(vscode.Uri.file(stopFile));
                        if (stopStat) {
                            const stopContent = yield vscode.workspace.fs.readFile(vscode.Uri.file(stopFile));
                            const content = Buffer.from(stopContent).toString('utf8');
                            // Parse stop file: "STOP:timestamp:sessionName:state"
                            const parts = content.trim().split(':');
                            const state = parts[3] || 'done';
                            if (['idle', 'busy', 'done', 'error', 'unknown', 'terminated'].includes(state)) {
                                this.updateAgentState(sessionName, state);
                                // Only clear monitoring for terminal states
                                if (state === 'terminated') {
                                    clearInterval(checkCompletion);
                                }
                            }
                            else {
                                this.updateAgentState(sessionName, 'done');
                            }
                            return;
                        }
                    }
                    catch (stopError) {
                        // Stop file doesn't exist yet, continue monitoring
                    }
                    // Check if tmux session still exists (session termination detection)
                    try {
                        const { exec } = yield Promise.resolve().then(() => require('child_process'));
                        exec(`tmux has-session -t "${sessionName}"`, (error, stdout, stderr) => {
                            if (error) {
                                // Session doesn't exist anymore - it was terminated
                                this.updateAgentState(sessionName, 'terminated');
                                clearInterval(checkCompletion);
                            }
                        });
                    }
                    catch (tmuxError) {
                        // Continue monitoring if tmux check fails
                    }
                }
                catch (error) {
                    // Continue monitoring on any error
                }
            }), 3000); // Check every 3 seconds
            // Clean up after 2 hours
            setTimeout(() => {
                clearInterval(checkCompletion);
            }, 2 * 60 * 60 * 1000);
        });
    }
    // Find agent by session name or display name
    findAgentByIdentifier(identifier) {
        // Try exact session name match first
        let agent = this.agents.get(identifier);
        if (agent)
            return agent;
        // Try to find by display name
        for (const [sessionName, agentData] of this.agents.entries()) {
            if (agentData.displayName === identifier) {
                return agentData;
            }
        }
        // Try to find by tmux session pattern matching
        for (const [sessionName, agentData] of this.agents.entries()) {
            if (sessionName.includes(identifier) || identifier.includes(sessionName)) {
                return agentData;
            }
        }
        return undefined;
    }
    // Public method for finding agents by session ID (for global state monitoring)
    findAgentBySessionId(sessionId) {
        return this.findAgentByIdentifier(sessionId);
    }
    // Extract agent type from session ID (architect-1755692533 -> architect)
    extractAgentTypeFromSessionId(sessionId) {
        const validTypes = ['architect', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
        const parts = sessionId.split('-');
        if (parts.length > 0) {
            const potentialType = parts[0].toLowerCase();
            if (validTypes.includes(potentialType)) {
                return potentialType;
            }
        }
        return undefined;
    }
    // Generate last 3 digits for display
    getDisplaySuffix(sessionId) {
        // Try to extract last 3 digits
        const digitMatch = sessionId.match(/(\d{3,})$/);
        if (digitMatch) {
            return digitMatch[1].slice(-3);
        }
        // Fallback to last 3 characters
        return sessionId.length >= 3 ? sessionId.slice(-3) : sessionId;
    }
    // Clear all existing status bar items (legacy - prefer incremental updates)
    clearAllStatusBarItems() {
        for (const [sessionName, agent] of this.agents.entries()) {
            if (agent.statusBarItem) {
                agent.statusBarItem.dispose();
            }
        }
        this.agents.clear();
    }
    // Incremental update: add, update, or remove specific session
    updateSessionStatusBar(sessionId, sessionData) {
        const existingAgent = this.agents.get(sessionId);
        if (!sessionData) {
            // Remove session that no longer exists
            if (existingAgent && existingAgent.statusBarItem) {
                existingAgent.statusBarItem.dispose();
            }
            this.agents.delete(sessionId);
            return;
        }
        // Extract agent type from session ID
        const agentType = this.extractAgentTypeFromSessionId(sessionId);
        if (!agentType)
            return;
        const state = typeof sessionData === 'object' && sessionData
            ? sessionData.state
            : sessionData;
        const validStates = ['idle', 'busy', 'done', 'stopped', 'unknown'];
        const normalizedState = validStates.includes(state) ? state : 'unknown';
        const healthInfo = (typeof sessionData === 'object' && sessionData)
            ? sessionData.health : undefined;
        if (existingAgent) {
            // Update existing agent (both registered terminals and status-only items)
            console.log(`Updating existing agent ${sessionId}: ${existingAgent.state} -> ${normalizedState}`);
            this.updateExistingStatusBarItem(existingAgent, sessionId, agentType, normalizedState, healthInfo);
        }
        else {
            // Create new status bar item for unregistered sessions
            console.log(`Creating status bar for unregistered session: ${sessionId}`);
            this.createStatusBarItemFromState(sessionId, agentType, normalizedState, healthInfo);
        }
    }
    // Update existing status bar item in place
    updateExistingStatusBarItem(agent, sessionId, agentType, state, healthInfo) {
        if (!agent.statusBarItem)
            return;
        // Update state
        agent.state = state;
        // Generate display name using centralized method
        const taskId = this.extractTaskId(sessionId);
        const displayNameInfo = AgentManager.generateDisplayName(sessionId, agentType, 'sonnet', taskId);
        const displaySuffix = displayNameInfo.displayName.split('-').pop() || displayNameInfo.displayName;
        const agentEmoji = this.getAgentEmoji(agentType);
        const stateIcon = this.getStateIcon(state);
        // Update status bar text and tooltip
        agent.statusBarItem.text = `${agentEmoji}${displaySuffix}`;
        let tooltip = `Agent: ${agentType}\nSession: ${sessionId}\nState: ${state}`;
        if (healthInfo) {
            tooltip += `\nHealth: ${healthInfo.state} (${healthInfo.issues})`;
        }
        agent.statusBarItem.tooltip = tooltip;
        // Update background color
        this.setStatusBarBackgroundColor(agent.statusBarItem, state);
        // Update display name in agent record
        agent.displayName = displayNameInfo.displayName;
        // Update terminal title to reflect current state (following standard: 📋 ⚪ PL-S-013)
        if (agent.terminal) {
            this.updateTerminalTitle(agent.terminal, agentEmoji, stateIcon, displayNameInfo.displayName);
        }
    }
    // Update terminal title with current state - centralized method
    updateTerminalTitle(terminal, agentEmoji, stateIcon, displayName) {
        try {
            // VSCode doesn't allow changing terminal name after creation directly
            // But we can use escape sequences for terminal title (works in some terminals)
            // Format: 📋 ⚪ PL-S-013 (emoji + state + display name)
            const newTitle = `${agentEmoji} ${stateIcon} ${displayName}`;
            // Method 1: Use echo with escape sequences (better than printf for VSCode)
            terminal.sendText(`echo -e "\\033]0;${newTitle}\\007"`);
            // Method 2: Also try tmux rename if available (non-blocking)
            terminal.sendText(`tmux rename-window "${newTitle}" 2>/dev/null || true`);
            console.log(`Updated terminal title to: ${newTitle}`);
        }
        catch (error) {
            console.warn('Failed to update terminal title:', error);
        }
    }
    // Create status bar item from global state
    createStatusBarItemFromState(sessionId, agentType, state, healthInfo) {
        const displaySuffix = this.getDisplaySuffix(sessionId);
        const agentEmoji = this.getAgentEmoji(agentType);
        // Create status bar item with last 3 digits display (no state indicator icon)
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - this.agents.size);
        statusBarItem.text = `${agentEmoji}${displaySuffix}`;
        // Enhanced tooltip with full session ID and health info
        let tooltip = `Agent: ${agentType}\nSession: ${sessionId}\nState: ${state}`;
        if (healthInfo) {
            tooltip += `\nHealth: ${healthInfo.state} (${healthInfo.issues})`;
        }
        statusBarItem.tooltip = tooltip;
        statusBarItem.command = 'claude-agents.listAgents';
        // Set background color based on state (no foreground color change)
        this.setStatusBarBackgroundColor(statusBarItem, state);
        statusBarItem.show();
        // Store in agents map (simplified - no terminal needed for status-only view)
        const taskId = this.extractTaskId(sessionId);
        const displayNameInfo = AgentManager.generateDisplayName(sessionId, agentType, 'sonnet', taskId);
        const agentTerminal = {
            terminal: null,
            agentType,
            taskId,
            model: 'sonnet',
            state,
            sessionName: sessionId,
            statusBarItem,
            displayName: displayNameInfo.displayName
        };
        this.agents.set(sessionId, agentTerminal);
    }
    // Extract task ID from session ID if present
    extractTaskId(sessionId) {
        // Pattern: factory-TC-001 -> TC-001
        const taskMatch = sessionId.match(/-([A-Z]{2}-\d+)$/);
        if (taskMatch) {
            return taskMatch[1];
        }
        // Pattern: factory-001-TS-2025... -> 001-TS-2025...
        const tsMatch = sessionId.match(/-(\d+-TS-.+)$/);
        if (tsMatch) {
            return tsMatch[1];
        }
        return undefined;
    }
    // Set status bar item background color based on state
    setStatusBarBackgroundColor(statusBarItem, state) {
        // Clear existing colors first
        statusBarItem.backgroundColor = undefined;
        statusBarItem.color = undefined;
        switch (state) {
            case 'idle':
                // Yellow background for idle/ready
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
                break;
            case 'busy':
                // Blue background for busy - use more explicit blue color
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
                break;
            case 'done':
            case 'stopped':
            case 'terminated':
            case 'error':
                // Red background for stopped/done/error
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
                break;
            case 'unknown':
            default:
                // Grey background for everything else - no special color
                break;
        }
    }
    // Public function to update agent state by identifier
    updateAgentStateByIdentifier(identifier, newState) {
        const agent = this.findAgentByIdentifier(identifier);
        if (!agent) {
            console.warn(`Agent not found for identifier: ${identifier}`);
            return false;
        }
        this.updateAgentState(agent.sessionName, newState);
        return true;
    }
    // Public methods for extension to use
    registerExistingAgent(sessionName, agentTerminal) {
        this.agents.set(sessionName, agentTerminal);
    }
    getAgentCount() {
        return this.agents.size;
    }
    updateAgentState(sessionName, newState) {
        const agent = this.agents.get(sessionName);
        if (!agent)
            return;
        const oldState = agent.state;
        agent.state = newState;
        // Use stored display name or regenerate if needed
        const displayName = agent.displayName || this.generateDisplayName(agent.agentType, agent.model, agent.taskId).displayName;
        const agentEmoji = this.getAgentEmoji(agent.agentType);
        // Update status bar item with new state (no state indicator icon)
        if (agent.statusBarItem) {
            // Display: emoji + display name (no state indicator)
            agent.statusBarItem.text = `${agentEmoji}${displayName}`;
            agent.statusBarItem.tooltip = `Agent: ${agent.agentType}\n${agent.taskId ? `Task: ${agent.taskId}` : `Phonetic: ${agent.phoneticName}`}\nState: ${newState}`;
            // Update background color based on state
            this.setStatusBarBackgroundColor(agent.statusBarItem, newState);
        }
        // Update terminal title using centralized method
        const stateIcon = this.getStateIcon(newState);
        // Update the terminal title to reflect current state
        if (agent.terminal) {
            this.updateTerminalTitle(agent.terminal, agentEmoji, stateIcon, displayName);
        }
        // DARKWING DUCK EMERGENCY FIX: Disable auto-reset loop!
        // This was creating infinite state transitions: done -> idle -> busy -> done
        // Combined with tmux rename-window, it caused the printf escape sequence flood
        // Auto-reset from done to idle after brief delay (ready for next prompt)
        // if (newState === 'done') {
        //     setTimeout(() => {
        //         // Only reset if still in done state (not if user moved to busy again)
        //         if (this.agents.get(sessionName)?.state === 'done') {
        //             this.updateAgentState(sessionName, 'idle');
        //         }
        //     }, 3000); // 3 second delay
        // }
        console.log(`Agent ${sessionName} state: ${oldState} -> ${newState} (auto-reset disabled)`);
        // Only show notification for important state changes
        if (oldState !== newState && (newState === 'done' || newState === 'error' || newState === 'terminated')) {
            vscode.window.showInformationMessage(`${this.getStateIcon(newState)} Agent ${displayName} is now ${newState}`);
        }
    }
    listAgents() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.agents.size === 0) {
                vscode.window.showInformationMessage('No active agents');
                return;
            }
            const agentList = Array.from(this.agents.values()).map(agent => {
                const displayName = agent.displayName || this.generateDisplayName(agent.agentType, agent.model, agent.taskId).displayName;
                const agentEmoji = this.getAgentEmoji(agent.agentType);
                return `${agentEmoji} ${this.getStateIcon(agent.state)} ${displayName} (${agent.state})`;
            });
            const selected = yield vscode.window.showQuickPick(agentList, {
                placeHolder: 'Select agent to focus'
            });
            if (selected) {
                const sessionName = selected.split(' ')[1].toLowerCase().replace('-', '-');
                const agent = this.agents.get(sessionName);
                if (agent) {
                    agent.terminal.show();
                }
            }
        });
    }
    // Programmatic killing by session name or display name
    killAgentProgrammatic(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const agent = this.findAgentByIdentifier(identifier);
            if (!agent) {
                console.warn(`Agent not found: ${identifier}`);
                return false;
            }
            // Terminate the agent
            agent.terminal.sendText('exit');
            agent.terminal.dispose();
            // Clean up status bar item
            if (agent.statusBarItem) {
                agent.statusBarItem.dispose();
            }
            this.agents.delete(agent.sessionName);
            const displayName = agent.displayName || this.generateDisplayName(agent.agentType, agent.model, agent.taskId).displayName;
            console.log(`Terminated agent: ${displayName}`);
            return true;
        });
    }
    killAgent() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.agents.size === 0) {
                vscode.window.showInformationMessage('No active agents to kill');
                return;
            }
            const agentList = Array.from(this.agents.entries()).map(([sessionName, agent]) => {
                const displayName = agent.displayName || this.generateDisplayName(agent.agentType, agent.model, agent.taskId).displayName;
                const agentEmoji = this.getAgentEmoji(agent.agentType);
                return {
                    label: `${agentEmoji} ${this.getStateIcon(agent.state)} ${displayName}`,
                    sessionName
                };
            });
            const selected = yield vscode.window.showQuickPick(agentList, {
                placeHolder: 'Select agent to terminate'
            });
            if (selected) {
                const agent = this.agents.get(selected.sessionName);
                if (agent) {
                    agent.terminal.sendText('exit');
                    agent.terminal.dispose();
                    // Clean up status bar item
                    if (agent.statusBarItem) {
                        agent.statusBarItem.dispose();
                    }
                    this.agents.delete(selected.sessionName);
                    const displayName = agent.displayName || this.generateDisplayName(agent.agentType, agent.model, agent.taskId).displayName;
                    vscode.window.showInformationMessage(`Terminated agent: ${displayName}`);
                }
            }
        });
    }
}
function activate(context) {
    const agentManager = new AgentManager();
    // Export agentManager globally for external access
    global.claudeAgentManager = agentManager;
    // Helper function to check if tmux session exists
    function checkTmuxSessionExists(sessionName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { exec } = yield Promise.resolve().then(() => require('child_process'));
                const { promisify } = yield Promise.resolve().then(() => require('util'));
                const execAsync = promisify(exec);
                // Sanitize session name to prevent command injection
                const sanitizedName = sessionName.replace(/[^a-zA-Z0-9\-_.]/g, '');
                if (sanitizedName !== sessionName) {
                    console.warn(`Session name contains unsafe characters: ${sessionName}`);
                    return false;
                }
                yield execAsync(`tmux has-session -t "${sanitizedName}"`);
                return true; // Command succeeded = session exists
            }
            catch (error) {
                return false; // Command failed = session doesn't exist
            }
        });
    }
    // Helper function to create terminal for a session from state data
    function createTerminalForSession(sessionId, sessionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const agentType = agentManager.extractAgentTypeFromSessionId(sessionId);
            if (!agentType) {
                console.log(`Skipping non-agent session: ${sessionId}`);
                return;
            }
            const taskId = agentManager.extractTaskId(sessionId);
            const displayNameInfo = AgentManager.generateDisplayName(sessionId, agentType, 'sonnet', taskId);
            const agentEmoji = agentManager.getAgentEmoji(agentType);
            const state = typeof sessionData === 'object' ? (sessionData.state || 'idle') : sessionData;
            const stateIcon = '⚪'; // Default idle state icon
            const terminalName = `${agentEmoji} ${stateIcon} ${displayNameInfo.displayName}`;
            // Create terminal and attach to session
            const terminal = vscode.window.createTerminal({
                name: terminalName,
                iconPath: agentManager.getAgentIcon(agentType),
                color: agentManager.getAgentColor(agentType),
                cwd: vscode.workspace.rootPath
            });
            // Create status bar item
            const priority = 200 - agentManager.getAgentCount();
            const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
            const displaySuffix = displayNameInfo.displayName.split('-').pop() || displayNameInfo.displayName;
            statusBarItem.text = `${agentEmoji}${displaySuffix}`;
            statusBarItem.tooltip = `Agent: ${agentType}\nSession: ${sessionId}\nState: ${state}`;
            statusBarItem.command = 'claude-agents.listAgents';
            // Set background color based on state
            switch (state) {
                case 'idle':
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                    break;
                case 'busy':
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                    break;
                default:
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
            statusBarItem.show();
            // Store agent info
            const agentTerminal = {
                terminal,
                agentType,
                taskId,
                model: 'sonnet',
                state: state,
                sessionName: sessionId,
                statusBarItem,
                displayName: displayNameInfo.displayName
            };
            agentManager.registerExistingAgent(sessionId, agentTerminal);
            // Attach to tmux session (with sanitization)
            const sanitizedId = sessionId.replace(/[^a-zA-Z0-9\-_.]/g, '');
            if (sanitizedId === sessionId) {
                terminal.sendText(`tmux attach -t "${sanitizedId}"`);
            }
            else {
                console.error(`Unsafe session ID detected: ${sessionId}`);
            }
            // Start monitoring
            agentManager.monitorAgent(sessionId);
            console.log(`Created terminal for session: ${sessionId} (${displayNameInfo.displayName})`);
        });
    }
    // Auto-discover and attach to existing tmux agent sessions on activation
    function discoverExistingSessions() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { exec } = yield Promise.resolve().then(() => require('child_process'));
                const { promisify } = yield Promise.resolve().then(() => require('util'));
                const execAsync = promisify(exec);
                // Clean up old agent terminals first to prevent duplicates
                const existingTerminals = vscode.window.terminals;
                const agentTypes = ['architect', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
                for (const terminal of existingTerminals) {
                    // Check if terminal name contains agent indicators (emoji + agent type pattern)
                    const isAgentTerminal = agentTypes.some(type => terminal.name.toLowerCase().includes(type) ||
                        terminal.name.includes('🏗️') || terminal.name.includes('📋') ||
                        terminal.name.includes('🏭') || terminal.name.includes('🔍') ||
                        terminal.name.includes('🕸️') || terminal.name.includes('🛡️') ||
                        terminal.name.includes('🦆') || terminal.name.includes('🤖'));
                    if (isAgentTerminal) {
                        console.log(`Disposing old agent terminal: ${terminal.name}`);
                        terminal.dispose();
                    }
                }
                // Clear the agent manager's registry to start fresh
                while (agentManager.getAgentCount() > 0) {
                    // Clear internal agents map - we'll need to access the private map
                    // This is a bit hacky but necessary for cleanup
                    const agents = agentManager.agents;
                    for (const [sessionName, agent] of agents.entries()) {
                        if (agent.statusBarItem) {
                            agent.statusBarItem.dispose();
                        }
                        agents.delete(sessionName);
                        break; // Delete one at a time to avoid iterator issues
                    }
                }
                // Get list of tmux sessions
                const { stdout } = yield execAsync('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""');
                if (!stdout.trim()) {
                    console.log('No tmux sessions found');
                    return;
                }
                const sessions = stdout.trim().split('\n');
                let discoveredCount = 0;
                for (const session of sessions) {
                    // Check if this is an agent session
                    const agentType = agentTypes.find(type => session.toLowerCase().includes(type));
                    if (!agentType)
                        continue;
                    // Parse session name and determine if it's from our scripts or external
                    let displayName;
                    let taskId;
                    let phoneticName;
                    let model = 'sonnet'; // Default
                    // Check if this looks like our script format: agentType-taskId or agentType-phonetic
                    const parts = session.split('-');
                    if (parts.length >= 2) {
                        const remainingPart = parts.slice(1).join('-');
                        // Check if it's a known task ID pattern or phonetic name
                        const isTaskId = remainingPart.match(/^(TC-\d+|DC-\d+|\d+-TS-|[A-Z]{2}-\d+)/) ||
                            remainingPart.match(/^\d{3}$/); // Pure 3-digit number
                        const isPhonetic = (_a = agentManager.phoneticAlphabet) === null || _a === void 0 ? void 0 : _a.includes(remainingPart.toLowerCase());
                        if (isTaskId || isPhonetic) {
                            // This looks like our script format - use normal display name generation
                            taskId = isTaskId ? remainingPart : undefined;
                            phoneticName = isPhonetic ? remainingPart : undefined;
                            const nameInfo = agentManager.generateDisplayName(agentType, model, taskId);
                            displayName = nameInfo.displayName;
                            if (!phoneticName && nameInfo.phoneticName) {
                                phoneticName = nameInfo.phoneticName;
                            }
                        }
                        else {
                            // External session - use last 3 digits/chars for better uniqueness
                            const shortName = agentManager.getAgentShortName(agentType);
                            const modelIndicator = agentManager.getModelIndicator(model);
                            // Extract last 3 digits if available, otherwise last 3 chars
                            const digitMatch = session.match(/(\d{3,})$/);
                            const sessionSuffix = digitMatch ? digitMatch[1].slice(-3) :
                                (session.length >= 3 ? session.slice(-3) : session);
                            displayName = `${shortName}-${modelIndicator}-${sessionSuffix}`;
                        }
                    }
                    else {
                        // Single part session name - prefer last 3 digits, fallback to last 3 chars
                        const shortName = agentManager.getAgentShortName(agentType);
                        const modelIndicator = agentManager.getModelIndicator(model);
                        const digitMatch = session.match(/(\d{3,})$/);
                        const sessionSuffix = digitMatch ? digitMatch[1].slice(-3) :
                            (session.length >= 3 ? session.slice(-3) : session);
                        displayName = `${shortName}-${modelIndicator}-${sessionSuffix}`;
                    }
                    const agentEmoji = agentManager.getAgentEmoji(agentType);
                    const terminalName = `${agentEmoji} ⚪ ${displayName}`;
                    // Create terminal and attach to session
                    const terminal = vscode.window.createTerminal({
                        name: terminalName,
                        iconPath: agentManager.getAgentIcon(agentType),
                        color: agentManager.getAgentColor(agentType),
                        cwd: vscode.workspace.rootPath
                    });
                    // Create status bar item with compact display - use decreasing priority for each agent
                    const priority = 200 - discoveredCount; // Ensure each agent gets a unique priority
                    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
                    // Compact format: emoji + short name + state indicator
                    statusBarItem.text = `${agentEmoji}${displayName}○`; // Start with idle state indicator
                    statusBarItem.tooltip = `Agent: ${agentType}\nSession: ${session}\n${taskId ? `Task: ${taskId}` : ''}\nState: idle`;
                    statusBarItem.command = 'claude-agents.listAgents';
                    // Set initial background color to yellow for idle state
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                    statusBarItem.show();
                    // Store agent info
                    const agentTerminal = {
                        terminal,
                        agentType,
                        taskId,
                        model,
                        state: 'idle',
                        sessionName: session,
                        statusBarItem,
                        phoneticName,
                        displayName
                    };
                    agentManager.registerExistingAgent(session, agentTerminal);
                    // Attach to tmux session
                    terminal.sendText(`tmux attach -t "${session}"`);
                    // Start monitoring
                    agentManager.monitorAgent(session);
                    console.log(`Discovered and attached to existing session: ${session}`);
                    discoveredCount++;
                }
                if (discoveredCount > 0) {
                    vscode.window.showInformationMessage(`🔗 Attached to ${discoveredCount} existing agent session(s)`);
                }
            }
            catch (error) {
                console.error('Failed to discover tmux sessions:', error);
            }
        });
    }
    // Discover existing sessions using agent_states.json as source of truth
    function discoverExistingSessionsFromState() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Clean up old agent terminals first to prevent duplicates
                const existingTerminals = vscode.window.terminals;
                const agentTypes = ['architect', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
                // Collect terminals to dispose first to avoid race condition
                const terminalsToDispose = [];
                for (const terminal of existingTerminals) {
                    const isAgentTerminal = agentTypes.some(type => terminal.name.toLowerCase().includes(type) ||
                        terminal.name.includes('🏗️') || terminal.name.includes('📋') ||
                        terminal.name.includes('🏭') || terminal.name.includes('🔍') ||
                        terminal.name.includes('🕸️') || terminal.name.includes('🛡️') ||
                        terminal.name.includes('🦆') || terminal.name.includes('🤖'));
                    if (isAgentTerminal) {
                        terminalsToDispose.push(terminal);
                    }
                }
                // Dispose terminals safely
                for (const terminal of terminalsToDispose) {
                    console.log(`Disposing old agent terminal: ${terminal.name}`);
                    terminal.dispose();
                }
                // Clear the agent manager's registry to start fresh
                const agents = agentManager.agents;
                const agentsToClean = Array.from(agents.entries());
                for (const [sessionName, agent] of agentsToClean) {
                    if (agent.statusBarItem) {
                        agent.statusBarItem.dispose();
                    }
                    agents.delete(sessionName);
                }
                // Read agent_states.json for session list (use workspace-relative path)
                const workspaceRoot = vscode.workspace.rootPath || '';
                const globalStateFile = path.join(workspaceRoot, '_featstate', 'agent_states.json');
                const stateData = yield vscode.workspace.fs.readFile(vscode.Uri.file(globalStateFile));
                const stateJson = JSON.parse(Buffer.from(stateData).toString('utf8'));
                if (!stateJson.sessions) {
                    console.log('No sessions found in agent_states.json');
                    return;
                }
                let discoveredCount = 0;
                // Create terminals for sessions that exist in state file AND tmux
                for (const [sessionId, sessionData] of Object.entries(stateJson.sessions)) {
                    // Skip sessions marked as dead/not_found
                    if (typeof sessionData === 'object' && sessionData !== null &&
                        ((_a = sessionData.health) === null || _a === void 0 ? void 0 : _a.state) === 'dead') {
                        console.log(`Skipping dead session: ${sessionId}`);
                        continue;
                    }
                    // Check if tmux session actually exists
                    const sessionExists = yield checkTmuxSessionExists(sessionId);
                    if (sessionExists) {
                        try {
                            yield createTerminalForSession(sessionId, sessionData);
                            discoveredCount++;
                        }
                        catch (terminalError) {
                            console.error(`Failed to create terminal for ${sessionId}:`, terminalError);
                            // Continue with other sessions
                        }
                    }
                    else {
                        console.log(`Skipping stale session: ${sessionId} (not in tmux)`);
                    }
                }
                if (discoveredCount > 0) {
                    vscode.window.showInformationMessage(`🔗 Discovered ${discoveredCount} active agent session(s)`);
                }
                else {
                    console.log('No active tmux sessions found matching agent_states.json');
                }
            }
            catch (error) {
                console.error('Failed to discover sessions from state:', error);
            }
        });
    }
    // Enable hybrid session discovery using agent_states.json with tmux validation
    setTimeout(discoverExistingSessionsFromState, 1000);
    // Set up file-based command system for external communication
    const workspaceRoot = vscode.workspace.rootPath || '';
    const commandDir = path.join(workspaceRoot, '_logs', 'vscode_commands');
    // Create command directory
    vscode.workspace.fs.createDirectory(vscode.Uri.file(commandDir)).then(() => console.log('Command directory created'), () => { } // Directory might already exist
    );
    // Poll for command files instead of using file watcher (more reliable)
    let commandPoller;
    function checkForCommands() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = yield vscode.workspace.fs.readDirectory(vscode.Uri.file(commandDir));
                for (const [filename, type] of files) {
                    if (!filename.endsWith('.json') || filename.endsWith('.response.json'))
                        continue;
                    const uri = vscode.Uri.file(path.join(commandDir, filename));
                    try {
                        // Read command file
                        const commandData = yield vscode.workspace.fs.readFile(uri);
                        const command = JSON.parse(Buffer.from(commandData).toString('utf8'));
                        const responseFile = uri.fsPath + '.response';
                        let responseMessage = '';
                        switch (command.command) {
                            case 'spawn':
                                try {
                                    const result = yield agentManager.spawnAgentProgrammatic({
                                        agentType: command.agentType,
                                        taskId: command.taskId || undefined,
                                        model: command.model || 'sonnet'
                                    });
                                    responseMessage = `Agent spawned: ${result.displayName} (${result.sessionName})`;
                                }
                                catch (error) {
                                    responseMessage = `Failed to spawn agent: ${error}`;
                                }
                                break;
                            case 'kill':
                                try {
                                    const success = yield agentManager.killAgentProgrammatic(command.identifier);
                                    responseMessage = success
                                        ? `Agent ${command.identifier} terminated successfully`
                                        : `Agent ${command.identifier} not found`;
                                }
                                catch (error) {
                                    responseMessage = `Failed to kill agent: ${error}`;
                                }
                                break;
                            case 'register_current_terminal':
                                try {
                                    // Find the active terminal that's running the script
                                    const activeTerminal = vscode.window.activeTerminal;
                                    if (!activeTerminal) {
                                        responseMessage = 'No active terminal found to register as agent terminal';
                                        break;
                                    }
                                    // Check if this terminal is already registered
                                    const existingAgent = Array.from(agentManager.agents.values()).find(agent => agent.terminal === activeTerminal);
                                    if (existingAgent) {
                                        responseMessage = `Terminal already registered as agent: ${existingAgent.sessionName}`;
                                        break;
                                    }
                                    // Create status bar item for this session
                                    const currentAgentCount = agentManager.getAgentCount();
                                    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - currentAgentCount);
                                    // Use centralized display name generation
                                    const displayNameInfo = AgentManager.generateDisplayName(command.sessionName, command.agentType, command.model || 'sonnet', command.taskId);
                                    const agentEmoji = agentManager.getAgentEmoji(command.agentType);
                                    const displaySuffix = displayNameInfo.displayName.split('-').pop() || displayNameInfo.displayName;
                                    // Start with idle state
                                    statusBarItem.text = `${agentEmoji}${displaySuffix}`;
                                    statusBarItem.tooltip = `Agent: ${command.agentType}\nSession: ${command.sessionName}\nState: idle`;
                                    statusBarItem.command = 'claude-agents.listAgents';
                                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                                    statusBarItem.show();
                                    // Register the current terminal as agent terminal
                                    const agentTerminal = {
                                        terminal: activeTerminal,
                                        agentType: command.agentType,
                                        taskId: command.taskId,
                                        model: command.model || 'sonnet',
                                        state: 'idle',
                                        sessionName: command.sessionName,
                                        statusBarItem,
                                        displayName: displayNameInfo.displayName
                                    };
                                    agentManager.registerExistingAgent(command.sessionName, agentTerminal);
                                    // Start monitoring for this agent
                                    agentManager.monitorAgent(command.sessionName);
                                    // Update terminal title via escape sequence (the script already did this)
                                    // The terminal should already have the correct title from the script
                                    responseMessage = `Registered current terminal as agent: ${command.sessionName} (${displayNameInfo.displayName})`;
                                }
                                catch (error) {
                                    responseMessage = `Failed to register current terminal: ${error}`;
                                }
                                break;
                            case 'create_terminal':
                                try {
                                    // Create a new VSCode terminal with proper agent integration
                                    const terminal = vscode.window.createTerminal({
                                        name: command.name,
                                        iconPath: agentManager.getAgentIcon(command.agentType),
                                        color: agentManager.getAgentColor(command.agentType),
                                        cwd: vscode.workspace.rootPath
                                    });
                                    // Create status bar item for this session
                                    const currentAgentCount = agentManager.getAgentCount();
                                    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - currentAgentCount);
                                    // Use centralized display name generation
                                    const displayNameInfo = AgentManager.generateDisplayName(command.sessionName, command.agentType, command.model || 'sonnet', command.taskId);
                                    const agentEmoji = agentManager.getAgentEmoji(command.agentType);
                                    const displaySuffix = displayNameInfo.displayName.split('-').pop() || displayNameInfo.displayName;
                                    // Start with idle state
                                    statusBarItem.text = `${agentEmoji}${displaySuffix}`;
                                    statusBarItem.tooltip = `Agent: ${command.agentType}\nSession: ${command.sessionName}\nState: idle`;
                                    statusBarItem.command = 'claude-agents.listAgents';
                                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                                    statusBarItem.show();
                                    // Store agent info in manager
                                    const agentTerminal = {
                                        terminal,
                                        agentType: command.agentType,
                                        taskId: command.taskId,
                                        model: command.model || 'sonnet',
                                        state: 'idle',
                                        sessionName: command.sessionName,
                                        statusBarItem,
                                        displayName: displayNameInfo.displayName
                                    };
                                    agentManager.registerExistingAgent(command.sessionName, agentTerminal);
                                    // Show the new terminal
                                    terminal.show();
                                    // Attach to tmux session if it exists, with proper error handling
                                    if (command.sessionName) {
                                        terminal.sendText(`if tmux has-session -t "${command.sessionName}" 2>/dev/null; then`);
                                        terminal.sendText(`  echo "📡 Attaching to existing session: ${command.sessionName}"`);
                                        terminal.sendText(`  tmux attach -t "${command.sessionName}"`);
                                        terminal.sendText(`else`);
                                        terminal.sendText(`  echo "⚠️  Session ${command.sessionName} not found or not ready yet"`);
                                        terminal.sendText(`  echo "📝 Try: tmux attach -t ${command.sessionName}"`);
                                        terminal.sendText(`fi`);
                                    }
                                    // Start monitoring for this agent
                                    agentManager.monitorAgent(command.sessionName);
                                    responseMessage = `Terminal created and attached: ${command.name} (${command.sessionName})`;
                                }
                                catch (error) {
                                    responseMessage = `Failed to create terminal: ${error}`;
                                }
                                break;
                            default:
                                responseMessage = `Unknown command: ${command.command}`;
                        }
                        // Write response file
                        yield vscode.workspace.fs.writeFile(vscode.Uri.file(responseFile), Buffer.from(responseMessage, 'utf8'));
                        // Delete the command file after processing
                        yield vscode.workspace.fs.delete(uri);
                    }
                    catch (error) {
                        console.error('Failed to process command file:', error);
                    }
                }
            }
            catch (error) {
                // Directory might not exist yet
            }
        });
    }
    // Start polling for commands every 2 seconds
    commandPoller = setInterval(checkForCommands, 2000);
    context.subscriptions.push({ dispose: () => clearInterval(commandPoller) });
    // Monitor global agent state file using inotify for dynamic terminal title updates
    const globalStateFile = '/home/lama/projects/djhatch-state/_featstate/agent_states.json';
    let inotifyProcess;
    // Track previous state for diffing
    let previousSessions = {};
    function updateStatusBarFromGlobalState(sessions) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Updating status bar from global state:', Object.keys(sessions));
            // Incremental updates instead of clearing all
            const currentSessionIds = new Set(Object.keys(sessions));
            const previousSessionIds = new Set(Object.keys(previousSessions));
            // Remove sessions that no longer exist
            for (const sessionId of previousSessionIds) {
                if (!currentSessionIds.has(sessionId)) {
                    console.log(`Removing session: ${sessionId}`);
                    agentManager.updateSessionStatusBar(sessionId, null);
                }
            }
            // Add or update current sessions
            for (const [sessionId, sessionData] of Object.entries(sessions)) {
                const previousData = previousSessions[sessionId];
                // Always update registered terminals, only update status-only items if changed
                const existingAgent = agentManager.agents.get(sessionId);
                const isRegisteredTerminal = existingAgent && existingAgent.terminal;
                if (isRegisteredTerminal || !previousData || JSON.stringify(previousData) !== JSON.stringify(sessionData)) {
                    console.log(`Updating session: ${sessionId} (registered: ${!!isRegisteredTerminal})`);
                    agentManager.updateSessionStatusBar(sessionId, sessionData);
                }
            }
            // Store current state for next comparison
            previousSessions = JSON.parse(JSON.stringify(sessions));
        });
    }
    // Set up inotify-based global state file monitoring
    function setupStateMonitoring() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { spawn } = yield Promise.resolve().then(() => require('child_process'));
                // Use inotifywait to monitor the global state file
                inotifyProcess = spawn('inotifywait', [
                    '-m',
                    '-e', 'modify,close_write',
                    globalStateFile
                ]);
                (_a = inotifyProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const event = data.toString().trim();
                        console.log('inotify event:', event);
                        // Small delay to ensure file write is complete
                        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                            try {
                                const stateData = yield vscode.workspace.fs.readFile(vscode.Uri.file(globalStateFile));
                                const stateJson = JSON.parse(Buffer.from(stateData).toString('utf8'));
                                if (stateJson.sessions) {
                                    yield updateStatusBarFromGlobalState(stateJson.sessions);
                                }
                            }
                            catch (parseError) {
                                console.warn('Failed to parse global state file after inotify event:', parseError);
                            }
                        }), 250); // 250ms debounce delay for better stability
                    }
                    catch (error) {
                        console.warn('Failed to process inotify event:', error);
                    }
                }));
                (_b = inotifyProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
                    console.warn('inotify stderr:', data.toString());
                });
                inotifyProcess.on('close', (code) => {
                    console.log('inotify process closed with code:', code);
                });
                // Initial load of state file
                try {
                    const stateData = yield vscode.workspace.fs.readFile(vscode.Uri.file(globalStateFile));
                    const stateJson = JSON.parse(Buffer.from(stateData).toString('utf8'));
                    if (stateJson.sessions) {
                        console.log('Initial global state load - updating status bar');
                        yield updateStatusBarFromGlobalState(stateJson.sessions);
                    }
                }
                catch (initialLoadError) {
                    console.log('Global state file not found or invalid, will monitor for changes');
                }
                // Clean up inotify process on extension deactivation
                context.subscriptions.push({
                    dispose: () => {
                        if (inotifyProcess) {
                            inotifyProcess.kill();
                        }
                    }
                });
                console.log('Global agent state monitoring activated with inotify');
            }
            catch (inotifyError) {
                console.warn('Failed to set up inotify monitoring:', inotifyError);
                // Fallback to polling as backup
                const fallbackPoller = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const stateData = yield vscode.workspace.fs.readFile(vscode.Uri.file(globalStateFile));
                        const stateJson = JSON.parse(Buffer.from(stateData).toString('utf8'));
                        if (stateJson.sessions) {
                            yield updateStatusBarFromGlobalState(stateJson.sessions);
                        }
                    }
                    catch (error) {
                        // Silent fail for polling fallback
                    }
                }), 5000); // Poll every 5 seconds as fallback
                context.subscriptions.push({ dispose: () => clearInterval(fallbackPoller) });
                console.log('Using polling fallback for state monitoring');
            }
        });
    }
    // Start state monitoring
    setupStateMonitoring();
    // Register commands
    const spawnCommand = vscode.commands.registerCommand('claude-agents.spawnAgent', () => {
        agentManager.spawnAgent();
    });
    const listCommand = vscode.commands.registerCommand('claude-agents.listAgents', () => {
        agentManager.listAgents();
    });
    const killCommand = vscode.commands.registerCommand('claude-agents.killAgent', () => {
        agentManager.killAgent();
    });
    // Command to update agent state (for external use)
    const updateStateCommand = vscode.commands.registerCommand('claude-agents.updateState', (identifier, state) => {
        return agentManager.updateAgentStateByIdentifier(identifier, state);
    });
    // Programmatic commands (no UI prompts)
    const spawnProgrammaticCommand = vscode.commands.registerCommand('claude-agents.spawnProgrammatic', (agentType, taskId, model) => {
        return agentManager.spawnAgentProgrammatic({ agentType, taskId, model });
    });
    const killProgrammaticCommand = vscode.commands.registerCommand('claude-agents.killProgrammatic', (identifier) => {
        return agentManager.killAgentProgrammatic(identifier);
    });
    // Command to convert current terminal to agent
    // Command to manually sync existing tmux agent sessions (creates new terminals)
    const syncTmuxSessionsCommand = vscode.commands.registerCommand('claude-agents.syncTmuxSessions', () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { exec } = yield Promise.resolve().then(() => require('child_process'));
            const { promisify } = yield Promise.resolve().then(() => require('util'));
            const execAsync = promisify(exec);
            const { stdout } = yield execAsync('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""');
            if (!stdout.trim()) {
                vscode.window.showInformationMessage('No tmux sessions found');
                return;
            }
            const tmuxSessions = stdout.trim().split('\n');
            const agentSessions = tmuxSessions.filter(session => {
                return agentManager.extractAgentTypeFromSessionId(session) !== undefined;
            });
            if (agentSessions.length === 0) {
                vscode.window.showInformationMessage('No Claude agent sessions found in tmux');
                return;
            }
            // Show selection of available sessions
            const sessionItems = agentSessions.map(session => {
                const agentType = agentManager.extractAgentTypeFromSessionId(session);
                const agentEmoji = agentManager.getAgentEmoji(agentType);
                const existing = agentManager.findAgentBySessionId(session);
                const status = existing ? ' (already synced)' : '';
                return {
                    label: `${agentEmoji} ${session}${status}`,
                    description: `Agent type: ${agentType}`,
                    session,
                    alreadySynced: !!existing
                };
            });
            const selected = yield vscode.window.showQuickPick(sessionItems, {
                placeHolder: 'Select tmux agent sessions to sync with VSCode (creates new terminals)',
                canPickMany: true
            });
            if (!selected || selected.length === 0)
                return;
            let syncedCount = 0;
            for (const item of selected) {
                if (item.alreadySynced) {
                    vscode.window.showInformationMessage(`Session ${item.session} is already synced`);
                    continue;
                }
                const session = item.session;
                const agentType = agentManager.extractAgentTypeFromSessionId(session);
                const taskId = agentManager.extractTaskId(session);
                const displayNameInfo = AgentManager.generateDisplayName(session, agentType, 'sonnet', taskId);
                const terminal = vscode.window.createTerminal({
                    name: `${agentManager.getAgentEmoji(agentType)} ⚪ ${displayNameInfo.displayName}`,
                    iconPath: agentManager.getAgentIcon(agentType),
                    color: agentManager.getAgentColor(agentType),
                    cwd: vscode.workspace.rootPath
                });
                terminal.show();
                terminal.sendText(`tmux attach -t "${session}"`);
                // Create status bar item
                const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200 - agentManager.getAgentCount());
                const displaySuffix = displayNameInfo.displayName.split('-').pop() || displayNameInfo.displayName;
                statusBarItem.text = `${agentManager.getAgentEmoji(agentType)}${displaySuffix}`;
                statusBarItem.tooltip = `Agent: ${agentType}\nSession: ${session}\nState: idle`;
                statusBarItem.command = 'claude-agents.listAgents';
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                statusBarItem.show();
                // Register in agent manager
                const agentTerminal = {
                    terminal,
                    agentType,
                    taskId,
                    model: 'sonnet',
                    state: 'idle',
                    sessionName: session,
                    statusBarItem,
                    displayName: displayNameInfo.displayName
                };
                agentManager.registerExistingAgent(session, agentTerminal);
                agentManager.monitorAgent(session);
                syncedCount++;
            }
            if (syncedCount > 0) {
                vscode.window.showInformationMessage(`Created ${syncedCount} new terminal(s) for tmux agent sessions`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sync tmux sessions: ${error}`);
        }
    }));
    const convertTerminalCommand = vscode.commands.registerCommand('claude-agents.convertTerminal', () => __awaiter(this, void 0, void 0, function* () {
        const activeTerminal = vscode.window.activeTerminal;
        if (!activeTerminal) {
            vscode.window.showErrorMessage('No active terminal to convert');
            return;
        }
        // Quick pick for agent type
        const agentTypes = ['architect', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
        const agentType = yield vscode.window.showQuickPick(agentTypes, {
            placeHolder: 'Select agent type'
        });
        if (!agentType)
            return;
        // Optional task ID input
        const taskId = yield vscode.window.showInputBox({
            prompt: 'Task ID (optional - leave empty for phonetic name)',
            placeHolder: 'e.g., TC-001, DC-123'
        });
        // Generate display name
        const nameInfo = agentManager.generateDisplayName(agentType, 'sonnet', taskId);
        const agentEmoji = agentManager.getAgentEmoji(agentType);
        const newTerminalName = `${agentEmoji} ⚪ ${nameInfo.displayName}`;
        // Create new terminal with proper name and dispose old one
        const newTerminal = vscode.window.createTerminal({
            name: newTerminalName,
            iconPath: agentManager.getAgentIcon(agentType),
            color: agentManager.getAgentColor(agentType),
            cwd: vscode.workspace.rootPath
        });
        // Show the new terminal
        newTerminal.show();
        // Send launch command
        const sessionName = taskId ? `${agentType}-${taskId}` : `${agentType}-${nameInfo.phoneticName}`;
        newTerminal.sendText(`_scripts/asuperherohasemerged.sh ${agentType}${taskId ? ` ${taskId}` : ''} --no-attach`);
        newTerminal.sendText(`tmux attach -t ${sessionName}`);
        // Dispose the old terminal after a short delay
        setTimeout(() => {
            activeTerminal.dispose();
        }, 1000);
        vscode.window.showInformationMessage(`✅ Converted terminal to ${agentType} agent: ${nameInfo.displayName}`);
    }));
    // Removed automatic tmux session monitoring to prevent duplicate terminals
    // Users can manually sync existing tmux sessions using the sync command
    console.log('Agent terminal registration will be handled via script notifications');
    context.subscriptions.push(spawnCommand, listCommand, killCommand, updateStateCommand, spawnProgrammaticCommand, killProgrammaticCommand, syncTmuxSessionsCommand, convertTerminalCommand);
    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(robot) Claude Agents";
    statusBarItem.command = 'claude-agents.spawnAgent';
    statusBarItem.tooltip = 'Spawn Claude Agent (Ctrl+Alt+A)';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map