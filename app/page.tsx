'use client';
import { useEffect, useRef, useState } from 'react';
import { Game, type GameState } from '../lib/game/Game';
import { campaign, missionById } from '../lib/game/Campaign';
import {
  CampaignProgress,
  LocalProgressStore,
  normalizeProgress,
  type Progress,
} from '../lib/game/CampaignProgress';
export default function Home() {
  const progressService = useRef<CampaignProgress | null>(null);
  const [progress, setProgress] = useState<Progress>(normalizeProgress(null));
  const [saveWarning, setSaveWarning] = useState('');
  const [selected, setSelected] = useState(1);
  const [campaignMenu, setCampaignMenu] = useState(true);
  const mission = missionById(selected);
  const chooseMission = (id: number) => {
    const service = progressService.current;
    if (!service?.canLaunch(id)) return;
    setProgress(service.launch(id));
    setSaveWarning(service.warning);
    if (id !== selected) set({ loaded: false, active: false, fps: 0 });
    setSelected(id);
    setCampaignMenu(false);
    if (id === selected && game.current?.ended) game.current.reset();
  };
  useEffect(() => {
    const service = new CampaignProgress(new LocalProgressStore());
    progressService.current = service;
    queueMicrotask(() => {
      setProgress(service.value);
      setSaveWarning(service.warning);
      setSelected(service.value.lastPlayed);
    });
  }, []);
  const mount = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [gripViews, setGripViews] = useState<string[]>([]);
  const [validation, setValidation] = useState<string>('');
  const [s, set] = useState<GameState>({
    loaded: false,
    active: false,
    fps: 0,
  });
  useEffect(() => {
    let live = true;
    const g = new Game(
      mount.current!,
      (v) =>
        live &&
        set((p) => ({
          ...p,
          ...v,
          qa: new URLSearchParams(location.search).has('validate'),
        })),
      missionById(selected),
      (id) => {
        const service = progressService.current;
        if (!service || !live) return;
        setProgress(service.complete(id));
        setSaveWarning(service.warning);
      },
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
                mission: g.mission.title,
                objective: g.director.objective.title,
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
      live = false;
      lifecycle.abort();
      g.dispose();
    };
  }, [selected]);
  return (
    <main>
      {s.qa && (
        <aside className="validation">
          <button
            disabled={!s.loaded || selected !== 1}
            title="Run the baseline mechanics checks from Mission 01"
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
          <button
            disabled={!s.loaded}
            onClick={async () => {
              const { inspectEnemyGrip } = await import('../tests/in-browser');
              setGripViews(inspectEnemyGrip(game.current!));
            }}
          >
            Inspect enemy grip
          </button>
          <button
            disabled={!s.loaded}
            onClick={async () => {
              game.current?.blur();
              try {
                const { validateCampaign } =
                  await import('../tests/campaign-browser');
                const result = await validateCampaign(setValidation);
                setValidation(
                  JSON.stringify(
                    { passed: result.checks.length, checks: result.checks },
                    null,
                    2,
                  ),
                );
                setGripViews(result.snapshots);
              } catch (error) {
                setValidation(String(error));
              }
            }}
          >
            Run campaign validation
          </button>
          {gripViews.map((src, i) => (
            // oxlint-disable-next-line next/no-img-element -- QA snapshots are generated canvas data URLs.
            <img
              key={i}
              src={src}
              alt={`Validation view ${i + 1}`}
              style={{ width: 'min(70vw, 900px)', display: 'block' }}
            />
          ))}
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
      {s.active && (
        <div className="objective">
          <span className="eyebrow">
            MISSION {String(selected).padStart(2, '0')} / {s.objectiveStep ?? 1}{' '}
            OF {mission.objectives.length}
          </span>
          <h3>{mission.title}</h3>
          <p>
            <span
              aria-hidden="true"
              className="objective-bearing"
              style={{ transform: `rotate(${s.objectiveBearing ?? 0}deg)` }}
            >
              ↑
            </span>{' '}
            {s.objective} · {s.objectiveDistance ?? '—'}m
          </p>
          {!!s.objectiveSeconds && (
            <progress
              aria-label="Objective progress"
              value={s.objectiveProgress ?? 0}
              max={s.objectiveSeconds}
            />
          )}
          <p>{s.prompt}</p>
          <span className="eyebrow">
            {s.enemies ?? 0} HOSTILES IN ACTIVE ENCOUNTER
          </span>
        </div>
      )}
      {!s.active && campaignMenu && (
        <section className="campaign-menu">
          <div className="campaign-heading">
            <div>
              <span className="eyebrow">SINGLE PLAYER / SIX CHAPTERS</span>
              <h1>
                BLACK TIDE<span>.</span>
              </h1>
            </div>
            <p>
              {progress.campaignCompleted
                ? 'CAMPAIGN COMPLETE'
                : `${progress.completed.length} / ${campaign.length} CHAPTERS COMPLETE`}
              <br />
              <small>Progress saved on this device</small>
            </p>
          </div>
          <div className="mission-grid">
            {campaign.map((entry) => {
              const locked = entry.id > progress.highestUnlocked;
              const complete = progress.completed.includes(entry.id);
              return (
                <button
                  aria-label={`Mission ${entry.id}: ${entry.title}${locked ? ' — locked' : ''}`}
                  key={entry.id}
                  className={`mission-card map-${entry.map}`}
                  disabled={locked}
                  onClick={() => chooseMission(entry.id)}
                  style={
                    { '--mission-color': entry.color } as React.CSSProperties
                  }
                >
                  <div className="map-preview" aria-hidden="true">
                    <span className="map-landmark" />
                    <b>{String(entry.id).padStart(2, '0')}</b>
                    <small>{entry.location}</small>
                  </div>
                  <div className="mission-card-body">
                    <span className="eyebrow">
                      MISSION {String(entry.id).padStart(2, '0')}{' '}
                      {complete ? ' / COMPLETE ✓' : ''}
                    </span>
                    <h2>{entry.title}</h2>
                    <p>{entry.description}</p>
                    <strong>
                      {locked
                        ? `🔒 Complete Mission ${String(entry.id - 1).padStart(2, '0')} to unlock`
                        : complete
                          ? 'REPLAY MISSION ↗'
                          : 'AVAILABLE / VIEW BRIEFING ↗'}
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>
          {saveWarning && (
            <output className="save-warning">{saveWarning}</output>
          )}
        </section>
      )}
      {!s.active && !campaignMenu && (
        <section className="menu briefing-menu">
          <span className="eyebrow">
            MISSION {String(selected).padStart(2, '0')} / {mission.location}
          </span>
          <h1>
            {s.ended ? (
              s.ended === 'MISSION COMPLETE' ? (
                <>
                  MISSION
                  <br />
                  <span>COMPLETE.</span>
                </>
              ) : (
                <>
                  OPERATOR
                  <br />
                  <span>DOWN.</span>
                </>
              )
            ) : (
              <>
                {mission.title}
                <span>.</span>
              </>
            )}
          </h1>
          <p>
            {s.ended === 'MISSION COMPLETE'
              ? mission.debrief
              : s.ended
                ? 'The signal is still spreading. Return to the insertion point and try again.'
                : mission.briefing}
          </p>
          {s.ended && (
            <p>
              {s.kills} hostiles neutralized · {s.time}s in the field
            </p>
          )}
          {s.ended === 'MISSION COMPLETE' && selected < campaign.length ? (
            <button onClick={() => chooseMission(selected + 1)}>
              CONTINUE TO MISSION {String(selected + 1).padStart(2, '0')}{' '}
              <span>↗</span>
            </button>
          ) : s.ended === 'MISSION COMPLETE' ? (
            <p className="campaign-victory">
              BLACK TIDE COMPLETE / Nacre is free.
            </p>
          ) : null}
          <button
            onClick={() => {
              if (progressService.current?.canLaunch(selected))
                void game.current?.start();
            }}
            disabled={!s.loaded || !!s.error}
          >
            {s.error ||
              (!s.loaded
                ? 'LOADING EQUIPMENT…'
                : s.ended
                  ? 'REPLAY MISSION'
                  : s.deployed
                    ? 'RESUME MISSION'
                    : 'DEPLOY')}{' '}
            <span>↗</span>
          </button>
          <button
            className="secondary-button"
            onClick={() => setCampaignMenu(true)}
          >
            CAMPAIGN SELECT
          </button>
          {saveWarning && (
            <output className="save-warning">{saveWarning}</output>
          )}
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
              E <i>HOLD TO INTERACT</i>
            </span>
            <span>
              ESC <i>PAUSE</i>
            </span>
          </div>
        </section>
      )}
      {s.active && s.radio && (
        <aside className="radio" aria-live="polite">
          <span className="eyebrow">
            {s.intel ? 'FIELD RECORD / RADIO' : 'COMMS / LIVE'}
          </span>
          <p>{s.radio}</p>
        </aside>
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
        <div className="sector">{mission.location}</div>
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
