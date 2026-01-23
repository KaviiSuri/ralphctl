# Jobs to Be Done: Project-Scoped Ralph Loops

## JTBD-001: Project Initialization

**Job Statement**: When I'm starting a new feature or milestone, I want to create an organized project folder with the right structure, so that all my planning artifacts and specs are contained and don't pollute the root directory.

**Context**:
- User is about to work on something new (feature, refactor, milestone)
- They don't want PRDs and specs scattered in root
- They want a repeatable, consistent structure

**Success Criteria**:
- Single command creates the full folder structure
- Template files are in place ready to be filled
- Clear next step is communicated

---

## JTBD-002: Guided Planning Workflow

**Job Statement**: When I'm planning a feature, I want a guided conversation that walks me through research → PRD → breakdown → specs, so that I don't skip important steps and end up with incomplete specs.

**Context**:
- User has a rough idea but needs to formalize it
- Traditional approach: ad-hoc conversation, easy to miss things
- Want structure but also flexibility (can skip stages if needed)

**Success Criteria**:
- Each stage has clear prompts and outputs
- Missing prerequisites trigger warning (not hard block)
- Each command tells user the next step
- Artifacts are saved to project folder incrementally

**Sub-jobs**:
- Research capture (problem statement, constraints, existing solutions)
- PRD creation (goals, non-goals, user stories)
- JTBD breakdown (high-level jobs)
- Task decomposition (granular work units + **dependency graph** + **linearized order**)
- HLD documentation (optional architecture decisions)
- Spec generation (**isolated subagent per task**, reads only filesystem artifacts to validate completeness)

---

## JTBD-003: Project-Scoped Execution

**Job Statement**: When I'm ready to implement, I want to run Ralph loops (plan/build) against a specific project's specs, so that I can have multiple projects in flight without them interfering with each other.

**Context**:
- User has completed planning, specs are ready
- May have multiple projects at different stages
- Want to run loops against just one project's specs

**Success Criteria**:
- `--project` flag scopes all operations
- Uses project's specs folder and implementation plan
- Global prompts still work (with project placeholder)
- Sessions tagged with project name for filtering

---

## JTBD-004: Command Infrastructure

**Job Statement**: When I want to use the guided workflow, I want commands automatically set up for my tools, so that I don't have to manually configure anything.

**Context**:
- User might use Claude Code, OpenCode, or both
- Commands should have identical behavior across tools
- Setup should be automatic but not presumptuous

**Detection & Setup Requirements**:
1. **Auto-detect tools**: Check if `claude` and/or `opencode` CLIs are available
2. **Ask if none detected**: Prompt user to choose which tool(s) to set up for
3. **Local folders only**: Create `.claude/commands/` and/or `.opencode/commands/` at repo root, NOT global (`~/.claude/` or `~/.config/opencode/`)
4. **Repo root check**: If cwd is not a git repo root, ask user to confirm before creating folders

**Success Criteria**:
- Commands placed in LOCAL `.claude/commands/` and/or `.opencode/commands/`
- Auto-detection of available tools
- User prompted if no tools detected
- User prompted if cwd != repo root
- Same command content works in both tools

---

## Summary

| JTBD | Primary Outcome |
|------|-----------------|
| JTBD-001 | Project folder exists with structure |
| JTBD-002 | Planning artifacts created through guided flow |
| JTBD-003 | Ralph loops run scoped to project |
| JTBD-004 | Commands work in Claude Code and OpenCode |

---

**Next step**: Run `/project:tasks project-scoped-ralph` to break each JTBD into granular tasks.
