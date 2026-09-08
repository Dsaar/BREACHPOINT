'use client';
import { useEffect, useRef, useState } from 'react';
import { Game, type GameState } from '../lib/game/Game';
export default function Home() {
  const mount = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [validation, setValidation] = useState<string>('');
  const [s, set] = useState<GameState>({
    loaded: false,
    active: false,
    fps: 0,
  });
  useEffect(() => {
    const g = new Game(mount.current!, (v) =>
      set((p) => ({
        ...p,
        ...v,
        qa: new URLSearchParams(location.search).has('validate'),
      })),
    );
    game.current = g;
    const lifecycle = new AbortController();
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => unknown;
        };
      }
    ).modelContext;
    if (context)
      try {
        Promise.resolve(
          context.registerTool(
            {
              name: 'read_operation',
              description:
                'Read current mission, health, ammunition and enemies remaining.',
              inputSchema: {
                type: 'object',
                properties: {},
                additionalProperties: false,
              },
              annotations: { readOnlyHint: true },
              execute: () => ({
                loaded: g.loaded,
                active: g.active,
                health: g.health,
                ammo: g.weapon.ammo,
                enemies: g.enemies?.alive,
                outcome: g.ended,
              }),
            },
            { signal: lifecycle.signal },
          ),
        ).catch(() => {});
      } catch {}
    return () => {
      lifecycle.abort();
      g.dispose();
    };
  }, []);
  return (
    <main>
      {s.qa && (
        <aside className="validation">
          <button
            disabled={!s.loaded}
            onClick={async () => {
              try {
                const { validateGame } = await import('../tests/in-browser');
                setValidation(
                  JSON.stringify(validateGame(game.current!), null, 2),
                );
              } catch (e) {
                setValidation(String(e));
              }
            }}
          >
            Run integration validation
          </button>
          <pre>{validation}</pre>
        </aside>
      )}
      <div ref={mount} className="world" />
      <div className="damage-overlay" />
      <div className="vignette" />
      {!s.active && (
        <header>
          <b>
            BREACH<span>POINT</span>
          </b>
          <div>
            BLACK TIDE <em>/</em> OPERATIONS
          </div>
          <small>{s.fps} FPS</small>
        </header>
      )}
      <div className="objective">
        <span className="eyebrow">OPERATION 01</span>
        <h3>BLACK TIDE</h3>
        <p>
          {s.enemies === 0
            ? 'Reach the marked extraction zone'
            : `Clear the relay station · ${s.kills ?? 0} / 6`}
        </p>
      </div>
      {!s.active && (
        <section className="menu">
          <span className="eyebrow">RELAY STATION // 04:38 HRS</span>
          <h1>
            {s.ended ? (
              <>
                {s.ended === 'STATION SECURED' ? 'STATION' : 'OPERATOR'}
                <br />
                <span>
                  {s.ended === 'STATION SECURED' ? 'SECURED.' : 'DOWN.'}
                </span>
              </>
            ) : (
              <>
                BREAK THE
                <br />
                <span>SILENCE.</span>
              </>
            )}
          </h1>
          <p>
            {s.ended
              ? `${s.kills} hostiles neutralized · ${s.time}s in the field`
              : 'A hostile relay. One way through.'}
            <br />
            {s.ended
              ? 'Deploy again to begin a new operation.'
              : 'Clear the station and reach extraction.'}
          </p>
          <button
            onClick={() => void game.current?.start()}
            disabled={!s.loaded}
          >
            {s.error ||
              (!s.loaded
                ? 'LOADING EQUIPMENT…'
                : s.ended
                  ? 'REDEPLOY'
                  : s.notice
                    ? 'RESUME OPERATION'
                    : 'DEPLOY TO STATION')}{' '}
            <span>↗</span>
          </button>
          <div className="controls">
            <span>
              W A S D / ↑ ↓ ← → <i>MOVE</i>
            </span>
            <span>
              SHIFT <i>SPRINT</i>
            </span>
            <span>
              MOUSE <i>LOOK</i>
            </span>
            <span>
              V <i>OPERATOR VIEW</i>
            </span>
            <span>
              LMB <i>FIRE</i>
            </span>
            <span>
              RMB <i>AIM</i>
            </span>
            <span>
              R <i>RELOAD</i>
            </span>
            <span>
              1 / 2 <i>WEAPON</i>
            </span>
            <span>
              SPACE <i>JUMP</i>
            </span>
            <span>
              M <i>MUTE</i>
            </span>
            <span>
              ESC <i>PAUSE</i>
            </span>
          </div>
        </section>
      )}
      <p className="notice">{s.notice}</p>
      <div className="crosshair" hidden={!s.active}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <footer>
        <div>
          <span className="eyebrow">OPERATOR / 01</span>
          <strong>
            {s.health ?? 100} <small>HEALTH</small>
          </strong>
          <div
            className="healthbar"
            style={{ width: `${(s.health ?? 100) * 1.6}px` }}
          />
        </div>
        <div className="sector">
          SECTOR 07 <span>•</span> NORTH DOCK
        </div>
        <div>
          <span className="eyebrow">{s.weapon || 'CAR / SMG'}</span>
          <strong>
            {String(s.ammo ?? 30).padStart(2, '0')}{' '}
            <small>/ {s.reserve ?? 150}</small>
          </strong>
          <span className="eyebrow">
            {s.reloading ? 'RELOADING…' : s.state}
          </span>
        </div>
      </footer>
      <a
        className="credit"
        href="https://sketchfab.com/3d-models/soldier-glb-3-0edc19e9d55040f6b1cbbbc8f98bb6b9"
        target="_blank"
        rel="noreferrer"
      >
        Soldier: pierson3972 · CC BY 4.0
      </a>
    </main>
  );
}
