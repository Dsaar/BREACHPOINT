import fs from 'node:fs/promises';
import sharp from 'sharp';
const input = process.argv[2];
if (!input)
  throw new Error(
    'Usage: node scripts/prepare-soldier.mjs path/to/soldier_glb_3.glb',
  );
const source = await fs.readFile(input);
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const bin = source.subarray(28 + jsonLength);
for (const m of gltf.materials) {
  const old = m.extensions?.KHR_materials_pbrSpecularGlossiness;
  if (old) {
    m.pbrMetallicRoughness = {
      baseColorFactor: old.diffuseFactor ?? [1, 1, 1, 1],
      baseColorTexture: old.diffuseTexture,
      metallicFactor: 0,
      roughnessFactor: 0.78,
    };
    delete m.extensions.KHR_materials_pbrSpecularGlossiness;
  }
}
gltf.extensionsUsed = (gltf.extensionsUsed ?? []).filter(
  (v) => v !== 'KHR_materials_pbrSpecularGlossiness',
);
const imageViews = new Map(gltf.images.map((im) => [im.bufferView, im]));
let offset = 0;
const chunks = [];
for (let i = 0; i < gltf.bufferViews.length; i++) {
  const view = gltf.bufferViews[i];
  let bytes = bin.subarray(
    view.byteOffset ?? 0,
    (view.byteOffset ?? 0) + view.byteLength,
  );
  if (imageViews.has(i)) {
    bytes = await sharp(bytes)
      .resize({
        width: 1024,
        height: 1024,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
    imageViews.get(i).mimeType = 'image/png';
  }
  view.byteOffset = offset;
  view.byteLength = bytes.length;
  chunks.push(bytes);
  const pad = (4 - (bytes.length % 4)) % 4;
  chunks.push(Buffer.alloc(pad));
  offset += bytes.length + pad;
}
gltf.buffers[0].byteLength = offset;
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const data = Buffer.concat(chunks);
const head = Buffer.alloc(20);
head.writeUInt32LE(0x46546c67, 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(28 + json.length + data.length, 8);
head.writeUInt32LE(json.length, 12);
head.writeUInt32LE(0x4e4f534a, 16);
const bh = Buffer.alloc(8);
bh.writeUInt32LE(data.length, 0);
bh.writeUInt32LE(0x004e4942, 4);
await fs.writeFile(
  'public/models/Soldier.glb',
  Buffer.concat([head, json, bh, data]),
);
console.log(
  `Soldier prepared: ${(source.length / 1048576).toFixed(1)} → ${((28 + json.length + data.length) / 1048576).toFixed(1)} MiB`,
);
