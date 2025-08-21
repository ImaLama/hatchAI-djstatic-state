#!/bin/bash
# logical_tmuxname_populate_state_agents.sh - Launch djhatch-state management agents with logical naming
# Based on populate_state_agents.sh but adapted for meaningful tmux session names
# Creates tmux sessions with Claude Code agents using logical naming convention

set -e

PROJECT_ROOT=$(pwd)
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export CLAUDE_LOG_DIR="$PROJECT_ROOT/_logs"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

echo "=== Setting up djhatch-state Management Agents (Logical Naming) ==="
echo "Project: $PROJECT_NAME"
echo "Root: $PROJECT_ROOT"
echo "Naming Convention: [AGENT][MODEL]-[TASK] (e.g., AR-O-alpha, PL-S-beta)"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
  echo "❌ tmux is not installed. Please install tmux first."
  exit 1
fi

# Check if claude is installed
if ! command -v claude &> /dev/null; then
  echo "❌ claude is not installed. Please install Claude Code CLI first."
  exit 1
fi

# Get next available phonetic alphabet name for agent type and model
get_next_phonetic() {
    local agent_abbr="$1"
    local model_abbr="$2"
    
    # Phonetic alphabet for logical naming
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

# Clean up existing state management sessions with logical names
echo "Cleaning up existing state management sessions..."
# Legacy names
tmux kill-session -t architect1-opus 2>/dev/null || true
tmux kill-session -t architect2-opus 2>/dev/null || true
tmux kill-session -t architect-sonnet 2>/dev/null || true
tmux kill-session -t featplanner-opus 2>/dev/null || true
tmux kill-session -t featplanner-sonnet 2>/dev/null || true
tmux kill-session -t state-dashboard 2>/dev/null || true

# Logical names that might exist
tmux kill-session -t AR-O-alpha 2>/dev/null || true
tmux kill-session -t AR-O-beta 2>/dev/null || true
tmux kill-session -t AR-S-alpha 2>/dev/null || true
tmux kill-session -t PL-O-alpha 2>/dev/null || true
tmux kill-session -t PL-S-alpha 2>/dev/null || true
tmux kill-session -t FP-O-alpha 2>/dev/null || true
tmux kill-session -t FP-S-alpha 2>/dev/null || true
tmux kill-session -t dashboard 2>/dev/null || true

# Generate logical session names (ensuring uniqueness)
ARCHITECT1_SESSION="AR-O-alpha"
ARCHITECT2_SESSION="AR-O-beta"  
ARCHITECT_SONNET_SESSION="AR-S-alpha"
FEATPLANNER_OPUS_SESSION="FP-O-alpha"  # Using FP for featplanner
FEATPLANNER_SONNET_SESSION="FP-S-alpha"
DASHBOARD_SESSION="dashboard"

# Function to start Claude with environment variables for state agent detection
start_claude_session() {
  local role=$1
  local session_name=$2
  local pane_target=$3
  local model=$4
  
  case $role in
    "architect-opus")
      # Set environment variables for logical naming compatibility
      tmux send-keys -t "$pane_target" "export AGENT_TYPE=ARCHITECT" Enter
      tmux send-keys -t "$pane_target" "export DEPLOYMENT_ENV=DEV" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_PROJECT_DIR=\"$PROJECT_ROOT\"" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_LOG_DIR=\"$PROJECT_ROOT/_logs\"" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_SESSION_ID='$session_name'" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_DISPLAY_NAME='$session_name'" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_MODEL='$model'" Enter
      tmux send-keys -t "$pane_target" "claude --model $model --dangerously-skip-permissions \"[AGENT_TYPE:ARCHITECT,ENV:DEV] You are /_state_agents/architect_prompt.md. Essential: create ADRs, review architecture, analyze trade-offs for state management. Never implement code. Read your prompt for full instructions. Please wait for further instructions after reading.\"" Enter
      ;;
    "featplanner")
      # Set environment variables for logical naming compatibility
      tmux send-keys -t "$pane_target" "export AGENT_TYPE=PLANNER" Enter
      tmux send-keys -t "$pane_target" "export DEPLOYMENT_ENV=DEV" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_PROJECT_DIR=\"$PROJECT_ROOT\"" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_LOG_DIR=\"$PROJECT_ROOT/_logs\"" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_SESSION_ID='$session_name'" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_DISPLAY_NAME='$session_name'" Enter
      tmux send-keys -t "$pane_target" "export CLAUDE_AGENT_MODEL='$model'" Enter
      tmux send-keys -t "$pane_target" "claude --model $model --dangerously-skip-permissions \"[AGENT_TYPE:PLANNER,ENV:DEV] You are /_state_agents/featplanner_prompt.md. Essential: task featspec-new, task taskspec-new, task featspec-list. Create atomic DevCards. Read your prompt for full instructions. Please wait for further instructions after reading.\"" Enter
      ;;
  esac
}

# Create dashboard session first
echo "Creating state management dashboard session: $DASHBOARD_SESSION"
tmux new-session -d -s "$DASHBOARD_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$DASHBOARD_SESSION" "# djhatch-state Management Dashboard (Logical Naming)" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Use 'tmux a -t <session>' to attach to a session" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Logical sessions: $ARCHITECT1_SESSION, $ARCHITECT2_SESSION, $ARCHITECT_SONNET_SESSION" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Logical sessions: $FEATPLANNER_OPUS_SESSION, $FEATPLANNER_SONNET_SESSION" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Run 'task featspec-list' to check feature status" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Run 'task taskspec-list' to check task status" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "# Run 'task show-env' to check environment" Enter
tmux send-keys -t "$DASHBOARD_SESSION" "task show-env" Enter

# Start architect sessions with logical names
echo "Starting architect session: $ARCHITECT1_SESSION (Primary Architect - Opus)"
tmux new-session -d -s "$ARCHITECT1_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$ARCHITECT1_SESSION" "clear" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo '=== ARCHITECT OPUS SESSION ($ARCHITECT1_SESSION) ==='" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Role: State management architecture reviews and ADR creation'" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Model: Opus for complex architectural reasoning'" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Session: $ARCHITECT1_SESSION (logical tmux name)'" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Tools: analysis tools for state management'" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Readonly Access: djhatch-readonly-mount/'" Enter
tmux send-keys -t "$ARCHITECT1_SESSION" "echo 'Initializing Claude architect session'" Enter
start_claude_session "architect-opus" "$ARCHITECT1_SESSION" "$ARCHITECT1_SESSION" "opus"

echo "Starting architect session: $ARCHITECT2_SESSION (Secondary Architect - Opus)"
tmux new-session -d -s "$ARCHITECT2_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$ARCHITECT2_SESSION" "clear" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo '=== ARCHITECT OPUS SESSION ($ARCHITECT2_SESSION) ==='" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Role: State management architecture reviews and ADR creation'" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Model: Opus for complex architectural reasoning'" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Session: $ARCHITECT2_SESSION (logical tmux name)'" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Tools: analysis tools for state management'" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Readonly Access: djhatch-readonly-mount/'" Enter
tmux send-keys -t "$ARCHITECT2_SESSION" "echo 'Initializing Claude architect session'" Enter
start_claude_session "architect-opus" "$ARCHITECT2_SESSION" "$ARCHITECT2_SESSION" "opus"

echo "Starting architect session: $ARCHITECT_SONNET_SESSION (Routine Architect - Sonnet)"
tmux new-session -d -s "$ARCHITECT_SONNET_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "clear" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo '=== ARCHITECT SONNET SESSION ($ARCHITECT_SONNET_SESSION) ==='" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Role: State management architecture reviews and ADR creation'" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Model: Sonnet for routine architectural guidance'" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Session: $ARCHITECT_SONNET_SESSION (logical tmux name)'" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Tools: analysis tools for state management'" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Readonly Access: djhatch-readonly-mount/'" Enter
tmux send-keys -t "$ARCHITECT_SONNET_SESSION" "echo 'Initializing Claude architect session'" Enter
start_claude_session "architect-opus" "$ARCHITECT_SONNET_SESSION" "$ARCHITECT_SONNET_SESSION" "sonnet"

# Start featplanner sessions with logical names
echo "Starting featplanner session: $FEATPLANNER_OPUS_SESSION (Feature Planner - Opus)"
tmux new-session -d -s "$FEATPLANNER_OPUS_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "clear" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo '=== FEATPLANNER OPUS SESSION ($FEATPLANNER_OPUS_SESSION) ==='" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Role: Create FeatSpecs and TaskSpecs with acceptance criteria'" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Model: Opus for complex feature planning'" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Session: $FEATPLANNER_OPUS_SESSION (logical tmux name)'" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Tools: task featspec-new, task taskspec-new, task featspec-list'" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Readonly Access: djhatch-readonly-mount/'" Enter
tmux send-keys -t "$FEATPLANNER_OPUS_SESSION" "echo 'Initializing Claude featplanner session'" Enter
start_claude_session "featplanner" "$FEATPLANNER_OPUS_SESSION" "$FEATPLANNER_OPUS_SESSION" "opus"

echo "Starting featplanner session: $FEATPLANNER_SONNET_SESSION (Feature Planner - Sonnet)"
tmux new-session -d -s "$FEATPLANNER_SONNET_SESSION" -c "$PROJECT_ROOT"
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "clear" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo '=== FEATPLANNER SONNET SESSION ($FEATPLANNER_SONNET_SESSION) ==='" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Role: Create FeatSpecs and TaskSpecs with acceptance criteria'" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Model: Sonnet for routine feature planning'" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Session: $FEATPLANNER_SONNET_SESSION (logical tmux name)'" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Tools: task featspec-new, task taskspec-new, task featspec-list'" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Readonly Access: djhatch-readonly-mount/'" Enter
tmux send-keys -t "$FEATPLANNER_SONNET_SESSION" "echo 'Initializing Claude featplanner session'" Enter
start_claude_session "featplanner" "$FEATPLANNER_SONNET_SESSION" "$FEATPLANNER_SONNET_SESSION" "sonnet"

# List all sessions
echo ""
echo "✅ djhatch-state Management Agents ready with logical naming!"
echo ""
echo "Active sessions:"
tmux list-sessions

echo ""
echo "Quick attach commands (Logical Names):"
echo " tmux a -t $ARCHITECT1_SESSION       # Primary architect with opus model"
echo " tmux a -t $ARCHITECT2_SESSION       # Secondary architect with opus model"
echo " tmux a -t $ARCHITECT_SONNET_SESSION  # Architect with sonnet model"
echo " tmux a -t $FEATPLANNER_OPUS_SESSION  # Feature planner with opus model"
echo " tmux a -t $FEATPLANNER_SONNET_SESSION # Feature planner with sonnet model"
echo " tmux a -t $DASHBOARD_SESSION         # State management monitoring"

echo ""
echo "Session Name Pattern:"
echo " AR-O-alpha, AR-O-beta    # Architect + Opus + phonetic"
echo " AR-S-alpha               # Architect + Sonnet + phonetic"
echo " PL-O-alpha, PL-S-alpha   # Planner + Model + phonetic"

echo ""
echo "State management commands:"
echo " task featspec-new            # Create new feature specification"
echo " task taskspec-new            # Create new task specification"
echo " task featspec-list           # List all feature specifications"
echo " task taskspec-list           # List all task specifications"
echo " task mount-status            # Check readonly mount status"

echo ""
echo "Or use the logical naming agent launcher:"
echo " ./_scripts/logical_tmuxname_asuperherohasemerged.sh architect  # Creates AR-S-alpha"
echo " ./_scripts/logical_tmuxname_asuperherohasemerged.sh planner    # Creates PL-S-alpha"
echo " ./_scripts/logical_tmuxname_asuperherohasemerged.sh factory TC-999  # Creates FA-S-TC-999"

echo ""
echo "📊 Logical Naming Benefits:"
echo " ✅ Meaningful session names (FA-S-TC-999 vs factory-1755608908)"
echo " ✅ Direct tmux session tracking (no separate CLAUDE_AGENT_SESSION_ID needed)"
echo " ✅ Model and agent type visible in session name"
echo " ✅ Automatic phonetic fallback naming (alpha, beta, charlie...)"
echo " ✅ Backward compatibility maintained for existing systems"
echo ""