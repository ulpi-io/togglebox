---
name: update-claude-md-after-install
description: Use when user has just installed framework agents and CLAUDE.md contains generic examples - systematically discovers actual project patterns (custom commands, architecture decisions, team conventions) and updates CLAUDE.md and imported files with real project-specific information
---

# Update CLAUDE.md After Installation

## Overview

After installing framework agents, CLAUDE.md and its imported files contain generic placeholder examples. This skill guides you to systematically discover the actual project patterns and update these files with real, project-specific information.

**Core principle:** Discover, don't assume. Analyze the codebase to find actual patterns instead of keeping generic examples.

**Quality target:** 10/10 AI agent effectiveness - documentation should enable an AI to implement features correctly on the first attempt.

## What Makes 10/10 Documentation

AI agents are most effective when documentation provides:

### 1. Step-by-Step Implementation Guides

Instead of just describing what exists, show HOW to add new things:

❌ Poor (4/10): "We use Express.js with controllers"
✅ Excellent (10/10):

````markdown
## Adding a New API Endpoint

### Step 1: Choose the Router

| Router         | Auth              | Use For        |
| -------------- | ----------------- | -------------- |
| publicRouter   | conditionalAuth() | Read-only GETs |
| internalRouter | requireAuth()     | All mutations  |

### Step 2: Create Controller Method

```typescript
methodName = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await withDatabaseContext(req, async () => {
      const startTime = Date.now();
      const result = await this.db.repository.method(platform, environment);
      logger.logDatabaseOperation(
        "methodName",
        "table",
        Date.now() - startTime,
        true,
      );
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    next(error);
  }
};
```
````

````

### 2. Exact Response Formats with Code

❌ Poor: "API returns JSON with success flag"
✅ Excellent:

```markdown
### Success Response
```typescript
{ success: true, data: result, timestamp: "2024-01-15T..." }
````

### Error Response

```typescript
{ success: false, error: "Message", code: "ERROR_CODE", details: [...], timestamp: "..." }
```

### Validation Error (Zod)

```typescript
res.status(422).json({
  success: false,
  error: "Validation failed",
  code: "VALIDATION_FAILED",
  details: error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
  timestamp: new Date().toISOString(),
});
```

````

### 3. Permission/Role Tables

❌ Poor: "Auth uses roles with permissions"
✅ Excellent:

```markdown
| Permission | Use Case |
|------------|----------|
| config:read | Read configs, flags, experiments |
| config:write | Create/update configs, flags, experiments |
| config:delete | Delete configs, flags, experiments |
| cache:invalidate | Manual cache purge |
| user:manage | User administration (admin only) |
| apikey:manage | API key management |
````

### 4. State Machines with Visual Diagrams

❌ Poor: "Experiments have different statuses"
✅ Excellent:

```markdown
## Experiment State Machine
```

draft → running → paused → completed → archived
↓ ↑
└───────────┘

```

| Current State | Action | New State |
|---------------|--------|-----------|
| draft | POST /start | running |
| running | POST /pause | paused |
| paused | POST /resume | running |
```

### 5. Route Ordering Rules

❌ Poor: "Routes are in routes/ folder"
✅ Excellent:

````markdown
**Critical:** Specific routes MUST come before parameterized routes.

```typescript
// CORRECT ORDER
router.get("/configs/list", handler); // /list matched first
router.get("/configs/:parameterKey", handler); // :parameterKey last

// WRONG ORDER - "list" would match as parameterKey
router.get("/configs/:parameterKey", handler);
router.get("/configs/list", handler); // Never reached!
```
````

````

### 6. Decision Tables

❌ Poor: "Use PUT for updates, PATCH for partial updates"
✅ Excellent:

```markdown
| Endpoint | Creates Version | Use Case |
|----------|-----------------|----------|
| PUT /flags/:key | Yes | Full configuration changes |
| PATCH /flags/:key/toggle | No | Quick enable/disable |
| PATCH /flags/:key/rollout | No | Adjust rollout percentage |
````

## When to Use

Use this skill when:

- **Initial install:** User just installed agents and CLAUDE.md has generic examples
- **Project start:** Beginning work on a project for the first time
- **Key milestones:** After major architecture changes, new custom commands added, team conventions updated
- **Periodic refresh:** User asks to "update docs" or "sync CLAUDE.md with project"
- **Discovery gaps:** CLAUDE.md outdated or missing new project patterns

**Symptoms:**

- CLAUDE.md has comments like "customize for your project"
- project-commands.md shows generic examples but project has real commands
- architecture.md describes patterns the project doesn't use
- conventions.md has generic git workflow but project uses different process
- New features added but not documented in CLAUDE.md
- Team asks "is the CLAUDE.md file current?"

## Quality Checklist (10/10 Target)

Before completing, verify your documentation scores on each criterion:

### Implementation Guidance (0-2 points)

- [ ] **0 points:** Just describes what exists ("We have controllers")
- [ ] **1 point:** Shows file locations ("Controllers are in src/controllers/")
- [ ] **2 points:** Provides step-by-step guide with actual code templates

### Response Formats (0-2 points)

- [ ] **0 points:** No response format documented
- [ ] **1 point:** Generic description ("Returns JSON")
- [ ] **2 points:** Exact TypeScript interfaces for all response types

### Permission Model (0-2 points)

- [ ] **0 points:** No permissions documented
- [ ] **1 point:** Lists roles ("admin, developer, viewer")
- [ ] **2 points:** Complete table mapping permissions to actions

### State/Workflow Diagrams (0-2 points)

- [ ] **0 points:** No workflows documented
- [ ] **1 point:** Lists states ("draft, running, completed")
- [ ] **2 points:** Visual diagram + transition table + constraints

### Routing/Ordering Rules (0-2 points)

- [ ] **0 points:** No routing info
- [ ] **1 point:** Lists routes
- [ ] **2 points:** Documents ordering requirements with examples of what breaks

**Total: 10 points = 10/10 documentation**

## Discovery Process

Follow these steps systematically. Use TodoWrite to track progress.

### Step 1: Announce and Plan

```markdown
I'm using the **update-claude-md-after-install** skill to discover your actual project patterns.

I'll systematically analyze:

1. Custom commands and scripts
2. Architecture patterns (API structure, database patterns, state machines)
3. Team conventions (git workflow, testing, permissions)
4. Implementation patterns (controller templates, response formats)

Target: 10/10 AI agent effectiveness documentation.
```

### Step 2: Discover Implementation Patterns

**What to look for:**

- Controller/handler method structure
- Required wrappers (withDatabaseContext, asyncHandler, etc.)
- Dependency injection patterns
- Service layer organization

**How to discover:**

```bash
# Find controller files
find . -name "*controller*" -o -name "*Controller*" | head -20

# Read a representative controller
cat src/controllers/[main-controller].ts | head -100

# Find middleware patterns
grep -r "asyncHandler\|withDatabaseContext" --include="*.ts" | head -5

# Find route organization
cat src/routes/*.ts | head -100
```

**What to extract for 10/10 docs:**

- Complete method template with all wrappers
- Route organization pattern (which router for which operations)
- Middleware chain order
- Error handling pattern

### Step 3: Discover Response Formats

**What to look for:**

- Success response structure
- Error response structure
- Validation error format
- Pagination patterns

**How to discover:**

```bash
# Find response patterns
grep -r "res.json\|res.status" --include="*.ts" -A 3 | head -50

# Find error responses
grep -r "success: false" --include="*.ts" -B 2 -A 4 | head -30

# Find pagination
grep -r "pagination\|nextToken\|perPage" --include="*.ts" | head -10
```

**What to extract for 10/10 docs:**

- Exact JSON structure for success
- Exact JSON structure for errors
- Validation error format with field mapping
- Both pagination styles if applicable

### Step 4: Discover Permission Model

**What to look for:**

- Role definitions
- Permission strings used
- Permission checks in routes/controllers
- Authorization middleware

**How to discover:**

```bash
# Find permission checks
grep -r "requirePermission\|hasPermission" --include="*.ts" | head -20

# Find role definitions
grep -r "rolePermissions\|admin\|developer\|viewer" --include="*.ts" -B 2 -A 10 | head -50

# Find auth middleware
grep -r "requireAuth\|authenticate" --include="*.ts" | head -10
```

**What to extract for 10/10 docs:**

- Complete permission list
- Which permission for which operation
- Role-to-permission mapping
- Auth middleware usage patterns

### Step 5: Discover State Machines and Workflows

**What to look for:**

- Entity states (draft, active, archived, etc.)
- State transition endpoints
- State constraints (what can change when)
- Lifecycle hooks

**How to discover:**

```bash
# Find state-related code
grep -r "status\|state\|draft\|running\|completed" --include="*.ts" | head -30

# Find transition endpoints
grep -r "start\|pause\|resume\|complete\|archive" routes/ --include="*.ts" | head -20

# Find state validation
grep -r "cannot\|only when\|must be" --include="*.ts" | head -10
```

**What to extract for 10/10 docs:**

- ASCII state machine diagram
- Transition endpoint table
- Constraints (what's not allowed)
- Version vs in-place update semantics

### Step 6: Discover Custom Commands

**What to look for:**

- Custom artisan/CLI commands
- NPM scripts
- Deployment scripts
- Database scripts

**How to discover:**

```bash
# Find custom commands
find . -path "*Console/Commands*" -name "*.php" -o -path "*commands*" -name "*.ts" | head -10

# Check package.json scripts
cat package.json | grep -A 30 '"scripts"'

# Check for shell scripts
ls -la *.sh scripts/*.sh bin/* 2>/dev/null
```

### Step 7: Discover Team Conventions

**What to look for:**

- Git workflow
- PR template
- CI/CD configuration
- Testing requirements
- Code style

**How to discover:**

```bash
# Check PR template
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null

# Check CI workflow
cat .github/workflows/*.yml 2>/dev/null | head -50

# Check for CONTRIBUTING
cat CONTRIBUTING.md 2>/dev/null

# Check test config
cat jest.config.* vitest.config.* phpunit.xml 2>/dev/null | head -30
```

### Step 8: Create development-guide.md

**CRITICAL FOR 10/10:** Create a new file `.claude/claude-md-refs/development-guide.md` with:

1. Step-by-step "Adding a New Endpoint" guide
2. Controller method template with actual code
3. All response format examples
4. Permission usage guide
5. State machine documentation
6. Common patterns and gotchas

**Template structure:**

```markdown
# Development Guide

## Adding a New API Endpoint

[Step-by-step with actual code]

## Response Formats

[All response types with TypeScript]

## Permission Model

[Complete table]

## Database Patterns

[withDatabaseContext usage, pagination]

## Cache Invalidation

[When and how to invalidate]

## State Machines

[For each entity with states]

## Testing Patterns

[How to test controllers]
```

### Step 9: Update architecture.md

Add:

- State machine diagrams
- Pagination patterns
- Versioning semantics
- Decision tables for API patterns

### Step 10: Update conventions.md

Add:

- API response standards with TypeScript
- Controller method template
- Route organization rules
- Error handling patterns

### Step 11: Update CLAUDE.md

Add import for development-guide.md:

```markdown
@.claude/claude-md-refs/development-guide.md
```

### Step 12: Verification Against 10/10 Checklist

Re-run the quality checklist:

- [ ] Implementation Guidance: 2 points (step-by-step with code templates)
- [ ] Response Formats: 2 points (exact TypeScript for all types)
- [ ] Permission Model: 2 points (complete permission-to-action table)
- [ ] State/Workflow Diagrams: 2 points (visual + transition table + constraints)
- [ ] Routing/Ordering Rules: 2 points (ordering rules with break examples)

**If any section scores below 2, improve it before completing.**

## Common Mistakes

| Mistake                       | Fix                                                                  |
| ----------------------------- | -------------------------------------------------------------------- |
| Generic descriptions          | Add exact code examples and templates                                |
| Missing response formats      | Document every response type with TypeScript                         |
| No permission table           | Create complete permission-to-operation mapping                      |
| State list without diagram    | Add ASCII diagram + transition table                                 |
| Routes without ordering rules | Document which route patterns must come first                        |
| Only updating one file        | Update CLAUDE.md + ALL @imported files + CREATE development-guide.md |

## Key Reminders

1. **Target 10/10:** Use the quality checklist, not just "good enough"
2. **Create development-guide.md:** This file makes the difference between 4/10 and 10/10
3. **Step-by-step > Description:** Show HOW, not just WHAT
4. **Exact code > Generic patterns:** Use actual project code as templates
5. **Tables > Paragraphs:** Permissions, states, routes all benefit from tables
6. **Diagrams > Lists:** State machines need visual representation
7. **Verify with checklist:** Score each section before completing

## Quick Workflow Summary

```
1. Announce: "Using update-claude-md-after-install skill targeting 10/10 docs"
2. Discover implementation patterns: controller templates, wrappers, routes
3. Discover response formats: success, error, validation, pagination
4. Discover permissions: roles, permissions, middleware
5. Discover state machines: statuses, transitions, constraints
6. Discover commands: CLI, scripts, npm scripts
7. Discover conventions: git, CI, testing
8. CREATE development-guide.md: step-by-step implementation guide
9. UPDATE architecture.md: add state machines, pagination
10. UPDATE conventions.md: add response standards, controller template
11. UPDATE CLAUDE.md: add development-guide.md import
12. VERIFY: Score each section using 10/10 checklist
13. Complete: Announce updates finished with quality score
```

---

_This skill ensures documentation enables AI agents to implement features correctly on the first attempt._
