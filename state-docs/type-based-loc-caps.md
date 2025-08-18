# Type-Based LOC Caps in djhatch-state

## Overview
The djhatch-state system implements fine-grained Lines of Code (LOC) caps based on TaskSpec type, mirroring the sophisticated approach from hatchAI-devcards but adapted for the state-separated architecture.

## Type-Based LOC Cap System

### Default LOC Caps by Type
| Type | LOC Cap | Purpose |
|------|---------|---------|
| `fix` | 100 | Bug fixes, small corrections |
| `feature` | 200 | New functionality implementation |
| `test` | 300 | Test suites, testing infrastructure |
| `refactor` | 150 | Code restructuring, optimization |
| `docs` | 400 | Documentation, guides, examples |
| `integration` | 250 | Integration testing, system connections |

### Default Fallback
- **Default**: 200 lines for unspecified or invalid types
- **Backward compatibility**: Existing TaskSpecs without type field use 200 lines

## Implementation Details

### TaskSpec Creation
When creating a new TaskSpec, the LOC cap is automatically set based on the `TYPE` parameter:

```bash
# Create feature TaskSpec (200 LOC cap)
DESCRIPTION=USER-AUTH TITLE="Implement user authentication" \
TYPE=feature PARENT_FEATSPEC=001-FS-2025-08-18-AUTH task taskspec-new

# Create fix TaskSpec (100 LOC cap)  
DESCRIPTION=JWT-BUG TITLE="Fix JWT token validation" \
TYPE=fix PARENT_FEATSPEC=001-FS-2025-08-18-AUTH task taskspec-new

# Create test TaskSpec (300 LOC cap)
DESCRIPTION=AUTH-TESTS TITLE="Add comprehensive auth tests" \
TYPE=test PARENT_FEATSPEC=001-FS-2025-08-18-AUTH task taskspec-new
```

### Override Capability
You can override the automatic LOC cap by explicitly setting `LOC_CAP`:

```bash
# Override with custom LOC cap (bypasses type-based default)
DESCRIPTION=COMPLEX-REFACTOR TITLE="Complex authentication refactor" \
TYPE=refactor LOC_CAP=350 PARENT_FEATSPEC=001-FS-2025-08-18-AUTH task taskspec-new
```

### TaskSpec Template Structure
```yaml
---
id: NNN-TS-YYYY-MM-DD-DESCRIPTION
title: <imperative, ≤ 72 chars>
type: feature                               # fix|feature|test|refactor|docs|integration
loc_cap: 200                                # net LoC (adds-deletes) - auto-set by type
---
```

## Weighted LOC Calculation

### Test File Weighting
Test files count at **50% weight** to encourage comprehensive testing without penalizing LOC caps:

#### Test File Patterns Recognized:
- `*_test.go` (Go)
- `*_test.py` (Python)  
- `*_test.js`, `*_test.ts` (JavaScript/TypeScript)
- `test_*.go`, `test_*.py` (Alternative patterns)
- `*.test.js`, `*.test.ts` (JavaScript test files)

#### Example Calculation:
```
Regular file: src/auth.go        +150 lines = 150 weighted lines
Test file:    src/auth_test.go   +200 lines = 100 weighted lines (50% weight)
Total weighted LOC: 250 lines
```

### Progressive Warnings
The LOC checking system provides progressive feedback:
- **60% of cap**: Notice warning with current usage
- **80% of cap**: Warning about approaching limit
- **100%+ of cap**: Failure with suggestions

## LOC Checking Commands

### Manual Check
```bash
# Check current changes against LOC caps
task loc-check

# Direct script execution
./state-scripts/check_loc_caps.sh

# Show help
./state-scripts/check_loc_caps.sh --help
```

### Automatic Detection
The LOC checker automatically detects TaskSpec from git commit messages:
```bash
git commit -m "TaskSpec: 001-TS-2025-08-18-USER-AUTH status=qa"
```

## Integration with State Management

### FeatState Tracking
TaskSpec LOC caps and types are tracked in the parent FeatState:

```yaml
### TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE
task_id: "001-TS-2025-08-18-JWT-MIDDLEWARE"
type: "feature"
loc_cap: 200
status: in-progress
# ... other state fields
```

### Progress Monitoring
FeatState files can aggregate LOC usage across all child TaskSpecs:
- Track cumulative LOC usage per feature
- Monitor type distribution within features
- Validate feature scope against total LOC investment

## Best Practices

### Type Selection Guidelines

#### Choose `fix` (100 LOC) for:
- Bug corrections
- Small patches
- Quick configuration changes
- Single-function improvements

#### Choose `feature` (200 LOC) for:
- New functionality implementation
- API endpoint additions
- Component creation
- Standard development work

#### Choose `test` (300 LOC) for:
- Comprehensive test suites
- Testing infrastructure
- Test utilities and helpers
- Integration test frameworks

#### Choose `refactor` (150 LOC) for:
- Code restructuring
- Performance optimizations
- Design pattern improvements
- Technical debt reduction

#### Choose `docs` (400 LOC) for:
- Documentation creation
- API documentation
- User guides and tutorials
- Architecture documentation

#### Choose `integration` (250 LOC) for:
- System integration testing
- End-to-end workflows
- Service connectivity
- Cross-component validation

### TaskSpec Decomposition Strategy

When hitting LOC caps, consider:

1. **Split by responsibility**: Separate concerns into multiple TaskSpecs
2. **Extract utilities**: Move reusable code to separate TaskSpecs
3. **Separate testing**: Create dedicated test TaskSpecs
4. **Incremental approach**: Break large changes into sequential TaskSpecs

### Example Feature Decomposition
Instead of one large TaskSpec (500+ LOC):
```yaml
# Bad: Single massive TaskSpec
001-TS-2025-08-18-COMPLETE-AUTH (500 LOC, exceeds 200 cap)

# Good: Decomposed TaskSpecs
001-TS-2025-08-18-JWT-MIDDLEWARE     (150 LOC, type: feature)
002-TS-2025-08-18-AUTH-ROUTES        (180 LOC, type: feature)  
003-TS-2025-08-18-USER-REGISTRATION  (120 LOC, type: feature)
004-TS-2025-08-18-AUTH-TESTS         (280 LOC, type: test)
999-TS-2025-08-18-AUTH-INTEGRATION   (200 LOC, type: integration)
```

## Configuration and Customization

### Modifying Type Caps
To adjust default caps, edit `state-scripts/new_taskspec.sh` and `state-scripts/check_loc_caps.sh`:

```bash
# In both scripts, update the TYPE_CAPS array:
declare -A TYPE_CAPS=(
    ["fix"]=100
    ["feature"]=200
    ["test"]=300
    ["refactor"]=150
    ["docs"]=400
    ["integration"]=250
)
```

### Adding New Types
1. Update the `TYPE_CAPS` array in both scripts
2. Add validation in `validate_type()` function
3. Update template comments and documentation
4. Update agent prompts with new type guidelines

## Migration from hatchAI-devcards

### Key Differences
- **DevCard → TaskSpec**: Different naming and file structure
- **Commit patterns**: Look for `TaskSpec:` instead of `DevCard:`
- **File locations**: `_specs/taskspecs/` instead of `cards/`
- **State integration**: LOC tracking in FeatState files

### Compatibility
- Same LOC cap values and type system
- Same weighted calculation logic
- Same progressive warning system
- Same override capabilities

This type-based LOC cap system provides granular control over TaskSpec scope while maintaining consistency with the proven hatchAI-devcards approach, adapted for the state-separated djhatch architecture.