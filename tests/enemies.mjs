import { build } from 'esbuild';
import assert from 'node:assert/strict';
import * as THREE from 'three';
await build({
  entryPoints: ['lib/game/Enemies.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '/private/tmp/breach-enemies.mjs',
});
const { Enemies } = await import('/private/tmp/breach-enemies.mjs');
const scene = new THREE.Scene();
const source = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 1.8, 0.4),
  new THREE.MeshBasicMaterial(),
);
body.position.y = 0.9;
source.add(body);
const clips = ['Idle', 'Walk', 'Run'].map(
  (n) => new THREE.AnimationClip(n, 1, []),
);
const manager = new Enemies(scene, source, clips, [], []);
assert.equal(manager.alive, 6);
manager.alert(new THREE.Vector3(0, 0, 10));
assert.ok(manager.enemies.some((e) => e.state === 'investigate'));
scene.updateMatrixWorld(true);
const ray = new THREE.Raycaster(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, -1),
);
assert.equal(manager.hit(ray, 2, 100), null, 'cover blocks hits');
assert.ok(manager.hit(ray, 10, 34));
assert.equal(manager.enemies[0].health, 66);
assert.equal(manager.enemies[0].state, 'cover');
manager.hit(ray, 10, 100);
assert.equal(manager.alive, 5);
manager.update(0.5, new THREE.Vector3(), true, () => {});
assert.ok(manager.enemies[0].death > 0);
manager.reset();
assert.equal(manager.alive, 6);
assert.ok(
  manager.enemies.every(
    (e) => e.health === 100 && e.controller.velocity.length() === 0,
  ),
);
assert.ok(manager.blast(new THREE.Vector3(0, 1, -5), 5, 200) >= 1);
manager.reset();
let damage = 0;
const original = Math.random;
Math.random = () => 0;
for (let i = 0; i < 180; i++)
  manager.update(
    1 / 60,
    new THREE.Vector3(0, 0, 2),
    true,
    (d) => (damage += d),
  );
Math.random = original;
assert.ok(damage > 0, 'visible enemies enter combat and damage player');
console.log(
  'PASS: spawn, alert/investigation, obstruction-limited hits, cover reaction, death, reset, blast, LOS combat damage.',
);
