import * as THREE from 'three';
import type { Game } from '../lib/game/Game';
/** Explicit integration harness, invoked only from ?validate=1. Runs against the loaded GLB. */
export function validateGame(g: Game) {
  const passed: string[] = [];
  const check = (ok: boolean, name: string) => {
    if (!ok) throw new Error(name);
    passed.push(name);
  };
  const p = g.player;
  const obstacles = p.obstacles;
  const deployed = g.deployed;
  const muted = g.weapon.muted;
  try {
    g.reset();
    g.active = false;
    p.enabled = true;
    p.obstacles = [];
    p.position.set(0, 0, 12);
    p.velocity.set(0, 0, 0);
    p.keys.clear();
    p.yaw = 0;
    let bones = 0,
      meshes = 0;
    p.model.traverse((o) => {
      if (o.type === 'Bone') bones++;
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes++;
    });
    check(
      bones >= 50 && meshes === 13,
      'Uploaded Soldier: 50-joint skeleton and 13 skinned meshes',
    );
    check(
      p.clips.map((c) => c.name).join(',') === 'Idle,Walk,Run',
      'Idle, Walk and Run animation clips',
    );
    const step = (n = 60) => {
      for (let i = 0; i < n; i++) p.update(1 / 60);
    };
    p.keys.add('KeyW');
    step();
    check(
      p.position.z < 9 && p.state === 'Walk',
      'WASD forward movement / Walk',
    );
    p.keys.add('ShiftLeft');
    step(6);
    check(
      p.actions.Walk.getEffectiveWeight() > 0 &&
        p.actions.Run.getEffectiveWeight() > 0,
      'AnimationMixer crossfade has simultaneous nonzero weights',
    );
    step(54);
    check(p.state === 'Run' && p.position.z < 3.5, 'Shift sprint / Run');
    p.keys.clear();
    step();
    check(p.state === 'Idle' && p.grounded, 'Run to Idle blend / grounded');
    p.position.set(0, 0, 12);
    p.yaw = Math.PI / 2;
    p.keys.add('ArrowUp');
    step();
    check(p.position.x < -3, 'Camera-relative arrow movement');
    p.keys.clear();
    p.keys.add('ArrowRight');
    step();
    check(p.position.z < 9, 'Arrow strafe');
    let finite = true;
    p.model.traverse((o) => {
      if (o.type === 'Bone' && !o.matrixWorld.elements.every(Number.isFinite))
        finite = false;
    });
    check(finite, 'Animated skeleton matrices remain finite');
    p.keys.clear();
    p.velocity.set(0, 0, 0);
    p.position.set(0, 0, 3);
    p.yaw = 0;
    p.obstacles = [{ minX: -2, maxX: 2, minZ: 0, maxZ: 1, height: 2 }];
    p.keys.add('KeyW');
    step(100);
    check(p.position.z >= 1.36 - 1e-5, 'Character wall collision');
    p.keys.clear();
    p.keys.add('Space');
    p.update(1 / 60);
    check(p.position.y > 0, 'Jump input');
    p.keys.clear();
    step(100);
    check(p.grounded && p.position.y === 0, 'Gravity and ground detection');
    p.obstacles = obstacles;
    p.enabled = false;
    check(
      g.weapon.ready && g.weapon.models.length === 2,
      'Both uploaded weapon GLBs are loaded',
    );
    for (const [index, mount] of g.weapon.models.entries()) {
      let meshes = 0,
        textured = 0;
      mount.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          meshes++;
          for (const mat of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            if ((mat as THREE.MeshStandardMaterial).map) textured++;
        }
      });
      check(
        meshes === (index === 0 ? 11 : 28) && textured === meshes,
        index === 0
          ? 'CAR: 11 textured source meshes'
          : 'Desert Eagle: 28 textured source meshes',
      );
    }
    const arms = g.weapon.arms!;
    check(
      !!arms && arms.socket.parent === arms.right,
      'Weapon socket is parented to Soldier right-hand bone',
    );
    const armMeshes: THREE.SkinnedMesh[] = [];
    arms.root.traverse((node) => {
      if ((node as THREE.SkinnedMesh).isSkinnedMesh)
        armMeshes.push(node as THREE.SkinnedMesh);
    });
    check(
      armMeshes.length === 1,
      'First-person rig renders only the Soldier arms mesh',
    );
    const mesh = armMeshes[0];
    const indices = mesh.geometry.getAttribute('skinIndex');
    const weights = mesh.geometry.getAttribute('skinWeight');
    let isolated = true;
    for (const vertex of mesh.geometry.index!.array)
      for (let k = 0; k < 4; k++)
        if (
          weights.getComponent(vertex, k) > 0.001 &&
          !/(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(
            mesh.skeleton.bones[indices.getComponent(vertex, k)].name,
          )
        )
          isolated = false;
    check(
      isolated,
      'Rendered arm triangles exclude torso, head and leg influences',
    );
    const cameraRotation = g.camera.rotation.clone();
    const assembly = g.weapon.models[0].parent!;
    const handRelative = () => {
      g.camera.updateMatrixWorld(true);
      return arms.right.matrixWorld
        .clone()
        .invert()
        .multiply(assembly.matrixWorld);
    };
    const attached = handRelative();
    for (const index of [0, 1, 0]) {
      g.weapon.switch(index);
      for (const pitch of [-1.4, 0, 1.4]) {
        g.camera.rotation.set(pitch, 1.2, 0);
        g.weapon.aim = true;
        g.weapon.recoil = 0.12;
        g.weapon.reloadTime = 0.8;
        g.weapon.update(0.016, 4, true, true);
        const current = handRelative();
        check(
          current.elements.every(
            (v, i) => Math.abs(v - attached.elements[i]) < 1e-5,
          ),
          `Hand attachment: weapon ${index}, pitch ${pitch}, aim/recoil/reload/sprint`,
        );
        g.weapon.reloadTime = 0;
      }
      const wrist = arms.root.worldToLocal(
        arms.left.getWorldPosition(new THREE.Vector3()),
      );
      check(
        wrist.distanceTo(
          new THREE.Vector3(
            ...((index === 0
              ? [-0.045, -0.075, -0.43]
              : [-0.04, -0.14, -0.035]) as [number, number, number]),
          ),
        ) < 0.005,
        `Support hand reaches weapon ${index} grip`,
      );
    }
    g.camera.rotation.copy(cameraRotation);
    g.weapon.aim = false;
    g.weapon.recoil = 0;
    g.weapon.muted = true;
    g.weapon.reloadTime = 0;
    g.weapon.cooldown = 0;
    g.weapon.switch(0);
    g.weapon.magazines = [30, 12];
    g.weapon.reserves = [150, 60];
    check(
      g.weapon.shoot() && g.weapon.ammo === 29,
      'Weapon fire consumes ammunition',
    );
    check(!g.weapon.shoot(), 'Fire-rate limiter');
    g.weapon.reload();
    g.weapon.update(2, 0, false, false);
    check(
      g.weapon.ammo === 30 && g.weapon.reserve === 149,
      'Reload transfers reserve ammunition',
    );
    g.weapon.switch(1);
    check(
      g.weapon.ammo === 12 &&
        !g.weapon.models[0].visible &&
        g.weapon.models[1].visible,
      'Weapon switching displays Desert Eagle',
    );
    g.weapon.switch(0);
    check(
      g.weapon.models[0].visible && !g.weapon.models[1].visible,
      'Cached CAR model restored on switch',
    );
    g.enemies!.reset();
    const enemy = g.enemies!.enemies[0];
    let hit = false;
    for (const y of [0.8, 1, 1.2, 1.4]) {
      const ray = new THREE.Raycaster(
        enemy.position.clone().add(new THREE.Vector3(0, y, 2)),
        new THREE.Vector3(0, 0, -1),
      );
      if (g.enemies!.hit(ray, 4, 1000)) {
        hit = true;
        break;
      }
    }
    check(
      hit && g.enemies!.alive === 5,
      'Actual Soldier skinned-mesh hit detection / enemy death',
    );
    g.active = true;
    g.damage(15);
    check(g.health === 85 && g.damageFlash > 0, 'Health and damage feedback');
    g.damage(100);
    check(g.ended === 'OPERATOR DOWN' && !g.active, 'Defeat state');
    g.reset();
    check(
      g.health === 100 && g.enemies!.alive === 6 && g.weapon.ammo === 30,
      'Full round reset',
    );
    g.finish('STATION SECURED');
    check(g.ended === 'STATION SECURED', 'Victory state presentation');
    return { passed: passed.length, checks: passed };
  } finally {
    p.obstacles = obstacles;
    g.reset();
    g.active = false;
    p.enabled = false;
    p.keys.clear();
    g.deployed = deployed;
    g.weapon.muted = muted;
    g.weapon.switch(0);
    if (!deployed) {
      p.position.set(1.8, 0, 8.7);
      p.model.rotation.y = 0.25;
      g.camera.layers.enable(1);
    }
    g.report({ active: false });
  }
}
