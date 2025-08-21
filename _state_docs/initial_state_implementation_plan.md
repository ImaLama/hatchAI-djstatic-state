# Initial State Implementation Plan

## Overview

This document outlines the comprehensive architectural plan for creating a state management system for the djhatch implementation. The system will separate immutable specifications from mutable state, providing clean separation of concerns while maintaining compatibility with existing hatchAI-devcards patterns.

## Current State Analysis

### FeatCard Structure (featcard_v1.yaml)
- Contains metadata: id, title, status, created, updated, sprint
- DevCards table tracking associated tasks
- User Description with feature overview, value, stories, acceptance criteria
- Planner Breakdown with technical approach, architecture impact, dependencies, risks, testing, rollout

### DevCard Structure (devcard_v4.md)
- Contains state-heavy metadata: id, title, status, sprint, owner, loc_cap, coverage_cap, worktree, depends_on, purpose_hash, merged_date
- Structured content sections: Context, Objectives, Non-Goals, Design Constraints, Implementation/QA Checklists, Post-Merge Tasks

## Architectural Strategy

### 1. State Separation Strategy

**New Structure Design:**
- **featspec.yaml** - Pure specification (no state/progress tracking)
- **taskspec.yaml** - Pure specification (no state/progress tracking)  
- **featstate.yaml** - All state management centralized per feature

**Key Architectural Principles:**
- **Separation of Concerns**: Specifications remain immutable, state changes independently
- **Single Source of Truth**: One featstate file per feature contains all related state
- **Backward Compatibility**: New structure mirrors existing templates but cleanly separated
- **Traceability**: Clear relationships between specs and state

### 2. File Structure Design

```
djhatch-state/
├── _templates/
│   ├── featspec.yaml          # Feature specification template
│   ├── taskspec.yaml          # Task specification template  
│   ├── featstate.yaml         # Feature state template
│   └── adr.md                 # Copied ADR template
├── _docs/
│   ├── artifact_descriptions/ # Documentation with examples
│   │   ├── featspec.md
│   │   ├── taskspec.md
│   │   ├── featstate.md
│   │   └── readonly-mount.md  # Documentation for codebase access
│   └── ADR/
│       └── 001-ADR-YYYY-MM-DD-STATE-SEPARATION.md
├── _specs/
│   ├── .featspec_sequence     # Sequential counter
│   ├── .taskspec_sequence     # Sequential counter  
│   ├── feat_specs/
│   │   ├── 001-FS-2025-08-18-USER-AUTH.yaml
│   │   └── 001-FSTATE-2025-08-18-USER-AUTH.yaml
│   └── task_specs/
│       ├── 001-TS-2025-08-18-JWT-MIDDLEWARE.yaml
│       └── 002-TS-2025-08-18-AUTH-ROUTES.yaml
├── Taskfile.yml              # New task automation
├── scripts/
│   ├── new_featspec.sh        # Mirror new_featcard.sh logic
│   └── new_taskspec.sh        # Mirror new_devcard.sh logic
└── djhatch-readonly-mount/ # Read-only mount of ../djhatch
    └── [mounted djhatch content]
```

### 3. Template Mappings

**featspec.yaml** (from featcard_v1.yaml):
- Retains: id, title, created, sprint (immutable)
- Removes: status, updated (moves to featstate)
- Retains: All content sections (User Description, Planner Breakdown)
- Removes: DevCards table status/progress (spec shows structure only)

**taskspec.yaml** (from devcard_v4.md):  
- Retains: id, title, sprint, depends_on, loc_cap, coverage_cap, parent_featspec (immutable)
- Removes: status, owner, worktree, purpose_hash, merged_date (moves to parent featstate)
- Retains: All content sections (Context, Objectives, etc.)
- Removes: All progress checklists (moves to parent featstate)
- Requires: parent_featspec field linking to parent feature

**featstate.yaml** (new):
- Feature-level state: status, updated, active_sprint
- Task-level state arrays: all taskspec states for this feature (task progress, worktrees, owners, completion dates)
- Progress tracking: checklists, test results, QA status per task
- Timeline data: start dates, milestones, completion tracking
- Centralized state storage: all taskspecs belonging to this featspec store their state here

### 4. Infrastructure Requirements

**Read-Only Codebase Access:**
- **Requirement**: Create read-only mount of `./djhatch` accessible at `./djhatch-state/djhatch-readonly-mount`
- **Purpose**: Provides state management system with read-only access to implementation codebase
- **Architecture**: Separation between mutable state management and immutable codebase reference

**Integration Points:**
- State files can reference specific files/functions in readonly mount
- Analysis tools can validate implementation against specifications
- Progress tracking can verify completed tasks against readonly codebase
- Feature state can track which codebase files are affected by feature

### 5. Unique Sequential Numbering System (Updated)

**Current Implementation Analysis:**

**FeatCard Numbering (existing - suffix format):**
- Format: `FC-YYYY-MM-DD-DESCRIPTION-001` (three-digit suffix)
- Sequential counter in `_featcards/.featcard_sequence` starting at 001
- Thread-safe atomic locking with `.featcard_sequence.lock`
- Date must be TODAY (no arbitrary dates)
- DESCRIPTION: uppercase, hyphens only

**DevCard Numbering (existing - suffix format):**
- Format: `DC-YYYY-MM-DD-DESCRIPTION-074` (three-digit suffix)
- Sequential counter in `cards/.devcard_sequence` starting at 074
- Same atomic locking mechanism
- Date must be TODAY (no arbitrary dates)
- DESCRIPTION: uppercase, hyphens only

**New System Requirements (Updated Format - All Numbered Files Use Three-Digit Prefix):**
- **featspec.yaml**: `001-FS-YYYY-MM-DD-DESCRIPTION` (three-digit prefix)
- **taskspec.yaml**: `001-TS-YYYY-MM-DD-DESCRIPTION` (three-digit prefix)
- **featstate.yaml**: `001-FSTATE-YYYY-MM-DD-DESCRIPTION` (identical numbering and description as featspec, only FS→FSTATE differs)
- **ADR files**: `001-ADR-YYYY-MM-DD-DESCRIPTION` (three-digit prefix for consistency)

**Sequential Files:**
- `_specs/.featspec_sequence` - starts at 001
- `_specs/.taskspec_sequence` - starts at 001
- `_docs/ADR/.adr_sequence` - starts at 001 (for ADR numbering consistency)

**Atomic Locking:**
- Thread-safe increments using lock files
- Same pattern as existing implementation

**Validation:**
- Date must be TODAY (no backdating)
- DESCRIPTION format validation
- File existence checks

### 6. Taskfile Implementation

**New Taskfile Structure (mirrors hatchAI-devcards Makefile pattern):**
```yaml
version: '3'

tasks:
  featspec-new:
    desc: "Create new featspec with sequential numbering (creates both spec and state files)"
    # Mirrors: make featcard-new from hatchAI-devcards/Makefile
    cmds:
      - ./scripts/new_featspec.sh
      
  taskspec-new:
    desc: "Create new taskspec with sequential numbering (requires parent featspec, adds entry to parent featstate)" 
    # Mirrors: make devcard-new from hatchAI-devcards/Makefile
    cmds:
      - ./scripts/new_taskspec.sh
```

**Numbering System Components:**
1. **Sequential Files:**
   - `_specs/.featspec_sequence` - starts at 001
   - `_specs/.taskspec_sequence` - starts at 001

2. **Atomic Locking:**
   - Thread-safe increments using lock files
   - Same pattern as existing implementation

3. **Validation:**
   - Date must be TODAY (no backdating)
   - DESCRIPTION format validation
   - File existence checks
   - Parent featspec validation for taskspecs (must exist)
   - Automatic state entry creation in parent featstate file

### 7. Benefits of This Architecture

**Positive Consequences:**
- ✅ Clean separation enables independent versioning of specs vs. state
- ✅ Immutable specifications provide stable contracts
- ✅ Centralized state per feature simplifies progress tracking
- ✅ Supports multiple teams working on same feature specs
- ✅ State can be regenerated/reset without losing specification
- ✅ Better audit trails and change tracking
- ✅ **Consistency**: Same numbering pattern as existing hatchAI-devcards (with prefix update)
- ✅ **Familiar UX**: Users understand existing ID formats
- ✅ **Thread Safety**: Proven atomic increment mechanism  
- ✅ **Date Validation**: Prevents arbitrary date assignment
- ✅ **Collision Prevention**: Sequential numbering eliminates ID conflicts
- ✅ **Immutable Reference**: State management can reference implementation without modification risk
- ✅ **Version Consistency**: State tracking references specific codebase snapshots
- ✅ **Safe Analysis**: Tools can analyze codebase structure without write permissions
- ✅ **Clear Boundaries**: Physical separation between state management and implementation
- ✅ **Audit Trail**: All codebase references are read-only and traceable

**Trade-offs:**
- ↔️ Slight complexity increase with multiple files per feature
- ↔️ Requires coordination between spec and state updates
- ↔️ New learning curve for existing users

**Integration with Existing System:**
The read-only mount requirement strengthens the architectural separation and provides a safe, consistent interface between the state management system and the actual implementation codebase.

## Implementation Requirements

### Core Components:
1. **featspec.yaml** - Pure specifications (no state)  
2. **taskspec.yaml** - Pure specifications (no state)
3. **featstate.yaml** - Centralized state per feature
4. **Taskfile.yml** - Automation with `featspec-new` and `taskspec-new` methods
5. **Sequential numbering** - Thread-safe, mirrors existing system with prefix format
6. **Read-only mount** - `./djhatch` → `./djhatch-state/djhatch-readonly-mount`
7. **Templates and documentation** - Complete artifact descriptions and ADR

### Implementation Tasks:
1. Create featspec.yaml template in _templates (mirrors featcards structure minus state)
2. Create taskspec.yaml template in _templates (mirrors devcards structure minus state)
3. Create featstate.yaml template in _templates (contains all extracted state)
4. Create Taskfile with methods: a) create new featspec (creates both spec and state files), b) create new taskspec (requires parent featspec, adds state entry to parent), c) implement numbering system
5. Copy ADR template from hatchAI-devcards/_templates/adr.md to _templates/
6. Document artifact descriptions in _docs/artifact_descriptions with examples
7. Create ADR documenting the state separation architecture decision
8. Document read-only mount requirement: ./djhatch accessible at ./djhatch-state/djhatch-readonly-mount

## Conclusion

This architecture provides a robust foundation for state management while maintaining compatibility with existing hatchAI-devcards patterns and ensuring safe, scalable operations. The clean separation between immutable specifications and mutable state enables better team collaboration, progress tracking, and system maintainability.

The updated numbering system with three-digit prefixes provides clear sequencing while maintaining the familiar date-based organization structure. **ALL numbered files consistently use three-digit prefixes:**
- featspec: `001-FS-YYYY-MM-DD-DESCRIPTION`
- taskspec: `001-TS-YYYY-MM-DD-DESCRIPTION`  
- featstate: `001-FSTATE-YYYY-MM-DD-DESCRIPTION` (identical numbering/description as featspec, only prefix differs)
- ADR files: `001-ADR-YYYY-MM-DD-DESCRIPTION` (consistent three-digit prefix for all documentation)