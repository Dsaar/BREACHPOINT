import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

/** The uploaded Soldier's skinned arms, sharing its textures and original rig. */
export class FirstPersonArms {
  readonly root: THREE.Object3D;
  readonly socket = new THREE.Group();
  readonly right: THREE.Bone;
  readonly left: THREE.Bone;
  readonly mixer: THREE.AnimationMixer;
  private chains: THREE.Bone[][];

  constructor(
    source: THREE.Object3D,
    idle: THREE.AnimationClip,
    assembly: THREE.Group,
  ) {
    this.root = new THREE.Group();
    const rig = clone(source);
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    this.root.add(rig);
    this.root.name = 'Soldier first-person arms';
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    const remove: THREE.Object3D[] = [];
    this.root.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      // Select the authored arms mesh by skin influences, not an exporter node number.
      let armWeight = 0,
        total = 0;
      if (mesh.isSkinnedMesh) {
        const indices = mesh.geometry.getAttribute('skinIndex');
        const weights = mesh.geometry.getAttribute('skinWeight');
        for (let i = 0; i < indices.count; i++)
          for (let k = 0; k < 4; k++) {
            const weight = weights.getComponent(i, k);
            total += weight;
            if (
              /(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(
                mesh.skeleton.bones[indices.getComponent(i, k)].name,
              )
            )
              armWeight += weight;
          }
      }
      if (!total || armWeight / total < 0.98) {
        remove.push(mesh);
        return;
      }
      // Cut triangles that blend into the torso at the shoulder seam. Leaving even
      // a small spine weight here stretches sleeves when the view rig is posed.
      mesh.geometry = mesh.geometry.clone();
      const skinIndex = mesh.geometry.getAttribute('skinIndex');
      const skinWeight = mesh.geometry.getAttribute('skinWeight');
      const keep = Array.from({ length: skinIndex.count }, (_, vertex) => {
        let bodyWeight = 0;
        for (let k = 0; k < 4; k++)
          if (
            !/(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(
              mesh.skeleton.bones[skinIndex.getComponent(vertex, k)].name,
            )
          )
            bodyWeight += skinWeight.getComponent(vertex, k);
        return bodyWeight < 0.001;
      });
      const original = mesh.geometry.index;
      const triangles: number[] = [];
      for (let i = 0; i < (original?.count ?? skinIndex.count); i += 3) {
        const a = original?.getX(i) ?? i,
          b = original?.getX(i + 1) ?? i + 1,
          c = original?.getX(i + 2) ?? i + 2;
        if (keep[a] && keep[b] && keep[c]) triangles.push(a, b, c);
      }
      mesh.geometry.setIndex(triangles);
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        material.clippingPlanes = [];
      mesh.layers.set(0);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
    remove.forEach((mesh) => mesh.removeFromParent());
    const bone = (part: string) => {
      let found: THREE.Bone | undefined;
      this.root.traverse((node) => {
        if (
          (node as THREE.Bone).isBone &&
          new RegExp(`${part}\\d`).test(node.name)
        )
          found = node as THREE.Bone;
      });
      if (!found) throw new Error(`Soldier arm rig missing ${part}`);
      return found;
    };
    this.chains = ['Right', 'Left'].map((side) => [
      bone(`${side}Arm`),
      bone(`${side}ForeArm`),
      bone(`${side}Hand`),
    ]);
    this.right = this.chains[0][2];
    this.left = this.chains[1][2];
    // Preserve the authored finger curl; arm placement is solved for each weapon.
    this.mixer = new THREE.AnimationMixer(this.root);
    this.mixer.clipAction(idle).play();
    this.mixer.update(0.1);
    this.root.updateMatrixWorld(true);
    this.pose(0);
    this.socket.name = 'Right hand weapon socket';
    this.right.add(this.socket);
    this.root.updateMatrixWorld(true);
    // Assembly's calibrated coordinates are expressed in the view root. The inverse
    // hand transform makes it an actual hand child without changing its placement.
    this.socket.matrix
      .copy(this.right.matrixWorld)
      .invert()
      .multiply(this.root.matrixWorld);
    this.socket.matrix.decompose(
      this.socket.position,
      this.socket.quaternion,
      this.socket.scale,
    );
    this.socket.add(assembly);
  }

  pose(index: number) {
    // Coordinates relative to the bore of the existing weapon models (metres).
    const wrists = [
      new THREE.Vector3(0.018, -0.135, -0.005),
      index === 0
        ? new THREE.Vector3(-0.045, -0.075, -0.43)
        : new THREE.Vector3(-0.04, -0.14, -0.035),
    ];
    const elbows = [
      new THREE.Vector3(0.32, -0.43, 0.15),
      new THREE.Vector3(-0.32, -0.38, -0.12),
    ];
    const shoulders = [
      new THREE.Vector3(0.25, -0.48, 0.02),
      new THREE.Vector3(-0.26, -0.48, -0.12),
    ];
    this.root.updateMatrixWorld(true);
    this.chains.forEach((chain, side) => {
      const [upper, fore, hand] = chain;
      // The first-person crop puts shoulder seams below the viewport. Bone lengths
      // remain authored; the elbow uses an analytic two-bone solution.
      const lengthA = upper
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(fore.getWorldPosition(new THREE.Vector3()));
      const lengthB = fore
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(hand.getWorldPosition(new THREE.Vector3()));
      const start = this.root.localToWorld(shoulders[side].clone());
      const end = this.root.localToWorld(wrists[side].clone());
      const direction = end.clone().sub(start);
      const distance = Math.min(direction.length(), lengthA + lengthB - 0.0001);
      direction.normalize();
      const pole = this.root.localToWorld(elbows[side].clone()).sub(start);
      pole.addScaledVector(direction, -pole.dot(direction)).normalize();
      const along =
        (lengthA * lengthA - lengthB * lengthB + distance * distance) /
        (2 * distance);
      const elbow = start
        .clone()
        .addScaledVector(direction, along)
        .addScaledVector(
          pole,
          Math.sqrt(Math.max(0, lengthA * lengthA - along * along)),
        );
      const shoulder = upper.parent!;
      const offset = start
        .clone()
        .sub(upper.getWorldPosition(new THREE.Vector3()));
      shoulder.position.copy(
        shoulder.parent!.worldToLocal(
          shoulder.getWorldPosition(new THREE.Vector3()).add(offset),
        ),
      );
      const orient = (joint: THREE.Bone, target: THREE.Vector3) => {
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          target
            .clone()
            .sub(joint.getWorldPosition(new THREE.Vector3()))
            .normalize(),
        );
        joint.quaternion.copy(
          joint
            .parent!.getWorldQuaternion(new THREE.Quaternion())
            .invert()
            .multiply(q),
        );
        this.root.updateMatrixWorld(true);
      };
      this.root.updateMatrixWorld(true);
      orient(upper, elbow);
      orient(fore, end);
      const rotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          side === 0 ? -0.85 : -1.3,
          0,
          side === 0 ? -0.12 : -0.7,
        ),
      );
      rotation.premultiply(
        this.root.getWorldQuaternion(new THREE.Quaternion()),
      );
      hand.quaternion.copy(
        hand
          .parent!.getWorldQuaternion(new THREE.Quaternion())
          .invert()
          .multiply(rotation),
      );
      this.root.updateMatrixWorld(true);
    });
  }
}
