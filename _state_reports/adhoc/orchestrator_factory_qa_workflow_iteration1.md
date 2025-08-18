# Team Orchestrator Factory QA Workflow - Iteration 1 Analysis
# PURPOSE_HASH: ARCH-2025-08-18-ORCHESTRATOR-WORKFLOW-ANALYSIS

## Executive Summary

This document provides architectural analysis of the current implementation state versus the documented team orchestrator hybrid architecture, along with a comprehensive development plan for both djhatch and djhatch-state projects.

## Current State Analysis

### Architecture Document Review

The team orchestrator hybrid architecture document at `/djhatch/_docs/architecture/team-orchestrator-hybrid-architecture-decisions.md` defines:

**Key Decisions:**
- Hybrid Go/Bash architecture: Go for orchestration, Bash for transparent operations  
- Clear project separation: djhatch-state (planning), djhatch (execution)
- Read-only mount: Project state accessible via `project-state-readonly/`
- Communication via structured inputs/outputs and stop hook monitoring

**Planned Structure:**
```
djhatch-state/              # Strategic layer - WHAT to build
├── _specs/                 # Source of truth for specs  
├── _state_agents/          # Planning agents only
├── state-scripts/          # State management scripts
└── current_state.json      # System state tracking

djhatch/                    # Execution layer - HOW to build
├── _agents/                # Implementation agents
├── _orchestration/         # Team orchestrator (Go)
├── _hatch_scripts/         # Operational scripts  
├── _worktrees/            # Agent workspaces
├── project-state-readonly/ # Mount of djhatch-state
└── src/                   # Actual codebase
```

### Current Implementation State

**djhatch-state:**
- ✅ Basic state management structure exists
- ✅ _state_agents/ with architect and featplanner prompts
- ✅ _templates/ with spec templates
- ✅ state-scripts/ with basic management scripts
- ❌ **MISSING**: Go team orchestrator completely
- ❌ **MISSING**: current_state.json system state tracking
- ❌ **MISSING**: project-state-readonly/ mount point

**djhatch:**
- ✅ _agents/ directory with prompt files
- ✅ _hatch_scripts/ with basic POC scripts (poc_launcher.sh, poc_injector.sh)
- ✅ Basic mount script (mount_state_readonly.sh)
- ❌ **MISSING**: _orchestration/ directory with Go implementation
- ❌ **MISSING**: _worktrees/ agent workspaces
- ❌ **MISSING**: Complete script ecosystem for git/tmux operations
- ❌ **MISSING**: Stop hook monitoring system
- ❌ **MISSING**: Agent lifecycle management

## Gap Analysis

### Critical Missing Components

1. **Team Orchestrator Core (Go)**
   - No Go module or source code exists
   - No agent monitoring or lifecycle management
   - No stop hook detection system
   - No state machine implementation

2. **Error Logging and Handling**
   - No centralized logging system
   - No error categorization or recovery
   - No structured error reporting

3. **Agent Communication Protocol**
   - No structured input/output handling
   - No handover summary system
   - No session management

4. **State Management Integration**
   - No real-time state updates
   - No progress tracking
   - No audit trail

## Development Plan

### Phase 1: Foundation & Logging (Priority 1-2 weeks)
**Goal: Basic orchestrator that can launch factory agent and detect completion**

#### 1.1 Error Logging Infrastructure (djhatch)
```bash
# Create logging structure
mkdir -p _logs/{factory,qa,orchestrator,hooks,errors}
mkdir -p _logs/summaries
```

**Tasks:**
- Implement centralized logging system with structured JSON logs
- Create error categorization (CRITICAL, ERROR, WARN, INFO, DEBUG)
- Add log rotation and retention policies
- Implement real-time log streaming for monitoring

#### 1.2 Go Team Orchestrator Minimal Implementation (djhatch)
```bash
# Create Go module structure
mkdir -p _orchestration/{cmd/team-orchestrator,internal/{agent,state,script,logger}}
cd _orchestration
go mod init djhatch/orchestration
```

**Core Components:**
- `internal/logger/` - Structured logging with multiple outputs
- `internal/script/` - Script executor with full transparency  
- `internal/agent/` - Basic agent launcher and monitor
- `cmd/team-orchestrator/main.go` - CLI entry point

**Error Handling Requirements:**
- All operations must be wrapped with error logging
- Failed operations must be recoverable or cleanly aborted
- Errors must include context (TaskSpec ID, agent type, operation)
- Error states must be persistent across restarts

#### 1.3 Essential Scripts Implementation (djhatch)
```bash
# Complete script ecosystem
_hatch_scripts/
├── git/
│   ├── create_worktree.sh      # Safe worktree creation
│   └── remove_worktree.sh      # Cleanup with validation
├── tmux/  
│   ├── launch_session.sh       # Session management
│   └── capture_output.sh       # Log capture
├── agent/
│   ├── launch_factory.sh       # Factory agent launcher
│   └── monitor_stop_hook.sh    # Hook detection
└── mount/
    └── ensure_readonly_mount.sh # Mount validation
```

#### 1.4 Stop Hook Detection System (djhatch)
- Implement fsnotify-based file watching
- Create .stop file convention in _logs/hooks/
- Add hook validation and cleanup
- Implement timeout handling for hung agents

**Phase 1 Success Criteria:**
- ✅ Orchestrator can launch factory agent in tmux session
- ✅ All errors are logged with structured format
- ✅ Stop hook file detection works reliably
- ✅ Factory agent can write summary to _logs/summaries/
- ✅ Basic error recovery (restart failed agents)

### Phase 2: Factory Integration & Summary Workflow (Weeks 2-3)
**Goal: Complete factory agent workflow with summary generation**

#### 2.1 TaskSpec/FeatSpec Integration (djhatch-state)
- Mount djhatch-state as project-state-readonly/ in djhatch
- Implement TaskSpec loading from mounted state
- Create current_state.json with real-time updates
- Add state validation and consistency checks

#### 2.2 Factory Agent Enhancements (djhatch)
- Update factory prompts with summary requirements
- Implement structured handover format
- Add LOC cap validation and enforcement
- Create test execution and validation workflow

#### 2.3 Summary Generation System
**Automatic Summary Path:** Factory agent writes to:
```
_logs/summaries/[TaskSpec-ID]-factory-001.json
```

**Summary Injection Path:** Orchestrator injects prompt:
```
"Create implementation summary and save to _logs/summaries/[TaskSpec-ID]-factory-001.json"
```

**Summary Schema:**
```json
{
  "taskspec_id": "001-TS-2025-08-18-JWT-MIDDLEWARE",
  "agent_type": "factory", 
  "iteration": 1,
  "status": "completed|failed|partial",
  "implementation_files": ["src/auth/middleware.go"],
  "test_results": {"passed": 5, "failed": 0},
  "loc_analysis": {"actual": 150, "cap": 200},
  "next_steps": ["QA validation required"],
  "handover_notes": "JWT middleware implemented with comprehensive tests"
}
```

#### 2.4 Agent Communication Protocol
- Implement structured agent inputs (JSON configuration)
- Add timeout and retry logic for agent operations
- Create agent health checking and monitoring
- Implement graceful shutdown and cleanup

**Phase 2 Success Criteria:**
- ✅ Factory agent receives TaskSpec via mounted state
- ✅ Factory agent completes implementation with tests
- ✅ Stop hook triggers summary generation (automatic or injected)
- ✅ Orchestrator detects and processes summary files
- ✅ All operations have comprehensive error handling

### Phase 3: QA Integration & Multi-Agent Workflow (Weeks 3-4)
**Goal: Complete Factory → QA handover workflow**

#### 3.1 QA Agent Implementation
- Implement QA agent launcher and monitoring
- Create QA-specific logging and summary format
- Add test validation and quality checks
- Implement approval/rejection workflow

#### 3.2 Agent Handover System
- Implement factory → QA context passing
- Create handover validation and verification
- Add rollback capability for failed QA
- Implement decision trees for next actions

#### 3.3 Multi-Session Management
- Support concurrent agent sessions
- Implement session isolation and cleanup
- Add session state persistence across restarts
- Create session monitoring dashboard

#### 3.4 State Synchronization
- Real-time TaskSpec progress updates
- FeatSpec rollup status tracking  
- Implementation evidence tracking
- Audit trail for all agent activities

**Phase 3 Success Criteria:**
- ✅ Factory completes → QA agent automatically launched
- ✅ QA agent receives factory handover summary
- ✅ QA validation results properly logged and processed
- ✅ Failed QA triggers factory retry with context
- ✅ Complete audit trail from TaskSpec → completion

### Phase 4: Production Hardening (Weeks 4-5)
**Goal: Production-ready orchestrator with monitoring**

#### 4.1 Advanced Error Handling
- Implement error recovery strategies
- Add automatic retry with exponential backoff
- Create error escalation and alerting
- Implement graceful degradation modes

#### 4.2 Configuration Management
- YAML-based configuration system
- Environment-specific settings
- Agent-specific parameter tuning
- Resource limit enforcement

#### 4.3 Monitoring and Metrics  
- Real-time orchestrator metrics
- Agent performance tracking
- Resource utilization monitoring
- Success/failure rate analytics

#### 4.4 Testing and Validation
- Unit tests for all Go components
- Integration tests for full workflows
- Error condition testing
- Performance benchmarking

## Implementation Priorities

### Week 1 (Foundation)
1. **DAY 1-2:** Structured logging system + Go module setup
2. **DAY 3-4:** Basic script executor + agent launcher
3. **DAY 5-7:** Stop hook detection + error handling

### Week 2 (Factory Integration)
1. **DAY 1-2:** TaskSpec loading + state mounting 
2. **DAY 3-4:** Factory agent enhancements + summary format
3. **DAY 5-7:** Summary detection + processing workflow

### Week 3 (QA Integration)  
1. **DAY 1-2:** QA agent implementation + handover system
2. **DAY 3-4:** Multi-session management + state sync
3. **DAY 5-7:** Integration testing + bug fixes

### Week 4 (Hardening)
1. **DAY 1-2:** Advanced error handling + configuration
2. **DAY 3-4:** Monitoring + metrics + testing
3. **DAY 5-7:** Documentation + deployment preparation

## Risk Mitigation

### High Risk Items
1. **Stop hook reliability** - Implement multiple detection methods
2. **Agent hanging** - Mandatory timeouts + forced cleanup
3. **State corruption** - Atomic updates + backup/restore
4. **Mount point failures** - Health checks + automatic remount

### Error Recovery Strategies
1. **Agent crashes** - Session restart with last known state
2. **Script failures** - Rollback to safe state + retry
3. **Network issues** - Graceful degradation + offline mode
4. **Resource exhaustion** - Resource monitoring + cleanup

## Architecture Compliance

This plan aligns with the documented hybrid architecture by:
- **Separating concerns**: Go for orchestration, Bash for operations
- **Maintaining transparency**: All system operations visible via scripts
- **Ensuring state separation**: djhatch-state (planning) vs djhatch (execution)
- **Supporting extensibility**: Plugin architecture for new agent types

The phased approach ensures each stage can function independently, enabling incremental deployment and testing while building toward the complete orchestration system.

## Next Steps

1. Begin Phase 1 implementation with logging infrastructure
2. Create detailed technical specifications for each component
3. Set up development environment and testing framework
4. Begin Go module development with proper error handling from day 1

This analysis provides the foundation for building a robust, transparent, and maintainable team orchestrator system that meets all specified requirements while maintaining architectural integrity.