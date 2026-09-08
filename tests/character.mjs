import { build } from 'esbuild';
import assert from 'node:assert/strict';
await build({
  entryPoints: ['lib/game/CharacterController.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '/private/tmp/breach-character.mjs',
});
const { CharacterController } =
  await import('/private/tmp/breach-character.mjs');
import * as THREE from 'three';
const clips = ['Idle', 'Walk', 'Run'].map(
  (n) => new THREE.AnimationClip(n, 1, []),
);
function setup() {
  return new CharacterController(new THREE.Group(), clips, [
    { minX: -2, maxX: 2, minZ: 0, maxZ: 1, height: 3 },
  ]);
}
const p = setup();
p.enabled = true;
const advance = (n = 60) => {
  for (let i = 0; i < n; i++) p.update(1 / 60);
};
p.keys.add('KeyW');
advance();
assert.equal(p.state, 'Walk');
assert.ok(p.position.z < 9 && p.position.z > 8);
const walk = p.position.z;
p.keys.add('ShiftLeft');
advance();
assert.equal(p.state, 'Run');
assert.ok(walk - p.position.z > 5.5);
advance(180);
assert.ok(p.position.z >= 1.36 - 1e-6, 'wall collision');
p.keys.clear();
advance();
assert.equal(p.state, 'Idle');
assert.equal(p.position.y, 0);
p.position.set(10, 0, 10);
p.yaw = Math.PI / 2;
p.keys.add('ArrowUp');
advance();
assert.ok(p.position.x < 7, 'camera relative arrow movement');
p.keys.clear();
p.keys.add('Space');
p.update(1 / 60);
assert.ok(p.position.y > 0);
p.keys.clear();
advance(120);
assert.equal(p.position.y, 0);
assert.ok(p.grounded);
p.keys.add('KeyD');
p.update(1 / 60);
assert.ok(p.model.quaternion.angleTo(new THREE.Quaternion()) > 0);
assert.ok(p.model.quaternion.toArray().every(Number.isFinite));
console.log(
  'PASS: walk, sprint, crossfade state, wall collision, grounded idle, camera-relative arrows, jump/gravity, smooth rotation.',
);
