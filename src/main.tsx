// ============================================================================
//  DO NOT MODIFY.
// ============================================================================
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { MiniEngine, type SceneName } from './engine/MiniEngine';
import type { Up, Handed } from './engine/CoordinateBridge';
import { SceneHierarchy } from './SceneHierarchy';
import './styles.css';

const StatsPanel: React.FC<{ engine: MiniEngine }> = ({ engine }) => {
  const [, bump] = useState(0);
  useEffect(() => {
    const id = setInterval(() => bump((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="stats">
      <div className="stats-row">
        <span>Engine FPS</span>
        <b className={engine.fps < 50 ? 'bad' : 'good'}>{engine.fps}</b>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MiniEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [scene, setScene] = useState<SceneName>('A');
  const [space, setSpace] = useState<'local' | 'world'>('local');
  const [up, setUp] = useState<Up>('y');
  const [handed, setHanded] = useState<Handed>('right');

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new MiniEngine(canvasRef.current);
    engineRef.current = engine;
    engine.loadScene('A');
    setReady(true);
    return () => engine.dispose();
  }, []);

  const load = (name: SceneName) => {
    engineRef.current?.loadScene(name);
    setScene(name);
  };

  const toggleSpace = () => {
    const next = space === 'local' ? 'world' : 'local';
    engineRef.current?.selection.setGizmoSpace(next);
    setSpace(next);
  };

  const setConvention = (nextUp: Up, nextHanded: Handed) => {
    setUp(nextUp);
    setHanded(nextHanded);
    engineRef.current?.setConvention({ up: nextUp, handed: nextHanded });
  };

  return (
    <div className="app">
      <div className="viewport">
        <canvas ref={canvasRef} className="canvas" />
        <div className="toolbar">
          <button onClick={() => load('A')} className={scene === 'A' ? 'on' : ''}>Load Scene A</button>
          <button onClick={() => load('B')} className={scene === 'B' ? 'on' : ''}>Load Scene B</button>
          <button onClick={() => load('coords')} className={scene === 'coords' ? 'on' : ''}>Load Assembly</button>
        </div>
        <div className="toolbar toolbar-2">
          <button onClick={toggleSpace}>Space: {space === 'local' ? 'Local' : 'World'}</button>
          {scene === 'coords' && (
            <>
              <select value={up} onChange={(e) => setConvention(e.target.value as Up, handed)}>
                <option value="x">X-up</option>
                <option value="y">Y-up</option>
                <option value="z">Z-up</option>
                <option value="-x">−X-up</option>
                <option value="-y">−Y-up</option>
                <option value="-z">−Z-up</option>
              </select>
              <select value={handed} onChange={(e) => setConvention(up, e.target.value as Handed)}>
                <option value="right">Right-handed</option>
                <option value="left">Left-handed</option>
              </select>
            </>
          )}
        </div>
      </div>
      <div className="sidebar">
        {ready && engineRef.current && (
          <>
            <SceneHierarchy key={scene} engine={engineRef.current} />
            <StatsPanel engine={engineRef.current} />
          </>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
