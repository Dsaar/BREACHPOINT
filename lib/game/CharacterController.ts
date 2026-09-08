import * as THREE from 'three';
export type Obstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
};
export function makeClips(root: THREE.Object3D, source: THREE.AnimationClip) {
  const idle = source.clone();
  idle.name = 'Idle';
  // Remove horizontal root motion from the uploaded ready stance.
  idle.tracks.forEach((t) => {
    if (t.name.includes('Hips') && t.name.endsWith('.position'))
      for (let i = 0; i < t.values.length; i += 3) {
        t.values[i] = 0;
        t.values[i + 2] = 0;
      }
  });
  const clips = [idle];
  for (const [name, duration, amplitude] of [
    ['Walk', 1, 0.42],
    ['Run', 0.65, 0.72],
  ] as const) {
    const tracks = idle.tracks.map((t) => t.clone());
    for (const t of tracks) {
      const prop = t.name.slice(t.name.lastIndexOf('.') + 1);
      const node = root.getObjectByName(
        t.name.slice(0, t.name.lastIndexOf('.')),
      );
      if (!node) continue;
      const times = Array.from({ length: 33 }, (_, i) => (i / 32) * duration);
      const values: number[] = [];
      for (let i = 0; i < 33; i++) {
        const phase = (i / 32) * Math.PI * 2;
        const side = node.name.includes('Left') ? 1 : -1;
        if (prop === 'quaternion') {
          const q = new THREE.Quaternion().fromArray(t.values, 0);
          let angle = 0;
          if (node.name.includes('UpLeg')) {
            q.copy(node.quaternion);
            angle = side * Math.sin(phase) * amplitude;
          } else if (/(Left|Right)Leg/.test(node.name)) {
            q.copy(node.quaternion);
            angle = -Math.max(0, side * Math.sin(phase)) * amplitude * 1.35;
          } else if (/(Left|Right)Foot/.test(node.name)) {
            q.copy(node.quaternion);
            angle =
              -side * Math.sin(phase) * amplitude +
              Math.max(0, side * Math.sin(phase)) * amplitude * 1.35;
          } else if (node.name.includes('Spine'))
            angle = 0.025 * Math.sin(phase * 2);
          q.multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0),
              angle,
            ),
          );
          values.push(q.x, q.y, q.z, q.w);
        } else if (prop === 'position') {
          values.push(
            t.values[0],
            node.name.includes('Hips')
              ? node.position.y + Math.sin(phase * 2) * 0.07
              : t.values[1],
            t.values[2],
          );
        } else values.push(...Array.from(t.values.slice(0, 3)));
      }
      t.times = new Float32Array(times);
      t.values = new Float32Array(values);
    }
    clips.push(new THREE.AnimationClip(name, duration, tracks));
  }
  return clips;
}
export class CharacterController {
  position = new THREE.Vector3(0, 0, 12);
  velocity = new THREE.Vector3();
  keys = new Set<string>();
  yaw = 0;
  pitch = 0;
  grounded = true;
  state = 'Idle';
  sprint = false;
  enabled = false;
  thirdPerson = false;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction> = {};
  radius = 0.36;
  verticalSpeed = 0;
  distance = 0;
  private previous = new THREE.Vector3();
  private footPosition = new THREE.Vector3();
  private feet: THREE.Object3D[] = [];
  private jumpConsumed = false;
  private direction = new THREE.Vector3();
  private targetQ = new THREE.Quaternion();
  constructor(
    public model: THREE.Object3D,
    public clips: THREE.AnimationClip[],
    public obstacles: Obstacle[],
  ) {
    this.mixer = new THREE.AnimationMixer(model);
    clips.forEach((c) => (this.actions[c.name] = this.mixer.clipAction(c)));
    this.actions.Idle.play();
    model.traverse((o) => {
      if (/(Left|Right)Foot/.test(o.name) && o.type === 'Bone')
        this.feet.push(o);
    });
    model.rotation.y = Math.PI;
  }
  setState(state: string) {
    if (state === this.state) return;
    const prev = this.actions[this.state];
    this.state = state;
    this.actions[state].reset().play();
    prev.crossFadeTo(this.actions[state], 0.22, false);
  }
  move(position: THREE.Vector3, dx: number, dz: number, r = this.radius) {
    for (const axis of ['x', 'z'] as const) {
      position[axis] += axis === 'x' ? dx : dz;
      for (const b of this.obstacles) {
        if (position.y >= b.height) continue;
        if (
          position.x > b.minX - r &&
          position.x < b.maxX + r &&
          position.z > b.minZ - r &&
          position.z < b.maxZ + r
        ) {
          const d = axis === 'x' ? dx : dz;
          if (d > 0) position[axis] = (axis === 'x' ? b.minX : b.minZ) - r;
          else if (d < 0) position[axis] = (axis === 'x' ? b.maxX : b.maxZ) + r;
        }
      }
    }
  }
  update(dt: number) {
    const k = this.keys;
    const x = this.enabled
      ? Number(k.has('KeyD') || k.has('ArrowRight')) -
        Number(k.has('KeyA') || k.has('ArrowLeft'))
      : 0;
    const z = this.enabled
      ? Number(k.has('KeyS') || k.has('ArrowDown')) -
        Number(k.has('KeyW') || k.has('ArrowUp'))
      : 0;
    this.sprint =
      this.enabled && (k.has('ShiftLeft') || k.has('ShiftRight')) && !!(x || z);
    this.direction
      .set(x, 0, z)
      .normalize()
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    const speed = this.sprint ? 6.2 : 3.5;
    this.velocity.lerp(
      this.direction.multiplyScalar(speed),
      1 - Math.exp(-14 * dt),
    );
    this.previous.copy(this.position);
    this.move(this.position, this.velocity.x * dt, this.velocity.z * dt);
    if (!k.has('Space')) this.jumpConsumed = false;
    if (this.enabled && k.has('Space') && this.grounded && !this.jumpConsumed) {
      this.verticalSpeed = 5;
      this.grounded = false;
      this.jumpConsumed = true;
    }
    this.verticalSpeed -= 16 * dt;
    this.position.y += this.verticalSpeed * dt;
    let floor = 0;
    for (const b of this.obstacles) {
      if (
        this.position.x > b.minX - this.radius * 0.5 &&
        this.position.x < b.maxX + this.radius * 0.5 &&
        this.position.z > b.minZ - this.radius * 0.5 &&
        this.position.z < b.maxZ + this.radius * 0.5 &&
        this.previous.y >= b.height - 0.02 &&
        this.position.y <= b.height
      )
        floor = Math.max(floor, b.height);
    }
    if (this.position.y <= floor) {
      this.position.y = floor;
      this.verticalSpeed = 0;
      this.grounded = true;
    }
    const travel = Math.hypot(
      this.position.x - this.previous.x,
      this.position.z - this.previous.z,
    );
    const moving = travel > dt * 0.15;
    this.setState(moving ? (this.sprint ? 'Run' : 'Walk') : 'Idle');
    if (moving) {
      this.targetQ.setFromAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        Math.atan2(this.velocity.x, this.velocity.z),
      );
      this.model.quaternion.slerp(this.targetQ, 1 - Math.exp(-13 * dt));
    }
    this.model.position.copy(this.position);
    this.distance += travel;
    this.mixer.update(dt);
    this.model.updateMatrixWorld(true);
    let lowest = Infinity;
    for (const foot of this.feet) {
      foot.getWorldPosition(this.footPosition);
      lowest = Math.min(lowest, this.footPosition.y);
    }
    if (Number.isFinite(lowest))
      this.model.position.y += this.position.y + 0.085 - lowest;
  }
}
