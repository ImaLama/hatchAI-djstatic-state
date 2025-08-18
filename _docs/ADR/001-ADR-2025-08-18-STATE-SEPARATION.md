---
id: 001-ADR-2025-08-18-STATE-SEPARATION
title: Separate Immutable Specifications from Mutable State
status: accepted
created: 2025-08-18
updated: 2025-08-18
authors: [architect-agent]
tags: [architecture, decision, state-management, specifications]
---

# ADR: Separate Immutable Specifications from Mutable State

## Status
Accepted

## Context
The hatchAI-devcards system combines specification information (feature requirements, task descriptions) with state information (progress, ownership, test results) in the same files. This creates several challenges:

### Current System Issues
- **Mixed concerns**: Specification content mixed with progress tracking
- **Change conflicts**: Multiple teams updating same files for different reasons
- **Version control noise**: State changes clutter specification history
- **Audit complexity**: Difficult to separate requirement changes from progress updates
- **Collaboration friction**: Specification authors and implementers conflict on same files
- **State reset difficulty**: Cannot easily reset progress without losing specifications

### Business Requirements
- Need to maintain feature and task specifications independently of their implementation state
- Multiple teams need to collaborate on the same features without file conflicts  
- Progress tracking and state management must be centralized per feature
- System must support state reset and recovery without losing requirements
- Clear audit trail needed for specification changes vs. progress updates

### Technical Context
- Current system: FeatCards and DevCards combine spec + state in single files
- Existing numbering system: Suffix-based sequential numbering (FC/DC-YYYY-MM-DD-DESCRIPTION-NNN)
- Proven workflow patterns: Sequential numbering, atomic locking, template-based creation
- Integration needs: Must work with existing development workflows and tooling

## Decision
Implement a clean separation between immutable specifications and mutable state through three distinct artifact types:

### 1. FeatSpec (Feature Specifications)
- **Purpose**: Immutable feature requirements and planning
- **Format**: `NNN-FS-YYYY-MM-DD-DESCRIPTION.yaml`
- **Content**: User stories, acceptance criteria, technical approach, architecture impact
- **Lifecycle**: Created once, minimal changes after creation
- **Ownership**: Product/Architecture teams

### 2. TaskSpec (Task Specifications)  
- **Purpose**: Immutable task implementation requirements
- **Format**: `NNN-TS-YYYY-MM-DD-DESCRIPTION.yaml`
- **Content**: Implementation requirements, acceptance criteria, constraints, checklists
- **Lifecycle**: Created once, minimal changes after creation
- **Ownership**: Development teams
- **Relationship**: Must reference parent FeatSpec

### 3. FeatState (Feature State Tracking)
- **Purpose**: Centralized mutable state for feature and all its tasks
- **Format**: `NNN-FSTATE-YYYY-MM-DD-DESCRIPTION.yaml` (matches FeatSpec naming)
- **Content**: Progress tracking, test results, ownership, timelines, TaskSpec states
- **Lifecycle**: Continuously updated throughout development
- **Ownership**: Shared across all teams working on the feature

### Key Design Principles
1. **Separation of Concerns**: Specifications define "what", state tracks "how/when/who"
2. **Immutable Specifications**: Requirements remain stable, changes are exceptional
3. **Centralized State**: All related state stored in single FeatState file per feature
4. **Parent-Child Hierarchy**: TaskSpecs belong to FeatSpecs, states roll up accordingly
5. **Consistent Numbering**: Three-digit prefix numbering for all artifacts (NNN-PREFIX-...)

## Consequences

### Positive
- ✅ **Clear separation**: Specification changes vs. progress updates are distinct
- ✅ **Reduced conflicts**: Teams can update state without touching specifications  
- ✅ **Better collaboration**: Multiple developers can update TaskSpec states independently
- ✅ **Audit clarity**: Clean history of requirement changes vs. progress updates
- ✅ **State management**: Can reset/restore state without losing requirements
- ✅ **Version control**: Cleaner commit history with logical separation
- ✅ **Scalability**: Centralized state per feature reduces file proliferation
- ✅ **Consistency**: Unified numbering system across all artifact types
- ✅ **Traceability**: Clear parent-child relationships between features and tasks

### Negative
- ❌ **Complexity increase**: Three file types instead of two
- ❌ **Coordination overhead**: Must keep FeatSpec and TaskSpec aligned with FeatState
- ❌ **Learning curve**: New concepts and workflows for existing users
- ❌ **Tool updates**: Existing automation must be adapted for new structure
- ❌ **Migration effort**: Existing FeatCards/DevCards need to be split

### Neutral
- ↔️ **File count increase**: More files but better organization
- ↔️ **Workflow changes**: Different creation patterns but similar end results
- ↔️ **Tool complexity**: Individual tools simpler, but need coordination

## Alternatives Considered

### Option 1: Keep Current Mixed System
- **Pros**: No migration needed, familiar to users
- **Cons**: Continues all existing problems, doesn't scale with team growth
- **Why rejected**: Doesn't solve the core collaboration and state management issues

### Option 2: Separate State in Same Files
- **Pros**: Single file per feature/task, easier to navigate
- **Cons**: Still mixes concerns, doesn't solve collaboration issues
- **Why rejected**: Doesn't provide clean separation benefits

### Option 3: Database-Driven State Management
- **Pros**: Centralized state, query capabilities, concurrent access
- **Cons**: Infrastructure complexity, breaks file-based workflow, harder to version control
- **Why rejected**: Too much architectural change, breaks existing workflow patterns

### Option 4: External State Tracking Tools
- **Pros**: Leverages existing project management tools
- **Cons**: Creates dependency on external systems, breaks integrated workflow
- **Why rejected**: Loses integration benefits with development workflow

## Implementation

### High-Level Approach
1. **Create templates** for FeatSpec, TaskSpec, and FeatState artifacts
2. **Implement creation scripts** mirroring existing FeatCard/DevCard patterns
3. **Build Taskfile automation** for consistent creation workflows
4. **Establish numbering system** with three-digit prefixes for consistency
5. **Document artifacts** with comprehensive examples and usage patterns
6. **Create migration strategy** for existing FeatCards/DevCards

### Migration Strategy
- **Parallel operation**: New system alongside existing system initially
- **Gradual adoption**: New features use new system, existing features migrate over time
- **Automated splitting**: Tools to separate existing cards into spec + state files
- **Validation**: Ensure no data loss during migration process

### Timeline Considerations
- **Phase 1** (Immediate): Core templates, scripts, and documentation
- **Phase 2** (Short term): Migration tools and validation
- **Phase 3** (Medium term): Full transition and legacy system removal

### DevCards Needed
- Template creation and validation
- Script implementation with atomic numbering
- Documentation and example creation
- Migration tool development
- Integration testing and validation

## References
- Original hatchAI-devcards implementation patterns
- Sequential numbering system analysis
- Team collaboration requirements
- State management best practices
- File-based workflow preservation needs