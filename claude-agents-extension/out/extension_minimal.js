"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
function activate(context) {
    console.log('Claude Agents Extension v0.8.8 activated - minimal terminal discovery');
    // Cache imports to avoid repeated dynamic loading
    let execAsync = null;
    let fs = null;
    async function getExecAsync() {
        if (!execAsync) {
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
            execAsync = promisify(exec);
        }
        return execAsync;
    }
    async function getFs() {
        if (!fs) {
            fs = await Promise.resolve().then(() => __importStar(require('fs')));
        }
        return fs;
    }
    // Simple agent terminal storage
    const agents = new Map();
    // Agent type configuration in preferred order
    const agentTypes = ['architect', 'featplanner', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
    const agentShortForms = ['AR', 'FE', 'PL', 'FA', 'QA', 'WE', 'SE', 'DA'];
    // Agent emoji mapping
    const agentEmojis = {
        'architect': '🏗️',
        'featplanner': '✨',
        'planner': '📋',
        'factory': '🏭',
        'qa': '🔍',
        'weaver': '🕸️',
        'security': '🛡️',
        'darkwingduck': '🦆'
    };
    // Agent icon mapping
    const agentIcons = {
        'architect': 'settings-gear',
        'featplanner': 'star',
        'planner': 'list-ordered',
        'factory': 'tools',
        'qa': 'search',
        'weaver': 'git-merge',
        'security': 'shield',
        'darkwingduck': 'flame'
    };
    // Helper function to get agent emoji
    function getAgentEmoji(agentType) {
        return agentEmojis[agentType] || '🤖';
    }
    // Helper function to get agent icon
    function getAgentIcon(agentType) {
        return new vscode.ThemeIcon(agentIcons[agentType] || 'robot');
    }
    // Helper function to detect agent type from session name (full name or short form)
    function detectAgentType(sessionName) {
        // Check full names first (architect, planner, etc.)
        for (let i = 0; i < agentTypes.length; i++) {
            const agentType = agentTypes[i];
            if (sessionName.toLowerCase().startsWith(agentType.toLowerCase())) {
                return { agentType, priority: i };
            }
        }
        // Check short forms (AR, PL, FA, etc.)
        for (let i = 0; i < agentShortForms.length; i++) {
            const shortForm = agentShortForms[i];
            if (sessionName.toUpperCase().startsWith(shortForm)) {
                return { agentType: agentTypes[i], priority: i };
            }
        }
        return null;
    }
    // Helper function to sort sessions by priority (agent sessions first, then others)
    function sortSessionsByPriority(sessions) {
        const agentSessions = [];
        const otherSessions = [];
        for (const sessionName of sessions) {
            const detection = detectAgentType(sessionName);
            if (detection) {
                agentSessions.push({
                    name: sessionName,
                    agentType: detection.agentType,
                    priority: detection.priority
                });
            }
            else {
                otherSessions.push(sessionName);
            }
        }
        // Sort agent sessions by priority (architects first, then planners, etc.)
        agentSessions.sort((a, b) => a.priority - b.priority);
        return { agentSessions, otherSessions };
    }
    // Helper function to validate and sanitize session ID  
    function validateSessionId(sessionId) {
        // Only allow alphanumeric, hyphens, underscores, and dots
        return /^[a-zA-Z0-9\-_.]+$/.test(sessionId) && sessionId.length > 0 && sessionId.length < 100;
    }
    // Helper function to get tmux session working directory
    async function getSessionWorkingDirectory(sessionId) {
        try {
            // Validate session ID before any shell execution
            if (!validateSessionId(sessionId)) {
                console.error(`Invalid session ID: ${sessionId}`);
                return vscode.workspace.rootPath || process.cwd();
            }
            const exec = await getExecAsync();
            // Use JSON.stringify to properly escape the session ID
            const { stdout } = await exec(`tmux display-message -t ${JSON.stringify(sessionId)} -p "#{pane_current_path}" 2>/dev/null`);
            const sessionCwd = stdout.trim();
            // Validate the path exists, fallback to workspace if not
            const fsModule = await getFs();
            if (sessionCwd && fsModule.existsSync(sessionCwd)) {
                console.log(`Valid working directory found for ${sessionId}: ${sessionCwd}`);
                return sessionCwd;
            }
        }
        catch (error) {
            console.error(`Error getting working directory for ${sessionId}:`, error);
        }
        // Fallback to workspace root
        const fallback = vscode.workspace.rootPath || process.cwd();
        console.log(`Using fallback directory for ${sessionId}: ${fallback}`);
        return fallback;
    }
    // Helper function to create terminal for a session (agent or other)
    async function createTerminalForSession(sessionId, agentType) {
        // Validate session ID before creating terminal
        if (!validateSessionId(sessionId)) {
            console.error(`Skipping terminal creation for invalid session ID: ${sessionId}`);
            return;
        }
        let terminalName;
        let iconPath;
        if (agentType) {
            // Agent session - use emoji and icon
            const agentEmoji = getAgentEmoji(agentType);
            terminalName = `${agentEmoji} ${sessionId}`;
            iconPath = getAgentIcon(agentType);
            // Store agent info
            const agentTerminal = {
                terminal: null,
                agentType,
                sessionName: sessionId
            };
            agents.set(sessionId, agentTerminal);
        }
        else {
            // Other session - simple naming
            terminalName = `📟 ${sessionId}`;
            iconPath = new vscode.ThemeIcon('terminal');
        }
        // Get the actual working directory for this session
        const sessionCwd = await getSessionWorkingDirectory(sessionId);
        console.log(`Session ${sessionId} working directory: ${sessionCwd}`);
        // Create terminal
        const terminal = vscode.window.createTerminal({
            name: terminalName,
            iconPath: iconPath,
            cwd: sessionCwd
        });
        // Update agent info with terminal reference
        if (agentType && agents.has(sessionId)) {
            agents.get(sessionId).terminal = terminal;
        }
        // Attach to tmux session (already validated by validateSessionId)
        terminal.sendText(`tmux attach -t ${JSON.stringify(sessionId)}`);
        console.log(`Created terminal for session: ${sessionId}${agentType ? ` (${agentType})` : ' (other)'}`);
    }
    // Main discovery function - direct tmux query
    async function discoverExistingSessionsFromTmux() {
        try {
            console.log('Starting tmux session discovery...');
            // Clean up old agent terminals first
            const existingTerminals = vscode.window.terminals;
            const terminalsToDispose = [];
            for (const terminal of existingTerminals) {
                const isAgentTerminal = agentTypes.some(type => terminal.name.toLowerCase().includes(type)) || terminal.name.includes('🏗️') || terminal.name.includes('✨') ||
                    terminal.name.includes('📋') || terminal.name.includes('🏭') ||
                    terminal.name.includes('🔍') || terminal.name.includes('🕸️') ||
                    terminal.name.includes('🛡️') || terminal.name.includes('🦆') ||
                    terminal.name.includes('🤖') || terminal.name.includes('📟');
                if (isAgentTerminal) {
                    terminalsToDispose.push(terminal);
                }
            }
            // Dispose terminals safely
            for (const terminal of terminalsToDispose) {
                console.log(`Disposing old agent terminal: ${terminal.name}`);
                terminal.dispose();
            }
            // Clear registry
            agents.clear();
            // Get tmux sessions directly
            const exec = await getExecAsync();
            const { stdout } = await exec('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""');
            console.log('Raw tmux output:', JSON.stringify(stdout));
            if (!stdout.trim()) {
                console.log('No tmux sessions found');
                return;
            }
            const allSessions = stdout.trim().split('\n');
            console.log('Parsed sessions:', allSessions);
            // Filter out invalid session names
            const validSessions = allSessions.filter((session) => {
                if (!validateSessionId(session)) {
                    console.warn(`Skipping invalid session name: ${session}`);
                    return false;
                }
                return true;
            });
            if (validSessions.length === 0) {
                console.log('No valid tmux sessions found');
                return;
            }
            // Sort sessions by priority: agent sessions first (by type order), then others
            const { agentSessions, otherSessions } = sortSessionsByPriority(validSessions);
            let totalCount = 0;
            // Create terminals for agent sessions first (in priority order)
            console.log(`Creating terminals for ${agentSessions.length} agent sessions:`);
            for (const agentSession of agentSessions) {
                try {
                    await createTerminalForSession(agentSession.name, agentSession.agentType);
                    totalCount++;
                    console.log(`  ✅ ${agentSession.agentType}: ${agentSession.name}`);
                }
                catch (terminalError) {
                    console.error(`Failed to create terminal for ${agentSession.name}:`, terminalError);
                }
            }
            // Create terminals for other sessions below
            if (otherSessions.length > 0) {
                console.log(`Creating terminals for ${otherSessions.length} other sessions:`);
                for (const sessionId of otherSessions) {
                    try {
                        await createTerminalForSession(sessionId);
                        totalCount++;
                        console.log(`  📟 other: ${sessionId}`);
                    }
                    catch (terminalError) {
                        console.error(`Failed to create terminal for ${sessionId}:`, terminalError);
                    }
                }
            }
            if (totalCount > 0) {
                const agentCount = agentSessions.length;
                const otherCount = otherSessions.length;
                vscode.window.showInformationMessage(`🔗 Discovered ${agentCount} agent session(s) + ${otherCount} other session(s) from tmux`);
                console.log(`Successfully created ${totalCount} terminals (${agentCount} agents + ${otherCount} others)`);
            }
            else {
                console.log('No tmux sessions found');
            }
        }
        catch (error) {
            console.error('Failed to discover sessions from tmux:', error);
        }
    }
    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand('claude-agents.refresh', discoverExistingSessionsFromTmux);
    context.subscriptions.push(refreshCommand);
    // Auto-discover on startup
    console.log('Setting up auto-discovery in 1 second...');
    setTimeout(() => {
        console.log('Starting auto-discovery now...');
        discoverExistingSessionsFromTmux();
    }, 1000);
    console.log('Claude Agents extension activated - minimal version ready');
}
exports.activate = activate;
function deactivate() {
    console.log('Claude Agents extension deactivated');
}
exports.deactivate = deactivate;
