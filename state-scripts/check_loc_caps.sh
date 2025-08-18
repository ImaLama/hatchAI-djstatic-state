#!/bin/bash
# Check LOC caps for current changes with tiered cap support
# Adapted from hatchAI-devcards for djhatch-state system
#
# USAGE:
#   ./state-scripts/check_loc_caps.sh [--help]
#
# FEATURES:
#   - Tiered LOC caps based on TaskSpec type:
#     * fix: 100 lines      * feature: 200 lines    * test: 300 lines
#     * refactor: 150 lines * docs: 400 lines       * integration: 250 lines
#   - Weighted calculation: test files count at 50% (e.g., *_test.go, test_*.py)
#   - Progressive warnings at 60% and 80% of cap usage
#   - Backward compatible with existing TaskSpecs (defaults to 200 lines)
#   - Supports explicit loc_cap override in TaskSpec YAML
#
# EXAMPLES:
#   task loc-check                    # Check current branch against main
#   ./state-scripts/check_loc_caps.sh # Direct script execution

set -e

# Show help if requested
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    sed -n '2,/^$/p' "$0" | sed '/^#!/d' | sed 's/^# //g' | sed 's/^#//g'
    exit 0
fi

# Default LOC cap
DEFAULT_LOC_CAP=200

# Tiered LOC caps based on TaskSpec type
declare -A TYPE_CAPS=(
    ["fix"]=100
    ["feature"]=200
    ["test"]=300
    ["refactor"]=150
    ["docs"]=400
    ["integration"]=250
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to detect TaskSpec type from YAML
get_taskspec_type() {
    local taskspec_file="$1"
    if [[ -f "$taskspec_file" ]]; then
        local type=$(grep -E "^type:" "$taskspec_file" 2>/dev/null | awk '{print $2}' | tr -d '"' | tr -d "'")
        echo "$type"
    fi
}

# Function to get LOC cap based on TaskSpec type
get_loc_cap_for_type() {
    local taskspec_type="$1"
    local taskspec_loc_cap="$2"
    
    # If explicit loc_cap is set in TaskSpec, use it
    if [[ -n "$taskspec_loc_cap" ]]; then
        echo "$taskspec_loc_cap"
        return
    fi
    
    # If type is specified, use tier-based cap
    if [[ -n "$taskspec_type" ]] && [[ -n "${TYPE_CAPS[$taskspec_type]}" ]]; then
        echo "${TYPE_CAPS[$taskspec_type]}"
        return
    fi
    
    # Default fallback
    echo "$DEFAULT_LOC_CAP"
}

# Function to calculate weighted LOC (test files count as 50%)
calculate_weighted_loc() {
    local file="$1"
    local added="$2"
    local deleted="$3"
    
    local net=$((added - deleted))
    
    # Test files (*_test.go, *_test.py, test_*.go, etc.) count at 50%
    if [[ "$file" =~ _test\.(go|py|js|ts)$ ]] || [[ "$file" =~ ^test_.*\.(go|py|js|ts)$ ]] || [[ "$file" =~ \.test\.(js|ts)$ ]]; then
        # Apply 50% weight to test files, round to nearest integer
        local weighted_net=$(echo "scale=0; ($net * 0.5 + 0.5)/1" | bc -l 2>/dev/null || echo $((net / 2)))
        echo "$weighted_net"
    else
        echo "$net"
    fi
}

# Function to show progressive warnings
show_progress_warning() {
    local current="$1"
    local cap="$2"
    
    local percentage=$(echo "scale=1; $current * 100 / $cap" | bc -l 2>/dev/null || echo "0")
    local percentage_int=$(echo "$percentage" | cut -d. -f1)
    
    if [[ $percentage_int -ge 80 ]]; then
        echo -e "${RED}⚠️  Warning: Approaching LOC cap (${percentage}% of ${cap})${NC}"
    elif [[ $percentage_int -ge 60 ]]; then
        echo -e "${YELLOW}⚠️  Notice: ${percentage}% of LOC cap used (${current}/${cap})${NC}"
    fi
}

echo "=== Checking LOC Caps ==="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Detached HEAD state${NC}"
    CURRENT_BRANCH="HEAD"
fi

# Find merge base with main/master
MAIN_BRANCH="main"
if ! git rev-parse --verify "$MAIN_BRANCH" > /dev/null 2>&1; then
    MAIN_BRANCH="master"
    if ! git rev-parse --verify "$MAIN_BRANCH" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  No main/master branch found, comparing with HEAD~1${NC}"
        BASE_COMMIT="HEAD~1"
    else
        BASE_COMMIT=$(git merge-base "$MAIN_BRANCH" "$CURRENT_BRANCH")
    fi
else
    BASE_COMMIT=$(git merge-base "$MAIN_BRANCH" "$CURRENT_BRANCH")
fi

# Get diff statistics
STATS=$(git diff --numstat "$BASE_COMMIT" 2>/dev/null || git diff --numstat --cached)

if [ -z "$STATS" ]; then
    echo -e "${GREEN}✅ No changes detected${NC}"
    exit 0
fi

# Calculate total additions, deletions, and weighted changes
TOTAL_ADDED=0
TOTAL_DELETED=0
TOTAL_WEIGHTED_NET=0

echo ""
echo "File changes:"
echo "----------------------------------------"

while IFS=$'\t' read -r added deleted file; do
    # Skip binary files
    if [ "$added" = "-" ] || [ "$deleted" = "-" ]; then
        continue
    fi
    
    # Skip vendor, generated files from LOC count (but not test files now)
    if [[ "$file" =~ vendor/ ]] || [[ "$file" =~ .pb.go$ ]] || [[ "$file" =~ _gen.go$ ]]; then
        echo "  [skip] $file"
        continue
    fi
    
    TOTAL_ADDED=$((TOTAL_ADDED + added))
    TOTAL_DELETED=$((TOTAL_DELETED + deleted))
    
    # Calculate weighted net change for this file
    WEIGHTED_NET=$(calculate_weighted_loc "$file" "$added" "$deleted")
    TOTAL_WEIGHTED_NET=$((TOTAL_WEIGHTED_NET + WEIGHTED_NET))
    
    NET=$((added - deleted))
    
    # Show file details with weight indication
    weight_indicator=""
    if [[ "$file" =~ _test\.(go|py|js|ts)$ ]] || [[ "$file" =~ ^test_.*\.(go|py|js|ts)$ ]] || [[ "$file" =~ \.test\.(js|ts)$ ]]; then
        weight_indicator=" (50% weight)"
    fi
    
    if [ $NET -gt 0 ]; then
        printf "  %-40s +%-5d -%-5d (net: +%d%s)\n" "$file" "$added" "$deleted" "$NET" "$weight_indicator"
    elif [ $NET -lt 0 ]; then
        printf "  %-40s +%-5d -%-5d (net: %d%s)\n" "$file" "$added" "$deleted" "$NET" "$weight_indicator"
    else
        printf "  %-40s +%-5d -%-5d (net: %d%s)\n" "$file" "$added" "$deleted" "$NET" "$weight_indicator"
    fi
done <<< "$STATS"

echo "----------------------------------------"

NET_CHANGE=$((TOTAL_ADDED - TOTAL_DELETED))

echo ""
echo "Summary:"
echo "  Lines added:    $TOTAL_ADDED"
echo "  Lines deleted:  $TOTAL_DELETED"
echo "  Net change:     $NET_CHANGE"
echo "  Weighted net:   $TOTAL_WEIGHTED_NET"
echo ""

# Try to get LOC cap from current TaskSpec
LOC_CAP=$DEFAULT_LOC_CAP
TASKSPEC_FILE=""
TASKSPEC_TYPE=""

# Look for TaskSpec in commit messages
TASKSPEC_ID=$(git log "$BASE_COMMIT"..HEAD --format=%B 2>/dev/null | grep -oE "TaskSpec: ([0-9]{3}-TS-[A-Z0-9-]+)" | head -1 | cut -d' ' -f2)

if [ -n "$TASKSPEC_ID" ]; then
    TASKSPEC_FILE="_specs/taskspecs/${TASKSPEC_ID}.yaml"
    if [ -f "$TASKSPEC_FILE" ]; then
        # Extract TaskSpec type and LOC cap
        TASKSPEC_TYPE=$(get_taskspec_type "$TASKSPEC_FILE")
        TASKSPEC_LOC_CAP=$(grep -E "^loc_cap:" "$TASKSPEC_FILE" 2>/dev/null | awk '{print $2}')
        
        # Get effective LOC cap using tiered system
        LOC_CAP=$(get_loc_cap_for_type "$TASKSPEC_TYPE" "$TASKSPEC_LOC_CAP")
        
        if [ -n "$TASKSPEC_TYPE" ]; then
            echo "TaskSpec type: $TASKSPEC_TYPE"
        fi
        echo "Using LOC cap from $TASKSPEC_ID: $LOC_CAP"
    fi
else
    echo "No TaskSpec found in commits, using default LOC cap: $LOC_CAP"
fi

# Show progressive warnings
show_progress_warning "$TOTAL_WEIGHTED_NET" "$LOC_CAP"

echo ""

# Check against cap using weighted net change
if [ $TOTAL_WEIGHTED_NET -le $LOC_CAP ]; then
    echo -e "${GREEN}✅ LOC cap check passed${NC} ($TOTAL_WEIGHTED_NET ≤ $LOC_CAP)"
    if [ $TOTAL_WEIGHTED_NET -ne $NET_CHANGE ]; then
        echo -e "${GREEN}   (Weighted calculation: $TOTAL_WEIGHTED_NET vs raw: $NET_CHANGE)${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ LOC cap exceeded!${NC} ($TOTAL_WEIGHTED_NET > $LOC_CAP)"
    if [ $TOTAL_WEIGHTED_NET -ne $NET_CHANGE ]; then
        echo -e "${RED}   (Weighted calculation: $TOTAL_WEIGHTED_NET vs raw: $NET_CHANGE)${NC}"
    fi
    echo ""
    echo "Options:"
    echo "1. Reduce the scope of changes"
    echo "2. Split into multiple TaskSpecs"
    echo "3. Remove more code to offset additions"
    echo "4. Consider that test files count at 50% weight"
    echo ""
    
    # Show which files contribute most to the overage (with weights)
    echo "Largest contributors (weighted):"
    git diff --numstat "$BASE_COMMIT" | sort -rn | head -5 | while IFS=$'\t' read -r added deleted file; do
        if [ "$added" != "-" ] && [ "$deleted" != "-" ]; then
            NET=$((added - deleted))
            WEIGHTED=$(calculate_weighted_loc "$file" "$added" "$deleted")
            if [ $WEIGHTED -gt 10 ]; then
                if [ $WEIGHTED -ne $NET ]; then
                    echo "  $file: weighted +$WEIGHTED lines (raw: +$NET)"
                else
                    echo "  $file: +$NET lines"
                fi
            fi
        fi
    done
    
    exit 1
fi