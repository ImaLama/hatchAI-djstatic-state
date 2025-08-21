#!/usr/bin/env node
/**
 * External script to update Claude agent states from command line or other scripts
 * 
 * Usage examples:
 *   node update_agent_state.js "factory-TC-001" busy
 *   node update_agent_state.js "FA-S-TC-001" done
 *   node update_agent_state.js "AR-O-alpha" error
 */

const vscode = require('vscode');

function updateAgentState(identifier, state) {
    try {
        // Access the global agent manager
        const agentManager = global.claudeAgentManager;
        if (!agentManager) {
            console.error('❌ Claude Agent Manager not found. Is the VSCode extension active?');
            process.exit(1);
        }

        // Valid states
        const validStates = ['idle', 'busy', 'done', 'error', 'unknown'];
        if (!validStates.includes(state)) {
            console.error(`❌ Invalid state: ${state}. Valid states: ${validStates.join(', ')}`);
            process.exit(1);
        }

        // Update the state
        const success = agentManager.updateAgentStateByIdentifier(identifier, state);
        
        if (success) {
            console.log(`✅ Updated agent "${identifier}" to state "${state}"`);
        } else {
            console.error(`❌ Agent not found: "${identifier}"`);
            console.error('Available identifiers can be session names (e.g., "factory-TC-001") or display names (e.g., "FA-S-TC-001")');
            process.exit(1);
        }

    } catch (error) {
        console.error(`❌ Error updating agent state: ${error.message}`);
        process.exit(1);
    }
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
        console.log(`
🦸‍♂️ Claude Agent State Updater

Usage: node update_agent_state.js <identifier> <state>

Identifiers:
  - Session name: "factory-TC-001", "architect-alpha"
  - Display name: "FA-S-TC-001", "AR-O-alpha" 

States: idle, busy, done, error, unknown

Examples:
  node update_agent_state.js "factory-TC-001" busy
  node update_agent_state.js "FA-S-TC-001" done  
  node update_agent_state.js "AR-O-alpha" error
        `);
        process.exit(1);
    }
    
    const [identifier, state] = args;
    updateAgentState(identifier, state);
}

module.exports = { updateAgentState };