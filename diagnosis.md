# Diagnosis note

## Part 1
* Low frame rate performance issue can be caused on both React and 3D side.
* Initial Scene
  * **Issue**
    * Loading scene, performing dragging, always low frame rate (red)
  * **React side reasons and solutions**
    1. The Hierarchy component doesn't render on demand (just `forceRender` every 60ms, not necessary and acceptable), re-render should only happen when initial loading, selection changed and object rotation changed.
    2. Side effects are not cleared for unsubscribe, should add unsubscribe listeners.
  * **3D side reasons and solutions**
    1. Scene A and Scene B are constructed via `buildScene`, this method creates a new material and a new texture for each sphere. We should just create one material along with a texture, and shared between all spheres. (Scene Factory is not editable, so we drop this).
  * **Before & After**
    * Before: around 30 ~ 40 fps
    * After: around 120 fps
* Object picking
  * **Issue**
    * When hovering over the objects in the scene, the frame rate drops dramatically
  * **3D side reasons and solutions**
    1. The SelectionManager will keep searching for the intersected objects (besides gizmo rings) during mouse hovering, this happens too frequently. There should be throttle on triggering the intersection by raycaster.
  * **Before & After**
    * Before: not stable, often get down to 30 or even lower when hovering
    * After: normally around or above 100 fps
* Potential risk
  * **Issue**
    * When switching between scenes, objects and resources are only removed not disposed. 
  * **Solution**
    * Perform disposing on scene switch and engine close



## Part 2
### 2.a
* **Idea for implementation of getGizmoOrientation**
  1. for the world space, the rings of the gizmos should align the world, as the world axes never change, there should be no rotation for gizmo in this case
  2. for the local space, the rings of the gizmos should align the object itself, the gizmo should have exactly the same world rotation as the object

* **Idea for implementation of applyAxisRotation**
  1. In order to apply the rotation, we should modify the position and rotation and scale of this object, as these params are in the object's parent space, we should extract the local transformation for this object in its parent first.
    * `object world transformation = object's parent world transformation * object local transformation`
    * so `object local transformation = inverse of object's parent world transformation * object world transformation`
    * inverse of object's parent world transformation - just read from object's parent matrixWorld and do the inversion
    * object world transformation - calculated from angle + worldAxis + pivot
      * note that worldAxis acts as a rotation axis that must starts in (0,0,0), so the object world transformation is the composition of the following three transformations
        1. move to (0,0,0)
        2. rotate object by angle radians about worldAxis
        3. move back according to pivot
  2. Extract the local transformation for this object in its parent, if it's root node, then the world transformation equals the local transformation
  3. Extract the object's position, quaternion and scale from the local transformation matrix, then update them to perform actual rotation. 


### 2.b
* **Improvement 1**
  * Issue
    * The axes helper always align to the object itself's axis no matter what mode (local or world space) is selected
  * Solution
    * local space, fine, remain the same
    * world space, align to the world axis that really makes the rotation
  * Code
    ```typescript
    private updateAxes(): void {
      const obj = this.object;
      if (!obj) return;
      if (this.space === 'world') {
        this._q.identity();
      } else {
        obj.updateWorldMatrix(true, false);
        obj.getWorldQuaternion(this._q);
      }
      this.axes.position.copy(this.center);
      this.axes.quaternion.copy(this._q);
    }
    ```
* **Improvement 2**
  * Issue
    * The gizmo does not sync to the realtime state when dragging
  * Solution
    * Add rings quaternion sync in drag callback
  * Code
    ```typescript
    this.group.quaternion.copy(this.getGizmoOrientation(this.object, this.space));
    ```


## Part 3
* Standard of correct conversion
  * No obvious separate nodes that should be connected
  * Correct foot direction
  * Correct eyes, nose position
* Reason for original issue
  1. The position and rotationDeg data in node data is from local space like Three.js scene, trying to apply the base transformation of convention is only correct for root node not the rest ones
  2. When applying base transformation of convention for root node, we cannot multiply matrix by rotation vector (not meaningful), base transformation matrix should only be multiplied by the root's local matrix (composition of position + rotation + scale)
  3. Missing Euler order, should check behaviors of each order
* Solution
  * readAssembly (from frontend view to backend data)
    * Decompose position and rotation from local matrix
      * root: eliminate base (convention) transformation from obj.matrixWorld by pre-multiply inversion matrix of base (convention) transformation matrix
      * not root: just read obj.matrix
    * Save position and rotation to backend
  * applyAssembly (from backend data to frontend view)
    * Compose local matrix from position and rotation in backend data
      * root: compose + pre-multiply base (convention) transformation matrix
      * not root: just compose
    * Update view according to the decomposition of local matrix
* Results on different Euler orders after solving the issues above
  * XYZ: wrong foot
  * XZY: wrong foot
  * YXZ: wrong foot
  * YZX: work properly
  * ZXY: work properly
  * ZYX: work properly