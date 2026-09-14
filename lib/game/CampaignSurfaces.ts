import * as THREE from 'three';
/** Deterministic worn colony panel texture; no external artwork or new assets. */
export function campaignSurface(base: string, repeat = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  let seed = 739;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7000; i++) {
    const shade = Math.floor(random() * 150);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},.12)`;
    ctx.fillRect(random() * 256, random() * 256, random() * 3 + 1, 1);
  }
  ctx.strokeStyle = '#07111770';
  for (let i = 0; i < 30; i++) {
    const x = random() * 256,
      y = random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 36, y + 1);
    ctx.stroke();
  }
  ctx.fillStyle = '#07121a65';
  for (const x of [0, 128, 255]) ctx.fillRect(x, 0, 2, 256);
  for (const y of [0, 128, 255]) ctx.fillRect(0, y, 256, 2);
  for (const x of [6, 122, 134, 250])
    for (const y of [6, 122, 134, 250]) {
      ctx.fillStyle = '#0a131c';
      ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = '#a6afb34a';
      ctx.fillRect(x, y, 2, 1);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}
