import fs from 'node:fs/promises';
import sharp from 'sharp';

// Geometry, material channels, and creator metadata are preserved. Only embedded
// images are re-encoded; no external texture URLs or runtime decoders are needed.
const inputs = process.argv.slice(2);
if (inputs.length !== 2)
  throw new Error(
    'Usage: node scripts/prepare-weapons.mjs CAR-source.glb DesertEagle-source.glb',
  );
for (const [index, input] of inputs.entries()) {
  const source = await fs.readFile(input),
    jsonLength = source.readUInt32LE(12);
  const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
  const bin = source.subarray(28 + jsonLength);
  const colorImages = new Set();
  for (const material of gltf.materials) {
    for (const texture of [
      material.pbrMetallicRoughness?.baseColorTexture,
      material.emissiveTexture,
    ])
      if (texture) colorImages.add(gltf.textures[texture.index].source);
    // CAR was exported as BLEND, but all its color images have no alpha channel.
    if (index === 0) material.alphaMode = 'OPAQUE';
  }
  const imageViews = new Map(
    gltf.images.map((image, i) => [image.bufferView, { image, index: i }]),
  );
  const chunks = [];
  let offset = 0;
  for (const [i, view] of gltf.bufferViews.entries()) {
    let bytes = bin.subarray(
      view.byteOffset ?? 0,
      (view.byteOffset ?? 0) + view.byteLength,
    );
    const entry = imageViews.get(i);
    if (entry) {
      const isColor = colorImages.has(entry.index);
      const image = sharp(bytes).resize({
        width: isColor ? 2048 : 1024,
        height: isColor ? 2048 : 1024,
        fit: 'inside',
        withoutEnlargement: true,
      });
      bytes = await (
        isColor
          ? image.jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
          : image.png({ compressionLevel: 9 })
      ).toBuffer();
      entry.image.mimeType = isColor ? 'image/jpeg' : 'image/png';
    }
    view.byteOffset = offset;
    view.byteLength = bytes.length;
    chunks.push(bytes);
    const padding = (4 - (bytes.length % 4)) % 4;
    chunks.push(Buffer.alloc(padding));
    offset += bytes.length + padding;
  }
  gltf.buffers[0].byteLength = offset;
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const data = Buffer.concat(chunks);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + data.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(data.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const output = `public/models/${index === 0 ? 'CAR' : 'DesertEagle'}.glb`;
  await fs.writeFile(output, Buffer.concat([header, json, binHeader, data]));
  console.log(
    `${output}: ${(source.length / 1048576).toFixed(1)} → ${((28 + json.length + data.length) / 1048576).toFixed(1)} MiB`,
  );
}
