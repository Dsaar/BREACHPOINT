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

Append `?validate=1` to either server URL and click **Run integration validation** to run 25 checks against the actual loaded Soldier and game systems. This explicitly resets the current operation. The normal game has no validation panel.

## Controls

WASD or arrows move relative to the camera; mouse looks; Shift sprints; Space jumps; left mouse fires; right mouse aims; R reloads; 1/2 switches weapons; V switches first/third person; M mutes; Escape pauses. A browser that rejects pointer lock can use drag-to-look. Losing window focus pauses combat.

## Implementation

The repository was empty on initial inspection. The project uses React 19.2.6, Vinext/Vite, TypeScript and Three.js 0.183.2. No existing gameplay was replaced.

- `CharacterController.ts`: movement, collision, gravity, landing, smooth rotation, animation state and crossfades. The supplied Soldier is the actual playable character. First-person material clipping retains its lower body and full shadow; third person and the deployment screen show the complete model.
- `Environment.ts`: three-lane industrial compound, service interior, cover, instanced structural detail, textured surfaces, practical lighting, fog and sky.
- `Weapon.ts`: uploaded CAR SMG and Desert Eagle models, aiming, fire rate, independent ammunition, timed reload, recoil and synthesized audio.
- `Enemies.ts`: six skeletal Soldier instances, patrol, investigation, cached line of sight, grid navigation, combat reaction delay, cover seeking, damage and collapse death.
- `Effects.ts`: pooled sparks, tracers, smoke sprites and brass shell ejection.
- `Game.ts`: rendering, camera, input lifecycle, shooting, health, explosive barrels, victory/defeat/reset and performance telemetry.

The uploaded file contains one 2.2-second `mixamo.com` ready/idle animation, not separate Idle/Walk/Run clips. Its idle is retained; Walk and Run are generated skeletal clips with blended transitions and foot grounding. These are not motion-captured locomotion assets. See [CREDITS.md](CREDITS.md).

The browser asset is `public/models/Soldier.glb`. Its original geometry and skeleton remain. Legacy specular/glossiness materials were adapted, and embedded textures capped at 1024 pixels. `scripts/prepare-soldier.mjs` reproduces the conversion from the supplied source file. The original outside the repository was not changed.

## Uploaded weapons

`public/models/CAR.glb` (No.cccccc) and `public/models/DesertEagle.glb` (ELIZION) replace the primitive weapons. Both are CC BY 4.0; full source links, authorship and modifications are in [CREDITS.md](CREDITS.md). The original uploads are unchanged. `scripts/prepare-weapons.mjs CAR-source.glb DesertEagle-source.glb` reproduces their browser versions: 43.9 → 16.6 MiB and 101.5 → 12.2 MiB. Color textures retain up to 2048 pixels; normal/material maps use up to 1024 pixels. Geometry is preserved (91,272 and 13,279 triangles). Both models load once, with cached texture upload and material precompilation before play. Neither contains animation clips; the existing aiming, recoil, reload, effects and ammunition systems are retained.

## Validation record

Development and production builds were launched and inspected in Chrome. Both servers returned HTTP 200 for the complete 15,071,744-byte Soldier GLB. All 25 browser integration checks passed in development and production after the uploaded-weapon integration. Both servers returned HTTP 200 for CAR (17,409,392 bytes) and Desert Eagle (12,837,188 bytes). Node gameplay tests, TypeScript and authored-source lint passed. Final production inspection showed no new browser errors or GLTF warnings.

The integration checks cover actual skinned-mesh loading/hits, finite skeleton matrices, Idle/Walk/Run, crossfade weights, camera-relative movement, sprint, collision, gravity, ammunition, reload, weapon switching, damage, death and reset. Manual browser checks covered deployment, weapon firing/reload, first-person lower-body clipping, third-person rendering, enemy damage/defeat and HUD. The automated victory check verifies the result state; it does not represent a complete human playthrough of every route.

Initial vertical-slice baseline, before the uploaded weapon replacement: approximately 56–60 FPS, 141 draw calls and 169,081 visible triangles at the tested desktop viewport before additional gameplay effects. A subsequent combat view showed approximately 60 FPS, 178 draw calls and 208,992 triangles. Rates are machine/focus-dependent; browser automation/background throttling produced transient lower readings. This is not a cross-device benchmark. Rendering caps pixel ratio at 1.5, uses one 2048 shadow map, shares Soldier geometry/textures, instances environment detail, pools effects and caches AI visibility.

## Scope and limitations

This is a playable vertical slice, not a commercial AAA game. It has one compact level, six enemies, two weapons and no multiplayer or persistent progression. Locomotion, weapon motion, death and audio are generated rather than motion capture or recorded assets. Collision uses upright boxes with flat ground and box-top landing, without a general physics engine, slopes, ragdolls or character inverse kinematics. Destruction is limited to explosive barrels. No touch/gamepad control is implemented. The optional read-only WebMCP operation tool is feature-detected; no supported WebMCP execution context was available for verification.

The most valuable next improvements are authored locomotion and weapon/hand animation, authored hand animation and recorded spatial audio, more level art, enemy perception/cover tuning, and profiling on several desktop GPUs.

First-person arms reuse the Soldier’s skinned arm mesh and authored finger pose. `FirstPersonArms` crops torso-connected shoulder triangles and solves weapon-specific arm poses; both existing weapons attach to the right-hand socket. The camera-relative parent carries arms, weapons and muzzle effects together through aiming, recoil, sprinting and reload motion. Reloads currently use the existing whole-rig motion, not a separate magazine-handling animation.

## Deploy to Vercel

Import this repository into Vercel with its root directory set to the repository root. The checked-in `vercel.json` selects the **Other** framework preset, runs `npm ci` and `npm run build:vercel`, and publishes `dist/client`. Use Node.js 22.x (22.13 or newer). No application environment variables or Cloudflare bindings are required for this static game.

`build:vercel` enables Vinext's static export and omits the Cloudflare/Sites build plugins. The exported HTML, JavaScript, fonts, and all three GLB models are served directly from Vercel. Keep the `public/models` files in the deployed repository. The default `npm run build`, development server, and existing Sites configuration retain their previous behavior.

To verify locally, run `npm run build:vercel` and serve **dist/client** using a static HTTP server. A successful local export verifies the build artifact; a live Vercel deployment still needs to be created in your account. Configuration reference: https://vercel.com/docs/project-configuration.
