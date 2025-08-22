# V2 Bootstrap Strategy: Building Hatch v2 Using v1 Infrastructure
**Date**: 2025-08-14  
**Author**: Planner Agent  
**Status**: Strategic Planning
**Purpose**: Define the bootstrap strategy for building Hatch v2 within v1, and establish clear criteria for v2 independence

## Executive Summary

Building a complete v2 rewrite requires a careful bootstrap strategy. The v2 system cannot initially build itself, requiring v1's infrastructure during early development. This report outlines a phased approach to develop v2 within v1's environment until v2 achieves self-sufficiency, then migrating to independent repositories.

**Key Decision**: Keep v2 as a subfolder (`__hatch/`) within v1 until it can build and test itself independently.

---

## Current Challenge

### The Bootstrap Problem
- **v2 cannot build itself** initially - no build system, no tooling
- **v1 agents need to work on v2** - requiring shared context
- **TaskSpec system must manage both** - v1 maintenance + v2 development
- **Premature separation causes friction** - constant context switching
- **Too late separation causes coupling** - v2 depends on v1 patterns

### The Goldilocks Zone
We need to find the "just right" moment for separation:
- **Too Early**: v2 can't function without v1 support
- **Too Late**: v2 becomes entangled with v1 infrastructure
- **Just Right**: v2 is self-sufficient but not yet coupled

---

## Recommended Approach: Phased Bootstrap

### Phase 1: Embryonic (Weeks 1-2)
**Structure**: v2 as subfolder in v1

```
hatchAI/
├── src/                         # v1 production code
├── __hatch/                     # v2 embryonic code
│   ├── src/
│   ├── go.mod                   # Separate module from day 1
│   └── README.md
├── cards/
│   ├── TS-*-V1-*.yaml          # v1 work
│   └── TS-*-V2-*.yaml          # v2 work (PREFIX: V2)
└── Makefile                     # v1 + v2 targets
```

**Key Activities**:
- ✅ Create v2 directory structure
- ✅ Define v2 architecture patterns
- ✅ Build core domain models
- ✅ Establish v2 coding standards

**v1 Provides**:
- Build commands (`make v2-build`)
- Test execution (`make v2-test`)
- TaskSpec management
- Agent infrastructure

### Phase 2: Dependent (Weeks 3-4)
**Structure**: v2 growing but still dependent

```
hatchAI/
└── __hatch/
    ├── src/                     # Growing codebase
    ├── tests/                   # v2-specific tests
    ├── docs/                    # v2 documentation
    ├── scripts/                 # v2-specific scripts (not yet complete)
    └── Makefile.draft          # v2 Makefile (not yet functional)
```

**Key Activities**:
- ✅ Implement core v2 functionality
- ✅ Create v2-specific test framework
- ✅ Draft v2 build configuration
- ✅ Document v2 architecture decisions

**Still Needs v1 For**:
- Primary build orchestration
- CI/CD pipeline
- Agent coordination
- TaskSpec tracking

### Phase 3: Adolescent (Weeks 5-6)
**Structure**: v2 can build itself but needs v1 for complex operations

```
hatchAI/
└── __hatch/
    ├── Makefile                 # ✅ Functional!
    ├── .github/workflows/       # ✅ Own CI/CD
    ├── agents/                  # ✅ v2-specific agents
    └── cards/                   # ❌ Still using v1's cards
```

**Key Milestones**:
- ✅ **v2 Makefile works independently**
- ✅ **v2 tests run without v1**
- ✅ **v2 has own build pipeline**
- ⏳ Still sharing TaskSpec system
- ⏳ Still in v1 repository

### Phase 4: Independent (Week 7+)
**Structure**: v2 graduates to separate repositories

```
~/projects/
├── hatchAI/                     # v1 only
├── hatchAI-state/               # v1 state
├── hatch-v2/                    # v2 graduated!
└── hatch-v2-state/              # v2 state
```

---

## Critical Components for v2 Independence

### 🔴 **MUST HAVE** Before Separation

#### 1. **Build System**
```makefile
# v2 must have its own Makefile with:
build:          # ✅ Compile v2 code
test:           # ✅ Run v2 tests  
lint:           # ✅ v2-specific linting
ci-local:       # ✅ Full local validation
```

#### 2. **Test Framework**
```go
// v2 must demonstrate:
- ✅ Unit tests running
- ✅ Integration tests passing
- ✅ Test coverage reporting
- ✅ Test data management
```

#### 3. **TaskSpec Management**
```yaml
# v2 needs its own:
- ✅ TaskSpec creation process
- ✅ Card templates for v2 patterns
- ✅ Independent card numbering
- ✅ State tracking system
```

#### 4. **Agent Configuration**
```markdown
# v2 must have:
- ✅ CLAUDE.md for v2 specifics
- ✅ Agent prompts adapted for v2
- ✅ Clear separation markers
- ✅ Independent workflow
```

#### 5. **CI/CD Pipeline**
```yaml
# .github/workflows/v2-ci.yml
- ✅ Independent build validation
- ✅ Test execution
- ✅ Coverage requirements
- ✅ Deployment capability (even if to staging)
```

### 🟡 **SHOULD HAVE** Before Separation

#### 6. **Documentation**
- ✅ Architecture decisions (ADRs)
- ✅ API documentation
- ✅ Setup instructions
- ✅ Migration guide from v1

#### 7. **Development Tools**
- ✅ Debugging configuration
- ✅ IDE settings
- ✅ Git hooks
- ✅ Code generation tools

#### 8. **Monitoring & Logging**
- ✅ Structured logging
- ✅ Error tracking
- ✅ Performance baselines
- ✅ Health checks

### 🟢 **NICE TO HAVE** Before Separation

#### 9. **Advanced Features**
- ⭕ Feature flags system
- ⭕ A/B testing capability
- ⭕ Advanced observability
- ⭕ Full production readiness

---

## Migration Triggers & Checklist

### Quantitative Triggers
- [ ] **20+ v2-specific TaskSpecs** completed
- [ ] **80%+ test coverage** in v2
- [ ] **5+ core modules** fully implemented
- [ ] **Build time < 2 minutes** independently
- [ ] **Zero v1 dependencies** in core code

### Qualitative Triggers
- [ ] **Team confidence** in v2 architecture
- [ ] **Agent proficiency** with v2 patterns
- [ ] **Stakeholder approval** for v2 direction
- [ ] **No "reaching back"** to v1 for 1 week
- [ ] **Clean abstraction** between versions

### Pre-Migration Checklist

#### Week 6: Pre-Flight Check
```bash
# Run this checklist before migration
cd __hatch

# 1. Build independently
make build                      # ✅ Must pass without v1
make test                       # ✅ Must pass without v1
make ci-local                   # ✅ Must pass without v1

# 2. Verify no v1 dependencies
go list -m all | grep -v hatchAI  # ✅ No v1 imports

# 3. Check documentation
test -f README.md               # ✅ Has readme
test -f ARCHITECTURE.md         # ✅ Has architecture
test -d docs/                   # ✅ Has docs

# 4. Validate agent readiness
test -f CLAUDE.md              # ✅ Has AI instructions
test -f agents/                # ✅ Has agent configs

# 5. State management ready
test -f Makefile               # ✅ Has TaskSpec targets
ls cards/TS-*-V2-*.yaml        # ✅ Has v2 cards
```

#### Migration Day: Execution
```bash
# Step 1: Final v1 commit
cd ~/projects/hatchAI
git add .
git commit -m "Final v2 bootstrap state before migration"
git push

# Step 2: Extract v2
mv __hatch ~/projects/hatch-v2
cd ~/projects/hatch-v2

# Step 3: Initialize v2 repository
git init
git add .
git commit -m "Initial v2 commit - graduated from v1 bootstrap"

# Step 4: Create state repository
cd ~/projects
mkdir hatch-v2-state
cd hatch-v2-state
git init
# Migrate v2 cards here

# Step 5: Setup symlinks
cd ../hatch-v2
ln -s ../hatch-v2-state/cards .cards
ln -s ../hatch-v2-state/_featspecs .featspecs

# Step 6: Verify independence
make build  # Must work
make test   # Must work
```

---

## Risk Mitigation

### Risk 1: Premature Separation
**Impact**: v2 development stalls due to missing infrastructure  
**Mitigation**: 
- Keep separation checklist strict
- Maintain ability to "move back" if needed
- Test independence for 1 week before final cut

### Risk 2: Delayed Separation  
**Impact**: v2 becomes coupled to v1 patterns  
**Mitigation**:
- Set hard deadline (Week 8 maximum)
- Regular architecture reviews
- Clear abstraction boundaries from day 1

### Risk 3: Lost Work During Migration
**Impact**: Code or cards lost in transition  
**Mitigation**:
- Full backup before migration
- Practice migration in test environment
- Incremental migration (code first, then cards)

---

## Timeline & Milestones

### Week 1-2: Foundation
- [ ] Create `__hatch/` structure
- [ ] Define v2 architecture
- [ ] First v2 TaskSpec created
- [ ] Basic domain models

### Week 3-4: Core Development  
- [ ] Core modules building
- [ ] Test framework operational
- [ ] 10+ TaskSpecs completed
- [ ] Draft Makefile created

### Week 5-6: Self-Sufficiency
- [ ] Independent build working
- [ ] CI/CD pipeline ready
- [ ] 20+ TaskSpecs completed
- [ ] All "MUST HAVE" items ✅

### Week 7: Migration
- [ ] Pre-flight checklist passed
- [ ] Migration executed
- [ ] v2 repository live
- [ ] Team trained on new structure

### Week 8+: Independent Evolution
- [ ] v2 development continues independently
- [ ] v1 maintenance continues separately
- [ ] No cross-version dependencies
- [ ] Clean architectural boundary

---

## Success Criteria

### Short-term (Migration Day)
- ✅ v2 builds independently
- ✅ v2 tests pass independently  
- ✅ No v1 imports in v2 code
- ✅ Separate git histories
- ✅ Agent can work on either version

### Medium-term (Month 2)
- ✅ v2 feature velocity > v1
- ✅ Zero "reach back" to v1
- ✅ Independent deployment pipeline
- ✅ Stakeholder satisfaction with v2 progress

### Long-term (Month 6)
- ✅ v2 in production
- ✅ v1 in maintenance mode
- ✅ Full feature parity achieved
- ✅ Performance targets met
- ✅ Clean migration path for users

---

## Decision Points

### Go/No-Go Criteria for Separation

**GO if:**
- All "MUST HAVE" items checked ✅
- Independent build verified for 3+ days
- Team consensus on readiness
- No critical blockers identified

**NO-GO if:**
- Any "MUST HAVE" item missing ❌
- Build requires v1 assistance
- Test coverage < 70%
- Team lacks confidence

**DELAY if:**
- Close to ready but 1-2 items pending
- Need 1 more week to solidify
- External dependencies not ready

---

## Conclusion

The bootstrap strategy balances the need for v1 support during early v2 development with the goal of clean architectural separation. By maintaining v2 as a subfolder during the embryonic and dependent phases, we leverage v1's mature infrastructure while building v2's capabilities.

**The key insight**: Separation should occur at the point of v2 self-sufficiency, not before or after.

**Critical success factors**:
1. **Clear separation criteria** (this checklist)
2. **Disciplined execution** (no premature optimization)
3. **Regular assessment** (weekly reviews)
4. **Flexibility to adjust** (timeline is guide, not law)

The 7-week timeline provides a realistic but aggressive target for achieving v2 independence while maintaining v1 stability and progress.

---

## Appendix: Emergency Procedures

### Rollback Procedure
If migration fails:
```bash
# Restore v2 to v1 subfolder
cd ~/projects
mv hatch-v2 hatchAI/__hatch
cd hatchAI
git add __hatch
git commit -m "Rollback: v2 not ready for independence"
```

### Parallel Development
If both versions need heavy development:
```bash
# Create a feature branch for v2 work
git checkout -b v2-heavy-development
# Work intensively on v2
# Merge back when stable
```

### Emergency v1 Support
If v2 needs v1 help post-migration:
```bash
# Temporary symlink to v1 tools
cd ~/projects/hatch-v2
ln -s ../hatchAI/scripts v1-scripts
# Use what's needed
# Remove when done
rm v1-scripts
```

---

*End of Report*