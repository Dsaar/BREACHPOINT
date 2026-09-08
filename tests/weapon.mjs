import { build } from 'esbuild';
import assert from 'node:assert/strict';
import * as THREE from 'three';
await build({
  entryPoints: ['lib/game/Weapon.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '/private/tmp/breach-weapon.mjs',
});
const { Weapon } = await import('/private/tmp/breach-weapon.mjs');
const w = new Weapon(new THREE.PerspectiveCamera());
assert.equal(w.ammo, 30);
assert.ok(w.shoot());
assert.equal(w.ammo, 29);
assert.equal(w.shoot(), false);
w.update(0.11, 0, false, false);
assert.ok(w.shoot());
w.reload();
assert.equal(w.shoot(), false);
w.switch(1);
assert.equal(w.index, 0);
w.update(2, 0, false, false);
assert.equal(w.ammo, 30);
assert.equal(w.reserve, 148);
w.switch(1);
assert.equal(w.ammo, 12);
w.update(0.3, 0, false, false);
assert.ok(w.shoot());
assert.equal(w.ammo, 11);
w.switch(0);
assert.equal(w.ammo, 30);
w.reserves[0] = 0;
w.magazines[0] = 0;
assert.equal(w.shoot(), false);
assert.equal(w.reloadTime, 0);
console.log(
  'PASS: fire rate, ammunition, reload transfer, reload lock, switching, independent magazines, empty reserve.',
);
