# Object Registry + Schema-Driven Property Panel Design

Date: 2026-02-09
Status: Approved

## Decisions
- Use a single ObjectRegistry as the authoritative source for object metadata.
- Move PropertyPanel to a schema-driven renderer with full feature parity
  (expression preview, validation, dynamic visibility, and error feedback).
- Allow breaking changes to scene JSON and localStorage formats.

## Goals
- Add a new device/object type with a single registration entry.
- Remove type switch-case sprawl across DragDrop, Scene load, Renderer,
  and PropertyPanel.
- Keep behavior and rendering fidelity unchanged while reducing coupling.

## Non-Goals
- Backward compatibility with legacy scene files or localStorage entries.
- Automatic migration of old scene data.
- Changes to physics correctness or visual style beyond routing.

## Architecture Overview
Introduce ObjectRegistry as a centralized catalog of object types.

- Each object class provides:
  - static defaults() -> default configuration.
  - static schema() -> UI schema for PropertyPanel.
- ObjectRegistry maps:
  type -> { class, label, icon, category, defaults, schema,
            rendererKey, physicsHooks }
- PropertyPanel delegates all UI to SchemaForm, which renders schema
  groups and fields and applies validation and bind hooks.
- Scene, Renderer, and PhysicsEngine use registry metadata to dispatch
  behavior by capability rather than hard-coded type branches.

## Schema Model
Schema is a list of groups, each with a title and field list.

Field shape:
- key: storage key in serialized data.
- label: display label.
- type: number | select | checkbox | text | color | angle | vec2 | expression
- unit: optional unit label.
- min/max/step: numeric constraints.
- options: select choices.
- visibleWhen(object): boolean predicate.
- validator(value, object): error string or null.
- bind: { get(object), set(object, value) } for computed or composite fields.

Notes:
- Expression fields use compileSafeExpression and show live previews.
- Hidden fields are not validated or overwritten.

## Data Flow and Lifecycle
Create -> Edit -> Save/Load

- Creation: DragDropManager calls ObjectRegistry.create(type, overrides).
  Registry merges defaults with overrides and instantiates the class.
- Scene: addObject assigns scene refs and stores by category.
- Editing: PropertyPanel invokes SchemaForm, which validates inputs,
  shows per-field errors, and applies changes atomically via bind.set.
- Serialization: objects serialize to flat structures with schema keys.
- Loading: Scene.loadFromData uses registry type lookup, instantiates the
  class with defaults, and calls deserialize() for internal state mapping.
- Unknown types are skipped with a summary notification.

## Error Handling and Consistency
- SchemaForm blocks apply if any field fails validation or expression
  compilation; no partial writes.
- Expression errors show inline and in a summary notification.
- Unknown fields in saved data are ignored safely.
- Missing rendererKey or physicsHooks results in no-op behavior, not a
  hard failure.

## Component Changes
- New: js/core/ObjectRegistry.js
- New: js/ui/SchemaForm.js (or similar location under ui/)
- DragDropManager: replace switch-case with registry.create().
- Scene: load and classification via registry metadata; serialize via
  object.serialize().
- Renderer: dispatch to renderers via rendererKey map.
- PhysicsEngine: invoke physicsHooks for devices (emit, collide, record).
- PropertyPanel: fully schema-driven UI using SchemaForm.

## Serialization Format (Breaking Change)
All objects serialize to flat key-value structures defined by schema.
Example (Particle):
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

## Testing Plan
- Unit: ObjectRegistry register/get/create/listByCategory.
- Unit: schema coverage and unique field keys for all types.
- Unit: SchemaForm validation, visibleWhen, bind hooks, expression preview.
- Round-trip: serialize -> deserialize -> serialize consistency tests.
- Manual smoke: drag/drop, edit properties, save/load new format,
  play/pause, selection, theme switch.

## Migration Note
Legacy scenes are not supported. Update README to note format break and
advise users to re-export scenes with the new version.

## Milestones
1. Introduce ObjectRegistry and register all existing types.
2. Refactor DragDropManager and Scene loading to registry.
3. Add renderer dispatch via rendererKey.
4. Implement SchemaForm and refactor PropertyPanel.
5. Update tests and manual smoke checks.
