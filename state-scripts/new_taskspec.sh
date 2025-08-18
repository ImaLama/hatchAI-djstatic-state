#!/bin/bash
# Create a new TaskSpec and add entry to parent FeatState
# Mirrors: hatchAI-devcards/scripts/new_devcard.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Create New TaskSpec ==="
echo ""

# Only programmatic mode is supported (matching devcard pattern)
if [ -z "$DESCRIPTION" ] || [ -z "$TITLE" ] || [ -z "$PARENT_FEATSPEC" ]; then
    echo "❌ Error: Required parameters missing"
    echo ""
    echo "📝 Usage:"
    echo "   DESCRIPTION=JWT-MIDDLEWARE TITLE=\"Add JWT middleware\" PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH ./scripts/new_taskspec.sh"
    echo ""
    echo "📋 Required parameters:"
    echo "   DESCRIPTION      - uppercase, hyphens for spaces (e.g., JWT-MIDDLEWARE)"
    echo "   TITLE            - imperative title ≤72 chars (e.g., \"Add JWT middleware\")"
    echo "   PARENT_FEATSPEC  - parent FeatSpec ID (e.g., 001-FS-2025-08-18-USER-AUTH)"
    echo ""
    echo "📋 Optional parameters:"
    echo "   TYPE           - work type: fix, feature, test, refactor, docs, integration (default: feature)"
    echo "                    TYPE-based LOC caps: fix=100, feature=200, test=300, refactor=150, docs=400, integration=250"
    echo "   SPRINT         - sprint number (default: S4)"
    echo "   LOC_CAP        - line of code cap (default: auto-set by TYPE)"
    echo "   COVERAGE_CAP   - coverage percentage (default: 80)"
    echo "   DEPENDENCIES   - comma-separated TaskSpec IDs"
    echo ""
    echo "💡 Full example:"
    echo "   DESCRIPTION=USER-AUTH TITLE=\"Implement user authentication\" TYPE=feature SPRINT=S2 PARENT_FEATSPEC=001-FS-2025-08-18-AUTH ./scripts/new_taskspec.sh"
    exit 1
fi

echo "Creating TaskSpec in programmatic mode..."

# Type-to-LOC cap mapping function
get_loc_cap_for_type() {
    local type="$1"
    case "$type" in
        "fix") echo 100 ;;
        "feature") echo 200 ;;
        "test") echo 300 ;;
        "refactor") echo 150 ;;
        "docs") echo 400 ;;
        "integration") echo 250 ;;
        *) echo 200 ;;  # default fallback
    esac
}

# Validate type value
validate_type() {
    local type="$1"
    case "$type" in
        "fix"|"feature"|"test"|"refactor"|"docs"|"integration") return 0 ;;
        *) return 1 ;;
    esac
}

# Validate parent FeatSpec ID format and existence
validate_parent_featspec() {
    local parent_fs="$1"
    
    # Check format: NNN-FS-YYYY-MM-DD-DESCRIPTION
    if ! [[ "$parent_fs" =~ ^[0-9]{3}-FS-[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Z0-9-]+$ ]]; then
        echo "❌ Invalid PARENT_FEATSPEC format. Expected: NNN-FS-YYYY-MM-DD-DESCRIPTION"
        return 1
    fi
    
    # Check if FeatSpec exists
    local featspec_file="_specs/featspecs/${parent_fs}.yaml"
    if [ ! -f "$featspec_file" ]; then
        echo "❌ Parent FeatSpec not found: $featspec_file"
        return 1
    fi
    
    return 0
}

# Get next sequential number with thread-safe reservation
get_next_taskspec_sequence() {
    local sequence_file="_specs/.taskspec_sequence"
    local lock_file="_specs/.taskspec_sequence.lock"
    
    # Ensure directories exist
    mkdir -p _specs/taskspecs
    
    # Create lock file atomically
    while ! (set -C; echo $$ > "$lock_file") 2>/dev/null; do
        sleep 0.1
    done
    
    # Ensure sequence file exists
    if [ ! -f "$sequence_file" ]; then
        echo "001" > "$sequence_file"
    fi
    
    # Read current number and increment
    local current_num=$(cat "$sequence_file")
    local next_num=$(printf "%03d" $((10#$current_num + 1)))
    
    # Write back the incremented number
    echo "$next_num" > "$sequence_file"
    
    # Remove lock
    rm -f "$lock_file"
    
    echo "$current_num"
}

# Validate parent FeatSpec
if ! validate_parent_featspec "$PARENT_FEATSPEC"; then
    exit 1
fi

# Generate TaskSpec ID with TODAY'S date and sequential number
TIMESTAMP=$(date +"%Y-%m-%d")
DATETIME=$(date +"%Y-%m-%d-%H-%M")
SEQUENCE_NUM=$(get_next_taskspec_sequence)

# Build the actual ID
TASKSPEC_ID="${SEQUENCE_NUM}-TS-${TIMESTAMP}-${DESCRIPTION}"

# Validate ID format (new sequential format)
if ! [[ "$TASKSPEC_ID" =~ ^[0-9]{3}-TS-[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Z0-9-]+$ ]]; then
    echo -e "${YELLOW}❌ Error: ID doesn't match sequential format (NNN-TS-YYYY-MM-DD-DESCRIPTION)${NC}"
    exit 1
fi

# Validate date is TODAY (no arbitrary dates allowed)
TODAY=$(date +"%Y-%m-%d")
if [[ "$TASKSPEC_ID" != *"-TS-${TODAY}-"* ]]; then
    echo -e "${YELLOW}❌ Error: TaskSpec date must be TODAY (${TODAY}), not arbitrary dates${NC}"
    exit 1
fi

# Check if taskspec already exists
TASKSPEC_FILE="_specs/taskspecs/${TASKSPEC_ID}.yaml"
if [ -f "$TASKSPEC_FILE" ]; then
    echo "❌ TaskSpec ${TASKSPEC_ID} already exists!"
    exit 1
fi

# Handle TYPE parameter
TYPE=${TYPE:-"feature"}  # default to feature
if ! validate_type "$TYPE"; then
    echo "❌ Invalid TYPE parameter: $TYPE"
    echo "Valid types: fix, feature, test, refactor, docs, integration"
    exit 1
fi

SPRINT=${SPRINT:-"S4"}

# Set LOC_CAP based on type if not explicitly provided
if [ -z "$LOC_CAP" ]; then
    LOC_CAP=$(get_loc_cap_for_type "$TYPE")
fi

COVERAGE_CAP=${COVERAGE_CAP:-80}
# DEPENDENCIES can be empty

# Check for template
TASKSPEC_TEMPLATE="_templates/taskspec.yaml"
if [ ! -f "$TASKSPEC_TEMPLATE" ]; then
    echo -e "${YELLOW}❌ TaskSpec template not found: $TASKSPEC_TEMPLATE${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Creating TaskSpec: ${TASKSPEC_ID}${NC}"
echo -e "${GREEN}Parent FeatSpec: ${PARENT_FEATSPEC}${NC}"
echo ""

# Create TaskSpec from template
cp "$TASKSPEC_TEMPLATE" "$TASKSPEC_FILE"
sed -i "s/NNN-TS-YYYY-MM-DD-DESCRIPTION/${TASKSPEC_ID}/g" "$TASKSPEC_FILE"
sed -i "s/<imperative, ≤ 72 chars>/${TITLE}/g" "$TASKSPEC_FILE"
sed -i "s/NNN-FS-YYYY-MM-DD-PARENT-DESCRIPTION/${PARENT_FEATSPEC}/g" "$TASKSPEC_FILE"
sed -i "s/YYYY-MM-DD-HH-MM/${DATETIME}/g" "$TASKSPEC_FILE"
sed -i "s/S4/${SPRINT}/g" "$TASKSPEC_FILE"
sed -i "s/type: feature/type: ${TYPE}/g" "$TASKSPEC_FILE"
sed -i "s/loc_cap: 200/loc_cap: ${LOC_CAP}/g" "$TASKSPEC_FILE"
sed -i "s/coverage_cap: 80/coverage_cap: ${COVERAGE_CAP}/g" "$TASKSPEC_FILE"

# Update parent FeatState file
PARENT_FEATSTATE=$(echo "$PARENT_FEATSPEC" | sed 's/-FS-/-FSTATE-/')
FEATSTATE_FILE="_specs/featspecs/${PARENT_FEATSTATE}.yaml"

if [ -f "$FEATSTATE_FILE" ]; then
    echo "🔄 Adding TaskSpec entry to parent FeatState..."
    
    # Add TaskSpec entry to the FeatState (simplified - in production this would be more sophisticated)
    cat >> "$FEATSTATE_FILE" << EOF

### TaskSpec: ${TASKSPEC_ID}
\`\`\`yaml
task_id: "${TASKSPEC_ID}"
task_title: "${TITLE}"
status: draft
owner: unassigned
worktree: ""
loc_cap: ${LOC_CAP}
coverage_cap: ${COVERAGE_CAP}
purpose_hash: ""
merged_date: ""
sprint: ${SPRINT}
created: ${DATETIME}
updated: ${DATETIME}
parent_featspec: "${PARENT_FEATSPEC}"
type: "${TYPE}"

# Implementation Progress
implementation_checklist:
  - [ ] Add failing tests for each acceptance criterion
  - [ ] Implement code until tests pass & linting clean
  - [ ] Update parent FeatSpec state tracking
  - [ ] Commit with trailer TaskSpec status=qa

# QA Progress  
qa_checklist:
  - [ ] Review test coverage & LoC cap
  - [ ] Compare code vs Architecture-Implementation Alignment Matrix
  - [ ] Verify integration with parent FeatSpec
  - [ ] If pass, commit trailer TaskSpec status=done

# Test Results
test_coverage: 0
test_results: ""
lint_status: ""
build_status: ""
\`\`\`
EOF

    echo -e "${GREEN}✅ Updated parent FeatState: ${FEATSTATE_FILE}${NC}"
else
    echo -e "${YELLOW}⚠️  Parent FeatState not found: $FEATSTATE_FILE${NC}"
    echo "   TaskSpec created but parent state not updated"
fi

echo -e "${GREEN}✅ Created TaskSpec: ${TASKSPEC_FILE}${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Edit the TaskSpec with implementation details"
echo "   2. Update parent FeatState as work progresses"
echo "   3. Link TaskSpec to worktree when development starts"
echo ""
echo "📋 Files created/updated:"
echo "   - $TASKSPEC_FILE (immutable specification)"
echo "   - $FEATSTATE_FILE (updated with TaskSpec state entry)"