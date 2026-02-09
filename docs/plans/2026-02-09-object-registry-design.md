# Object Registry + Schema-Driven Property Panel Design

Date: 2026-02-09
Status: Draft (approved by user)

## Context
The project currently requires editing multiple files to add or modify object types (toolbar, drag/drop creation, scene load, renderer, and property panel). The PropertyPanel is large and tightly coupled to object-specific templates. This design introduces a single registry and schema-driven UI to reduce duplication and centralize object metadata.

## Goals
- Single entry point for object metadata (type, label, icon, defaults, schema).
- Schema-driven PropertyPanel for all object types.
- Remove switch-case dispersal across DragDrop, Scene load, and Renderer.
- Allow breaking compatibility with existing scene JSON formats.

## Non-Goals
- Backward compatibility with legacy scene files.
- Full automatic migration of existing localStorage data.
- Physics or rendering behavior changes beyond routing through the registry.

## High-Level Architecture
Introduce `ObjectRegistry` as the authoritative source for object types.

- Each object class provides:
  - `static defaults()` for initial values.
  - `static schema()` to define UI groups and fields.
- `ObjectRegistry` maps `type -> { class, label, icon, category, defaults, schema, rendererKey }`.
- `PropertyPanel` renders forms based entirely on `schema()`.
- `DragDropManager` and scene loading use registry factory methods.
- `Renderer` dispatches drawing based on `rendererKey` or type mapping.

## Schema Model
Schema is a list of groups, each with a title and field list. Each field supports:
- `key`: storage key in the serialized object.
- `label`: display label.
- `type`: number | select | checkbox | text | color | angle | vec2 | expression.
- `unit`: optional unit string.
- `min`, `max`, `step`: numeric constraints.
- `options`: for select.
- `visibleWhen`: predicate `(object) => boolean`.
- `validator`: function `(value, object) => errorString | null`.
- `bind`: optional `{ get(object), set(object, value) }` to map UI values to internal state.

The `bind` hook is required for composite fields (for example, Particle position/velocity vectors).

## Serialization Format (Breaking Change)
All objects serialize to a flat structure of schema keys. Example (Particle):
```
{
  "type": "particle",
  "x": 120,
  "y": 220,
  "vx": 50,
  "vy": 0,
  "mass": 9.109e-31,
  "charge": -1.602e-19,
  "radius": 6,
  "ignoreGravity": true,
  "showTrajectory": true
}
```
Object classes remain responsible for mapping flat fields into internal state during `deserialize()`.

## Component Changes
### ObjectRegistry (new)
- Location: `/Users/lvxiaoer/Documents/ElectricFieldMotionSimulator/js/core/ObjectRegistry.js`.
- API:
  - `register(type, meta)`
  - `get(type)`
  - `create(type, overrides)`
  - `listByCategory()`

### DragDropManager
- Replace switch-case creation with `registry.create(type, { x, y })`.
- Defaults come from `static defaults()`.

### Scene
- `loadFromData()` constructs objects via registry:
  - `const entry = registry.get(obj.type)`
  - `const instance = new entry.class(entry.defaults())`
  - `instance.deserialize(obj)`
- Serialization uses each instance `serialize()`.

### Renderer
- Add `ObjectRenderers` map keyed by `rendererKey` or type.
- `Renderer.renderFields()` and `renderParticles()` use registry and renderers for dispatch.

### PropertyPanel
- Replace object-specific templates with schema renderer.
- `SchemaForm` module:
  - Renders groups/fields.
  - Reads values and validates on submit.
  - Writes back via `bind` or direct assignment by `key`.
  - Emits notifications on validation errors.

## Error Handling
- Validation errors collected and shown via `showNotification`.
- Expression fields compile with `compileSafeExpression` / `compileSafeMathExpression`.
- Invalid expression blocks apply and reports error.

## Testing Plan
- Unit tests for `ObjectRegistry`:
  - `create()` returns correct defaults.
  - `schema()` exists for all registered types.
  - Serialization round trip for representative types.
- UI logic tests for `SchemaForm` (validation + bind hooks).
- Manual smoke: drag/drop, edit properties, save/export/import (new format).

## Risks
- Large refactor in `PropertyPanel` may regress niche controls.
- Schema coverage must be complete to avoid missing fields.

## Milestones
1. Introduce `ObjectRegistry` and register existing types.
2. Refactor DragDrop and Scene loading to registry.
3. Add ObjectRenderers map and refactor Renderer dispatch.
4. Rewrite PropertyPanel to schema-driven form.
5. Update tests and smoke-check.
