#!/bin/bash
PROJECT_ROOT=$(pwd)
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export CLAUDE_LOG_DIR="$PROJECT_ROOT/_logs"
# aherohasemerged.sh - Claude role launcher script
# v3: Security-aware Factory Process agent launcher
# Evolution of original aherohasemerged.sh with tool initialization

show_help() {
    cat << EOF
Usage: $0 <role>

Launch Claude with security-aware role-specific prompts for Factory Process agents.
v3: Security tooling and validation workflows

Available roles:
  a  architect - Architecture (ADRs, review, trade-offs)
  p  planner   - Planning (devcard-new, featcard-new, devcard-list)
  f  factory   - Implementation (devcard-claim, safe-commit, devcard-finish)
  q  qa        - Review (devcard-qa, validate, update status)
  w  weaver    - Coordination (validate, merge-card, audit)
  s  security  - Security (scan, review, create security DevCards)
  d  darkwingduck - Emergency/adhoc operations (UNRESTRICTED)
  u  user      - Claude code in bypass mode (no agent role)

Numbered shortcuts (tmux session attach):
  p1, p2, p3          - Planner sessions (planner, planner2, planner3)
  f1, f2, f3          - Factory sessions (factory1, factory2, factory3)
  f4, f5              - Factory sessions (fatbaby4, fatbaby5)
  q1, q2, q3, q4, q5  - QA sessions (qa1, qa2, qa3, qa4, qa5)
  w                   - Weaver session
  s                   - Security session

Features (v3):
  - Security-aware role initialization
  - Tool-aware agent prompts with validation commands
  - Start with health-check for all agents
  - Tool usage instructions

Examples:
  $0 p    # Launch planner with planning workflow
  $0 f    # Launch factory with security checks
  $0 q    # Launch QA with validation tools
  $0 w    # Launch weaver with merge tools
  $0 p1   # Attach to planner tmux session
  $0 f2   # Attach to factory2 tmux session
  $0 q3   # Attach to qa3 tmux session

EOF
}

# Check if argument is provided
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

# Parse the role argument
role="$1"

case "$role" in
    "a")
        export AGENT_TYPE=ARCHITECT DEPLOYMENT_ENV=DEV
        claude --model sonnet --dangerously-skip-permissions "[AGENT_TYPE:ARCHITECT,ENV:DEV] You are /_state_agents/architect_prompt.md. Essential: Review architecture, analyze trade-offs. Never implement code. Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "p")
        export AGENT_TYPE=PLANNER DEPLOYMENT_ENV=DEV
        claude --model opus --dangerously-skip-permissions "[AGENT_TYPE:PLANNER,ENV:DEV] You are /_state_agents/featplanner_prompt.md. Create atomic DevCards. Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "f")
        export AGENT_TYPE=FACTORY DEPLOYMENT_ENV=DEV
        claude --model sonnet --dangerously-skip-permissions "[AGENT_TYPE:FACTORY,ENV:DEV] You are /_state_agents/factory_prompt.md in factory1.Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "q")
        export AGENT_TYPE=QA DEPLOYMENT_ENV=DEV
        claude --model sonnet --dangerously-skip-permissions "[AGENT_TYPE:QA,ENV:DEV] You are /_state_agents/qa_prompt.md. Essential: make devcard-qa, make validate, update status in worktree. Never modify implementation. Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "w")
        export AGENT_TYPE=WEAVER DEPLOYMENT_ENV=DEV
        claude --model sonnet --dangerously-skip-permissions "[AGENT_TYPE:WEAVER,ENV:DEV] You are /_state_agents/weaver_prompt.md. Essential: Coordinate workflow, never direct git. Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "s")
        export AGENT_TYPE=SECURITY DEPLOYMENT_ENV=DEV
        claude --model sonnet --dangerously-skip-permissions "[AGENT_TYPE:SECURITY,ENV:DEV] You are /_state_agents/security_prompt.md. Essential: Review for vulnerabilities, create security DevCards. Never implement fixes. Read your prompt for full instructions. Please wait for further instructions after reading."
        ;;
    "d")
        export AGENT_TYPE=DARKWINGDUCK DEPLOYMENT_ENV=DEV
        claude --model opus --dangerously-skip-permissions "[AGENT_TYPE:DARKWINGDUCK,ENV:DEV] You are /_state_agents/darkwingduck_prompt.md. UNRESTRICTED access for emergency/adhoc operations. All actions logged. Read your prompt for guidelines. Let's get dangerous!"
        ;;
    "u")
        # No agent type for user mode
        claude --model sonnet --dangerously-skip-permissions "You are Claude Code, an AI assistant for software development. You have access to tools and can help with any development tasks. No specific agent role restrictions apply."
        ;;
    # Numbered shortcuts for tmux sessions
    "p1")
        tmux attach -t planner
        ;;
    "p2")
        tmux attach -t planner2
        ;;
    "p3")
        tmux attach -t planner3
        ;;
    "f1")
        tmux attach -t factory1
        ;;
    "f2")
        tmux attach -t factory2
        ;;
    "f3")
        tmux attach -t factory3
        ;;
    "f4")
        tmux attach -t fatbaby4
        ;;
    "f5")
        tmux attach -t fatbaby5
        ;;
    "q1")
        tmux attach -t qa1
        ;;
    "q2")
        tmux attach -t qa2
        ;;
    "q3")
        tmux attach -t qa3
        ;;
    "q4")
        tmux attach -t qa4
        ;;
    "q5")
        tmux attach -t qa5
        ;;
    "w")
        tmux attach -t weaver
        ;;
    "s")
        tmux attach -t security
        ;;
    *)
        echo "❌ Invalid role: $role"
        echo "Valid options: a, p, f, q, w, s, u, p1-p3, f1-f5, q1-q5, w, s"
        echo "Use '$0' without arguments for help"
        exit 1
        ;;
esac