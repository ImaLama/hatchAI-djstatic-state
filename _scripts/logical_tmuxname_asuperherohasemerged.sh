#!/bin/bash
# logical_tmuxname_asuperherohasemerged.sh - Enhanced Claude agent launcher with logical tmux naming
# Evolution of asuperherohasemerged.sh with meaningful tmux session names and simplified state tracking

PROJECT_ROOT=$(pwd)
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export CLAUDE_LOG_DIR="$PROJECT_ROOT/_logs"

show_help() {
    cat << EOF
🦸‍♂️ logical_tmuxname_asuperherohasemerged.sh - Claude Agent Launcher with Logical Tmux Names

Usage: $0 <agent_type> [task_id] [options]

Launch Claude agents in tmux sessions with meaningful names and simplified state tracking.

Naming Convention: [AGENT][MODEL]-[TASK]
  - AGENT: AR=architect, PL=planner, FP=featplanner, FA=factory, QA=qa, WE=weaver, SE=security, DD=darkwingduck
  - MODEL: S=sonnet, O=opus, H=haiku
  - TASK: TaskSpec number (TC-999) or fantasy names (Aragorn, Fanny, Quill...)

Agent Types:
  architect (a)       🏗️  Architecture reviews, ADRs, trade-offs
  planner (p)         📋  Planning, DevCard creation, task breakdown  
  featplanner (fp)    📝  Feature planning, FeatSpecs, TaskSpecs
  factory (f)         🏭  Implementation, safe commits, DevCard completion
  qa (q)              🔍  Review, validation, status updates
  weaver (w)          🕸️  Coordination, merge operations, workflow audit
  security (s)        🛡️  Security scans, vulnerability reviews
  darkwingduck (d)    🦆  Emergency/adhoc operations (UNRESTRICTED)

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
  $0 factory TC-999                    # Creates session: FA-S-TC-999
  $0 f TC-001                          # Creates session: FA-S-TC-001
  $0 qa --model opus                   # Creates session: QA-O-Quill
  $0 planner --session-name custom     # Creates session: custom (override)

State Management:
  - Creates meaningful tmux session names (FA-S-TC-999, AR-O-Aragorn)
  - Maintains CLAUDE_AGENT_SESSION_ID for backward compatibility
  - Integrated health monitoring and real-time status updates

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
    "fp"|"featplanner") AGENT_TYPE="featplanner" ;;
    "f") AGENT_TYPE="factory" ;;
    "q") AGENT_TYPE="qa" ;;
    "w") AGENT_TYPE="weaver" ;;
    "s") AGENT_TYPE="security" ;;
    "d") AGENT_TYPE="darkwingduck" ;;
esac

# Validate agent type
case "$AGENT_TYPE" in
    "architect"|"planner"|"featplanner"|"factory"|"qa"|"weaver"|"security"|"darkwingduck")
        ;;
    "")
        echo "❌ Agent type required"
        show_help
        exit 1
        ;;
    *)
        echo "❌ Invalid agent type: $AGENT_TYPE"
        echo "Valid types: architect, planner, featplanner, factory, qa, weaver, security, darkwingduck"
        echo "Abbreviations: a, p, fp, f, q, w, s, d"
        exit 1
        ;;
esac

# Get agent abbreviation
get_agent_abbreviation() {
    case "$1" in
        "architect") echo "AR" ;;
        "planner") echo "PL" ;;
        "featplanner") echo "FP" ;;
        "factory") echo "FA" ;;
        "qa") echo "QA" ;;
        "weaver") echo "WE" ;;
        "security") echo "SE" ;;
        "darkwingduck") echo "DD" ;;
        *) echo "${1:0:2}" | tr '[:lower:]' '[:upper:]' ;;
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

# Get next available fantasy name based on agent abbreviation
get_next_fantasy_name() {
    local agent_abbr="$1"
    local model_abbr="$2"
    
    # Pre-generated fantasy name lists for each agent type
    local -A fantasy_names
    
    # AR (Architect) - Architectural/Royal names
    fantasy_names[AR]="Aragorn Archon Aurora Artemis Ares Atlas Avalon Argus Arcturus Arwen Aslan"
    
    # FA (Factory) - Strong/Industrial names  
    fantasy_names[FA]="Fanny Forge Falcon Felix Fiona Frost Fury Finch Flare Finn Fauna Freya"
    
    # QA (Quality Assurance) - Sharp/Precise names
    fantasy_names[QA]="Quill Quartz Quest Quorra Quinn Quantum Quicksilver Quasar Quintus Quade Queenie Quiver"
    
    # PL (Planner) - Strategic/Wise names
    fantasy_names[PL]="Plato Phoenix Paladin Pike Piper Prism Prowess Polaris Pegasus Pandora Porter Perseus"
    
    # FP (FeatPlanner) - Uses same P list as Planner
    fantasy_names[FP]="Plato Phoenix Paladin Pike Piper Prism Prowess Polaris Pegasus Pandora Porter Perseus"
    
    # WE (Weaver) - Connection/Flow names
    fantasy_names[WE]="Willow Weave Warden Wyatt Wren Wisp Whisper Wade Wynne Wisteria Wolfgang Wonder"
    
    # SE (Security) - Protection/Shield names
    fantasy_names[SE]="Sentinel Shield Sage Saber Stark Storm Sentry Steel Seraph Shadow Sphinx Solace"
    
    # DD (DarkwingDuck) - Mysterious/Powerful names
    fantasy_names[DD]="Draven Dante Dagger Dusk Dynamo Drifter Doom Duchess Diesel Domino Daredevil"
    
    # Convert names string to array for this agent type
    local names_str="${fantasy_names[$agent_abbr]}"
    if [[ -z "$names_str" ]]; then
        # Fallback to phonetic for unknown types
        get_next_phonetic "$agent_abbr" "$model_abbr"
        return
    fi
    
    # Convert to array
    local names_array
    IFS=' ' read -ra names_array <<< "$names_str"
    
    # Check existing sessions and find next available fantasy name
    # Check across ALL models for this agent type to avoid duplicates
    for name in "${names_array[@]}"; do
        local name_taken=false
        # Check all possible model variations for this agent+name combination
        for model_check in "S" "O" "H"; do
            local test_session="${agent_abbr}-${model_check}-${name}"
            if tmux has-session -t "$test_session" 2>/dev/null; then
                name_taken=true
                break
            fi
        done
        
        # If name not taken by any model variant, use it
        if [[ "$name_taken" == "false" ]]; then
            echo "$name"
            return
        fi
    done
    
    # If all fantasy names taken, fall back to phonetic
    get_next_phonetic "$agent_abbr" "$model_abbr"
}

# Get next available phonetic alphabet name
get_next_phonetic() {
    local agent_abbr="$1"
    local model_abbr="$2"
    
    # Phonetic alphabet for fallback naming
    local phonetic_alphabet=(
        "alpha" "beta" "charlie" "delta" "echo" "foxtrot" "golf" "hotel"
        "india" "juliet" "kilo" "lima" "mike" "november" "oscar" "papa"
        "quebec" "romeo" "sierra" "tango" "uniform" "victor" "whiskey" "xray" "yankee" "zulu"
    )
    
    # Check existing sessions and find next available phonetic name
    for phonetic in "${phonetic_alphabet[@]}"; do
        local test_session="${agent_abbr}-${model_abbr}-${phonetic}"
        if ! tmux has-session -t "$test_session" 2>/dev/null; then
            echo "$phonetic"
            return
        fi
    done
    
    # If all phonetic names taken, use timestamp
    echo "$(date +%s)"
}

# Generate logical session name
generate_logical_session_name() {
    local agent_type="$1"
    local task_id="$2"
    local model="$3"
    
    local agent_abbr=$(get_agent_abbreviation "$agent_type")
    local model_abbr=$(get_model_indicator "$model")
    
    if [[ -n "$task_id" ]]; then
        # Use provided task ID
        echo "${agent_abbr}-${model_abbr}-${task_id}"
    else
        # Use next available fantasy name for adhoc sessions
        local fantasy_name=$(get_next_fantasy_name "$agent_abbr" "$model_abbr")
        echo "${agent_abbr}-${model_abbr}-${fantasy_name}"
    fi
}

# Generate session name if not provided (using logical naming)
if [[ -z "$SESSION_NAME" ]]; then
    SESSION_NAME=$(generate_logical_session_name "$AGENT_TYPE" "$TASK_ID" "$MODEL")
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
            # Generate unique session name with timestamp
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
        "featplanner")
            echo "[AGENT_TYPE:PLANNER,ENV:DEV] You are /_state_agents/featplanner_prompt.md. Essential: task featspec-new, task taskspec-new, task featspec-list. Create atomic DevCards. Task: $task_context. Read your prompt for full instructions. Please wait for further instructions after reading."
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

# Generate display name (for compatibility with existing systems)
AGENT_SHORT=$(get_agent_abbreviation "$AGENT_TYPE")
MODEL_INDICATOR=$(get_model_indicator "$MODEL")

# Create display name based on session name for consistency
if [[ "$SESSION_NAME" =~ ^([A-Z]{2,2})-([SOHP])-(.+)$ ]]; then
    # Extract from logical session name (AR, PL, FA, QA, WE, SE, DD, FP)
    DISPLAY_NAME="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
else
    # Fallback for custom session names
    DISPLAY_NAME="${AGENT_SHORT}-${MODEL_INDICATOR}-${SESSION_NAME}"
fi

# Cap display name at 10 characters for status bar compatibility
if [[ ${#DISPLAY_NAME} -gt 10 ]]; then
    DISPLAY_NAME="${DISPLAY_NAME:0:10}"
fi

# Create tmux session with agent
echo "🚀 Launching $AGENT_TYPE agent with logical naming..."
echo "📋 Task: $TASK_CONTEXT" 
echo "🔧 Session: $SESSION_NAME (logical tmux name)"
echo "🎯 Display Name: $DISPLAY_NAME"
echo "🔗 Model: $MODEL"
echo "📁 Project Dir: $PROJECT_ROOT"
echo "📄 Log Dir: ${CLAUDE_LOG_DIR}"

# Get agent emoji for terminal title
case "$AGENT_TYPE" in
    "architect") AGENT_EMOJI="🏗️" ;;
    "planner") AGENT_EMOJI="📋" ;;
    "featplanner") AGENT_EMOJI="📝" ;;
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
# BACKWARD COMPATIBILITY: Keep CLAUDE_AGENT_SESSION_ID matching the logical tmux name
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_SESSION_ID='$SESSION_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_DISPLAY_NAME='$DISPLAY_NAME'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_AGENT_MODEL='$MODEL'" Enter
tmux send-keys -t "$SESSION_NAME" "export CLAUDE_PROJECT_DIR='$PROJECT_ROOT'" Enter

# Window titles are now managed by the tmux statusbar monitoring service
echo "ℹ️ Window titles managed by tmux statusbar service (real-time updates)"

# Set terminal title directly via escape sequences (works in most terminals)
set_terminal_title() {
    local title="$1"
    
    # Method 1: ANSI OSC sequence (works in many terminals)
    if [[ "$TERM_PROGRAM" == "vscode" ]]; then
        # VSCode integrated terminal - use echo with -e flag
        echo -e "\033]0;${title}\007"
    else
        # Other terminals - use printf
        printf '\033]0;%s\007' "$title"
    fi
    
    # Method 2: tmux window title if in tmux session
    if [[ -n "${TMUX:-}" ]]; then
        tmux rename-window "$title" 2>/dev/null || true
    fi
    
    # Method 3: Set PS1 for VSCode process name detection
    export PS1="[${title}] \$ "
}

# Notify VSCode extension to register current terminal as agent terminal
notify_vscode_extension() {
    local session_name="$1"
    local agent_type="$2"
    local display_name="$3"
    local task_id="$4"
    
    # Only create command file if running in VSCode context
    if [[ "$TERM_PROGRAM" == "vscode" ]] || [[ -n "${VSCODE_PID:-}" ]]; then
        # Create VSCode command file to register current terminal as agent terminal
        local vscode_command_dir="${PROJECT_ROOT}/_logs/vscode_commands"
        mkdir -p "$vscode_command_dir"
        
        local command_file="${vscode_command_dir}/register_current_terminal_$(date +%s)_$$.json"
        
        cat > "$command_file" << EOF
{
    "command": "register_current_terminal",
    "name": "${AGENT_EMOJI} ⚪ ${display_name}",
    "agentType": "${agent_type}",
    "sessionName": "${session_name}",
    "displayName": "${display_name}",
    "taskId": "${task_id:-}",
    "model": "${MODEL}"
}
EOF
        
        echo "📤 VSCode integration: Created registration file $command_file"
        echo "🔄 Current terminal will be registered as agent terminal"
        return 0
    fi
    
    return 1
}

# Set terminal title and handle VSCode integration
TERMINAL_TITLE="${AGENT_EMOJI} ⚪ ${DISPLAY_NAME}"

# Always set terminal title via escape sequences
set_terminal_title "$TERMINAL_TITLE"
echo "🏷️ Set terminal title to: $TERMINAL_TITLE"

# Try VSCode integration if available
if notify_vscode_extension "$SESSION_NAME" "$AGENT_TYPE" "$DISPLAY_NAME" "$TASK_ID"; then
    echo "✅ VSCode extension will register current terminal with agent integration"
else
    echo "ℹ️ Running outside VSCode - terminal title set via escape sequences"
fi

# Set PS1 for process name (VSCode terminal.integrated.tabs.title setting)
# Only set if not already set to avoid duplication
if [[ "$PS1" != *"${AGENT_EMOJI}"* ]]; then
    export PS1="[${AGENT_EMOJI} ${DISPLAY_NAME}] \$ "
fi

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
echo "🎯 Logical Session: $SESSION_NAME (directly trackable)"
echo "🎯 Display Name: $DISPLAY_NAME"
echo "🏷️ Terminal Title: $TERMINAL_TITLE"

# Status monitoring info
if [[ "$TERM_PROGRAM" == "vscode" ]] || [[ -n "${VSCODE_PID:-}" ]]; then
    echo "📱 VSCode: Real-time status updates via status bar and terminal creation"
else
    echo "ℹ️ Terminal: Title updated, agent state visible via JSON state file"
fi

# Handle attachment based on context and flags
if [[ "$NO_ATTACH" != "true" ]]; then
    # Auto-attach by default (no prompting)
    echo "🔗 Auto-attaching to session..."
    
    # Attach to session 
    tmux attach -t "$SESSION_NAME"
else
    echo "📝 Session created without attachment (--no-attach specified)"
    echo "🔗 To attach later: tmux attach -t $SESSION_NAME"
fi