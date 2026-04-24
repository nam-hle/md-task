---
id:
  prefix: Task
  separator: ' '
fields:
  priority: [critical, high, medium, low]
  type: [feature, bug, task, chore]
  status: [todo, in-progress, review, done, cancelled]
  terminal: [done, cancelled]
transitions:
  todo: [in-progress, cancelled]
  in-progress: [review, todo, cancelled]
  review: [done, in-progress]
  done: []
  cancelled: []
defaults:
  priority: medium
  type: task
  status: todo
  scope: general
---

# Tasks

### Task 1

Fix login timeout
type:bug, priority:high, scope:backend, status:todo, created:2026-04-23, updated:2026-04-23

### Task 2

Add caching layer
type:feature, priority:medium, scope:general, status:in-progress, created:2026-04-23, updated:2026-04-23

### Task 3

Completed task
type:chore, priority:low, scope:backend, status:done, created:2026-04-22, updated:2026-04-22
