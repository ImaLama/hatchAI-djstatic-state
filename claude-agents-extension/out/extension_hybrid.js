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
let fileWatcher;
let stateFilePath;
let currentStates = {};
let registeredTerminals = new Map();
// Agent configuration
const AGENT_CONFIG = {
    'architect': { emoji: '🏗️', shortName: 'AR', color: 'terminal.ansiMagenta' },
    'planner': { emoji: '📋', shortName: 'PL', color: 'terminal.ansiBlue' },
    'factory': { emoji: '🏭', shortName: 'FA', color: 'terminal.ansiGreen' },
    'qa': { emoji: '🔍', shortName: 'QA', color: 'terminal.ansiYellow' },
    'weaver': { emoji: '🕸️', shortName: 'WE', color: 'terminal.ansiCyan' },
    'security': { emoji: '🛡️', shortName: 'SE', color: 'terminal.ansiRed' },
    'darkwingduck': { emoji: '🦆', shortName: 'DD', color: 'terminal.ansiWhite' }
};
const STATE_ICONS = {
    'idle': '⚪',
    'busy': '🔵',
    'done': '🟢',
    'error': '❌',
    'unknown': '❓',
    'terminated': '🛑',
    'stopped': '🛑'
};
function activate(context) {
    // Configure state file path - hardcoded to our specific location
    stateFilePath = '/home/lama/projects/djhatch-state/_featstate/agent_states.json';
    // Create main status bar item for overall session status
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200);
    statusBarItem.command = 'claude-agents.showSessions';
    // Initial update
    updateStatusBar();
    // Set up efficient file watcher
    setupFileWatcher();
    // Set up command polling for terminal registration
    setupCommandProcessor(context);
    // Register commands
    const showSessionsCommand = vscode.commands.registerCommand('claude-agents.showSessions', showSessionDetails);
    const refreshCommand = vscode.commands.registerCommand('claude-agents.refresh', updateStatusBar);
    const syncTmuxCommand = vscode.commands.registerCommand('claude-agents.syncTmuxSessions', syncTmuxSessions);
    // Add subscriptions
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(showSessionsCommand);
    context.subscriptions.push(refreshCommand);
    context.subscriptions.push(syncTmuxCommand);
    statusBarItem.show();
    console.log('Claude Agents extension activated with hybrid monitoring');
}
exports.activate = activate;
function setupFileWatcher() {
    try {
        // Use fs.watch with debouncing (from Claude web version)
        fileWatcher = fs.watch(stateFilePath, (eventType, filename) => {
            clearTimeout(fileWatcher.debounceTimer);
            fileWatcher.debounceTimer = setTimeout(() => {
                console.log(`Agent states file ${eventType}: ${filename}`);
                updateStatusBar();
                updateRegisteredTerminals();
            }, 250); // 250ms debounce
        });
        // Also watch directory for file replacements
        const dir = path.dirname(stateFilePath);
        const dirWatcher = fs.watch(dir, (eventType, filename) => {
            if (filename === path.basename(stateFilePath)) {
                clearTimeout(dirWatcher.debounceTimer);
                dirWatcher.debounceTimer = setTimeout(() => {
                    updateStatusBar();
                    updateRegisteredTerminals();
                }, 250);
            }
        });
    }
    catch (error) {
        console.error('Failed to set up file watcher:', error);
        // Fallback to polling
        setInterval(() => {
            updateStatusBar();
            updateRegisteredTerminals();
        }, 5000);
    }
}
function updateStatusBar() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stateData = yield readStateFile();
            if (!stateData || !stateData.sessions) {
                statusBarItem.text = "$(robot) No agents";
                statusBarItem.tooltip = "No Claude agent session data available";
                statusBarItem.backgroundColor = undefined;
                return;
            }
            const sessions = stateData.sessions;
            currentStates = sessions;
            // Count sessions by state and agent type
            const stateCounts = { busy: 0, idle: 0, dead: 0, interrupted: 0, unknown: 0 };
            const agentCounts = {};
            Object.entries(sessions).forEach(([name, data]) => {
                const state = getSessionState(data);
                stateCounts[state] = (stateCounts[state] || 0) + 1;
                // Count by agent type
                const agentType = extractAgentType(name);
                if (agentType) {
                    agentCounts[agentType] = (agentCounts[agentType] || 0) + 1;
                }
            });
            // Build compact status bar text with agent emojis
            const agentParts = [];
            Object.entries(agentCounts).forEach(([type, count]) => {
                const config = AGENT_CONFIG[type];
                if (config) {
                    agentParts.push(`${config.emoji}${count}`);
                }
            });
            const totalSessions = Object.keys(sessions).length;
            const busyCount = stateCounts.busy;
            const statusParts = [];
            if (busyCount > 0)
                statusParts.push(`🔵${busyCount}`);
            if (stateCounts.idle > 0)
                statusParts.push(`⚪${stateCounts.idle}`);
            if (stateCounts.dead > 0)
                statusParts.push(`🔴${stateCounts.dead}`);
            if (stateCounts.interrupted > 0)
                statusParts.push(`🟡${stateCounts.interrupted}`);
            statusBarItem.text = `$(robot) ${agentParts.join('')} [${statusParts.join(' ')}]`;
            // Build tooltip with session details
            const tooltipLines = [`Claude Agents (${totalSessions} sessions)`, `Last updated: ${stateData.last_updated || 'unknown'}`, ''];
            // Group by state for tooltip
            const sessionsByState = {};
            Object.entries(sessions).forEach(([name, data]) => {
                const state = getSessionState(data);
                const health = getSessionHealth(data);
                if (!sessionsByState[state])
                    sessionsByState[state] = [];
                sessionsByState[state].push({ name, health, data });
            });
            ['busy', 'interrupted', 'idle', 'dead', 'unknown'].forEach(state => {
                if (sessionsByState[state] && sessionsByState[state].length > 0) {
                    tooltipLines.push(`${getStateLabel(state)}:`);
                    sessionsByState[state].forEach(({ name, health, data }) => {
                        var _a;
                        const agentType = extractAgentType(name);
                        const emoji = agentType ? ((_a = AGENT_CONFIG[agentType]) === null || _a === void 0 ? void 0 : _a.emoji) || '🤖' : '🤖';
                        let line = `  ${emoji} ${name}`;
                        if (health && health !== 'healthy') {
                            line += ` (${health})`;
                        }
                        tooltipLines.push(line);
                    });
                    tooltipLines.push('');
                }
            });
            statusBarItem.tooltip = tooltipLines.join('\\n').trim();
            // Set background color based on priority states
            if (stateCounts.dead > 0 || stateCounts.interrupted > 0) {
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
            else if (stateCounts.busy > 0) {
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            }
            else {
                statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            }
        }
        catch (error) {
            statusBarItem.text = "$(robot) Agents: Error";
            statusBarItem.tooltip = `Error reading state file: ${error}\\nPath: ${stateFilePath}`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    });
}
function updateRegisteredTerminals() {
    return __awaiter(this, void 0, void 0, function* () {
        // Update any registered terminals with new state information
        for (const [sessionName, terminal] of registeredTerminals.entries()) {
            const sessionData = currentStates[sessionName];
            if (sessionData) {
                const newState = getSessionState(sessionData);
                if (terminal.state !== newState) {
                    terminal.state = newState;
                    // Update terminal title
                    const agentType = extractAgentType(sessionName);
                    if (agentType) {
                        const config = AGENT_CONFIG[agentType];
                        const stateIcon = STATE_ICONS[newState] || '❓';
                        const newTitle = `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${stateIcon} ${terminal.displayName}`;
                        // Send title update to terminal
                        try {
                            terminal.terminal.sendText(`echo -e "\\\\033]0;${newTitle}\\\\007"`);
                            console.log(`Updated terminal ${sessionName} title to: ${newTitle}`);
                        }
                        catch (error) {
                            console.warn('Failed to update terminal title:', error);
                        }
                    }
                }
            }
        }
    });
}
function readStateFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(stateFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                const parsed = JSON.parse(data);
                resolve(parsed);
            }
            catch (parseError) {
                reject(parseError);
            }
        });
    });
}
function getSessionState(sessionData) {
    if (typeof sessionData === 'string') {
        return sessionData;
    }
    if (typeof sessionData === 'object') {
        // Check health first
        if (sessionData.health) {
            if (sessionData.health.state === 'dead')
                return 'dead';
            if (sessionData.health.state === 'interrupted')
                return 'interrupted';
        }
        // Then check state
        if (sessionData.state) {
            return sessionData.state;
        }
    }
    return 'unknown';
}
function getSessionHealth(sessionData) {
    if (typeof sessionData === 'object' && sessionData.health) {
        return sessionData.health.state || 'unknown';
    }
    return 'healthy';
}
function getStateLabel(state) {
    switch (state) {
        case 'busy': return '🔵 Busy';
        case 'idle': return '⚪ Idle';
        case 'dead': return '🔴 Dead';
        case 'interrupted': return '🟡 Interrupted';
        default: return '❓ Unknown';
    }
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
        try {
            if (!currentStates || Object.keys(currentStates).length === 0) {
                vscode.window.showInformationMessage('No Claude agent session data available');
                return;
            }
            // Create quick pick items
            const items = [];
            Object.entries(currentStates).forEach(([name, data]) => {
                const state = getSessionState(data);
                const health = getSessionHealth(data);
                const agentType = extractAgentType(name);
                const config = agentType ? AGENT_CONFIG[agentType] : null;
                let description = state;
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
                    detail
                });
            });
            const selected = yield vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Claude agent session',
                title: 'Claude Agent Sessions'
            });
            if (selected) {
                const sessionName = selected.label.split(' ')[1]; // Remove emoji
                // Check if session exists in tmux
                (0, child_process_1.exec)(`tmux has-session -t ${sessionName} 2>/dev/null`, (error) => {
                    if (error) {
                        vscode.window.showWarningMessage(`Session '${sessionName}' exists in state file but not in tmux.`);
                    }
                    else {
                        vscode.window.showInformationMessage(`Attach to session '${sessionName}'?`, 'Yes', 'No').then(answer => {
                            if (answer === 'Yes') {
                                const agentType = extractAgentType(sessionName);
                                const config = agentType ? AGENT_CONFIG[agentType] : null;
                                const terminal = vscode.window.createTerminal({
                                    name: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${sessionName}`,
                                    cwd: vscode.workspace.rootPath
                                });
                                terminal.show();
                                terminal.sendText(`tmux attach-session -t ${sessionName}`);
                            }
                        });
                    }
                });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to show session details: ${error}`);
        }
    });
}
function syncTmuxSessions() {
    return __awaiter(this, void 0, void 0, function* () {
        // Manual sync functionality - creates new terminals for existing tmux sessions
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
                    return {
                        label: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${session}`,
                        description: `Agent type: ${agentType}`,
                        session
                    };
                });
                vscode.window.showQuickPick(items, {
                    placeHolder: 'Select sessions to create terminals for',
                    canPickMany: true
                }).then(selected => {
                    if (selected && selected.length > 0) {
                        selected.forEach(item => {
                            const agentType = extractAgentType(item.session);
                            const config = agentType ? AGENT_CONFIG[agentType] : null;
                            const terminal = vscode.window.createTerminal({
                                name: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${item.session}`,
                                cwd: vscode.workspace.rootPath
                            });
                            terminal.show();
                            terminal.sendText(`tmux attach -t "${item.session}"`);
                        });
                        vscode.window.showInformationMessage(`Created ${selected.length} terminal(s)`);
                    }
                });
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sync tmux sessions: ${error}`);
        }
    });
}
// Simple command processor for register_current_terminal
function setupCommandProcessor(context) {
    const commandDir = '/home/lama/projects/djhatch/_logs/vscode_commands';
    const checkForCommands = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const files = yield vscode.workspace.fs.readDirectory(vscode.Uri.file(commandDir));
            for (const [filename, type] of files) {
                if (!filename.startsWith('register_current_terminal_') || !filename.endsWith('.json'))
                    continue;
                const uri = vscode.Uri.file(path.join(commandDir, filename));
                try {
                    const commandData = yield vscode.workspace.fs.readFile(uri);
                    const command = JSON.parse(Buffer.from(commandData).toString('utf8'));
                    // Register current terminal
                    const activeTerminal = vscode.window.activeTerminal;
                    if (activeTerminal && command.sessionName) {
                        const agentTerminal = {
                            terminal: activeTerminal,
                            agentType: command.agentType,
                            taskId: command.taskId,
                            model: command.model || 'sonnet',
                            state: 'idle',
                            sessionName: command.sessionName,
                            displayName: command.displayName
                        };
                        registeredTerminals.set(command.sessionName, agentTerminal);
                        const responseFile = uri.fsPath + '.response';
                        yield vscode.workspace.fs.writeFile(vscode.Uri.file(responseFile), Buffer.from(`Registered terminal: ${command.sessionName}`, 'utf8'));
                        console.log(`Registered terminal: ${command.sessionName}`);
                    }
                    yield vscode.workspace.fs.delete(uri);
                }
                catch (error) {
                    console.error('Failed to process command:', error);
                }
            }
        }
        catch (error) {
            // Directory might not exist yet
        }
    });
    const commandPoller = setInterval(checkForCommands, 2000);
    context.subscriptions.push({ dispose: () => clearInterval(commandPoller) });
}
function deactivate() {
    if (fileWatcher) {
        fileWatcher.close();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension_hybrid.js.map