# Expert List DnD Kit Design

## Goal

Replace the current native pointer-based reorder logic in [`components/botchat/expert-settings-dialog.tsx`](D:/github/botchat/components/botchat/expert-settings-dialog.tsx) with `@dnd-kit/sortable`, while preserving the existing `ScrollArea`, handle-only drag affordance, and reorder persistence API.

## Scope

- Only the expert list inside the Expert Settings dialog changes.
- The expert form, expert APIs, and overall dialog layout stay intact.
- Dragging remains available only from the left `GripVertical` handle.
- The list does not reorder live during drag; it reorders once on drop.

## Interaction Model

- Wrap the list in a `DndContext` and `SortableContext`.
- Each expert row becomes a sortable item keyed by its expert id.
- `useSortable` is attached to the row, but drag listeners and attributes are bound only to the handle button.
- During drag, the source row remains in the list with a subdued placeholder treatment.
- A `DragOverlay` renders the dragged expert row outside the scroll container so motion stays stable while the list itself remains static.
- On `onDragEnd`, if the active id and target id differ, reorder the array once with `arrayMove`, normalize `sort_order`, update local state, and persist using the existing `/api/experts/reorder` flow.

## Visual Behavior

- Idle rows keep the current expert list look.
- Drag handle continues to signal affordance through hover and active states.
- The overlay card gets a stronger shadow and slightly elevated feel.
- The source row keeps its size but lowers emphasis so the overlay reads as the active object.
- No mid-drag insertion line or live displacement animation is added.

## Accessibility And Sensors

- Use pointer and keyboard sensors from `@dnd-kit/core`.
- Restrict activation to the handle so the content button still selects the expert normally.
- Keep reorder disabled under the same conditions as today: search active, loading, saving, generating, deleting, or already reordering.

## Data Flow

- Keep the current `experts` array as the source of truth.
- Track `activeDragId` for overlay rendering.
- On drop:
  - if no target or same target, clear drag state and do nothing
  - otherwise compute a new order, update local experts, sync `draft.sort_order` when the selected expert moved, and persist order
- Preserve the existing error surface for failed reorder persistence.

## Verification

- Add focused helper tests for reorder normalization and no-op drop decisions if that logic is extracted.
- Run `bun run build`.
- Manually verify:
  - drag starts only from the handle
  - list does not reorder until drop
  - dragged overlay follows pointer cleanly
  - dropping on a new row reorders once and persists
  - dropping back on the same position is a no-op
