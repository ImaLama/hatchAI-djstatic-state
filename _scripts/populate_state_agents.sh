#!/bin/bash
# populate_state_agents.sh - Launch djhatch-state management agents
# Based on hatchAI-devcards setup_populated_factory.sh but adapted for state management
# Creates tmux sessions with Claude Code agents for state management operations

set -e

PROJECT_ROOT=$(pwd)
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export CLAUDE_LOG_DIR="$PROJECT_ROOT/_logs"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

echo "=== Setting up djhatch-state Management Agents ==="
echo "Project: $PROJECT_NAME"
echo "Root: $PROJECT_ROOT"

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

# Kill existing state management sessions
echo "Cleaning up existing state management sessions..."
tmux kill-session -t architect1-opus 2>/dev/null || true
tmux kill-session -t architect2-opus 2>/dev/null || true
tmux kill-session -t architect-sonnet 2>/dev/null || true
tmux kill-session -t featplanner-opus 2>/dev/null || true
tmux kill-session -t featplanner-sonnet 2>/dev/null || true
tmux kill-session -t state-dashboard 2>/dev/null || true

# Function to start Claude with environment variables for state agent detection
start_claude_session() {
  local role=$1
  local session_name=$2
  local pane_target=$3
  local model=$4
  
  case $role in
    "architect-opus")
      tmux send-keys -t "$pane_target" "export AGENT_NAME=$session_name AGENT_TYPE=ARCHITECT DEPLOYMENT_ENV=DEV CLAUDE_PROJECT_DIR=\"$PROJECT_ROOT\" CLAUDE_LOG_DIR=\"$PROJECT_ROOT/_logs\" && claude --model $model --dangerously-skip-permissions \"[AGENT_TYPE:ARCHITECT,ENV:DEV] You are /_state_agents/architect_prompt.md. Essential: create ADRs, review architecture, analyze trade-offs for state management. Never implement code. Read your prompt for full instructions. Please wait for further instructions after reading.\"" C-m
      ;;
    "featplanner")
      tmux send-keys -t "$pane_target" "export AGENT_NAME=$session_name AGENT_TYPE=PLANNER DEPLOYMENT_ENV=DEV CLAUDE_PROJECT_DIR=\"$PROJECT_ROOT\" CLAUDE_LOG_DIR=\"$PROJECT_ROOT/_logs\" && claude --model $model --dangerously-skip-permissions \"[AGENT_TYPE:PLANNER,ENV:DEV] You are /_state_agents/featplanner_prompt.md. Essential: task featspec-new, task taskspec-new, task featspec-list. Create atomic DevCards. Read your prompt for full instructions. Please wait for further instructions after reading.\"" C-m
      ;;
  esac
}

# Create dashboard session first
echo "Creating state management dashboard session..."
tmux new-session -d -s state-dashboard -c "$PROJECT_ROOT"
tmux send-keys -t state-dashboard "# djhatch-state Management Dashboard" Enter
tmux send-keys -t state-dashboard "# Use 'tmux a -t <session>' to attach to a session" Enter
tmux send-keys -t state-dashboard "# Available sessions: architect1-opus, architect2-opus, architect-sonnet, featplanner-opus, featplanner-sonnet" Enter
tmux send-keys -t state-dashboard "# Run 'task featspec-list' to check feature status" Enter
tmux send-keys -t state-dashboard "# Run 'task taskspec-list' to check task status" Enter
tmux send-keys -t state-dashboard "# Run 'task show-env' to check environment" Enter
tmux send-keys -t state-dashboard "task show-env" Enter

# Start architect sessions
echo "Starting architect1-opus session..."
tmux new-session -d -s architect1-opus -c "$PROJECT_ROOT"
tmux send-keys -t architect1-opus "clear" C-m
tmux send-keys -t architect1-opus "echo '=== ARCHITECT1 OPUS SESSION ==='" C-m
tmux send-keys -t architect1-opus "echo 'Role: State management architecture reviews and ADR creation'" C-m
tmux send-keys -t architect1-opus "echo 'Model: Opus for complex architectural reasoning'" C-m
tmux send-keys -t architect1-opus "echo 'Tools: analysis tools for state management'" C-m
tmux send-keys -t architect1-opus "echo 'Readonly Access: djhatch-readonly-mount/'" C-m
tmux send-keys -t architect1-opus "echo 'Initializing Claude architect session'" C-m
start_claude_session "architect-opus" "architect1-opus" "architect1-opus" "opus"

echo "Starting architect2-opus session..."
tmux new-session -d -s architect2-opus -c "$PROJECT_ROOT"
tmux send-keys -t architect2-opus "clear" C-m
tmux send-keys -t architect2-opus "echo '=== ARCHITECT2 OPUS SESSION ==='" C-m
tmux send-keys -t architect2-opus "echo 'Role: State management architecture reviews and ADR creation'" C-m
tmux send-keys -t architect2-opus "echo 'Model: Opus for complex architectural reasoning'" C-m
tmux send-keys -t architect2-opus "echo 'Tools: analysis tools for state management'" C-m
tmux send-keys -t architect2-opus "echo 'Readonly Access: djhatch-readonly-mount/'" C-m
tmux send-keys -t architect2-opus "echo 'Initializing Claude architect session'" C-m
start_claude_session "architect-opus" "architect2-opus" "architect2-opus" "opus"

echo "Starting architect-sonnet session..."
tmux new-session -d -s architect-sonnet -c "$PROJECT_ROOT"
tmux send-keys -t architect-sonnet "clear" C-m
tmux send-keys -t architect-sonnet "echo '=== ARCHITECT SONNET SESSION ==='" C-m
tmux send-keys -t architect-sonnet "echo 'Role: State management architecture reviews and ADR creation'" C-m
tmux send-keys -t architect-sonnet "echo 'Model: Sonnet for routine architectural guidance'" C-m
tmux send-keys -t architect-sonnet "echo 'Tools: analysis tools for state management'" C-m
tmux send-keys -t architect-sonnet "echo 'Readonly Access: djhatch-readonly-mount/'" C-m
tmux send-keys -t architect-sonnet "echo 'Initializing Claude architect session'" C-m
start_claude_session "architect-opus" "architect-sonnet" "architect-sonnet" "sonnet"

# Start featplanner sessions
echo "Starting featplanner-opus session..."
tmux new-session -d -s featplanner-opus -c "$PROJECT_ROOT"
tmux send-keys -t featplanner-opus "clear" C-m
tmux send-keys -t featplanner-opus "echo '=== FEATPLANNER OPUS SESSION ==='" C-m
tmux send-keys -t featplanner-opus "echo 'Role: Create FeatSpecs and TaskSpecs with acceptance criteria'" C-m
tmux send-keys -t featplanner-opus "echo 'Model: Opus for complex feature planning'" C-m
tmux send-keys -t featplanner-opus "echo 'Tools: task featspec-new, task taskspec-new, task featspec-list'" C-m
tmux send-keys -t featplanner-opus "echo 'Readonly Access: djhatch-readonly-mount/'" C-m
tmux send-keys -t featplanner-opus "echo 'Initializing Claude featplanner session'" C-m
start_claude_session "featplanner" "featplanner-opus" "featplanner-opus" "opus"

echo "Starting featplanner-sonnet session..."
tmux new-session -d -s featplanner-sonnet -c "$PROJECT_ROOT"
tmux send-keys -t featplanner-sonnet "clear" C-m
tmux send-keys -t featplanner-sonnet "echo '=== FEATPLANNER SONNET SESSION ==='" C-m
tmux send-keys -t featplanner-sonnet "echo 'Role: Create FeatSpecs and TaskSpecs with acceptance criteria'" C-m
tmux send-keys -t featplanner-sonnet "echo 'Model: Sonnet for routine feature planning'" C-m
tmux send-keys -t featplanner-sonnet "echo 'Tools: task featspec-new, task taskspec-new, task featspec-list'" C-m
tmux send-keys -t featplanner-sonnet "echo 'Readonly Access: djhatch-readonly-mount/'" C-m
tmux send-keys -t featplanner-sonnet "echo 'Initializing Claude featplanner session'" C-m
start_claude_session "featplanner" "featplanner-sonnet" "featplanner-sonnet" "sonnet"

# List all sessions
echo ""
echo "✅ djhatch-state Management Agents ready!"
echo ""
echo "Active sessions:"
tmux list-sessions

echo ""
echo "Quick attach commands:"
echo " tmux a -t architect1-opus    # Primary architect with opus model"
echo " tmux a -t architect2-opus    # Secondary architect with opus model"
echo " tmux a -t architect-sonnet   # Architect with sonnet model"
echo " tmux a -t featplanner-opus   # Feature planner with opus model"
echo " tmux a -t featplanner-sonnet # Feature planner with sonnet model"
echo " tmux a -t state-dashboard    # State management monitoring"
echo ""
echo "State management commands:"
echo " task featspec-new            # Create new feature specification"
echo " task taskspec-new            # Create new task specification"
echo " task featspec-list           # List all feature specifications"
echo " task taskspec-list           # List all task specifications"
echo " task mount-status            # Check readonly mount status"
echo ""
echo "Or use the existing agent launcher:"
echo " ./_scripts/asuperherohasemerged.sh architect  # Launch single architect"
echo " ./_scripts/asuperherohasemerged.sh planner    # Launch single planner"
echo ""