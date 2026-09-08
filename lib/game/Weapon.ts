import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export class Weapon {
  group = new THREE.Group();
  flash = new THREE.Group();
  light = new THREE.PointLight('#ffbd63', 0, 4);
  index = 0;
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
    return this.index === 0 ? 'VXR-30 / CARBINE' : 'K-12 / SIDEARM';
  }
  constructor(public camera: THREE.Camera) {
    camera.add(this.group);
    this.construct();
  }
  construct() {
    const materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material)
        for (const mat of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material])
          materials.add(mat);
    });
    materials.forEach((m) => m.dispose());
    this.group.clear();
    const dark = new THREE.MeshStandardMaterial({
      color: '#202b30',
      metalness: 0.45,
      roughness: 0.4,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: '#63716b',
      metalness: 0.5,
      roughness: 0.45,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: '#101618',
      roughness: 0.95,
    });
    const lime = new THREE.MeshStandardMaterial({
      color: '#bbd456',
      emissive: '#57621b',
      emissiveIntensity: 0.35,
    });
    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat = dark,
    ) => {
      const m = new THREE.Mesh(
        new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.12),
        mat,
      );
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };
    const cylinder = (
      x: number,
      y: number,
      z: number,
      r: number,
      len: number,
      mat = dark,
    ) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };
    if (this.index === 0) {
      box(0, 0, 0, 0.115, 0.14, 0.43);
      box(0, 0.01, -0.36, 0.1, 0.11, 0.35, trim);
      box(0, -0.04, 0.29, 0.1, 0.16, 0.24, rubber);
      box(0, -0.035, 0.4, 0.14, 0.2, 0.08, trim);
      box(0, -0.15, 0.02, 0.08, 0.21, 0.11, rubber).rotation.x = -0.23;
      box(0, -0.17, -0.14, 0.07, 0.25, 0.12, trim).rotation.x = 0.16;
      cylinder(0, 0.015, -0.64, 0.026, 0.28);
      cylinder(0, 0.015, -0.79, 0.034, 0.08);
      box(0, 0.095, -0.08, 0.085, 0.04, 0.59);
      for (let i = 0; i < 14; i++)
        box(0, 0.12, 0.13 - i * 0.038, 0.11, 0.016, 0.016, trim);
      for (let i = 0; i < 6; i++) {
        box(0.054, 0.012, -0.23 - i * 0.042, 0.008, 0.05, 0.019, rubber);
        box(-0.054, 0.012, -0.23 - i * 0.042, 0.008, 0.05, 0.019, rubber);
      }
      box(0, 0.17, 0.035, 0.022, 0.08, 0.023, trim);
      box(-0.033, 0.19, 0.035, 0.016, 0.07, 0.025);
      box(0.033, 0.19, 0.035, 0.016, 0.07, 0.025);
      box(0, 0.226, 0.035, 0.075, 0.013, 0.025);
      box(0, 0.164, -0.55, 0.012, 0.055, 0.02, lime);
      box(0.061, 0, 0.075, 0.008, 0.035, 0.07, trim);
      box(0.064, 0.031, -0.03, 0.012, 0.035, 0.038, lime);
    } else {
      box(0, 0.02, -0.08, 0.1, 0.115, 0.3, trim);
      box(0, -0.11, 0.03, 0.085, 0.19, 0.1, rubber).rotation.x = -0.2;
      box(0, 0.088, 0.02, 0.055, 0.02, 0.025);
      box(0, 0.085, -0.2, 0.012, 0.025, 0.016, lime);
      cylinder(0, 0.025, -0.255, 0.024, 0.07);
    }
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
    this.flash.position.set(0, 0.015, this.index === 0 ? -0.92 : -0.39);
    this.group.add(this.flash);
    this.flash.add(this.light);
    this.flash.visible = false;
    this.group.position.set(0.24, -0.23, -0.44);
  }
  switch(index: number) {
    if (this.reloadTime || index === this.index) return;
    this.index = index;
    this.recoil = 0.15;
    this.construct();
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
      new THREE.Vector3(
        this.aim ? 0.025 : 0.24,
        (this.aim ? -0.16 : -0.23) + bob - (this.reloadTime ? 0.17 : 0),
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
