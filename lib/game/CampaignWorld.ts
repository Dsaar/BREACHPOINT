import * as THREE from 'three';
import { buildEnvironment } from './Environment';
import { campaignSurface } from './CampaignSurfaces';
import type { Obstacle } from './CharacterController';
import type { Mission, Point } from './Campaign';

/** Five separate layouts share construction materials, not the relay layout. */
export function buildCampaignWorld(scene: THREE.Scene, mission: Mission) {
  const obstacles: Obstacle[] = [];
  const targets: THREE.Object3D[] = [];
  const accent = new THREE.MeshStandardMaterial({
    color: mission.color,
    emissive: mission.color,
    emissiveIntensity: 2,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#81959e',
    map: campaignSurface('#35444c'),
    metalness: 0.7,
    roughness: 0.48,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: mission.map === 'wreck' ? '#665455' : '#53636b',
    map: campaignSurface('#87908c'),
    roughness: 0.92,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: '#6b7c8e',
    map: campaignSurface('#25313c'),
    metalness: 0.45,
    roughness: 0.5,
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const transform = new THREE.Object3D();
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material = steel,
    solid = false,
  ) {
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.rotation.set(0, 0, 0);
    transform.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(transform.matrix.clone());
    batches.set(material, matrices);
    if (solid)
      obstacles.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        height: y + h / 2,
      });
  }
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    targets.push(object);
    return object;
  }
  function label(text: string, x: number, y: number, z: number, width = 5) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#101b24';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = mission.color;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 82, 990);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return mesh(
      new THREE.PlaneGeometry(width, width / 8),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      x,
      y,
      z,
    );
  }
  function cover(x: number, z: number, w = 3) {
    box(x, 0.55, z, w, 1.1, 1, concrete, true);
    box(x, 1.12, z, w + 0.12, 0.12, 1.08, steel);
    box(x, 0.72, z + 0.51, w - 0.3, 0.12, 0.02, accent);
    for (const side of [-1, 1]) {
      box(x + side * (w / 2 - 0.12), 0.55, z, 0.16, 1.2, 1.05, steel);
      box(x + side * (w / 2 - 0.35), 0.35, z + 0.52, 0.09, 0.09, 0.025, dark);
    }
  }
  function pillar(x: number, z: number, height = 7) {
    box(x, height / 2, z, 1, height, 1, concrete, true);
    box(x, 0.15, z, 1.6, 0.3, 1.6, steel);
    box(x, height - 1, z + 0.51, 0.14, 1, 0.03, accent);
    for (let y = 1; y < height; y += 2) box(x, y, z, 1.1, 0.12, 1.1, steel);
  }
  let carrier: THREE.Mesh | undefined;
  let core: THREE.Mesh | undefined;
  let orbitalRing: THREE.Mesh | undefined;
  let strikeTime = -1;
  let extraction = new THREE.Vector3(0, 0, -18);
  if (mission.map === 'relay') {
    const original = buildEnvironment(scene);
    obstacles.push(...original.obstacles);
    targets.push(...original.targets);
    extraction = original.extraction;
  } else {
    const ground = new THREE.MeshStandardMaterial({
      map: campaignSurface(mission.map === 'wreck' ? '#574b45' : '#34454b', 18),
      roughness: 0.86,
      metalness: 0.18,
    });
    box(0, -0.25, 0, 48, 0.5, 44, ground);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(105, 24, 16),
      new THREE.ShaderMaterial({
        uniforms: {
          horizon: { value: new THREE.Color(mission.sky) },
          zenith: { value: new THREE.Color(mission.sky).multiplyScalar(0.22) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader:
          'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'uniform vec3 horizon;uniform vec3 zenith;varying vec3 direction;void main(){vec3 d=normalize(direction);float h=max(0.,d.y);vec3 c=mix(horizon,zenith,pow(h,.5));float cloud=sin(d.x*24.+sin(d.z*21.))*sin(d.z*15.);c*=1.-smoothstep(.1,.8,cloud)*.16;gl_FragColor=vec4(c,1.);}',
      }),
    );
    sky.renderOrder = -10;
    scene.add(sky);
    // Recessed wall panels, structural ribs and service rails break up the perimeter.
    for (const x of [-23.6, 23.6])
      for (let z = -20; z <= 20; z += 4) {
        box(x, 3, z, 0.18, 6, 0.25, steel);
        box(x, 2.1, z, 0.2, 0.2, 3.6, concrete);
        box(x, 5.6, z, 0.22, 0.14, 2.8, accent);
      }
    for (const z of [-21.6, 21.6])
      for (let x = -22; x <= 22; x += 4) {
        box(x, 3, z, 0.25, 6, 0.18, steel);
        box(x, 1.1, z, 3.6, 0.18, 0.2, concrete);
      }
    for (const x of [-24, 24]) box(x, 4, 0, 0.6, 8, 44, dark, true);
    for (const z of [-22, 22]) box(0, 4, z, 48, 8, 0.6, dark, true);
    // Seams and low edge lighting give the whole colony a common visual language.
    for (let z = -20; z <= 20; z += 4) box(0, 0.006, z, 47, 0.01, 0.045, steel);
    for (const x of [-23, 23]) box(x, 0.03, 0, 0.09, 0.04, 42, accent);
    if (mission.map === 'spillway') {
      const water = new THREE.MeshStandardMaterial({
        color: '#174e62',
        metalness: 0.85,
        roughness: 0.15,
      });
      for (const x of [-16, 16]) {
        box(x, 0.01, 0, 12, 0.02, 42, water);
        for (const z of [-15, -5, 5, 15]) {
          pillar(x, z, 10);
          box(x, 9, z, 13, 0.7, 0.7, steel);
          mesh(new THREE.CylinderGeometry(2.2, 2.2, 2, 24), steel, x, 1, z);
          mesh(
            new THREE.TorusGeometry(2.24, 0.08, 6, 32),
            accent,
            x,
            2.05,
            z,
          ).rotation.x = Math.PI / 2;
        }
      }
      for (const x of [-9.7, 9.7])
        for (const z of [-16, -8, 0, 8, 16])
          box(x, 0.65, z, 0.3, 1.3, 5, steel, true);
      for (const [x, z] of [
        [-4, 10],
        [4, 0],
        [-4, -10],
      ])
        cover(x, z, 3);
      box(0, 10, -20, 20, 1, 2, steel);
      label('PELAGIC / FLOOD CONTROL', 0, 8, -20, 14);
      for (const x of [-7, 7]) {
        pillar(x, -19, 13);
        box(x, 12, -19, 1.8, 0.4, 1.8, accent);
      }
    } else if (mission.map === 'archive') {
      // A horseshoe corridor around the sealed memory chamber, with side rooms.
      box(0, 2.4, -3, 7, 4.8, 19, dark, true);
      box(0, 5.1, -3, 8, 0.4, 20, accent);
      for (const x of [-8, 8])
        for (const z of [-13, -5, 3]) {
          box(x, 1.5, z, 2, 3, 3, steel, true);
          for (let y = 0.4; y < 3; y += 0.45)
            box(x, y, z + 1.51, 1.5, 0.12, 0.03, accent);
        }
      for (const x of [-20, 20])
        for (const z of [-14, -6, 2, 10]) {
          box(x, 1.4, z, 3, 2.8, 4, steel, true);
          mesh(new THREE.CapsuleGeometry(0.45, 1.4, 4, 12), accent, x, 1.5, z);
          label('MEMORY / OFFLINE', x, 3.2, z + 2.05, 3);
        }
      box(0, 6.8, 0, 47, 0.4, 43, dark);
      for (const x of [-14, 0, 14])
        for (const z of [-17, 0, 16]) box(x, 6.5, z, 0.3, 0.15, 5, accent);
      cover(-15, 3);
      cover(15, -4);
      label('CHOIR / CONTINUITY ARCHIVE', 0, 4.5, 17, 10);
      label('DO NOT RESTORE CONTACT', 0, 3, 6.6, 6);
    } else if (mission.map === 'wreck') {
      // Broken diagonal hull silhouette, branching rubble lanes and a ruined beacon.
      for (const [x, z, w, d] of [
        [-10, 0, 7, 4],
        [7, -2, 9, 3],
        [-5, -12, 5, 5],
        [14, 12, 4, 4],
      ]) {
        box(x, 1.6, z, w, 3.2, d, concrete, true);
        for (let i = 0; i < 4; i++)
          box(x - w / 2 + (i * w) / 4, 3.6 + (i % 2), z, 0.16, 2, 0.16, steel);
      }
      const hull = (carrier = mesh(
        new THREE.CylinderGeometry(2, 3, 15, 8, 1, true),
        steel,
        8,
        5,
        -13,
      ));
      hull.rotation.z = 0.08;
      hull.position.y = 22;
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 2.4), steel);
        wing.position.set(side * 4, 0, -2);
        hull.add(wing);
        const engine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 1, 3, 12),
          dark,
        );
        engine.position.set(side * 2, -4, 0);
        hull.add(engine);
      }
      for (const x of [-19, 19]) {
        pillar(x, -18, 11);
        box(x, 9, -18, 6, 0.5, 1, steel);
      }
      for (const [x, z] of [
        [-14, 12],
        [-5, 8],
        [8, 8],
        [0, -6],
        [17, -16],
      ])
        cover(x, z);
      for (let i = 0; i < 16; i++) {
        const x = Math.sin(i * 8.2) * 20,
          z = Math.cos(i * 3.7) * 19;
        mesh(
          new THREE.TetrahedronGeometry(0.5 + (i % 3) * 0.2),
          concrete,
          x,
          0.3,
          z,
        ).rotation.set(i, 0, i * 0.6);
      }
      label('EVACUATION / NO DEPARTURES', 0, 6, -21, 16);
      mesh(
        new THREE.TorusGeometry(3, 0.1, 6, 48),
        accent,
        0,
        0.05,
        3,
      ).rotation.x = Math.PI / 2;
    } else if (mission.map === 'foundry') {
      for (const x of [-6, 6]) {
        box(x, 1.8, 2, 3, 3.6, 21, steel, true);
        for (const z of [-6, 0, 6, 12]) {
          mesh(new THREE.CylinderGeometry(0.7, 0.7, 5, 12), dark, x, 5, z);
          box(x, 3.7, z, 3.1, 0.12, 1.2, accent);
        }
      }
      for (const x of [-21, 21])
        for (const z of [-16, -6, 4, 14]) {
          pillar(x, z, 10);
          box(x, 6, z, 3, 1.6, 3, steel);
          box(x, 5.8, z + 1.52, 2.5, 0.6, 0.04, accent);
        }
      for (const z of [-14, 0, 14]) {
        box(0, 10, z, 44, 0.6, 1, steel);
        for (const x of [-13, 13]) box(x, 9.5, z, 4, 0.15, 0.5, accent);
      }
      for (const [x, z] of [
        [-14, 4],
        [14, 4],
        [-13, -13],
        [13, -13],
        [0, 8],
      ])
        cover(x, z);
      label('ORBITAL FEED / BUS 03', 0, 7, -21, 14);
      for (const x of [-3, 3]) pillar(x, -19, 8);
    } else {
      // Open annular battle space around a suspended resonator; four radial cover islands.
      const ring = (orbitalRing = mesh(
        new THREE.TorusGeometry(8, 0.4, 12, 80),
        steel,
        0,
        9,
        -4,
      ));
      ring.rotation.y = Math.PI / 5;
      mesh(new THREE.TorusGeometry(6.8, 0.12, 8, 80), accent, 0, 9, -4);
      core = mesh(new THREE.IcosahedronGeometry(2.4, 1), accent, 0, 9, -4);
      core.name = 'CHOIR core';
      for (const x of [-20, 20])
        for (const z of [-17, 0, 17]) {
          pillar(x, z, 15);
          box(x, 13, z, 0.15, 3, 0.15, accent);
        }
      for (const [x, z] of [
        [-10, 8],
        [10, 8],
        [-10, -10],
        [10, -10],
      ]) {
        cover(x, z, 4);
        box(x, 3.5, z - 2, 0.4, 7, 0.4, steel, true);
      }
      for (let r = 5; r <= 19; r += 7)
        mesh(
          new THREE.TorusGeometry(r, 0.035, 4, 80),
          accent,
          0,
          0.02,
          0,
        ).rotation.x = Math.PI / 2;
      for (const x of [-4, 4]) box(x, 0.04, -14, 0.15, 0.05, 12, accent);
      label('BREACHPOINT / ISOLATION BRIDGE', 0, 5, -21, 15);
      // Distant array architecture beyond the playable boundary.
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        box(
          Math.sin(angle) * 38,
          10,
          Math.cos(angle) * 38,
          2,
          20 + (i % 4) * 4,
          2,
          steel,
        );
      }
    }
  }
  // Physical terminals and light beacons are driven by the same objective positions as the HUD.
  for (const objective of mission.objectives) {
    const [x, z] = objective.position;
    if (objective.kind === 'interact') {
      box(x + 1.5, 0.65, z, 0.6, 1.3, 0.6, steel, true);
      box(x + 1.5, 1.32, z, 0.65, 0.08, 0.65, accent);
      box(x + 1.5, 1.05, z + 0.31, 0.48, 0.26, 0.04, dark);
      box(x + 1.5, 1.07, z + 0.335, 0.35, 0.025, 0.02, accent);
      label('ACCESS / ' + mission.id, x + 1.5, 1.7, z, 0.95);
    }
  }
  const [ix, iz] = mission.intel.position;
  label('FIELD RECORD / HOLD E', ix, 1.6, iz, 2.5);
  for (const [mat, matrices] of batches) {
    const instance = new THREE.InstancedMesh(cube, mat, matrices.length);
    matrices.forEach((matrix, i) => instance.setMatrixAt(i, matrix));
    instance.castShadow = true;
    instance.receiveShadow = true;
    instance.computeBoundingSphere();
    scene.add(instance);
    targets.push(instance);
  }
  const marker = mesh(
    new THREE.TorusGeometry(1.6, 0.055, 6, 48),
    accent,
    0,
    0.07,
    0,
  );
  marker.rotation.x = Math.PI / 2;
  marker.raycast = () => {};
  const hazards = mission.hazards.map((h) => {
    const material = new THREE.MeshBasicMaterial({
      color: '#ffb94d',
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = mesh(
      new THREE.CircleGeometry(h.radius, 32),
      material,
      h.position[0],
      0.04,
      h.position[1],
    );
    ring.rotation.x = -Math.PI / 2;
    ring.raycast = () => {};
    return { definition: h, mesh: ring, material };
  });
  const light = new THREE.PointLight(mission.color, 35, 24, 2);
  light.position.set(0, 5, -10);
  scene.add(light);
  const animate = (time: number, event?: string) => {
    if (core) {
      core.rotation.y = time * 0.18;
      core.rotation.z = Math.sin(time * 0.3) * 0.15;
      core.scale.setScalar(
        event === 'seal' ? 0.08 : 1 + Math.sin(time * 2) * 0.025,
      );
    }
    if (orbitalRing)
      orbitalRing.rotation.y = Math.PI / 5 + Math.sin(time * 0.12) * 0.12;
    if (carrier) {
      if (event === 'overload' && strikeTime < 0) strikeTime = time;
      const fall = strikeTime < 0 ? 0 : Math.min(1, (time - strikeTime) / 3);
      carrier.position.y = 22 - 17 * fall;
      carrier.rotation.z = 0.08 + 1.07 * fall;
      if (time === 0) strikeTime = -1;
    }
  };
  return {
    obstacles,
    targets,
    extraction,
    marker,
    hazards,
    accent,
    light,
    animate,
  };
}
export function setMarker(marker: THREE.Object3D, position: Point) {
  marker.position.set(position[0], 0.07, position[1]);
}
