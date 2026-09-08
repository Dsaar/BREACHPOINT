# BREACHPOINT — Black Tide

An original, single-player Three.js FPS vertical slice set in a coastal relay station. Clear six hostile operators and reach the marked northern extraction zone. Desktop keyboard and mouse required.

## Run

- `npm install`
- `npm run dev` — development server, normally http://localhost:3000
- `npm run build` — production build
- `npm run start -- --port 4173` — production preview
- `npm test` — controller, weapon and enemy tests
- `npm run typecheck`
- `npm run lint` — project-authored application and tests (generated, unused shadcn components are excluded)

Append `?validate=1` to either server URL and click **Run integration validation** to run 21 checks against the actual loaded Soldier and game systems. This explicitly resets the current operation. The normal game has no validation panel.

## Controls

WASD or arrows move relative to the camera; mouse looks; Shift sprints; Space jumps; left mouse fires; right mouse aims; R reloads; 1/2 switches weapons; V switches first/third person; M mutes; Escape pauses. A browser that rejects pointer lock can use drag-to-look. Losing window focus pauses combat.

## Implementation

The repository was empty on initial inspection. The project uses React 19.2.6, Vinext/Vite, TypeScript and Three.js 0.183.2. No existing gameplay was replaced.

- `CharacterController.ts`: movement, collision, gravity, landing, smooth rotation, animation state and crossfades. The supplied Soldier is the actual playable character. First-person material clipping retains its lower body and full shadow; third person and the deployment screen show the complete model.
- `Environment.ts`: three-lane industrial compound, service interior, cover, instanced structural detail, textured surfaces, practical lighting, fog and sky.
- `Weapon.ts`: original carbine/sidearm geometry, aiming, fire rate, independent ammunition, timed reload, recoil and synthesized audio.
- `Enemies.ts`: six skeletal Soldier instances, patrol, investigation, cached line of sight, grid navigation, combat reaction delay, cover seeking, damage and collapse death.
- `Effects.ts`: pooled sparks, tracers, smoke sprites and brass shell ejection.
- `Game.ts`: rendering, camera, input lifecycle, shooting, health, explosive barrels, victory/defeat/reset and performance telemetry.

The uploaded file contains one 2.2-second `mixamo.com` ready/idle animation, not separate Idle/Walk/Run clips. Its idle is retained; Walk and Run are generated skeletal clips with blended transitions and foot grounding. These are not motion-captured locomotion assets. See [CREDITS.md](CREDITS.md).

The browser asset is `public/models/Soldier.glb`. Its original geometry and skeleton remain. Legacy specular/glossiness materials were adapted, and embedded textures capped at 1024 pixels. `scripts/prepare-soldier.mjs` reproduces the conversion from the supplied source file. The original outside the repository was not changed.

## Validation record

Development and production builds were launched and inspected in Chrome. Both servers returned HTTP 200 for the complete 15,071,744-byte Soldier GLB. All 21 browser integration checks passed on both builds. Node gameplay tests, TypeScript and authored-source lint passed. Final production inspection showed no new browser errors or GLTF warnings.

The integration checks cover actual skinned-mesh loading/hits, finite skeleton matrices, Idle/Walk/Run, crossfade weights, camera-relative movement, sprint, collision, gravity, ammunition, reload, weapon switching, damage, death and reset. Manual browser checks covered deployment, weapon firing/reload, first-person lower-body clipping, third-person rendering, enemy damage/defeat and HUD. The automated victory check verifies the result state; it does not represent a complete human playthrough of every route.

Observed production menu rendering: approximately 56–60 FPS, 141 draw calls and 169,081 visible triangles at the tested desktop viewport before additional gameplay effects. A subsequent combat view showed approximately 60 FPS, 178 draw calls and 208,992 triangles. Rates are machine/focus-dependent; browser automation/background throttling produced transient lower readings. This is not a cross-device benchmark. Rendering caps pixel ratio at 1.5, uses one 2048 shadow map, shares Soldier geometry/textures, instances environment detail, pools effects and caches AI visibility.

## Scope and limitations

This is a playable vertical slice, not a commercial AAA game. It has one compact level, six enemies, two weapons and no multiplayer or persistent progression. Locomotion, weapon motion, death and audio are generated rather than motion capture or recorded assets. Collision uses upright boxes with flat ground and box-top landing, without a general physics engine, slopes, ragdolls or character inverse kinematics. Destruction is limited to explosive barrels. No touch/gamepad control is implemented. The optional read-only WebMCP operation tool is feature-detected; no supported WebMCP execution context was available for verification.

The most valuable next improvements are authored locomotion and weapon/hand animation, richer weapon assets and recorded spatial audio, more level art, enemy perception/cover tuning, and profiling on several desktop GPUs.
