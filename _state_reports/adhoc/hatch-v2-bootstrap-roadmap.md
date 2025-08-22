# Hatch v2 Bootstrap Roadmap: From Subfolder to Independence
**Date**: 2025-08-14  
**Author**: Planner Agent  
**Status**: Strategic Implementation Plan
**Current State**: Meta-architecture exists, no v2 code implementation

## Executive Summary

The `__hatch` directory currently contains an elaborate orchestration framework (Hatchery) but lacks actual v2 application code. This roadmap provides a practical, week-by-week plan to bootstrap v2 from concept to independent project, focusing on **building working code first**, then leveraging the orchestration framework.

## Current State Assessment

### What Exists
- ✅ Elaborate Hatchery orchestration architecture
- ✅ Directory structure (mostly empty)
- ✅ TTS server experiments (old versions)
- ✅ Agent state files
- ✅ Comprehensive documentation of the orchestration system

### What's Missing (Critical Gaps)
- ❌ **No v2 application code**
- ❌ **No go.mod file** (not even initialized as Go project)
- ❌ **No src/ directory** with actual implementation
- ❌ **No Makefile** for building
- ❌ **No tests** of any kind
- ❌ **No clear v2 application architecture** (only orchestration architecture)
- ❌ **No TaskSpecs** managing v2 work

## Strategic Pivot Required

**Current Focus**: Complex orchestration system (Hatchery/Broods/Broodlings)
**Needed Focus**: Basic working v2 application that can be built and tested

**Key Insight**: The orchestration framework is premature optimization. Build v2 first, orchestrate later.

---

## Week-by-Week Implementation Plan

### Week 1: Foundation (Initialize v2 as Go Project)
**Goal**: Make `__hatch` a real Go project that can build

#### Day 1-2: Project Initialization
```bash
cd __hatch
go mod init github.com/hatchai/hatch-v2
mkdir -p cmd/hatch src/{core,api,models,services}
```

**TaskSpecs to Create**:
- `TS-V2-INIT-001`: Initialize v2 Go module
- `TS-V2-STRUCTURE-002`: Create v2 source directory structure
- `TS-V2-HELLO-003`: Create minimal main.go that runs

#### Day 3-4: Basic Build System
```makefile
# __hatch/Makefile
build:
	go build -o bin/hatch cmd/hatch/main.go

test:
	go test ./...

run:
	go run cmd/hatch/main.go
```

**TaskSpecs**:
- `TS-V2-MAKEFILE-004`: Create v2 Makefile
- `TS-V2-BUILD-005`: Verify v2 builds independently

#### Day 5: First Working Code
```go
// cmd/hatch/main.go
package main

import (
    "fmt"
    "github.com/hatchai/hatch-v2/src/core"
)

func main() {
    fmt.Println("Hatch v2 Starting...")
    core.Initialize()
}
```

**TaskSpecs**:
- `TS-V2-MAIN-006`: Implement v2 entry point
- `TS-V2-CORE-007`: Create core initialization

**Week 1 Deliverables**:
- ✅ go.mod exists
- ✅ Basic source structure
- ✅ Makefile works
- ✅ `make build` produces binary
- ✅ `make run` executes successfully

---

### Week 2: Core Domain (What Makes v2 Different)
**Goal**: Implement v2's unique value proposition

#### Day 1-2: Define v2's Core Difference
**Key Question**: What makes v2 fundamentally different from v1?

Suggested v2 Differentiators:
- **Event-driven architecture** (vs v1's synchronous)
- **Plugin-based extensibility** (vs v1's monolithic)
- **Native orchestration support** (leverage Hatchery concepts)
- **Built-in state management** (no more sync issues)

**TaskSpecs**:
- `TS-V2-ARCHITECTURE-008`: Document v2 architecture decisions
- `TS-V2-DOMAIN-009`: Implement core domain models

#### Day 3-4: Core Implementation
```go
// src/core/orchestrator.go
package core

type Orchestrator struct {
    // This is where Hatchery concepts become code
}

// src/core/agent.go
type Agent struct {
    ID       string
    Type     string
    State    AgentState
}
```

**TaskSpecs**:
- `TS-V2-ORCHESTRATOR-010`: Implement orchestrator core
- `TS-V2-AGENT-011`: Implement agent abstraction

#### Day 5: First Integration
**TaskSpecs**:
- `TS-V2-INTEGRATION-012`: Connect orchestrator with agents
- `TS-V2-TEST-013`: First integration test

---

### Week 3: Minimal Viable Product
**Goal**: v2 can do something useful independently

#### Day 1-2: API Layer
```go
// src/api/server.go
package api

func StartServer(port int) error {
    // HTTP API for v2
}
```

**TaskSpecs**:
- `TS-V2-API-014`: Create HTTP API server
- `TS-V2-ROUTES-015`: Implement basic routes

#### Day 3-4: State Management
```go
// src/state/manager.go
package state

type StateManager struct {
    // Solves v1's state problems
}
```

**TaskSpecs**:
- `TS-V2-STATE-016`: Implement state management
- `TS-V2-PERSISTENCE-017`: Add persistence layer

#### Day 5: First Feature
**TaskSpecs**:
- `TS-V2-FEATURE-018`: Implement first complete feature
- `TS-V2-E2E-019`: End-to-end test

---

### Week 4: Testing & Quality
**Goal**: v2 has robust testing and can validate itself

#### Day 1-2: Test Framework
**TaskSpecs**:
- `TS-V2-UNIT-TESTS-020`: Unit test coverage >60%
- `TS-V2-INT-TESTS-021`: Integration test suite

#### Day 3-4: CI/CD Pipeline
```yaml
# __hatch/.github/workflows/ci.yml
name: v2-ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: cd __hatch && make test
```

**TaskSpecs**:
- `TS-V2-CI-022`: Create CI pipeline
- `TS-V2-COVERAGE-023`: Add coverage reporting

#### Day 5: Quality Gates
**TaskSpecs**:
- `TS-V2-LINT-024`: Add linting
- `TS-V2-QUALITY-025`: Verify quality gates

---

### Week 5: Self-Sufficiency
**Goal**: v2 can build and deploy itself

#### Day 1-2: Build Optimization
**TaskSpecs**:
- `TS-V2-BUILD-OPT-026`: Optimize build process
- `TS-V2-DEPS-027`: Dependency management

#### Day 3-4: Deployment
**TaskSpecs**:
- `TS-V2-DOCKER-028`: Create Dockerfile
- `TS-V2-DEPLOY-029`: Deployment scripts

#### Day 5: Documentation
**TaskSpecs**:
- `TS-V2-README-030`: Comprehensive README
- `TS-V2-DOCS-031`: API documentation

---

### Week 6: Integrate Hatchery (Finally!)
**Goal**: Now that v2 works, add orchestration

#### Day 1-2: Adapt Hatchery to Real Code
```go
// src/hatchery/brood.go
package hatchery

import "github.com/hatchai/hatch-v2/src/core"

type Brood struct {
    orchestrator *core.Orchestrator
}
```

**TaskSpecs**:
- `TS-V2-HATCHERY-032`: Integrate Hatchery concepts
- `TS-V2-BROOD-033`: Implement Brood management

#### Day 3-4: Agent Orchestration
**TaskSpecs**:
- `TS-V2-AGENT-ORCH-034`: Agent orchestration
- `TS-V2-SCALING-035`: Scaling capabilities

#### Day 5: Validation
**TaskSpecs**:
- `TS-V2-VALIDATE-036`: Full system validation
- `TS-V2-PERF-037`: Performance testing

---

### Week 7: Separation Preparation
**Goal**: v2 ready for independence

#### Day 1-2: Final Dependencies Check
```bash
# Verify no v1 dependencies
cd __hatch
go list -m all | grep -v hatchAI  # Should be empty
grep -r "hatchAI" --include="*.go"  # Should find nothing
```

**TaskSpecs**:
- `TS-V2-DEPS-CHECK-038`: Verify independence
- `TS-V2-CLEANUP-039`: Remove v1 references

#### Day 3-4: State Migration
**TaskSpecs**:
- `TS-V2-STATE-MIG-040`: Migrate v2 TaskSpecs
- `TS-V2-HISTORY-041`: Preserve development history

#### Day 5: Pre-Flight Check
**Separation Checklist**:
- [ ] `make build` works independently
- [ ] `make test` passes with >70% coverage
- [ ] No v1 imports
- [ ] Own CI/CD pipeline
- [ ] Documentation complete
- [ ] 20+ v2 TaskSpecs completed

---

### Week 8: Separation & Independence
**Goal**: v2 becomes separate project

#### Day 1: Final Backup
```bash
cd ~/projects/hatchAI
tar -czf hatch-v2-backup.tar.gz __hatch/
```

#### Day 2: Migration
```bash
# Move to separate project
mv __hatch ~/projects/hatch-v2
cd ~/projects/hatch-v2
git init
git add .
git commit -m "Hatch v2 initial commit - independent project"
```

#### Day 3: State Repository
```bash
# Create v2 state repo
cd ~/projects
mkdir hatch-v2-state
mv hatch-v2/cards/* hatch-v2-state/
cd hatch-v2
ln -s ../hatch-v2-state/cards .cards
```

#### Day 4: Verification
```bash
cd ~/projects/hatch-v2
make build  # Must work
make test   # Must pass
make run    # Must execute
```

#### Day 5: Celebration & Documentation
- Update main project README
- Document separation in both projects
- Team announcement

---

## Critical Path Items

### Must-Have Before Separation
1. **go.mod file** - Without this, it's not even a Go project
2. **Working Makefile** - Must build independently
3. **Source code** - Actual implementation, not just orchestration
4. **Tests** - Proof that v2 works
5. **Documentation** - How to build, run, and use v2

### Order of Implementation
1. **Foundation first** (go.mod, structure)
2. **Working code second** (can it run?)
3. **Features third** (what does it do?)
4. **Orchestration last** (Hatchery integration)

---

## Risk Mitigation

### Risk: Over-Focus on Orchestration
**Mitigation**: Weeks 1-5 focus ONLY on v2 code, ignore Hatchery

### Risk: Premature Separation
**Mitigation**: Hard requirement of 20+ completed TaskSpecs

### Risk: v1 Dependency Creep
**Mitigation**: Weekly dependency audit

### Risk: Lost Work
**Mitigation**: Daily commits to v1 repo during bootstrap

---

## Success Metrics

### Week 4 Checkpoint
- [ ] v2 builds and runs
- [ ] 10+ TaskSpecs completed
- [ ] Basic tests passing

### Week 6 Checkpoint
- [ ] All core features implemented
- [ ] 70%+ test coverage
- [ ] Hatchery integrated

### Week 8 Success
- [ ] Independent repository
- [ ] No v1 dependencies
- [ ] Self-sufficient build/test/deploy

---

## Immediate Next Steps (Today)

1. **Create go.mod**:
```bash
cd __hatch
go mod init github.com/hatchai/hatch-v2
```

2. **Create source structure**:
```bash
mkdir -p cmd/hatch src/{core,api,models,services}
```

3. **Create first TaskSpec**:
```bash
make taskspec-new DESCRIPTION=V2-INIT-001 TITLE="Initialize v2 Go module"
```

4. **Write first code**:
```go
// cmd/hatch/main.go
package main
func main() {
    println("Hatch v2 Lives!")
}
```

5. **Verify it runs**:
```bash
cd __hatch
go run cmd/hatch/main.go
```

---

## Conclusion

The current `__hatch` has elaborate orchestration plans but no actual v2 code. This roadmap prioritizes **building working software** over orchestration frameworks. 

**Core principle**: Build v2 first, orchestrate later.

By Week 8, you'll have an independent, self-sufficient v2 project with:
- Working codebase
- Test coverage
- Build system
- Documentation
- Optional Hatchery orchestration

The journey from subfolder to independence requires discipline to focus on code over architecture, implementation over orchestration, and working software over comprehensive documentation.

---

*End of Roadmap*