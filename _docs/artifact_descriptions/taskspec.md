# TaskSpec Artifact Description

## Overview
A TaskSpec (Task Specification) is an immutable specification document that defines the implementation requirements for a specific development task. It mirrors the hatchAI-devcards DevCard structure but contains no state information, with all state tracked in the parent FeatState file.

## Format
- **File naming**: `NNN-TS-YYYY-MM-DD-DESCRIPTION.yaml`
- **Example**: `001-TS-2025-08-18-JWT-MIDDLEWARE.yaml`
- **Location**: `_specs/taskspecs/`

## Structure

### YAML Frontmatter
```yaml
id: 001-TS-2025-08-18-JWT-MIDDLEWARE
title: Add JWT middleware for authentication
sprint: S4
parent_featspec: 001-FS-2025-08-18-USER-AUTH
loc_cap: 200
coverage_cap: 80
depends_on: []
```

### Content Sections
1. **Context**: Why this task exists, references to ADRs, parent FeatSpec
2. **Objectives**: Observable, testable acceptance criteria with execution evidence
3. **Non-Goals**: Explicitly excluded scope to prevent creep
4. **Design Constraints**: Technical and architectural constraints
5. **Implementation Checklist**: Factory (developer) tasks
6. **QA Checklist**: Quality assurance validation tasks
7. **Post-Merge Tasks**: Follow-up actions after completion

## Key Characteristics

### Immutable Fields
- `id`: Unique sequential identifier  
- `title`: Task title (≤72 characters)
- `sprint`: Sprint assignment
- `parent_featspec`: Required parent feature reference
- `loc_cap`: Line of code cap
- `coverage_cap`: Test coverage requirement
- `depends_on`: Array of prerequisite TaskSpec IDs

### Content Requirements
- Clear context linking to parent feature
- Measurable acceptance criteria with evidence requirements
- Explicit scope boundaries (non-goals)
- Technical constraints and guidelines
- Actionable implementation and QA checklists

## Relationship to Other Artifacts

### Parent FeatSpec
Every TaskSpec must have a parent FeatSpec:
- **Parent**: `001-FS-2025-08-18-USER-AUTH.yaml`
- **Child**: `001-TS-2025-08-18-JWT-MIDDLEWARE.yaml`

### State Tracking
TaskSpec state is stored in the parent FeatState file:
- **Specification**: `001-TS-2025-08-18-JWT-MIDDLEWARE.yaml` (immutable)
- **State**: Tracked in `001-FSTATE-2025-08-18-USER-AUTH.yaml` (mutable)

### Dependencies
TaskSpecs can depend on other TaskSpecs:
```yaml
depends_on: ["001-TS-2025-08-18-JWT-MIDDLEWARE", "002-TS-2025-08-18-USER-MODEL"]
```

## Example TaskSpec

```yaml
---
id: 001-TS-2025-08-18-JWT-MIDDLEWARE
title: Add JWT middleware for authentication
sprint: S4
parent_featspec: 001-FS-2025-08-18-USER-AUTH
loc_cap: 200
coverage_cap: 80
depends_on: []
---

## 1  Context
Implement JWT-based authentication middleware as part of the user authentication system (001-FS-2025-08-18-USER-AUTH). This middleware will validate JWT tokens on protected routes and provide user context to downstream handlers.

References:
- Parent FeatSpec: 001-FS-2025-08-18-USER-AUTH
- Security requirements in system architecture docs

## 2  Objectives (acceptance criteria)
List **observable, testable** outcomes. Use MUST/SHOULD/MUST NOT keywords.

| # | Acceptance Test | Type | File/Command | Execution Evidence Required |
|---|-----------------|------|--------------|----------------------------|
| 1 | `go test ./middleware/...` passes with ≥80% coverage | unit | – | Show test output with coverage report |
| 2 | Valid JWT tokens allow access to protected routes | e2e | test/integration/auth_test.go | Show successful authenticated requests |
| 3 | Invalid/expired JWT tokens return 401 Unauthorized | e2e | test/integration/auth_test.go | Show rejected requests with proper error codes |
| 4 | Middleware extracts user context for downstream handlers | integration | – | Show user context availability in handlers |

## 3  Non-Goals / Anti-Goals
- MUST NOT implement token generation (handled by auth service)
- MUST NOT handle user registration/login (separate TaskSpec)
- MUST NOT implement role-based permissions (future enhancement)
- MUST NOT modify existing route handlers beyond adding middleware

## 4  Design Constraints
• Keep functions ≤ 40 LoC
• All public functions accept `context.Context`
• No new third-party JWT libraries without approval
• Follow existing middleware patterns in codebase
• Must integrate cleanly with parent FeatSpec: 001-FS-2025-08-18-USER-AUTH
• Use dependency injection for JWT secret configuration

## 5  Implementation Checklist (Factory)
- [ ] Add failing tests for JWT token validation
- [ ] Add failing tests for user context extraction
- [ ] Add failing tests for error handling (invalid/expired tokens)
- [ ] Implement JWT middleware with proper error handling
- [ ] Integrate middleware with existing router configuration
- [ ] Update parent FeatSpec state tracking
- [ ] Commit with trailer `TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE status=qa`

## 6  QA Checklist
- [ ] Review test coverage ≥80% and LOC cap ≤200
- [ ] Verify integration with parent FeatSpec requirements
- [ ] Security review of JWT validation logic
- [ ] Performance test middleware overhead
- [ ] Verify error handling and logging
- [ ] If pass, commit trailer `TaskSpec: 001-TS-2025-08-18-JWT-MIDDLEWARE status=done`

## 7  Post-Merge Tasks
- Update parent FeatSpec state with completion
- Close related GitHub issues
- Update API documentation with authentication requirements
- Notify dependent TaskSpec owners of availability
```

## Creation and Management

### Creation
```bash
# Programmatic mode (required)
DESCRIPTION=JWT-MIDDLEWARE \
TITLE="Add JWT middleware for authentication" \
PARENT_FEATSPEC=001-FS-2025-08-18-USER-AUTH \
TYPE=feature \
SPRINT=S4 \
task taskspec-new
```

### Required Parameters
- `DESCRIPTION`: Uppercase, hyphenated task description
- `TITLE`: Imperative title ≤72 characters
- `PARENT_FEATSPEC`: Must reference existing FeatSpec

### Optional Parameters
- `TYPE`: fix, feature, test, refactor, docs, integration (default: feature)
- `SPRINT`: Sprint assignment (default: S4)
- `LOC_CAP`: Line of code limit (default: type-based)
- `COVERAGE_CAP`: Test coverage requirement (default: 80)
- `DEPENDENCIES`: Comma-separated TaskSpec IDs

## Type-Based Defaults

| Type | Default LOC Cap | Purpose |
|------|----------------|---------|
| fix | 100 | Bug fixes, small corrections |
| feature | 200 | New functionality implementation |
| test | 300 | Test suites, testing infrastructure |
| refactor | 150 | Code restructuring, optimization |
| docs | 400 | Documentation, guides, examples |
| integration | 250 | Integration testing, system connections |

## Best Practices

1. **Atomic scope**: Each TaskSpec should be completable in one sprint
2. **Clear acceptance criteria**: Specific, measurable, with evidence requirements
3. **Explicit dependencies**: List all prerequisite TaskSpecs
4. **Parent alignment**: Ensure tight integration with parent FeatSpec
5. **Testing focus**: Emphasize test-first development approach
6. **Scope boundaries**: Clear non-goals prevent scope creep
7. **Evidence-based validation**: QA criteria require demonstrable evidence