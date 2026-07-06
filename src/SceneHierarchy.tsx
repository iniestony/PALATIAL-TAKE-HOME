// ============================================================================
//  EDITABLE.
// ============================================================================
import React, { useState, useEffect, useReducer, useRef } from 'react';
import * as THREE from 'three';
import type { MiniEngine } from './engine/MiniEngine';

interface Props {
  engine: MiniEngine;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const DEG = 180 / Math.PI;

export const SceneHierarchy: React.FC<Props> = ({ engine }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onSelectionChanged = (obj: THREE.Object3D | null) => {
      setSelectedId(obj ? obj.id : null);
    };
    const onHierarchyInvalidated = () => {
      forceRender();
    };

    engine.events.subscribe('selection_changed', onSelectionChanged);
    engine.events.subscribe('scene_loaded', onHierarchyInvalidated);
    engine.events.subscribe('object_rotation_changed', onHierarchyInvalidated);

    return () => {
      engine.events.unsubscribe('selection_changed', onSelectionChanged);
      engine.events.unsubscribe('scene_loaded', onHierarchyInvalidated);
      engine.events.unsubscribe('object_rotation_changed', onHierarchyInvalidated);
    };
  }, [engine]);

  // scroll the selected row into view when selection changes (e.g. clicking a part in the 3D scene)
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const root = engine.root;
  const items: { obj: THREE.Object3D; depth: number }[] = [];
  const walk = (obj: THREE.Object3D, depth: number) => {
    items.push({ obj, depth });
    for (const child of obj.children) walk(child, depth + 1);
  };
  if (root) walk(root, 0);

  return (
    <div className="outliner">
      <div className="outliner-title">Scene Hierarchy</div>
      {items.map(({ obj, depth }) => {
        obj.getWorldQuaternion(_q);
        _e.setFromQuaternion(_q);
        return (
          <div
            key={obj.id}
            ref={obj.id === selectedId ? activeRowRef : undefined}
            className={'row' + (obj.id === selectedId ? ' active' : '')}
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => engine.selection.select(obj)}
          >
            <span className="row-name">{obj.name || obj.type}</span>
            <span className="row-x">
              {(_e.x * DEG).toFixed(0)}, {(_e.y * DEG).toFixed(0)}, {(_e.z * DEG).toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
