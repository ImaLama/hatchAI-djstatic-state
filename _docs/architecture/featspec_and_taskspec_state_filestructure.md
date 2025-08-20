# FeatSpec and TaskSpec State File Structure Architecture
# PURPOSE_HASH: ARCH-2025-08-20-FEATSTATE-TASKSTATE-STRUCTURE

## Executive Summary

This document defines the comprehensive state management architecture for FeatSpecs and TaskSpecs, implementing a dual-layer approach that separates operational runtime state from rich development context and history.

**Key Architecture Decisions:**
- **Directory-per-Feature**: Each FeatSpec gets isolated state directory
- **TaskSpec Isolation**: Individual handover files prevent context confusion
- **Dual State Model**: JSON for runtime queries, YAML for rich context
- **Agent Focus**: Clean, relevant context without cross-TaskSpec noise
- **Concurrent Safety**: Atomic operations at TaskSpec and Feature levels

## Directory Structure Overview

```
djhatch-state/
├── _featstate/
│   ├── runtime_state.json                                    # Global agent runtime state
│   ├── 001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS/
│   │   ├── featstate.json                                   # Feature progression data
│   │   ├── 001-TS-2025-08-18-TASKSPEC-VALIDATION/
│   │   │   └── handovers.yaml                              # TaskSpec-specific context
│   │   ├── 002-TS-2025-08-18-STATE-LOGGING/
│   │   │   └── handovers.yaml                              # TaskSpec-specific context
│   │   └── 003-TS-2025-08-18-INTEGRATION/
│   │       └── handovers.yaml                              # TaskSpec-specific context
│   └── 002-FS-2025-08-19-AGENT-MONITORING/
│       ├── featstate.json                                   # Feature progression data
│       ├── 004-TS-2025-08-19-AGENT-LAUNCHER/
│       │   └── handovers.yaml                              # TaskSpec-specific context
│       └── 005-TS-2025-08-19-STATE-MONITOR/
│           └── handovers.yaml                              # TaskSpec-specific context
```

## File Type Specifications

### 1. runtime_state.json - Global Agent Runtime State

**Purpose**: High-frequency operational state for active agent monitoring and orchestrator coordination.

**Update Frequency**: Every 5 seconds during active agent execution

**Access Pattern**: Read/Write by orchestrator, Read-only by monitoring tools

**Structure**:
```json
{
  "agents": {
    "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1": {
      "name": "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1",
      "type": "factory",
      "status": "completed",
      "start_time": "2025-08-18T14:00:00Z",
      "end_time": "2025-08-18T16:30:00Z",
      "last_activity": "2025-08-18T16:30:00Z",
      "taskspec": "001-TS-2025-08-18-TASKSPEC-VALIDATION",
      "feature_spec": "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS",
      "worktree": "_worktrees/factory-001-TS-2025-08-18-TASKSPEC-VALIDATION",
      "iteration": 1,
      "tmux_session": "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1",
      "log_path": "_logs/factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1.log",
      "handover_path": "_handovers/factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1.md",
      "exit_reason": "completed"
    }
  },
  "features": {
    "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS": {
      "id": "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS",
      "status": "active",
      "active_tasks": ["002-TS-2025-08-18-STATE-LOGGING"],
      "completed_tasks": ["001-TS-2025-08-18-TASKSPEC-VALIDATION"],
      "current_phase": "factory",
      "updated_at": "2025-08-20T14:30:00Z"
    }
  },
  "system": {
    "active_agents": 1,
    "total_features": 2,
    "last_updated": "2025-08-20T14:30:00Z"
  },
  "updated_at": "2025-08-20T14:30:00Z"
}
```

**Key Operations**:
- Agent status monitoring (5-second polling)
- Concurrent orchestrator coordination
- System health dashboards
- Timeout detection and recovery

### 2. featstate.json - Feature Progression Data

**Purpose**: Feature-level progression tracking with TaskSpec completion metrics and cross-TaskSpec pattern intelligence.

**Update Frequency**: On TaskSpec state transitions (start, complete, fail)

**Access Pattern**: Read/Write by orchestrator, Read-only by analytics

**Location**: `_featstate/{FEATURE_ID}/featstate.json`

**Structure**:
```json
{
  "feature": {
    "id": "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS",
    "title": "POC Orchestrator Enhancements",
    "status": "in_progress",
    "created": "2025-08-18T10:00:00Z",
    "updated": "2025-08-20T14:30:00Z",
    "priority": "high",
    "estimated_effort": "2_weeks",
    "actual_effort_days": 10,
    "progress": {
      "total_taskspecs": 3,
      "completed_taskspecs": 1,
      "in_progress_taskspecs": 1,
      "blocked_taskspecs": 0,
      "completion_percentage": 33.3
    },
    "metrics": {
      "total_factory_iterations": 4,
      "total_qa_iterations": 2,
      "avg_cycle_time_hours": 3.25,
      "success_rate": 75.0,
      "first_pass_success_rate": 50.0
    }
  },
  "taskspecs": {
    "001-TS-2025-08-18-TASKSPEC-VALIDATION": {
      "status": "completed",
      "created": "2025-08-18T10:00:00Z",
      "started": "2025-08-18T14:00:00Z",
      "completed": "2025-08-18T17:25:00Z",
      "total_cycle_time_hours": 3.42,
      "factory_iterations": [
        {
          "iteration": 1,
          "agent_name": "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1",
          "started": "2025-08-18T14:00:00Z",
          "completed": "2025-08-18T16:30:00Z",
          "duration_hours": 2.5,
          "outcome": "completed",
          "loc_changed": 187,
          "tests_added": 15,
          "coverage_achieved": 95.2,
          "handover_id": "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1"
        }
      ],
      "qa_iterations": [
        {
          "iteration": 1,
          "agent_name": "qa-001-TS-2025-08-18-TASKSPEC-VALIDATION-1",
          "started": "2025-08-18T16:35:00Z",
          "completed": "2025-08-18T17:20:00Z",
          "duration_hours": 0.75,
          "outcome": "approved",
          "decision": "approved",
          "issues_found": 0,
          "handover_id": "qa-001-TS-2025-08-18-TASKSPEC-VALIDATION-1"
        }
      ],
      "final_merge": {
        "merged_at": "2025-08-18T17:25:00Z",
        "commit_hash": "3f85c82",
        "branch": "qa/001-TS-2025-08-18-TASKSPEC-VALIDATION"
      }
    }
  },
  "cross_taskspec_patterns": {
    "common_issues": [
      "State management tasks consistently struggle with concurrency",
      "Coverage gaps typically in error handling paths"
    ],
    "success_patterns": [
      "Validation tasks succeed when comprehensive test data provided",
      "Builder pattern implementations rarely require rework"
    ],
    "splitting_recommendations": [
      {
        "taskspec": "002-TS-2025-08-18-STATE-LOGGING",
        "reason": "Multiple factory iterations suggest complexity",
        "suggested_splits": [
          "002A-TS: Basic state logging without concurrency",
          "002B-TS: Add concurrency protection",
          "002C-TS: Advanced JSON marshaling edge cases"
        ]
      }
    ]
  }
}
```

**Key Operations**:
- Progress tracking and reporting
- Cycle time analytics  
- Pattern recognition for TaskSpec optimization
- Feature completion assessment

### 3. handovers.yaml - TaskSpec-Specific Development Context

**Purpose**: Rich development context and handover history isolated per TaskSpec to prevent agent confusion while preserving learning context.

**Update Frequency**: On agent completion (factory/QA handovers)

**Access Pattern**: Read/Write by orchestrator, Read-only by agents (current TaskSpec only)

**Location**: `_featstate/{FEATURE_ID}/{TASKSPEC_ID}/handovers.yaml`

**Structure**:
```yaml
taskspec_id: 002-TS-2025-08-18-STATE-LOGGING
feature_id: 001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS
updated: 2025-08-19T14:30:00Z

factory_handovers:
  - iteration: 1
    handover_id: factory-002-TS-2025-08-18-STATE-LOGGING-1
    agent_name: factory-002-TS-2025-08-18-STATE-LOGGING-1
    timestamp: 2025-08-19T12:30:00Z
    outcome: completed
    summary: |
      **State Logging Implementation - Iteration 1**
      
      Implemented JSON-based state persistence but encountered concurrency challenges.
      Core functionality works for single-threaded access but race conditions exist.
      
      **Key Implementation Details:**
      - Used structured logging with JSON marshaling for state persistence
      - Implemented basic CRUD operations for state management
      - Added configuration-driven log rotation
      
      **Technical Challenges:**
      - Concurrent access patterns not initially considered
      - JSON marshaling edge cases with complex nested objects
      - Error handling gaps in failure scenarios
      
      **Lessons Learned:**
      - State management TaskSpecs consistently underestimate concurrency complexity
      - Explicit concurrency requirements should be added to spec templates
      - Error path testing crucial for production readiness
      
    technical_details:
      loc_added: 145
      loc_deleted: 8
      tests_added: 8
      coverage: 72.0
      files_modified: 2
      functions_added: 6
      complexity_score: medium
      critical_gaps: ["concurrent_access_testing", "error_path_coverage"]
    
    artifacts:
      log_file: "_logs/factory-002-TS-2025-08-18-STATE-LOGGING-1.log"
      worktree: "_worktrees/factory-002-TS-2025-08-18-STATE-LOGGING"
      handover_file: "_handovers/factory-002-TS-2025-08-18-STATE-LOGGING-1.md"

qa_handovers:
  - iteration: 1
    handover_id: qa-002-TS-2025-08-18-STATE-LOGGING-1
    agent_name: qa-002-TS-2025-08-18-STATE-LOGGING-1
    timestamp: 2025-08-19T14:30:00Z
    decision: rejected
    summary: |
      **QA Rejection - Concurrency and Coverage Issues**
      
      Implementation demonstrates solid understanding of core requirements but has 
      critical gaps that prevent production deployment.
      
      **Critical Issues Found:**
      1. Race conditions in state updates (logger.go:45-67) - CRITICAL
      2. Test coverage below requirement (72.0% < 80%) - CRITICAL  
      3. Untested JSON marshaling edge cases - MAJOR
      
      **Positive Aspects:**
      - Clean architecture and separation of concerns
      - Good error message design for user-facing errors
      - Performance characteristics within acceptable ranges
      - Code style and structure follow project conventions
      
      **Rework Guidance for Factory:**
      - Add mutex/RWLock protection for concurrent state access
      - Implement comprehensive test scenarios for concurrent operations
      - Add edge case testing for JSON marshaling (circular refs, nil pointers)
      - Achieve minimum 80% test coverage including error paths
      
      **Pattern Recognition:**
      This follows a common pattern in state management tasks where initial 
      implementation focuses on functional requirements but treats concurrency 
      as an afterthought. Consider adding explicit concurrency requirements 
      to state management TaskSpec templates.
    
    technical_review:
      security_issues: 0
      performance_issues: 0
      maintainability_score: good
      test_coverage: 72.0
      complexity_assessment: appropriate
      critical_blockers: 3
      
    issues_details:
      - issue: "race_conditions"
        severity: "critical"
        location: "src/state/logger.go lines 45-67"
        description: "Concurrent map writes without synchronization"
        fix_required: "Add mutex protection for state modification operations"
        
      - issue: "coverage_insufficient"
        severity: "critical"
        location: "Overall test coverage 72.0%"
        description: "Test coverage below 80% requirement"
        fix_required: "Add tests for error paths and edge cases"
        
      - issue: "untested_error_paths"
        severity: "major"
        location: "src/state/logger.go line 89, 134, 178"
        description: "JSON marshaling failures not tested"
        fix_required: "Add comprehensive error scenario testing"
    
    artifacts:
      log_file: "_logs/qa-002-TS-2025-08-18-STATE-LOGGING-1.log"
      worktree: "_worktrees/qa-002-TS-2025-08-18-STATE-LOGGING"
      review_report: "_reports/qa-002-TS-2025-08-18-STATE-LOGGING-1.md"

# TaskSpec-specific learning and patterns
lessons_learned:
  implementation_patterns:
    - "State logging requires explicit concurrency design from start"
    - "JSON marshaling edge cases should be requirements, not implementation details"
    - "Coverage requirements must explicitly include error handling paths"
    
  common_mistakes:
    - "Treating concurrency as implementation detail rather than requirement"
    - "Focusing on happy path testing, neglecting error scenarios"
    - "Underestimating complexity of state synchronization"
    
  success_indicators:
    - "TDD approach with comprehensive test data setup"
    - "Early identification of concurrency requirements"
    - "Explicit error handling design in initial implementation"

# Context for potential TaskSpec splitting
splitting_context:
  complexity_indicators:
    - "Multiple factory iterations required (2+)"
    - "Concurrency concerns suggest architectural complexity"
    - "JSON marshaling edge cases indicate data handling complexity"
    
  potential_splits:
    - taskspec: "002A-TS-BASIC-STATE-LOGGING"
      scope: "Single-threaded state logging with basic JSON persistence"
      estimated_effort: "0.5 week"
      
    - taskspec: "002B-TS-CONCURRENT-STATE-LOGGING"  
      scope: "Add thread-safe concurrent access to state logging"
      estimated_effort: "0.5 week"
      dependencies: ["002A-TS-BASIC-STATE-LOGGING"]
      
    - taskspec: "002C-TS-ADVANCED-JSON-MARSHALING"
      scope: "Handle JSON marshaling edge cases and error recovery"
      estimated_effort: "0.25 week"
      dependencies: ["002A-TS-BASIC-STATE-LOGGING"]
```

**Key Operations**:
- Agent context provision (current TaskSpec only)
- Learning pattern extraction
- TaskSpec splitting decision support
- Development history preservation

## File Access Patterns and Commands

### Runtime State Operations

**Monitor Agent Status (5-second polling)**:
```bash
# Orchestrator monitoring
jq '.agents["factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1"].status' runtime_state.json

# Check all active agents
jq '.agents | to_entries[] | select(.value.status == "running") | .key' runtime_state.json
```

**Update Agent State (Atomic)**:
```go
// Orchestrator updates - atomic JSON operations
func (sm *StateManager) UpdateAgentState(agentName string, state AgentState) error {
    return sm.atomicJSONUpdate("runtime_state.json", func(rs *RuntimeState) {
        rs.Agents[agentName] = state
        rs.UpdatedAt = time.Now()
    })
}
```

### FeatState Operations

**Query Feature Progress**:
```bash
# Feature completion percentage
jq '.feature.progress.completion_percentage' _featstate/001-FS-2025-08-18-POC/featstate.json

# TaskSpec metrics
jq '.taskspecs["001-TS-2025-08-18-TASKSPEC-VALIDATION"].factory_iterations[].coverage_achieved' \
   _featstate/001-FS-2025-08-18-POC/featstate.json
```

**Pattern Analysis**:
```bash
# Common issues across TaskSpecs
jq '.cross_taskspec_patterns.common_issues[]' _featstate/001-FS-2025-08-18-POC/featstate.json

# Success patterns
jq '.cross_taskspec_patterns.success_patterns[]' _featstate/001-FS-2025-08-18-POC/featstate.json
```

### TaskSpec Handover Operations

**Agent Context Loading (Focused)**:
```bash
# Agent gets ONLY current TaskSpec context
cat _featstate/001-FS-2025-08-18-POC/002-TS-2025-08-18-STATE-LOGGING/handovers.yaml

# Previous iteration lessons
yq '.lessons_learned.implementation_patterns[]' \
   _featstate/001-FS-2025-08-18-POC/002-TS-2025-08-18-STATE-LOGGING/handovers.yaml
```

**Orchestrator Context Curation**:
```go
// Orchestrator can selectively provide broader context
func (o *Orchestrator) buildAgentPrompt(taskSpecID string) string {
    // Always include current TaskSpec context
    currentContext := o.loadTaskSpecHandovers(taskSpecID)
    
    // Optionally add related patterns
    relatedContext := ""
    if o.detectSimilarPatterns(taskSpecID) {
        relatedContext = o.loadRelatedPatterns(taskSpecID)
    }
    
    return o.formatPrompt(currentContext, relatedContext)
}
```

## State Management Operations

### Atomic Update Patterns

**JSON State Updates**:
```go
func (sm *StateManager) atomicJSONUpdate(filename string, updateFn func(interface{})) error {
    // Read current state
    data, err := os.ReadFile(filename)
    if err != nil {
        return err
    }
    
    var state interface{}
    json.Unmarshal(data, &state)
    
    // Apply update
    updateFn(state)
    
    // Atomic write (temp + rename)
    tempFile := filename + ".tmp"
    newData, _ := json.MarshalIndent(state, "", "  ")
    os.WriteFile(tempFile, newData, 0644)
    
    return os.Rename(tempFile, filename)
}
```

**YAML Handover Appends**:
```go
func (sm *StateManager) appendHandover(taskSpecID string, handover *Handover) error {
    handoverFile := filepath.Join(
        sm.featStateDir, 
        extractFeatureID(taskSpecID),
        taskSpecID,
        "handovers.yaml",
    )
    
    // Append-only operation for handovers
    return sm.appendYAMLEntry(handoverFile, handover)
}
```

### Concurrent Access Safety

**Feature-Level Locking**:
```go
type StateManager struct {
    featStateMutexes sync.Map  // Per-feature locks
    globalMutex      sync.RWMutex  // For runtime_state.json
}

func (sm *StateManager) getFeatureLock(featureID string) *sync.Mutex {
    lock, _ := sm.featStateMutexes.LoadOrStore(featureID, &sync.Mutex{})
    return lock.(*sync.Mutex)
}
```

## Directory Creation and Management

### Initialization Commands

**Create Feature State Directory**:
```bash
#!/bin/bash
# create_featstate_dir.sh
FEATURE_ID="$1"
FEATSTATE_DIR="_featstate/$FEATURE_ID"

mkdir -p "$FEATSTATE_DIR"

# Initialize featstate.json with empty structure
cat > "$FEATSTATE_DIR/featstate.json" << EOF
{
  "feature": {
    "id": "$FEATURE_ID",
    "status": "created",
    "created": "$(date -Iseconds)",
    "updated": "$(date -Iseconds)"
  },
  "taskspecs": {},
  "cross_taskspec_patterns": {
    "common_issues": [],
    "success_patterns": [],
    "splitting_recommendations": []
  }
}
EOF
```

**Create TaskSpec Handover Directory**:
```bash
#!/bin/bash
# create_taskspec_dir.sh
FEATURE_ID="$1"
TASKSPEC_ID="$2" 
TASKSPEC_DIR="_featstate/$FEATURE_ID/$TASKSPEC_ID"

mkdir -p "$TASKSPEC_DIR"

# Initialize handovers.yaml
cat > "$TASKSPEC_DIR/handovers.yaml" << EOF
taskspec_id: $TASKSPEC_ID
feature_id: $FEATURE_ID
updated: $(date -Iseconds)

factory_handovers: []
qa_handovers: []

lessons_learned:
  implementation_patterns: []
  common_mistakes: []
  success_indicators: []

splitting_context:
  complexity_indicators: []
  potential_splits: []
EOF
```

## Agent Integration Patterns

### Context-Aware Agent Launching

**Factory Agent Context**:
```go
func (o *Orchestrator) launchFactoryAgent(config AgentLaunchConfig) error {
    // Load focused TaskSpec context
    handovers := o.loadTaskSpecHandovers(config.TaskSpecID)
    
    // Build context-aware prompt
    prompt := fmt.Sprintf(`
%s

## Current TaskSpec Context:
Previous iterations for this TaskSpec:
%s

## Key Lessons (TaskSpec-specific):
%s

## Current Requirements:
%s
    `, 
        o.getFactoryPrompt(),
        handovers.formatFactoryContext(),
        handovers.extractLessons(),
        o.loadTaskSpecContent(config.TaskSpecID),
    )
    
    return o.launchAgent(config, prompt)
}
```

**QA Agent Context**:
```go
func (o *Orchestrator) launchQAAgent(config AgentLaunchConfig) error {
    // Load TaskSpec handovers + factory output
    handovers := o.loadTaskSpecHandovers(config.TaskSpecID)
    factoryHandover := o.getLatestFactoryHandover(config.TaskSpecID)
    
    prompt := fmt.Sprintf(`
%s

## Factory Implementation Summary:
%s

## Previous QA Reviews (TaskSpec-specific):
%s

## Review Focus Areas:
%s
    `,
        o.getQAPrompt(),
        factoryHandover,
        handovers.formatQAContext(),
        handovers.extractQALessons(),
    )
    
    return o.launchAgent(config, prompt)
}
```

## Migration and Evolution Strategy

### Migration from Current Structure

**Phase 1: Directory Structure**
```bash
# Create new directory structure
for featspec in _featstate/*.yaml; do
    FEAT_ID=$(basename "$featspec" .yaml)
    mkdir -p "_featstate/$FEAT_ID"
    
    # Move existing featstate
    mv "$featspec" "_featstate/$FEAT_ID/featstate.json"
done

# Initialize runtime_state.json
echo '{"agents": {}, "features": {}, "system": {}, "updated_at": "'$(date -Iseconds)'"}' > _featstate/runtime_state.json
```

**Phase 2: TaskSpec Separation**
```bash
# Extract TaskSpec handovers to individual files
for feat_dir in _featstate/*/; do
    FEAT_ID=$(basename "$feat_dir")
    
    # Create TaskSpec directories and handover files
    # (Implementation depends on current handover format)
done
```

### Validation and Consistency Checks

**State Validation & Recovery Commands**:
```bash
# Check consistency across all state files
task state-validate  # Comprehensive validation of all state structures

# Auto-fix common inconsistencies  
task state-repair    # Repair orphaned references, format issues, missing fields
```

**Migration Validation Commands**:
```bash
# Dry-run migration with consistency checks
task migrate-validate  # Simulate migration and validate results without changes

# Safety net for migration issues
task migrate-rollback  # Restore previous state structure if migration fails
```

**State Consistency Validation**:
```bash
#!/bin/bash
# validate_state_consistency.sh

# Check runtime_state.json format
jq empty _featstate/runtime_state.json || echo "ERROR: Invalid runtime_state.json"

# Check all featstate.json files
for featstate in _featstate/*/featstate.json; do
    jq empty "$featstate" || echo "ERROR: Invalid $featstate"
done

# Check handover YAML files
for handover in _featstate/*/*/handovers.yaml; do
    yq eval 'true' "$handover" > /dev/null || echo "ERROR: Invalid $handover"
done

echo "State consistency validation complete"
```

## Performance and Scalability Considerations

### File Size Management

**Runtime State Cleanup**:
```go
func (sm *StateManager) cleanupCompletedAgents(olderThan time.Duration) {
    cutoff := time.Now().Add(-olderThan)
    
    for agentName, agent := range sm.runtimeState.Agents {
        if agent.Status == "completed" && 
           agent.EndTime != nil && 
           agent.EndTime.Before(cutoff) {
            delete(sm.runtimeState.Agents, agentName)
        }
    }
}
```

**Handover Archival**:
```bash
# Archive old handovers (optional)
find _featstate -name "handovers.yaml" -mtime +90 -exec gzip {} \;
```

### Concurrent Access Optimization

**Read-Heavy Optimization**:
```go
// Use RWLock for runtime state - frequent reads, infrequent writes
func (sm *StateManager) GetAgentStatus(agentName string) (AgentState, error) {
    sm.globalMutex.RLock()
    defer sm.globalMutex.RUnlock()
    
    agent, exists := sm.runtimeState.Agents[agentName]
    if !exists {
        return AgentState{}, fmt.Errorf("agent not found: %s", agentName)
    }
    
    return agent, nil
}
```

## Conclusion

This file structure architecture provides:

- **Agent Focus**: Clean, relevant context without cross-TaskSpec confusion
- **Operational Efficiency**: High-frequency JSON queries, rich YAML context
- **Concurrent Safety**: Feature-level isolation with atomic operations  
- **Learning Intelligence**: Pattern recognition and TaskSpec optimization
- **Scalable Growth**: Directory-per-feature scales infinitely

The architecture supports both current MVP needs and future advanced features like intelligent agent prompting, automatic TaskSpec splitting, and comprehensive development analytics.

---

*This document serves as the definitive specification for FeatSpec and TaskSpec state management in the djhatch-state project.*