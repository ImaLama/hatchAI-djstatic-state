# Read-Only Mount Documentation

## Overview
The djhatch-state system requires read-only access to the implementation codebase to maintain separation between state management and code modification while enabling analysis and validation.

## Mount Configuration

### Source and Target
- **Source**: `./djhatch` (implementation codebase)
- **Target**: `./djhatch-state/hatchAI-codebase-readonly`
- **Type**: Read-only mount

### Directory Structure
```
djhatch-state/
├── _specs/                    # State management files
├── _templates/               # Templates and documentation  
├── hatchAI-codebase-readonly/ # READ-ONLY mount of ../djhatch
│   └── [complete djhatch implementation]
```

## Implementation Options

### Option 1: Bind Mount (Linux/macOS)
```bash
# Create mount point
mkdir -p djhatch-state/hatchAI-codebase-readonly

# Bind mount with read-only flag
sudo mount --bind ../djhatch djhatch-state/hatchAI-codebase-readonly
sudo mount -o remount,ro djhatch-state/hatchAI-codebase-readonly
```

### Option 2: Symbolic Link (Development)
```bash
# Create read-only symbolic link
ln -s ../djhatch djhatch-state/hatchAI-codebase-readonly

# Note: This provides access but not true read-only enforcement
```

### Option 3: Docker Volume Mount (Containerized)
```dockerfile
# In docker-compose.yml or Dockerfile
volumes:
  - ../djhatch:/app/hatchAI-codebase-readonly:ro
```

### Option 4: Git Worktree (Git-based)
```bash
# Create read-only git worktree
git worktree add djhatch-state/hatchAI-codebase-readonly main

# Configure as read-only reference
cd djhatch-state/hatchAI-codebase-readonly
git config core.filemode false
```

## Access Patterns

### State Files Referencing Codebase
FeatState and TaskSpec state files can reference implementation files:

```yaml
# In FeatState file
implementation_files:
  - "hatchAI-codebase-readonly/src/auth/middleware.go"
  - "hatchAI-codebase-readonly/src/auth/handlers.go"
  - "hatchAI-codebase-readonly/test/auth_test.go"

# Validation references
validation_results:
  - file: "hatchAI-codebase-readonly/src/auth/middleware.go"
    line_count: 150
    test_coverage: 88%
    lint_status: "clean"
```

### Analysis Tools Integration
State management tools can safely analyze the codebase:

```bash
# Safe analysis operations
wc -l hatchAI-codebase-readonly/src/auth/*.go
grep -r "func " hatchAI-codebase-readonly/src/
find hatchAI-codebase-readonly -name "*.test" -type f

# Validation scripts can read implementation
./state-scripts/validate_implementation.sh hatchAI-codebase-readonly/
```

## Benefits

### Architectural Separation
- **Clear boundaries**: Physical separation between state and implementation
- **Safe references**: State files can reference code without modification risk
- **Version consistency**: State tracking references specific codebase snapshots
- **Audit compliance**: All code access is read-only and traceable

### Development Workflow
- **Analysis safety**: Tools can examine code without write permissions
- **Implementation validation**: Progress can be verified against actual code
- **Documentation accuracy**: State references can be validated against reality
- **Testing coordination**: Test results can be correlated with implementation files

### Security Benefits
- **Write protection**: Implementation code cannot be accidentally modified
- **Permission control**: State management processes have limited access
- **Change tracking**: All modifications must go through proper implementation channels
- **Isolation**: State management operations cannot corrupt implementation

## Usage Examples

### TaskSpec Implementation Tracking
```yaml
# In TaskSpec state section
implementation_files:
  - "hatchAI-codebase-readonly/src/middleware/jwt.go"
  - "hatchAI-codebase-readonly/test/middleware/jwt_test.go"

implementation_evidence:
  - file: "hatchAI-codebase-readonly/src/middleware/jwt.go"
    status: "implemented"
    loc_count: 145
    functions: ["ValidateJWT", "ExtractUser", "RequireAuth"]
  
  - file: "hatchAI-codebase-readonly/test/middleware/jwt_test.go"  
    status: "complete"
    test_count: 15
    coverage: 92%
```

### Progress Validation Scripts
```bash
#!/bin/bash
# state-scripts/validate_taskspec_implementation.sh

TASKSPEC_ID="$1"
READONLY_ROOT="hatchAI-codebase-readonly"

# Extract implementation files from TaskSpec state
impl_files=$(grep -A 10 "implementation_files:" "_featstate/*FSTATE*.yaml" | grep "$READONLY_ROOT")

# Validate files exist and check basic metrics
for file in $impl_files; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
        echo "   Lines: $(wc -l < "$file")"
        echo "   Functions: $(grep -c "^func " "$file")"
    else
        echo "❌ Missing: $file"
    fi
done
```

### Feature Completion Analysis
```bash
#!/bin/bash
# state-scripts/analyze_feature_completion.sh

FEATSPEC_ID="$1"
READONLY_ROOT="hatchAI-codebase-readonly"

echo "=== Feature Implementation Analysis ==="
echo "Feature: $FEATSPEC_ID"
echo "Codebase: $READONLY_ROOT"
echo ""

# Analyze implementation files
echo "Implementation Files:"
find "$READONLY_ROOT" -name "*.go" -type f | while read file; do
    if grep -q "$FEATSPEC_ID" "$file" 2>/dev/null; then
        echo "  📄 $file"
        echo "     Purpose hash references: $(grep -c "PURPOSE_HASH.*$FEATSPEC_ID" "$file")"
    fi
done

echo ""
echo "Test Coverage:"
find "$READONLY_ROOT" -name "*_test.go" -type f | while read file; do
    if grep -q "$FEATSPEC_ID" "$file" 2>/dev/null; then
        echo "  🧪 $file"
        echo "     Test functions: $(grep -c "^func Test" "$file")"
    fi
done
```

## Setup Instructions

### Initial Setup
1. **Create mount point directory**:
   ```bash
   mkdir -p djhatch-state/hatchAI-codebase-readonly
   ```

2. **Choose mounting strategy** based on your environment:
   - Production: Use bind mount with read-only enforcement
   - Development: Symbolic link may be sufficient
   - Containerized: Use Docker volume mounts

3. **Configure access permissions**:
   ```bash
   # Ensure state management can read but not write
   chmod -R a-w djhatch-state/hatchAI-codebase-readonly
   ```

4. **Validate setup**:
   ```bash
   # Test read access
   ls -la djhatch-state/hatchAI-codebase-readonly/
   
   # Verify write protection
   echo "test" > djhatch-state/hatchAI-codebase-readonly/test.txt 2>&1 || echo "✅ Write protection working"
   ```

### Maintenance
- **Mount persistence**: Ensure mount survives system restarts
- **Permission validation**: Regularly verify read-only enforcement
- **Sync validation**: Confirm readonly mount reflects current implementation
- **Access monitoring**: Track which state management processes access the readonly mount

## Troubleshooting

### Mount Issues
```bash
# Check mount status
mount | grep hatchAI-codebase-readonly

# Remount if needed
sudo umount djhatch-state/hatchAI-codebase-readonly
sudo mount --bind ../djhatch djhatch-state/hatchAI-codebase-readonly
sudo mount -o remount,ro djhatch-state/hatchAI-codebase-readonly
```

### Permission Problems
```bash
# Fix permissions after mount
chmod -R a-w djhatch-state/hatchAI-codebase-readonly

# Verify no write access
touch djhatch-state/hatchAI-codebase-readonly/test 2>&1 || echo "Read-only OK"
```

### Access Validation
```bash
# Test state management can access files
ls djhatch-state/hatchAI-codebase-readonly/src/
cat djhatch-state/hatchAI-codebase-readonly/README.md

# Verify references work in state files
grep -r "hatchAI-codebase-readonly" _featstate/
```