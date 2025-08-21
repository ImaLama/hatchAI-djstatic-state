import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let fileWatcher: fs.FSWatcher;
let dirWatcher: fs.FSWatcher;
let fallbackInterval: NodeJS.Timeout;
let currentStates: { [key: string]: any } = {};

// Agent configuration
const AGENT_CONFIG: { [key: string]: { emoji: string; shortName: string } } = {
    'architect': { emoji: '🏗️', shortName: 'AR' },
    'planner': { emoji: '📋', shortName: 'PL' },
    'factory': { emoji: '🏭', shortName: 'FA' },
    'qa': { emoji: '🔍', shortName: 'QA' },
    'weaver': { emoji: '🕸️', shortName: 'WE' },
    'security': { emoji: '🛡️', shortName: 'SE' },
    'darkwingduck': { emoji: '🦆', shortName: 'DD' }
};

const STATE_CONFIG: { [key: string]: { icon: string; label: string; priority: number } } = {
    'busy': { icon: '🔵', label: 'Busy', priority: 1 },
    'interrupted': { icon: '🟡', label: 'Interrupted', priority: 2 },
    'idle': { icon: '⚪', label: 'Idle', priority: 3 },
    'done': { icon: '🟢', label: 'Done', priority: 4 },
    'stopped': { icon: '🛑', label: 'Stopped', priority: 5 },
    'dead': { icon: '🔴', label: 'Dead', priority: 6 },
    'unknown': { icon: '❓', label: 'Unknown', priority: 7 }
};

export function activate(context: vscode.ExtensionContext) {
    const stateFilePath = '/home/lama/projects/djhatch-state/_featstate/agent_states.json';
    
    // Check if file exists before proceeding
    if (!fs.existsSync(stateFilePath)) {
        console.warn(`Agent states file not found: ${stateFilePath}`);
        vscode.window.showWarningMessage('Claude Agents: States file not found. Extension loaded but inactive.');
    } else {
        // Initial load
        loadTmuxSessions(stateFilePath);
        
        // Set up file watcher
        setupFileWatcher(stateFilePath);
    }
    
    // Register commands for tmux session management
    const showSessionsCommand = vscode.commands.registerCommand('claude-agents.showSessions', async () => {
        try {
            await showTmuxSessions();
        } catch (error) {
            console.error('Error in showSessions command:', error);
            vscode.window.showErrorMessage(`Failed to show tmux sessions: ${error}`);
        }
    });
    const refreshCommand = vscode.commands.registerCommand('claude-agents.refresh', async () => {
        try {
            await loadTmuxSessions(stateFilePath);
            vscode.window.showInformationMessage('Tmux sessions refreshed');
        } catch (error) {
            console.error('Error in refresh command:', error);
            vscode.window.showErrorMessage(`Failed to refresh sessions: ${error}`);
        }
    });
    
    context.subscriptions.push(showSessionsCommand, refreshCommand);
    
    console.log('Claude Agents extension activated - tmux terminal integration only');
}

function setupFileWatcher(stateFilePath: string) {
    try {
        fileWatcher = fs.watch(stateFilePath, (eventType, filename) => {
            try {
                clearTimeout((fileWatcher as any).debounceTimer);
                (fileWatcher as any).debounceTimer = setTimeout(async () => {
                    console.log(`Agent states file ${eventType}: ${filename}`);
                    await loadTmuxSessions(stateFilePath);
                }, 250);
            } catch (watchError) {
                console.error('Error in file watcher callback:', watchError);
            }
        });
        
        // Handle watcher errors
        fileWatcher.on('error', (error) => {
            console.error('File watcher error:', error);
            fileWatcher?.close();
        });
        
        // Also watch directory
        const dir = path.dirname(stateFilePath);
        if (fs.existsSync(dir)) {
            dirWatcher = fs.watch(dir, (eventType, filename) => {
                try {
                    if (filename === path.basename(stateFilePath)) {
                        clearTimeout((dirWatcher as any).debounceTimer);
                        (dirWatcher as any).debounceTimer = setTimeout(async () => {
                            await loadTmuxSessions(stateFilePath);
                        }, 250);
                    }
                } catch (watchError) {
                    console.error('Error in directory watcher callback:', watchError);
                }
            });
            
            dirWatcher.on('error', (error) => {
                console.error('Directory watcher error:', error);
                dirWatcher?.close();
            });
        }
        
        console.log(`Watching agent states file: ${stateFilePath}`);
        
    } catch (error) {
        console.error('Failed to set up file watcher:', error);
        fallbackInterval = setInterval(async () => {
            try {
                await loadTmuxSessions(stateFilePath);
            } catch (loadError) {
                console.error('Error in fallback polling:', loadError);
            }
        }, 5000);
    }
}

async function loadTmuxSessions(stateFilePath: string) {
    try {
        const stateData = await readStateFile(stateFilePath);
        
        if (!stateData || !stateData.sessions) {
            console.log('No Claude agent sessions available');
            currentStates = {};
            return;
        }
        
        const sessions = stateData.sessions;
        currentStates = sessions;
        
        console.log(`Loaded ${Object.keys(sessions).length} tmux sessions`);
        
    } catch (error) {
        console.error('Failed to load tmux sessions:', error);
        currentStates = {};
    }
}

function readStateFile(stateFilePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(stateFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
}

function getSessionState(sessionData: any): string {
    if (typeof sessionData === 'string') return sessionData;
    if (typeof sessionData === 'object') {
        // Check health first
        if (sessionData.health) {
            if (sessionData.health.state === 'dead') return 'dead';
            if (sessionData.health.state === 'interrupted') return 'interrupted';
        }
        // Then check state
        if (sessionData.state) return sessionData.state;
    }
    return 'unknown';
}

function getSessionHealth(sessionData: any): string {
    if (typeof sessionData === 'object' && sessionData.health) {
        return sessionData.health.state || 'unknown';
    }
    return 'healthy';
}

function extractAgentType(sessionName: string): string | undefined {
    const validTypes = Object.keys(AGENT_CONFIG);
    for (const type of validTypes) {
        if (sessionName.startsWith(type + '-')) {
            return type;
        }
    }
    return undefined;
}

async function showTmuxSessions() {
    try {
        if (!currentStates || Object.keys(currentStates).length === 0) {
            vscode.window.showInformationMessage('No tmux sessions available');
            return;
        }
        
        // Create quick pick items for tmux sessions
        const items: vscode.QuickPickItem[] = [];
        
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
                label: `${config?.emoji || '🤖'} ${name}`,
                description,
                detail
            });
        });
        
        // Sort by state priority, then by name
        items.sort((a, b) => {
            const nameA = a.label.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\s*/, '');
            const nameB = b.label.replace(/^[🏗️📋🏭🔍🕸️🛡️🦆🤖]+\s*/, '');
            const stateA = getSessionState(currentStates[nameA]);
            const stateB = getSessionState(currentStates[nameB]);
            const priorityA = STATE_CONFIG[stateA]?.priority || 10;
            const priorityB = STATE_CONFIG[stateB]?.priority || 10;
            
            if (priorityA !== priorityB) return priorityA - priorityB;
            return nameA.localeCompare(nameB);
        });
        
        const selected = await vscode.window.showQuickPick(items, {
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
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to show tmux sessions: ${error}`);
    }
}

export function deactivate() {
    try {
        // Clean up file watcher
        if (fileWatcher) {
            clearTimeout((fileWatcher as any).debounceTimer);
            fileWatcher.close();
            fileWatcher = undefined as any;
        }
        
        // Clean up directory watcher
        if (dirWatcher) {
            clearTimeout((dirWatcher as any).debounceTimer);
            dirWatcher.close();
            dirWatcher = undefined as any;
        }
        
        // Clean up fallback polling
        if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = undefined as any;
        }
        
        // Clear current states
        currentStates = {};
        
        console.log('Claude Agents extension deactivated - all resources cleaned up');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}