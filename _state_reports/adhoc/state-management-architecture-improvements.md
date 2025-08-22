# State Management Architecture Improvements for HatchAI
**Date**: 2025-08-14  
**Author**: Planner Agent  
**Status**: Architectural Analysis & Recommendations (Revised)

## Executive Summary

The current git worktree-based architecture suffers from fundamental synchronization issues that manifest as TaskSpec orphaning, state fragmentation, and main branch contamination risks. The root cause is **mixing code and process state in the same git repository**. This report proposes three simple, fundamental solutions that separate these concerns entirely.

## Current Architecture Pain Points

### Critical Issues Identified
1. **TaskSpec Orphaning** - Specs exist only in branches, invisible to main (ADR-037)
2. **State Fragmentation** - Logs/state scattered across multiple locations
3. **Synchronization Complexity** - 200+ lines of bash scripts for worktree sync
4. **Silent Failures** - Sync failures occur without detection
5. **Main Branch Contamination** - Direct commits bypass QA gates (ADR-026)

### Root Cause Analysis
The fundamental issue isn't git worktrees themselves - it's **storing process state (TaskSpecs, logs, tracking) in the code repository**. This creates an impossible synchronization problem:
- TaskSpecs need to be visible across all worktrees
- But worktrees have separate working directories
- Leading to complex, fragile synchronization mechanisms

**The real solution: Remove process state from git entirely.**

---

## Updated Analysis: Why Previous Solutions Fall Short

### Why Containers Don't Solve the Core Problem
- **ADR-026 already rejected containers** as too complex
- Even with containers, if TaskSpecs remain in git, sync problems persist
- Adds operational complexity without addressing root cause
- Requires Docker/Podman installation and maintenance

### Why Event Sourcing Is Overkill
- Adds significant complexity for a simple problem
- Still requires deciding WHERE to store events
- If events are in git, same sync problems
- If events are outside git, why not just move TaskSpecs directly?

### Why Microservices Are Premature
- Massive architectural change for a state management issue
- Requires networking, service discovery, API contracts
- Way too complex for the actual problem at hand

---

## Proposal 1: SQLite State Database (Recommended)

### Architecture Overview
Move all process state (TaskSpecs, logs, tracking) into a SQLite database that lives **outside the git repository**. Git handles code, SQLite handles state.

### Implementation Structure
```
hatchAI/
├── .git/                     # Code repository ONLY
├── src/                      # Source code
├── docs/                     # Documentation  
├── tests/                    # Test files
├── Makefile                  # Build scripts
└── .gitignore               # Ignores .hatchai/

~/.hatchai/                   # User's home directory (outside git!)
└── projects/
    └── hatchAI/
        ├── state.db          # SQLite database with all state
        ├── logs/             # Development logs
        └── cache/            # Build artifacts
```

### Database Schema
```sql
-- TaskSpecs table
CREATE TABLE taskspecs (
    id TEXT PRIMARY KEY,              -- TS-2025-08-14-EXAMPLE-001
    title TEXT NOT NULL,
    status TEXT NOT NULL,              -- draft, in_progress, qa, done
    agent_type TEXT,                   -- factory, qa, planner
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content JSON                       -- Full YAML content as JSON
);

-- Development logs
CREATE TABLE dev_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskspec_id TEXT,
    agent_type TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action TEXT,
    details JSON,
    FOREIGN KEY (taskspec_id) REFERENCES taskspecs(id)
);

-- Agent state tracking
CREATE TABLE agent_state (
    agent_type TEXT PRIMARY KEY,
    current_taskspec TEXT,
    working_directory TEXT,
    last_activity TIMESTAMP,
    state JSON
);
```

### Key Benefits
- **Zero Sync Issues**: SQLite handles concurrent access atomically
- **No Git Pollution**: Git repo contains only code
- **Simple Queries**: SQL for TaskSpec status, history, reports
- **Fast Access**: Local SQLite is extremely fast
- **Easy Backup**: Single file to backup/restore
- **Tool Friendly**: Many tools can read SQLite

### Implementation Changes
```go
// internal/state/manager.go
type StateManager struct {
    db *sql.DB
}

func NewStateManager() (*StateManager, error) {
    home, _ := os.UserHomeDir()
    dbPath := filepath.Join(home, ".hatchai/projects/hatchAI/state.db")
    
    // Create directory if needed
    os.MkdirAll(filepath.Dir(dbPath), 0755)
    
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }
    
    return &StateManager{db: db}, nil
}

func (sm *StateManager) CreateTaskSpec(spec *TaskSpec) error {
    // Atomic insert with transaction
    tx, _ := sm.db.Begin()
    defer tx.Rollback()
    
    _, err := tx.Exec(`
        INSERT INTO taskspecs (id, title, status, content)
        VALUES (?, ?, ?, ?)
    `, spec.ID, spec.Title, spec.Status, spec.ToJSON())
    
    if err != nil {
        return err
    }
    
    return tx.Commit()
}
```

### Makefile Changes
```makefile
# State database location
STATE_DB := $(HOME)/.hatchai/projects/hatchAI/state.db

# Create new TaskSpec (in database, not git!)
taskspec-new:
    @sqlite3 $(STATE_DB) "INSERT INTO taskspecs ..."
    
# List TaskSpecs (from database)
taskspec-list:
    @sqlite3 $(STATE_DB) "SELECT id, status, title FROM taskspecs ORDER BY created_at DESC"

# Claim TaskSpec for work (updates database)
taskspec-claim:
    @sqlite3 $(STATE_DB) "UPDATE taskspecs SET status='in_progress', agent_type='factory' WHERE id='$(ID)'"
    @git worktree add worktrees/spec-$(ID) -b spec-$(ID)
```

### Claude Code Integration
```bash
# .claude/settings.json hooks now interact with database
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": "hatchai-state log --action=tool_use --tool=$TOOL"
      }
    ]
  }
}
```

### Migration Path
1. **Export existing TaskSpecs** to JSON
2. **Create SQLite database** with schema
3. **Import TaskSpecs** into database
4. **Update Makefile** to use database commands
5. **Remove specs/ directory** from git
6. **Update .gitignore** to exclude .hatchai/

---

## Proposal 2: Separate State Repository

### Architecture Overview
Keep two completely separate git repositories - one for code, one for state. This provides git's benefits for state tracking while eliminating synchronization issues.

### Implementation Structure
```
~/projects/
├── hatchAI/                   # CODE repository (what Claude sees)
│   ├── .git/
│   ├── src/                   # Source code
│   ├── docs/                  # Documentation
│   ├── Makefile              # Build scripts
│   └── .hatchai-state        # Symlink to ../hatchAI-state
│
└── hatchAI-state/            # STATE repository (separate git repo)
    ├── .git/                 # Separate git history for state
    ├── specs/                # TaskSpecs (version controlled)
    │   ├── TS-2025-08-14-ABC.yaml
    │   └── index.yaml
    ├── logs/                 # Development logs
    │   └── 2025-08-14/
    └── tracking/             # Time tracking, metrics
        └── development-time.json
```

### Key Benefits
- **Complete Separation**: Code and state never mix
- **No Worktree Sync**: State repo is always consistent
- **Git History for State**: Can track TaskSpec evolution
- **Simple Implementation**: Just two repos, no new tools
- **Easy Rollback**: Can revert state changes independently

### Implementation Changes
```bash
# Initial setup
cd ~/projects
git clone <repo> hatchAI
git clone <state-repo> hatchAI-state
cd hatchAI
ln -s ../hatchAI-state .hatchai-state

# Working with TaskSpecs
cd ~/projects/hatchAI-state
git pull
vim specs/TS-2025-08-14-ABC.yaml
git add specs/
git commit -m "Update TaskSpec status"
git push
```

### Makefile Updates
```makefile
# Point to state repository
STATE_DIR := ../hatchAI-state

# Create TaskSpec in state repo
taskspec-new:
    cd $(STATE_DIR) && \
    cp templates/taskspec.yaml specs/$(ID).yaml && \
    git add specs/$(ID).yaml && \
    git commit -m "Create TaskSpec $(ID)" && \
    git push

# List TaskSpecs from state repo
taskspec-list:
    @ls -la $(STATE_DIR)/specs/*.yaml
```

### Why This Works
- **Worktrees don't need state sync**: They only work with code
- **State changes are explicit**: Must commit to state repo
- **No hidden synchronization**: Everything is visible
- **Standard git workflows**: No special tools needed

---

## Proposal 3: Filesystem State Outside Git

### Architecture Overview
Use a simple filesystem directory structure for state, but keep it **completely outside** the git repository. No database, no separate repo, just files.

### Implementation Structure
```
~/
├── .config/
│   └── hatchai/              # Global HatchAI state
│       ├── projects/
│       │   └── hatchAI/      # Project-specific state
│       │       ├── specs/    # TaskSpecs as YAML files
│       │       ├── logs/     # Development logs
│       │       ├── state.json # Current state
│       │       └── lock      # File-based locking
│       └── global.json       # Global settings
│
└── projects/
    └── hatchAI/              # Clean git repository
        ├── .git/
        ├── src/              # Only code
        └── Makefile          # References ~/.config/hatchai
```

### Key Benefits
- **Zero Git Complexity**: State never touches git
- **Simple File Operations**: Just read/write files
- **No New Tools**: Uses filesystem, that's it
- **Easy Debugging**: Can browse state with `ls`
- **Cross-Platform**: Works on any OS with filesystem

### Implementation
```go
// internal/state/filesystem.go
type FileSystemState struct {
    baseDir string
}

func NewFileSystemState(projectName string) *FileSystemState {
    home, _ := os.UserHomeDir()
    return &FileSystemState{
        baseDir: filepath.Join(home, ".config/hatchai/projects", projectName),
    }
}

func (fs *FileSystemState) CreateTaskSpec(spec *TaskSpec) error {
    // Simple file write
    path := filepath.Join(fs.baseDir, "specs", spec.ID+".yaml")
    return os.WriteFile(path, spec.ToYAML(), 0644)
}

func (fs *FileSystemState) ListTaskSpecs() ([]*TaskSpec, error) {
    // Simple directory read
    files, _ := os.ReadDir(filepath.Join(fs.baseDir, "specs"))
    specs := []*TaskSpec{}
    for _, f := range files {
        if strings.HasSuffix(f.Name(), ".yaml") {
            spec := fs.LoadTaskSpec(f.Name())
            specs = append(specs, spec)
        }
    }
    return specs, nil
}
```

### File Locking for Concurrency
```bash
# Simple file-based locking
lock_taskspec() {
    local spec_id=$1
    local lock_file="$HOME/.config/hatchai/projects/hatchAI/specs/${spec_id}.lock"
    
    # Atomic lock creation
    if (set -C; echo $$ > "$lock_file") 2>/dev/null; then
        return 0  # Got lock
    else
        return 1  # Lock exists
    fi
}

unlock_taskspec() {
    local spec_id=$1
    rm -f "$HOME/.config/hatchai/projects/hatchAI/specs/${spec_id}.lock"
}
```

### Migration Path
1. **Create state directory**: `mkdir -p ~/.config/hatchai/projects/hatchAI`
2. **Move existing TaskSpecs**: `cp -r specs/ ~/.config/hatchai/projects/hatchAI/`
3. **Update Makefile**: Point to new location
4. **Remove from git**: `git rm -r specs/ && git commit -m "Move TaskSpecs outside git"`
5. **Update .gitignore**: Add `specs/` to prevent accidental commits

---

## Final Recommendation: Two Git Repos + SQLite

### Recommended Architecture
After considering LLM accessibility and the need for version history, the optimal solution is:

**Two Separate Git Repositories with SQLite Overlay**

1. **`hatchAI/`** - Code repository (current repo)
   - Contains only source code, docs, build files
   - Symlinks to state repo for LLM access
   - Clean git history focused on code changes

2. **`hatchAI-state/`** - State repository (new repo)
   - Contains all TaskSpecs and FeatSpecs as YAML
   - Full git history for spec evolution
   - SQLite database for fast queries (git-ignored)

3. **SQLite Database** - Query layer
   - Lives in state repo's `.state/` directory
   - Provides fast status queries and reports
   - Generates markdown views for LLM consumption

### Why This Architecture Wins

| Requirement | How It's Solved |
|------------|-----------------|
| **Sync Issues** | Complete separation - no sync needed |
| **LLM Access** | Direct YAML reading via symlinks |
| **Git History** | Full version control in state repo |
| **Fast Queries** | SQLite for instant status/metrics |
| **Simplicity** | Just two repos and a database file |
| **Migration** | Can be done incrementally |

### Why NOT Containers/Microservices

After deeper analysis:

1. **Containers add complexity** without solving the root issue
   - If TaskSpecs stay in git, sync problems remain
   - Requires Docker/Podman installation and maintenance
   - ADR-026 already considered and rejected this approach

2. **The problem is WHERE state lives**, not HOW it's accessed
   - Moving state outside git solves everything
   - No need for complex isolation mechanisms
   - Git worktrees work fine when they only handle code

3. **Simpler is better**
   - SQLite or filesystem state is trivial to implement
   - No new infrastructure required
   - Easier to debug and maintain

---

## Comparative Analysis

| Aspect | Current (Git) | SQLite | Filesystem | Separate Repo |
|--------|--------------|---------|------------|---------------|
| **Sync Complexity** | Very High | None | None | Low |
| **Implementation Time** | - | 2-3 days | 1 day | 2 days |
| **Claude Code Changes** | - | Minimal | None | None |
| **Concurrent Access** | Poor | Excellent | Good | Good |
| **Backup/Restore** | Git | Single file | Directory | Git |
| **Query Capability** | grep/awk | SQL | grep/find | git log |
| **Debugging** | Difficult | SQL tools | ls/cat | git tools |
| **Dependencies** | Git | SQLite | None | Git |

---

## Critical Parameter: LLM Accessibility

### The LLM Readability Challenge

LLMs (including Claude Code) work best with **plain text files** they can directly read and understand. While databases provide excellent state management, they create a barrier for AI agents that need to:
- Understand TaskSpec requirements and context
- Review acceptance criteria during implementation
- Track dependencies between specs
- Read historical context and decisions

**Key Insight**: LLMs need the "source of truth" to be readable text, not database records.

### Evaluation of Solutions for LLM Accessibility

#### 1. SQLite Database - **Requires Hybrid Approach**
**Problem**: LLMs can't directly `Read` a SQLite database - they need SQL queries or exports.

**Solution**: Implement a **dual-storage pattern**:
```
~/.hatchai/projects/hatchAI/
├── state.db                  # SQLite for state tracking (status, timestamps)
└── specs/                     # Plain YAML files for LLM reading
    ├── TS-2025-08-14-ABC.yaml
    └── index.yaml
```

**Implementation**:
```go
// Write to both database AND filesystem
func (sm *StateManager) UpdateTaskSpec(spec *TaskSpec) error {
    // 1. Update database for state tracking
    sm.db.Exec("UPDATE taskspecs SET status = ? WHERE id = ?", 
               spec.Status, spec.ID)
    
    // 2. Update YAML file for LLM access
    yamlPath := filepath.Join(sm.specsDir, spec.ID + ".yaml")
    return os.WriteFile(yamlPath, spec.ToYAML(), 0644)
}
```

**LLM Access Pattern**:
```bash
# LLM reads the YAML directly
claude: Read ~/.hatchai/projects/hatchAI/specs/TS-2025-08-14-ABC.yaml

# State queries use database
make taskspec-list  # Uses SQLite for fast queries
```

#### 2. Filesystem State - **Perfect LLM Compatibility**
**Advantage**: Everything is already in plain text files that LLMs can read directly.

```
~/.config/hatchai/projects/hatchAI/
├── specs/
│   ├── TS-2025-08-14-ABC.yaml    # LLM reads this directly
│   ├── TS-2025-08-14-XYZ.yaml
│   └── index.yaml                # Quick lookup file
├── state.json                     # Current status summary
└── logs/
    └── 2025-08-14.jsonl          # Structured logs
```

**LLM Access**: Direct file reading, no translation needed
```bash
# LLM can read everything directly
Read ~/.config/hatchai/projects/hatchAI/specs/TS-2025-08-14-ABC.yaml
Grep -pattern "status: qa" ~/.config/hatchai/projects/hatchAI/specs/*.yaml
```

#### 3. Separate State Repository - **Good LLM Compatibility**
**Advantage**: TaskSpecs remain as YAML files in a git repository.

```
~/projects/hatchAI-state/
├── specs/
│   ├── TS-2025-08-14-ABC.yaml    # LLM reads via symlink
│   └── active/                   # Organized by status
│       └── TS-2025-08-14-XYZ.yaml
└── .git/                         # Version control for state
```

**LLM Access via Symlink**:
```bash
# In main repo, create symlink for LLM access
ln -s ~/projects/hatchAI-state/specs ~/projects/hatchAI/.state-specs

# LLM reads through symlink
Read .state-specs/TS-2025-08-14-ABC.yaml
```

### Recommended Hybrid Architecture (Revised)

Based on the LLM accessibility requirement and the need for version history, I recommend a **hybrid approach** using **two separate git repositories plus SQLite**:

```
~/projects/
├── hatchAI/                      # CODE repository (git-tracked)
│   ├── .git/
│   ├── src/                      # Source code only
│   ├── docs/                     # Documentation only
│   ├── Makefile
│   ├── .gitignore               # Ignores symlinks
│   ├── .specs -> ../hatchAI-state/specs      # Symlink for LLM access
│   └── .featspecs -> ../hatchAI-state/_featspecs  # Symlink for LLM access
│
└── hatchAI-state/               # STATE repository (separate git!)
    ├── .git/                    # Git history for all state changes
    ├── specs/                   # TaskSpecs with full version history
    │   ├── TS-2025-08-14-ABC.yaml
    │   └── TS-2025-08-14-XYZ.yaml
    ├── _featspecs/              # FeatSpecs with version history
    │   ├── active/
    │   │   └── FS-2025-08-14-FEATURE.yaml
    │   └── completed/
    └── .state/                  # SQLite for fast queries (git-ignored)
        ├── state.db             # Status tracking, metrics, reports
        └── views/               # Generated text views
            ├── current-status.md
            └── weekly-report.md
```

**Key Design Decisions:**
1. **Two Git Repos**: Complete separation between code and state
2. **Git History for Specs**: Full version control for TaskSpecs/FeatSpecs
3. **SQLite Overlay**: Fast queries without parsing YAML files
4. **Symlinks for LLM**: Direct file access from main repo
5. **No Synchronization**: Repos are independent, no sync needed

### Implementation Strategy for LLM Accessibility

```go
// internal/state/hybrid.go
type HybridStateManager struct {
    db       *sql.DB           // For state queries
    specsDir string            // For LLM access
}

// Create/Update TaskSpec - writes to both locations
func (h *HybridStateManager) SaveTaskSpec(spec *TaskSpec) error {
    // 1. Save full YAML for LLM access
    yamlPath := filepath.Join(h.specsDir, "active", spec.ID + ".yaml")
    if err := os.WriteFile(yamlPath, spec.ToYAML(), 0644); err != nil {
        return err
    }
    
    // 2. Save state to database for queries
    _, err := h.db.Exec(`
        INSERT OR REPLACE INTO taskspec_status 
        (id, status, updated_at, agent_type)
        VALUES (?, ?, ?, ?)
    `, spec.ID, spec.Status, time.Now(), spec.AgentType)
    
    return err
}

// Generate LLM-readable views from database
func (h *HybridStateManager) GenerateViews() error {
    // Query database
    rows, _ := h.db.Query("SELECT * FROM taskspec_status WHERE status = 'active'")
    
    // Write as markdown for LLM
    var report strings.Builder
    report.WriteString("# Active TaskSpecs\n\n")
    report.WriteString("| ID | Status | Agent | Updated |\n")
    report.WriteString("|----|----|----|----|----|\n")
    
    // ... format query results as markdown
    
    // Save for LLM access
    return os.WriteFile(
        filepath.Join(h.specsDir, "../views/current-status.md"),
        []byte(report.String()),
        0644,
    )
}
```

### LLM View Functions for State Queries

While LLMs can read TaskSpecs directly via symlinks, they need functions to query state efficiently:

#### Direct File Access (Full Context)
```bash
# LLM reads full TaskSpec content directly
Read .specs/TS-2025-08-14-ABC.yaml
Grep -pattern "acceptance_criteria" .specs/*.yaml
```

#### State Query Functions (Status/Metrics)
```makefile
# Makefile targets that query SQLite and return text
taskspec-status:
	@sqlite3 $(STATE_DB) "SELECT status, agent_type, updated_at FROM taskspec_status WHERE id='$(ID)'"
	
taskspec-list-active:
	@sqlite3 $(STATE_DB) "SELECT id, title, status, agent_type FROM taskspec_status WHERE status IN ('in_progress', 'qa')"

taskspec-summary:
	@echo "TaskSpec Summary:"
	@sqlite3 $(STATE_DB) "SELECT status, COUNT(*) FROM taskspec_status GROUP BY status"
```

#### LLM Usage Examples
```bash
# Get quick status without reading full file
make taskspec-status ID=TS-2025-08-14-ABC
> Status: qa
> Agent: factory  
> Updated: 2025-08-14 15:30:00

# List all active work
make taskspec-list-active
> TS-2025-08-14-ABC | Fix authentication | qa | factory
> TS-2025-08-14-XYZ | Add logging | in_progress | factory

# Get summary metrics
make taskspec-summary
> done: 38
> qa: 3
> in_progress: 4
> draft: 0
```

#### Advanced Query Views
```go
// cmd/state-query/main.go - Tool for complex queries
func queryDependencyGraph(specID string) string {
    // Returns markdown-formatted dependency tree
}

func queryAgentWorkload() string {
    // Shows current workload per agent
}

func queryVelocityReport() string {
    // Historical completion rates
}
```

### Best Practices for LLM-Accessible State

1. **TaskSpec Content in YAML**: Full descriptions, acceptance criteria, context (in state repo)
2. **SQLite for Queries**: Fast status checks, metrics, reports
3. **View Functions**: Simple commands that return text output
4. **Symlinks for Access**: Direct file reading from main repo
5. **Separate Concerns**: Code in one repo, state in another

### LLM Accessibility Scoring (Updated)

| Solution | LLM Read Access | State Management | Git History | Implementation | Recommendation |
|----------|----------------|------------------|------------|----------------|----------------|
| **SQLite Only** | ❌ Poor | ✅ Excellent | ❌ None | Medium | Not suitable |
| **Filesystem Only** | ✅ Excellent | ⚠️ Good | ❌ None | Low | Too simple |
| **Single State Repo** | ✅ Excellent | ✅ Good | ✅ Full | Low | Good option |
| **Two Repos + SQLite** | ✅ Excellent | ✅ Excellent | ✅ Full | Medium | **Best overall** |

### Conclusion on LLM Accessibility

The **two repos + SQLite hybrid** provides the optimal balance:
- **LLMs get plain text YAML files** via symlinks (direct Read access)
- **Git history preserved** for all TaskSpec/FeatSpec changes
- **SQLite provides** fast queries and state management
- **View functions** give LLMs efficient state query capabilities
- **No synchronization issues** with complete separation of concerns

This architecture ensures AI agents can:
1. Read full TaskSpec context directly (YAML files)
2. Query current state efficiently (SQLite views)
3. Track spec evolution (git history)
4. Work without sync conflicts (separate repos)

---

## Implementation Strategy

### Phase 1: Create State Repository (Day 1)
```bash
# Create new state repository
cd ~/projects
git init hatchAI-state
cd hatchAI-state

# Move existing specs
mv ../hatchAI/specs ./
mv ../hatchAI/_featspecs ./
git add .
git commit -m "Initial state repository with existing TaskSpecs"

# Create remote and push
git remote add origin <state-repo-url>
git push -u origin main
```

### Phase 2: Setup Symlinks and SQLite (Day 2)
```bash
# In main repo, create symlinks
cd ~/projects/hatchAI
ln -s ../hatchAI-state/specs .specs
ln -s ../hatchAI-state/_featspecs .featspecs
echo ".specs" >> .gitignore
echo ".featspecs" >> .gitignore

# In state repo, setup SQLite
cd ../hatchAI-state
mkdir .state
sqlite3 .state/state.db < schema.sql
echo ".state/" >> .gitignore
```

### Phase 3: Update Tooling (Day 3-4)
```makefile
# Update Makefile
STATE_REPO := ../hatchAI-state
STATE_DB := $(STATE_REPO)/.state/state.db

taskspec-new:
	cd $(STATE_REPO) && create-taskspec.sh $(ID)
	sqlite3 $(STATE_DB) "INSERT INTO taskspec_status..."

taskspec-status:
	@sqlite3 $(STATE_DB) "SELECT * FROM taskspec_status WHERE id='$(ID)'"
```

### Phase 4: Remove Sync Code (Day 5)
```bash
# Delete all worktree sync complexity
rm scripts/taskspec/sync.sh
rm scripts/worktree-sync.sh

# Simplify worktree creation
# No more sync needed - just create worktree!
git worktree add worktrees/spec-$(ID) -b spec-$(ID)
```

---

## Conclusion

The current architecture's fundamental flaw is **storing process state in the code repository**. This creates unsolvable synchronization problems that no amount of tooling can fix.

The solution is simple: **Move state outside git entirely**.

By implementing this separation:
- **Eliminate all sync issues** - No more TaskSpec orphaning
- **Simplify dramatically** - Remove 200+ lines of sync scripts
- **Git worktrees just work** - They only handle code
- **No new infrastructure** - Uses SQLite or filesystem
- **Implement in days** - Not weeks or months

This isn't about adding more complexity (containers, microservices, event sourcing). It's about **removing complexity** by separating concerns properly.

The root insight: **Code belongs in git. State belongs elsewhere.**

### Next Steps

1. **Create State Repository**: Initialize `hatchAI-state` repo (1 hour)
2. **Move Specs**: Transfer all TaskSpecs/FeatSpecs to state repo (30 minutes)
3. **Setup Symlinks**: Create symlinks for LLM access (15 minutes)
4. **Add SQLite**: Create database schema and queries (2 hours)
5. **Update Tooling**: Modify Makefile and scripts (1 day)
6. **Remove Sync Code**: Delete all worktree sync complexity (1 hour)
7. **Create FeatSpec**: FS-2025-08-14-STATE-SEPARATION to track this work

---

## Appendix: Minimal Migration Guide (Quick Separation Only)

### Objective
Move only TaskSpecs, FeatSpecs, and state files to a separate git repository with minimal changes to the existing framework. This is a quick tactical fix that can be done in 2-3 hours without breaking anything.

### Current State Analysis
```
hatchAI/                          # Current mixed repository
├── specs/                        # TaskSpecs (need to move)
├── _featspecs/                   # FeatSpecs (need to move)
├── .claude-hooks/                # Development logs (need to move)
├── hatchery/logs/                # Session logs (need to move)
├── scripts/                      # Keep in main repo
├── Makefile                      # Needs minor updates
└── CLAUDE.md                     # Needs path updates
```

### Step-by-Step Migration (2-3 Hours)

#### Step 1: Create State Repository (15 minutes)
```bash
# Create new state repository
cd ~/projects
mkdir hatchAI-state
cd hatchAI-state
git init

# Create directory structure
mkdir -p specs _featspecs logs/.claude-hooks logs/hatchery

# Create README
cat > README.md << 'EOF'
# HatchAI State Repository

This repository contains TaskSpecs, FeatSpecs, and development state for the HatchAI project.

## Structure
- `specs/` - TaskSpecs (YAML files)
- `_featspecs/` - FeatSpecs (YAML files)  
- `logs/` - Development logs and state

## Usage
This repository is used alongside the main hatchAI repository.
Symlinks in the main repo point to these directories.
EOF

git add README.md
git commit -m "Initial state repository setup"
```

#### Step 2: Move Existing Specs and State (30 minutes)
```bash
# Copy (don't move yet) all specs and state
cd ~/projects/hatchAI
cp -r specs/* ../hatchAI-state/specs/
cp -r _featspecs/* ../hatchAI-state/_featspecs/
cp -r .claude-hooks/* ../hatchAI-state/logs/.claude-hooks/ 2>/dev/null || true
cp -r hatchery/logs/* ../hatchAI-state/logs/hatchery/ 2>/dev/null || true

# Commit in state repo
cd ../hatchAI-state
git add .
git commit -m "Import existing TaskSpecs, FeatSpecs, and logs from main repo"

# Create remote (if you have one ready)
# git remote add origin <state-repo-url>
# git push -u origin main
```

#### Step 3: Create Symlinks in Main Repo (15 minutes)
```bash
cd ~/projects/hatchAI

# Backup current directories first
mv specs specs.backup
mv _featspecs _featspecs.backup
mv .claude-hooks .claude-hooks.backup 2>/dev/null || true

# Create symlinks to state repo
ln -s ../hatchAI-state/specs specs
ln -s ../hatchAI-state/_featspecs _featspecs
ln -s ../hatchAI-state/logs/.claude-hooks .claude-hooks

# Update .gitignore to exclude symlinks
cat >> .gitignore << 'EOF'

# State repository symlinks
specs
_featspecs
.claude-hooks
hatchery/logs
EOF

# Commit the removal and gitignore update
git add .gitignore
git rm -r specs.backup _featspecs.backup .claude-hooks.backup 2>/dev/null || true
git commit -m "Migrate TaskSpecs and state to separate repository"
```

#### Step 4: Update Makefile Paths (30 minutes)
```bash
# Create a state repo path variable at the top of Makefile
sed -i '1i\
# State repository location\
STATE_REPO := ../hatchAI-state\
' Makefile

# Update any hardcoded paths to use STATE_REPO
# This is minimal - most things should work through symlinks

# Add helper target for state repo operations
cat >> Makefile << 'EOF'

# State repository management
state-pull:
	@cd $(STATE_REPO) && git pull

state-push:
	@cd $(STATE_REPO) && git add . && git commit -m "Update state" && git push

state-status:
	@cd $(STATE_REPO) && git status
EOF
```

#### Step 5: Update CLAUDE.md Documentation (15 minutes)
```bash
# Add a note about the state repository
cat >> CLAUDE.md << 'EOF'

## State Repository

TaskSpecs, FeatSpecs, and development logs are maintained in a separate repository:
- Location: `../hatchAI-state/` (relative to main repo)
- Accessed via symlinks: `specs/`, `_featspecs/`, `.claude-hooks/`
- LLMs can read these directly through the symlinks
- State changes should be committed to the state repository

### Working with State Repository
```bash
# Pull latest state
make state-pull

# Commit and push state changes  
make state-push

# Check state repository status
make state-status
```
EOF
```

#### Step 6: Test and Verify (30 minutes)
```bash
# Test that everything still works

# 1. Verify symlinks work
ls -la specs/
ls -la _featspecs/

# 2. Test TaskSpec operations
make taskspec-list
make taskspec-new DESCRIPTION=TEST-SPEC TITLE="Test spec creation"

# 3. Test that Claude can read specs
echo "Testing LLM access to specs via symlinks"
cat specs/TS-*.yaml | head -20

# 4. Verify git status is clean
git status  # Main repo should be clean
cd ../hatchAI-state && git status  # State repo has new test spec

# 5. Test worktree creation still works
cd ~/projects/hatchAI
make taskspec-claim ID=TS-2025-08-14-TEST-001 || echo "Create test spec first"
```

#### Step 7: Cleanup and Document (15 minutes)
```bash
# Remove backup directories if everything works
cd ~/projects/hatchAI
rm -rf specs.backup _featspecs.backup .claude-hooks.backup

# Document the change in state repo
cd ../hatchAI-state
cat > MIGRATION.md << 'EOF'
# Migration from Monorepo

Date: 2025-08-14
Migrated from: hatchAI main repository

## What was migrated
- All TaskSpecs from `specs/`
- All FeatSpecs from `_featspecs/`
- Development logs from `.claude-hooks/`
- Session logs from `hatchery/logs/`

## How to maintain
1. This repo should be cloned alongside the main hatchAI repo
2. Symlinks in main repo point here
3. Commit state changes to this repo, not main
4. Use `make state-push` from main repo for convenience
EOF

git add MIGRATION.md
git commit -m "Document migration from monorepo"
```

### What This Achieves

✅ **Immediate Benefits:**
- TaskSpecs/FeatSpecs no longer in main repo
- No more worktree sync issues
- Clean git history separation
- LLMs can still read everything via symlinks

⚠️ **Temporary Limitations:**
- Still using symlinks (not ideal long-term)
- No SQLite optimization yet
- Manual state repo management
- Requires both repos cloned side-by-side

### Rollback Plan

If something goes wrong:
```bash
cd ~/projects/hatchAI
rm specs _featspecs .claude-hooks  # Remove symlinks
mv specs.backup specs
mv _featspecs.backup _featspecs
mv .claude-hooks.backup .claude-hooks
git checkout -- .gitignore Makefile CLAUDE.md
```

### Next Steps After Migration

Once this quick separation is working:
1. Add SQLite for faster queries (Phase 2)
2. Build proper state management tools (Phase 3)
3. Remove worktree sync code entirely (Phase 4)
4. Implement view functions for LLMs (Phase 5)

### Important Notes

1. **Both repos must be cloned**: The symlinks expect `../hatchAI-state/` to exist
2. **Commit discipline**: Remember to commit to state repo when changing specs
3. **CI/CD updates**: Any automation needs to clone both repos
4. **Team communication**: Everyone needs to clone the state repo

This minimal migration provides immediate relief from sync issues while keeping the framework functional. It's a tactical fix that can be enhanced incrementally without disruption.

---

*End of Report*