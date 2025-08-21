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
let currentStates = {};
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
    'busy': { icon: '🔵', label: 'Busy', priority: 1 },
    'interrupted': { icon: '🟡', label: 'Interrupted', priority: 2 },
    'idle': { icon: '⚪', label: 'Idle', priority: 3 },
    'done': { icon: '🟢', label: 'Done', priority: 4 },
    'stopped': { icon: '🛑', label: 'Stopped', priority: 5 },
    'dead': { icon: '🔴', label: 'Dead', priority: 6 },
    'unknown': { icon: '❓', label: 'Unknown', priority: 7 }
};
function activate(context) {
    const stateFilePath = '/home/lama/projects/djhatch-state/_featstate/agent_states.json';
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200);
    statusBarItem.command = 'claude-agents.showSessions';
    // Initial update
    updateStatusBar(stateFilePath);
    // Set up file watcher
    setupFileWatcher(stateFilePath);
    // Register commands
    const showSessionsCommand = vscode.commands.registerCommand('claude-agents.showSessions', () => showSessionDetails(stateFilePath));
    const refreshCommand = vscode.commands.registerCommand('claude-agents.refresh', () => updateStatusBar(stateFilePath));
    const syncTmuxCommand = vscode.commands.registerCommand('claude-agents.syncTmuxSessions', syncTmuxSessions);
    context.subscriptions.push(statusBarItem, showSessionsCommand, refreshCommand, syncTmuxCommand);
    statusBarItem.show();
    console.log('Claude Agents extension activated (simple version)');
}
exports.activate = activate;
function setupFileWatcher(stateFilePath) {
    try {
        fileWatcher = fs.watch(stateFilePath, (eventType, filename) => {
            clearTimeout(fileWatcher.debounceTimer);
            fileWatcher.debounceTimer = setTimeout(() => {
                console.log(`Agent states file ${eventType}: ${filename}`);
                updateStatusBar(stateFilePath);
            }, 250);
        });
        // Also watch directory
        const dir = path.dirname(stateFilePath);
        const dirWatcher = fs.watch(dir, (eventType, filename) => {
            if (filename === path.basename(stateFilePath)) {
                clearTimeout(dirWatcher.debounceTimer);
                dirWatcher.debounceTimer = setTimeout(() => {
                    updateStatusBar(stateFilePath);
                }, 250);
            }
        });
        console.log(`Watching agent states file: ${stateFilePath}`);
    }
    catch (error) {
        console.error('Failed to set up file watcher:', error);
        setInterval(() => updateStatusBar(stateFilePath), 5000);
    }
}
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
            statusBarItem.text = `$(robot) ${agentParts.join('')} [${stateParts.join(' ')}]`;
            // Build detailed tooltip
            const tooltipLines = [
                `Claude Agents (${totalSessions} sessions)`,
                `Last updated: ${stateData.last_updated || 'unknown'}`,
                ''
            ];
            // Group sessions by state for tooltip
            const sessionsByState = {};
            Object.entries(sessions).forEach(([name, data]) => {
                const state = getSessionState(data);
                const health = getSessionHealth(data);
                if (!sessionsByState[state])
                    sessionsByState[state] = [];
                sessionsByState[state].push({ name, health, data });
            });
            // Add sessions to tooltip in priority order
            Object.keys(STATE_CONFIG).sort((a, b) => STATE_CONFIG[a].priority - STATE_CONFIG[b].priority).forEach(state => {
                if (sessionsByState[state] && sessionsByState[state].length > 0) {
                    tooltipLines.push(`${STATE_CONFIG[state].icon} ${STATE_CONFIG[state].label}:`);
                    sessionsByState[state].forEach(({ name, health, data }) => {
                        var _a;
                        const agentType = extractAgentType(name);
                        const emoji = agentType ? ((_a = AGENT_CONFIG[agentType]) === null || _a === void 0 ? void 0 : _a.emoji) || '🤖' : '🤖';
                        let line = `  ${emoji} ${name}`;
                        if (health && health !== 'healthy') {
                            line += ` (${health})`;
                        }
                        if (typeof data === 'object' && data.timestamp) {
                            const time = new Date(data.timestamp).toLocaleTimeString();
                            line += ` - ${time}`;
                        }
                        tooltipLines.push(line);
                    });
                    tooltipLines.push('');
                }
            });
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
            console.log(`Status updated: ${totalSessions} sessions, highest priority state: ${highestPriorityState}`);
        }
        catch (error) {
            statusBarItem.text = "$(robot) Error";
            statusBarItem.tooltip = `Error reading agent states: ${error}\\nPath: ${stateFilePath}`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            console.error('Failed to update status bar:', error);
        }
    });
}
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
function showSessionDetails(stateFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!currentStates || Object.keys(currentStates).length === 0) {
                vscode.window.showInformationMessage('No Claude agent sessions available');
                return;
            }
            // Create quick pick items sorted by priority
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
            // Sort by state priority, then by name
            items.sort((a, b) => {
                var _a, _b;
                const stateA = getSessionState(currentStates[a.sessionName]);
                const stateB = getSessionState(currentStates[b.sessionName]);
                const priorityA = ((_a = STATE_CONFIG[stateA]) === null || _a === void 0 ? void 0 : _a.priority) || 10;
                const priorityB = ((_b = STATE_CONFIG[stateB]) === null || _b === void 0 ? void 0 : _b.priority) || 10;
                if (priorityA !== priorityB)
                    return priorityA - priorityB;
                return a.sessionName.localeCompare(b.sessionName);
            });
            const selected = yield vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Claude agent session to attach',
                title: 'Claude Agent Sessions'
            });
            if (selected) {
                (0, child_process_1.exec)(`tmux has-session -t ${selected.sessionName} 2>/dev/null`, (error) => {
                    if (error) {
                        vscode.window.showWarningMessage(`Session '${selected.sessionName}' exists in state file but not in tmux.`);
                    }
                    else {
                        vscode.window.showInformationMessage(`Attach to session '${selected.sessionName}'?`, 'Yes', 'No').then(answer => {
                            if (answer === 'Yes') {
                                const agentType = extractAgentType(selected.sessionName);
                                const config = agentType ? AGENT_CONFIG[agentType] : null;
                                const terminal = vscode.window.createTerminal({
                                    name: `${(config === null || config === void 0 ? void 0 : config.emoji) || '🤖'} ${selected.sessionName}`,
                                    cwd: vscode.workspace.rootPath
                                });
                                terminal.show();
                                terminal.sendText(`tmux attach-session -t ${selected.sessionName}`);
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
function deactivate() {
    if (fileWatcher) {
        fileWatcher.close();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension_simple.js.map