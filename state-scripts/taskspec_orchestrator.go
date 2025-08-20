package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v2"
)

// Colors for terminal output
const (
	ColorRed    = "\033[0;31m"
	ColorGreen  = "\033[0;32m"
	ColorYellow = "\033[1;33m"
	ColorBlue   = "\033[0;34m"
	ColorCyan   = "\033[0;36m"
	ColorReset  = "\033[0m"
)

// Configuration paths
const (
	ProjectRoot  = "/home/lama/projects/djhatch"
	StateRoot    = "/home/lama/projects/djhatch-state"
	TaskSpecDir  = "/home/lama/projects/djhatch-state/_specs/taskspecs"
	FeatStateDir = "/home/lama/projects/djhatch-state/_featstate"
	TempDir      = "/home/lama/projects/djhatch-state/_tmp"
)

// TaskSpec represents a TaskSpec YAML structure
type TaskSpec struct {
	ID             string `yaml:"id"`
	Title          string `yaml:"title"`
	ParentFeatSpec string `yaml:"parent_featspec"`
	Type           string `yaml:"type"`
	LocCap         int    `yaml:"loc_cap"`
	CoverageCap    int    `yaml:"coverage_cap"`
	DependsOn      []string `yaml:"depends_on"`
}

// WorkflowPhase represents a phase in the orchestration
type WorkflowPhase int

const (
	PhaseFactory WorkflowPhase = iota
	PhaseQA
	PhaseMerge
	PhaseRework
)

// Orchestrator manages the TaskSpec workflow
type Orchestrator struct {
	TaskSpecID      string
	TaskSpec        *TaskSpec
	TaskSpecFile    string
	FactoryWorktree string
	QAWorktree      string
	CurrentPhase    WorkflowPhase
}

// Output helpers
func printStatus(msg string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("%s[%s]%s %s\n", ColorBlue, timestamp, ColorReset, msg)
}

func printSuccess(msg string) {
	fmt.Printf("%s✓%s %s\n", ColorGreen, ColorReset, msg)
}

func printError(msg string) {
	fmt.Printf("%s✗%s %s\n", ColorRed, ColorReset, msg)
}

func printWarning(msg string) {
	fmt.Printf("%s⚠%s %s\n", ColorYellow, ColorReset, msg)
}

func printPhase(phase string) {
	border := strings.Repeat("═", 56)
	fmt.Printf("\n%s%s%s\n", ColorCyan, border, ColorReset)
	fmt.Printf("%s  %s%s\n", ColorCyan, phase, ColorReset)
	fmt.Printf("%s%s%s\n\n", ColorCyan, border, ColorReset)
}

// waitForUser prompts user and waits for confirmation
func waitForUser(prompt string) error {
	fmt.Printf("%s%s%s\n", ColorYellow, prompt, ColorReset)
	fmt.Print("Press ENTER to continue, or type 'abort' to cancel: ")
	
	reader := bufio.NewReader(os.Stdin)
	response, err := reader.ReadString('\n')
	if err != nil {
		return err
	}
	
	response = strings.TrimSpace(response)
	if response == "abort" {
		return fmt.Errorf("operation aborted by user")
	}
	
	return nil
}

// getUserChoice prompts for a workflow decision
func getUserChoice(prompt string) (int, error) {
	fmt.Printf("%s%s%s\n", ColorYellow, prompt, ColorReset)
	fmt.Println("  1) Continue to next phase")
	fmt.Println("  2) Mark as complete and ready to merge")
	fmt.Println("  3) Send back to factory for rework")
	fmt.Println("  4) Abort workflow")
	fmt.Print("Enter choice [1-4]: ")
	
	var choice int
	_, err := fmt.Scanln(&choice)
	return choice, err
}

// runCommand executes a shell command
func runCommand(cmd string, args ...string) error {
	command := exec.Command(cmd, args...)
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command.Run()
}

// runCommandOutput executes a command and returns output
func runCommandOutput(cmd string, args ...string) (string, error) {
	output, err := exec.Command(cmd, args...).Output()
	return string(output), err
}

// LoadTaskSpec loads and parses a TaskSpec YAML file
func LoadTaskSpec(taskSpecID string) (*TaskSpec, string, error) {
	taskSpecFile := filepath.Join(TaskSpecDir, taskSpecID+".yaml")
	
	data, err := ioutil.ReadFile(taskSpecFile)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read TaskSpec file: %v", err)
	}
	
	var taskSpec TaskSpec
	if err := yaml.Unmarshal(data, &taskSpec); err != nil {
		return nil, "", fmt.Errorf("failed to parse TaskSpec YAML: %v", err)
	}
	
	return &taskSpec, taskSpecFile, nil
}

// createWorktree creates a new git worktree
func createWorktree(branchName, worktreePath string) error {
	printStatus(fmt.Sprintf("Creating worktree: %s", worktreePath))
	
	// Check if worktree exists
	output, _ := runCommandOutput("git", "-C", ProjectRoot, "worktree", "list")
	if strings.Contains(output, worktreePath) {
		printWarning("Worktree already exists, removing it first")
		runCommand("git", "-C", ProjectRoot, "worktree", "remove", "--force", worktreePath)
	}
	
	// Create new worktree
	if err := runCommand("git", "-C", ProjectRoot, "worktree", "add", "-b", branchName, worktreePath, "main"); err != nil {
		return fmt.Errorf("failed to create worktree: %v", err)
	}
	
	printSuccess(fmt.Sprintf("Worktree created: %s", worktreePath))
	return nil
}

// PrepareFactory sets up the factory phase
func (o *Orchestrator) PrepareFactory() error {
	printPhase("PHASE 1: FACTORY PREPARATION")
	
	printStatus(fmt.Sprintf("TaskSpec: %s", o.TaskSpecID))
	printStatus(fmt.Sprintf("Title: %s", o.TaskSpec.Title))
	printStatus(fmt.Sprintf("Parent FeatSpec: %s", o.TaskSpec.ParentFeatSpec))
	printStatus(fmt.Sprintf("Type: %s", o.TaskSpec.Type))
	printStatus(fmt.Sprintf("LOC Cap: %d", o.TaskSpec.LocCap))
	
	// Create factory worktree
	factoryBranch := fmt.Sprintf("factory/%s", o.TaskSpecID)
	o.FactoryWorktree = fmt.Sprintf("%s/../worktrees/factory-%s", ProjectRoot, o.TaskSpecID)
	
	if err := createWorktree(factoryBranch, o.FactoryWorktree); err != nil {
		return err
	}
	
	// Create factory instructions
	instructions := fmt.Sprintf(`# Factory Agent Instructions for %s

## Your Task
Implement the requirements specified in TaskSpec: %s

## TaskSpec Location
%s

## Working Directory
%s

## Key Requirements
- Title: %s
- Type: %s
- LOC Cap: %d lines
- Follow TDD workflow (RED → GREEN → REFACTOR)

## Workflow
1. Read the TaskSpec thoroughly
2. Write failing tests first (RED phase)
3. Implement minimal code to pass tests (GREEN phase)
4. Refactor and optimize (REFACTOR phase)
5. Ensure all acceptance criteria are met
6. Stay within LOC cap of %d lines

## On Completion
- All tests must pass
- Code must be properly formatted
- Commit with message: "feat: implement %s"
- Update TaskSpec status to 'qa' in commit trailer
`,
		o.TaskSpecID, o.TaskSpecID, o.TaskSpecFile, o.FactoryWorktree,
		o.TaskSpec.Title, o.TaskSpec.Type, o.TaskSpec.LocCap,
		o.TaskSpec.LocCap, o.TaskSpecID)
	
	// Write instructions to file
	instructionsFile := filepath.Join(TempDir, "factory_instructions.md")
	if err := os.MkdirAll(TempDir, 0755); err != nil {
		return err
	}
	if err := ioutil.WriteFile(instructionsFile, []byte(instructions), 0644); err != nil {
		return err
	}
	
	printSuccess(fmt.Sprintf("Factory instructions created: %s", instructionsFile))
	return nil
}

// RunFactory executes the factory phase
func (o *Orchestrator) RunFactory() error {
	printPhase("PHASE 2: FACTORY EXECUTION")
	
	printStatus(fmt.Sprintf("Starting factory agent for %s", o.TaskSpecID))
	printStatus(fmt.Sprintf("Working directory: %s", o.FactoryWorktree))
	
	// Display instructions
	fmt.Printf("%sFactory Agent Instructions:%s\n", ColorCyan, ColorReset)
	instructions, _ := ioutil.ReadFile(filepath.Join(TempDir, "factory_instructions.md"))
	fmt.Println(string(instructions))
	
	if err := waitForUser("Ready to start factory agent?"); err != nil {
		return err
	}
	
	printWarning("Factory agent should now be running...")
	printWarning(fmt.Sprintf("Monitor progress in: %s", o.FactoryWorktree))
	
	if err := waitForUser("Has the factory agent completed its work?"); err != nil {
		return err
	}
	
	// Check for uncommitted changes
	output, _ := runCommandOutput("git", "-C", o.FactoryWorktree, "diff", "--stat", "HEAD")
	if output != "" {
		printWarning("Uncommitted changes detected")
		if err := waitForUser("Please commit changes before continuing"); err != nil {
			return err
		}
	}
	
	printSuccess("Factory phase complete")
	o.CurrentPhase = PhaseQA
	return nil
}

// PrepareQA sets up the QA phase
func (o *Orchestrator) PrepareQA() error {
	printPhase("PHASE 3: QA PREPARATION")
	
	// Get factory branch name
	factoryBranch, err := runCommandOutput("git", "-C", o.FactoryWorktree, "branch", "--show-current")
	if err != nil {
		return err
	}
	factoryBranch = strings.TrimSpace(factoryBranch)
	
	// Create QA worktree from factory branch
	qaBranch := fmt.Sprintf("qa/%s", o.TaskSpecID)
	o.QAWorktree = fmt.Sprintf("%s/../worktrees/qa-%s", ProjectRoot, o.TaskSpecID)
	
	if err := runCommand("git", "-C", ProjectRoot, "worktree", "add", "-b", qaBranch, o.QAWorktree, factoryBranch); err != nil {
		return err
	}
	
	printSuccess("QA worktree created from factory branch")
	
	// Create QA instructions
	instructions := fmt.Sprintf(`# QA Agent Instructions for %s

## Your Task
Review and validate the implementation of TaskSpec: %s

## Locations
- TaskSpec: %s
- Implementation: %s
- Factory work: %s

## QA Checklist
1. Verify all acceptance criteria are met
2. Check test coverage meets requirements (>= %d%%)
3. Validate LOC cap compliance (<= %d lines)
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
`,
		o.TaskSpecID, o.TaskSpecID, o.TaskSpecFile, o.QAWorktree, o.FactoryWorktree,
		o.TaskSpec.CoverageCap, o.TaskSpec.LocCap)
	
	// Write instructions to file
	instructionsFile := filepath.Join(TempDir, "qa_instructions.md")
	if err := ioutil.WriteFile(instructionsFile, []byte(instructions), 0644); err != nil {
		return err
	}
	
	printSuccess(fmt.Sprintf("QA instructions created: %s", instructionsFile))
	return nil
}

// RunQA executes the QA phase
func (o *Orchestrator) RunQA() error {
	printPhase("PHASE 4: QA EXECUTION")
	
	printStatus(fmt.Sprintf("Starting QA agent for %s", o.TaskSpecID))
	printStatus(fmt.Sprintf("Working directory: %s", o.QAWorktree))
	
	// Display instructions
	fmt.Printf("%sQA Agent Instructions:%s\n", ColorCyan, ColorReset)
	instructions, _ := ioutil.ReadFile(filepath.Join(TempDir, "qa_instructions.md"))
	fmt.Println(string(instructions))
	
	if err := waitForUser("Ready to start QA agent?"); err != nil {
		return err
	}
	
	printWarning("QA agent should now be running...")
	printWarning(fmt.Sprintf("Monitor progress in: %s", o.QAWorktree))
	
	if err := waitForUser("Has the QA agent completed its review?"); err != nil {
		return err
	}
	
	// Get QA decision
	choice, err := getUserChoice("QA Review Complete. What's the verdict?")
	if err != nil {
		return err
	}
	
	switch choice {
	case 2:
		printSuccess("QA PASSED - Ready for merge")
		o.CurrentPhase = PhaseMerge
		return nil
	case 3:
		printWarning("QA FAILED - Sending back to factory")
		o.CurrentPhase = PhaseRework
		return fmt.Errorf("rework required")
	case 4:
		return fmt.Errorf("workflow aborted")
	default:
		o.CurrentPhase = PhaseMerge
		return nil
	}
}

// PrepareMerge handles the merge to main
func (o *Orchestrator) PrepareMerge() error {
	printPhase("PHASE 5: MERGE PREPARATION")
	
	// Create merge commit message
	mergeMessage := fmt.Sprintf(`merge: complete %s

TaskSpec %s has passed QA review and is ready for merge.

TaskSpec: %s status=done`, o.TaskSpecID, o.TaskSpecID, o.TaskSpecID)
	
	printStatus("Preparing merge to main branch")
	
	// Show what will be merged
	output, _ := runCommandOutput("git", "-C", o.QAWorktree, "log", "--oneline", "main..HEAD")
	fmt.Println("Changes to be merged:")
	fmt.Println(output)
	
	if err := waitForUser("Ready to merge to main?"); err != nil {
		return err
	}
	
	// Checkout main and merge
	if err := runCommand("git", "-C", ProjectRoot, "checkout", "main"); err != nil {
		return err
	}
	
	qaBranch := fmt.Sprintf("qa/%s", o.TaskSpecID)
	if err := runCommand("git", "-C", ProjectRoot, "merge", "--no-ff", "-m", mergeMessage, qaBranch); err != nil {
		return err
	}
	
	printSuccess("Merged to main successfully")
	
	// Cleanup worktrees
	if err := waitForUser("Ready to cleanup worktrees?"); err != nil {
		return err
	}
	
	runCommand("git", "-C", ProjectRoot, "worktree", "remove", o.FactoryWorktree)
	runCommand("git", "-C", ProjectRoot, "worktree", "remove", o.QAWorktree)
	
	printSuccess("Cleanup complete")
	return nil
}

// Run executes the complete orchestration workflow
func (o *Orchestrator) Run() error {
	printPhase("TASKSPEC ORCHESTRATOR")
	printStatus(fmt.Sprintf("Starting workflow for: %s", o.TaskSpecID))
	
	// Phase 1: Factory Preparation
	if err := o.PrepareFactory(); err != nil {
		return err
	}
	
	// Phase 2: Factory Execution
	if err := o.RunFactory(); err != nil {
		return err
	}
	
	// Phase 3: QA Preparation
	if err := o.PrepareQA(); err != nil {
		return err
	}
	
	// Phase 4: QA Execution
	if err := o.RunQA(); err != nil {
		if o.CurrentPhase == PhaseRework {
			printPhase("REWORK REQUIRED")
			printWarning(fmt.Sprintf("TaskSpec %s needs factory rework", o.TaskSpecID))
			printStatus(fmt.Sprintf("Factory worktree: %s", o.FactoryWorktree))
			printStatus(fmt.Sprintf("QA feedback available in: %s", o.QAWorktree))
			printStatus("Re-run this program after factory fixes are complete")
			return nil
		}
		return err
	}
	
	// Phase 5: Merge
	if err := o.PrepareMerge(); err != nil {
		return err
	}
	
	printPhase("WORKFLOW COMPLETE")
	printSuccess(fmt.Sprintf("TaskSpec %s has been successfully implemented and merged!", o.TaskSpecID))
	return nil
}

func main() {
	if len(os.Args) < 2 {
		printError("Usage: taskspec_orchestrator <TASKSPEC_ID>")
		printError("Example: taskspec_orchestrator 001-TS-2025-08-19-AUTH-MIDDLEWARE")
		os.Exit(1)
	}
	
	taskSpecID := os.Args[1]
	
	// Load TaskSpec
	taskSpec, taskSpecFile, err := LoadTaskSpec(taskSpecID)
	if err != nil {
		printError(fmt.Sprintf("Failed to load TaskSpec: %v", err))
		os.Exit(1)
	}
	
	// Create orchestrator
	orchestrator := &Orchestrator{
		TaskSpecID:   taskSpecID,
		TaskSpec:     taskSpec,
		TaskSpecFile: taskSpecFile,
	}
	
	// Run workflow
	if err := orchestrator.Run(); err != nil {
		printError(fmt.Sprintf("Workflow failed: %v", err))
		os.Exit(1)
	}
}