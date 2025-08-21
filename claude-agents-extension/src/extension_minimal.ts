import * as vscode from 'vscode';

interface AgentTerminal {
    terminal: vscode.Terminal;
    agentType: string;
    sessionName: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Agents Extension v0.9.3 activated - enhanced naming with model indicators');
    
    // Cache imports to avoid repeated dynamic loading
    let execAsync: any = null;
    let fs: any = null;
    
    async function getExecAsync() {
        if (!execAsync) {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            execAsync = promisify(exec);
        }
        return execAsync;
    }
    
    async function getFs() {
        if (!fs) {
            fs = await import('fs');
        }
        return fs;
    }
    
    // Simple agent terminal storage
    const agents: Map<string, AgentTerminal> = new Map();
    
    // Agent type configuration in preferred order
    const agentTypes = ['architect', 'featplanner', 'planner', 'factory', 'qa', 'weaver', 'security', 'darkwingduck'];
    const agentShortForms = ['AR', 'FP', 'PL', 'FA', 'QA', 'WE', 'SE', 'DD'];
    
    // Agent emoji mapping
    const agentEmojis: { [key: string]: string } = {
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
    const agentIcons: { [key: string]: string } = {
        'architect': 'settings-gear',
        'featplanner': 'star',
        'planner': 'list-ordered', 
        'factory': 'tools',
        'qa': 'search',
        'weaver': 'git-merge',
        'security': 'shield',
        'darkwingduck': 'flame'
    };
    
    // Model indicators for enhanced terminal names  
    const modelEmojis: { [key: string]: string } = {
        'S': '',      // Sonnet - no extra emoji (clean)
        'O': ' 👑',   // Opus - crown emoji
        'H': ' ⚡',   // Haiku - lightning emoji
        'default': '' // Fallback for unknown models
    };
    
    // Helper function to get agent emoji
    function getAgentEmoji(agentType: string): string {
        return agentEmojis[agentType] || '🤖';
    }
    
    // Helper function to get agent icon
    function getAgentIcon(agentType: string): vscode.ThemeIcon {
        return new vscode.ThemeIcon(agentIcons[agentType] || 'robot');
    }
    
    // Helper function to extract model from session name
    function extractModelFromSession(sessionName: string): string {
        // Check logical naming format: AR-S-alpha, FP-O-beta, etc.
        const logicalMatch = sessionName.match(/^[A-Z]{2}-([SOH])-/);
        if (logicalMatch) {
            return logicalMatch[1];
        }
        // Fallback for unknown formats
        return 'default';
    }
    
    // Helper function to get model emoji for terminal names
    function getModelEmoji(sessionName: string): string {
        const modelIndicator = extractModelFromSession(sessionName);
        return modelEmojis[modelIndicator] || modelEmojis['default'];
    }
    
    // Helper function to detect agent type from session name (full name or short form)
    function detectAgentType(sessionName: string): { agentType: string; priority: number } | null {
        // Check logical naming format first: AR-S-alpha, FP-O-beta, etc.
        const logicalMatch = sessionName.match(/^([A-Z]{2})-[SOH]-/);
        if (logicalMatch) {
            const shortForm = logicalMatch[1];
            for (let i = 0; i < agentShortForms.length; i++) {
                if (agentShortForms[i] === shortForm) {
                    return { agentType: agentTypes[i], priority: i };
                }
            }
        }
        
        // Check full names (architect, planner, etc.)
        for (let i = 0; i < agentTypes.length; i++) {
            const agentType = agentTypes[i];
            if (sessionName.toLowerCase().startsWith(agentType.toLowerCase())) {
                return { agentType, priority: i };
            }
        }
        
        // Check short forms (AR, PL, FA, etc.) for backward compatibility
        for (let i = 0; i < agentShortForms.length; i++) {
            const shortForm = agentShortForms[i];
            if (sessionName.toUpperCase().startsWith(shortForm)) {
                return { agentType: agentTypes[i], priority: i };
            }
        }
        
        return null;
    }
    
    // Helper function to sort sessions by priority (agent sessions first, then others)
    function sortSessionsByPriority(sessions: string[]): { agentSessions: Array<{name: string, agentType: string, priority: number}>, otherSessions: string[] } {
        const agentSessions: Array<{name: string, agentType: string, priority: number}> = [];
        const otherSessions: string[] = [];
        
        for (const sessionName of sessions) {
            const detection = detectAgentType(sessionName);
            if (detection) {
                agentSessions.push({
                    name: sessionName,
                    agentType: detection.agentType,
                    priority: detection.priority
                });
            } else {
                otherSessions.push(sessionName);
            }
        }
        
        // Sort agent sessions by priority (architects first, then planners, etc.)
        agentSessions.sort((a, b) => a.priority - b.priority);
        
        return { agentSessions, otherSessions };
    }
    
    // Helper function to validate and sanitize session ID  
    function validateSessionId(sessionId: string): boolean {
        // Only allow alphanumeric, hyphens, underscores, and dots
        return /^[a-zA-Z0-9\-_.]+$/.test(sessionId) && sessionId.length > 0 && sessionId.length < 100;
    }
    
    // Helper function to get tmux session working directory
    async function getSessionWorkingDirectory(sessionId: string): Promise<string> {
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
        } catch (error) {
            console.error(`Error getting working directory for ${sessionId}:`, error);
        }
        
        // Fallback to workspace root
        const fallback = vscode.workspace.rootPath || process.cwd();
        console.log(`Using fallback directory for ${sessionId}: ${fallback}`);
        return fallback;
    }
    
    // Helper function to create terminal for a session (agent or other)
    async function createTerminalForSession(sessionId: string, agentType?: string): Promise<void> {
        // Validate session ID before creating terminal
        if (!validateSessionId(sessionId)) {
            console.error(`Skipping terminal creation for invalid session ID: ${sessionId}`);
            return;
        }
        let terminalName: string;
        let iconPath: vscode.ThemeIcon;
        
        if (agentType) {
            // Agent session - use emoji, session name, and model indicator
            const agentEmoji = getAgentEmoji(agentType);
            const modelEmoji = getModelEmoji(sessionId);
            terminalName = `${agentEmoji} ${sessionId}${modelEmoji}`;
            iconPath = getAgentIcon(agentType);
            
            // Store agent info
            const agentTerminal: AgentTerminal = {
                terminal: null as any, // Will be set below
                agentType,
                sessionName: sessionId
            };
            agents.set(sessionId, agentTerminal);
        } else {
            // Other session - simple naming
            terminalName = `📟 ${sessionId}`;
            iconPath = new vscode.ThemeIcon('terminal');
        }
        
        // Get the actual working directory for this session
        const sessionCwd = await getSessionWorkingDirectory(sessionId);
        console.log(`Session ${sessionId} working directory: ${sessionCwd}`);
        
        // Create terminal with enhanced naming (model indicators in name)
        const terminal = vscode.window.createTerminal({
            name: terminalName,
            iconPath: iconPath,
            cwd: sessionCwd
        });
        
        // Update agent info with terminal reference
        if (agentType && agents.has(sessionId)) {
            agents.get(sessionId)!.terminal = terminal;
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
            const terminalsToDispose: vscode.Terminal[] = [];
            
            for (const terminal of existingTerminals) {
                // Check if terminal name matches any agent pattern or emoji
                const isAgentTerminal = agentTypes.some(type => 
                    terminal.name.toLowerCase().includes(type)
                ) || agentShortForms.some(short => 
                    terminal.name.match(new RegExp(`^[🏗️✨📋🏭🔍🕸️🛡️🦆🤖📟]\\s+${short}-[SOH]-`))
                ) || terminal.name.includes('🏗️') || terminal.name.includes('✨') || 
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
            const validSessions = allSessions.filter((session: string) => {
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
                } catch (terminalError) {
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
                    } catch (terminalError) {
                        console.error(`Failed to create terminal for ${sessionId}:`, terminalError);
                    }
                }
            }
            
            if (totalCount > 0) {
                const agentCount = agentSessions.length;
                const otherCount = otherSessions.length;
                vscode.window.showInformationMessage(
                    `🔗 Discovered ${agentCount} agent session(s) + ${otherCount} other session(s) from tmux`
                );
                console.log(`Successfully created ${totalCount} terminals (${agentCount} agents + ${otherCount} others)`);
            } else {
                console.log('No tmux sessions found');
            }
        } catch (error) {
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

export function deactivate() {
    console.log('Claude Agents extension deactivated');
}