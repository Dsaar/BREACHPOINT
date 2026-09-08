import * as THREE from 'three';
import type { Obstacle } from './CharacterController';

/** Relay Nine: a compact, three-lane coastal maintenance compound. */
export function buildEnvironment(scene: THREE.Scene) {
  const obstacles: Obstacle[] = [];
  const targets: THREE.Object3D[] = [];
  let seed = 739;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // A restrained maritime dusk gradient stays readable above the fog horizon.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(110, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 vDirection; void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.0);vec3 col=mix(vec3(.31,.37,.38),vec3(.045,.095,.145),pow(h,.55));float warmth=pow(max(dot(d,normalize(vec3(-.7,.05,-.8))),0.0),14.0);col+=vec3(.22,.10,.025)*warmth*exp(-h*7.0);float cloud=sin(d.x*18.0+d.z*11.0+sin(d.z*32.0)*.5)*sin(d.z*24.0-d.x*7.0);col=mix(col,col*.8,smoothstep(.1,.75,cloud)*smoothstep(.05,.3,h)*.32);gl_FragColor=vec4(col,1.0);}`,
    }),
  );
  sky.position.y = -6;
  sky.renderOrder = -10;
  scene.add(sky);
  const surface = (base: string, grain: number) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(random() * grain);
      ctx.fillStyle = `rgba(${v},${v},${v},${random() * 0.18})`;
      ctx.fillRect(random() * 256, random() * 256, random() * 3 + 1, 1);
    }
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = `rgba(12,18,18,${random() * 0.16})`;
      ctx.beginPath();
      const x = random() * 256,
        y = random() * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 40, y + random() * 3);
      ctx.stroke();
    }
    // Broad mineral deposits and rain streaks survive at gameplay distance.
    for (let i = 0; i < 7; i++) {
      const x = random() * 256,
        y = random() * 256,
        r = 12 + random() * 55;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(10,19,18,${0.015 + random() * 0.035})`);
      g.addColorStop(1, 'rgba(10,19,18,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(28,22,12,${random() * 0.13})`;
      ctx.fillRect(
        random() * 256,
        random() * 256,
        1 + random() * 2,
        20 + random() * 65,
      );
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  };
  const concrete = new THREE.MeshStandardMaterial({
    map: surface('#667171', 65),
    roughness: 0.95,
  });
  const groundMat = new THREE.MeshStandardMaterial({
    map: surface('#424f52', 95),
    roughness: 0.83,
    metalness: 0.08,
  });
  groundMat.map!.repeat.set(22, 22);
  const steel = new THREE.MeshStandardMaterial({
    color: '#283b40',
    roughness: 0.52,
    metalness: 0.75,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: '#789092',
    roughness: 0.55,
    metalness: 0.7,
  });
  const teal = new THREE.MeshStandardMaterial({
    map: surface('#35696a', 50),
    roughness: 0.66,
    metalness: 0.5,
  });
  const rust = new THREE.MeshStandardMaterial({
    map: surface('#835b41', 65),
    roughness: 0.84,
    metalness: 0.25,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: '#17252a',
    roughness: 0.65,
    metalness: 0.6,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: '#d0a34c',
    roughness: 0.85,
  });
  const white = new THREE.MeshStandardMaterial({
    color: '#b4bcb1',
    roughness: 0.8,
  });
  const amber = new THREE.MeshStandardMaterial({
    color: '#ffca78',
    emissive: '#ffb550',
    emissiveIntensity: 3,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: '#89e0db',
    emissive: '#62c6c2',
    emissiveIntensity: 2,
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D();
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material = steel,
    collide = false,
  ) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    let list = batches.get(mat);
    if (!list) {
      list = [];
      batches.set(mat, list);
    }
    list.push(dummy.matrix.clone());
    if (collide)
      obstacles.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        height: y + h / 2,
      });
  }
  function pipe(
    a: THREE.Vector3,
    b: THREE.Vector3,
    r: number,
    mat: THREE.Material = steel,
  ) {
    const dir = b.clone().sub(a);
    const mesh = new THREE.Mesh(cylinder, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(r, dir.length(), r);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    mesh.castShadow = true;
    scene.add(mesh);
    targets.push(mesh);
    return mesh;
  }
  function sign(
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color = '#dce9df',
    bg = '#142b30',
    rotation = 0,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = color;
    ctx.fillRect(26, 26, 8, 204);
    ctx.font = '700 94px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 530, 132, 930);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: t,
        roughness: 0.75,
        emissive: color,
        emissiveIntensity: 0.12,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    scene.add(mesh);
  }
  function lamp(x: number, y: number, z: number, blue = false) {
    box(x, y, z, 1.05, 0.13, 0.24, steel);
    box(x, y - 0.075, z, 0.87, 0.035, 0.16, blue ? cyan : amber);
    box(x, y + 0.1, z + 0.12, 1.18, 0.065, 0.52, edge);
    for (const dx of [-0.4, 0, 0.4])
      box(x + dx, y - 0.09, z, 0.035, 0.08, 0.24, steel);
    box(x, y + 0.13, z - 0.08, 0.14, 0.24, 0.1, steel);
  }

  box(0, -0.18, 0, 53, 0.36, 49, groundMat);
  // Shallow irregular wet patches, deliberately sparse; no additional collision.
  const wet = new THREE.MeshStandardMaterial({
    color: '#263a3e',
    roughness: 0.17,
    metalness: 0.32,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const [x, z, sx, sz] of [
    [-2, 7, 1.7, 0.6],
    [3, -6, 1.2, 0.55],
    [-9, 7, 1.8, 0.6],
    [12, 4, 1.3, 0.8],
    [-4, -13, 1.1, 0.6],
    [7, 12, 1.9, 0.65],
  ]) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 22; i++) {
      const a = (i / 21) * Math.PI * 2;
      const r = 0.75 + random() * 0.25;
      const px = Math.cos(a) * r * sx,
        py = Math.sin(a) * r * sz;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    const patch = new THREE.Mesh(new THREE.ShapeGeometry(shape), wet);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.021, z);
    scene.add(patch);
  }
  // Concrete seams, drainage channels and faded logistics lane markings.
  for (let z = -20; z < 23; z += 5) box(0, 0.003, z, 47, 0.006, 0.024, dark);
  for (let x = -20; x <= 20; x += 8) box(x, 0.003, 0, 0.022, 0.006, 44, dark);
  for (const x of [-11.7, 11.7]) {
    box(x, 0.005, 0, 0.27, 0.01, 42, dark);
    for (let z = -20; z < 21; z += 0.45)
      box(x, 0.014, z, 0.23, 0.014, 0.05, edge);
  }
  for (const x of [-3.3, 3.3])
    for (let z = -16; z < 20; z += 3) box(x, 0.012, z, 0.07, 0.018, 1.4, paint);
  for (let i = 0; i < 9; i++) box(-4 + i, 0.014, 16, 0.4, 0.018, 1.9, white);
  // Boundary retaining walls have pilasters, coping and technical ribs.
  box(0, 1.35, -22, 48, 2.7, 0.55, concrete, true);
  box(0, 1.35, 22, 48, 2.7, 0.55, concrete, true);
  for (const x of [-24, 24]) {
    box(x, 1.8, 0, 0.55, 3.6, 44, concrete, true);
    box(x, 3.65, 0, 0.8, 0.16, 44, steel);
    for (let z = -20; z <= 20; z += 4) box(x - 0.08, 2, z, 0.8, 4, 0.35, steel);
  }
  for (let x = -22; x <= 22; x += 4) {
    box(x, 1.7, -21.7, 0.32, 3.4, 0.7, steel);
    box(x, 2.9, -21.7, 3.6, 0.6, 0.14, dark);
  }
  // Raised control hall, open ground-level passage and strong central framing.
  for (const x of [-8.5, 8.5]) {
    box(x, 3.3, -15, 9, 6.6, 8, concrete, true);
    box(x, 6.7, -15, 9.4, 0.28, 8.4, steel);
    box(x, 1, -10.95, 9, 0.32, 0.12, steel);
    box(x, 3.4, -10.92, 9, 0.12, 0.14, edge);
    for (let offset = -3.5; offset <= 3.5; offset += 1.75) {
      box(x + offset, 4.8, -10.91, 1.45, 1.85, 0.12, dark);
      box(x + offset, 4.8, -10.82, 1.29, 1.68, 0.02, teal);
      box(x + offset, 4.8, -10.79, 0.06, 1.7, 0.03, steel);
      box(x + offset, 4.8, -10.79, 1.3, 0.055, 0.03, steel);
      box(x + offset, 5.7, -10.72, 1.55, 0.13, 0.45, steel);
    }
    for (let offset = -3.8; offset < 4; offset += 1.1)
      box(x + offset, 2.1, -10.81, 0.035, 1.65, 0.04, edge);
    lamp(x, 3.5, -10.5);
    sign(x < 0 ? '09 / OPERATIONS' : 'RELAY CONTROL', x, 6, -10.76, 6, 0.65);
  }
  box(0, 5.85, -13.3, 8, 1.6, 3.1, steel);
  box(0, 6.77, -13.3, 8.4, 0.16, 3.4, edge);
  for (let x = -3.5; x <= 3.5; x += 0.7)
    box(x, 5.95, -11.72, 0.04, 1.1, 0.04, edge);
  sign('NORTH RELAY / 09', 0, 5.9, -11.68, 6.8, 0.75, '#ffd294');
  for (const x of [-3.85, 3.85]) box(x, 2.5, -12, 0.25, 5, 0.3, steel, true);
  // East service shed is a playable interior with two wide doorways.
  box(19, 2.3, 0, 6, 4.6, 0.3, concrete, true);
  box(22, 2.3, 4, 0.3, 4.6, 8, concrete, true);
  box(19, 2.3, 8, 6, 4.6, 0.3, concrete, true);
  box(16, 2.3, 1.3, 0.3, 4.6, 2.6, concrete, true);
  box(16, 2.3, 6.7, 0.3, 4.6, 2.6, concrete, true);
  box(16, 4, 4, 0.3, 1.2, 2.8, steel);
  box(19, 4.7, 4, 6.6, 0.22, 8.6, steel);
  lamp(18.5, 4.45, 4, true);
  sign(
    'SERVICE / 02',
    15.81,
    3.9,
    4,
    2.6,
    0.48,
    '#cbe0d9',
    '#163036',
    -Math.PI / 2,
  );
  for (let z = 1; z < 8; z += 1.4) {
    box(21.7, 1.2, z, 0.6, 2.3, 0.8, steel);
    box(21.36, 1.65, z, 0.04, 0.45, 0.55, cyan);
  }
  function container(
    x: number,
    z: number,
    w: number,
    d: number,
    mat: THREE.Material,
    label: string,
  ) {
    box(x, 1.45, z, w, 2.9, d, mat, true);
    box(x, 2.95, z, w + 0.16, 0.15, d + 0.16, steel);
    for (const side of [-1, 1]) {
      for (let xx = -w / 2 + 0.15; xx < w / 2; xx += 0.3)
        box(x + xx, 1.45, z + side * (d / 2 + 0.025), 0.055, 2.68, 0.075, mat);
      box(x, 0.14, z + (side * d) / 2, w, 0.16, 0.16, steel);
      box(x, 2.75, z + (side * d) / 2, w, 0.1, 0.15, steel);
    }
    for (const xx of [-w / 2, w / 2])
      for (const zz of [-d / 2, d / 2])
        box(x + xx, 1.46, z + zz, 0.15, 2.95, 0.15, edge);
    for (const xx of [-w * 0.25, w * 0.25]) {
      box(x + xx, 1.45, z + d / 2 + 0.075, 0.045, 2.6, 0.09, edge);
      box(x + xx, 1.3, z + d / 2 + 0.16, 0.35, 0.05, 0.08, steel);
    }
    sign(
      label,
      x,
      2.05,
      z + d / 2 + 0.12,
      w * 0.7,
      0.48,
      '#d8ddd0',
      mat === rust ? '#65452f' : '#295154',
    );
  }
  container(-8, 3, 6, 3, teal, 'NR // 084');
  container(7, -3, 6, 3, rust, 'CARGO 37');
  container(-17, -5, 5, 8, teal, 'RELAY LOGISTICS');
  // Cargo-side electrical distribution cabinet, vents, meter and cable reel.
  box(-5.35, 1.05, 4.66, 0.8, 1.7, 0.28, steel);
  box(-5.35, 1.09, 4.82, 0.69, 1.52, 0.045, edge);
  box(-5.35, 1.53, 4.86, 0.32, 0.22, 0.035, dark);
  box(-5.35, 1.53, 4.885, 0.22, 0.09, 0.014, cyan);
  for (let y = 0.5; y < 1.1; y += 0.11)
    box(-5.35, y, 4.86, 0.5, 0.026, 0.025, dark);
  box(-5.06, 1.17, 4.88, 0.035, 0.16, 0.035, dark);
  pipe(
    new THREE.Vector3(-5.6, 1.85, 4.7),
    new THREE.Vector3(-5.6, 2.75, 4.7),
    0.028,
    edge,
  );
  sign('HIGH VOLTAGE', -5.35, 1.28, 4.889, 0.52, 0.13, '#efbc59');
  for (const x of [-10.1, -5.9]) lamp(x, 2.55, 4.66);
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.42, 20),
    dark,
  );
  reel.rotation.z = Math.PI / 2;
  reel.position.set(-10.3, 0.4, 5);
  reel.castShadow = true;
  scene.add(reel);
  targets.push(reel);
  for (const x of [-10.55, -10.05]) {
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.055, 20),
      rust,
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, 0.46, 5);
    scene.add(rim);
  }
  // Two compact unshadowed pools connect the visible practicals to the scene.
  const workLight = new THREE.PointLight('#ffc17c', 13, 7, 2);
  workLight.position.set(-7, 2.6, 5.2);
  scene.add(workLight);
  const serviceLight = new THREE.PointLight('#8cdad7', 10, 7, 2);
  serviceLight.position.set(17, 3.4, 4);
  scene.add(serviceLight);
  // Low armored cover has end caps, steel brackets and identification stripes.
  for (const [x, z, w] of [
    [-4, -5, 3],
    [5, 6, 3],
    [-16, 11, 4],
    [10, -9, 3],
    [1, -9, 2],
  ] as number[][]) {
    box(x, 0.65, z, w, 1.3, 1, concrete, true);
    box(x, 1.32, z, w + 0.12, 0.12, 1.08, edge);
    for (const side of [-1, 1]) {
      box(x + side * (w / 2 - 0.15), 0.65, z, 0.18, 1.38, 1.07, steel);
      box(x, 0.84, z + side * 0.515, w - 0.7, 0.13, 0.018, paint);
    }
  }
  // West pipe rack and tanks: flanged, banded and connected machinery.
  for (const x of [-20, -18.1]) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 3, 20),
      rust,
    );
    tank.position.set(x, 1.65, 15);
    tank.castShadow = true;
    scene.add(tank);
    targets.push(tank);
    obstacles.push({
      minX: x - 0.75,
      maxX: x + 0.75,
      minZ: 14.25,
      maxZ: 15.75,
      height: 3.2,
    });
    for (const y of [0.45, 2.8]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.71, 0.045, 5, 20),
        edge,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, 15);
      scene.add(ring);
    }
    pipe(
      new THREE.Vector3(x, 3.1, 15),
      new THREE.Vector3(x, 4.4, 15),
      0.12,
      edge,
    );
    pipe(
      new THREE.Vector3(x, 4.4, 15),
      new THREE.Vector3(x, 4.4, -7),
      0.12,
      edge,
    );
  }
  for (const z of [-7, 3, 13]) {
    box(-19, 4.1, z, 5, 0.17, 0.17, steel);
    for (const x of [-21.3, -16.7])
      box(x, 2.05, z, 0.14, 4.1, 0.14, steel, true);
  }
  // Background antenna mast is outside the play space and silhouetted against sky.
  const towerX = 13,
    towerZ = -27;
  for (const dx of [-1, 1])
    for (const dz of [-1, 1])
      pipe(
        new THREE.Vector3(towerX + dx, 0, towerZ + dz),
        new THREE.Vector3(towerX + dx * 0.28, 20, towerZ + dz * 0.28),
        0.11,
        steel,
      );
  for (let y = 2; y < 20; y += 2) {
    for (const dz of [-1, 1])
      pipe(
        new THREE.Vector3(towerX - 1, y, towerZ + dz),
        new THREE.Vector3(towerX + 1, y + 2, towerZ + dz),
        0.065,
        edge,
      );
    box(towerX, y, towerZ, 2.15, 0.08, 2.15, steel);
  }
  for (const [x, y] of [
    [-1.1, 13],
    [1.1, 17],
  ]) {
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, 0, 0.9),
      white,
    );
    dish.position.set(towerX + x, y, towerZ);
    dish.rotation.x = Math.PI / 2;
    scene.add(dish);
    pipe(new THREE.Vector3(towerX, y, towerZ), dish.position, 0.08, steel);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), amber);
  beacon.position.set(towerX, 20.2, towerZ);
  scene.add(beacon);
  for (const x of [-13, 13]) {
    box(x, 5, 14, 0.18, 10, 0.18, steel, true);
    pipe(
      new THREE.Vector3(x, 9.8, 14),
      new THREE.Vector3(x * 0.8, 9.8, 14),
      0.08,
    );
    lamp(x * 0.8, 9.8, 14);
  }
  for (const z of [-9, 12]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(
        new THREE.Vector3(-23 + t * 46, 8.5 - Math.sin(t * Math.PI) * 2, z),
      );
    }
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        24,
        0.024,
        4,
        false,
      ),
      dark,
    );
    scene.add(cable);
  }
  sign('RELAY NINE', -12, 2.2, 21.68, 8, 1.2, '#d2b478', '#213239', Math.PI);
  sign('EXTRACTION', 0, 2.1, -21.65, 5, 0.8, '#a5ece2');
  for (const x of [-2.5, 2.5]) {
    box(x, 0.02, -18, 0.08, 0.03, 4, cyan);
    box(x, 1, -20, 0.12, 2, 0.12, steel);
    box(x, 1.9, -20, 0.16, 0.12, 0.16, cyan);
  }
  box(0, 0.02, -20, 5, 0.03, 0.08, cyan);
  box(0, 0.02, -16, 5, 0.03, 0.08, cyan);
  // Merge all repeated box detail into one instanced draw per material.
  for (const [mat, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(cube, mat, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
    targets.push(mesh);
  }
  return { obstacles, targets, extraction: new THREE.Vector3(0, 0, -18) };
}
