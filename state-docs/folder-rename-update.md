# Folder Rename Update: scripts → state-scripts

## Overview
Renamed the `scripts/` folder to `state-scripts/` to better reflect its specific purpose for state management operations and clarity in the project structure.

## Changes Made

### Folder Structure
**Before:**
```
djhatch-state/
├── scripts/
│   ├── new_featspec.sh
│   └── new_taskspec.sh
```

**After:**
```
djhatch-state/
├── state-scripts/
│   ├── new_featspec.sh
│   └── new_taskspec.sh
```

### Files Updated

#### Taskfile.yml
**Updated script paths:**
```yaml
# Before
cmds:
  - ./scripts/new_featspec.sh
  - ./scripts/new_taskspec.sh

# After  
cmds:
  - ./state-scripts/new_featspec.sh
  - ./state-scripts/new_taskspec.sh
```

**Updated setup task:**
```yaml
# Before
- mkdir -p _featstate _specs/taskspecs _docs/artifact_descriptions _docs/ADR scripts

# After
- mkdir -p _featstate _specs/taskspecs _docs/artifact_descriptions _docs/ADR state-scripts
```

#### Documentation Updates
- **`state-docs/state-artifacts-and-methods.md`**: Updated all references
- **`state-docs/datetime-stamp-update.md`**: Updated script paths  
- **`_docs/artifact_descriptions/readonly-mount.md`**: Updated example script paths

## Rationale

### Improved Clarity
- **Purpose-specific naming**: Clearly identifies state management scripts
- **Namespace separation**: Distinguishes from general utility scripts
- **Function clarity**: Indicates scripts are for state operations, not general development

### Project Organization
- **Logical grouping**: State management scripts grouped together
- **Future expansion**: Room for additional state-related scripts
- **Clear boundaries**: Separate concerns between state management and other operations

## Impact

### No Breaking Changes
- **Script functionality unchanged**: All scripts work exactly the same
- **Taskfile commands unchanged**: `task featspec-new` and `task taskspec-new` still work
- **File permissions preserved**: Scripts remain executable

### Enhanced Organization
- **Better discoverability**: State management scripts easier to find
- **Clearer purpose**: Folder name indicates state management focus  
- **Future-ready**: Structure supports additional state management tools

## Script Contents

### Current State Management Scripts

#### `state-scripts/new_featspec.sh`
- Creates new FeatSpec and FeatState files atomically
- Handles sequential numbering with atomic locking
- Supports both interactive and programmatic modes
- Generates precise datetime stamps

#### `state-scripts/new_taskspec.sh`  
- Creates new TaskSpec files
- Updates parent FeatState with TaskSpec state entry
- Validates parent FeatSpec existence
- Requires programmatic mode (mirrors DevCard pattern)

### Future Script Possibilities
The `state-scripts/` folder can accommodate additional state management tools:
- State validation and consistency checking
- State migration and conversion utilities
- Progress reporting and analytics scripts
- Integration with external state management systems
- Backup and restoration utilities

## Usage

### Current Commands (Unchanged)
```bash
# Create new feature specification
task featspec-new

# Create new task specification  
task taskspec-new

# Initialize directory structure
task setup
```

### Direct Script Access
```bash
# Direct script execution (if needed)
./state-scripts/new_featspec.sh
./state-scripts/new_taskspec.sh
```

### Development and Extension
```bash
# Add new state management scripts
cp template.sh state-scripts/new_state_tool.sh
chmod +x state-scripts/new_state_tool.sh

# Add to Taskfile.yml for task automation
```

## Directory Structure Context

### Complete Project Layout
```
djhatch-state/
├── Taskfile.yml                    # Task automation
├── _templates/                     # Templates
├── _docs/                          # Documentation  
├── _state_docs/                    # Planning docs
├── state-docs/                     # Summary docs
├── state-scripts/                  # State management scripts ← RENAMED
├── _specs/                          # Generated _specs/states
└── hatchAI-codebase-readonly/      # Read-only mount (future)
```

### Logical Organization
- **`_templates/`**: Template files for creating new artifacts
- **`state-scripts/`**: Scripts for state management operations  
- **`_docs/`**: Technical documentation and guides
- **`state-docs/`**: Summary and status documentation
- **`_specs/`**: Generated specification and state files

This rename improves project organization and makes the purpose of the folder immediately clear to users and contributors.