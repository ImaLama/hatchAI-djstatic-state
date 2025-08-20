#!/bin/bash
# Create a new FeatSpec and FeatState from templates
# Mirrors: hatchAI-devcards/scripts/new_featcard.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Create New FeatSpec ==="
echo ""

# Check if running in programmatic mode (all required params provided)
PROGRAMMATIC_MODE=false
if [ -n "$DESCRIPTION" ] && [ -n "$TITLE" ]; then
    PROGRAMMATIC_MODE=true
    echo "Running in programmatic mode..."
else
    echo "Running in interactive mode..."
fi

# Get next sequential number with thread-safe reservation
get_next_featspec_sequence() {
    local sequence_file="_specs/.featspec_sequence"
    local lock_file="_specs/.featspec_sequence.lock"
    
    # Ensure directories exist
    mkdir -p _featstate
    
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

# Input validation function
validate_description() {
    local desc="$1"
    
    if [ -z "$desc" ]; then
        echo -e "${RED}❌ Description is required${NC}" >&2
        return 1
    fi
    
    # Check for uppercase and hyphens only
    if ! [[ "$desc" =~ ^[A-Z0-9-]+$ ]]; then
        echo -e "${RED}❌ Description must contain only uppercase letters, numbers, and hyphens${NC}" >&2
        return 1
    fi
    
    return 0
}

validate_title() {
    local title="$1"
    
    if [ -z "$title" ]; then
        echo -e "${RED}❌ Title is required${NC}" >&2
        return 1
    fi
    
    if [ ${#title} -gt 72 ]; then
        echo -e "${RED}❌ Title must be ≤72 characters (currently ${#title})${NC}" >&2
        return 1
    fi
    
    return 0
}

# Generate FeatSpec ID with TODAY'S date and sequential number
TIMESTAMP=$(date +"%Y-%m-%d")
DATETIME=$(date +"%Y-%m-%d-%H-%M")
SEQUENCE_NUM=$(get_next_featspec_sequence)

# Get description (interactive or programmatic)
if [ "$PROGRAMMATIC_MODE" = false ]; then
    echo "Description should be uppercase with hyphens (e.g., USER-AUTH-SYSTEM):"
    read -p "Description: " DESCRIPTION
    if ! validate_description "$DESCRIPTION"; then
        exit 1
    fi
elif ! validate_description "$DESCRIPTION"; then
    echo "❌ DESCRIPTION parameter validation failed in programmatic mode"
    exit 1
fi

# Get title (interactive or programmatic)
if [ "$PROGRAMMATIC_MODE" = false ]; then
    echo "Title should be imperative and ≤72 characters:"
    read -p "Title: " TITLE
    if ! validate_title "$TITLE"; then
        exit 1
    fi
elif ! validate_title "$TITLE"; then
    echo "❌ TITLE parameter validation failed in programmatic mode"
    exit 1
fi

# Build the IDs
FEATSPEC_ID="${SEQUENCE_NUM}-FS-${TIMESTAMP}-${DESCRIPTION}"
FEATSTATE_ID="${SEQUENCE_NUM}-FSTATE-${TIMESTAMP}-${DESCRIPTION}"

# Get sprint (optional)
SPRINT=${SPRINT:-"S4"}
if [ "$PROGRAMMATIC_MODE" = false ] && [ -z "$SPRINT" ]; then
    read -p "Sprint (default: S4): " SPRINT
    SPRINT=${SPRINT:-"S4"}
fi

echo ""
echo -e "${GREEN}Creating FeatSpec: ${FEATSPEC_ID}${NC}"
echo -e "${GREEN}Creating FeatState: ${FEATSTATE_ID}${NC}"
echo ""

# Create the FeatSpec file
FEATSPEC_FILE="_featstate/${FEATSPEC_ID}.yaml"
FEATSTATE_FILE="_featstate/${FEATSTATE_ID}.yaml"

# Check if files already exist
if [ -f "$FEATSPEC_FILE" ] || [ -f "$FEATSTATE_FILE" ]; then
    echo "❌ Files already exist!"
    echo "   FeatSpec: $FEATSPEC_FILE"
    echo "   FeatState: $FEATSTATE_FILE"
    exit 1
fi

# Check for templates
FEATSPEC_TEMPLATE="_templates/featspec.yaml"
FEATSTATE_TEMPLATE="_templates/featstate.yaml"

if [ ! -f "$FEATSPEC_TEMPLATE" ]; then
    echo -e "${RED}❌ FeatSpec template not found: $FEATSPEC_TEMPLATE${NC}"
    exit 1
fi

if [ ! -f "$FEATSTATE_TEMPLATE" ]; then
    echo -e "${RED}❌ FeatState template not found: $FEATSTATE_TEMPLATE${NC}"
    exit 1
fi

# Create FeatSpec from template
cp "$FEATSPEC_TEMPLATE" "$FEATSPEC_FILE"
sed -i "s/NNN-FS-YYYY-MM-DD-DESCRIPTION/${FEATSPEC_ID}/g" "$FEATSPEC_FILE"
sed -i "s/<imperative, ≤ 72 chars>/${TITLE}/g" "$FEATSPEC_FILE"
sed -i "s/YYYY-MM-DD-HH-MM/${DATETIME}/g" "$FEATSPEC_FILE"
sed -i "s/YYYY-MM-DD/${TIMESTAMP}/g" "$FEATSPEC_FILE"
sed -i "s/S4/${SPRINT}/g" "$FEATSPEC_FILE"

# Create FeatState from template
cp "$FEATSTATE_TEMPLATE" "$FEATSTATE_FILE"
sed -i "s/NNN-FS-YYYY-MM-DD-DESCRIPTION/${FEATSPEC_ID}/g" "$FEATSTATE_FILE"
sed -i "s/NNN-FSTATE-YYYY-MM-DD-DESCRIPTION/${FEATSTATE_ID}/g" "$FEATSTATE_FILE"
sed -i "s/<feature title>/${TITLE}/g" "$FEATSTATE_FILE"
sed -i "s/YYYY-MM-DD-HH-MM/${DATETIME}/g" "$FEATSTATE_FILE"
sed -i "s/YYYY-MM-DD/${TIMESTAMP}/g" "$FEATSTATE_FILE"
sed -i "s/S4/${SPRINT}/g" "$FEATSTATE_FILE"

echo -e "${GREEN}✅ Created FeatSpec: ${FEATSPEC_FILE}${NC}"
echo -e "${GREEN}✅ Created FeatState: ${FEATSTATE_FILE}${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Edit the FeatSpec with your feature details"
echo "   2. Create TaskSpecs: task taskspec-new"
echo "   3. Update FeatState as work progresses"
echo ""
echo "📋 Files created:"
echo "   - $FEATSPEC_FILE (immutable specification)"
echo "   - $FEATSTATE_FILE (mutable state tracking)"