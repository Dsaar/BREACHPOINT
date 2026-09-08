import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export class Weapon {
  group = new THREE.Group();
  flash = new THREE.Group();
  light = new THREE.PointLight('#ffbd63', 0, 4);
  index = 0;
  models: THREE.Group[] = [];
  ready = false;
  disposed = false;
  private loadPromise?: Promise<void>;
  private targetPosition = new THREE.Vector3();
  private muzzleOffsets = [
    new THREE.Vector3(0, 0, -0.675),
    new THREE.Vector3(0, 0, -0.305),
  ];
  magazines = [30, 12];
  reserves = [150, 60];
  cooldown = 0;
  reloadTime = 0;
  recoil = 0;
  fired = false;
  aim = false;
  audio?: AudioContext;
  noise?: AudioBuffer;
  muted = false;
  get capacity() {
    return this.index === 0 ? 30 : 12;
  }
  get ammo() {
    return this.magazines[this.index];
  }
  get reserve() {
    return this.reserves[this.index];
  }
  get name() {
    return this.index === 0 ? 'CAR / SMG' : 'DESERT EAGLE / SIDEARM';
  }
  constructor(public camera: THREE.Camera) {
    camera.add(this.group);
    this.flash = new THREE.Group();
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#ffda8b',
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 4), flashMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (i * Math.PI) / 3;
      this.flash.add(m);
    }
    this.flash.position.copy(this.muzzleOffsets[this.index]);
    this.group.add(this.flash);
    this.light.position.copy(this.muzzleOffsets[this.index]);
    this.group.add(this.light);
    this.flash.visible = false;
    this.group.position.set(0.24, -0.23, -0.44);
  }
  load(): Promise<void> {
    this.loadPromise ??= (async () => {
      const results = await Promise.allSettled(
        ['/models/CAR.glb', '/models/DesertEagle.glb'].map((path) =>
          new GLTFLoader().loadAsync(path),
        ),
      );
      if (
        this.disposed ||
        results.some((result) => result.status === 'rejected')
      ) {
        for (const result of results)
          if (result.status === 'fulfilled') Weapon.release(result.value.scene);
        if (!this.disposed)
          throw new Error('Weapon model failed to load. Reload to retry.');
        return;
      }
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const model = result.value.scene;
        model.name =
          index === 0 ? 'CAR SMG — No.cccccc' : 'Desert Eagle — ELIZION';
        if (index === 1)
          model.traverse((node) => {
            if (/^Bullet(?:Case)?_low/.test(node.name)) node.visible = false;
          });
        const mount = new THREE.Group();
        mount.name = index === 0 ? 'CAR view model' : 'Desert Eagle view model';
        mount.add(model);
        mount.rotation.y = index === 0 ? -Math.PI / 2 : Math.PI;
        mount.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(mount),
          size = bounds.getSize(new THREE.Vector3()),
          center = bounds.getCenter(new THREE.Vector3());
        const scale = (index === 0 ? 0.82 : 0.3) / size.z;
        // Authored bore heights, measured from the uploaded model's world-space barrel.
        const boreHeight = index === 0 ? 24.939134 : 23.338537;
        mount.scale.setScalar(scale);
        mount.position.set(
          -center.x * scale,
          -boreHeight * scale,
          (index === 0 ? -0.25 : -0.14) - center.z * scale,
        );
        mount.visible = index === this.index;
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.frustumCulled = false;
          }
        });
        this.models.push(mount);
        this.group.add(mount);
      });
      this.ready = true;
    })();
    return this.loadPromise;
  }
  private static release(root: THREE.Object3D) {
    const materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material)
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material])
          materials.add(material);
    });
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
    textures.forEach((texture) => texture.dispose());
  }
  dispose() {
    this.disposed = true;
    this.ready = false;
  }
  switch(index: number) {
    if (this.reloadTime || index === this.index || (index !== 0 && index !== 1))
      return;
    this.index = index;
    this.recoil = 0.15;
    this.models.forEach((model, i) => {
      model.visible = i === index;
    });
    this.flash.position.copy(this.muzzleOffsets[index]);
    this.light.position.copy(this.muzzleOffsets[index]);
    this.sound('switch');
  }
  reload() {
    if (this.reloadTime || this.ammo === this.capacity || !this.reserve) return;
    this.reloadTime = this.index === 0 ? 1.8 : 1.35;
    this.sound('reload');
  }
  unlockAudio() {
    this.audio ??= new AudioContext();
    if (!this.noise) {
      this.noise = this.audio.createBuffer(
        1,
        this.audio.sampleRate * 0.2,
        this.audio.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    void this.audio.resume();
  }
  sound(kind: string) {
    if (!this.audio || this.muted) return;
    const ctx = this.audio,
      t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = kind === 'shot' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(
      kind === 'shot' ? 125 : kind === 'hit' ? 800 : kind === 'step' ? 65 : 220,
      t,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === 'shot' ? 35 : 110,
      t + 0.13,
    );
    gain.gain.setValueAtTime(
      kind === 'shot' ? 0.1 : kind === 'step' ? 0.025 : 0.045,
      t,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.start(t);
    osc.stop(t + 0.18);
    if (kind === 'shot' || kind === 'explosion') {
      const source = ctx.createBufferSource();
      source.buffer = this.noise ?? null;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'shot' ? 3500 : 500;
      source.connect(filter);
      filter.connect(gain);
      source.start();
    }
  }
  shoot() {
    if (this.cooldown > 0 || this.reloadTime) return false;
    if (!this.ammo) {
      this.reload();
      return false;
    }
    this.magazines[this.index]--;
    this.cooldown = this.index === 0 ? 0.105 : 0.22;
    this.recoil = Math.min(this.recoil + 0.065, 0.16);
    this.fired = true;
    this.sound('shot');
    return true;
  }
  update(dt: number, distance: number, moving: boolean, sprint: boolean) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadTime > 0) {
      this.reloadTime = Math.max(0, this.reloadTime - dt);
      if (!this.reloadTime) {
        const amount = Math.min(this.capacity - this.ammo, this.reserve);
        this.magazines[this.index] += amount;
        this.reserves[this.index] -= amount;
        this.sound('switch');
      }
    }
    this.recoil *= Math.exp(-13 * dt);
    const bob = moving
      ? Math.sin(distance * 2.8) * 0.009
      : Math.sin(performance.now() * 0.0018) * 0.002;
    this.group.position.lerp(
      this.targetPosition.set(
        this.aim ? 0 : 0.24,
        (this.aim ? (this.index === 0 ? -0.06 : -0.032) : -0.23) +
          bob -
          (this.reloadTime ? 0.17 : 0),
        -0.44 + this.recoil,
      ),
      1 - Math.exp(-18 * dt),
    );
    this.group.rotation.set(
      this.recoil * 1.3 + (this.reloadTime ? -0.6 : 0),
      sprint ? -0.35 : 0,
      this.reloadTime ? -0.45 : 0,
    );
    this.flash.visible = this.cooldown > (this.index === 0 ? 0.07 : 0.185);
    this.light.intensity = this.flash.visible ? 3 : 0;
  }
}
