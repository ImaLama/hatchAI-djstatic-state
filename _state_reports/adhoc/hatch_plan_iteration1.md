# Hatchery Implementation Plan - Iteration 1: team_orchestrator
**Date**: 2025-08-11  
**Type**: Implementation Plan  
**Focus**: First functional static agent with state machine orchestration

## Executive Summary

This plan outlines the implementation of `team_orchestrator`, the first static agent in the Hatchery framework. The team_orchestrator orchestrates AI agents (Claude Code sessions) through their lifecycle, managing spawning, monitoring, handoffs, and state transitions via a robust state machine pattern.

## Core Architecture

### 1. team_orchestrator Responsibilities

**Primary Functions:**
- Spawn AI agents (factory_senior, factory_junior, team_qa, team_planner) in tmux sessions
- Monitor agent lifecycle via Claude hooks (start, stop, tool use)
- Manage state transitions through defined workflows
- Coordinate handoffs between agents
- Ensure proper summarization before agent termination
- Handle failure recovery and retry logic

**Key Design Principles:**
- Single team ownership (one team_orchestrator per team)
- Event-driven architecture (hooks trigger state changes)
- Fail-safe handoff mechanisms
- Audit trail for all state transitions

### 2. AI Agent Types

| Label | Component Name | Model | Role | Spawned By | Hands Off To |
|-------|----------------|-------|------|--------------|--------------|
| **duck_supreme** | `factory_senior` | Opus | Senior implementation for complex TaskSpecs | team_orchestrator | team_qa |
| **duckling** | `factory_junior` | Sonnet | Junior implementation for simple TaskSpecs | team_orchestrator | team_qa |
| **sentinel** | `team_qa` | Sonnet | QA validation and testing | team_orchestrator | Complete/factory_senior |
| **pivot_pilot** | `team_planner` | Sonnet | Team-level planning and coordination | team_orchestrator | factory_senior/factory_junior |

### 3. State Machine Design

```yaml
# /hatchery/config/workflows/team_workflow.yaml
workflow:
  name: taskspec_implementation
  version: "1.0"
  
  states:
    # Initial States
    unassigned:
      description: "TaskSpec waiting for agent assignment"
      next: [assigned]
      timeout: 5m
      on_timeout: escalate
      
    assigned:
      description: "Agent spawned, awaiting start"
      next: [implementing, planning, blocked]
      timeout: 5m
      on_timeout: respawn
      
    # Active States  
    planning:
      description: "Shepherd breaking down requirements"
      next: [ready_for_implementation, blocked]
      timeout: 15m
      on_timeout: escalate
      
    implementing:
      description: "factory_senior/factory_junior writing code"
      next: [testing_locally, blocked, failed]
      timeout: 45m
      on_timeout: check_progress
      
    testing_locally:
      description: "Agent running tests"
      next: [ready_for_qa, implementing, failed]
      timeout: 15m
      
    ready_for_qa:
      description: "Implementation complete, awaiting QA"
      next: [in_qa]
      timeout: 10m
      on_timeout: auto_handoff
      
    in_qa:
      description: "Sentinel reviewing"
      next: [qa_passed, qa_failed]
      timeout: 30m
      
    # Terminal States
    qa_passed:
      description: "TaskSpec complete"
      terminal: true
      action: mark_taskspec_done
      
    qa_failed:
      description: "Needs rework"
      next: [implementing, planning]
      action: assign_rework
      
    blocked:
      description: "Waiting on external dependency"
      next: [implementing, planning, failed]
      timeout: 2h
      
    failed:
      description: "Unrecoverable error"
      terminal: true
      action: escalate_to_human
      
  transitions:
    - from: unassigned
      to: assigned
      trigger: agent_spawned
      action: log_spawn
      
    - from: assigned
      to: implementing
      trigger: first_file_edit
      condition: "agent_type in [factory_senior, factory_junior]"
      
    - from: assigned
      to: planning
      trigger: first_file_read
      condition: "agent_type == team_planner"
      
    - from: implementing
      to: testing_locally
      trigger: test_command_run
      
    - from: testing_locally
      to: ready_for_qa
      trigger: stop_hook
      condition: "tests_passed && coverage >= 80"
      action: prepare_handoff_summary
      
    - from: ready_for_qa
      to: in_qa
      trigger: sentinel_spawned
      action: handoff_to_sentinel
      
    - from: in_qa
      to: qa_passed
      trigger: stop_hook
      condition: "agent_type == team_qa && qa_approved"
      
    - from: in_qa
      to: qa_failed
      trigger: stop_hook
      condition: "agent_type == team_qa && !qa_approved"
```

### 4. Hook Integration Strategy

```bash
# /hatchery/hooks/team_orchestrator_notifier.sh
#!/bin/bash

# Called by Claude hooks on stop event
handle_stop_hook() {
    local session_id="$CLAUDE_SESSION_ID"
    local agent_type="$CLAUDE_AGENT_TYPE"
    local working_dir="$CLAUDE_WORKING_DIR"
    
    # Extract TaskSpec from session name or working directory
    local taskspec_id=$(extract_taskspec_id "$session_id" "$working_dir")
    
    # Check if handoff summary exists
    local handoff_file="/hatchery/handoffs/${taskspec_id}.json"
    
    if [[ ! -f "$handoff_file" ]]; then
        # Request summary via prompt injection
        request_handoff_summary "$session_id" "$taskspec_id"
        
        # Wait for summary (with timeout)
        wait_for_summary "$handoff_file" 30
    fi
    
    # Notify team_orchestrator of stop event
    notify_team_orchestrator "agent_stopped" "$session_id" "$taskspec_id" "$handoff_file"
}

request_handoff_summary() {
    local session_id="$1"
    local taskspec_id="$2"
    
    # Inject prompt requesting structured summary
    tmux send-keys -t "$session_id" "
Please provide a structured handoff summary:
1. Work completed
2. Tests status
3. Next steps
4. Any blockers
Save to: /hatchery/handoffs/${taskspec_id}.json
" Enter
}
```

### 5. Directory Structure

```
hatchery/
├── bin/
│   └── team_orchestrator       # Main executable
├── config/
│   ├── team_orchestrator.yaml  # Configuration
│   └── workflows/
│       └── team_workflow.yaml   # State machine definition
├── rules/
│   ├── spawn_rules.yaml        # When to spawn which agent
│   ├── handoff_rules.yaml      # Handoff conditions
│   └── retry_rules.yaml        # Retry logic
├── state/
│   ├── teams/
│   │   └── team_001/
│   │       ├── state.json      # Current team state
│   │       └── agents/         # Individual agent states
│   └── events/
│       └── 2025-08-11.jsonl    # Event log
├── handoffs/
│   └── TS-*.json               # Handoff summaries
├── scripts/
│   ├── spawn_agent.sh          # Agent spawning
│   ├── inject_prompt.sh        # Prompt injection
│   └── check_health.sh         # Health monitoring
└── logs/
    └── team_orchestrator.log   # Service logs
```

### 6. Implementation Components

#### 6.1 team_orchestrator Service (Go)

```go
// /hatchery/cmd/team_orchestrator/main.go
package main

import (
    "github.com/hatchai/hatchery/pkg/statemachine"
    "github.com/hatchai/hatchery/pkg/agents"
    "github.com/hatchai/hatchery/pkg/hooks"
)

type TeamOrchestrator struct {
    ID           string
    TeamID       string
    StateMachine *statemachine.StateMachine
    Agents       map[string]*agents.Agent
    EventBus     *events.Bus
}

func (to *TeamOrchestrator) Run() error {
    // Initialize state machine
    to.StateMachine = statemachine.LoadWorkflow("team_workflow.yaml")
    
    // Start event listener
    go to.listenForEvents()
    
    // Start health monitor
    go to.monitorAgentHealth()
    
    // Main loop
    for {
        select {
        case event := <-to.EventBus.Events():
            to.handleEvent(event)
        case <-to.shutdown:
            return to.cleanup()
        }
    }
}

func (to *TeamOrchestrator) SpawnAgent(agentType string, taskspec string) (*agents.Agent, error)
    // Determine model based on agent type and complexity
    model := to.selectModel(agentType, taskspec)
    
    // Create session
    session := to.createTmuxSession(agentType, taskspec, model)
    
    // Initialize agent state
    agent := &agents.Agent{
        ID:       generateAgentID(agentType),
        Type:     agentType,
        TaskSpec: taskspec,
        Session:  session,
        State:    "assigned",
    }
    
    // Register agent
    to.Agents[agent.ID] = agent
    
    // Update state machine
    to.StateMachine.Transition(taskspec, "unassigned", "assigned")
    
    return agent, nil
}
```

#### 6.2 Spawn Rules

```yaml
# /hatchery/rules/spawn_rules.yaml
spawn_rules:
  - name: complex_taskspec
    condition:
      taskspec_complexity: high
      loc_cap: ">= 150"
    action:
      spawn: factory_senior
      model: opus
      
  - name: simple_taskspec
    condition:
      taskspec_complexity: low
      loc_cap: "< 100"
    action:
      spawn: factory_junior  # Duckling
      model: sonnet
      
  - name: needs_planning
    condition:
      taskspec_has_subtasks: true
      subtask_count: ">= 3"
    action:
      spawn: team_planner  # Pivot_Pilot
      model: sonnet
      then_spawn: factory_senior  # After planning
      
  - name: ready_for_qa
    condition:
      state: ready_for_qa
      tests_passed: true
    action:
      spawn: team_qa  # Sentinel
      model: sonnet
```

## Risk Analysis & Mitigation

### Identified Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost handoff summaries | High | Fallback to prompt injection + timeout |
| State machine deadlock | High | Timeout on every state + escalation |
| Tmux session crashes | Medium | Health monitoring + auto-respawn |
| Race conditions | Medium | File locks + atomic operations |
| Agent gets stuck | Low | Progress monitoring + timeout |
| Invalid state transitions | Low | State machine validation |

### Error Recovery Patterns

1. **Failed Spawn**: Retry with backoff, escalate after 3 attempts
2. **Missing Handoff**: Request via injection, use partial if timeout
3. **Stuck Agent**: Check progress, inject nudge, escalate if no response
4. **State Corruption**: Rebuild from event log
5. **Session Crash**: Detect via tmux list, respawn with state recovery

## Potential Issues & Solutions

### Issue 1: Summary Quality
**Problem**: AI agents might provide incomplete or unstructured summaries.  
**Solution**: Provide template in injection prompt, validate JSON structure, have fallback text parser.

### Issue 2: Timing Coordination
**Problem**: Stop hook fires before agent saves summary.  
**Solution**: Add grace period (5-10 seconds), check multiple locations, use filesystem watchers.

### Issue 3: State Synchronization  
**Problem**: Multiple hooks updating state simultaneously.  
**Solution**: Use append-only event log, rebuild state from events, single writer pattern.

### Issue 4: Agent Identity
**Problem**: Mapping Claude sessions to TaskSpecs.  
**Solution**: Encode TaskSpec ID in session name, use working directory as fallback, maintain session registry.

## Namespace Isolation & Legacy System Coexistence

### The Coexistence Challenge

The Hatchery system needs to be developed and tested while the existing Factory Process framework continues to operate. Rather than risky in-place replacement, we'll use namespace isolation to allow both systems to coexist during the transition period.

### Solution: `/hatch/` Root Namespace

All Hatchery components will live under a single `/hatch/` directory, completely isolated from the existing system:

```bash
hatchAI/
├── agents/                    # EXISTING: Current agent prompts (untouched)
│   ├── factory_prompt.md     # Current factory agent
│   ├── qa_prompt.md          # Current QA agent
│   └── planner_prompt.md     # Current planner
│
├── _features/                 # NEW: Feature and Task specifications (prefix numbering)
│   ├── .feature_counter      # Global feature counter
│   ├── Fspec/               # Feature specifications (immutable)
│   │   ├── 001-F-2025-08-12-USER-AUTH/
│   │   │   ├── feature.yaml # Feature specification
│   │   │   ├── .task_counter # Task counter for this feature
│   │   │   └── tasks/       # Task specifications for this feature
│   │   │       ├── 001-T-2025-08-12-AUTH-MIDDLEWARE.yaml     # status: completed
│   │   │       ├── 002-T-2025-08-12-USER-REGISTRATION.yaml   # status: in_progress
│   │   │       └── 003-T-2025-08-12-DATABASE-MIGRATION.yaml  # status: draft
│   │   └── 002-F-2025-08-12-PAYMENT-GATEWAY/
│   │       ├── feature.yaml
│   │       ├── .task_counter
│   │       └── tasks/
│   │           └── 001-T-2025-08-12-STRIPE-INTEGRATION.yaml  # status: draft
│   ├── Fstate/              # Feature state (mutable, single source of truth)
│   │   ├── 001-F-2025-08-12-USER-AUTH.yaml      # Contains ALL task states
│   │   └── 002-F-2025-08-12-PAYMENT-GATEWAY.yaml
│   └── views/               # Generated views for organization
│       ├── by-status/       # Symlinks organized by status
│       │   ├── active/
│       │   ├── backlog/
│       │   └── completed/
│       └── dashboards/      # Generated status dashboards
│           └── work-matrix.md
│
├── _logs/                     # NEW: Centralized logging (feature-centric)
│   ├── features/             # Logs organized by feature
│   │   ├── 001-F-2025-08-12-USER-AUTH/
│   │   │   ├── agent/       # Agent activity logs
│   │   │   ├── system/      # System event logs
│   │   │   ├── test/        # Test execution logs
│   │   │   ├── handoffs/    # Agent handoff and context logs
│   │   │   │   ├── 20250812163000-AUTH-MIDDLEWARE-001-factory_agent_1-001.log
│   │   │   │   └── 20250812164500-AUTH-MIDDLEWARE-001-qa_agent-001.log
│   │   │   └── errors/      # Error and failure logs
│   │   └── 002-F-2025-08-12-PAYMENT-GATEWAY/
│   │       └── [same structure]
│   ├── agents/              # Secondary view by agent (symlinks)
│   ├── daily/               # System-wide daily summaries
│   └── config/
│       └── retention.yaml   # Log retention policies
│
├── hatch/                     # NEW: Hatchery root namespace
│   ├── _docs/                # Hatchery-specific documentation
│   │   ├── drafts/          # Work-in-progress documentation
│   │   ├── architecture/    # System design docs
│   │   ├── implementation/  # Implementation guides
│   │   ├── api/            # API documentation
│   │   └── operations/     # Operational procedures
│   │
│   ├── _reports/            # Hatchery development reports
│   │   ├── drafts/         # Work-in-progress reports
│   │   ├── adhoc/          # Ad-hoc analysis and investigations
│   │   ├── planning/       # Implementation planning
│   │   ├── progress/       # Development progress
│   │   └── testing/        # Test results & analysis
│   │
│   ├── _agents/             # Hatchery AI agent prompts
│   │   ├── factory_senior.md  # Opus factory (replaces factory_prompt.md)
│   │   ├── factory_junior.md  # Sonnet factory (lightweight)
│   │   ├── team_qa.md         # QA agent (replaces qa_prompt.md)
│   │   └── team_planner.md    # Planner (replaces planner_prompt.md)
│   │
│   ├── _static/             # Static agents (programs, not AI)
│   │   ├── team_orchestrator/  # Orchestrator for teams
│   │   │   ├── main.go     # Service implementation
│   │   │   └── rules.yaml  # Decision rules
│   │   ├── project_lead/    # Supreme orchestrator
│   │   ├── error_monitor/   # Error monitoring
│   │   └── ci_cd_pipeline/  # Code collection
│   │
│   ├── _config/             # Hatchery configuration
│   │   ├── hatchery.yaml   # Main config
│   │   └── workflows/       # State machine definitions
│   │
│   ├── _state/              # Hatchery runtime state (NEVER in worktrees)
│   │   ├── teams/          # Active team states
│   │   ├── agents/         # Individual agent states
│   │   └── events/         # Event log
│   │
│   ├── _scripts/            # Hatchery orchestration scripts
│   │   ├── spawn_agent.sh  # Agent spawning
│   │   └── migrate.sh      # Migration utilities
│   │
│   ├── _tests/              # Hatchery tests
│   │   ├── unit/           # Unit tests
│   │   ├── integration/    # Integration tests
│   │   └── e2e/           # End-to-end tests
│   │
│   └── _bin/                # Compiled binaries
│       ├── team_orchestrator  # Main orchestrator
│       └── hatch-hook      # Hatchery hook processor
│
├── hooks/                     # EXISTING: Current hooks (keep working)
├── hooks-logger              # EXISTING: Current Go binaries (keep working)
├── scripts/                   # EXISTING: Current scripts (keep working)
└── .claude/settings.json     # Modified to support both systems
```

### Key Architecture Decisions for /hatchAI

1. **Feature-Centric Organization** (`_features/`)
   - Features use global prefix numbering: `001-F-2025-08-12-USER-AUTH/`
   - Tasks use per-feature prefix numbering: `001-T-2025-08-12-AUTH-MIDDLEWARE.yaml`
   - Single file lifecycle with status fields (no file movements)

2. **Single Source of Truth** (`_features/Fstate/`)
   - Feature state files contain ALL task states
   - No separate task state files (prevents synchronization issues)
   - Optimistic locking with version numbers

3. **Feature-Centric Logging** (`_logs/features/`)
   - All logs organized by feature for complete context
   - Absolute paths only (no worktree confusion)
   - Multiple view formats (by-feature, by-agent, daily summaries)

4. **View-Based Organization** (`_features/views/`)
   - Generated views replace folder movements
   - Multiple formats: symlinks, dashboards, matrices
   - Status-driven without breaking references

### Environment-Based System Selection

#### Mode Selection

```bash
# Choose which system to use
export HATCHAI_MODE="legacy"    # Use existing Factory Process
export HATCHAI_MODE="hatchery"  # Use new Hatchery system
export HATCHAI_MODE="hybrid"    # Use both (for testing)

# Or control per-session
claude --mode=legacy ...        # Force legacy mode
claude --mode=hatchery ...      # Force Hatchery mode
```

#### Conditional Hook Configuration

```json
// .claude/settings.json - Support both systems simultaneously
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Write|Edit|MultiEdit|Read|Grep|LS|Glob",
      "hooks": [
        // Existing hooks always run
        {"type": "command", "command": "$CLAUDE_PROJECT_DIR/hooks-enforcer"},
        {"type": "command", "command": "$CLAUDE_PROJECT_DIR/hooks-logger"},
        
        // Hatchery hook runs conditionally
        {
          "type": "command", 
          "command": "[ \"$HATCHAI_MODE\" = \"hatchery\" ] && $CLAUDE_PROJECT_DIR/hatch/bin/hatch-hook || true"
        }
      ]
    }]
  }
}
```

### Migration Strategy

#### Phase 1: Parallel Development (Weeks 1-4)
- Develop Hatchery under `/hatch/` namespace
- Existing system continues unchanged
- No risk to current workflows

#### Phase 2: Hybrid Testing (Weeks 5-6)
- Run both systems in parallel on same TaskSpecs
- Compare outputs and performance
- Identify gaps and issues

#### Phase 3: Gradual Cutover (Weeks 7-8)
- Migrate team members one at a time
- Move TaskSpec types incrementally
- Maintain fallback capability

#### Phase 4: Legacy Deprecation (Week 9+)
- Archive legacy system to `/legacy/`
- Update all documentation
- Remove compatibility layers

### Compatibility Layer

#### Router for Dynamic Path Resolution

```go
// /hatch/pkg/compat/router.go
package compat

import (
    "os"
    "path/filepath"
)

type SystemRouter struct {
    mode    string  // "legacy", "hatchery", or "hybrid"
    rootDir string
}

func NewRouter() *SystemRouter {
    mode := os.Getenv("HATCHAI_MODE")
    if mode == "" {
        mode = "legacy"  // Safe default
    }
    
    return &SystemRouter{
        mode:    mode,
        rootDir: os.Getenv("HATCHAI_MAIN"),
    }
}

func (r *SystemRouter) GetAgentPrompt(agentType string) string {
    if r.mode == "hatchery" || r.mode == "hybrid" {
        // Map to Hatchery agent names
        mapping := map[string]string{
            "factory": "drake",    // or "duckling" based on complexity
            "qa":      "sentinel",
            "planner": "shepherd",
        }
        
        if hatchName, ok := mapping[agentType]; ok {
            return filepath.Join(r.rootDir, "hatch", "agents", hatchName+".md")
        }
    }
    
    // Fall back to legacy
    return filepath.Join(r.rootDir, "agents", agentType+"_prompt.md")
}

func (r *SystemRouter) GetStatePath(component string) string {
    if r.mode == "hatchery" || r.mode == "hybrid" {
        return filepath.Join(r.rootDir, "hatch", "state", component)
    }
    return filepath.Join(r.rootDir, "_state", component)
}

func (r *SystemRouter) ShouldUseHatchery(feature string) bool {
    if r.mode == "hatchery" {
        return true
    }
    if r.mode == "legacy" {
        return false
    }
    
    // In hybrid mode, check feature flags
    enabledFeatures := map[string]bool{
        "team_orchestration": true,
        "state_machine":       true,
        "static_agents":       false,  // Still testing
    }
    
    return enabledFeatures[feature]
}
```

#### Wrapper Scripts for Smooth Transition

```bash
#!/bin/bash
# /hatch/scripts/claude_wrapper.sh

# Wrapper that routes to correct agent prompt based on mode
claude_agent() {
    local agent_type="$1"
    shift
    
    if [[ "$HATCHAI_MODE" == "hatchery" ]]; then
        case "$agent_type" in
            "factory")
                # Determine factory_senior vs factory_junior based on TaskSpec
                if is_complex_taskspec "$@"; then
                    prompt_file="$HATCHAI_MAIN/hatch/agents/factory_senior.md"
                else
                    prompt_file="$HATCHAI_MAIN/hatch/agents/factory_junior.md"
                fi
                ;;
            "qa")
                prompt_file="$HATCHAI_MAIN/hatch/agents/team_qa.md"
                ;;
            "planner")
                prompt_file="$HATCHAI_MAIN/hatch/agents/team_planner.md"
                ;;
        esac
    else
        prompt_file="$HATCHAI_MAIN/agents/${agent_type}_prompt.md"
    fi
    
    claude --prompt "$prompt_file" "$@"
}
```

### Feature Migration Configuration

```yaml
# /hatch/config/migration.yaml
migration:
  status: "testing"  # testing | migrating | complete
  
  features:
    taskspec_creation:
      legacy_path: "/agents/planner_prompt.md"
      hatchery_path: "/hatch/agents/team_planner.md"  # Pivot_Pilot
      status: "testing"
      rollout_percentage: 20  # 20% use Hatchery
      
    factory_implementation:
      legacy_path: "/agents/factory_prompt.md"
      hatchery_path: "/hatch/agents/factory_senior.md"  # or factory_junior.md
      status: "migrating"
      rollout_percentage: 50
      
    qa_validation:
      legacy_path: "/agents/qa_prompt.md"
      hatchery_path: "/hatch/agents/team_qa.md"  # Sentinel
      status: "testing"
      rollout_percentage: 10
      
    orchestration:
      legacy_path: null  # New capability
      hatchery_path: "/hatch/static/team_orchestrator"
      status: "active"
      rollout_percentage: 100
      
  compatibility:
    maintain_legacy_hooks: true
    maintain_legacy_logs: true
    dual_state_tracking: false  # Don't duplicate state
    
  deprecation:
    legacy_removal_date: "2025-10-01"
    archive_location: "/legacy_archive/"
```

### Testing Both Systems

```bash
#!/bin/bash
# /hatch/tests/compatibility_test.sh

run_parallel_test() {
    local taskspec="$1"
    
    echo "Testing TaskSpec $taskspec with both systems..."
    
    # Run with legacy system
    export HATCHAI_MODE="legacy"
    time ./run_taskspec.sh "$taskspec" > "/tmp/${taskspec}_legacy.log" 2>&1
    local legacy_exit=$?
    
    # Run with Hatchery system
    export HATCHAI_MODE="hatchery"
    time ./hatch/scripts/run_taskspec.sh "$taskspec" > "/tmp/${taskspec}_hatchery.log" 2>&1
    local hatchery_exit=$?
    
    # Compare results
    echo "Legacy exit code: $legacy_exit"
    echo "Hatchery exit code: $hatchery_exit"
    
    # Compare outputs (ignoring timestamps)
    diff_output=$(diff \
        <(sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}.*Z//g' "/tmp/${taskspec}_legacy.log") \
        <(sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}.*Z//g' "/tmp/${taskspec}_hatchery.log"))
    
    if [[ -z "$diff_output" ]]; then
        echo "✅ Outputs match!"
    else
        echo "⚠️  Outputs differ:"
        echo "$diff_output"
    fi
}
```

### Advantages of This Approach

1. **Zero Risk**: Legacy system remains completely untouched
2. **Clean Namespace**: Hatchery uses intuitive names from the start
3. **Easy Testing**: Can run both systems in parallel for comparison
4. **Simple Rollback**: Just change environment variable
5. **Gradual Migration**: Move features one at a time
6. **Clear Separation**: Easy to see what's Hatchery vs legacy
7. **Future-Proof**: No renaming needed when Hatchery becomes primary

### Monitoring During Transition

```bash
# /hatch/scripts/monitor_usage.sh
#!/bin/bash

# Track which system is being used
monitor_system_usage() {
    echo "System Usage Report - $(date)"
    echo "========================"
    
    # Count legacy sessions
    legacy_count=$(tmux ls 2>/dev/null | grep -c "factory\|qa\|planner" || echo 0)
    echo "Legacy sessions: $legacy_count"
    
    # Count Hatchery sessions  
    hatchery_count=$(tmux ls 2>/dev/null | grep -c "factory_senior\|factory_junior\|team_qa\|team_planner" || echo 0)
    echo "Hatchery sessions: $hatchery_count"
    
    # Check mode distribution
    echo -e "\nMode Distribution:"
    grep "HATCHAI_MODE" ~/.bash_history | tail -100 | sort | uniq -c
    
    # Performance comparison
    echo -e "\nAverage completion times:"
    echo "Legacy: $(calculate_avg_time "legacy")"
    echo "Hatchery: $(calculate_avg_time "hatchery")"
}
```

This namespace isolation strategy ensures a smooth, risk-free transition from the existing Factory Process to the new Hatchery system, with the ability to run both in parallel during the migration period.

## Worktree Isolation & Centralized State Management

### The Critical Challenge

AI agents (factory_senior, factory_junior, team_qa) work in isolated git worktrees for parallel development, but this creates a fundamental problem:

```bash
# The Problem Illustrated
/home/lama/projects/hatchAI/              # Main branch - where state MUST live
├── hatchery/
│   ├── state/                           # ✅ Centralized state (correct location)
│   └── logs/                            # ✅ Centralized logs (correct location)

/home/lama/projects/hatchAI/worktrees/
├── TS-2025-08-11-AUTH-001/              # factory_senior working here
│   ├── hatchery/logs/...                # ❌ factory_senior writes logs here by default!
│   └── hatchery/handoffs/...            # ❌ Handoff summaries end up here!
└── TS-2025-08-11-AUTH-002/              # Duckling working here
    └── hatchery/state/...               # ❌ State updates go to wrong place!
```

**Core Requirement**: All state, logs, and handoffs MUST be written to the main branch, never to worktrees.

### Solution: Three-Layer Defense Strategy

#### Layer 1: Environment Variable Injection

```bash
# Set by team_orchestrator when spawning agents
export HATCHAI_MAIN="/home/lama/projects/hatchAI"
export HATCHERY_STATE_DIR="${HATCHAI_MAIN}/hatchery/state"
export HATCHERY_LOG_DIR="${HATCHAI_MAIN}/hatchery/logs"
export HATCHERY_HANDOFF_DIR="${HATCHAI_MAIN}/hatchery/handoffs"

# Spawn agent with environment
tmux new-session -d -s "$session_name" -c "$worktree_path" \
  "export HATCHAI_MAIN='$HATCHAI_MAIN'; \
   export HATCHERY_STATE_DIR='$HATCHERY_STATE_DIR'; \
   export HATCHERY_LOG_DIR='$HATCHERY_LOG_DIR'; \
   export HATCHERY_HANDOFF_DIR='$HATCHERY_HANDOFF_DIR'; \
   claude --model $model '$prompt'"
```

#### Layer 2: Hook-Level Path Enforcement

```go
// hooks-logger.go - Always resolve to main branch
func (h *HookLogger) determineLogPath() string {
    // CRITICAL: Never use relative paths
    mainRepo := h.findMainRepository()
    if mainRepo == "" {
        mainRepo = os.Getenv("HATCHAI_MAIN")
    }
    
    // Always log to main, even from worktree
    return filepath.Join(mainRepo, "hatchery", "logs", h.sessionID + ".log")
}

func (h *HookLogger) findMainRepository() string {
    // Method 1: Git command to find main
    cmd := exec.Command("git", "worktree", "list", "--porcelain")
    output, _ := cmd.Output()
    // Parse output to find main worktree (not bare)
    
    // Method 2: Environment fallback
    if main := os.Getenv("HATCHAI_MAIN"); main != "" {
        return main
    }
    
    // Method 3: Walk up directory tree to find .git directory
    return findGitRoot()
}
```

#### Layer 3: AI Agent Prompt Instructions

```markdown
# Added to factory_senior/factory_junior/team_qa/team_planner prompts

## CRITICAL: Hatchery File Location Rules

You are working in a git worktree for isolated development. 
When writing ANY Hatchery-related files, you MUST follow these rules:

1. NEVER write to ./hatch/ in your current directory
2. ALWAYS use these environment variables for Hatchery files:
   - State updates: $HATCHERY_STATE_DIR/[filename]
   - Log entries: $HATCHERY_LOG_DIR/[filename]  
   - Handoff summaries: $HATCHERY_HANDOFF_DIR/TS-XXXX.json
3. These variables point to the MAIN repository, not your worktree

Example - Saving a handoff summary:
❌ WRONG: ./hatch/handoffs/summary.json
❌ WRONG: ../../../hatch/handoffs/summary.json
✅ RIGHT: $HATCHERY_HANDOFF_DIR/TS-2025-08-11-AUTH-001.json
```

### Implementation Details

#### Configuration Structure

```yaml
# /hatchery/config/team_orchestrator.yaml
paths:
  # CRITICAL: Use absolute paths or environment variables
  # NEVER use relative paths that would break in worktrees
  main_repo: "${HATCHAI_MAIN}"
  state_dir: "${HATCHAI_MAIN}/hatchery/state"
  logs_dir: "${HATCHAI_MAIN}/hatchery/logs"
  handoffs_dir: "${HATCHAI_MAIN}/hatchery/handoffs"
  events_dir: "${HATCHAI_MAIN}/hatchery/events"
  
worktree:
  base_path: "${HATCHAI_MAIN}/worktrees"
  naming_pattern: "TS-{taskspec_id}"
```

#### Helper Functions for Path Resolution

```bash
#!/bin/bash
# /hatchery/lib/path_helpers.sh

# Get main repository path from any location
get_main_repo_path() {
    # Try environment variable first (fastest)
    if [[ -n "$HATCHAI_MAIN" ]]; then
        echo "$HATCHAI_MAIN"
        return 0
    fi
    
    # Try git worktree list (most reliable)
    local main_path=$(git worktree list --porcelain 2>/dev/null | \
                      grep -A2 "worktree" | \
                      head -n1 | \
                      cut -d' ' -f2)
    
    if [[ -n "$main_path" && "$main_path" != *"/worktrees/"* ]]; then
        echo "$main_path"
        return 0
    fi
    
    # Walk up to find main .git directory
    local current="$(pwd)"
    while [[ "$current" != "/" ]]; do
        if [[ -d "$current/.git" ]] && [[ ! -f "$current/.git" ]]; then
            echo "$current"
            return 0
        fi
        current="$(dirname "$current")"
    done
    
    echo "ERROR: Cannot find main repository" >&2
    return 1
}

# Ensure we're writing to main repo
ensure_main_repo_path() {
    local path="$1"
    local main_repo=$(get_main_repo_path)
    
    # Check if path is already absolute to main
    if [[ "$path" == "$main_repo"* ]]; then
        echo "$path"
        return 0
    fi
    
    # Check if path is relative - prepend main repo
    if [[ "$path" != /* ]]; then
        echo "${main_repo}/${path}"
        return 0
    fi
    
    # Path is absolute but not in main - error
    echo "ERROR: Path $path is not in main repository" >&2
    return 1
}
```

#### State File Access Pattern

```go
// /hatchery/pkg/state/manager.go
type StateManager struct {
    mainRepo string
    mu       sync.RWMutex
}

func NewStateManager() (*StateManager, error) {
    mainRepo := os.Getenv("HATCHAI_MAIN")
    if mainRepo == "" {
        mainRepo = findMainRepository()
    }
    
    if mainRepo == "" {
        return nil, fmt.Errorf("cannot determine main repository path")
    }
    
    return &StateManager{mainRepo: mainRepo}, nil
}

func (sm *StateManager) WriteState(agentID string, state interface{}) error {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    // ALWAYS write to main repo
    statePath := filepath.Join(sm.mainRepo, "hatchery", "state", "agents", agentID+".json")
    
    // Ensure directory exists
    if err := os.MkdirAll(filepath.Dir(statePath), 0755); err != nil {
        return fmt.Errorf("failed to create state directory: %w", err)
    }
    
    // Atomic write with temp file
    return atomicWriteJSON(statePath, state)
}
```

### Testing & Validation

```bash
# /hatchery/tests/test_worktree_isolation.sh
#!/bin/bash

test_worktree_isolation() {
    # Create test worktree
    local test_taskspec="TS-TEST-001"
    git worktree add "worktrees/$test_taskspec" -b "card-$test_taskspec"
    
    # Spawn agent in worktree
    cd "worktrees/$test_taskspec"
    
    # Verify environment variables point to main
    [[ "$HATCHERY_STATE_DIR" == *"/worktrees/"* ]] && \
        echo "ERROR: State dir points to worktree!" && return 1
    
    # Test state write
    echo '{"test": true}' > "$HATCHERY_STATE_DIR/test.json"
    
    # Verify file is in main, not worktree
    [[ -f "../../hatchery/state/test.json" ]] || \
        echo "ERROR: State not in main repo!" && return 1
    
    # Cleanup
    cd ../..
    git worktree remove "worktrees/$test_taskspec"
    
    echo "✅ Worktree isolation test passed"
}
```

### Common Pitfalls to Avoid

1. **DON'T use relative paths** - They break in worktrees
2. **DON'T use symlinks** - Git tracks them, causes conflicts
3. **DON'T write to current directory** - Always use absolute paths
4. **DON'T trust $PWD** - It will be the worktree path
5. **DON'T use git config for paths** - It's worktree-specific

### Monitoring & Debugging

```bash
# Add to team_orchestrator health checks
check_state_location() {
    local agent_id="$1"
    local state_file=$(find . -name "${agent_id}.json" 2>/dev/null)
    
    if [[ "$state_file" == *"/worktrees/"* ]]; then
        alert "CRITICAL: State file $state_file is in worktree!"
        return 1
    fi
    
    return 0
}
```

This approach ensures that regardless of where AI agents are working, all state management remains centralized in the main repository, maintaining a single source of truth for the entire Hatchery system.

## Simplicity Improvements

### What We're NOT Doing (Yet)
- No distributed state (single team_orchestrator per team)
- No complex saga patterns (simple state machine)
- No database (file-based with locks)
- No service mesh (direct tmux communication)
- No container orchestration (native processes)

### What Makes This Simple
- Single responsibility per agent type
- Clear handoff points
- Append-only logs (no complex merging)
- Filesystem-based (easy to debug)
- Tmux native (no abstraction layers)
- Absolute paths (no ambiguity about file locations)

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create directory structure
- [ ] Implement state machine engine
- [ ] Build event logging system
- [ ] Create spawn_agent.sh script
- [ ] Set up file-based state management

### Phase 2: team_orchestrator Service (Week 2)
- [ ] Implement main service loop
- [ ] Add spawn rules processing
- [ ] Create health monitoring
- [ ] Build hook integration
- [ ] Add handoff coordination

### Phase 3: Hook Integration (Week 3)
- [ ] Modify Claude hooks for notifications
- [ ] Implement stop hook handler
- [ ] Add summary request injection
- [ ] Create state update triggers
- [ ] Build retry logic

### Phase 4: Testing & Hardening (Week 4)
- [ ] Test state transitions
- [ ] Verify handoff mechanisms
- [ ] Stress test with multiple agents
- [ ] Add monitoring and metrics
- [ ] Document operational procedures

## Success Metrics

- **Handoff Success Rate**: > 95% successful handoffs
- **Summary Completeness**: > 90% summaries captured
- **State Consistency**: 100% valid state transitions
- **Recovery Time**: < 2 minutes from failure
- **Agent Utilization**: > 70% time in active states

## Next Steps

1. **Immediate**: Create `/hatchery` directory structure
2. **Day 1-2**: Implement basic state machine
3. **Day 3-4**: Build spawn and injection scripts
4. **Day 5-7**: Create team_orchestrator service core
5. **Week 2**: Integrate with Claude hooks
6. **Week 3**: Testing and refinement

## Open Questions for Consideration

1. **Session Naming Convention**: Should we use `team_001_factory_senior_TS-2025-08-11-AUTH-001` or shorter format?
2. **Summary Format**: JSON for structure or Markdown for readability?
3. **Retry Limits**: How many retries before human escalation?
4. **Model Selection**: Should duckling ever upgrade to opus for retries?
5. **Parallel Agents**: Can multiple agents work on same TaskSpec?

## Conclusion

This plan provides a robust yet simple foundation for the Hatchery framework. By starting with team_orchestrator and basic state management, we can validate the architecture before adding more complex features. The event-driven design with state machines ensures reliability while maintaining debuggability.

The key innovation is using Claude's stop hooks as natural workflow triggers, combined with prompt injection for recovering missing summaries. This creates a self-healing system that gracefully handles the unpredictability of AI agents while maintaining workflow integrity.

---
*Generated by: project_planner*  
*Status: Ready for Implementation Review*

## Missing Considerations

Based on review of the adhoc reports (hatchery_hierarchy_architecture.md, hatch_diagnostic_helper_agent.md, tts_client_setup_comprehensive.md), the following directories should be considered for the file structure:

### 1. Diagnostic and Recovery
```
/hatch/diagnostics/         # Diagnostic system (clutch_meister pattern)
├── investigations/         # Active diagnostic investigations
├── codes/                  # Diagnostic code definitions (100-199)
├── recovery/               # Recovery action mappings
└── reports/                # Diagnostic analysis reports
```

### 2. Team Organization (from Hatchery hierarchy)
```
/hatch/teams/               # Team-based agent organization
├── team_001/               # Team working on feature
│   ├── orchestrator.yaml   # Team orchestrator config
│   ├── members/            # Active team members
│   └── state/              # Team state management
└── team_002/
```

### 3. Emergency Response
```
/hatch/emergency/           # Emergency activation system
├── darkwing/               # Emergency override logs
├── escalations/            # Escalation chain records
└── protocols/              # Emergency protocols
```

### 4. Audio/TTS Integration (if needed)
```
/hatch/audio/               # TTS and audio notifications
├── announcements/          # Generated audio files
├── templates/              # TTS message templates
└── config/                 # Audio system configuration
```

### 5. Agent Definitions
```
/hatch/agents/              # Agent prompt definitions
├── architect.md            # overmind prompt
├── diagnostic.md           # clutch_meister prompt
├── factory_senior.md       # duck_supreme prompt
├── factory_junior.md       # duckling prompt
├── team_qa.md              # sentinel prompt
└── emergency.md            # darkwing duck prompt
```

### 6. Static Services Layer
```
/hatch/static/              # Static agent services
├── team_orchestrator/      # Per-team orchestration
├── error_monitor/          # ripple_reader implementation
├── rt_queue/               # ripple_radio implementation
└── project_planner/        # clutch_daddy implementation
```

### 7. Resource Management
```
/hatch/resources/           # Resource allocation and limits
├── quotas/                 # Token and resource quotas
├── allocation/             # Current allocations
└── usage/                  # Historical usage data
```

### Updated Complete Structure

```
/hatch/
├── _features/              # Feature and task management
│   ├── .feature_counter    # Global feature counter
│   ├── Fspec/              # Feature specifications
│   │   └── 001-F-2025-08-12-USER-AUTH/
│   │       ├── feature.yaml
│   │       └── tasks/
│   │           ├── 001-T-2025-08-12-AUTH-MIDDLEWARE.yaml
│   │           └── 002-T-2025-08-12-USER-REGISTRATION.yaml
│   └── Fstate/             # Feature state (runtime)
│       └── 001-F-2025-08-12-USER-AUTH.yaml
│
├── _logs/                  # Feature-centric logging
│   └── features/
│       └── 001-F-2025-08-12-USER-AUTH/
│           ├── agent/      # Agent activity logs
│           ├── system/     # System event logs
│           ├── test/       # Test execution logs
│           ├── handoffs/   # Agent handoff and context logs
│           └── errors/     # Error and failure logs
│
├── agents/                 # Agent prompt definitions
│   ├── architect.md
│   ├── diagnostic.md
│   ├── factory_senior.md
│   ├── factory_junior.md
│   ├── team_qa.md
│   └── emergency.md
│
├── static/                 # Static agent services
│   ├── team_orchestrator/
│   ├── error_monitor/
│   ├── rt_queue/
│   └── project_planner/
│
├── teams/                  # Team organization
│   └── team_001/
│       ├── orchestrator.yaml
│       ├── members/
│       └── state/
│
├── diagnostics/            # Diagnostic system
│   ├── investigations/
│   ├── codes/
│   ├── recovery/
│   └── reports/
│
├── emergency/              # Emergency response
│   ├── darkwing/
│   ├── escalations/
│   └── protocols/
│
├── resources/              # Resource management
│   ├── quotas/
│   ├── allocation/
│   └── usage/
│
├── audio/                  # TTS integration (optional)
│   ├── announcements/
│   ├── templates/
│   └── config/
│
└── config/                 # System configuration
    ├── hooks.yaml
    ├── agents.yaml
    └── teams.yaml
```

This comprehensive structure incorporates:
- All patterns from the hatchery hierarchy architecture
- Diagnostic and recovery systems from clutch_meister pattern
- Team-based agent organization
- Emergency response protocols
- Optional TTS/audio integration points
- Clear separation between static services and AI agents
- Resource management and monitoring
- Feature-centric logging with handoffs and errors under _logs/features

The structure maintains the clean separation from the existing TaskSpec system while providing all necessary infrastructure for the advanced orchestration patterns described in the adhoc reports. Handoffs are kept under the logging structure as they are fundamentally historical records of agent transitions, not active state requiring separate management.