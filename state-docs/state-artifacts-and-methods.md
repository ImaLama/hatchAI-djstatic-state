# State Artifacts and Methods

## Overview
This document catalogs all artifacts, methods, and files created as part of the djhatch state management system implementation. The system provides clean separation between immutable specifications and mutable state tracking.

## Created Artifacts

### Templates (`_templates/`)

| File | Purpose | Based On |
|------|---------|----------|
| `featspec.yaml` | Feature specification template | hatchAI-devcards featcard_v1.yaml |
| `taskspec.yaml` | Task specification template | hatchAI-devcards devcard_v4.md |
| `featstate.yaml` | Feature state tracking template | New centralized state design |
| `adr.md` | Architecture Decision Record template | hatchAI-devcards adr.md |

### State Management Scripts (`state-scripts/`)

| File | Purpose | Mirrors |
|------|---------|---------|
| `new_featspec.sh` | Create new featspec + featstate | hatchAI-devcards new_featcard.sh |
| `new_taskspec.sh` | Create new taskspec + update parent state | hatchAI-devcards new_devcard.sh |
| `check_loc_caps.sh` | Check LOC caps with type-based limits and weighted calculation | hatchAI-devcards check_loc_caps.sh |

### Documentation (`_docs/`)

#### Artifact Descriptions (`_docs/artifact_descriptions/`)
| File | Purpose |
|------|---------|
| `featspec.md` | Complete FeatSpec documentation with examples |
| `taskspec.md` | Complete TaskSpec documentation with examples |
| `featstate.md` | Complete FeatState documentation with examples |
| `readonly-mount.md` | Read-only mount setup and usage documentation |

#### Architecture Decisions (`_docs/ADR/`)
| File | Purpose |
|------|---------|
| `001-ADR-2025-08-18-STATE-SEPARATION.md` | Documents the state separation architecture decision |

### Automation (`Taskfile.yml`)
| Task | Purpose | Parameters |
|------|---------|------------|
| `featspec-new` | Create new feature specification and state files | `DESCRIPTION`, `TITLE`, `SPRINT` |
| `taskspec-new` | Create new task specification and update parent state | `DESCRIPTION`, `TITLE`, `PARENT_FEATSPEC`, `TYPE`, `SPRINT`, `LOC_CAP`, `COVERAGE_CAP`, `DEPENDENCIES` |
| `featspec-list` | List all feature specifications | None |
| `taskspec-list` | List all task specifications | None |
| `featstate-show` | Show state for specific feature | `FEATSPEC` |
| `loc-check` | Check lines of code against TaskSpec caps with type-based limits | None |
| `setup` | Initialize directory structure and sequences | None |
| `show-env` | Display environment information | None |

### Planning Documentation (`_state_docs/`)
| File | Purpose |
|------|---------|
| `initial_state_implementation_plan.md` | Complete architectural plan and requirements |

## Numbering System

### Format
All numbered files use consistent three-digit prefix format:
- **FeatSpec**: `001-FS-2025-08-18-DESCRIPTION.yaml`
- **TaskSpec**: `001-TS-2025-08-18-DESCRIPTION.yaml`
- **FeatState**: `001-FSTATE-2025-08-18-DESCRIPTION.yaml`
- **ADR**: `001-ADR-2025-08-18-DESCRIPTION.md`

### Sequential Counters
| File | Purpose | Starting Value |
|------|---------|----------------|
| `_specs/.featspec_sequence` | FeatSpec numbering | 001 |
| `_specs/.taskspec_sequence` | TaskSpec numbering | 001 |
| `_docs/ADR/.adr_sequence` | ADR numbering | 001 |

### Atomic Locking
Thread-safe increment mechanism using lock files:
- `_specs/.featspec_sequence.lock`
- `_specs/.taskspec_sequence.lock`
- `_docs/ADR/.adr_sequence.lock`

## Methods and Usage

### Creating a New Feature
```bash
# Interactive mode
task featspec-new

# Programmatic mode
DESCRIPTION=USER-AUTH TITLE="Implement user authentication" task featspec-new

# With optional parameters
DESCRIPTION=USER-AUTH TITLE="Implement user authentication" SPRINT=S5 task featspec-new
```

**Result**: Creates both specification and state files:
- `001-FS-2025-08-18-USER-AUTH.yaml` (immutable spec)
- `001-FSTATE-2025-08-18-USER-AUTH.yaml` (mutable state)

### Creating a New Task
```bash
# Programmatic mode (required)
DESCRIPTION=JWT-MIDDLEWARE \
TITLE="Add JWT middleware for authentication" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
task taskspec-new

# With type-based LOC caps (automatically set)
DESCRIPTION=AUTH-TESTS \
TITLE="Comprehensive authentication test suite" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
TYPE=test \
task taskspec-new
# ^ Automatically sets loc_cap: 300 for test type

# With all optional parameters
DESCRIPTION=JWT-MIDDLEWARE \
TITLE="Add JWT middleware for authentication" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
TYPE=feature \
SPRINT=S4 \
LOC_CAP=250 \
COVERAGE_CAP=80 \
DEPENDENCIES="001-TS-2025-08-17-AUTH-MODEL" \
task taskspec-new
# ^ LOC_CAP=250 overrides type-based default (200)
```

**Type-Based LOC Caps**:
- `fix`: 100 lines
- `feature`: 200 lines (default)
- `test`: 300 lines
- `refactor`: 150 lines
- `docs`: 400 lines
- `integration`: 250 lines

**Result**: 
- Creates `001-TS-2025-08-18-JWT-MIDDLEWARE.yaml` (immutable spec)
- Updates `001-FSTATE-2025-08-18-USER-AUTH.yaml` (adds TaskSpec state entry)

### Viewing State
```bash
# Show specific feature state
task featstate-show FEATSPEC=001-FS-2025-08-18-USER-AUTH

# List all features
task featspec-list

# List all tasks  
task taskspec-list
```

### LOC Cap Checking
```bash
# Check current changes against TaskSpec LOC caps
task loc-check

# Direct script execution with help
./state-scripts/check_loc_caps.sh --help
```

**Features**:
- Type-based LOC caps (fix: 100, feature: 200, test: 300, etc.)
- Weighted calculation (test files count at 50%)
- Progressive warnings at 60% and 80% of cap
- Automatic TaskSpec detection from git commits

### System Setup
```bash
# Initialize directory structure
task setup

# Show environment
task show-env
```

## File Organization

### Directory Structure
```
djhatch-state/
├── Taskfile.yml                    # Task automation
├── _templates/                     # Templates
│   ├── featspec.yaml
│   ├── taskspec.yaml
│   ├── featstate.yaml
│   └── adr.md
├── _docs/                          # Documentation
│   ├── artifact_descriptions/
│   │   ├── featspec.md
│   │   ├── taskspec.md
│   │   ├── featstate.md
│   │   └── readonly-mount.md
│   └── ADR/
│       └── 001-ADR-2025-08-18-STATE-SEPARATION.md
├── _state_docs/                    # Planning documentation
│   └── initial_state_implementation_plan.md
├── state-docs/                     # Summary documentation
│   └── state-artifacts-and-methods.md (this file)
├── _specs/                          # Generated specifications and state
│   ├── .featspec_sequence
│   ├── .taskspec_sequence
│   ├── featspecs/                  # FeatSpecs and FeatStates
│   └── taskspecs/                  # TaskSpecs only
├── state-scripts/                  # State management automation scripts
│   ├── new_featspec.sh
│   └── new_taskspec.sh
└── djhatch-readonly-mount/      # Read-only mount (to be created)
    └── [djhatch implementation]
```

### Specification Files Location
- **FeatSpec files**: `_featstate/NNN-FS-YYYY-MM-DD-DESCRIPTION.yaml`
- **FeatState files**: `_featstate/NNN-FSTATE-YYYY-MM-DD-DESCRIPTION.yaml`
- **TaskSpec files**: `_specs/taskspecs/NNN-TS-YYYY-MM-DD-DESCRIPTION.yaml`

### State Storage Pattern
- **Feature state**: Stored in corresponding FeatState file
- **Task state**: Stored in parent FeatState file (centralized per feature)
- **No separate TaskState files**: All task state rolls up to feature level

## Integration Points

### Read-Only Mount
- **Source**: `../djhatch` (implementation codebase)
- **Target**: `./djhatch-readonly-mount`
- **Purpose**: Safe reference to implementation files for state tracking and validation

### Workflow Integration
- **Sequential numbering**: Mirrors hatchAI-devcards pattern with prefix format
- **Template-based creation**: Ensures consistency and completeness
- **Atomic operations**: Thread-safe creation prevents numbering conflicts
- **State centralization**: Single source of truth for all feature-related progress

### Validation and Analysis
- State files can reference implementation files safely
- Progress tracking validated against actual codebase
- Implementation evidence stored in state files
- Test results and metrics tracked per TaskSpec

## Key Architectural Decisions

### State Separation
- **Specifications are immutable**: Created once, rarely changed
- **State is centralized**: All related state in single FeatState file per feature
- **Parent-child hierarchy**: TaskSpecs belong to FeatSpecs, state rolls up accordingly

### Numbering Consistency  
- **Three-digit prefixes**: All numbered files use NNN-PREFIX format
- **Date-based**: Must use TODAY's date (no arbitrary dating)
- **Sequential**: Atomic increment prevents conflicts
- **Type-specific**: Each artifact type has its own sequence

### Integration Compatibility
- **Mirrors existing patterns**: Same creation workflows as hatchAI-devcards
- **Familiar UX**: Similar command patterns and validation
- **File-based workflow**: Maintains version control integration
- **Thread-safe operations**: Atomic locking prevents race conditions

## Usage Examples

### Complete Feature Development Flow
```bash
# 1. Create feature specification
DESCRIPTION=USER-AUTH TITLE="Implement user authentication" task featspec-new
# Creates: 001-FS-2025-08-18-USER-AUTH.yaml + 001-FSTATE-2025-08-18-USER-AUTH.yaml

# 2. Create implementation tasks
DESCRIPTION=JWT-MIDDLEWARE \
TITLE="Add JWT middleware" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
task taskspec-new
# Creates: 001-TS-2025-08-18-JWT-MIDDLEWARE.yaml
# Updates: 001-FSTATE-2025-08-18-USER-AUTH.yaml

DESCRIPTION=AUTH-ROUTES \
TITLE="Implement auth API routes" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
DEPENDENCIES="001-TS-2025-08-18-JWT-MIDDLEWARE" \
task taskspec-new
# Creates: 002-TS-2025-08-18-AUTH-ROUTES.yaml  
# Updates: 001-FSTATE-2025-08-18-USER-AUTH.yaml

# 3. Monitor progress
task featstate-show FEATSPEC=001-FS-2025-08-18-USER-AUTH
# Shows: Complete feature state with all TaskSpec progress

# 4. List all artifacts
task featspec-list
task taskspec-list
```

### State Tracking Pattern
```yaml
# In 001-FSTATE-2025-08-18-USER-AUTH.yaml
### TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE
task_id: "001-TS-2025-08-18-JWT-MIDDLEWARE"
status: in-progress
owner: developer-name
worktree: "worktrees/card-001-TS-2025-08-18-JWT-MIDDLEWARE"
test_coverage: 85
implementation_files:
  - "djhatch-readonly-mount/src/middleware/jwt.go"
  - "djhatch-readonly-mount/test/middleware/jwt_test.go"
```

## Maintenance and Operations

### Sequence Management
- Sequence files are auto-created on first use
- Atomic locking prevents concurrent access issues
- Sequences can be reset (with caution) if needed

### State Consistency
- FeatState files are automatically updated when TaskSpecs are created
- Manual state updates should maintain consistency
- Validation scripts can check state integrity

### Migration from hatchAI-devcards
- Existing FeatCards can be split into FeatSpec + FeatState
- Existing DevCards can be converted to TaskSpecs
- State information extracted and centralized in FeatState files
- Sequential numbering maintained during migration

## Additional Documentation

### Summary Documentation (`state-docs/`)
| File | Purpose |
|------|---------|
| `state-artifacts-and-methods.md` | Complete catalog of all created artifacts and methods |
| `datetime-stamp-update.md` | Documentation of enhanced datetime stamping |
| `folder-rename-update.md` | Documentation of scripts/ → state-scripts/ rename |
| `type-based-loc-caps.md` | Complete guide to type-based LOC cap system |

### Agent Prompts (`_state_agents/`)
| File | Purpose |
|------|---------|
| `featplanner_prompt.md` | FeatPlanner agent adapted for djhatch-state system |
| `architect_prompt.md` | Software Architect agent adapted for djhatch-state system |

## Type-Based LOC Cap System

### Implementation
The djhatch-state system includes a sophisticated type-based LOC cap system mirroring hatchAI-devcards:

**Features**:
- **Type-based caps**: Different LOC limits based on TaskSpec type
- **Weighted calculation**: Test files count at 50% weight
- **Progressive warnings**: Alerts at 60% and 80% of cap usage
- **Automatic detection**: TaskSpec ID extracted from git commits
- **Override support**: Explicit LOC_CAP parameter bypasses type defaults

**Type Mapping**:
- `fix`: 100 lines (bug fixes, small corrections)
- `feature`: 200 lines (new functionality)
- `test`: 300 lines (test suites, testing infrastructure)
- `refactor`: 150 lines (code restructuring)
- `docs`: 400 lines (documentation)
- `integration`: 250 lines (integration testing)

**Usage**:
```bash
# Type-based LOC cap automatically set
TYPE=test task taskspec-new  # Sets loc_cap: 300

# Check current changes
task loc-check
```

See `state-docs/type-based-loc-caps.md` for comprehensive documentation.

This system provides a robust foundation for state management while maintaining compatibility with existing hatchAI-devcards workflows and ensuring clean separation between requirements and implementation tracking.