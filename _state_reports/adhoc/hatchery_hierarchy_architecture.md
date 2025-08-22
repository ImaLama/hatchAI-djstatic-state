# Hatchery Hierarchy Architecture Report
**Date**: 2025-08-11  
**Type**: Architectural Framework Documentation  
**Subject**: Hatchery Orchestration System for Automated Agent Management

## Executive Summary

The Hatchery system introduces a biological metaphor for orchestrating multiple Claude Code agent instances working collaboratively on FeatSpecs and TaskSpecs. This document maps the complete hierarchy, roles, and operational structure of the Hatchery framework.

## Hierarchy Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           hatch_master                               │
│                      (Supreme Orchestrator)                          │
│                  [Developer with Static and AI Tooling]              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴────────────────────────────────────┐
          << Static Services Layer >>                                │
   ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
   │ clutch_daddy   │  │ ripple_reader    │  │ ripple_radio    │   │
   │   (Planner)    │  │(Error Monitoring)│  │ (RT Mon/Queue)  │   │
   │ [Static Agent] │  │ [Static Agent]   │  │ [Static Agent]  │   │
   └────────┬───────┘  └──────────────────┘  └─────────────────┘   │
            │                                                        │
            │                  << AI Agents Layer >>                │
            │  ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────────┐
            │  │ overmind │ │smoked_duck │ │ pond_patrol  │ │clutch_sentinel│
            │  │(Architect)│ │(Smoke Test)│ │  (Security)  │ │(Feature Test) │
            │  └──────────┘ └────────────┘ └──────────────┘ └───────────────┘
            │                              
    ┌───────▼───────────────┐
    │      hatchery         │
    │    (Brood Farm)       │
    └───────────┬───────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
    │ brood_1 │  │ brood_2 │  │ brood_n │
    └────┬────┘  └────────┘  └────────┘
         │
    ┌────▼────────────────────────────────────────────────────┐
    │                   brood_mama                             │
    │              (Per-Brood Orchestrator)                  │
    │                      [Static]                           │
    └────┬─────────────────────────────────────────────────────┘
         │
    ╔════╧════════════════════════════════════════════╗  ┌───────────────┐ ┌─────────────┐
    ║              << Brood Agents >>                 ║  │clutch_meister │ │ debug_diver │
    ║  ┌──────────┬──────────┬──────────┐            ║  │ (Diagnostic)  │ │(Deep Debug) │
    ║  │          │          │          │            ║  │               │ │             │
    ║┌─▼──────────┐┌─▼──────┐┌─▼──────┐┌─▼──────────┐║  │ [Available    │ │ [Available  │
    ║│duck_supreme││duckling││sentinel││pivot_pilot ║║  │  on-demand]   │ │  on-demand] │
    ║│    (AI)    ││  (AI)  ││  (AI)  ││   (AI)     ║║  └───────────────┘ └─────────────┘
    ║└─────┬──────┘└────┬───┘└────┬───┘└─────┬──────┘║
    ║      └────────────┴──────────┴──────────┘      ║
    ╚══════════════════════╤══════════════════════════╝
                            │
    ┌───────────────────────▼───────────────────────┐
    │                   quackaduct                   │
    │            (Ender of Evolutions)               │
    │        Code Collection & Integration           │
    │    [Static Agent - Works Across All Broods]   │
    └─────────────────────────────────────────────────┘

         ═══════════════════════════════════════

    ┌──────────────────────────────────────────────┐
    │              darkwing duck                   │
    │         (Emergency Hotfix Hero)              │
    │     [EMERGENCY USE ONLY - No Hooks]          │
    │  Operates Outside Hierarchy - Nuclear Option │
    └──────────────────────────────────────────────┘
```

## Component Definitions

### Hatchery Level - Services

| Label | Component Name | Role | Current Framework | Responsibility |
|-------|---------------|------|-------------------|----------------|
| **hatch_master** | `project_lead` | Supreme Orchestrator | - (New) | Controls entire Hatchery, instantiates team_orchestrators, manages resource allocation |
| **ripple_reader** | `error_monitor` | Error Monitoring Service | - (New) | Error monitoring, exception tracking, failure detection and alerting |
| **ripple_radio** | `rt_queue` | RT Monitoring & Queue Service | - (New) | Real-time monitoring, message queuing, inter-agent communication orchestration |
| **clutch_daddy** | `project_planner` | Planning Service | planner_prompt.md (elevated) | Creates FeatSpecs, assigns to Teams, strategic planning |
| **quackaduct** | `ci_cd_pipeline` | Code Collection Service (Ender of Evolutions) | - (New) | Collects produced code from all agents, integrates changes, manages merge operations across teams |

### Hatchery Level - Agents

| Label | Component Name | Role | Current Framework | Responsibility |
|-------|---------------|------|-------------------|----------------|
| **overmind** | `architect` | Master Architect | architect_prompt.md | System-wide architectural decisions, design patterns, ADR creation |
| **clutch_meister** | `diagnostic` | Diagnostic Specialist | - (New) | Investigates stuck agents, returns diagnostic codes, enables automated recovery |
| **debug_diver** | `deep_debug` | Deep Analysis Agent | - (New) | Deep debugging, root cause analysis, "underwater" issues (called when clutch_meister returns code 199) |
| **pond_patrol** | `security` | Security Agent | security_prompt.md | System-wide security monitoring, vulnerability assessment, security policy enforcement |
| **clutch_sentinel** | `feature_test` | Feature Integration Test Agent | - (New) | Feature-level integration testing, cross-TaskSpec validation, FeatSpec completion verification |
| **smoked_duck** | `smoke_test` | Smoke Test Agent | smoke_test_prompt.md | End-to-end system validation, integration testing, release verification |

### Team Level (FeatSpec Orchestration)

| Label | Component Name | Role | Scope | Responsibility |
|-------|---------------|------|-------|----------------|
| **team** | `ai_agent` | Agent Collective | FeatSpec | Group of agents working on single FeatSpec (general term for any AI agent) |
| **brood_mama** | `team_orchestrator` | Team Orchestrator | Per-Team | Spawns agents, coordinates TaskSpec assignments, manages handoffs |

### Team Member Level (TaskSpec Implementation)

| Label | Component Name | Role | Current Framework | Model | TaskSpec Scope |
|-------|---------------|------|-------------------|-------|---------------|
| **duck_supreme** | `factory_senior` | Senior Factory Developer | factory_prompt.md | Opus | Complex TaskSpecs, core implementation, mentoring |
| **duckling** | `factory_junior` | Junior Factory Developer | factory_prompt.md | Sonnet | Simple TaskSpecs, basic implementation, learning |
| **sentinel** | `team_qa` | Quality Assurance | qa_prompt.md | Sonnet/Opus | Testing, validation |
| **pivot_pilot** | `team_planner` | Team Planner | planner_prompt.md (scoped) | Sonnet | TaskSpec planning, team coordination, pivoting strategies |

### Emergency Response

| Label | Component Name | Role | Current Framework | Responsibility | Activation |
|-------|---------------|------|-------------------|----------------|------------|
| **darkwing duck** | `unrestricted_hotfixer` | Emergency Hotfix Hero | darkwingduck_prompt.md | Unrestricted agent with no hooks limitations for critical hotfixes when "shit hits the fan". "Let's get dangerous!" | Production down, security breach, CEO calling |

*Note: Darkwing Duck operates outside the standard hierarchy and should only be activated in true emergencies requiring immediate intervention without process constraints. This is the nuclear option when automated recovery has failed.*

### Emergency Escalation Chain

```
Normal Agents (factory_senior, factory_junior, team_qa)
    ↓ (stuck/confused)
diagnostic (Diagnostic Investigation) 
    ↓ (returns diagnostic code)
team_orchestrator (Attempts automated recovery)
    ↓ (recovery fails)
unrestricted_hotfixer (Nuclear option - unrestricted)
```

## Role Assignments Summary

### Roles Successfully Mapped

| Current Framework File | Hatchery Assignment | Level | Status |
|------------------------|-------------------|-------|--------|
| **factory_prompt.md** | factory_senior (Opus) & factory_junior (Sonnet) | Team Member | ✅ Assigned |
| **qa_prompt.md** | team_qa | Team Member | ✅ Assigned |
| **planner_prompt.md** | project_planner (elevated) & team_planner (scoped) | Service & Team | ✅ Assigned |
| **architect_prompt.md** | architect | Hatchery Agent | ✅ Assigned |
| **security_prompt.md** | security | Hatchery Agent | ✅ Assigned |
| **smoke_test_prompt.md** | smoke_test | Hatchery Agent | ✅ Assigned |
| **darkwing_duck_prompt.md** | unrestricted_hotfixer | Emergency (Outside) | ✅ Assigned |

### Remaining Role Needing Assignment

| Current Role | Suggested Hatchery Name | Purpose |
|--------------|-------------------------|---------|
| **weaver_prompt.md** | **team_weaver** | Inter-agent coordination within Team, merge orchestration |


## Operational Structure

### 1. Hatchery Initialization
```yaml
hatchery:
  master: project_lead
  capacity: 5  # Maximum concurrent teams
  resources:
    max_sessions: 20
    max_memory: 16GB
    max_tokens_per_hour: 1000000
```

### 2. Team Composition
```yaml
team:
  id: team_001
  featspec: FS-2025-08-11-USER-AUTH-001
  orchestrator: team_orchestrator_001
  members:
    - type: factory_senior
      model: opus
      taskspec: TS-2025-08-11-AUTH-CORE-001
    - type: factory_junior
      model: sonnet
      taskspec: TS-2025-08-11-AUTH-UI-002
    - type: team_qa
      model: sonnet
      taskspec: QA-ALL
    - type: team_planner
      model: sonnet
      taskspec: PLANNING
```

### 3. Communication Channels

```
Inter-Team: Via project_lead (no direct team-to-team communication)
Intra-Team: Via team_orchestrator ONLY (centralized coordination)
Agent Handoffs: Through team_orchestrator with context/summaries
Monitoring: Via ripple_reader (error detection)
Debugging: Via debug_diver (deep analysis)

IMPORTANT: Team members NEVER communicate directly with each other.
All handoffs go through team_orchestrator who:
1. Receives completion summary from current agent
2. Saves context/state for the task
3. Forwards enriched context to next agent
4. Maintains complete audit trail
```

#### Communication Flow Example
```
duck_supreme completes implementation
    ↓ (saves summary)
brood_mama receives handoff
    ↓ (enriches context)
brood_mama spawns sentinel with context
    ↓ (includes duck_supreme's summary)
sentinel begins QA with full context
```

## File System Structure

```
hatchery/
├── hatch_master/
│   ├── config.yaml              # Master configuration
│   ├── brood_registry.json      # Active broods
│   └── resource_allocation.yaml # Resource management
│
├── teams/
│   ├── team_001/
│   │   ├── team_orchestrator.pid  # Orchestrator process
│   │   ├── featspec.yaml        # Assigned FeatSpec
│   │   ├── agents/              # Active agents
│   │   │   ├── factory_senior_001/
│   │   │   ├── factory_junior_001/
│   │   │   └── team_qa_001/
│   │   └── state/               # Team state
│   └── team_002/
│
├── pond/
│   ├── debug_diver/             # Deep analysis logs
│   │   ├── investigations/
│   │   └── root_causes/
│   └── ripples/                 # Surface events
│       ├── errors/
│       └── warnings/
│
├── clutch/                      # Planning area
│   ├── featspecs_queue/
│   ├── assignments/
│   └── strategies/
│
└── overmind/                    # Architecture
    ├── patterns/
    ├── decisions/
    └── blueprints/
```

## State Management

### Emergency Activation Protocols

#### diagnostic Activation (Diagnostic)
**When to activate:**
- Agent stuck in loop or unknown state
- Repeated failures with unclear cause
- State machine deadlock
- Need structured diagnosis before recovery

**Activation Command:**
```bash
# Launch diagnostic investigation
claude --model sonnet --timeout 120 \
  "You are diagnostic. Investigate agent [AGENT_ID] in worktree [PATH]. 
   Return diagnostic code 100-199. Save findings to diagnostics/."
```

#### unrestricted_hotfixer Activation (Emergency Override)
**When to activate:**
- Production system down with no clear fix path
- Critical security breach requiring immediate patching
- Automated recovery has failed
- Time-critical hotfixes where process would cause unacceptable delay
- "Shit hits the fan" scenarios requiring bypass of all safety rails

**Activation Command:**
```bash
# Launch with no hooks, no restrictions - NUCLEAR OPTION
claude --dangerously-skip-permissions --no-hooks --model opus \
  "You are unrestricted_hotfixer. Emergency hotfix required: [CRISIS DESCRIPTION]"
```

### Team States
- **HATCHING**: Initialization
- **ACTIVE**: Working on FeatSpec
- **SYNCING**: Coordinating handoffs
- **REVIEWING**: In QA phase
- **COMPLETING**: Finalizing work
- **DORMANT**: Waiting for assignment

### Agent States
- **SPAWNING**: Starting up
- **READY**: Awaiting task
- **WORKING**: Active on TaskSpec
- **BLOCKED**: Waiting for dependency
- **COMPLETE**: Task finished
- **TERMINATED**: Shut down

## Naming Convention & Component Mapping

### Naming Philosophy

The Hatchery system uses two-tier naming:
1. **Labels**: Fun, memorable names using duck/biological metaphors for human interaction
2. **Component Names**: Technical identifiers for code, configuration, and system integration

### Complete Component Mapping

```yaml
# Static Services (Programs)
project_lead:       hatch_master       # Supreme orchestrator
error_monitor:      ripple_reader      # Error detection and monitoring
rt_queue:           ripple_radio       # Real-time queue and messaging
project_planner:    clutch_daddy       # Strategic planning service
team_orchestrator:  brood_mama         # Per-brood orchestration
ci_cd_pipeline:     quackaduct         # Code collection and integration

# AI Agents (General)
ai_agent:           brood              # General term for any AI agent

# AI Agents (Specific)
architect:              overmind           # System architecture
diagnostic:             clutch_meister     # Diagnostic investigation
deep_debug:             debug_diver        # Deep technical analysis
security:               pond_patrol        # Security monitoring
feature_test:           clutch_sentinel    # Feature integration testing
smoke_test:             smoked_duck        # End-to-end validation
factory_senior:         duck_supreme       # Senior implementation (Opus)
factory_junior:         duckling           # Junior implementation (Sonnet)
team_qa:                sentinel           # Quality assurance
team_planner:           pivot_pilot        # Team-level planning and pivoting
unrestricted_hotfixer:  darkwing duck      # Emergency override

# File System Mapping
/hatch/static/project_lead/       # hatch_master implementation
/hatch/static/error_monitor/      # ripple_reader implementation
/hatch/static/rt_queue/           # ripple_radio implementation
/hatch/static/project_planner/    # clutch_daddy implementation
/hatch/static/team_orchestrator/  # brood_mama implementation
/hatch/static/ci_cd_pipeline/     # quackaduct implementation

/hatch/agents/architect.md              # overmind prompt
/hatch/agents/diagnostic.md             # clutch_meister prompt
/hatch/agents/deep_debug.md             # debug_diver prompt
/hatch/agents/security.md               # pond_patrol prompt
/hatch/agents/feature_test.md           # clutch_sentinel prompt
/hatch/agents/smoke_test.md             # smoked_duck prompt
/hatch/agents/factory_senior.md         # duck_supreme prompt
/hatch/agents/factory_junior.md         # duckling prompt
/hatch/agents/team_qa.md                # sentinel prompt
/hatch/agents/team_planner.md           # pivot_pilot prompt
/hatch/agents/unrestricted_hotfixer.md  # darkwing duck prompt

# Session Naming Convention
team_001_factory_senior_TS-001     # duck_supreme working on TaskSpec
team_001_factory_junior_TS-002     # duckling working on TaskSpec
team_001_team_qa_TS-001            # sentinel reviewing TaskSpec
team_001_team_planner_TS-003       # pivot_pilot planning TaskSpec
diagnostic_001_1234567890           # clutch_meister investigation
unrestricted_hotfixer_1234567890    # darkwing duck emergency
```

### Configuration Usage

```yaml
# In configuration files, use component names
teams:
  team_001:
    orchestrator: brood_orchestrator
    agents:
      - type: factory_senior
        model: opus
        taskspec: TS-001
      - type: factory_junior
        model: sonnet
        taskspec: TS-002
      - type: team_qa
        model: sonnet
        taskspec: all
      - type: team_planner
        model: sonnet
        taskspec: planning

# In logs and user interfaces, show labels
[INFO] duck_supreme (factory_senior) started on TS-001
[INFO] duckling (factory_junior) started on TS-002
[INFO] sentinel (team_qa) reviewing TaskSpec
[INFO] pivot_pilot (team_planner) planning next sprint
[INFO] clutch_meister (diagnostic) investigating stuck agent
[ALERT] darkwing duck (unrestricted_hotfixer) activated - emergency override
```

## Implementation Priorities

1. **Phase 1: Core Infrastructure**
   - project_lead service
   - team_orchestrator
   - Basic agent types (factory_senior, factory_junior, team_qa)

2. **Phase 2: Extended Agents**
   - team_planner (Brood Planner)
   - Additional specialized roles

3. **Phase 3: Monitoring & Analysis**
   - error_monitor implementation
   - deep_debug analysis
   - architect integration

4. **Phase 4: Advanced Features**
   - project_planner AI
   - Inter-Brood coordination
   - Resource optimization

## Technical Specifications

### Team Orchestrator Capabilities
```go
type TeamOrchestrator struct {
    ID           string
    FeatSpec     string
    Members      []TeamMember
    State        BroodState
    StartTime    time.Time
    CompletionETA time.Duration
    Handoffs     map[string]HandoffContext  // Stored contexts for each task
}

type HandoffContext struct {
    FromAgent    string
    ToAgent      string
    TaskSpec     string
    Summary      string
    FilesChanged []string
    TestResults  TestStatus
    Timestamp    time.Time
}

func (to *TeamOrchestrator) SpawnAgent(dtype string, taskspec string) error
func (to *TeamOrchestrator) ReceiveHandoff(from TeamMember, summary HandoffContext) error
func (to *TeamOrchestrator) ForwardToNext(to TeamMember, enrichedContext HandoffContext) error
func (to *TeamOrchestrator) MonitorProgress() ProgressReport
func (to *TeamOrchestrator) HandleFailure(member TeamMember) error

// CRITICAL: No direct member-to-member communication
// All inter-agent data flows through TeamOrchestrator for:
// - Context preservation
// - Audit trail
// - State management
// - Failure recovery
```

### Session Naming Convention
```
Format: {team_id}_{agent_type}_{taskspec_id}
Example: team_001_factory_senior_TS-2025-08-11-AUTH-001
```

## Success Metrics

- **Brood Efficiency**: TaskSpecs completed per hour
- **Handoff Success Rate**: Successful agent transitions
- **Error Recovery Time**: Mean time to recover from failures
- **Resource Utilization**: CPU/Memory/Token usage
- **Quality Gate Pass Rate**: First-time QA success

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| Session exhaustion | Resource pooling, queue management |
| Token limits | Intelligent batching, model selection |
| Cascade failures | Isolated Brood boundaries |
| State corruption | Atomic operations, recovery snapshots |
| Coordination overhead | Async messaging, event-driven architecture |

## Conclusion

The Hatchery framework provides a scalable, biological-inspired orchestration system for managing multiple Claude Code agents. By organizing agents into Teams working on FeatSpecs, with team members handling individual TaskSpecs, the system achieves both horizontal scaling and clear separation of concerns.

Key innovations:
- **Hierarchical orchestration** with clear command structure
- **Biological metaphor** making complex systems intuitive
- **Role specialization** matching agent capabilities to tasks
- **Deep/Surface monitoring** via deep_debug and error_monitor
- **Flexible Team composition** adapting to FeatSpec complexity

This architecture supports the Factory Process methodology while enabling automated, parallel development at scale.

## Appendix: Reserved Terminology for Future Use

The following terms align with the biological/Zerg-inspired metaphor and are reserved for future framework expansion:

### Command & Control Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Broodlord** | Supreme Team Commander | Could serve as a mega-orchestrator managing multiple team_orchestrators, or as an elevated team_orchestrator for critical FeatSpecs |
| **Hive** | Central Command Structure | The master control system above Hatchery level - could represent the entire development ecosystem or production environment |
| **Overlord** | Resource Manager | System-wide resource allocation, token management, and capacity planning across all Teams |

### Infrastructure Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Lair Layer** | Architecture Layer Manager | Clever dual meaning: Lair (Zerg building) + Layer (architecture layers). Could manage different architectural tiers (presentation, business, data) |
| **Spawning Pool** | Agent Initialization System | The system that creates and initializes new agent instances, managing the "spawn" of agents |
| **Spire Designer** | High-Level Architecture Tool | Creates "flying" (high-level) architectural designs and patterns that float above implementation details |
| **Greater Spire** | Advanced Architecture System | Evolution of Spire Designer for enterprise-scale architectural decisions |

### Specialized Building Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Evolution Chamber** | Agent Upgrade System | System for upgrading agent capabilities, updating prompts, or evolving models (Sonnet → Opus) |
| **Hydralisk Den** | Specialized Agent Pool | Repository of specialized agents for specific tasks (like Hydralisks are specialized units) |
| **Ultralisk Cavern** | Heavy-Duty Processing | Reserved for massive refactoring or large-scale migration agents |
| **Nydus Network** | Inter-System Transport | Rapid deployment/movement of agents between different systems or environments |

### Operational Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Creep** | Code Coverage/Territory | The expanding area of tested, validated code - spreads as development progresses |
| **Larvae** | Pre-initialized Agents | Agent instances waiting to be morphed into specific agent types |
| **Chrysalis** | Transformation State | Agents in process of changing roles or upgrading (e.g., factory_junior → factory_senior) |
| **Infestation** | Complete System Takeover | Full automation of a previously manual process |

### Resource Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Vespene** | Premium Resources | Could represent Opus tokens or other limited/expensive resources |
| **Minerals** | Basic Resources | Standard Sonnet tokens or compute resources |
| **Supply** | Capacity Management | Current vs maximum agent capacity |
| **Drone** | Worker Process | Background tasks, maintenance scripts, or utility functions |

### Strategic Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Swarm** | Mass Deployment | Coordinated deployment of multiple Teams for large initiatives |
| **Burrow** | Hidden/Background Operations | Stealth monitoring, background analysis, or dormant agents |
| **Neural Parasite** | System Integration | Taking control of external systems or APIs |
| **Dark Swarm** | Protection Mechanism | Error shielding or defensive coding practices |

### Communication & Alert Terms

| Term | Potential Role | Description |
|------|---------------|-------------|
| **Quack Alert** | Alert System | Clear, memorable, fun alert mechanism for urgent notifications |
| **Pond Pulse** | Monitoring System | Real-time monitoring focus, heartbeat of the pond ecosystem |
| **QuackCast** | Broadcasting System | Broadcasting emphasis for multi-agent announcements |
| **Instant Honk** | Urgent Alert | Urgency + duck theme for critical immediate notifications |
| **Duck Dispatcher** | Alert Router | Dispatching real-time alerts to appropriate agents |

### Usage Guidelines

These terms are reserved for future expansion when the framework requires:
- **Scaling beyond current Hatchery model** (Hive, Broodlord)
- **Specialized architectural tools** (Lair Layer, Spire Designer)
- **Resource management systems** (Vespene, Minerals, Supply)
- **Advanced orchestration patterns** (Swarm, Nydus Network)

The biological metaphor should be extended thoughtfully, ensuring each new term adds clarity rather than confusion to the system architecture.

## Appendix B: Ideas from the Architect

The following roles and concepts were proposed by the Architect to extend the Hatchery framework for comprehensive development coverage:

### Proposed New Team Member Roles

| Proposed Role | Name | Purpose |
|---------------|------|---------|
| **Documentation Agent** | **team_documenter** | Auto-generate docs, maintain README |
| **Performance Agent** | **team_optimizer** | Performance testing, optimization |
| **Migration Agent** | **team_migrator** | Database migrations, version upgrades |
| **Integration Agent** | **team_connector** | API integration, external services |

### Rationale for New Roles

These specialized team members would address common development needs that aren't covered by the core implementation team:

- **team_documenter**: Ensures documentation stays synchronized with code changes, reducing technical debt
- **team_optimizer**: Focuses on performance bottlenecks that implementation team members might miss
- **team_migrator**: Handles complex data migrations that require specialized attention
- **team_connector**: Manages external API integrations and third-party service connections

### Integration Strategy

These roles could be spawned on-demand by the team_orchestrator when specific TaskSpec types are detected:
- Documentation TaskSpecs → Spawn team_documenter
- Performance TaskSpecs → Spawn team_optimizer
- Migration TaskSpecs → Spawn team_migrator
- Integration TaskSpecs → Spawn team_connector

This modular approach allows the Hatchery to adapt its brood composition based on the specific needs of each FeatSpec.

---
*Generated by: architect  
*Review by: project_planner*  
*Status: Ready for Implementation Planning*