# FeatState Artifact Description

## Overview
A FeatState (Feature State) is a centralized state tracking file that contains all mutable state information for a feature and its associated TaskSpecs. It serves as the single source of truth for progress, status, and execution data while keeping specifications immutable.

## Format
- **File naming**: `NNN-FSTATE-YYYY-MM-DD-DESCRIPTION.yaml`
- **Example**: `001-FSTATE-2025-08-18-USER-AUTH.yaml`
- **Location**: `_specs/featspecs/` (co-located with corresponding FeatSpec)

## Structure

### YAML Frontmatter
```yaml
featspec_id: 001-FS-2025-08-18-USER-AUTH
featspec_title: Implement user authentication system
status: active
updated: 2025-08-18
active_sprint: S4
created: 2025-08-18
```

### Content Sections
1. **Feature-Level State**: Overall progress, timeline, milestones
2. **TaskSpec State Tracking**: Individual task states, progress, test results
3. **Dependencies & Relationships**: Parent/child relationships, external dependencies
4. **Notes & History**: Change log, development notes, decisions

## Key Characteristics

### Mutable Fields
- `status`: Current feature status (draft → planning → active → completed → abandoned)
- `updated`: Last modification date
- `active_sprint`: Current sprint assignment
- All TaskSpec state entries

### Centralized State Storage
All TaskSpecs belonging to this feature store their state here:
- Task status and ownership
- Worktree assignments
- Test coverage and results
- Implementation progress
- QA validation status

## Relationship to Other Artifacts

### Paired FeatSpec
Each FeatState corresponds to exactly one FeatSpec:
- **FeatSpec**: `001-FS-2025-08-18-USER-AUTH.yaml` (immutable specification)
- **FeatState**: `001-FSTATE-2025-08-18-USER-AUTH.yaml` (mutable state)

### Child TaskSpec States
Contains state for all child TaskSpecs:
```yaml
### TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE
task_id: "001-TS-2025-08-18-JWT-MIDDLEWARE"
status: in-progress
owner: developer-name
worktree: "worktrees/card-001-TS-2025-08-18-JWT-MIDDLEWARE"
test_coverage: 85
```

## Feature-Level State Management

### Status Progression
```
draft → planning → active → completed → abandoned
```

### Progress Tracking
- **Overall Progress**: Calculated from TaskSpec completion
- **Timeline Milestones**: Key dates and checkpoints  
- **Sprint Management**: Active sprint and transitions

### Example Feature State
```yaml
## Feature-Level State

### Progress Summary
- **Overall Status**: active
- **Last Updated**: 2025-08-18
- **Active Sprint**: S4
- **Total TaskSpecs**: 3
- **Completed TaskSpecs**: 1
- **Progress**: 33% (1/3)

### Timeline
- **Created**: 2025-08-18
- **Planning Start**: 2025-08-18
- **Development Start**: 2025-08-19
- **QA Start**: 
- **Completed**: 
- **Deployed**: 

### Milestones
- [x] Initial planning complete
- [x] All TaskSpecs defined
- [x] Development started
- [ ] Core functionality complete
- [ ] Integration testing complete
- [ ] QA approved
- [ ] Production ready
```

## TaskSpec State Management

### Individual Task State
Each TaskSpec gets a dedicated state section:

```yaml
### TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE
task_id: "001-TS-2025-08-18-JWT-MIDDLEWARE"
task_title: "Add JWT middleware for authentication"
status: in-progress
owner: john-developer
worktree: "worktrees/card-001-TS-2025-08-18-JWT-MIDDLEWARE"
loc_cap: 200
coverage_cap: 80
purpose_hash: "abc123def456"
merged_date: ""
sprint: S4
created: 2025-08-18
updated: 2025-08-19
parent_featspec: "001-FS-2025-08-18-USER-AUTH"
type: "feature"

# Implementation Progress
implementation_checklist:
  - [x] Add failing tests for JWT token validation
  - [x] Add failing tests for user context extraction
  - [ ] Add failing tests for error handling
  - [ ] Implement JWT middleware with proper error handling
  - [ ] Integrate middleware with existing router configuration
  - [ ] Update parent FeatSpec state tracking
  - [ ] Commit with trailer TaskSpec status=qa

# QA Progress  
qa_checklist:
  - [ ] Review test coverage & LoC cap
  - [ ] Verify integration with parent FeatSpec
  - [ ] Security review of JWT validation logic
  - [ ] Performance test middleware overhead
  - [ ] If pass, commit trailer TaskSpec status=done

# Test Results
test_coverage: 85
test_results: "15/15 tests passing"
lint_status: "clean"
build_status: "success"
```

### State Transitions
TaskSpec status progression:
```
draft → in-progress → qa → done
```

## Automatic State Management

### TaskSpec Creation
When a new TaskSpec is created:
1. New state section added to parent FeatState
2. Default values populated from TaskSpec metadata
3. Progress counters updated
4. Timeline updated

### State Updates
State updates trigger:
- Progress percentage recalculation
- Milestone status updates
- Timeline adjustments
- Dependency validation

## Example Complete FeatState

```yaml
---
featspec_id: 001-FS-2025-08-18-USER-AUTH
featspec_title: Implement user authentication system
status: active
updated: 2025-08-19
active_sprint: S4
created: 2025-08-18
---

## Feature-Level State

### Progress Summary
- **Overall Status**: active
- **Last Updated**: 2025-08-19
- **Active Sprint**: S4
- **Total TaskSpecs**: 3
- **Completed TaskSpecs**: 1
- **Progress**: 33% (1/3)

### Timeline
- **Created**: 2025-08-18
- **Planning Start**: 2025-08-18
- **Development Start**: 2025-08-19
- **QA Start**: 
- **Completed**: 
- **Deployed**: 

### Milestones
- [x] Initial planning complete
- [x] All TaskSpecs defined
- [x] Development started
- [ ] Core functionality complete
- [ ] Integration testing complete
- [ ] QA approved
- [ ] Production ready

## TaskSpec State Tracking

### TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE
task_id: "001-TS-2025-08-18-JWT-MIDDLEWARE"
task_title: "Add JWT middleware for authentication"
status: done
owner: john-developer
worktree: ""
loc_cap: 200
coverage_cap: 80
purpose_hash: "abc123def456"
merged_date: "2025-08-19"
sprint: S4
created: 2025-08-18
updated: 2025-08-19

# Implementation Progress
implementation_checklist:
  - [x] Add failing tests for JWT token validation
  - [x] Add failing tests for user context extraction
  - [x] Add failing tests for error handling
  - [x] Implement JWT middleware with proper error handling
  - [x] Integrate middleware with existing router configuration
  - [x] Update parent FeatSpec state tracking
  - [x] Commit with trailer TaskSpec status=qa

# QA Progress  
qa_checklist:
  - [x] Review test coverage & LoC cap
  - [x] Verify integration with parent FeatSpec
  - [x] Security review of JWT validation logic
  - [x] Performance test middleware overhead
  - [x] If pass, commit trailer TaskSpec status=done

# Test Results
test_coverage: 88
test_results: "20/20 tests passing"
lint_status: "clean"
build_status: "success"

### TaskSpec: 002-TS-2025-08-18-AUTH-ROUTES
task_id: "002-TS-2025-08-18-AUTH-ROUTES"
task_title: "Implement authentication API routes"
status: in-progress
owner: jane-developer
worktree: "worktrees/card-002-TS-2025-08-18-AUTH-ROUTES"
# ... additional state details

## Dependencies & Relationships

### Parent Relationships
- **Part of Feature**: 001-FS-2025-08-18-USER-AUTH

### Child Relationships
- **TaskSpecs**: 
  - 001-TS-2025-08-18-JWT-MIDDLEWARE (done)
  - 002-TS-2025-08-18-AUTH-ROUTES (in-progress)
  - 999-TS-2025-08-18-AUTH-INTEGRATION (draft)

### External Dependencies
- **Blocked by**: []
- **Blocking**: ["002-FS-2025-08-20-USER-PROFILE"]
- **Related Features**: []

## Notes & History

### Change Log
- 2025-08-18: Initial FeatState created
- 2025-08-19: JWT middleware TaskSpec completed
- 2025-08-19: Auth routes TaskSpec started

### Notes
- Security review completed for JWT implementation
- Performance testing shows acceptable middleware overhead
- Integration testing framework needs setup before final TaskSpec
```

## Management Operations

### Viewing State
```bash
# Show specific feature state
task featstate-show FEATSPEC=001-FS-2025-08-18-USER-AUTH
```

### State Updates
State updates typically happen through:
1. TaskSpec creation (automatic)
2. Development progress updates (manual/automated)
3. Status transitions (workflow-driven)
4. Test result updates (CI integration)

## Best Practices

1. **Centralized updates**: All TaskSpec state changes update the parent FeatState
2. **Atomic operations**: State changes should be consistent and complete
3. **History preservation**: Maintain change log for audit trail
4. **Progress accuracy**: Keep completion percentages current
5. **Timeline maintenance**: Update milestones as progress occurs
6. **Dependency tracking**: Monitor blocking/blocked relationships