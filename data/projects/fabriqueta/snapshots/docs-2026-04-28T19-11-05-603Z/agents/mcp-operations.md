# MCP Operations

Fabriqueta exposes project state to AI agents through an MCP server. The goal is to let agents operate on the real project, not on a copied or detached representation.

## Why MCP Is Used

MCP provides a structured interface for tools, resources, and prompts. That makes it a good fit for Fabriqueta because agents need both read access to context and write access to project state.

## Current Agent Capabilities (20 tools, 7 resources, 3 prompts)

### Resources (read-only project state)

| URI | Purpose |
|---|---|
| `fabriqueta://projects` | List all projects with counts |
| `fabriqueta://projects/{slug}/board` | Full board: epics, tasks, active sprint |
| `fabriqueta://projects/{slug}/backlog` | Backlog-focused data for sprint planning |
| `fabriqueta://projects/{slug}/sprint` | Active sprint + its tasks only |
| `fabriqueta://projects/{slug}/tasks/{taskId}` | Single task with epic and sprint context |
| `fabriqueta://projects/{slug}/documentation` | Full documentation tree (recursive) |
| `fabriqueta://projects/{slug}/documentation/nodes/{nodeId}` | Single documentation node |

### Tools (read + write operations)

| Tool | Action |
|---|---|
| `list_projects` | List all projects |
| `get_project_board` | Read full board for a project |
| `get_task_context` | Read one task with epic + sprint context |
| `create_project` | Create a new project |
| `create_epic` | Create an epic with title and description |
| `create_task` | Create a task under an epic |
| `start_sprint` | Start a new active sprint |
| `complete_active_sprint` | Complete the active sprint |
| `update_sprint_retrospective_notes` | Save retrospective notes |
| `add_task_to_active_sprint` | Assign a task to the active sprint |
| `remove_task_from_sprint` | Remove a task from its sprint |
| `update_task_status` | Change task status and optionally update title/description |
| `move_epic` | Reorder epic up or down in backlog |
| `move_task` | Reorder task up or down within its epic |
| `delete_epic` | Delete an epic and its tasks |
| `delete_task` | Delete a single task |
| `get_project_documentation` | Read full documentation tree |
| `create_documentation_node` | Create a directory or markdown page |
| `update_documentation_node` | Rename or update markdown content |
| `delete_documentation_node` | Delete a documentation node |

### Prompts (structured agent workflows)

| Prompt | What it loads |
|---|---|
| `plan-next-sprint` | Backlog context for sprint planning |
| `execute-active-sprint` | Active sprint board for execution |
| `review-project-documentation` | Documentation tree for review |

## Expected Agent Workflow

Agent behavior is guided by **reusable skills** in `.claude/skills/`, not by project-specific documentation. The general flow:

1. Load relevant skills (agent-execution, task-selection, context-budgeting, etc.).
2. Read project context via MCP resources.
3. Claim a task via MCP tools.
4. Execute work while updating task status via MCP.
5. Update documentation via MCP as implementation changes.
6. Complete the task following the completion checklist skill.

### Skill Files That Guide Agent Behavior

| Skill Directory | Purpose |
|---|---|
| `autonomous-delivery` | Core operating loop for multi-hour autonomous runs |
| `scrum-master` | Sprint planning, backlog grooming, work sequencing |
| `agent-execution` *(planned)* | Pre-flight, execution loop, and completion contract |
| `completion` *(planned)* | Mandatory board/doc update checklist on task complete |
| `task-selection` *(planned)* | Next-task priority and selection criteria |
| `approval-checkpoints` *(planned)* | Human approval gates for risky actions |
| `context-budgeting` *(planned)* | Token-efficient context loading order |
| `agent-prompts` *(planned)* | Agent-specific starting prompts (Codex, Claude, Cursor) |
| `agent-tips` *(planned)* | Operating tips per agent environment |

Projects adopt these skills by copying skill directories into their own `.claude/skills/`.

## Behavioral Expectation

A good Fabriqueta agent should not only finish implementation tasks. It should also keep the surrounding operational state current so the board and product documentation remain trustworthy for the next human or agent. The completion checklist skill defines exactly what "keeping state current" means.

## Near-Term Direction

- Task claiming protocol (claim_task / release_task MCP tools + claimed_by in board)
- Documentation search MCP resource
- Task context bundle (composite resource)
- Activity/audit log MCP resource
- Filesystem ↔ database documentation sync
- All agent-facing procedures packaged as reusable skills, not project docs
