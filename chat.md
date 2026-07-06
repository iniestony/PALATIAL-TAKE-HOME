# Optimize SceneHierarchy rendering

> In the SceneHierarchy component, seems the most effective root cause of performance issue is that we do not render Hierarchy on demand, re-render should only happen when initial loading, selection changed and object rotation changed

<details><summary>17 previous messages</summary>

> I’ll trace the SceneHierarchy render path and the state it subscribes to, then tighten the update triggers around loading, selection, and rotation. After that I’ll run the most relevant checks the repo exposes.
>
> <details><summary>Explored a search, a list, ran a command</summary>
>
> <details><summary>Explored a search, a list</summary>
>
> - Listed files
> - Searched for `SceneHierarchy|Hierarchy` in `.`
>
> </details>
>
> - Ran `git status --short`
>
> </details>
>
> I found a very small app surface and one existing modified file, `diagnosis.md`, which I’ll leave alone unless it turns out to be directly relevant. Now I’m reading the component and engine event contracts so the change matches the app’s existing flow.
>
> <details><summary>Explored 4 files</summary>
>
> - Read `./src/main.tsx`
> - Read `./src/SceneHierarchy.tsx`
> - Read `./src/engine/MiniEngine.ts`
> - Read `./src/engine/EventManager.ts`
>
> </details>
>
> The hot path is exactly where you suspected: `SceneHierarchy` forces a React render every animation frame just to refresh Euler text. I’m checking how rotation changes are emitted so we can replace that with event-driven updates instead of a timer.
>
> <details><summary>Explored 3 files, a search</summary>
>
> - Read `./src/engine/SelectionManager.ts`
> - Read `./src/engine/RotationGizmo.ts`
> - Searched for `dispatch\(|subscribe\(` in `src`
> - Read `./package.json`
>
> </details>
>
> I’m going to remove the animation-frame state bump from `SceneHierarchy`, add proper event subscriptions with cleanup, and emit a rotation-change event from the selection flow when gizmo dragging mutates the selected object. I’ll also cover convention changes, since in the assembly scene those can alter displayed world rotations without a drag.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./src/SceneHierarchy.tsx` (+27 -22)
> - Wrote `./src/engine/SelectionManager.ts` (+5 -4)
>
> </details>
>
> The first patch didn’t apply because I inverted one condition while matching the drag handler. Easy fix: I’m applying the same change against the actual `isDragging` branch.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./src/SceneHierarchy.tsx` (+19 -14)
> - Wrote `./src/engine/SelectionManager.ts` (+1 -0)
>
> </details>
>
> The hierarchy is now event-driven instead of RAF-driven, and the selection manager announces rotation changes during gizmo drags. I’m building next to catch type issues and make sure the event wiring is clean.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `npm run build`
> - Ran `git status --short`
> - Ran `git diff -- src/SceneHierarchy.tsx src/engine/SelectionManager.ts`
>
> </details>
>
> One refinement before I call it done: I don’t want pointer movement over the canvas to count as a hierarchy update unless the gizmo actually applied a rotation. I’m making `drag` report whether it changed the object, and I’m moving assembly convention refreshes onto the same `object_rotation_changed` signal so the hierarchy has one clean invalidation event.
>
> <details><summary>Edited 4 files, ran a command</summary>
>
> - Wrote `./src/SceneHierarchy.tsx` (+0 -2)
> - Wrote `./src/engine/MiniEngine.ts` (+1 -0)
> - Wrote `./src/engine/RotationGizmo.ts` (+4 -3)
> - Wrote `./src/engine/SelectionManager.ts` (+3 -2)
> - Ran `npm run build`
>
> </details>
>
> Build passes. I’m doing one last diff pass now, mostly to make sure the final summary can point at the exact files and that I didn’t accidentally touch the existing `diagnosis.md` change.
>
> <details><summary>Explored 4 files, ran a command</summary>
>
> <details><summary>Explored 2 files</summary>
>
> - Read `./src/SceneHierarchy.tsx`
> - Read `./src/engine/RotationGizmo.ts`
>
> </details>
>
> - Ran `git diff -- src/SceneHierarchy.tsx src/engine/MiniEngine.ts src/engine/RotationGizmo.ts src/engine/SelectionManager.ts`
>
> <details><summary>Explored 2 files</summary>
>
> - Read `./src/engine/SelectionManager.ts`
> - Read `./src/engine/MiniEngine.ts`
>
> </details>
>
> </details>
>
> Implemented the SceneHierarchy render throttling fix.
>
> The key change is in [src/SceneHierarchy.tsx](./src/SceneHierarchy.tsx:21): it no longer schedules a React render every animation frame. It now re-renders only from `scene_loaded`, `selection_changed`, and `object_rotation_changed`, with proper unsubscribe cleanup.
>
> I also wired rotation invalidation from gizmo drags in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:90), made `RotationGizmo.drag` report whether it actually applied a rotation in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:166), and dispatch rotation updates for assembly convention changes in [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:152).
>
> Verification: `npm run build` passes. Vite still emits the existing large chunk warning, but no type/build errors. I left the pre-existing `diagnosis.md` modification untouched.
</details>

Implemented the SceneHierarchy render throttling fix.

The key change is in [src/SceneHierarchy.tsx](./src/SceneHierarchy.tsx:21): it no longer schedules a React render every animation frame. It now re-renders only from `scene_loaded`, `selection_changed`, and `object_rotation_changed`, with proper unsubscribe cleanup.

I also wired rotation invalidation from gizmo drags in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:90), made `RotationGizmo.drag` report whether it actually applied a rotation in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:166), and dispatch rotation updates for assembly convention changes in [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:152).

Verification: `npm run build` passes. Vite still emits the existing large chunk warning, but no type/build errors. I left the pre-existing `diagnosis.md` modification untouched.

> all right, just ignore the diagnosis.md file, just for my own note

Got it. I’ll keep ignoring `diagnosis.md` and won’t touch or factor it into future changes unless you explicitly ask.

> Scene A and Scene B are constructed via `buildScene`, seems that for each mesh, a new material along with a new texture is created, they should share the same material and texture to improve performance

<details><summary>9 previous messages</summary>

> I’ll look at how `buildScene` constructs meshes and then switch repeated assets to shared material/texture instances where it fits the existing scene factory. After that I’ll run the build again.
>
> <details><summary>Explored a file, a search, ran a command</summary>
>
> <details><summary>Explored a file, a search</summary>
>
> - Read `./src/engine/SceneFactory.ts`
> - Searched for `new THREE\.(Mesh|.*Material|.*Texture|TextureLoader|CanvasTexture|DataTexture)` in `engine`
>
> </details>
>
> - Ran `git status --short`
>
> </details>
>
> `SceneFactory` already shares the sphere geometry, but it creates about 250 `MeshStandardMaterial` and `DataTexture` instances per scene build. I’m going to make the white texture singleton and use one scene-colored material per scene, then adjust hover highlighting so a shared material doesn’t cause every mesh to glow together.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./src/engine/SceneFactory.ts` (+8 -3)
> - Wrote `./src/engine/SelectionManager.ts` (+17 -2)
>
> </details>
>
> The factory now reuses one texture and one material for each generated scene color. I added a small guard in hover handling too: hovering clones only the hovered mesh’s material temporarily, then restores the shared base material, so material sharing doesn’t turn hover into a whole-scene highlight.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
>
> Build is clean. I’m doing a quick diff pass now so I can give you a tight summary and make sure `diagnosis.md` stays out of the picture.
>
> <details><summary>Explored 2 files, ran 2 commands</summary>
>
> <details><summary>Explored 2 files</summary>
>
> - Read `./src/engine/SceneFactory.ts`
> - Read `./src/engine/SelectionManager.ts`
>
> </details>
>
> - Ran `git diff -- src/engine/SceneFactory.ts src/engine/SelectionManager.ts`
>
> - Ran `git status --short`
>
> </details>
>
> Done. `buildScene` now uses a singleton `DataTexture` and shared `MeshStandardMaterial` instances for Scene A and Scene B in [src/engine/SceneFactory.ts](./src/engine/SceneFactory.ts:22). Each generated mesh still gets its own transform/object identity, but no longer allocates its own material and texture.
>
> I also updated hover handling in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:113) so shared materials don’t make every mesh glow at once. It temporarily clones only the hovered mesh material, then restores the shared base material.
>
> Verification: `npm run build` passes. `diagnosis.md` remains untouched and ignored.
</details>

Done. `buildScene` now uses a singleton `DataTexture` and shared `MeshStandardMaterial` instances for Scene A and Scene B in [src/engine/SceneFactory.ts](./src/engine/SceneFactory.ts:22). Each generated mesh still gets its own transform/object identity, but no longer allocates its own material and texture.

I also updated hover handling in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:113) so shared materials don’t make every mesh glow at once. It temporarily clones only the hovered mesh material, then restores the shared base material.

Verification: `npm run build` passes. `diagnosis.md` remains untouched and ignored.

> Scene factory can not be modified, so revert this change

<details><summary>7 previous messages</summary>

> Got it. I’ll revert the material/texture sharing change and the hover workaround that only existed because of shared materials, while preserving the earlier SceneHierarchy render-on-demand work.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./src/engine/SceneFactory.ts` (+3 -8)
> - Wrote `./src/engine/SelectionManager.ts` (+2 -17)
>
> </details>
>
> The SceneFactory edit is reverted, and the hover handler is back to the original per-material mutation style. I’m running the build now to make sure the remaining render-on-demand changes still compile cleanly.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
>
> Build passes after the revert. I’m checking the diff now to confirm `SceneFactory` is clean and only the earlier allowed files remain changed.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `git diff -- src/engine/SelectionManager.ts`
> - Ran `git diff -- src/engine/SceneFactory.ts`
> - Ran `git status --short`
>
> </details>
>
> Reverted the SceneFactory change. [src/engine/SceneFactory.ts](./src/engine/SceneFactory.ts) is back to its original state with no diff.
>
> I also reverted the hover-material workaround that was only needed for shared materials. The remaining `SelectionManager` diff is just the earlier rotation-change event wiring for SceneHierarchy on-demand renders.
>
> Verification: `npm run build` passes.
</details>

Reverted the SceneFactory change. [src/engine/SceneFactory.ts](./src/engine/SceneFactory.ts) is back to its original state with no diff.

I also reverted the hover-material workaround that was only needed for shared materials. The remaining `SelectionManager` diff is just the earlier rotation-change event wiring for SceneHierarchy on-demand renders.

Verification: `npm run build` passes.

> The SelectionManager will keep searching for the intersected objects (besides gizmo rings) during mouse hovering, this happens too frequently. There should be throttle on triggering the intersection by raycaster

<details><summary>9 previous messages</summary>

> I’ll add the throttle inside `SelectionManager`’s hover path, so gizmo dragging and ring hover stay responsive while the heavier scene-object raycast runs at a capped cadence. Then I’ll build to catch any TS issues.
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/SelectionManager.ts`
>
> </details>
>
> I’m going to use a leading-plus-trailing throttle rather than just dropping events. That keeps raycasts capped during motion, but still applies the latest hover position after the interval so the UI doesn’t get stuck on an old object when movement stops.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/SelectionManager.ts` (+41 -4)
>
> </details>
>
> The hover raycast is now throttled to 20 Hz with a trailing update, and the raycaster/vector are reused instead of allocated on every hit test. I’m building next.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
>
> Build passes. I’m doing one quick diff check so I can summarize only the relevant changes and confirm `SceneFactory` stayed untouched.
>
> <details><summary>Explored a file, ran 3 commands</summary>
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/SelectionManager.ts`
>
> </details>
>
> - Ran `git diff -- src/engine/SceneFactory.ts`
>
> - Ran `git status --short`
>
> - Ran `git diff -- src/engine/SelectionManager.ts`
>
> </details>
>
> Implemented hover raycast throttling in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:8).
>
> The scene-object hover intersection now runs at most every `50ms`, with a trailing update using the latest pointer position so hover state still settles correctly when movement stops. I also reused a single `Raycaster` and `Vector2` instead of allocating them on every hover check.
>
> Gizmo ring hover and dragging still run immediately, and click selection still raycasts immediately. `SceneFactory` remains untouched.
>
> Verification: `npm run build` passes.
</details>

Implemented hover raycast throttling in [src/engine/SelectionManager.ts](./src/engine/SelectionManager.ts:8).

The scene-object hover intersection now runs at most every `50ms`, with a trailing update using the latest pointer position so hover state still settles correctly when movement stops. I also reused a single `Raycaster` and `Vector2` instead of allocating them on every hover check.

Gizmo ring hover and dragging still run immediately, and click selection still raycasts immediately. `SceneFactory` remains untouched.

Verification: `npm run build` passes.

> When switching scenes, the objects are only removed from scene not disposed. This would cause memory leak further

<details><summary>11 previous messages</summary>

> I’ll fix this in the engine ownership layer, not `SceneFactory`: when replacing a root, dispose the old object tree’s geometries/materials/textures, and also clean up the generated background texture. I’ll keep it scoped to scene-owned resources so helpers like axes, lights, controls, and gizmos aren’t accidentally torn down during a scene switch.
>
> <details><summary>Explored 2 files, ran a command</summary>
>
> <details><summary>Explored 2 files</summary>
>
> - Read `./src/engine/BackendScene.ts`
> - Read `./src/engine/MiniEngine.ts`
>
> </details>
>
> - Ran `git status --short`
>
> </details>
>
> The leak is in two places: old scene roots are detached but not disposed, and the background `DataTexture` is replaced on every load without disposing the previous one. I’m adding disposal helpers in `MiniEngine` and calling them on scene switch and final engine shutdown.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/MiniEngine.ts` (+40 -2)
>
> </details>
>
> One small robustness pass: even though `SceneFactory` currently creates unique materials/textures, disposal should tolerate shared resources without double-disposing them. I’m tightening the helper with visited sets before building.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/MiniEngine.ts` (+16 -5)
>
> </details>
>
> The disposer now handles shared materials/textures safely too. I’m running the production build to verify the TypeScript side.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
>
> Build passes. I’ll inspect the diff once so I can give you the exact summary and ensure the untouched files stayed that way.
>
> <details><summary>Explored a file, ran 3 commands</summary>
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/MiniEngine.ts`
>
> </details>
>
> - Ran `git diff -- src/engine/MiniEngine.ts`
>
> - Ran `git status --short`
>
> - Ran `git diff -- src/engine/SceneFactory.ts`
>
> </details>
>
> Fixed the scene-switch disposal leak in [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:21).
>
> Now when `loadScene` replaces the current root, the engine clears selection, removes the old root, traverses it, and disposes geometries, materials, and material textures. It also disposes the previous generated scene background texture before assigning a new one. The same cleanup runs during `MiniEngine.dispose()`.
>
> I made the disposer tolerant of shared materials/textures with `Set`s, so it won’t double-dispose resources if sharing is introduced elsewhere later.
>
> Verification: `npm run build` passes. `SceneFactory` is still untouched.
</details>

Fixed the scene-switch disposal leak in [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:21).

Now when `loadScene` replaces the current root, the engine clears selection, removes the old root, traverses it, and disposes geometries, materials, and material textures. It also disposes the previous generated scene background texture before assigning a new one. The same cleanup runs during `MiniEngine.dispose()`.

I made the disposer tolerant of shared materials/textures with `Set`s, so it won’t double-dispose resources if sharing is introduced elsewhere later.

Verification: `npm run build` passes. `SceneFactory` is still untouched.

> we try to make RotationGizmo work, the only functions needs to be implemented are getGizmoOrientation and applyAxisRotation, we implement getGizmoOrientation first, just modify the getGizmoOrientation function
>
> the idea is as follows
> 1. for the world space, the rings of the gizmos should align the world, as the world axes never change, there should be no rotation for gizmo in this case
> 2. for the local space, the rings of the gizmos should align the object itself, the gizmo should have exactly the same world rotation as the object

<details><summary>4 previous messages</summary>

> I’ll keep this surgical and touch only `getGizmoOrientation`: identity quaternion for world space, object world quaternion for local space. Then I’ll run the build.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+2 -1)
>
> </details>
>
> `getGizmoOrientation` is implemented exactly along those two rules. I’m building now to verify the TypeScript path.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Implemented only `getGizmoOrientation` in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:126).

World space now returns identity rotation, so rings align to world axes. Local space returns the object’s world quaternion, so rings align with the object’s current world rotation.

Verification: `npm run build` passes.

> world quaternion is extracted from object world matrix, should I update the worldMatrix of the object first?

Yes, that’s the safe thing to do if there’s any chance the object’s transform or an ancestor’s transform changed earlier in the same tick.

`object.getWorldQuaternion(...)` reads from `matrixWorld`. Three.js usually updates world matrices during render, but gizmo orientation may be queried before the next render pass. So for correctness, use:

```ts
object.updateWorldMatrix(true, false);
return object.getWorldQuaternion(new THREE.Quaternion());
```

`true` updates ancestors too, which matters because local gizmo orientation depends on the object’s full inherited world rotation. `false` avoids recursively updating children, which we don’t need here.

> so update the code

<details><summary>4 previous messages</summary>

> I’ll make that small correction inside `getGizmoOrientation` only: update ancestor/world matrices before reading the object’s world quaternion. Then I’ll build again.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+1 -0)
>
> </details>
>
> The local-space path now refreshes `matrixWorld` before extracting the quaternion. Running the build now.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Updated [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:126).

`getGizmoOrientation` now does:

```ts
if (space === 'world') return new THREE.Quaternion();
object.updateWorldMatrix(true, false);
return object.getWorldQuaternion(new THREE.Quaternion());
```

So local-space gizmo orientation reads from a fresh world matrix, including ancestor transforms.

Verification: `npm run build` passes.

> and then we can implement applyAxisRotation, in order to apply the rotation, we should modify the position and rotation and scale of this object, as these params are in the object's parent space, we should extract the local transformation for this object in its parent first
>
> the idea is as follows
> 1. extract the local transformation for this object in its parent, if it's root node, then the world transformation equals the local transformation
> 2. extract from the local transformation matrix, then update the object's position quaternion and scale
>
> for step 1, object world transformation = object'parent world transformation * object local transformation, so object local transformation = inverse of object'parent world transformation * object world transformation
>
> inverse of object'parent world transformation can be read from parent
> object world transformation can be calculated from angle + worldAxis + pivot
>
> note that worldAxis acts as a rotation axis that must starts in (0,0,0), so the object world transformation is the composition of the following three transformations
> 1. move to (0,0,0) 2. rotate object by angle radians about worldAxis 3. move back

<details><summary>6 previous messages</summary>

> I’ll implement just `applyAxisRotation` using the matrix flow you described: refresh current world matrices, compose the world-space pivot rotation, convert the resulting world matrix back into parent-local space, then decompose into `position`, `quaternion`, and `scale`.
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/RotationGizmo.ts`
>
> </details>
>
> One caveat I’m accounting for: if the object has a parent, we need that parent’s `matrixWorld` refreshed before taking its inverse. For a root object without a parent, the inverse-parent step is just identity.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+22 -1)
>
> </details>
>
> `applyAxisRotation` now follows the parent-local decomposition flow. I’m building now; if TypeScript is happy, I’ll give you the concise summary.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Implemented `applyAxisRotation` in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:132).

It now:

1. Refreshes the object and parent world matrices.
2. Builds the world-space pivot rotation as `T(pivot) * R(axis, angle) * T(-pivot)`.
3. Applies that to the object’s current `matrixWorld`.
4. Converts the result back into parent-local space using `inverse(parent.matrixWorld)`.
5. Decomposes into `object.position`, `object.quaternion`, and `object.scale`.

Verification: `npm run build` passes.

> should check corner cases for parameters

<details><summary>6 previous messages</summary>

> I’ll add defensive checks around the gizmo rotation inputs: finite angle/pivot/axis, non-zero axis, and invertible parent world matrix before decomposing. That keeps malformed drag math from poisoning the object transform with `NaN`s.
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/RotationGizmo.ts`
>
> </details>
>
> The main dangerous cases are a zero-length axis, non-finite values, and a non-invertible parent matrix. I’m keeping the checks inside `applyAxisRotation` so the rest of the gizmo API stays unchanged.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+14 -0)
>
> </details>
>
> The guards are in place. I’m running the build now to make sure the additions are clean.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Added parameter guards in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:132).

`applyAxisRotation` now returns early if:

- `angle` is not finite
- `worldAxis` has non-finite values
- `pivot` has non-finite values
- `worldAxis` is zero length
- the parent world matrix is effectively non-invertible

Verification: `npm run build` passes.

> looking at the updateAxes method, the axes helper always align to the object itself's axis no matter local or world space is selected
>
> 1. local space, fine, remain the same
> 2. world space, align to the world axis that really makes the rotation

<details><summary>4 previous messages</summary>

> I’ll adjust `updateAxes` to mirror the active gizmo space: local uses the object world rotation, world uses identity/world-axis alignment. Then I’ll run the build.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+6 -1)
>
> </details>
>
> `updateAxes` now uses identity rotation in world space and the object’s refreshed world quaternion in local space. I’m building to verify.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Updated [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:95).

`updateAxes` now:

- Uses the object’s world quaternion in `local` space.
- Uses identity quaternion in `world` space, so the axes helper aligns with the world axes that drive rotation.

Verification: `npm run build` passes.

> so in world space, the axis helper and gizmo will never change on ring drag rotation change, however, in local space, these two will change

<details><summary>8 previous messages</summary>

> That’s right: world-space visuals should stay locked to world axes during a drag, while local-space visuals should follow the object as its rotation changes. I’ll update the drag path so the gizmo ring group refreshes its orientation after each applied rotation; in world space that remains identity, in local space it follows the object.
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/RotationGizmo.ts`
>
> </details>
>
> The regular `update()` skips while dragging, which is why the axes helper was updating but the ring group could stay stale. I’m adding a tiny orientation refresh in the drag loop rather than changing the broader update behavior.
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/RotationGizmo.ts`
>
> </details>
>
> I’ll keep the active drag axis/plane as the one chosen at drag start, but refresh the displayed orientation after each rotation. That matches the visual rule without destabilizing the in-progress pointer math.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/RotationGizmo.ts` (+1 -0)
>
> </details>
>
> The ring group now refreshes during drag. In world space this resolves to identity every time; in local space it follows the object rotation. I’m running the build.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
</details>

Updated the drag path in [src/engine/RotationGizmo.ts](./src/engine/RotationGizmo.ts:219).

After each applied ring-drag rotation, the gizmo ring group now refreshes with `getGizmoOrientation(...)`:

- In `world` space, that stays identity, so gizmo and axes remain aligned to world axes.
- In `local` space, it reads the object’s updated world quaternion, so both gizmo and axes follow the object as it rotates.

Verification: `npm run build` passes.

> for the assembly rendering, the file BackendScene.ts can not be modified, so we ensure that build of Assembly Skeleton is corrrect, the problem happens during convention in file CoordinateBridge.ts
>
> By looking at implementation of applyAssembly and readAssembly, I found three mistakes
> 1. The position and rotationDeg data in node data is from local space like Three.js scene, trying to apply the base transformation is only correct for root node not the rest ones
> 2. when applying  base transformation  for root node, we cannot multiply matrix by rotation vector, matrix should only be multiplied by its local matrix (composition of position  + rotation  + scale)
> 3. missing Euler order, should have a default one and enable switching

<details><summary>8 previous messages</summary>

> I’ll inspect `CoordinateBridge.ts` and the call sites, then fix the convention mapping there only. I’ll keep `BackendScene.ts` and `SceneFactory.ts` untouched.
>
> <details><summary>Explored 2 files, a search, ran a command</summary>
>
> <details><summary>Explored 2 files, a search</summary>
>
> - Read `./src/engine/CoordinateBridge.ts`
> - Read `./src/main.tsx`
> - Searched for `Convention|applyAssembly|readAssembly|rotationDeg|Euler` in `src`
>
> </details>
>
> - Ran `git status --short`
>
> </details>
>
> I’m going to rewrite `applyAssembly`/`readAssembly` around local matrices: root gets the convention basis applied to its composed local matrix, descendants use their local node matrix directly. I’ll also add an optional Euler order on `Convention` with `XYZ` as the default so callers can switch later without changing the backend shape.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/CoordinateBridge.ts` (+47 -15)
>
> </details>
>
> The bridge now treats node transforms as local data, applies the basis only at the root, and converts rotations through Euler/quaternion/matrix composition instead of multiplying rotation vectors. I’m building now to catch any typing issues.
>
> <details><summary>Ran a command</summary>
>
> - Ran `npm run build`
>
> </details>
>
> Build is clean. I’m doing a quick diff pass to make sure only `CoordinateBridge.ts` changed for this request and the forbidden files stayed untouched.
>
> <details><summary>Explored a file, ran 3 commands</summary>
>
> - Ran `git diff -- src/engine/CoordinateBridge.ts`
>
> <details><summary>Explored a file</summary>
>
> - Read `./src/engine/CoordinateBridge.ts`
>
> </details>
>
> - Ran `git diff -- src/engine/BackendScene.ts src/engine/SceneFactory.ts`
>
> - Ran `git status --short`
>
> </details>
</details>

Fixed `CoordinateBridge.ts` only. `BackendScene.ts` was not modified.

What changed in [src/engine/CoordinateBridge.ts](./src/engine/CoordinateBridge.ts:11):

- Added optional `Convention.eulerOrder`, defaulting to `XYZ`.
- `applyAssembly` now composes node local transforms from `position + rotationDeg + scale`.
- The convention basis is applied only to the root node.
- Child nodes now keep their backend local transforms directly, matching Three.js parent-local semantics.
- `readAssembly` mirrors that logic: root is converted back through inverse basis, children are read from their local matrices.
- Rotation conversion now goes through Euler/quaternion/matrix composition instead of multiplying a rotation vector by a matrix.

Verification: `npm run build` passes.

> eulerOrder should be independent from convension, and add an extra select to switch order

<details><summary>12 previous messages</summary>

> I’ll split Euler order out of `Convention`, thread it as its own engine setting, and add a separate dropdown in the assembly toolbar to switch it. Then I’ll build to verify the type flow.
>
> <details><summary>Explored 3 files</summary>
>
> - Read `./src/engine/CoordinateBridge.ts`
> - Read `./src/engine/MiniEngine.ts`
> - Read `./src/main.tsx`
>
> </details>
>
> I’m going to make `EulerOrder` a separate setting owned by `MiniEngine`, not a field on `Convention`. The order switch will read the current assembly using the previous order, then reapply using the new order, matching the existing convention-change pattern.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/CoordinateBridge.ts` (+10 -15)
>
> </details>
>
> `CoordinateBridge` now takes Euler order as a separate argument with `XYZ` as the default. Next I’m threading that through the engine and adding the UI select.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/MiniEngine.ts` (+18 -4)
>
> </details>
>
> The engine has an independent `eulerOrder` state and a `setEulerOrder` method now. I’m adding the dropdown in the assembly controls next.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/main.tsx` (+15 -1)
>
> </details>
>
> The UI now has a third assembly-only select for Euler order. I’m checking references and building, since this touched the type contract across three files.
>
> <details><summary>Explored a search, ran a command</summary>
>
> <details><summary>Explored a search</summary>
>
> - Searched for `eulerOrder|EulerOrder|applyAssembly\(|readAssembly\(|setEulerOrder` in `src`
>
> </details>
>
> - Ran `npm run build`
>
> </details>
>
> Build passes. I’m doing one diff check now so the final note can be precise about what changed.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `git diff -- src/engine/CoordinateBridge.ts src/engine/MiniEngine.ts src/main.tsx`
> - Ran `git diff -- src/engine/BackendScene.ts src/engine/SceneFactory.ts`
> - Ran `git status --short`
>
> </details>
</details>

Done. Euler order is now independent from `Convention`.

Changes:
- [src/engine/CoordinateBridge.ts](./src/engine/CoordinateBridge.ts:11) exports `EulerOrder`, but `Convention` is back to only `up` and `handed`.
- `applyAssembly` and `readAssembly` now accept Euler order as a separate optional argument, defaulting to `XYZ`.
- [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:96) owns `eulerOrder` separately and exposes `setEulerOrder(...)`.
- [src/main.tsx](./src/main.tsx:90) adds a separate assembly-only select for all six Euler orders: `XYZ`, `XZY`, `YXZ`, `YZX`, `ZXY`, `ZYX`.

Verification: `npm run build` passes. `BackendScene.ts` and `SceneFactory.ts` remain untouched.

> just remove switch order, use a default one in code and disable change

<details><summary>12 previous messages</summary>

> I’ll remove the Euler order dropdown and the engine-level switching method, while keeping a fixed default order inside the bridge. That gives the conversion code a single source of truth without exposing runtime changes.
>
> <details><summary>Explored 3 files</summary>
>
> - Read `./src/engine/MiniEngine.ts`
> - Read `./src/engine/CoordinateBridge.ts`
> - Read `./src/main.tsx`
>
> </details>
>
> I see the current engine default is `XZY`, so I’ll preserve that as the fixed code default rather than silently changing behavior. I’m moving that into `CoordinateBridge` as a constant and removing all runtime/UI switching.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/CoordinateBridge.ts` (+3 -2)
>
> </details>
>
> The fixed Euler order constant is in place. Next I’m removing the engine setter/state and the extra dropdown wiring from the React app.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/engine/MiniEngine.ts` (+4 -18)
>
> </details>
>
> The engine no longer exposes Euler-order switching. I’m removing the select and related React state now.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./src/main.tsx` (+1 -15)
>
> </details>
>
> The UI switch is gone. I’m running reference checks and the build to make sure there are no stale `setEulerOrder` or `EulerOrder` imports left.
>
> <details><summary>Explored a search, ran a command</summary>
>
> <details><summary>Explored a search</summary>
>
> - Searched for `setEulerOrder|eulerOrder|EulerOrder|DEFAULT_EULER_ORDER` in `src`
>
> </details>
>
> - Ran `npm run build`
>
> </details>
>
> Build passes. I’m doing one final diff pass so I can summarize the cleanup cleanly.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `git status --short`
> - Ran `git diff -- src/engine/CoordinateBridge.ts src/engine/MiniEngine.ts src/main.tsx`
>
> </details>
</details>

Removed the Euler order switch and runtime changing.

Now [src/engine/CoordinateBridge.ts](./src/engine/CoordinateBridge.ts:11) defines a fixed `DEFAULT_EULER_ORDER = 'XZY'`, and `applyAssembly` / `readAssembly` use that by default. [src/engine/MiniEngine.ts](./src/engine/MiniEngine.ts:7) imports that constant when applying/reading assembly transforms.

I also removed the extra select and React state from `main.tsx`, so there’s no UI path to change order anymore.

Verification: `npm run build` passes.
