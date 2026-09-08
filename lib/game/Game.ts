import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Enemies } from './Enemies';
import { Weapon } from './Weapon';
import { Effects } from './Effects';
import { buildEnvironment } from './Environment';
import {
  CharacterController,
  makeClips,
  type Obstacle,
} from './CharacterController';
export type GameState = {
  loaded: boolean;
  active: boolean;
  fps: number;
  qa?: boolean;
  health?: number;
  ammo?: number;
  reserve?: number;
  weapon?: string;
  state?: string;
  reloading?: boolean;
  kills?: number;
  enemies?: number;
  time?: number;
  ended?: string;
  notice?: string;
  error?: string;
  clips?: string[];
  status?: string;
  drawCalls?: number;
  triangles?: number;
  textures?: number;
};
export class Game {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(76, 1, 0.07, 160);
  renderer: THREE.WebGLRenderer;
  lastTime = performance.now();
  frameTime = performance.now();
  player!: CharacterController;
  obstacles: Obstacle[] = [];
  raf = 0;
  disposed = false;
  active = false;
  loaded = false;
  fps = 0;
  frames = 0;
  elapsed = 0;
  targets: THREE.Object3D[] = [];
  extraction = new THREE.Vector3();
  worldBox = new THREE.Box3();
  worldPoint = new THREE.Vector3();
  worldHit(ray: THREE.Raycaster) {
    let distance = ray.far,
      point: THREE.Vector3 | undefined,
      object: THREE.Object3D | undefined;
    for (const b of this.obstacles) {
      this.worldBox.min.set(b.minX, 0, b.minZ);
      this.worldBox.max.set(b.maxX, b.height, b.maxZ);
      if (ray.ray.intersectBox(this.worldBox, this.worldPoint)) {
        const d = this.worldPoint.distanceTo(ray.ray.origin);
        if (d < distance) {
          distance = d;
          point = this.worldPoint.clone();
        }
      }
    }
    const ground = ray.ray.intersectPlane(
      new THREE.Plane(THREE.Object3D.DEFAULT_UP, 0),
      this.worldPoint,
    );
    if (ground) {
      const d = ground.distanceTo(ray.ray.origin);
      if (d < distance) {
        distance = d;
        point = ground.clone();
      }
    }
    for (const barrel of this.barrels) {
      if (!barrel.visible) continue;
      const h = ray.intersectObject(barrel, false)[0];
      if (h && h.distance < distance) {
        distance = h.distance;
        point = h.point;
        object = barrel;
      }
    }
    return point ? { distance, point, object } : undefined;
  }
  cameraRay = new THREE.Raycaster();
  weapon: Weapon;
  effects: Effects;
  bodyClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.02);
  playerMaterials: THREE.Material[] = [];
  deployed = false;
  enemies?: Enemies;
  health = 100;
  kills = 0;
  damageFlash = 0;
  hitFlash = 0;
  lastDamage = 0;
  roundTime = 0;
  lastStep = 0;
  ended = '';
  barrels: THREE.Mesh[] = [];
  trigger = false;
  shotRay = new THREE.Raycaster();
  constructor(
    public container: HTMLElement,
    public report: (s: Partial<GameState>) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.03).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environmentIntensity = 0.22;
    this.scene.background = new THREE.Color('#18272e');
    this.scene.fog = new THREE.FogExp2('#18272e', 0.021);
    this.scene.add(new THREE.HemisphereLight('#b4d5df', '#31312c', 1.4));
    const sun = new THREE.DirectionalLight('#ffdbab', 2.2);
    sun.position.set(-12, 22, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -30,
      right: 30,
      top: 30,
      bottom: -30,
      far: 70,
    });
    sun.shadow.bias = -0.0003;
    sun.shadow.camera.layers.enable(1);
    this.scene.add(sun);
    const level = buildEnvironment(this.scene);
    this.obstacles = level.obstacles;
    this.targets = level.targets;
    this.extraction = level.extraction;
    for (const [x, y, z, color, intensity] of [
      [-8, 3.2, -10, 0xffad60, 16],
      [8, 3.2, -10, 0xffad60, 16],
      [18.5, 3.8, 4, 0x64ddd8, 20],
      [0, 4, -13, 0xffbc77, 16],
    ] as number[][]) {
      const light = new THREE.PointLight(color, intensity, 12, 2);
      light.position.set(x, y, z);
      this.scene.add(light);
    }
    this.scene.add(this.camera);
    const fill = new THREE.PointLight(0xd3e4ea, 2, 2);
    fill.position.set(-0.3, 0.3, -0.1);
    this.camera.add(fill);
    this.weapon = new Weapon(this.camera);
    this.effects = new Effects(this.scene);
    for (const [x, z] of [
      [-3, -2],
      [13, -7],
    ]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.9, 16),
        new THREE.MeshStandardMaterial({
          color: '#9c472c',
          metalness: 0.65,
          roughness: 0.45,
        }),
      );
      barrel.position.set(x, 0.45, z);
      barrel.castShadow = true;
      barrel.userData.explosive = true;
      this.scene.add(barrel);
      this.barrels.push(barrel);
      this.targets.push(barrel);
      for (const y of [-0.3, 0.3]) {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.325, 0.025, 5, 16),
          new THREE.MeshStandardMaterial({
            color: '#dab864',
            metalness: 0.5,
            roughness: 0.4,
          }),
        );
        band.rotation.x = Math.PI / 2;
        band.position.y = y;
        barrel.add(band);
      }
    }
    document.addEventListener('mousedown', this.mousedown);
    document.addEventListener('mouseup', this.mouseup);
    document.addEventListener('contextmenu', this.contextmenu);
    this.camera.position.set(0, 1.65, 12);
    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('keydown', this.keydown);
    document.addEventListener('keyup', this.keyup);
    document.addEventListener('mousemove', this.mousemove);
    document.addEventListener('pointerlockchange', this.lockchange);
    window.addEventListener('blur', this.blur);
    void this.load();
    this.tick();
  }

  async load() {
    try {
      const [gltf] = await Promise.all([
        new GLTFLoader().loadAsync('/models/Soldier.glb'),
        this.weapon.load(),
      ]);
      if (this.disposed) return;
      if (!gltf.animations.length)
        throw new Error('Soldier has no animation clips');
      const model = gltf.scene;
      const size = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      model.scale.multiplyScalar(1.82 / size.y);
      this.weapon.attachArms(model, gltf.animations[0]);
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.layers.set(1);
        }
      });
      this.scene.add(model);
      const clips = makeClips(model, gltf.animations[0]);
      this.player = new CharacterController(model, clips, this.obstacles);
      this.enemies = new Enemies(
        this.scene,
        model,
        clips,
        this.obstacles,
        this.targets,
        this.weapon.models[0],
      );
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const cloneMaterial = (mat: THREE.Material) => {
            const copy = mat.clone();
            this.playerMaterials.push(copy);
            return copy;
          };
          m.material = Array.isArray(m.material)
            ? m.material.map(cloneMaterial)
            : cloneMaterial(m.material);
        }
      });
      this.enemies.onShot = (from, to) => {
        this.effects.tracer(from, to, '#ff7661');
      };
      this.player.position.set(1.8, 0, 8.7);
      this.player.model.rotation.y = 0.25;
      this.camera.layers.enable(1);
      // Upload both cached weapon textures and compile their materials before play.
      const textures = new Set<THREE.Texture>();
      this.weapon.group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.material)
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) textures.add(value);
      });
      textures.forEach((texture) => this.renderer.initTexture(texture));
      this.weapon.group.visible = true;
      this.renderer.compile(this.scene, this.camera);
      this.weapon.group.visible = false;
      if (this.disposed) return;
      this.loaded = true;
      this.report({
        loaded: true,
        clips: clips.map((c) => c.name),
        status: 'READY TO DEPLOY',
      });
    } catch (e) {
      if (this.disposed) return;
      console.error(e);
      this.report({
        error: 'An operator or weapon asset failed to load. Reload to retry.',
      });
    }
  }
  async start() {
    if (!this.loaded) return;
    if (this.ended) this.reset();
    if (!this.deployed) {
      this.player.position.set(0, 0, 12);
      this.player.model.rotation.y = Math.PI;
      this.camera.layers.enable(1);
      this.deployed = true;
    }
    this.active = true;
    this.player.enabled = true;
    this.weapon.unlockAudio();
    this.report({ active: true });
    try {
      await this.renderer.domElement.requestPointerLock();
    } catch {
      this.report({
        notice: 'Pointer lock unavailable. Drag to look; Esc pauses.',
      });
    }
  }
  resize = () => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  };
  keydown = (e: KeyboardEvent) => {
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        e.code,
      )
    )
      e.preventDefault();
    this.player?.keys.add(e.code);
    if (this.active) {
      if (e.code === 'KeyR') this.weapon.reload();
      if (e.code === 'Digit1') this.weapon.switch(0);
      if (e.code === 'Digit2') this.weapon.switch(1);
      if (['KeyR', 'Digit1', 'Digit2'].includes(e.code))
        this.report({
          weapon: this.weapon.name,
          ammo: this.weapon.ammo,
          reserve: this.weapon.reserve,
          reloading: this.weapon.reloadTime > 0,
        });
      if (e.code === 'KeyM') this.weapon.muted = !this.weapon.muted;
    }
    if (e.code === 'Escape') {
      this.active = false;
      if (this.player) this.player.enabled = false;
      this.trigger = false;
      this.weapon.aim = false;
      this.report({ active: false });
    }
    if (e.code === 'KeyV' && !e.repeat && this.player) {
      this.player.thirdPerson = !this.player.thirdPerson;
      this.camera.layers.enable(1);
    }
  };
  keyup = (e: KeyboardEvent) => {
    this.player?.keys.delete(e.code);
  };
  mousemove = (e: MouseEvent) => {
    if (
      !this.active ||
      !this.player ||
      (!document.pointerLockElement && !e.buttons)
    )
      return;
    this.player.yaw -= e.movementX * 0.002;
    this.player.pitch = THREE.MathUtils.clamp(
      this.player.pitch - e.movementY * 0.002,
      -1.4,
      1.4,
    );
  };
  mousedown = (e: MouseEvent) => {
    if (!this.active) return;
    if (e.button === 0) {
      this.trigger = true;
      this.fire();
    }
    if (e.button === 2) this.weapon.aim = true;
  };
  mouseup = (e: MouseEvent) => {
    if (e.button === 0) this.trigger = false;
    if (e.button === 2) this.weapon.aim = false;
  };
  contextmenu = (e: Event) => {
    if (this.active) e.preventDefault();
  };
  fire() {
    if (!this.active || this.ended || !this.weapon.shoot()) return;
    this.report({ ammo: this.weapon.ammo, reserve: this.weapon.reserve });
    this.scene.updateMatrixWorld(true);
    this.player.pitch = Math.min(1.4, this.player.pitch + 0.012);
    this.shotRay.setFromCamera(new THREE.Vector2(), this.camera);
    this.shotRay.far = 100;
    const wall = this.worldHit(this.shotRay);
    const hit = this.enemies?.hit(
      this.shotRay,
      wall?.distance ?? 100,
      this.weapon.index === 0 ? 34 : 48,
    );
    const end =
      hit?.point ?? wall?.point ?? this.shotRay.ray.at(80, new THREE.Vector3());
    if (hit) {
      this.hitFlash = 0.16;
      this.effects.spawn(end, '#bde479', 12);
      this.weapon.sound('hit');
      if (hit.killed) {
        this.kills++;
        this.report({
          kills: this.kills,
          notice: this.enemies?.alive
            ? 'HOSTILE NEUTRALIZED'
            : 'STATION CLEAR — REACH EXTRACTION',
        });
      }
    } else if (wall) {
      this.effects.spawn(end, '#e5caa1', 12);
      if (wall.object?.userData.explosive)
        this.explode(wall.object as THREE.Mesh);
    }
    const muzzle = this.weapon.flash.getWorldPosition(new THREE.Vector3());
    this.effects.tracer(muzzle, end);
    this.effects.spawn(muzzle, '#7a8588', 3, 0.15, true);
    this.effects.eject(
      this.weapon.group.getWorldPosition(new THREE.Vector3()),
      this.player.yaw,
    );
    this.enemies?.alert(this.player.position);
  }
  damage = (amount: number) => {
    if (this.ended || !this.active) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamage = this.roundTime;
    this.damageFlash = 0.65;
    this.report({ health: this.health });
    if (!this.health) this.finish('OPERATOR DOWN');
  };
  finish(result: string) {
    this.ended = result;
    this.active = false;
    this.player.enabled = false;
    this.player.keys.clear();
    this.trigger = false;
    document.exitPointerLock();
    this.report({
      active: false,
      ended: result,
      kills: this.kills,
      time: Math.round(this.roundTime),
    });
  }
  reset() {
    this.health = 100;
    this.kills = 0;
    this.roundTime = 0;
    this.lastDamage = 0;
    this.ended = '';
    this.player.position.set(0, 0, 12);
    this.player.velocity.set(0, 0, 0);
    this.player.verticalSpeed = 0;
    this.player.yaw = 0;
    this.player.pitch = 0;
    this.player.thirdPerson = false;
    this.camera.layers.enable(1);
    this.weapon.magazines = [30, 12];
    this.weapon.reserves = [150, 60];
    this.weapon.reloadTime = 0;
    this.weapon.cooldown = 0;
    this.weapon.switch(0);
    this.weapon.recoil = 0;
    this.weapon.aim = false;
    this.trigger = false;
    this.damageFlash = 0;
    this.hitFlash = 0;
    this.enemies?.reset();
    for (const barrel of this.barrels) {
      barrel.visible = true;
      if (!this.targets.includes(barrel)) this.targets.push(barrel);
    }
    this.report({
      health: 100,
      kills: 0,
      ended: '',
      notice: '',
      weapon: this.weapon.name,
      ammo: this.weapon.ammo,
      reserve: this.weapon.reserve,
      reloading: false,
    });
  }
  explode(barrel: THREE.Mesh) {
    if (!barrel.visible) return;
    const point = barrel.position.clone();
    barrel.visible = false;
    this.targets = this.targets.filter((o) => o !== barrel);
    if (this.enemies) this.enemies.targets = this.targets;
    this.effects.spawn(point, '#ffb445', 60, 8);
    this.effects.spawn(point, '#647076', 1, 1, true);
    this.weapon.sound('explosion');
    const distance = this.player.position.distanceTo(point);
    if (distance < 5) this.damage(Math.round(50 * (1 - distance / 5)));
    this.kills += this.enemies?.blast(point, 6, 160) ?? 0;
    this.report({ kills: this.kills });
  }

  blur = () => {
    this.player?.keys.clear();
    this.trigger = false;
    this.weapon.aim = false;
    if (this.active) {
      this.active = false;
      if (this.player) this.player.enabled = false;
      document.exitPointerLock();
      this.report({ active: false });
    }
  };
  lockchange = () => {
    this.active = document.pointerLockElement === this.renderer.domElement;
    if (this.player) {
      this.player.enabled = this.active;
      this.player.keys.clear();
    }
    this.report({ active: this.active });
  };
  tick = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.04);
    this.lastTime = now;
    if (this.player) {
      const clipBody = this.deployed && !this.player.thirdPerson;
      this.bodyClip.constant = this.player.position.y + 1.02;
      for (const material of this.playerMaterials) {
        const wasClipped = !!material.clippingPlanes?.length;
        if (wasClipped !== clipBody) {
          material.clippingPlanes = clipBody ? [this.bodyClip] : [];
          material.needsUpdate = true;
        }
      }
      this.player.update(dt);
      if (this.active) {
        this.roundTime += dt;
        if (
          this.player.grounded &&
          this.player.distance - this.lastStep > 1.6
        ) {
          this.lastStep = this.player.distance;
          this.weapon.sound('step');
        }
        this.enemies?.update(dt, this.player.position, true, this.damage);
        if (this.health < 100 && this.roundTime - this.lastDamage > 8)
          this.health = Math.min(100, this.health + dt * 4);
        if (
          this.enemies?.alive === 0 &&
          this.player.position.distanceTo(this.extraction) < 2.5
        )
          this.finish('STATION SECURED');
      }
      if (this.active && this.trigger) this.fire();
      this.weapon.group.visible = this.active && !this.player.thirdPerson;
      this.weapon.update(
        this.active ? dt : 0,
        this.player.distance,
        this.player.state !== 'Idle',
        this.player.sprint,
      );
      this.camera.fov = THREE.MathUtils.damp(
        this.camera.fov,
        this.weapon.aim ? 57 : this.player.sprint ? 81 : 76,
        10,
        dt,
      );
      this.camera.updateProjectionMatrix();
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);
      this.camera.position
        .copy(this.player.position)
        .add(new THREE.Vector3(0, 1.64, 0));
      if (this.player.thirdPerson) {
        const offset = new THREE.Vector3(0, 0.6, 3.5).applyAxisAngle(
          THREE.Object3D.DEFAULT_UP,
          this.player.yaw,
        );
        const length = offset.length();
        this.cameraRay.set(this.camera.position, offset.normalize());
        this.cameraRay.far = length;
        const hit = this.worldHit(this.cameraRay);
        this.camera.position.addScaledVector(
          offset,
          hit ? Math.max(0.15, hit.distance - 0.2) : length,
        );
      }
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.container.parentElement?.style.setProperty(
      '--damage',
      String(this.damageFlash),
    );
    this.container.dataset.hit = this.hitFlash > 0 ? 'true' : 'false';
    this.effects.update(this.active ? dt : 0);
    if (this.player && !this.deployed) {
      this.camera.position.set(0, 1.5, 12);
      this.camera.rotation.set(-0.04, 0, 0);
    }
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    this.elapsed += (now - this.frameTime) / 1000;
    this.frameTime = now;
    if (this.elapsed > 0.5) {
      this.fps = Math.round(this.frames / this.elapsed);
      this.frames = 0;
      this.elapsed = 0;
      this.container.dataset.stats = JSON.stringify({
        fps: this.fps,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        position: this.player?.position.toArray(),
        state: this.player?.state,
        clips: this.player?.clips.map((c) => c.name),
        weights: this.player
          ? Object.fromEntries(
              Object.entries(this.player.actions).map(([k, a]) => [
                k,
                a.getEffectiveWeight(),
              ]),
            )
          : {},
        enemies: this.enemies?.enemies.map((e) => ({
          state: e.state,
          health: e.health,
          position: e.position.toArray(),
        })),
      });
      this.report({
        fps: this.fps,
        state: this.player?.state,
        drawCalls: this.renderer.info.render.calls,
        ammo: this.weapon.ammo,
        reserve: this.weapon.reserve,
        weapon: this.weapon.name,
        reloading: this.weapon.reloadTime > 0,
        health: Math.round(this.health),
        kills: this.kills,
        enemies: this.enemies?.alive,
        time: Math.round(this.roundTime),
        triangles: this.renderer.info.render.triangles,
        textures: this.renderer.info.memory.textures,
      });
    }
  };
  dispose() {
    this.disposed = true;
    this.weapon.dispose();
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('keydown', this.keydown);
    document.removeEventListener('keyup', this.keyup);
    document.removeEventListener('mousemove', this.mousemove);
    document.removeEventListener('pointerlockchange', this.lockchange);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('mousedown', this.mousedown);
    document.removeEventListener('mouseup', this.mouseup);
    document.removeEventListener('contextmenu', this.contextmenu);
    void this.weapon.audio?.close();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) geometries.add(m.geometry);
      if (m.material)
        for (const mat of Array.isArray(m.material) ? m.material : [m.material])
          materials.add(mat);
    });
    for (const mat of materials) {
      for (const value of Object.values(mat))
        if (value instanceof THREE.Texture) textures.add(value);
      mat.dispose();
    }
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
