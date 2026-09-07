import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {CharacterController,type Obstacle} from './CharacterController';
type State='patrol'|'investigate'|'combat'|'cover'|'dead';
export type Enemy={model:THREE.Object3D;controller:CharacterController;position:THREE.Vector3;health:number;state:State;spawn:THREE.Vector3;goal:THREE.Vector3;lastSeen:THREE.Vector3;timer:number;shot:number;reaction:number;path:THREE.Vector3[];repath:number;death:number;deathY:number;visible:boolean;sightTimer:number;beacon:THREE.Mesh};
export class Enemies{
 enemies:Enemy[]=[];onShot?: (from:THREE.Vector3,to:THREE.Vector3)=>void;
 private sightRay=new THREE.Ray();private sightBox=new THREE.Box3();private sightHit=new THREE.Vector3();private eye=new THREE.Vector3();private aim=new THREE.Vector3();private direction=new THREE.Vector3();private rotation=new THREE.Quaternion();private grid=new Uint8Array(49*45);
 constructor(public scene:THREE.Scene,sourceModel:THREE.Object3D,clips:THREE.AnimationClip[],public obstacles:Obstacle[],public targets:THREE.Object3D[]){
  for(let z=0;z<45;z++)for(let x=0;x<49;x++)if(obstacles.some(b=>x-24>b.minX-.48&&x-24<b.maxX+.48&&z-22>b.minZ-.48&&z-22<b.maxZ+.48))this.grid[z*49+x]=1;
  const geometry=new THREE.BoxGeometry(.18,.075,.07);const beaconMat=new THREE.MeshStandardMaterial({color:0xff473d,emissive:0xff2718,emissiveIntensity:3});
  for(const [x,z] of [[0,-5],[-11,-7],[12,3],[-10,10],[19,4],[0,-17]]){
   const model=clone(sourceModel);model.traverse(o=>{o.layers.set(0);if((o as THREE.Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);
   const beacon=new THREE.Mesh(geometry,beaconMat);beacon.position.set(.27/model.scale.x,1.48/model.scale.y,.06/model.scale.z);beacon.scale.set(1/model.scale.x,1/model.scale.y,1/model.scale.z);model.add(beacon);
   const controller=new CharacterController(model,clips,obstacles);controller.position.set(x,0,z);controller.radius=.42;
   this.enemies.push({model,controller,position:controller.position,health:100,state:'patrol',spawn:new THREE.Vector3(x,0,z),goal:new THREE.Vector3(x,0,z),lastSeen:new THREE.Vector3(),timer:1+this.enemies.length*.4,shot:1,reaction:0,path:[],repath:0,death:0,deathY:0,visible:false,sightTimer:this.enemies.length*.025,beacon});controller.update(0);
  }
 }
 get alive(){return this.enemies.filter(e=>e.health>0).length;}
 reset(){for(const e of this.enemies){e.controller.mixer.timeScale=1;e.controller.velocity.set(0,0,0);e.controller.keys.clear();e.controller.verticalSpeed=0;e.controller.grounded=true;e.controller.enabled=false;e.controller.sprint=false;e.repath=0;e.visible=false;e.sightTimer=this.enemies.indexOf(e)*.025;e.health=100;e.state='patrol';e.position.copy(e.spawn);e.goal.copy(e.spawn);e.path=[];e.timer=1;e.shot=1;e.reaction=0;e.death=0;e.model.rotation.set(0,Math.PI,0);e.beacon.visible=true;e.controller.update(0);}}
 alert(position:THREE.Vector3){for(const e of this.enemies)if(e.health>0&&e.position.distanceTo(position)<25&&e.state==='patrol'){e.state='investigate';e.lastSeen.copy(position);e.goal.copy(position);e.timer=7;e.repath=0;}}
 private clear(a:THREE.Vector3,b:THREE.Vector3){
  this.direction.subVectors(b,a);const distance=this.direction.length();if(distance<.001)return true;
  this.sightRay.set(a,this.direction.multiplyScalar(1/distance));const limit=Math.max(0,distance-.05),limitSq=limit*limit;
  const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minZ=Math.min(a.z,b.z),maxZ=Math.max(a.z,b.z),minY=Math.min(a.y,b.y);
  for(const obstacle of this.obstacles){
   if(obstacle.maxX<minX||obstacle.minX>maxX||obstacle.maxZ<minZ||obstacle.minZ>maxZ||obstacle.height<minY)continue;
   const dx=Math.max(obstacle.minX-a.x,0,a.x-obstacle.maxX),dz=Math.max(obstacle.minZ-a.z,0,a.z-obstacle.maxZ);if(dx*dx+dz*dz>limitSq)continue;
   this.sightBox.min.set(obstacle.minX,0,obstacle.minZ);this.sightBox.max.set(obstacle.maxX,obstacle.height,obstacle.maxZ);
   if(this.sightBox.containsPoint(a)||this.sightRay.intersectBox(this.sightBox,this.sightHit)&&a.distanceToSquared(this.sightHit)<limitSq)return false;
  }
  return true;
 }
 private route(from:THREE.Vector3,to:THREE.Vector3){
  const ix=(v:THREE.Vector3)=>THREE.MathUtils.clamp(Math.round(v.z)+22,0,44)*49+THREE.MathUtils.clamp(Math.round(v.x)+24,0,48);const start=ix(from),end=ix(to);const queue=[start],prev=new Int16Array(2205);prev.fill(-1);prev[start]=start;let best=start,bestD=Infinity;
  for(let i=0;i<queue.length;i++){const n=queue[i],x=n%49,z=Math.floor(n/49),d=(x-end%49)**2+(z-Math.floor(end/49))**2;if(d<bestD){bestD=d;best=n;}if(n===end)break;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nn=nz*49+nx;if(nx<1||nx>47||nz<1||nz>43||this.grid[nn]||prev[nn]!==-1)continue;prev[nn]=n;queue.push(nn);}}
  const result:THREE.Vector3[]=[];for(let n=best;n!==start&&n>=0;n=prev[n])result.push(new THREE.Vector3(n%49-24,0,Math.floor(n/49)-22));return result.reverse();
 }
 update(dt:number,playerPosition:THREE.Vector3,active:boolean,onPlayerDamage:(damage:number)=>void){
  if(!active)return;this.aim.copy(playerPosition);this.aim.y+=1.25;
  for(const e of this.enemies){
   if(e.health<=0){e.death=Math.min(1,e.death+dt*1.7);e.model.rotation.x=-e.death*Math.PI*.48;e.model.position.y=THREE.MathUtils.lerp(e.deathY,.25,e.death);continue;}
   e.timer-=dt;e.shot-=dt;e.repath-=dt;this.eye.copy(e.position);this.eye.y+=1.45;const distance=e.position.distanceTo(playerPosition);e.sightTimer-=dt;if(distance>=25)e.visible=false;else if(e.sightTimer<=0){e.visible=this.clear(this.eye,this.aim);e.sightTimer=.15;}const visible=e.visible;
   if(visible){e.lastSeen.copy(playerPosition);e.reaction+=dt;if(e.state!=='cover'||e.timer<=0){e.state='combat';e.goal.copy(playerPosition);}}
   else {e.reaction=0;if(e.state==='combat'){e.state='investigate';e.goal.copy(e.lastSeen);e.timer=6;}}
   if(e.state==='patrol'&&e.timer<=0){e.timer=4+Math.random()*4;e.goal.copy(e.spawn).add(new THREE.Vector3((Math.random()-.5)*9,0,(Math.random()-.5)*9));e.repath=0;}
   if(e.state==='investigate'&&e.timer<=0){e.state='patrol';e.timer=0;}
   if(e.state==='cover'&&e.timer<=0){e.state=visible?'combat':'investigate';e.goal.copy(e.lastSeen);e.timer=5;e.repath=0;}
   const moving=(e.state!=='combat'||distance>13)&&e.position.distanceTo(e.goal)>.65;
   if(moving&&e.position.distanceTo(e.goal)>.65){if(e.repath<=0){e.path=this.route(e.position,e.goal);e.repath=1.8;}while(e.path.length&&e.position.distanceTo(e.path[0])<.22)e.path.shift();if(e.path.length){this.direction.subVectors(e.path[0],e.position);this.direction.y=0;this.direction.normalize();const speed=e.state==='cover'?3:1.65;e.controller.move(e.position,this.direction.x*speed*dt,this.direction.z*speed*dt);this.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,Math.atan2(this.direction.x,this.direction.z));e.model.quaternion.slerp(this.rotation,1-Math.exp(-9*dt));}}
   e.controller.setState(moving&&e.path.length?'Walk':'Idle');e.controller.mixer.update(dt);e.model.position.copy(e.position);e.model.updateMatrixWorld(true);let footY=Infinity;e.model.traverse(o=>{if(o.type==='Bone'&&/(Left|Right)Foot/.test(o.name)){o.getWorldPosition(this.direction);footY=Math.min(footY,this.direction.y);}});if(Number.isFinite(footY))e.model.position.y+=e.position.y+.085-footY;
   if(visible&&e.state==='combat'){this.direction.subVectors(playerPosition,e.position);this.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,Math.atan2(this.direction.x,this.direction.z));e.model.quaternion.slerp(this.rotation,1-Math.exp(-8*dt));if(e.reaction>.9&&e.shot<=0&&this.clear(this.eye,this.aim)){e.shot=.95+Math.random()*.65;const hit=Math.random()<Math.max(.18,.64-distance*.016);const end=this.aim.clone();if(!hit)end.add(new THREE.Vector3((Math.random()<.5?-1:1)*1.2,.5,0));this.onShot?.(this.eye.clone(),end);if(hit)onPlayerDamage(7);}}
  }
 }
 hit(raycaster:THREE.Raycaster,maxDistance:number,damage:number){
  let nearest:THREE.Intersection|undefined;let target:Enemy|undefined;
  for(const e of this.enemies){if(e.health<=0)continue;e.model.updateMatrixWorld(true);e.model.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)(o as THREE.SkinnedMesh).computeBoundingSphere();});const hit=raycaster.intersectObject(e.model,true)[0];if(hit&&hit.distance<=maxDistance&&(!nearest||hit.distance<nearest.distance)){nearest=hit;target=e;}}
  if(!nearest||!target)return null;this.damageEnemy(target,damage,raycaster.ray.origin);return {point:nearest.point.clone(),killed:target.health===0};
 }
 blast(point:THREE.Vector3,radius:number,damage:number):number{
  if(radius<=0||damage<=0)return 0;let kills=0;
  for(const e of this.enemies){if(e.health<=0)continue;this.eye.copy(e.position);this.eye.y+=.9;const distance=this.eye.distanceTo(point);if(distance>=radius||!this.clear(point,this.eye))continue;this.damageEnemy(e,damage*(1-distance/radius),point);if(e.health===0)kills++;}
  this.alert(point);return kills;
 }
 private damageEnemy(e:Enemy,damage:number,origin:THREE.Vector3){
  e.health=Math.max(0,e.health-Math.max(0,damage));e.reaction=.6;e.lastSeen.copy(origin);e.path=[];e.repath=0;
  if(!e.health){e.state='dead';e.deathY=e.model.position.y;e.beacon.visible=false;e.controller.mixer.timeScale=0;}
  else {e.state='cover';e.timer=2.5;let chosen:THREE.Vector3|undefined,best=Infinity;for(const b of this.obstacles){if(b.height<1||b.maxX-b.minX>10||b.maxZ-b.minZ>10)continue;const center=new THREE.Vector3((b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2);const away=center.clone().sub(origin);away.y=0;away.normalize();center.addScaledVector(away,Math.max(b.maxX-b.minX,b.maxZ-b.minZ)/2+.9);const d=center.distanceTo(e.position);if(d<best&&d<9){best=d;chosen=center;}}e.goal.copy(chosen??e.position);}
 }
}
