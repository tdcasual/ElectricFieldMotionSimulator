# Geometry Real/Display Dual-Semantics Design

## Background
Demo mode currently mutates object geometry fields (`radius`, `width`, `height`, etc.) directly during zoom. This makes property values drift with zoom and mixes physical intent with render-space values.

## Goal
Introduce dual semantics for all geometry dimensions:
- `real` geometry: physical intent, editable, stable under zoom.
- `display` geometry: render/interaction size, depends on global zoom and per-object temporary scale.

The user-selected behavior is:
- Editing `real` updates geometry truth directly.
- Editing `display` changes only this object's temporary scale (`objectScale`) and does not modify `real`.
- `objectScale` is temporary and **not persisted**.

## Scope
Applies to geometry dimension fields across objects, including:
`width`, `height`, `radius`, `length`, `plateDistance`, `depth`, `viewGap`, `spotSize`, `lineWidth`, `particleRadius`, `barrelLength`.

Out of scope for this iteration:
- Backward compatibility migration logic for historical scenes.
- Persisting object-scale state.

## Data Model
Add runtime-only geometry state on objects:
- `__geometryReal`: map of real dimension values.
- `__geometryObjectScale`: per-object temporary scale (default `1`).

These runtime fields are never serialized.

Display formula:
`displayValue = realValue * sceneScale * objectScale`

Where:
- `sceneScale = scene.settings.pixelsPerMeter` (fallback `1`).
- `objectScale = object.__geometryObjectScale` (fallback `1`).

## Behavior Design
### Object creation
When an object is created (especially in demo mode), initialize runtime geometry state by deriving `real` from current display values and current `sceneScale`.

### Zoom behavior
Demo zoom should no longer multiply geometry fields directly. It only updates scene zoom state and then re-syncs display geometry from real geometry + object scale.

### Property panel behavior
For each geometry field in schema, show two editable fields:
- `<field>（真实）` -> writes `real`.
- `<field>（显示）` -> updates `objectScale` only.

`real` writes use two-decimal rounding as required.

### Serialization
Only existing object fields are serialized. Runtime geometry state is intentionally omitted.

## Error Handling
- Reject non-finite numeric inputs.
- Reject non-positive computed scale factors.
- Guard divide-by-zero in display-to-scale conversion.
- Fallback `sceneScale=1`, `objectScale=1` on invalid state.

## Testing Strategy
1. Unit test helper:
- derive real from display.
- editing real updates display.
- editing display updates object scale and all geometry display fields.

2. Demo zoom tests:
- zoom changes display dimensions while real dimensions remain unchanged.

3. Runtime property tests:
- property payload includes real/display paired geometry fields.
- applying display field changes object scale only.
- applying real field updates real geometry and display value.
