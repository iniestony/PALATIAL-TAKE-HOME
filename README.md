# PALATIAL TAKE HOME

**Timebox: 3–4 hours.** It's fine to not finish everything — we care more about how you reason than about volume; if you run out of time, tell us where you'd take it next. Use any tools you like, including AI assistants (see **Submission** at the bottom).

## Ground rules — what you may and may not touch

The codebase is small (everything is in `src/`). Some files and parts of files must
not be modified** — each is banner-marked `DO NOT MODIFY` at the top:

Work freely in everything else — but **solve with what's already here (three.js + React); do not
add new dependencies at all**

## Part 1 — Diagnose and fix

Run it, find the performance issues, and fix them. There may be more than one root cause behind a
single symptom. Every functionality should run buttery smooth (100+ fps) even extending beyond this artificial scenario.
Fixing the frame rate must not regress any behavior — anything that updates live today must still update live.

## Part 2 — Feature: finish the rotation gizmo, then make it good

Selecting a part shows a wireframe box plus a **rotation gizmo** — three colored rings
(red = X, green = Y, blue = Z). Dragging a ring should rotate the selected object about that
axis. A toolbar button toggles the gizmo between **Local** and **World** space.

### 2a — Correct behavior

The gizmo's rings, picking, and the drag→angle math are already done. Two functions are
left for you in [`src/engine/RotationGizmo.ts`](src/engine/RotationGizmo.ts) — both
marked with `// IMPLEMENT ME`:

- `getGizmoOrientation(object, space)` — the orientation the rings should use.
- `applyAxisRotation(object, angle, worldAxis, pivot)` — apply the rotation.

Requirements:

1. **Local** space: rings line up with the object's **own** axes (correct color per axis).
   **World** space: rings line up with the world axes.
2. Dragging a ring rotates about that axis, **pivoting around the gizmo's center** — the part
   must spin *in place*, not orbit the pivot.
3. **It must hold for any object in the tree, at any depth** — not just top-level ones.
   Whatever transforms the scene puts on a part's parents, the gizmo must stay correct.
   (Select nodes at different depths; try both spaces.)

### 2b — Make it a gizmo you'd actually want to use (open-ended)

What you just got working is the **bare minimum** — three rings that rotate, and little else. Next
to a rotation gizmo you'd genuinely want to use (think the manipulators in Blender, Unity, etc...),
it's missing a *lot*. The headroom here is large, across both **how it looks** and **how it feels to
use** — precision, feedback while you drag, discoverability, handling of awkward viewing angles,
polish, and more. Don't read that as a checklist; the point is only that there's plenty worth
improving and you shouldn't struggle to find it.

So take it further, and make deliberate choices about what matters most. For this part the **whole
`RotationGizmo.ts` file is yours**, not just the two hooks (keep the 2a rotation behavior correct,
and don't regress performance).

We grade **judgment and execution, not feature count**: a couple of well-chosen, well-executed,
coherent improvements that make it feel like a *designed tool* beat a pile of half-finished ones.
If you run low on time, ship what you can and **tell us what you'd prioritize next and why** — that
reasoning counts as much as the code.

## Part 3 — Coordinate roundtrip (backend ⇄ viewer)

Click **Load Assembly**. The scene is a small **assembly** described by a backend payload
(`BackendScene.ts`, a nested hierarchy) and placed in the viewport by the conversions in
[`src/engine/CoordinateBridge.ts`](src/engine/CoordinateBridge.ts). **They are not correct** —
the assembly comes out wrong. Fix the conversion so the assembly looks right.

The backend convention: **Z-up, right-handed**, with rotations as Euler angles in **degrees**. The
Euler **order was never documented** — it's one of the standard orders, and **which one is part of
what you have to work out** by getting the assembly to look right. How the convention maps into the
viewer is likewise yours to determine.

The viewer has its own working convention — **up axis** (±X / ±Y / ±Z) and **handedness** —
changeable with the dropdowns. It is live state (`engine.convention`), handed to the conversions
as `conv`. Your conversion must be right for **whatever the viewer is set to**, not just the
default.

There is no readout and no "expected" data to compare against. Placed correctly, the parts assemble into a **coherent,
natural-looking shape** that holds together from every angle.
When the conversion is wrong it's obvious on sight: parts flung off or detached, the whole thing
tipped over or lying down, or the shape **flipping into a mirror
image of itself** as you change convention.

Changing the viewer convention **round-trips the assembly through the backend** (it serializes in
the current convention and rebuilds in the new one), so it must stay the **same object** — not a
tipped, twisted, or mirrored version of it — as you switch **every** up axis and both handedness.
That exercises *both* conversion directions.

## Deliverables

1. **Your code changes.**
2. **A short written diagnosis** (~1 page): for each Part 1 complaint, what was actually
   happening and why, with the before/after you observed. Note anything you
   ruled out. For Part 2, a sentence on why your gizmo math is correct in all cases, plus —
   if you did 2b — what you chose to improve and why (and what you'd do next). For
   Part 3, why your conversion is correct for every viewer convention (and what was wrong
   with the original).

We're not looking for a rewrite of the engine. We're looking for the right, minimal
changes and a clear explanation of *why*.

## Submission

**Email your solution** — a link to a private repo, or a zip — directly to
**alex@palatial.cloud**, **krish@palatial.cloud**, **anurag@palatial.cloud**.

**AI usage:** using AI assistants is allowed and expected. **If you used any, export the full
chat session(s) and attach them** (a file or a link is fine). We're genuinely interested in
*how* you used them and how you reasoned about their output — it helps us understand your
thinking, not penalize the use.
