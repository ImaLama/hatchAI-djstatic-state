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
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
let statusBarItem;
let activeTerminalStatusBarItem;
let fileWatcher;
let currentStates = {};
let terminalStateTracking = new Map();
// Agent configuration
const AGENT_CONFIG = {
    'architect': { emoji: '🏗️', shortName: 'AR' },
    'planner': { emoji: '📋', shortName: 'PL' },
    'factory': { emoji: '🏭', shortName: 'FA' },
    'qa': { emoji: '🔍', shortName: 'QA' },
    'weaver': { emoji: '🕸️', shortName: 'WE' },
    'security': { emoji: '🛡️', shortName: 'SE' },
    'darkwingduck': { emoji: '🦆', shortName: 'DD' }
};
const STATE_CONFIG = {
    'busy': { icon: '🔵', label: 'Busy', priority: 1, vsCodeIcon: '$(debug-start)' },
    'interrupted': { icon: '🟡', label: 'Interrupted', priority: 2, vsCodeIcon: '$(warning)' },
    'idle': { icon: '⚪', label: 'Idle', priority: 3, vsCodeIcon: '$(circle-outline)' },
    'done': { icon: '🟢', label: 'Done', priority: 4, vsCodeIcon: '$(check)' },
    'stopped': { icon: '🛑', label: 'Stopped', priority: 5, vsCodeIcon: '$(debug-stop)' },
    'dead': { icon: '🔴', label: 'Dead', priority: 6, vsCodeIcon: '$(error)' },
    'unknown': { icon: '❓', label: 'Unknown', priority: 7, vsCodeIcon: '$(question)' }
};
function activate(context) {
    const stateFilePath = '/home/lama/projects/djhatch-state/_featstate/agent_states.json';
    // Create main status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200);
    statusBarItem.command = 'claude-agents.showSessions';
    // Initial update
    updateStatusBar(stateFilePath);
    updateTerminalPanels();
    // Set up file watcher
    setupFileWatcher(stateFilePath);
    // Set up terminal monitoring
    setupTerminalMonitoring(context);
    // Register commands
    registerCommands(context, stateFilePath);
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();
    console.log('Claude Agents extension activated (enhanced with terminal tracking)');
}
exports.activate = activate;
function setupTerminalMonitoring(context) {
    // Monitor when terminals are created
    context.subscriptions.push(vscode.window.onDidOpenTerminal(terminal => {
        setTimeout(() => {
            identifyAndUpdateTerminal(terminal);
        }, 1000); // Wait for terminal to initialize
    }));
    // Monitor active terminal changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTerminal(terminal => {
        if (terminal) {
            identifyAndUpdateTerminal(terminal);
            updateActiveTerminalStatus(terminal);
        }
        else {
            // Clear active terminal status when no terminal is active
            if (activeTerminalStatusBarItem) {
                activeTerminalStatusBarItem.dispose();
                activeTerminalStatusBarItem = undefined;
            }
        }
    }));
    // Monitor terminal disposal
    context.subscriptions.push(vscode.window.onDidCloseTerminal(terminal => {
        terminalStateTracking.delete(terminal);
    }));
    // Update all terminals periodically to catch session changes
    setInterval(() => {
        updateTerminalPanels();
    }, 5000);
}
function setupFileWatcher(stateFilePath) {
    try {
        fileWatcher = fs.watch(stateFilePath, (eventType, filename) => {
            clearTimeout(fileWatcher.debounceTimer);
            fileWatcher.debounceTimer = setTimeout(() => {
                console.log(`Agent states file ${eventType}: ${filename}`);
                updateStatusBar(stateFilePath);
                updateTerminalPanels();
            }, 250);
        });
        // Also watch directory
        const dir = path.dirname(stateFilePath);
        const dirWatcher = fs.watch(dir, (eventType, filename) => {
            if (filename === path.basename(stateFilePath)) {
                clearTimeout(dirWatcher.debounceTimer);
                dirWatcher.debounceTimer = setTimeout(() => {
                    updateStatusBar(stateFilePath);
                    updateTerminalPanels();
                }, 250);
            }
        });
        console.log(`Watching agent states file: ${stateFilePath}`);
    }
    catch (error) {
        console.error('Failed to set up file watcher:', error);
        setInterval(() => {
            updateStatusBar(stateFilePath);
            updateTerminalPanels();
        }, 5000);
    }
}
function updateTerminalPanels() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stateData = yield readStateFile('/home/lama/projects/djhatch-state/_featstate/agent_states.json');
            if (!stateData || !stateData.sessions)
                return;
            currentStates = stateData.sessions;
            // Update all open terminals
            vscode.window.terminals.forEach(terminal => {
                identifyAndUpdateTerminal(terminal);
            });
        }
        catch (error) {
            console.error('Error updating terminal panels:', error);
        }
    });
}
function identifyAndUpdateTerminal(terminal) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sessionName = yield getTmuxSessionForTerminal(terminal);
            if (sessionName && currentStates[sessionName]) {
                const state = getSessionState(currentStates[sessionName]);
                const health = getSessionHealth(currentStates[sessionName]);
                // Store the association
                terminalStateTracking.set(terminal, {
                    sessionName,
                    state,
                    health,
                    originalName: terminal.name,
                    displayName: generateDisplayName(sessionName, state, health)
                });
                console.log(`Identified terminal: ${terminal.name} -> ${sessionName} (${state})`);
                // Show notification for critical states
                if (state === 'dead' || health === 'interrupted') {
                    showTerminalStateNotification(terminal, sessionName, state, health);
                }
            }
        }
        catch (error) {
            console.error('Error identifying terminal session:', error);
        }
    });
}
function getTmuxSessionForTerminal(terminal) {
    return new Promise((resolve) => {
        // Method 1: Check terminal name for agent session pattern
        const extractedSession = extractSessionFromTerminalName(terminal.name);
        if (extractedSession && currentStates[extractedSession]) {
            resolve(extractedSession);
            return;
        }
        // Method 2: Try common patterns in terminal names
        const patterns = [
            /(architect-[\\w-]+)/,
            /(planner-[\\w-]+)/,
            /(factory-[\\w-]+)/,
            /(qa-[\\w-]+)/,
            /(weaver-[\\w-]+)/,
            /(security-[\\w-]+)/,
            /(darkwingduck-[\\w-]+)/
        ];
        for (const pattern of patterns) {
            const match = terminal.name.match(pattern);
            if (match && currentStates[match[1]]) {
                resolve(match[1]);
                return;
            }
        }
        // Method 3: Check if the terminal name contains any known session names
        const sessionNames = Object.keys(currentStates);
        for (const sessionName of sessionNames) {
            if (terminal.name.includes(sessionName)) {
                resolve(sessionName);
                return;
            }
        }
        resolve(null);
    });
}
function extractSessionFromTerminalName(name) {
    // Remove common prefixes and emojis to extract session name
    const cleaned = name.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\\s*/, '').replace(/^[⚪🔵🟢🔴🟡🛑❓]+\\s*/, '');
    // Look for agent session patterns
    const agentTypes = Object.keys(AGENT_CONFIG);
    for (const agentType of agentTypes) {
        const pattern = new RegExp(`(${agentType}-[\\\\w-]+)`);
        const match = cleaned.match(pattern);
        if (match) {
            return match[1];
        }
    }
    // Check if it's exactly a session name
    if (currentStates[cleaned]) {
        return cleaned;
    }
    // Check if the name contains a session name
    const sessionNames = Object.keys(currentStates);
    for (const sessionName of sessionNames) {
        if (cleaned.includes(sessionName)) {
            return sessionName;
        }
    }
    return null;
}
function generateDisplayName(sessionName, state, health) {
    var _a, _b;
    const agentType = extractAgentType(sessionName);
    const agentEmoji = agentType ? ((_a = AGENT_CONFIG[agentType]) === null || _a === void 0 ? void 0 : _a.emoji) || '🤖' : '🤖';
    const stateIcon = ((_b = STATE_CONFIG[state]) === null || _b === void 0 ? void 0 : _b.icon) || '❓';
    const healthIndicator = health !== 'healthy' ? ` [${health}]` : '';
    return `${agentEmoji} ${stateIcon} ${sessionName}${healthIndicator}`;
}
function updateActiveTerminalStatus(terminal) {
    const trackingData = terminalStateTracking.get(terminal);
    if (trackingData) {
        // Dispose previous status bar item
        if (activeTerminalStatusBarItem) {
            activeTerminalStatusBarItem.dispose();
        }
        // Create new active terminal status
        activeTerminalStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
        const agentType = extractAgentType(trackingData.sessionName);
        const config = agentType ? AGENT_CONFIG[agentType] : null;
        const stateConfig = STATE_CONFIG[trackingData.state] || STATE_CONFIG['unknown'];
        activeTerminalStatusBarItem.text = `Active: ${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${trackingData.sessionName} ${stateConfig.icon}`;
        activeTerminalStatusBarItem.tooltip = `Tmux session: ${trackingData.sessionName}\\nState: ${trackingData.state}\\nHealth: ${trackingData.health}`;
        // Color based on state
        if (trackingData.state === 'dead' || trackingData.health === 'dead') {
            activeTerminalStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        else if (trackingData.state === 'busy') {
            activeTerminalStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        }
        else if (trackingData.state === 'interrupted') {
            activeTerminalStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        activeTerminalStatusBarItem.show();
        console.log(`Updated active terminal status: ${trackingData.sessionName} (${trackingData.state})`);
    }
}
function showTerminalStateNotification(terminal, sessionName, state, health) {
    const message = `Agent session '${sessionName}' is ${state}${health !== 'healthy' ? ` (${health})` : ''}`;
    if (state === 'dead' || health === 'dead') {
        vscode.window.showErrorMessage(message, 'View Terminal', 'Create New Terminal').then(action => {
            if (action === 'View Terminal') {
                terminal.show();
            }
            else if (action === 'Create New Terminal') {
                const agentType = extractAgentType(sessionName);
                const config = agentType ? AGENT_CONFIG[agentType] : null;
                const newTerminal = vscode.window.createTerminal({
                    name: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${sessionName} (reconnecting)`,
                    cwd: vscode.workspace.rootPath
                });
                newTerminal.show();
                newTerminal.sendText(`tmux attach-session -t ${sessionName}`);
            }
        });
    }
    else if (health === 'interrupted') {
        vscode.window.showWarningMessage(message, 'View Terminal').then(action => {
            if (action === 'View Terminal') {
                terminal.show();
            }
        });
    }
}
// Keep the existing status bar update logic from our simple version
function updateStatusBar(stateFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stateData = yield readStateFile(stateFilePath);
            if (!stateData || !stateData.sessions) {
                statusBarItem.text = "$(robot) No agents";
                statusBarItem.tooltip = "No Claude agent data available";
                statusBarItem.backgroundColor = undefined;
                return;
            }
            const sessions = stateData.sessions;
            currentStates = sessions;
            // Count sessions by state and agent type
            const stateCounts = {};
            const agentCounts = {};
            let highestPriorityState = 'idle';
            let highestPriority = 10;
            Object.entries(sessions).forEach(([name, data]) => {
                const state = getSessionState(data);
                stateCounts[state] = (stateCounts[state] || 0) + 1;
                // Track highest priority state for background color
                const stateConfig = STATE_CONFIG[state];
                if (stateConfig && stateConfig.priority < highestPriority) {
                    highestPriorityState = state;
                    highestPriority = stateConfig.priority;
                }
                // Count by agent type
                const agentType = extractAgentType(name);
                if (agentType) {
                    agentCounts[agentType] = (agentCounts[agentType] || 0) + 1;
                }
            });
            // Build compact status bar text
            const agentParts = [];
            Object.entries(agentCounts).forEach(([type, count]) => {
                const config = AGENT_CONFIG[type];
                if (config) {
                    agentParts.push(`${config.emoji}${count}`);
                }
            });
            const stateParts = [];
            ['busy', 'interrupted', 'idle', 'done', 'stopped', 'dead'].forEach(state => {
                if (stateCounts[state] > 0) {
                    const config = STATE_CONFIG[state];
                    if (config) {
                        stateParts.push(`${config.icon}${stateCounts[state]}`);
                    }
                }
            });
            const totalSessions = Object.keys(sessions).length;
            const trackedTerminals = Array.from(terminalStateTracking.keys()).length;
            statusBarItem.text = `$(robot) ${agentParts.join('')} [${stateParts.join(' ')}] (${trackedTerminals}T)`;
            // Build detailed tooltip
            const tooltipLines = [
                `Claude Agents (${totalSessions} sessions, ${trackedTerminals} terminals tracked)`,
                `Last updated: ${stateData.last_updated || 'unknown'}`,
                ''
            ];
            // Add terminal tracking info if any
            if (trackedTerminals > 0) {
                tooltipLines.push('Tracked Terminals:');
                Array.from(terminalStateTracking.entries()).forEach(([terminal, data]) => {
                    tooltipLines.push(`  ${data.displayName}`);
                });
                tooltipLines.push('');
            }
            statusBarItem.tooltip = tooltipLines.join('\\n').trim();
            // Set background color based on highest priority state
            switch (highestPriorityState) {
                case 'busy':
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                    break;
                case 'interrupted':
                case 'dead':
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                    break;
                case 'idle':
                    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                    break;
                default:
                    statusBarItem.backgroundColor = undefined;
            }
        }
        catch (error) {
            statusBarItem.text = "$(robot) Error";
            statusBarItem.tooltip = `Error reading agent states: ${error}`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    });
}
function registerCommands(context, stateFilePath) {
    // Show sessions command
    context.subscriptions.push(vscode.commands.registerCommand('claude-agents.showSessions', () => showSessionDetails()));
    // Refresh command
    context.subscriptions.push(vscode.commands.registerCommand('claude-agents.refresh', () => {
        updateStatusBar(stateFilePath);
        updateTerminalPanels();
    }));
    // Sync terminals command
    context.subscriptions.push(vscode.commands.registerCommand('claude-agents.syncTmuxSessions', () => syncTmuxSessions()));
    // Show terminal states command
    context.subscriptions.push(vscode.commands.registerCommand('claude-agents.showTerminalStates', () => showTerminalStates()));
    // Force sync all terminals command
    context.subscriptions.push(vscode.commands.registerCommand('claude-agents.forceSync', () => forceSyncAllTerminals()));
}
function showTerminalStates() {
    return __awaiter(this, void 0, void 0, function* () {
        const items = [];
        for (const terminal of vscode.window.terminals) {
            const trackingData = terminalStateTracking.get(terminal);
            if (trackingData) {
                const config = STATE_CONFIG[trackingData.state] || STATE_CONFIG['unknown'];
                items.push({
                    label: `${config.vsCodeIcon} ${terminal.name}`,
                    description: `Session: ${trackingData.sessionName}`,
                    detail: `State: ${trackingData.state} | Health: ${trackingData.health}`,
                    terminal,
                    sessionName: trackingData.sessionName
                });
            }
            else {
                items.push({
                    label: `$(terminal) ${terminal.name}`,
                    description: 'No agent session detected',
                    detail: 'Not connected to a tracked Claude agent session',
                    terminal,
                    sessionName: null
                });
            }
        }
        const selected = yield vscode.window.showQuickPick(items, {
            placeHolder: 'Select a terminal to focus',
            title: 'Terminal Agent States'
        });
        if (selected) {
            selected.terminal.show();
        }
    });
}
function forceSyncAllTerminals() {
    return __awaiter(this, void 0, void 0, function* () {
        const terminals = vscode.window.terminals;
        for (const terminal of terminals) {
            yield identifyAndUpdateTerminal(terminal);
        }
        const trackedCount = Array.from(terminalStateTracking.keys()).length;
        vscode.window.showInformationMessage(`Force synced ${terminals.length} terminals, tracking ${trackedCount} agent sessions`);
    });
}
// Utility functions from simple version
function readStateFile(stateFilePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(stateFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                resolve(JSON.parse(data));
            }
            catch (parseError) {
                reject(parseError);
            }
        });
    });
}
function getSessionState(sessionData) {
    if (typeof sessionData === 'string')
        return sessionData;
    if (typeof sessionData === 'object') {
        // Check health first
        if (sessionData.health) {
            if (sessionData.health.state === 'dead')
                return 'dead';
            if (sessionData.health.state === 'interrupted')
                return 'interrupted';
        }
        // Then check state
        if (sessionData.state)
            return sessionData.state;
    }
    return 'unknown';
}
function getSessionHealth(sessionData) {
    if (typeof sessionData === 'object' && sessionData.health) {
        return sessionData.health.state || 'unknown';
    }
    return 'healthy';
}
function extractAgentType(sessionName) {
    const validTypes = Object.keys(AGENT_CONFIG);
    for (const type of validTypes) {
        if (sessionName.startsWith(type + '-')) {
            return type;
        }
    }
    return undefined;
}
function showSessionDetails() {
    return __awaiter(this, void 0, void 0, function* () {
        // Use the implementation from simple version
        try {
            if (!currentStates || Object.keys(currentStates).length === 0) {
                vscode.window.showInformationMessage('No Claude agent sessions available');
                return;
            }
            const items = [];
            Object.entries(currentStates).forEach(([name, data]) => {
                const state = getSessionState(data);
                const health = getSessionHealth(data);
                const agentType = extractAgentType(name);
                const config = agentType ? AGENT_CONFIG[agentType] : null;
                const stateConfig = STATE_CONFIG[state] || STATE_CONFIG['unknown'];
                let description = stateConfig.label;
                if (health !== 'healthy') {
                    description += ` (${health})`;
                }
                let detail = '';
                if (typeof data === 'object') {
                    if (data.timestamp) {
                        detail = `Last update: ${new Date(data.timestamp).toLocaleString()}`;
                    }
                    if (data.origin) {
                        detail += ` | Origin: ${data.origin}`;
                    }
                }
                items.push({
                    label: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${name}`,
                    description,
                    detail,
                    sessionName: name
                });
            });
            const selected = yield vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Claude agent session to attach',
                title: 'Claude Agent Sessions'
            });
            if (selected) {
                // Create terminal with proper name including state
                const sessionData = currentStates[selected.sessionName];
                const state = getSessionState(sessionData);
                const health = getSessionHealth(sessionData);
                const displayName = generateDisplayName(selected.sessionName, state, health);
                const terminal = vscode.window.createTerminal({
                    name: displayName,
                    cwd: vscode.workspace.rootPath
                });
                terminal.show();
                terminal.sendText(`tmux attach-session -t ${selected.sessionName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to show session details: ${error}`);
        }
    });
}
function syncTmuxSessions() {
    return __awaiter(this, void 0, void 0, function* () {
        // Use implementation from simple version but with enhanced terminal names
        try {
            (0, child_process_1.exec)('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""', (error, stdout, stderr) => {
                if (error || !stdout.trim()) {
                    vscode.window.showInformationMessage('No tmux sessions found');
                    return;
                }
                const sessions = stdout.trim().split('\\n');
                const agentSessions = sessions.filter(session => extractAgentType(session));
                if (agentSessions.length === 0) {
                    vscode.window.showInformationMessage('No Claude agent sessions found in tmux');
                    return;
                }
                const items = agentSessions.map(session => {
                    const agentType = extractAgentType(session);
                    const config = agentType ? AGENT_CONFIG[agentType] : null;
                    const sessionData = currentStates[session];
                    const state = sessionData ? getSessionState(sessionData) : 'unknown';
                    const health = sessionData ? getSessionHealth(sessionData) : 'healthy';
                    return {
                        label: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${session}`,
                        description: `Agent: ${agentType} | State: ${state}`,
                        session,
                        state,
                        health
                    };
                });
                vscode.window.showQuickPick(items, {
                    placeHolder: 'Select sessions to create terminals for',
                    canPickMany: true
                }).then(selected => {
                    if (selected && selected.length > 0) {
                        selected.forEach(item => {
                            const displayName = generateDisplayName(item.session, item.state, item.health);
                            const terminal = vscode.window.createTerminal({
                                name: displayName,
                                cwd: vscode.workspace.rootPath
                            });
                            terminal.show();
                            terminal.sendText(`tmux attach -t "${item.session}"`);
                        });
                        vscode.window.showInformationMessage(`Created ${selected.length} terminal(s) with enhanced names`);
                    }
                });
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sync tmux sessions: ${error}`);
        }
    });
}
function deactivate() {
    if (fileWatcher) {
        fileWatcher.close();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (activeTerminalStatusBarItem) {
        activeTerminalStatusBarItem.dispose();
    }
    terminalStateTracking.clear();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension_enhanced.js.map