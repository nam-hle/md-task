---
id:
  prefix: TASK
  separator: '-'
fields:
  priority: [P0, P1, P2, P3, P4]
  type: [Feature, Bug, Task, Chore]
  status: [Todo, In-Progress, Done, Cancelled]
  terminal: [Done, Cancelled]
defaults:
  priority: P2
  type: Task
  status: Todo
  scope: general
---

# Tasks

### TASK-1

Fix login timeout
type:Bug, priority:P1, scope:backend, status:Todo, created:2026-04-23, updated:2026-04-23

### TASK-2

Add caching layer
type:Feature, priority:P2, scope:general, status:In-Progress, created:2026-04-23, updated:2026-04-23
