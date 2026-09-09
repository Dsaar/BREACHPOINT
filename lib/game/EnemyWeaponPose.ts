import * as THREE from 'three';

/** Two-handed CAR pose layered over the Soldier's locomotion animation. */
export class EnemyWeaponPose {
  private chains: THREE.Bone[][];
  private frame = new THREE.Object3D();
  private grip = new THREE.Vector3();
  private start = new THREE.Vector3();
  private elbow = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private pole = new THREE.Vector3();
  private parentRotation = new THREE.Quaternion();
  private rotation = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);
  private lengths: number[][];
  readonly right: THREE.Bone;
  readonly left: THREE.Bone;
  private wrists = [
    new THREE.Vector3(0.018, -0.135, -0.005),
    new THREE.Vector3(-0.045, -0.075, -0.43),
  ];
  constructor(
    private model: THREE.Object3D,
    readonly socket: THREE.Group,
  ) {
    const bone = (name: string) => {
      let result: THREE.Bone | undefined;
      model.traverse((node) => {
        if (
          (node as THREE.Bone).isBone &&
          new RegExp(`${name}\\d`).test(node.name)
        )
          result = node as THREE.Bone;
      });
      if (!result) throw new Error(`Missing Soldier ${name}`);
      return result;
    };
    this.chains = ['Right', 'Left'].map((side) => [
      bone(`${side}Arm`),
      bone(`${side}ForeArm`),
      bone(`${side}Hand`),
    ]);
    [this.right, this.left] = this.chains.map((chain) => chain[2]);
    model.updateMatrixWorld(true);
    this.lengths = this.chains.map(([upper, fore, hand]) => [
      upper
        .getWorldPosition(this.start)
        .distanceTo(fore.getWorldPosition(this.elbow)),
      fore
        .getWorldPosition(this.start)
        .distanceTo(hand.getWorldPosition(this.elbow)),
    ]);
    this.update();
    this.right.add(socket);
    socket.matrix
      .copy(this.right.matrixWorld)
      .invert()
      .multiply(this.frame.matrixWorld);
    socket.matrix.decompose(socket.position, socket.quaternion, socket.scale);
  }
  update(target?: THREE.Vector3) {
    this.model.updateMatrixWorld(true);
    // Anchor the rifle beside the chest, with the stock toward the right shoulder.
    this.chains[0][0].getWorldPosition(this.start);
    this.chains[1][0].getWorldPosition(this.elbow);
    this.frame.position.copy(this.start).add(this.elbow).multiplyScalar(0.5);
    this.model.getWorldQuaternion(this.frame.quaternion);
    this.grip.set(-0.13, -0.025, 0.13).applyQuaternion(this.frame.quaternion);
    this.frame.position.add(this.grip);
    let pitch = 0;
    if (target) {
      this.direction.subVectors(target, this.frame.position);
      pitch = THREE.MathUtils.clamp(
        Math.atan2(
          this.direction.y,
          Math.hypot(this.direction.x, this.direction.z),
        ),
        -0.55,
        0.55,
      );
    }
    this.rotation.setFromEuler(new THREE.Euler(pitch, Math.PI, 0, 'YXZ'));
    this.frame.quaternion.multiply(this.rotation);
    this.frame.scale.setScalar(0.85);
    this.frame.updateMatrixWorld(true);
    this.chains.forEach(([upper, fore, hand], side) => {
      this.grip.copy(this.wrists[side]).applyMatrix4(this.frame.matrixWorld);
      upper.getWorldPosition(this.start);
      const [a, b] = this.lengths[side];
      this.direction.subVectors(this.grip, this.start);
      const distance = THREE.MathUtils.clamp(
        this.direction.length(),
        Math.abs(a - b) + 0.0001,
        a + b - 0.0001,
      );
      this.direction.normalize();
      this.pole
        .set(side === 0 ? -0.5 : 0.5, -0.8, -0.1)
        .applyQuaternion(this.model.getWorldQuaternion(this.parentRotation));
      this.pole
        .addScaledVector(this.direction, -this.pole.dot(this.direction))
        .normalize();
      const along = (a * a - b * b + distance * distance) / (2 * distance);
      this.elbow
        .copy(this.start)
        .addScaledVector(this.direction, along)
        .addScaledVector(
          this.pole,
          Math.sqrt(Math.max(0, a * a - along * along)),
        );
      this.orient(upper, this.elbow);
      this.orient(fore, this.grip);
      this.rotation.setFromEuler(
        new THREE.Euler(
          side === 0 ? -0.85 : -1.3,
          0,
          side === 0 ? -0.12 : -0.7,
        ),
      );
      this.rotation.premultiply(this.frame.quaternion);
      hand.quaternion.copy(
        hand
          .parent!.getWorldQuaternion(this.parentRotation)
          .invert()
          .multiply(this.rotation),
      );
      hand.updateWorldMatrix(false, true);
    });
  }
  private orient(bone: THREE.Bone, target: THREE.Vector3) {
    bone.getWorldPosition(this.start);
    this.rotation.setFromUnitVectors(
      this.up,
      this.direction.subVectors(target, this.start).normalize(),
    );
    bone.quaternion.copy(
      bone
        .parent!.getWorldQuaternion(this.parentRotation)
        .invert()
        .multiply(this.rotation),
    );
    bone.updateWorldMatrix(false, true);
  }
}
