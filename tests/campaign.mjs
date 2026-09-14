import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  stdin: {
    contents: `export * from './lib/game/Campaign'; export * from './lib/game/CampaignProgress'; export * from './lib/game/MissionDirector'; export * from './lib/game/CampaignWorld'; export * from './lib/game/Enemies'; export * as THREE from 'three';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '/private/tmp/breach-campaign.mjs',
});
const {
  campaign,
  CampaignProgress,
  normalizeProgress,
  MissionDirector,
  buildCampaignWorld,
  Enemies,
  THREE,
} = await import('/private/tmp/breach-campaign.mjs');
let saved = null;
const store = {
  read: () => saved,
  write: (p) => {
    saved = JSON.parse(JSON.stringify(p));
  },
};
let service = new CampaignProgress(store);
assert.equal(campaign.length, 6);
assert.equal(service.value.highestUnlocked, 1);
for (let id = 2; id <= 6; id++) assert.throws(() => service.launch(id));
assert.throws(() => service.launch(7));
assert.throws(() => service.complete(2));
for (const mission of campaign) {
  service.launch(mission.id);
  assert.equal(service.value.lastPlayed, mission.id);
  const director = new MissionDirector(mission);
  for (let i = 0; i < mission.objectives.length; i++) {
    const objective = director.objective;
    assert.equal(director.index, i);
    if (objective.kind !== 'clear') {
      director.update(100, [100, 100], 0, true);
      assert.equal(director.index, i, 'objectives cannot complete remotely');
    }
    if (objective.kind === 'interact') {
      director.update(1, objective.position, 0, true);
      director.update(1, objective.position, 0, false);
      assert.equal(director.progress, 0, 'releasing interaction resets hold');
    }
    if (objective.kind !== 'reach') {
      director.update(100, objective.position, 1, true);
      assert.equal(
        director.index,
        i,
        'remaining hostiles block stage completion',
      );
    }
    director.update(100, objective.position, 0, true);
  }
  assert.equal(director.complete, true);
  assert.equal(
    director.update(1, [0, 0], 0, true),
    false,
    'completion is terminal',
  );
  director.reset();
  assert.equal(director.index, 0);
  assert.equal(director.complete, false);
  service.complete(mission.id);
  assert.equal(service.value.highestUnlocked, Math.min(mission.id + 1, 6));
  service = new CampaignProgress(store);
  assert.equal(
    service.value.completed.length,
    mission.id,
    'restart restores completion',
  );
  service.launch(1);
  service.complete(1);
  assert.equal(
    service.value.completed.length,
    mission.id,
    'replay never rolls back progress',
  );
}
assert.equal(service.value.campaignCompleted, true);
assert.equal(
  normalizeProgress({ version: 1, completed: [6], highestUnlocked: 6 })
    .highestUnlocked,
  1,
);
assert.equal(
  normalizeProgress({ version: 1, completed: [1, 2, 2, 99], lastPlayed: 6 })
    .lastPlayed,
  1,
);
assert.equal(
  normalizeProgress({ version: 99, completed: [1] }).highestUnlocked,
  1,
);
let staleSaved = { version: 1, completed: [1] };
const staleStore = {
  read: () => staleSaved,
  write: (value) => {
    staleSaved = structuredClone(value);
  },
};
const stale = new CampaignProgress(staleStore);
const advanced = new CampaignProgress(staleStore);
advanced.complete(2);
stale.launch(1);
assert.equal(
  new CampaignProgress(staleStore).value.highestUnlocked,
  3,
  'stale service cannot erase newer stored completion',
);
const broken = new CampaignProgress({
  read() {
    throw Error('blocked');
  },
  write() {
    throw Error('quota');
  },
});
broken.complete(1);
assert.equal(broken.value.highestUnlocked, 2);
assert.ok(broken.warning);
// Canvas is a texture-only dependency. Real GLB/rendering checks run in the browser.
const context = {
  fillRect() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  fillText() {},
  createRadialGradient() {
    return { addColorStop() {} };
  },
};
Object.defineProperty(globalThis, 'document', {
  value: { createElement: () => ({ getContext: () => context }) },
});
const fingerprints = new Set();
for (const mission of campaign) {
  const scene = new THREE.Scene();
  const world = buildCampaignWorld(scene, mission);
  fingerprints.add(JSON.stringify(world.obstacles));
  const blocked = (x, z) =>
    world.obstacles.some(
      (b) =>
        x > b.minX - 0.48 &&
        x < b.maxX + 0.48 &&
        z > b.minZ - 0.48 &&
        z < b.maxZ + 0.48,
    );
  const start = mission.spawn.join(',');
  const reached = new Set([start]);
  const queue = [mission.spawn];
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        key = `${nx},${nz}`;
      if (
        nx < -23 ||
        nx > 23 ||
        nz < -21 ||
        nz > 21 ||
        blocked(nx, nz) ||
        reached.has(key)
      )
        continue;
      reached.add(key);
      queue.push([nx, nz]);
    }
  }
  for (const point of [
    ...mission.objectives.map((o) => o.position),
    mission.intel.position,
    ...mission.enemies.map((e) => e.position),
  ]) {
    assert.equal(
      blocked(...point),
      false,
      `${mission.title}: point ${point} inside collision`,
    );
    assert.ok(
      reached.has(point.join(',')),
      `${mission.title}: point ${point} unreachable`,
    );
  }
  const source = new THREE.Group();
  const clips = ['Idle', 'Walk', 'Run'].map(
    (n) => new THREE.AnimationClip(n, 1, []),
  );
  const enemies = new Enemies(
    scene,
    source,
    clips,
    world.obstacles,
    [],
    undefined,
    mission.enemies,
  );
  assert.equal(
    enemies.alive,
    mission.enemies.filter((e) => e.wave === 0).length,
  );
  for (const e of enemies.enemies.filter((e) => e.dormant))
    assert.equal(e.model.visible, false);
  for (const objective of mission.objectives)
    if (objective.wave !== undefined) enemies.activateWave(objective.wave);
  assert.equal(
    enemies.alive,
    mission.enemies.length,
    'all scheduled waves become active',
  );
  enemies.reset();
  assert.equal(
    enemies.alive,
    mission.enemies.filter((e) => e.wave === 0).length,
  );
  console.log(
    `PASS ${mission.id}: ${mission.title} — ${world.obstacles.length} collision volumes, ${reached.size} reachable navigation cells, ${mission.enemies.length} operators`,
  );
}
assert.equal(fingerprints.size, 6, 'all maps have different collision layouts');
console.log(
  'PASS: sequential locks, six completions, replay, restart, malformed/blocked saves, objective gates, wave reset, map routes.',
);
