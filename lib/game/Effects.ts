import * as THREE from 'three';
export class Effects {
  smokePool: { sprite: THREE.Sprite; life: number; p: THREE.Vector3 }[] = [];
  smokeCursor = 0;
  shellCursor = 0;
  shells: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  mesh: THREE.InstancedMesh;
  dummy = new THREE.Object3D();
  cursor = 0;
  particles = Array.from({ length: 180 }, () => ({
    p: new THREE.Vector3(),
    v: new THREE.Vector3(),
    life: 0,
    max: 1,
    size: 0.02,
    gravity: 8,
    smoke: false,
  }));
  constructor(scene: THREE.Scene) {
    const shellGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.036, 6);
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: '#d2aa53',
      metalness: 0.8,
      roughness: 0.3,
    });
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(shellGeometry, shellMaterial);
      mesh.visible = false;
      scene.add(mesh);
      this.shells.push({ mesh, velocity: new THREE.Vector3(), life: 0 });
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(155,168,172,.25)');
    gradient.addColorStop(0.4, 'rgba(120,133,140,.13)');
    gradient.addColorStop(1, 'rgba(90,108,115,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    for (let i = 0; i < 24; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        }),
      );
      sprite.visible = false;
      scene.add(sprite);
      this.smokePool.push({ sprite, life: 0, p: new THREE.Vector3() });
    }
    this.mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({ color: 'white' }),
      180,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    for (let i = 0; i < 180; i++) {
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
  }
  eject(point: THREE.Vector3, yaw: number) {
    const shell = this.shells[this.shellCursor++ % this.shells.length];
    shell.mesh.position.copy(point);
    shell.mesh.visible = true;
    shell.life = 2;
    shell.velocity
      .set(1.5, 1.1, 0.35)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  }
  spawn(
    point: THREE.Vector3,
    color: string,
    count = 10,
    force = 3,
    smoke = false,
  ) {
    if (smoke) {
      const puff = this.smokePool[this.smokeCursor++ % 24];
      puff.sprite.position.copy(point);
      puff.life = 1;
      puff.sprite.visible = true;
      return;
    }
    for (let j = 0; j < count; j++) {
      const i = this.cursor++ % 180,
        p = this.particles[i];
      p.p.copy(point);
      p.v.set(
        (Math.random() - 0.5) * force,
        Math.random() * force,
        (Math.random() - 0.5) * force,
      );
      p.life = p.max = smoke ? 1.2 : 0.3 + Math.random() * 0.6;
      p.size = smoke ? 0.04 : 0.012 + Math.random() * 0.02;
      p.gravity = smoke ? -0.2 : 8;
      p.smoke = smoke;
      this.mesh.setColorAt(i, new THREE.Color(color));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  tracer(from: THREE.Vector3, to: THREE.Vector3, color = '#fbd28b') {
    const delta = to.clone().sub(from);
    const n = Math.min(24, Math.ceil(delta.length() * 2));
    for (let k = 0; k < n; k++) {
      const i = this.cursor++ % 180,
        p = this.particles[i];
      p.p.copy(from).addScaledVector(delta, k / n);
      p.v.set(0, 0, 0);
      p.life = p.max = 0.055;
      p.size = 0.012;
      p.gravity = 0;
      p.smoke = false;
      this.mesh.setColorAt(i, new THREE.Color(color));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt: number) {
    for (const shell of this.shells) {
      shell.life = Math.max(0, shell.life - dt);
      shell.mesh.visible = shell.life > 0;
      if (!shell.life) continue;
      shell.velocity.y -= 9 * dt;
      shell.mesh.position.addScaledVector(shell.velocity, dt);
      if (shell.mesh.position.y < 0.018) {
        shell.mesh.position.y = 0.018;
        shell.velocity.y = Math.abs(shell.velocity.y) * 0.3;
        shell.velocity.x *= 0.8;
        shell.velocity.z *= 0.8;
      }
      shell.mesh.rotation.x += dt * 8;
      shell.mesh.rotation.z += dt * 5;
    }
    for (const puff of this.smokePool) {
      puff.life = Math.max(0, puff.life - dt);
      puff.sprite.visible = puff.life > 0;
      if (puff.life) {
        puff.sprite.position.y += dt * 0.14;
        puff.sprite.scale.setScalar(0.06 + (1 - puff.life) * 0.45);
        (puff.sprite.material as THREE.SpriteMaterial).opacity =
          puff.life * 0.55;
      }
    }
    for (let i = 0; i < 180; i++) {
      const p = this.particles[i];
      p.life = Math.max(0, p.life - dt);
      if (p.life) {
        p.v.y -= p.gravity * dt;
        p.p.addScaledVector(p.v, dt);
        if (p.p.y < 0.025) {
          p.p.y = 0.025;
          p.v.y *= -0.25;
          p.v.x *= 0.8;
          p.v.z *= 0.8;
        }
        this.dummy.position.copy(p.p);
        this.dummy.rotation.set(p.life * 4, p.life * 7, 0);
        this.dummy.scale.setScalar(
          p.size * (p.smoke ? 1 + (1 - p.life / p.max) * 4 : p.life / p.max),
        );
      } else this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
