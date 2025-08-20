#!/bin/bash
# asuperherohasemerged.sh - Enhanced Claude agent launcher with VSCode integration
# Evolution of aherohasemerged.sh with tmux session management and state tracking

PROJECT_ROOT=$(pwd)
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export CLAUDE_LOG_DIR="$PROJECT_ROOT/_logs"

show_help() {
    cat << EOF
🦸‍♂️ asuperherohasemerged.sh - VSCode-Integrated Claude Agent Launcher

Usage: $0 <agent_type> [task_id] [options]

Launch Claude agents in tmux sessions with VSCode terminal integration.

Agent Types:
  architect (a)    🏗️  Architecture reviews, ADRs, trade-offs
  planner (p)      📋  Planning, DevCard creation, task breakdown  
  factory (f)      🏭  Implementation, safe commits, DevCard completion
  qa (q)           🔍  Review, validation, status updates
  weaver (w)       🕸️  Coordination, merge operations, workflow audit
  security (s)     🛡️  Security scans, vulnerability reviews
  darkwingduck (d) 🦆  Emergency/adhoc operations (UNRESTRICTED)

Arguments:
  agent_type   Required: Agent type from list above
  task_id      Optional: Task/DevCard ID (e.g., TC-001, DC-123)
  
Options:
  --session-name NAME  Override session name 
  --model MODEL       Claude model (sonnet/opus/haiku, default: sonnet)
  --no-capture        Disable tmux session capture
  --attach-only       Attach to existing session if exists
  --no-attach         Create session without attaching (useful for VSCode)

Examples:
  $0 factory TC-001                    # Launch factory for TaskSpec TC-001
  $0 f TC-001                          # Same as above (abbreviation)
  $0 qa DC-123 --attach-only          # Attach to existing QA session for DC-123
  $0 q DC-123 --attach-only           # Same as above (abbreviation)
  $0 planner --session-name planning   # Launch planner with custom session name
  $0 p --session-name planning         # Same as above (abbreviation)
  $0 security --no-capture            # Launch security agent without logging
  $0 s --no-capture                   # Same as above (abbreviation)

State Management:
  - Creates stop hook triggers in _logs/hooks/
  - Captures session output to _logs/{task_id}/{agent_type}_session.log
  - Updates terminal title with state indicators
  - Integrates with VSCode extension for visual feedback

EOF
}

# Parse arguments
AGENT_TYPE=""
TASK_ID=""
SESSION_NAME=""
MODEL="sonnet"
NO_CAPTURE=false
ATTACH_ONLY=false
NO_ATTACH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --session-name)
            SESSION_NAME="$2"
            shift 2
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --no-capture)
            NO_CAPTURE=true
            shift
            ;;
        --attach-only)
            ATTACH_ONLY=true
            shift
            ;;
        --no-attach)
            NO_ATTACH=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        -*)
            echo "❌ Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "$AGENT_TYPE" ]]; then
                AGENT_TYPE="$1"
            elif [[ -z "$TASK_ID" ]]; then
                TASK_ID="$1"
            else
                echo "❌ Too many arguments"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Expand single-letter abbreviations
case "$AGENT_TYPE" in
    "a") AGENT_TYPE="architect" ;;
    "p") AGENT_TYPE="planner" ;;
    "f") AGENT_TYPE="factory" ;;
    "q") AGENT_TYPE="qa" ;;
    "w") AGENT_TYPE="weaver" ;;
    "s") AGENT_TYPE="security" ;;
    "d") AGENT_TYPE="darkwingduck" ;;
esac

# Validate agent type
case "$AGENT_TYPE" in
    "architect"|"planner"|"factory"|"qa"|"weaver"|"security"|"darkwingduck")
        ;;
    "")
        echo "❌ Agent type required"
        show_help
        exit 1
        ;;
    *)
        echo "❌ Invalid agent type: $AGENT_TYPE"
        echo "Valid types: architect, planner, factory, qa, weaver, security, darkwingduck"
        echo "Abbreviations: a, p, f, q, w, s, d"
        exit 1
        ;;
esac

# Generate session name if not provided
if [[ -z "$SESSION_NAME" ]]; then
    if [[ -n "$TASK_ID" ]]; then
        SESSION_NAME="${AGENT_TYPE}-${TASK_ID}"
    else
        SESSION_NAME="${AGENT_TYPE}-$(date +%s)"
    fi
fi

# Check if session exists and handle attach-only mode
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    if [[ "$ATTACH_ONLY" == "true" ]]; then
        echo "✅ Attaching to existing session: $SESSION_NAME"
        tmux attach -t "$SESSION_NAME"
        exit 0
    else
        echo "⚠️  Session '$SESSION_NAME' already exists"
        read -p "Attach to existing session? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            tmux attach -t "$SESSION_NAME"
            exit 0
        else
            # Generate unique session name
            SESSION_NAME="${SESSION_NAME}-$(date +%s)"
            echo "🔄 Creating new session: $SESSION_NAME"
        fi
    fi
fi

# Setup logging directories
if [[ -n "$TASK_ID" ]] && [[ "$NO_CAPTURE" != "true" ]]; then
    LOG_DIR="$CLAUDE_LOG_DIR/$TASK_ID"
    mkdir -p "$LOG_DIR"
    SESSION_LOG="$LOG_DIR/${AGENT_TYPE}_session.log"
else
    LOG_DIR="$CLAUDE_LOG_DIR/sessions"
    mkdir -p "$LOG_DIR"
    SESSION_LOG="$LOG_DIR/${SESSION_NAME}.log"
fi

# Create hooks directory
mkdir -p "$CLAUDE_LOG_DIR/hooks"

# Get agent prompt based on type
get_agent_prompt() {
    local agent_type="$1"
    local task_context="$2"
    
    case "$agent_type" in
        "architect")
            echo "[AGENT_TYPE:ARCHITECT,ENV:DEV] You are /agents/architect_prompt.md. Essential: Review architecture, analyze trade-offs. Never implement code. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "planner")
            echo "[AGENT_TYPE:PLANNER,ENV:DEV] You are /agents/planner_prompt.md. Create atomic DevCards. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "factory")
            echo "[AGENT_TYPE:FACTORY,ENV:DEV] You are /agents/factory_prompt.md in $SESSION_NAME. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "qa")
            echo "[AGENT_TYPE:QA,ENV:DEV] You are /agents/qa_prompt.md. Essential: make devcard-qa, make validate, update status in worktree. Never modify implementation. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "weaver")
            echo "[AGENT_TYPE:WEAVER,ENV:DEV] You are /agents/weaver_prompt.md. Essential: Coordinate workflow, never direct git. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "security")
            echo "[AGENT_TYPE:SECURITY,ENV:DEV] You are /agents/security_prompt.md. Essential: Review for vulnerabilities, create security DevCards. Never implement fixes. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
            ;;
        "darkwingduck")
            echo "[AGENT_TYPE:DARKWINGDUCK,ENV:DEV] You are /agents/darkwingduck_prompt.md. UNRESTRICTED access for emergency/adhoc operations. All actions logged. Task: $task_context. Read your prompt for guidelines. Let's get dangerous!"
            ;;
    esac
}

# Prepare agent context
TASK_CONTEXT="${TASK_ID:-'General operations'}"
AGENT_PROMPT=$(get_agent_prompt "$AGENT_TYPE" "$TASK_CONTEXT")

# Generate display name for VSCode integration
generate_display_name() {
    local agent_type="$1"
    local task_id="$2"
    local model="${3:-sonnet}"  # Default to sonnet if not specified
    
    # Get agent short name
    case "$agent_type" in
        "architect") echo "AR" ;;
        "planner") echo "PL" ;;
        "factory") echo "FA" ;;
        "qa") echo "QA" ;;
        "weaver") echo "WE" ;;
        "security") echo "SE" ;;
        "darkwingduck") echo "DD" ;;
        *) echo "${agent_type:0:2}" | tr '[:lower:]' '[:upper:]' ;;
    esac
}

# Get model indicator
get_model_indicator() {
    case "${1:-sonnet}" in
        "opus") echo "O" ;;
        "haiku") echo "H" ;;
        *) echo "S" ;;  # Default to Sonnet
    esac
}

# Display name already generated above

# Create tmux session with agent
echo "🚀 Launching $AGENT_TYPE agent..."
echo "📋 Task: $TASK_CONTEXT" 
echo "🔧 Session: $SESSION_NAME"
echo "🎯 Display Name: $DISPLAY_NAME"
echo "🔗 Model: $MODEL"
echo "📁 Project Dir: $PROJECT_ROOT"
echo "📄 Log Dir: ${CLAUDE_LOG_DIR}"

# Get agent emoji for terminal title
case "$AGENT_TYPE" in
    "architect") AGENT_EMOJI="🏗️" ;;
    "planner") AGENT_EMOJI="📋" ;;
    "factory") AGENT_EMOJI="🏭" ;;
    "qa") AGENT_EMOJI="🔍" ;;
    "weaver") AGENT_EMOJI="🕸️" ;;
    "security") AGENT_EMOJI="🛡️" ;;
    "darkwingduck") AGENT_EMOJI="🦆" ;;
    *) AGENT_EMOJI="🤖" ;;
esac

# Start session with proper environment
echo "🔧 Creating tmux session: $SESSION_NAME"
if tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"; then
    echo "✅ Successfully created tmux session: $SESSION_NAME"
else
    echo "❌ Failed to create tmux session: $SESSION_NAME"
    exit 1
fi

# Set environment variables in the session
tmux send-keys -t "$SESSION_NAME" "export AGENT_TYPE='$AGENT_TYPE'" Enter
tmux send-keys -t "$SESSION_NAME" "export DEPLOYMENT_ENV=DEV" Enter  
tmux send-keys -t "$SESSION_NAME" "export SESSION_NAME='$SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "export TASK_ID='$TASK_ID'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_SESSION_ID='$SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_DISPLAY_NAME='$DISPLAY_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_MODEL='$MODEL'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_PROJECT_DIR='$PROJECT_ROOT'" Enter

# Window titles are now managed by the tmux statusbar monitoring service
echo "ℹ️ Window titles managed by tmux statusbar service (real-time updates)"

# Launch Claude Code with the agent prompt
echo "🚀 Launching Claude Code with agent prompt..."
echo "📝 Prompt: $AGENT_PROMPT"
tmux send-keys -t "$SESSION_NAME" "claude --model '$MODEL' --dangerously-skip-permissions '$AGENT_PROMPT'" Enter
echo "✅ Claude Code launch command sent to session"

# Start session capture if not disabled
if [[ "$NO_CAPTURE" != "true" ]]; then
    echo "📹 Starting session capture: $SESSION_LOG"
    # Use your existing tmux capture system
    if [[ -f "_hatch_scripts/tmux_session_capture.sh" ]]; then
        "_hatch_scripts/tmux_session_capture.sh" start "$SESSION_NAME" "$SESSION_LOG" --timestamps
    else
        # Fallback to basic tmux pipe-pane
        tmux pipe-pane -t "$SESSION_NAME" -o "cat >> '$SESSION_LOG'"
    fi
fi

# Claude Code hooks are configured globally in ~/.claude/settings.json
# The global hooks will handle Start and Stop events automatically

# Session monitoring is now handled by the unified tmux_session_monitor.sh service
echo "📡 Session monitoring handled by unified tmux monitoring service"

echo "✅ Agent launched successfully!"
echo "🔗 Attach with: tmux attach -t $SESSION_NAME"
echo "📊 Monitor with: tail -f $SESSION_LOG"
echo "🎯 Display Name: $DISPLAY_NAME"

# VSCode integration removed - tmux statusbar provides unified agent state visibility
echo "ℹ️ Agent state visible via tmux statusbar (left side shows real-time states)"

# Handle attachment based on context and flags
if [[ "$NO_ATTACH" != "true" ]]; then
    # Auto-attach by default (no prompting)
    echo "🔗 Auto-attaching to session..."
    
    # Set terminal title with proper agent display name before attachment - DISABLED
    # printf '\033]0;%s ⚪ %s\007' "$AGENT_EMOJI" "$DISPLAY_NAME"
    
    # Attach to session 
    tmux attach -t "$SESSION_NAME"
    
    # Set title again after session ends (when user detaches/exits) - DISABLED
    # printf '\033]0;%s ⚪ %s\007' "$AGENT_EMOJI" "$DISPLAY_NAME"
else
    echo "📝 Session created without attachment (--no-attach specified)"
    echo "🔗 To attach later: tmux attach -t $SESSION_NAME"
fi