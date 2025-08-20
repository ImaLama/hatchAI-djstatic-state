#!/bin/bash
# tmux_session_monitor.sh - Monitor tmux sessions and clean up orphaned agent states
# PURPOSE_HASH: TMUX-SESSION-STATE-CLEANUP-MONITOR

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/lama/projects"
STATE_MANAGER="$(dirname "$0")/agent_state_manager.sh"
MONITOR_INTERVAL=${TMUX_MONITOR_INTERVAL:-60}  # Default 60 seconds
STATUSBAR_INTERVAL=${TMUX_STATUSBAR_INTERVAL:-5}  # Default 5 seconds for statusbar updates
HEALTH_FAST_INTERVAL=${TMUX_HEALTH_FAST_INTERVAL:-30}  # Default 30 seconds for fast health checks
HEALTH_MODERATE_INTERVAL=${TMUX_HEALTH_MODERATE_INTERVAL:-120}  # Default 2 minutes for moderate checks
MONITOR_LOG_DIR="$PROJECT_ROOT/djhatch-state/_logs/tmux-monitor"
MONITOR_LOG_FILE="$MONITOR_LOG_DIR/$(date '+%Y-%m-%d').log"
STATE_FILE="$PROJECT_ROOT/djhatch-state/_featstate/agent_states.json"

mkdir -p "$MONITOR_LOG_DIR"

# Logging
log_monitor() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $*" >> "$MONITOR_LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | ERROR: $*" >> "$MONITOR_LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

show_help() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
  start [interval]    Start monitoring service (default interval: 60s)
  start-with-statusbar [cleanup_interval] [statusbar_interval]  Start with statusbar updates
  start-with-health [cleanup] [statusbar] [health_fast] [health_moderate]  Start with health monitoring
  once               Run cleanup once and exit
  statusbar-once     Update statusbar once and exit
  health-check       Run health check on all sessions once and exit
  status             Check if monitoring service is running
  stop               Stop monitoring service
  help               Show this help

Examples:
  $0 start                      # Start cleanup only with default 60s interval
  $0 start-with-statusbar       # Start with cleanup (60s) and statusbar (5s)
  $0 start-with-health          # Start with cleanup, statusbar, and health monitoring
  $0 start-with-health 60 5 30 120  # Custom intervals: cleanup(60s), statusbar(5s), health_fast(30s), health_moderate(120s)
  $0 health-check               # Check health of all sessions once
  $0 statusbar-once             # Update statusbar once
  $0 once                       # Run cleanup once
  $0 stop                       # Stop the service
EOF
}

# Get list of active tmux sessions
get_active_tmux_sessions() {
    tmux list-sessions -F '#{session_name}' 2>/dev/null || echo ""
}

# Get list of sessions from agent state file
get_state_sessions() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo ""
        return
    fi
    
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json, sys
try:
    with open('$STATE_FILE', 'r') as f:
        data = json.load(f)
    sessions = data.get('sessions', {})
    for session_id in sessions.keys():
        print(session_id)
except:
    pass
" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Get agent emoji based on session name/type
get_agent_emoji() {
    local session="$1"
    case "$session" in
        architect*) echo "🏗️" ;;
        planner*) echo "📋" ;;
        factory*) echo "🏭" ;;
        qa*) echo "🔍" ;;
        weaver*) echo "🕸️" ;;
        security*) echo "🛡️" ;;
        darkwingduck*) echo "🦆" ;;
        *) echo "🤖" ;;
    esac
}

# Get state emoji based on agent state
get_state_emoji() {
    local state="$1"
    case "$state" in
        "idle") echo "⚪" ;;
        "busy") echo "🔵" ;;
        "done") echo "🟢" ;;
        "stopped") echo "🛑" ;;
        "unknown") echo "❓" ;;
        *) echo "❌" ;;
    esac
}

# Generate display name from session name
get_display_name() {
    local session="$1"
    
    # Try to extract display name from session name pattern
    # Pattern 1: agent-type-TASK-ID (e.g., factory-TC-001)
    if [[ "$session" =~ ^([a-z]+)-([A-Z]+-[0-9]+)$ ]]; then
        local agent_type="${BASH_REMATCH[1]}"
        local task_id="${BASH_REMATCH[2]}"
        
        # Convert agent type to abbreviated format
        case "$agent_type" in
            "architect") echo "AR-S-${task_id}" ;;
            "planner") echo "PL-S-${task_id}" ;;
            "factory") echo "FA-S-${task_id}" ;;
            "qa") echo "QA-S-${task_id}" ;;
            "weaver") echo "WV-S-${task_id}" ;;
            "security") echo "SC-S-${task_id}" ;;
            "darkwingduck") echo "DD-S-${task_id}" ;;
            *) echo "$session" ;;
        esac
    # Pattern 2: agent-type-simple (e.g., architect-alpha, qa-beta)  
    elif [[ "$session" =~ ^([a-z]+)-([a-zA-Z0-9]+)$ ]]; then
        local agent_type="${BASH_REMATCH[1]}"
        local suffix="${BASH_REMATCH[2]}"
        
        # Convert agent type to abbreviated format with suffix
        case "$agent_type" in
            "architect") echo "AR-${suffix}" ;;
            "planner") echo "PL-${suffix}" ;;
            "factory") echo "FA-${suffix}" ;;
            "qa") echo "QA-${suffix}" ;;
            "weaver") echo "WV-${suffix}" ;;
            "security") echo "SC-${suffix}" ;;
            "darkwingduck") echo "DD-${suffix}" ;;
            *) echo "$session" ;;
        esac
    else
        # Fallback to session name (for non-matching patterns)
        echo "$session"
    fi
}

# Get all agent sessions and generate statusbar content
generate_statusbar_content() {
    local output=""
    
    # First, get sessions from JSON state file (if available)
    if [[ -f "$STATE_FILE" ]]; then
        # Read sessions from JSON and match with active tmux sessions
        local json_sessions=""
        
        if command -v jq >/dev/null 2>&1; then
            json_sessions=$(jq -r '.sessions | keys[]' "$STATE_FILE" 2>/dev/null || echo "")
        elif command -v python3 >/dev/null 2>&1; then
            json_sessions=$(python3 -c "
import json
try:
    with open('$STATE_FILE', 'r') as f:
        data = json.load(f)
    sessions = data.get('sessions', {})
    for session_id in sessions.keys():
        print(session_id)
except:
    pass
" 2>/dev/null || echo "")
        fi
        
        while IFS= read -r session; do
            [[ -z "$session" ]] && continue
            
            # Check if session is still active in tmux and matches agent pattern
            if tmux has-session -t "$session" 2>/dev/null && [[ "$session" =~ ^(architect|planner|factory|qa|weaver|security|darkwingduck)- ]]; then
                local state="unknown"
                
                if command -v jq >/dev/null 2>&1; then
                    state=$(jq -r --arg session "$session" '.sessions[$session] // "unknown"' "$STATE_FILE" 2>/dev/null || echo "unknown")
                    # Handle object format (with state field)
                    if [[ "$state" == "null" ]] || [[ "$state" =~ ^\{.*\}$ ]]; then
                        state=$(jq -r --arg session "$session" '.sessions[$session].state // "unknown"' "$STATE_FILE" 2>/dev/null || echo "unknown")
                    fi
                elif command -v python3 >/dev/null 2>&1; then
                    state=$(python3 -c "
import json
try:
    with open('$STATE_FILE', 'r') as f:
        data = json.load(f)
    session_data = data.get('sessions', {}).get('$session', 'unknown')
    if isinstance(session_data, dict):
        print(session_data.get('state', 'unknown'))
    else:
        print(session_data)
except:
    print('unknown')
" 2>/dev/null || echo "unknown")
                fi
                
                local agent_emoji=$(get_agent_emoji "$session")
                local state_emoji=$(get_state_emoji "$state")
                local display_name=$(get_display_name "$session")
                
                output+="${agent_emoji}${state_emoji}${display_name} "
            fi
        done <<< "$json_sessions"
    fi
    
    # Also check for any active tmux sessions not yet in JSON state
    local active_sessions
    active_sessions=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -E '^(architect|planner|factory|qa|weaver|security|darkwingduck)-' || echo "")
    
    while IFS= read -r session; do
        [[ -z "$session" ]] && continue
        
        # Check if this session is already in our output
        if [[ "$output" != *"$(get_display_name "$session")"* ]]; then
            # This session is not in JSON state yet, use unknown state
            local agent_emoji=$(get_agent_emoji "$session")
            local state_emoji=$(get_state_emoji "unknown")
            local display_name=$(get_display_name "$session")
            
            output+="${agent_emoji}${state_emoji}${display_name} "
        fi
    done <<< "$active_sessions"
    
    # Trim trailing space and return
    echo "$output" | sed 's/[[:space:]]*$//'
}

# Update tmux statusbar
update_statusbar() {
    log_monitor "STATUSBAR_UPDATE | Updating tmux statusbar"
    
    local statusbar_content
    statusbar_content=$(generate_statusbar_content)
    
    # Trim trailing whitespace
    statusbar_content=$(echo "$statusbar_content" | sed 's/[[:space:]]*$//')
    
    if [[ -n "$statusbar_content" ]]; then
        log_monitor "STATUSBAR_CONTENT | $statusbar_content"
        # Update tmux status-left for all sessions (real-time agent data)
        tmux set-option -g status-left "$statusbar_content #[default]" 2>/dev/null || {
            log_error "Failed to update tmux statusbar"
            return 1
        }
    else
        log_monitor "STATUSBAR_CONTENT | No agents"
        tmux set-option -g status-left "No agents #[default]" 2>/dev/null || {
            log_error "Failed to set tmux statusbar to 'No agents'"
            return 1
        }
    fi
    
    log_monitor "STATUSBAR_SUCCESS | Updated tmux statusbar successfully"
    return 0
}

# Watch agent states file for changes using inotify
watch_agent_states() {
    local statusbar_interval=${1:-$STATUSBAR_INTERVAL}
    
    log_monitor "STATUSBAR_WATCH | Starting agent states file watcher (${statusbar_interval}s interval)"
    
    # Check if inotify-tools is available
    if ! command -v inotifywait >/dev/null 2>&1; then
        log_monitor "STATUSBAR_FALLBACK | inotify-tools not available, using polling method"
        # Fallback to polling method
        while true; do
            update_statusbar
            sleep "$statusbar_interval"
        done
        return
    fi
    
    # Initial statusbar update
    update_statusbar
    
    # Watch for file changes using inotify
    while inotifywait -e modify "$STATE_FILE" >/dev/null 2>&1; do
        log_monitor "STATUSBAR_TRIGGER | Agent states file changed, updating statusbar"
        update_statusbar
        # Brief pause to avoid rapid updates
        sleep 1
    done &
    
    # Also run periodic updates as backup
    while true; do
        sleep "$statusbar_interval"
        update_statusbar
    done
}

# Session health monitoring functions

# Tier 1: Fast health checks (tmux pane status, process existence)
check_session_health_fast() {
    local session="$1"
    local health="healthy"
    local issues=()
    
    # Check if tmux session exists
    if ! tmux has-session -t "$session" 2>/dev/null; then
        echo "dead:session_not_found"
        return
    fi
    
    # Check if pane is dead
    local pane_dead
    pane_dead=$(tmux display -t "$session" -p "#{pane_dead}" 2>/dev/null || echo "1")
    if [[ "$pane_dead" == "1" ]]; then
        health="dead"
        issues+=("pane_dead")
    fi
    
    # Check process existence in pane
    local pane_pid
    pane_pid=$(tmux display -t "$session" -p "#{pane_pid}" 2>/dev/null)
    if [[ -n "$pane_pid" ]] && [[ "$pane_pid" != "0" ]]; then
        # Check if main process is running
        if ! kill -0 "$pane_pid" 2>/dev/null; then
            health="dead"
            issues+=("process_dead")
        else
            # Check for Claude process in process tree
            if ! pgrep -P "$pane_pid" claude >/dev/null 2>&1; then
                if [[ "$health" == "healthy" ]]; then
                    health="stalled"
                fi
                issues+=("claude_not_found")
            fi
            
            # Check process state (R=running, S=sleeping, D=uninterruptible, Z=zombie)
            local proc_state
            proc_state=$(ps -o stat= -p "$pane_pid" 2>/dev/null | cut -c1)
            case "$proc_state" in
                "Z")
                    health="dead"
                    issues+=("zombie_process")
                    ;;
                "T"|"t")
                    health="stalled"
                    issues+=("stopped_process")
                    ;;
                "R"|"S"|"D")
                    # Normal states - running, sleeping, uninterruptible sleep
                    ;;
                *)
                    if [[ "$health" == "healthy" ]]; then
                        health="unknown"
                    fi
                    issues+=("unknown_state:$proc_state")
                    ;;
            esac
        fi
    else
        health="dead"
        issues+=("no_pane_pid")
    fi
    
    echo "$health:${issues[*]}"
}

# Tier 2: Moderate health checks (activity analysis)
check_session_health_moderate() {
    local session="$1"
    local health="$2"  # Result from fast check
    local issues=("$3") # Existing issues
    
    # Skip if already dead
    if [[ "$health" == "dead" ]]; then
        echo "$health:$3"
        return
    fi
    
    # Check last activity timestamp
    local last_activity
    last_activity=$(tmux display -t "$session" -p "#{pane_activity}" 2>/dev/null || echo "0")
    local current_time=$(date +%s)
    local idle_time=$((current_time - last_activity))
    
    # Define thresholds
    local STALE_THRESHOLD=600  # 10 minutes
    local DEAD_THRESHOLD=1800  # 30 minutes
    
    if [[ $idle_time -gt $DEAD_THRESHOLD ]]; then
        health="stalled"
        issues+=("no_activity_${idle_time}s")
    elif [[ $idle_time -gt $STALE_THRESHOLD ]]; then
        if [[ "$health" == "healthy" ]]; then
            health="idle_long"
        fi
        issues+=("idle_${idle_time}s")
    fi
    
    echo "$health:${issues[*]}"
}

# Main session health checker
check_session_health() {
    local session="$1"
    
    log_monitor "HEALTH_CHECK | Checking health for session: $session"
    
    # Tier 1: Fast checks
    local fast_result
    fast_result=$(check_session_health_fast "$session")
    
    local health=${fast_result%%:*}
    local issues=${fast_result#*:}
    
    # Tier 2: Moderate checks (only if not dead)
    if [[ "$health" != "dead" ]]; then
        local moderate_result
        moderate_result=$(check_session_health_moderate "$session" "$health" "$issues")
        health=${moderate_result%%:*}
        issues=${moderate_result#*:}
    fi
    
    log_monitor "HEALTH_RESULT | $session | health:$health | issues:$issues"
    
    echo "$health:$issues"
}

# Update agent state with health information
update_agent_health() {
    local session="$1"
    local health_result="$2"
    
    local health=${health_result%%:*}
    local issues=${health_result#*:}
    
    log_monitor "HEALTH_UPDATE | Updating health for $session: $health"
    
    # Use the existing state manager to update health
    # Note: This adds health info without disrupting existing state management
    if [[ -f "$STATE_MANAGER" ]]; then
        # Call state manager with health update (if supported)
        "$STATE_MANAGER" update-health "$session" "$health" "$issues" 2>/dev/null || {
            log_monitor "HEALTH_FALLBACK | State manager doesn't support health updates yet"
            # For now, just log the health status - user can investigate
        }
    else
        log_monitor "HEALTH_NO_MANAGER | State manager not found, health info logged only"
    fi
}

# Run health checks on all active agent sessions
run_health_checks() {
    log_monitor "HEALTH_SCAN | Starting health checks for all active sessions"
    
    local health_count=0
    local issue_count=0
    
    # Get active agent sessions from state file
    local active_sessions
    active_sessions=$(get_state_sessions)
    
    while IFS= read -r session; do
        [[ -z "$session" ]] && continue
        
        # Only check agent sessions (skip test sessions)
        if [[ "$session" =~ ^(architect|planner|factory|qa|weaver|security|darkwingduck)- ]]; then
            local health_result
            health_result=$(check_session_health "$session")
            
            local health=${health_result%%:*}
            
            # Update health information
            update_agent_health "$session" "$health_result"
            
            ((health_count++))
            
            # Count issues for summary
            if [[ "$health" != "healthy" ]]; then
                ((issue_count++))
            fi
        fi
    done <<< "$active_sessions"
    
    log_monitor "HEALTH_COMPLETE | Checked $health_count sessions, found $issue_count with issues"
}

# Background health monitoring service
run_health_monitoring() {
    local fast_check_interval=${1:-30}    # Tier 1: every 30s
    local moderate_check_interval=${2:-120} # Tier 2: every 2 minutes
    
    log_monitor "HEALTH_SERVICE | Starting health monitoring (fast:${fast_check_interval}s, moderate:${moderate_check_interval}s)"
    
    local last_moderate_check=0
    
    while true; do
        local current_time=$(date +%s)
        
        # Always run fast checks
        run_health_checks
        
        # Run moderate checks based on interval
        if [[ $((current_time - last_moderate_check)) -ge $moderate_check_interval ]]; then
            log_monitor "HEALTH_MODERATE | Running moderate health checks"
            # Moderate checks are integrated into run_health_checks
            last_moderate_check=$current_time
        fi
        
        sleep "$fast_check_interval"
    done
}

# Perform cleanup of orphaned sessions
cleanup_orphaned_sessions() {
    log_monitor "CLEANUP_START | Starting tmux session cleanup"
    
    local active_tmux_sessions
    local state_sessions
    local removed_count=0
    
    # Get current active tmux sessions
    active_tmux_sessions=$(get_active_tmux_sessions)
    log_monitor "ACTIVE_TMUX | Found sessions: $(echo "$active_tmux_sessions" | wc -w)"
    
    # Get sessions from state file
    state_sessions=$(get_state_sessions)
    log_monitor "STATE_SESSIONS | Found sessions: $(echo "$state_sessions" | wc -w)"
    
    # Check each state session against active tmux sessions
    while IFS= read -r session_id; do
        [[ -z "$session_id" ]] && continue
        
        # Skip non-tmux session patterns (like test sessions)
        if [[ "$session_id" =~ ^(test-|manual-|unknown) ]]; then
            log_monitor "SKIP_SESSION | $session_id | Non-tmux pattern"
            continue
        fi
        
        # Check if session is still active in tmux
        if ! echo "$active_tmux_sessions" | grep -q "^${session_id}$"; then
            log_monitor "ORPHANED_SESSION | $session_id | Removing from state"
            
            # Remove from state using cleanup command
            if "$STATE_MANAGER" cleanup 2>/dev/null; then
                log_monitor "CLEANUP_SUCCESS | $session_id | Removed via state manager cleanup"
                ((removed_count++))
            else
                log_error "CLEANUP_FAILED | $session_id | State manager cleanup failed"
            fi
        else
            log_monitor "ACTIVE_SESSION | $session_id | Still active in tmux"
        fi
    done <<< "$state_sessions"
    
    log_monitor "CLEANUP_COMPLETE | Processed sessions, removed: $removed_count"
    
    if [[ $removed_count -gt 0 ]]; then
        echo "✅ Cleaned up $removed_count orphaned sessions"
    else
        echo "✅ No orphaned sessions found"
    fi
}

# Start monitoring service (cleanup only)
start_monitoring() {
    local interval=${1:-$MONITOR_INTERVAL}
    local pid_file="/tmp/tmux_session_monitor.pid"
    local SCRIPT_DIR="$(dirname "$0")"
    
    # Check if already running
    if [[ -f "$pid_file" ]]; then
        local existing_pid
        existing_pid=$(cat "$pid_file")
        if kill -0 "$existing_pid" 2>/dev/null; then
            echo "❌ Monitoring service already running (PID: $existing_pid)"
            exit 1
        else
            rm -f "$pid_file"
        fi
    fi
    
    echo "🔍 Starting tmux session monitoring service (cleanup interval: ${interval}s)"
    log_monitor "SERVICE_START | Monitoring started with ${interval}s interval"
    
    # Start monitoring daemon using bash -c for better control
    bash -c "
        echo \$\$ > '$pid_file'
        while true; do
            '$SCRIPT_DIR/tmux_session_monitor.sh' once >/dev/null 2>&1 || true
            sleep $interval
        done
    " &
    
    background_pid=$!
    disown  # Detach from parent shell
    
    # Wait a moment to ensure background process starts and writes PID
    sleep 2
    
    # Check if PID file was created and process is running
    if [[ -f "$pid_file" ]]; then
        local actual_pid
        actual_pid=$(cat "$pid_file")
        if kill -0 "$actual_pid" 2>/dev/null; then
            echo "✅ Monitoring service started (PID: $actual_pid)"
            log_monitor "SERVICE_RUNNING | Background monitoring active | PID:$actual_pid"
        else
            echo "❌ Failed to start monitoring service - process not running"
            log_error "SERVICE_FAILED | Process not running after start"
            rm -f "$pid_file"
            exit 1
        fi
    else
        echo "❌ Failed to start monitoring service - no PID file created"
        log_error "SERVICE_FAILED | No PID file created"
        exit 1
    fi
}

# Start comprehensive monitoring service (cleanup + statusbar + health)
start_monitoring_with_health() {
    local cleanup_interval=${1:-$MONITOR_INTERVAL}
    local statusbar_interval=${2:-$STATUSBAR_INTERVAL}
    local health_fast_interval=${3:-$HEALTH_FAST_INTERVAL}
    local health_moderate_interval=${4:-$HEALTH_MODERATE_INTERVAL}
    local pid_file="/tmp/tmux_session_monitor.pid"
    local statusbar_pid_file="/tmp/tmux_session_monitor_statusbar.pid"
    local health_pid_file="/tmp/tmux_session_monitor_health.pid"
    local SCRIPT_DIR="$(dirname "$0")"
    
    # Check if already running
    for pf in "$pid_file" "$statusbar_pid_file" "$health_pid_file"; do
        if [[ -f "$pf" ]]; then
            local existing_pid
            existing_pid=$(cat "$pf")
            if kill -0 "$existing_pid" 2>/dev/null; then
                echo "❌ Monitoring service already running (PID: $existing_pid in ${pf##*/})"
                exit 1
            else
                rm -f "$pf"
            fi
        fi
    done
    
    echo "🔍 Starting comprehensive tmux monitoring service"
    echo "📊 Intervals: cleanup(${cleanup_interval}s), statusbar(${statusbar_interval}s), health(${health_fast_interval}s/${health_moderate_interval}s)"
    log_monitor "SERVICE_START | Comprehensive monitoring | Cleanup:${cleanup_interval}s | Statusbar:${statusbar_interval}s | Health:${health_fast_interval}s/${health_moderate_interval}s"
    
    # Start cleanup monitoring daemon
    bash -c "
        echo \$\$ > '$pid_file'
        while true; do
            '$SCRIPT_DIR/tmux_session_monitor.sh' once >/dev/null 2>&1 || true
            sleep $cleanup_interval
        done
    " &
    
    # Start statusbar monitoring daemon
    bash -c "
        echo \$\$ > '$statusbar_pid_file'
        '$SCRIPT_DIR/tmux_session_monitor.sh' watch-states $statusbar_interval
    " &
    
    # Start health monitoring daemon
    bash -c "
        echo \$\$ > '$health_pid_file'
        '$SCRIPT_DIR/tmux_session_monitor.sh' health-monitor $health_fast_interval $health_moderate_interval
    " &
    
    # Wait for all processes to start
    sleep 3
    
    # Check all services
    local services_running=0
    local services_total=3
    
    for service_info in "cleanup:$pid_file" "statusbar:$statusbar_pid_file" "health:$health_pid_file"; do
        local service_name=${service_info%%:*}
        local service_pid_file=${service_info#*:}
        
        if [[ -f "$service_pid_file" ]]; then
            local actual_pid
            actual_pid=$(cat "$service_pid_file")
            if kill -0 "$actual_pid" 2>/dev/null; then
                echo "✅ ${service_name^} monitoring started (PID: $actual_pid)"
                log_monitor "SERVICE_RUNNING | ${service_name^} monitoring active | PID:$actual_pid"
                ((services_running++))
            fi
        fi
    done
    
    if [[ $services_running -eq $services_total ]]; then
        echo "✅ All monitoring services started successfully ($services_running/$services_total)"
        log_monitor "SERVICE_SUCCESS | All monitoring services running"
    else
        echo "❌ Failed to start all monitoring services ($services_running/$services_total)"
        log_error "SERVICE_FAILED | Only $services_running of $services_total services started"
        # Cleanup any running processes
        for pf in "$pid_file" "$statusbar_pid_file" "$health_pid_file"; do
            [[ -f "$pf" ]] && { local pid=$(cat "$pf"); kill "$pid" 2>/dev/null || true; rm -f "$pf"; }
        done
        exit 1
    fi
}

# Start unified monitoring service (cleanup + statusbar)
start_monitoring_with_statusbar() {
    local cleanup_interval=${1:-$MONITOR_INTERVAL}
    local statusbar_interval=${2:-$STATUSBAR_INTERVAL}
    local pid_file="/tmp/tmux_session_monitor.pid"
    local statusbar_pid_file="/tmp/tmux_session_monitor_statusbar.pid"
    local SCRIPT_DIR="$(dirname "$0")"
    
    # Check if already running
    if [[ -f "$pid_file" ]] || [[ -f "$statusbar_pid_file" ]]; then
        local existing_pid existing_statusbar_pid
        if [[ -f "$pid_file" ]]; then
            existing_pid=$(cat "$pid_file")
            if kill -0 "$existing_pid" 2>/dev/null; then
                echo "❌ Cleanup monitoring service already running (PID: $existing_pid)"
                exit 1
            else
                rm -f "$pid_file"
            fi
        fi
        if [[ -f "$statusbar_pid_file" ]]; then
            existing_statusbar_pid=$(cat "$statusbar_pid_file")
            if kill -0 "$existing_statusbar_pid" 2>/dev/null; then
                echo "❌ Statusbar monitoring service already running (PID: $existing_statusbar_pid)"
                exit 1
            else
                rm -f "$statusbar_pid_file"
            fi
        fi
    fi
    
    echo "🔍 Starting unified tmux monitoring service (cleanup: ${cleanup_interval}s, statusbar: ${statusbar_interval}s)"
    log_monitor "SERVICE_START | Unified monitoring started | Cleanup:${cleanup_interval}s | Statusbar:${statusbar_interval}s"
    
    # Start cleanup monitoring daemon
    bash -c "
        echo \$\$ > '$pid_file'
        while true; do
            '$SCRIPT_DIR/tmux_session_monitor.sh' once >/dev/null 2>&1 || true
            sleep $cleanup_interval
        done
    " &
    
    cleanup_pid=$!
    disown  # Detach from parent shell
    
    # Start statusbar monitoring daemon
    bash -c "
        echo \$\$ > '$statusbar_pid_file'
        '$SCRIPT_DIR/tmux_session_monitor.sh' watch-states $statusbar_interval
    " &
    
    statusbar_pid=$!
    disown  # Detach from parent shell
    
    # Wait a moment to ensure background processes start and write PID files
    sleep 2
    
    # Check if both PID files were created and processes are running
    local cleanup_running=false
    local statusbar_running=false
    
    if [[ -f "$pid_file" ]]; then
        local actual_cleanup_pid
        actual_cleanup_pid=$(cat "$pid_file")
        if kill -0 "$actual_cleanup_pid" 2>/dev/null; then
            cleanup_running=true
            echo "✅ Cleanup monitoring started (PID: $actual_cleanup_pid)"
            log_monitor "SERVICE_RUNNING | Cleanup monitoring active | PID:$actual_cleanup_pid"
        fi
    fi
    
    if [[ -f "$statusbar_pid_file" ]]; then
        local actual_statusbar_pid
        actual_statusbar_pid=$(cat "$statusbar_pid_file")
        if kill -0 "$actual_statusbar_pid" 2>/dev/null; then
            statusbar_running=true
            echo "✅ Statusbar monitoring started (PID: $actual_statusbar_pid)"
            log_monitor "SERVICE_RUNNING | Statusbar monitoring active | PID:$actual_statusbar_pid"
        fi
    fi
    
    if [[ "$cleanup_running" == true ]] && [[ "$statusbar_running" == true ]]; then
        echo "✅ Unified monitoring service started successfully"
        log_monitor "SERVICE_SUCCESS | Both cleanup and statusbar services running"
    else
        echo "❌ Failed to start unified monitoring service"
        log_error "SERVICE_FAILED | One or both services failed to start"
        # Cleanup any running processes
        [[ -f "$pid_file" ]] && { local pid=$(cat "$pid_file"); kill "$pid" 2>/dev/null || true; rm -f "$pid_file"; }
        [[ -f "$statusbar_pid_file" ]] && { local pid=$(cat "$statusbar_pid_file"); kill "$pid" 2>/dev/null || true; rm -f "$statusbar_pid_file"; }
        exit 1
    fi
}

# Stop monitoring service
stop_monitoring() {
    local pid_file="/tmp/tmux_session_monitor.pid"
    local statusbar_pid_file="/tmp/tmux_session_monitor_statusbar.pid"
    local health_pid_file="/tmp/tmux_session_monitor_health.pid"
    local stopped_count=0
    local failed_count=0
    
    # Stop cleanup service
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        
        if kill "$pid" 2>/dev/null; then
            rm -f "$pid_file"
            echo "✅ Cleanup monitoring service stopped (PID: $pid)"
            log_monitor "SERVICE_STOP | Cleanup monitoring service stopped | PID:$pid"
            ((stopped_count++))
        else
            echo "❌ Failed to stop cleanup monitoring service (PID: $pid may not be running)"
            rm -f "$pid_file"
            ((failed_count++))
        fi
    fi
    
    # Stop statusbar service
    if [[ -f "$statusbar_pid_file" ]]; then
        local statusbar_pid
        statusbar_pid=$(cat "$statusbar_pid_file")
        
        if kill "$statusbar_pid" 2>/dev/null; then
            rm -f "$statusbar_pid_file"
            echo "✅ Statusbar monitoring service stopped (PID: $statusbar_pid)"
            log_monitor "SERVICE_STOP | Statusbar monitoring service stopped | PID:$statusbar_pid"
            ((stopped_count++))
        else
            echo "❌ Failed to stop statusbar monitoring service (PID: $statusbar_pid may not be running)"
            rm -f "$statusbar_pid_file"
            ((failed_count++))
        fi
    fi
    
    # Stop health monitoring service
    if [[ -f "$health_pid_file" ]]; then
        local health_pid
        health_pid=$(cat "$health_pid_file")
        
        if kill "$health_pid" 2>/dev/null; then
            rm -f "$health_pid_file"
            echo "✅ Health monitoring service stopped (PID: $health_pid)"
            log_monitor "SERVICE_STOP | Health monitoring service stopped | PID:$health_pid"
            ((stopped_count++))
        else
            echo "❌ Failed to stop health monitoring service (PID: $health_pid may not be running)"
            rm -f "$health_pid_file"
            ((failed_count++))
        fi
    fi
    
    if [[ $stopped_count -eq 0 ]] && [[ $failed_count -eq 0 ]]; then
        echo "❌ No monitoring services were running"
        exit 1
    elif [[ $stopped_count -gt 0 ]] && [[ $failed_count -eq 0 ]]; then
        echo "✅ All monitoring services stopped successfully"
    elif [[ $failed_count -gt 0 ]]; then
        echo "⚠️ Some monitoring services failed to stop properly"
        exit 1
    fi
}

# Check service status
check_status() {
    local pid_file="/tmp/tmux_session_monitor.pid"
    local statusbar_pid_file="/tmp/tmux_session_monitor_statusbar.pid"
    local health_pid_file="/tmp/tmux_session_monitor_health.pid"
    local cleanup_running=false
    local statusbar_running=false
    local health_running=false
    
    # Check cleanup service
    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ Cleanup monitoring service is running (PID: $pid)"
            cleanup_running=true
        else
            echo "❌ Cleanup PID file exists but process not running (cleaning up)"
            rm -f "$pid_file"
        fi
    fi
    
    # Check statusbar service
    if [[ -f "$statusbar_pid_file" ]]; then
        local statusbar_pid
        statusbar_pid=$(cat "$statusbar_pid_file")
        if kill -0 "$statusbar_pid" 2>/dev/null; then
            echo "✅ Statusbar monitoring service is running (PID: $statusbar_pid)"
            statusbar_running=true
        else
            echo "❌ Statusbar PID file exists but process not running (cleaning up)"
            rm -f "$statusbar_pid_file"
        fi
    fi
    
    # Check health monitoring service
    if [[ -f "$health_pid_file" ]]; then
        local health_pid
        health_pid=$(cat "$health_pid_file")
        if kill -0 "$health_pid" 2>/dev/null; then
            echo "✅ Health monitoring service is running (PID: $health_pid)"
            health_running=true
        else
            echo "❌ Health PID file exists but process not running (cleaning up)"
            rm -f "$health_pid_file"
        fi
    fi
    
    if [[ "$cleanup_running" == false ]] && [[ "$statusbar_running" == false ]] && [[ "$health_running" == false ]]; then
        echo "❌ No monitoring services are running"
        return 1
    else
        return 0
    fi
}

# Run statusbar update once
update_statusbar_once() {
    echo "🔄 Running one-time statusbar update..."
    if update_statusbar; then
        echo "✅ Statusbar updated successfully"
    else
        echo "❌ Failed to update statusbar"
        exit 1
    fi
}

# Internal function to run watch_agent_states (called by daemon)
run_watch_states() {
    local statusbar_interval=${1:-$STATUSBAR_INTERVAL}
    watch_agent_states "$statusbar_interval"
}

# Main command processing
case "${1:-}" in
    "start")
        start_monitoring "${2:-$MONITOR_INTERVAL}"
        ;;
    "start-with-statusbar")
        start_monitoring_with_statusbar "${2:-$MONITOR_INTERVAL}" "${3:-$STATUSBAR_INTERVAL}"
        ;;
    "start-with-health")
        start_monitoring_with_health "${2:-$MONITOR_INTERVAL}" "${3:-$STATUSBAR_INTERVAL}" "${4:-$HEALTH_FAST_INTERVAL}" "${5:-$HEALTH_MODERATE_INTERVAL}"
        ;;
    "once")
        echo "🔍 Running one-time cleanup..."
        cleanup_orphaned_sessions
        ;;
    "statusbar-once")
        update_statusbar_once
        ;;
    "health-check")
        echo "🌡️ Running one-time health check..."
        run_health_checks
        echo "✅ Health check completed"
        ;;
    "health-monitor")
        # Internal command used by health monitoring daemon
        run_health_monitoring "${2:-$HEALTH_FAST_INTERVAL}" "${3:-$HEALTH_MODERATE_INTERVAL}"
        ;;
    "watch-states")
        # Internal command used by statusbar daemon
        run_watch_states "${2:-$STATUSBAR_INTERVAL}"
        ;;
    "status")
        check_status
        ;;
    "stop")
        stop_monitoring
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo "❌ Error: unknown command '$1'"
        echo ""
        show_help
        exit 1
        ;;
esac