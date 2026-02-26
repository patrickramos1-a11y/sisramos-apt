

# Fix: Checklist Drag-and-Drop Cross-Week Bug + Rollover Preserving Order

## Problem 1: Reorder Messes Up Other Weeks

**Root cause:** When you drag-and-drop a recorrente item in one week, the code updates the template's `ordem_global` (shared across ALL weeks). This means reordering in week 5 changes the order in weeks 1-4 too.

Each week has a different mix of recorrente and avulso items, so positions calculated from one week's layout corrupt other weeks' layouts.

**Fix:** Stop updating `ordem_global` on templates during reorder. Instead, always set `ordem_override` on the individual instance. This makes each week's order fully independent.

## Problem 2: Rollover Not Preserving Order

**Root cause:** The rollover function copies `link_override` and assignees but does NOT copy `ordem_override`. New month items all get `null` order, losing the user's careful organization.

**Fix:** Include `ordem_override` in the rollover copy.

---

## Technical Changes

### File: `src/hooks/useChecklistV2.ts`

**1. Fix `reorderItem` function (lines 404-464)**

Replace the entire function logic: instead of branching between recorrente (update template) and avulso (update instance), ALL items will update `ordem_override` on their individual instances. This ensures week-independent ordering.

New logic:
- Get all items for the specific week
- Reorder them locally
- Set `ordem_override` for EVERY item in that week (batch update)
- Never touch `ordem_global` on templates

**2. Fix `rolloverToNextMonth` function (line 522-530)**

Add `ordem_override` to the new instances being created. The value comes from the source instance's resolved `ordem` (which may be from `ordem_override` or `ordem_global`).

### Summary

| Change | What | Why |
|--------|------|-----|
| `reorderItem` | Use `ordem_override` per instance, never update template `ordem_global` | Each week keeps independent order |
| `reorderItem` | Update ALL items in the week, not just the moved one | Consistent ordering after every drag |
| `rolloverToNextMonth` | Copy `ordem_override` from source | Preserve organization in new month |

