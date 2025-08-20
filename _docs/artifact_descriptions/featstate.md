# FeatState Artifact Description

## Overview
A FeatState (Feature State) is a dual-format state management system that separates operational runtime state from rich development context and history. It implements a directory-per-feature architecture with TaskSpec-isolated handover files to prevent agent confusion while preserving learning context.

## Architecture
The FeatState system uses three file types in a structured directory approach:

### Directory Structure
```
_featstate/
├── runtime_state.json                                    # Global agent runtime state
├── {FEATURE_ID}/
│   ├── featstate.json                                   # Feature progression data
│   ├── {TASKSPEC_ID}/
│   │   └── handovers.yaml                              # TaskSpec-specific context
│   └── {TASKSPEC_ID}/
│       └── handovers.yaml                              # TaskSpec-specific context
```

## File Types

### 1. runtime_state.json - Global Agent Runtime State

**Purpose**: High-frequency operational state for active agent monitoring and orchestrator coordination.

**Location**: `_featstate/runtime_state.json`

**Update Frequency**: Every 5 seconds during active agent execution

**Key Features**:
- Real-time agent status tracking
- System-wide operational state
- Concurrent orchestrator coordination
- Timeout detection and recovery support

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
      "taskspec": "001-TS-2025-08-18-TASKSPEC-VALIDATION",
      "feature_spec": "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS",
      "worktree": "_worktrees/factory-001-TS-2025-08-18-TASKSPEC-VALIDATION",
      "iteration": 1,
      "tmux_session": "factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1",
      "log_path": "_logs/factory-001-TS-2025-08-18-TASKSPEC-VALIDATION-1.log"
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
  "updated_at": "2025-08-20T14:30:00Z"
}
```

### 2. featstate.json - Feature Progression Data

**Purpose**: Feature-level progression tracking with TaskSpec completion metrics and cross-TaskSpec pattern intelligence.

**Location**: `_featstate/{FEATURE_ID}/featstate.json`

**Update Frequency**: On TaskSpec state transitions (start, complete, fail)

**Key Features**:
- Progress tracking and analytics
- Cross-TaskSpec pattern recognition
- TaskSpec splitting recommendations
- Cycle time and success rate metrics

**Structure**:
```json
{
  "feature": {
    "id": "001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS",
    "title": "POC Orchestrator Enhancements",
    "status": "in_progress",
    "created": "2025-08-18T10:00:00Z",
    "updated": "2025-08-20T14:30:00Z",
    "progress": {
      "total_taskspecs": 3,
      "completed_taskspecs": 1,
      "completion_percentage": 33.3
    },
    "metrics": {
      "avg_cycle_time_hours": 3.25,
      "success_rate": 75.0,
      "first_pass_success_rate": 50.0
    }
  },
  "taskspecs": {
    "001-TS-2025-08-18-TASKSPEC-VALIDATION": {
      "status": "completed",
      "total_cycle_time_hours": 3.42,
      "factory_iterations": [
        {
          "iteration": 1,
          "started": "2025-08-18T14:00:00Z",
          "completed": "2025-08-18T16:30:00Z",
          "outcome": "completed",
          "loc_changed": 187,
          "coverage_achieved": 95.2
        }
      ],
      "qa_iterations": [
        {
          "iteration": 1,
          "outcome": "approved",
          "issues_found": 0
        }
      ]
    }
  },
  "cross_taskspec_patterns": {
    "common_issues": [
      "State management tasks consistently struggle with concurrency",
      "Coverage gaps typically in error handling paths"
    ],
    "success_patterns": [
      "Validation tasks succeed when comprehensive test data provided"
    ]
  }
}
```

### 3. handovers.yaml - TaskSpec-Specific Development Context

**Purpose**: Rich development context and handover history isolated per TaskSpec to prevent agent confusion while preserving learning context.

**Location**: `_featstate/{FEATURE_ID}/{TASKSPEC_ID}/handovers.yaml`

**Update Frequency**: On agent completion (factory/QA handovers)

**Key Features**:
- Focused TaskSpec-only context
- Factory and QA handover preservation
- Implementation lessons learned
- TaskSpec splitting context for future decisions

**Structure**:
```yaml
taskspec_id: 002-TS-2025-08-18-STATE-LOGGING
feature_id: 001-FS-2025-08-18-POC-ORCHESTRATOR-ENHANCEMENTS
updated: 2025-08-19T14:30:00Z

factory_handovers:
  - iteration: 1
    agent_name: factory-002-TS-2025-08-18-STATE-LOGGING-1
    timestamp: 2025-08-19T12:30:00Z
    outcome: completed
    summary: |
      **State Logging Implementation - Iteration 1**
      
      Implemented JSON-based state persistence but encountered concurrency challenges.
      
      **Lessons Learned:**
      - State management TaskSpecs consistently underestimate concurrency complexity
      - Explicit concurrency requirements should be added to spec templates
    
    technical_details:
      loc_added: 145
      coverage: 72.0
      critical_gaps: ["concurrent_access_testing", "error_path_coverage"]

qa_handovers:
  - iteration: 1
    agent_name: qa-002-TS-2025-08-18-STATE-LOGGING-1
    timestamp: 2025-08-19T14:30:00Z
    decision: rejected
    summary: |
      **QA Rejection - Concurrency and Coverage Issues**
      
      Critical issues found:
      1. Race conditions in state updates - CRITICAL
      2. Test coverage below requirement (72.0% < 80%) - CRITICAL
      
      **Rework Guidance:**
      - Add mutex/RWLock protection for concurrent state access
      - Achieve minimum 80% test coverage including error paths

lessons_learned:
  implementation_patterns:
    - "State logging requires explicit concurrency design from start"
    - "Coverage requirements must explicitly include error handling paths"
  
  common_mistakes:
    - "Treating concurrency as implementation detail rather than requirement"
    - "Focusing on happy path testing, neglecting error scenarios"

splitting_context:
  complexity_indicators:
    - "Multiple factory iterations required (2+)"
    - "Concurrency concerns suggest architectural complexity"
  
  potential_splits:
    - taskspec: "002A-TS-BASIC-STATE-LOGGING"
      scope: "Single-threaded state logging with basic JSON persistence"
      estimated_effort: "0.5 week"
```

## Key Architectural Benefits

### Agent Focus
- **Clean Context**: Agents receive only relevant TaskSpec-specific context
- **No Confusion**: Isolated handovers prevent cross-TaskSpec contamination
- **Focused Learning**: Lessons learned are TaskSpec-specific and actionable

### Operational Efficiency
- **High-Frequency Queries**: JSON runtime state optimized for 5-second polling
- **Rich Context**: YAML handovers provide comprehensive development history
- **Concurrent Safety**: Feature-level isolation enables parallel development

### Learning Intelligence
- **Pattern Recognition**: Cross-TaskSpec patterns identified in featstate.json
- **Split Recommendations**: Data-driven TaskSpec splitting suggestions
- **Context Evolution**: Historical handovers inform future implementations

### Scalability
- **Directory-per-Feature**: Scales infinitely without single file bottlenecks
- **Atomic Operations**: TaskSpec-level isolation prevents conflicts
- **Granular Backup**: Feature and TaskSpec level backup/restore capabilities

## Usage Patterns

### Orchestrator Integration
```go
// Load focused TaskSpec context for agents
handovers := orchestrator.loadTaskSpecHandovers(taskSpecID)

// Monitor agent status via runtime state
status := orchestrator.checkAgentStatus(agentName)

// Update feature progression metrics
orchestrator.updateFeatState(featureID, progressUpdate)
```

### Agent Context Access
```bash
# Agent accesses only current TaskSpec context
cat _featstate/001-FS-2025-08-18-POC/002-TS-2025-08-18-STATE-LOGGING/handovers.yaml

# Previous iteration lessons for current TaskSpec only
yq '.lessons_learned.implementation_patterns[]' handovers.yaml
```

### Analytics and Monitoring
```bash
# Feature completion status
jq '.feature.progress.completion_percentage' featstate.json

# Cross-TaskSpec pattern analysis
jq '.cross_taskspec_patterns.common_issues[]' featstate.json

# Active agent monitoring
jq '.agents | to_entries[] | select(.value.status == "running")' runtime_state.json
```

## State Management Operations

### Directory Initialization
New features automatically get:
1. Feature directory: `_featstate/{FEATURE_ID}/`
2. Empty featstate.json with basic structure
3. TaskSpec subdirectories created on-demand

### State Updates
- **Runtime State**: Atomic JSON updates with temp file + rename pattern
- **Feature State**: Updated on TaskSpec transitions and completions
- **Handovers**: Append-only YAML updates per TaskSpec completion

### Concurrent Access Safety
- Feature-level locking for featstate.json updates
- Global mutex for runtime_state.json coordination
- TaskSpec-level isolation prevents handover conflicts

## Migration from Legacy FeatState

### Phase 1: Directory Structure Migration
```bash
# Convert existing YAML FeatStates to new directory structure
for featstate in _featstate/*.yaml; do
    FEAT_ID=$(basename "$featstate" .yaml)
    mkdir -p "_featstate/$FEAT_ID"
    # Convert and migrate content
done
```

### Phase 2: Data Format Migration
- Extract TaskSpec states to individual featstate.json entries
- Create empty handover files for future development context
- Initialize runtime_state.json with current active agents

## Best Practices

### Agent Context Provision
- **Default**: Provide only current TaskSpec handovers to prevent confusion
- **Enhanced**: Orchestrator can selectively add related patterns when beneficial
- **Focused Learning**: Keep lessons learned specific to current TaskSpec challenges

### State Consistency
- Use atomic file operations for all updates
- Validate JSON/YAML format after each update
- Maintain referential integrity between runtime and feature state

### Performance Optimization
- Clean up completed agents from runtime_state.json periodically
- Archive old handover files for long-term storage
- Use read locks for frequent runtime state queries

## Related Artifacts

### Paired FeatSpec
Each FeatState directory corresponds to one FeatSpec:
- **FeatSpec**: `001-FS-2025-08-18-POC.yaml` (immutable specification)
- **FeatState**: `001-FS-2025-08-18-POC/` (mutable state directory)

### Child TaskSpec Integration
- TaskSpec handovers stored in isolated subdirectories
- TaskSpec metrics aggregated in parent featstate.json
- Cross-TaskSpec patterns identified and preserved

---

*For complete architectural details, see: `_docs/architecture/featspec_and_taskspec_state_filestructure.md`*