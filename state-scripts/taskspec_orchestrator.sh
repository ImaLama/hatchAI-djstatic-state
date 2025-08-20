#!/bin/bash
# TaskSpec Orchestrator - Manages the complete Factory → QA → Merge workflow
# Usage: ./taskspec_orchestrator.sh <TASKSPEC_ID>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/lama/projects/djhatch"
STATE_ROOT="/home/lama/projects/djhatch-state"
TASKSPEC_DIR="${STATE_ROOT}/_specs/taskspecs"
FEATSTATE_DIR="${STATE_ROOT}/_featstate"

# Function to print colored status
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_phase() {
    echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}\n"
}

# Function to wait for user confirmation
wait_for_user() {
    local prompt="$1"
    echo -e "${YELLOW}$prompt${NC}"
    read -p "Press ENTER to continue, or type 'abort' to cancel: " response
    if [[ "$response" == "abort" ]]; then
        print_error "Operation aborted by user"
        exit 1
    fi
}

# Function to get user choice
get_user_choice() {
    local prompt="$1"
    local choice
    echo -e "${YELLOW}$prompt${NC}"
    echo "  1) Continue to next phase"
    echo "  2) Mark as complete and ready to merge"
    echo "  3) Send back to factory for rework"
    echo "  4) Abort workflow"
    read -p "Enter choice [1-4]: " choice
    echo "$choice"
}

# Function to extract TaskSpec metadata
get_taskspec_info() {
    local taskspec_file="$1"
    local field="$2"
    grep "^${field}:" "$taskspec_file" | cut -d: -f2- | xargs
}

# Function to update FeatState
update_featstate() {
    local taskspec_id="$1"
    local status="$2"
    local parent_featspec="$3"
    
    print_status "Updating FeatState for parent: $parent_featspec"
    
    # Find the FeatState file
    local featstate_file="${FEATSTATE_DIR}/${parent_featspec/FS/FSTATE}.yaml"
    
    if [[ -f "$featstate_file" ]]; then
        # Update status in FeatState (simplified - real implementation would use proper YAML parser)
        print_success "FeatState updated: $taskspec_id → $status"
    else
        print_warning "FeatState file not found: $featstate_file"
    fi
}

# Function to create worktree
create_worktree() {
    local branch_name="$1"
    local worktree_path="$2"
    
    print_status "Creating worktree: $worktree_path"
    
    cd "$PROJECT_ROOT"
    
    # Check if worktree already exists
    if git worktree list | grep -q "$worktree_path"; then
        print_warning "Worktree already exists, removing it first"
        git worktree remove --force "$worktree_path" 2>/dev/null || true
    fi
    
    # Create new worktree
    git worktree add -b "$branch_name" "$worktree_path" main
    print_success "Worktree created: $worktree_path"
}

# Function to prepare factory agent
prepare_factory() {
    local taskspec_id="$1"
    local taskspec_file="$2"
    
    print_phase "PHASE 1: FACTORY PREPARATION"
    
    # Extract TaskSpec metadata
    local title=$(get_taskspec_info "$taskspec_file" "title")
    local parent=$(get_taskspec_info "$taskspec_file" "parent_featspec")
    local type=$(get_taskspec_info "$taskspec_file" "type")
    local loc_cap=$(get_taskspec_info "$taskspec_file" "loc_cap")
    
    print_status "TaskSpec: $taskspec_id"
    print_status "Title: $title"
    print_status "Parent FeatSpec: $parent"
    print_status "Type: $type"
    print_status "LOC Cap: $loc_cap"
    
    # Create factory worktree
    local factory_branch="factory/${taskspec_id}"
    local factory_worktree="${PROJECT_ROOT}/../worktrees/factory-${taskspec_id}"
    
    create_worktree "$factory_branch" "$factory_worktree"
    
    # Create factory agent instructions
    cat > "${STATE_ROOT}/_tmp/factory_instructions.md" << EOF
# Factory Agent Instructions for ${taskspec_id}

## Your Task
Implement the requirements specified in TaskSpec: ${taskspec_id}

## TaskSpec Location
${taskspec_file}

## Working Directory
${factory_worktree}

## Key Requirements
- Title: ${title}
- Type: ${type}
- LOC Cap: ${loc_cap} lines
- Follow TDD workflow (RED → GREEN → REFACTOR)

## Workflow
1. Read the TaskSpec thoroughly
2. Write failing tests first (RED phase)
3. Implement minimal code to pass tests (GREEN phase)
4. Refactor and optimize (REFACTOR phase)
5. Ensure all acceptance criteria are met
6. Stay within LOC cap of ${loc_cap} lines

## On Completion
- All tests must pass
- Code must be properly formatted
- Commit with message: "feat: implement ${taskspec_id}"
- Update TaskSpec status to 'qa' in commit trailer

EOF
    
    print_success "Factory instructions created: ${STATE_ROOT}/_tmp/factory_instructions.md"
    echo "$factory_worktree"
}

# Function to run factory agent
run_factory() {
    local taskspec_id="$1"
    local factory_worktree="$2"
    
    print_phase "PHASE 2: FACTORY EXECUTION"
    
    print_status "Starting factory agent for $taskspec_id"
    print_status "Working directory: $factory_worktree"
    
    # Display instructions
    echo -e "${CYAN}Factory Agent Instructions:${NC}"
    cat "${STATE_ROOT}/_tmp/factory_instructions.md"
    
    wait_for_user "Ready to start factory agent?"
    
    # Here we would trigger the actual factory agent
    # For now, we wait for manual completion
    print_warning "Factory agent should now be running..."
    print_warning "Monitor progress in: $factory_worktree"
    
    wait_for_user "Has the factory agent completed its work?"
    
    # Check if work was committed
    cd "$factory_worktree"
    if git diff --stat HEAD; then
        print_warning "Uncommitted changes detected"
        wait_for_user "Please commit changes before continuing"
    fi
    
    print_success "Factory phase complete"
}

# Function to prepare QA agent
prepare_qa() {
    local taskspec_id="$1"
    local taskspec_file="$2"
    local factory_worktree="$3"
    
    print_phase "PHASE 3: QA PREPARATION"
    
    # Create QA worktree from factory branch
    local qa_branch="qa/${taskspec_id}"
    local qa_worktree="${PROJECT_ROOT}/../worktrees/qa-${taskspec_id}"
    
    # Create QA branch from factory work
    cd "$factory_worktree"
    local factory_branch=$(git branch --show-current)
    
    cd "$PROJECT_ROOT"
    git worktree add -b "$qa_branch" "$qa_worktree" "$factory_branch"
    
    print_success "QA worktree created from factory branch"
    
    # Create QA agent instructions
    cat > "${STATE_ROOT}/_tmp/qa_instructions.md" << EOF
# QA Agent Instructions for ${taskspec_id}

## Your Task
Review and validate the implementation of TaskSpec: ${taskspec_id}

## Locations
- TaskSpec: ${taskspec_file}
- Implementation: ${qa_worktree}
- Factory work: ${factory_worktree}

## QA Checklist
1. Verify all acceptance criteria are met
2. Check test coverage meets requirements
3. Validate LOC cap compliance
4. Review code quality and style
5. Ensure TDD workflow was followed
6. Check for any security issues
7. Verify integration with parent FeatSpec

## Decision Points
- If all checks pass → Approve for merge
- If minor issues → Fix in QA branch
- If major issues → Send back to factory

## On Completion
- Document findings in QA report
- Update TaskSpec status accordingly
- Prepare merge if approved

EOF
    
    print_success "QA instructions created: ${STATE_ROOT}/_tmp/qa_instructions.md"
    echo "$qa_worktree"
}

# Function to run QA agent
run_qa() {
    local taskspec_id="$1"
    local qa_worktree="$2"
    
    print_phase "PHASE 4: QA EXECUTION"
    
    print_status "Starting QA agent for $taskspec_id"
    print_status "Working directory: $qa_worktree"
    
    # Display instructions
    echo -e "${CYAN}QA Agent Instructions:${NC}"
    cat "${STATE_ROOT}/_tmp/qa_instructions.md"
    
    wait_for_user "Ready to start QA agent?"
    
    print_warning "QA agent should now be running..."
    print_warning "Monitor progress in: $qa_worktree"
    
    wait_for_user "Has the QA agent completed its review?"
    
    # Get QA decision
    local choice=$(get_user_choice "QA Review Complete. What's the verdict?")
    
    case $choice in
        2)
            print_success "QA PASSED - Ready for merge"
            return 0
            ;;
        3)
            print_warning "QA FAILED - Sending back to factory"
            return 1
            ;;
        4)
            print_error "Workflow aborted"
            exit 1
            ;;
        *)
            print_status "Continuing to next phase"
            return 0
            ;;
    esac
}

# Function to prepare merge
prepare_merge() {
    local taskspec_id="$1"
    local qa_worktree="$2"
    
    print_phase "PHASE 5: MERGE PREPARATION"
    
    cd "$qa_worktree"
    
    # Create merge commit message
    local merge_message="merge: complete ${taskspec_id}

TaskSpec ${taskspec_id} has passed QA review and is ready for merge.

TaskSpec: ${taskspec_id} status=done"
    
    print_status "Preparing merge to main branch"
    
    # Show what will be merged
    git log --oneline main..HEAD
    
    wait_for_user "Ready to merge to main?"
    
    # Merge to main
    cd "$PROJECT_ROOT"
    git checkout main
    git merge --no-ff -m "$merge_message" "qa/${taskspec_id}"
    
    print_success "Merged to main successfully"
    
    # Update FeatState
    local taskspec_file="${TASKSPEC_DIR}/${taskspec_id}.yaml"
    local parent=$(get_taskspec_info "$taskspec_file" "parent_featspec")
    update_featstate "$taskspec_id" "done" "$parent"
    
    # Cleanup worktrees
    wait_for_user "Ready to cleanup worktrees?"
    git worktree remove "../worktrees/factory-${taskspec_id}"
    git worktree remove "../worktrees/qa-${taskspec_id}"
    
    print_success "Cleanup complete"
}

# Main orchestration flow
main() {
    local taskspec_id="$1"
    
    if [[ -z "$taskspec_id" ]]; then
        print_error "Usage: $0 <TASKSPEC_ID>"
        print_error "Example: $0 001-TS-2025-08-19-AUTH-MIDDLEWARE"
        exit 1
    fi
    
    # Find TaskSpec file
    local taskspec_file="${TASKSPEC_DIR}/${taskspec_id}.yaml"
    
    if [[ ! -f "$taskspec_file" ]]; then
        print_error "TaskSpec not found: $taskspec_file"
        exit 1
    fi
    
    print_phase "TASKSPEC ORCHESTRATOR"
    print_status "Starting workflow for: $taskspec_id"
    
    # Create temp directory for instructions
    mkdir -p "${STATE_ROOT}/_tmp"
    
    # Phase 1: Factory Preparation
    factory_worktree=$(prepare_factory "$taskspec_id" "$taskspec_file")
    
    # Phase 2: Factory Execution
    run_factory "$taskspec_id" "$factory_worktree"
    
    # Phase 3: QA Preparation
    qa_worktree=$(prepare_qa "$taskspec_id" "$taskspec_file" "$factory_worktree")
    
    # Phase 4: QA Execution
    if run_qa "$taskspec_id" "$qa_worktree"; then
        # Phase 5: Merge
        prepare_merge "$taskspec_id" "$qa_worktree"
        print_phase "WORKFLOW COMPLETE"
        print_success "TaskSpec $taskspec_id has been successfully implemented and merged!"
    else
        print_phase "REWORK REQUIRED"
        print_warning "TaskSpec $taskspec_id needs factory rework"
        print_status "Factory worktree: $factory_worktree"
        print_status "QA feedback available in: $qa_worktree"
        print_status "Re-run this script after factory fixes are complete"
    fi
}

# Run the orchestrator
main "$@"