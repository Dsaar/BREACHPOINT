# Asset credits

**Soldier Glb 3** by **pierson3972**, originally hosted on **Sketchfab**.

Original model: https://sketchfab.com/3d-models/soldier-glb-3-0edc19e9d55040f6b1cbbbc8f98bb6b9

Licensed under **Creative Commons Attribution 4.0 (CC BY 4.0)**: https://creativecommons.org/licenses/by/4.0/

Modifications: legacy specular/glossiness materials converted to metallic/roughness materials while retaining original diffuse textures, geometry, and skeleton. Embedded textures resized to at most 1024 pixels for download and GPU memory efficiency. Runtime scaling and first-person visibility layers applied. The supplied `mixamo.com` clip is used as Idle; Walk and Run are runtime-generated skeletal locomotion clips, not original uploaded animations. Enemy instances reuse the credited model. The first-person view reuses its skinned arms/hands, materials, finger pose and skeleton; torso-connected shoulder triangles are cropped at runtime, arm bones are posed for each weapon, and a right-hand weapon socket is added. The source Soldier GLB is unchanged by this arm extraction. Original authorship remains with pierson3972.

Environment, interface, weapon motion/effect integration, generated effects, and synthesized audio are original project work. Weapon model geometry and textures are credited below.

## CAR SMG

**CAR smg (from TITANFALL 2)- fan art** by **No.cccccc**, originally hosted on **Sketchfab**.

- Creator: https://sketchfab.com/NO.cccccc
- Original model: https://sketchfab.com/3d-models/car-smg-from-titanfall-2-fan-art-73ea7ee62e4545aea93ca1483b50b5fe
- License: **Creative Commons Attribution 4.0 (CC BY 4.0)** — https://creativecommons.org/licenses/by/4.0/
- Browser asset: `public/models/CAR.glb`.

Modifications: embedded color/emissive textures re-encoded as high-quality JPEG at up to 2048 pixels; normal and packed material textures resized to at most 1024 pixels and retained as PNG. Opaque surfaces use opaque rendering instead of the original unnecessary alpha-blend setting. Geometry and material channels are preserved. Runtime orientation, scale, placement, aiming, recoil, reload motion and muzzle effects adapt the model for first-person use. Enemy instances share the CAR geometry and textures, with runtime hand sockets and muzzle flashes. Enemy arm bones are posed with two-bone inverse kinematics to maintain a forward-facing, two-handed rifle grip over the locomotion animations. No animation clips are included in the source GLB. The model is credited as fan art of Titanfall 2, not as an original BREACHPOINT weapon design.

## Desert Eagle

**Desert Eagle** by **ELIZION**, originally hosted on **Sketchfab**.

- Creator: https://sketchfab.com/ELIZION
- Original model: https://sketchfab.com/3d-models/desert-eagle-cabde59f5cf24effaf80536e35d04e95
- License: **Creative Commons Attribution 4.0 (CC BY 4.0)** — https://creativecommons.org/licenses/by/4.0/
- Browser asset: `public/models/DesertEagle.glb`.

Modifications: embedded base-color textures resized to at most 2048 pixels and re-encoded as high-quality JPEG; normal and packed material textures resized to at most 1024 pixels and retained as PNG. Geometry and material channels are preserved. Runtime orientation, scale, placement, aiming, recoil, reload motion and muzzle effects adapt the model for first-person use. The separately displayed loose cartridge is hidden in the first-person presentation. No animation clips are included in the source GLB.

Both weapon author names, original URLs and CC BY 4.0 licenses are recorded in their supplied GLB `asset.extras` metadata, which remains embedded in the optimized files. The linked Sketchfab pages were checked during integration, but direct page retrieval returned HTTP 403; the embedded attribution is the primary source for this record. The uploaded original files were not changed. Original authorship remains with the respective creators.
