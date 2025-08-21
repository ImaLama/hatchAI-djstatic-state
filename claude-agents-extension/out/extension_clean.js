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
let fileWatcher;
let dirWatcher;
let fallbackInterval;
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
    // Check if file exists before proceeding
    if (!fs.existsSync(stateFilePath)) {
        console.warn(`Agent states file not found: ${stateFilePath}`);
        vscode.window.showWarningMessage('Claude Agents: States file not found. Extension loaded but inactive.');
    }
    else {
        // Initial load
        loadTmuxSessions(stateFilePath);
        // Set up file watcher
        setupFileWatcher(stateFilePath);
    }
    // Register commands for tmux session management
    const showSessionsCommand = vscode.commands.registerCommand('claude-agents.showSessions', () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield showTmuxSessions();
        }
        catch (error) {
            console.error('Error in showSessions command:', error);
            vscode.window.showErrorMessage(`Failed to show tmux sessions: ${error}`);
        }
    }));
    const refreshCommand = vscode.commands.registerCommand('claude-agents.refresh', () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield loadTmuxSessions(stateFilePath);
            vscode.window.showInformationMessage('Tmux sessions refreshed');
        }
        catch (error) {
            console.error('Error in refresh command:', error);
            vscode.window.showErrorMessage(`Failed to refresh sessions: ${error}`);
        }
    }));
    context.subscriptions.push(showSessionsCommand, refreshCommand);
    console.log('Claude Agents extension activated - tmux terminal integration only');
}
exports.activate = activate;
function setupFileWatcher(stateFilePath) {
    try {
        fileWatcher = fs.watch(stateFilePath, (eventType, filename) => {
            try {
                clearTimeout(fileWatcher.debounceTimer);
                fileWatcher.debounceTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    console.log(`Agent states file ${eventType}: ${filename}`);
                    yield loadTmuxSessions(stateFilePath);
                }), 250);
            }
            catch (watchError) {
                console.error('Error in file watcher callback:', watchError);
            }
        });
        // Handle watcher errors
        fileWatcher.on('error', (error) => {
            console.error('File watcher error:', error);
            fileWatcher === null || fileWatcher === void 0 ? void 0 : fileWatcher.close();
        });
        // Also watch directory
        const dir = path.dirname(stateFilePath);
        if (fs.existsSync(dir)) {
            dirWatcher = fs.watch(dir, (eventType, filename) => {
                try {
                    if (filename === path.basename(stateFilePath)) {
                        clearTimeout(dirWatcher.debounceTimer);
                        dirWatcher.debounceTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                            yield loadTmuxSessions(stateFilePath);
                        }), 250);
                    }
                }
                catch (watchError) {
                    console.error('Error in directory watcher callback:', watchError);
                }
            });
            dirWatcher.on('error', (error) => {
                console.error('Directory watcher error:', error);
                dirWatcher === null || dirWatcher === void 0 ? void 0 : dirWatcher.close();
            });
        }
        console.log(`Watching agent states file: ${stateFilePath}`);
    }
    catch (error) {
        console.error('Failed to set up file watcher:', error);
        fallbackInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield loadTmuxSessions(stateFilePath);
            }
            catch (loadError) {
                console.error('Error in fallback polling:', loadError);
            }
        }), 5000);
    }
}
function loadTmuxSessions(stateFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stateData = yield readStateFile(stateFilePath);
            if (!stateData || !stateData.sessions) {
                console.log('No Claude agent sessions available');
                currentStates = {};
                return;
            }
            const sessions = stateData.sessions;
            currentStates = sessions;
            console.log(`Loaded ${Object.keys(sessions).length} tmux sessions`);
        }
        catch (error) {
            console.error('Failed to load tmux sessions:', error);
            currentStates = {};
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
function showTmuxSessions() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!currentStates || Object.keys(currentStates).length === 0) {
                vscode.window.showInformationMessage('No tmux sessions available');
                return;
            }
            // Create quick pick items for tmux sessions
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
                    detail
                });
            });
            // Sort by state priority, then by name
            items.sort((a, b) => {
                var _a, _b;
                const nameA = a.label.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\s*/, '');
                const nameB = b.label.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\s*/, '');
                const stateA = getSessionState(currentStates[nameA]);
                const stateB = getSessionState(currentStates[nameB]);
                const priorityA = ((_a = STATE_CONFIG[stateA]) === null || _a === void 0 ? void 0 : _a.priority) || 10;
                const priorityB = ((_b = STATE_CONFIG[stateB]) === null || _b === void 0 ? void 0 : _b.priority) || 10;
                if (priorityA !== priorityB)
                    return priorityA - priorityB;
                return nameA.localeCompare(nameB);
            });
            const selected = yield vscode.window.showQuickPick(items, {
                placeHolder: 'Select tmux session to attach terminal',
                title: 'Tmux Sessions - Terminal Integration'
            });
            if (selected) {
                // Create terminal and attach to tmux session
                const sessionName = selected.label.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\s*/, '');
                const terminal = vscode.window.createTerminal({
                    name: `tmux: ${sessionName}`,
                    shellPath: '/usr/bin/tmux',
                    shellArgs: ['attach-session', '-t', sessionName]
                });
                terminal.show();
                console.log(`Created terminal for tmux session: ${sessionName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to show tmux sessions: ${error}`);
        }
    });
}
function deactivate() {
    try {
        // Clean up file watcher
        if (fileWatcher) {
            clearTimeout(fileWatcher.debounceTimer);
            fileWatcher.close();
            fileWatcher = undefined;
        }
        // Clean up directory watcher
        if (dirWatcher) {
            clearTimeout(dirWatcher.debounceTimer);
            dirWatcher.close();
            dirWatcher = undefined;
        }
        // Clean up fallback polling
        if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = undefined;
        }
        // Clear current states
        currentStates = {};
        console.log('Claude Agents extension deactivated - all resources cleaned up');
    }
    catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension_clean.js.map