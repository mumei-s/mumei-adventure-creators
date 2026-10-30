# Overlord S assets

## Current full-body action character (2026-10-30)

`queen-actions-v4.webp` packs seven independent full-body drawings with transparent gutters in a 1344×1632 atlas (608580 bytes). Poses are: resting stance, two casting stances, alternating left/right forward steps, a bent-knee recoil, and a genuine one-knee bow. Their physical scale is registered by head size and floor contact before packing; the crouch and kneel are visibly lower than standing rather than enlarged to fill the frame.

The original three cast drawings are the clean top-row figures from `exec-694b6351-40f2-4312-b1ff-30ccc36b7b0e.png`. Added poses were built-in image-generation edits of the same queen: `queen-walk-left-v1.png` (SHA256 `5a24e9b3e25d73ec24613eefb469428a374483c622733e84a9496a7346836d25`), `queen-walk-right-v2.png` (`ee5594b11627022e501008efc6ba67a1aef5e102a4a1484007272eb1d8b32a8d`), `queen-hit-crouch-v1.png` (`c166a8efba190f594ef77883abedb2a8517d4553277ea06412a882f12b99313b`), and `queen-kneel-v1.png` (`0069f781c4457f4b8a4ea872bb9005496b643e1e4bc0e97849371ceaad64dcf7`). Brief: preserve the adult queen's face, crown, blonde curls, black-and-gold armour and red-and-gold mantle; one full-body pose per transparent image; actual leg anatomy, no extra limbs or effects. The first opposite-step candidate was rejected because the leading foot had not changed. Armour micro-patterns vary locally between generated poses.

Entrance, rise, alternating steps, casting, recoil and the final kneel are driven by one seekable battle clock. Canvas2D and native Sprite share the same registered crops and a 60-triangle continuous cloth deformation. Per-pose face rectangles remain rigid. The hand-painted crouch and kneel suppress the previous large procedural body bend so they are not deformed twice. Reduced motion holds the final kneel immediately after victory.

This is a front/three-quarter battle character. It does not advertise a four-direction exploration walk set. In exploration the queen waits at her throne and remains visible in the distant and flat views. The detailed texture loads lazily over an embedded preview; idle floating weapons, separated sixteen-part limbs and archived human geometry are outside the live runtime. Attack swords appear only as transient battle weapons.

## Previous original-art character method

The game now displays the queen with the same original-art sprite method as the other characters, in both exploration and battle. `queen-original-art-v1.webp` is the approved 1024×1536 queen artwork with the five permanently floating swords and their loops removed using imagegen. The pose, costume, hair and face registration are retained. The source PNG SHA-256 is `c1195c29a4ead858545e3ea3ff2619de8e848214f1d262cdeb103248df898063`. The full asset is WebP quality 91; `overlord-character-preview.js` embeds a 128×192 preview of the same image.

The small preview appears independently of network texture requests and stays visible if a full-image transfer fails. Full art and the registered reference face upgrade it in place. Neither exploration nor battle imports the archived skinned body, geometry data, hair meshes or body maps below. The image is camera-facing, grounded at its feet, unlit, and preserves its original proportions. The queen waits at the throne, so it cannot patrol behind the first-person camera.

Shared battle cues drive changing environments, flowing light, transient attack trails and the victory palette. Idle floating blades are not part of the current character.

## Archived 3D experiments and attribution

The legacy body and eye meshes in `../../overlord-human-data.js` are derived from the MakeHuman hm08 base mesh and adult female morph, released under **CC0 1.0 Universal**. They remain available for explicit legacy validation and are not imported by the game runtime. No MakeHuman application code is included.

- Upstream commit: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- [Base mesh](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
- [Adult female morph](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/targets/macrodetails/caucasian-female-young.target)
- [MakeHuman core-asset license](https://www.makehumancommunity.org/about/license.html)

Original asset copyright holders: Data Collection AB, Joel Palmius and Jonas Hauquier. The female target originated with Manuel Bastioni (2014) and was transferred in 2016. The original CC0 release and input hashes are preserved in the generated data module and `preview/scripts/build-overlord-human.py`.

The native rig, fitted regalia, hair, crown, cloth, room, swords, animation direction and effects are authored for this game. The albedo atlas and transparent character artwork were generated for this project using the supplied adult fictional-character references. Reference screenshots and reference card layouts are not loaded into the native scene.

## 2026-10-29 facial identity correction

`queen-face-reference.jpg` is an exact, unedited copy of the supplied `1000016797.jpg`, the closest character portrait from the three authoritative queen references. The 2D fallback samples registered facial pixels. The reference card is not drawn as a card, plane, or background.

The 2D fallback uses the original facial pixels with a feathered curved mask, cached after its first composition. Body artwork and alpha remain unchanged. While the registered face loads, the approved artwork stays visible; it is not hidden by an optional image transfer. Failed reference loads retry with a bounded delay.

## Archived reconstructed, skinned queen body

`../../overlord-queen-data.js` contains a genuine image-to-3D mesh generated with the [official Stable Fast 3D demo](https://huggingface.co/spaces/stabilityai/stable-fast-3d). No model weights or inference code are redistributed. This generated output is separate from the legacy CC0 body attribution above.

- Source GLB SHA-256: `e1626717a21f414519ccaf17066e7fd0c2b36d40e64fbf0269e67dc0547baf06`.
- Approved A-pose image SHA-256: `79bfeb9bb78a43768e839e4ef3903e3e4d2ca36db88cfb8ccbb7efbce95b7849`.
- Original topology: 7,831 vertices and 9,008 triangles, fitted in a 2.2476-unit coordinate scale with feet at Y=0 and +Z forward. The temporary bun above Y=2.10 is reduced beneath the final scalp; central facial features are unchanged.
- Sixteen fitted bones and normalized skin weights drive walking, sitting, standing, attacks, hit reactions and defeat. Neutral-pose alignment preserves the controller's full animation deltas.
- Hair, crown, cape and five swords are separate native geometry. Reconstructed armor replaces the old body armor attachments.

`queen-body-base.webp` is the reconstructed albedo optimized as WebP quality 93. `queen-body-normal.jpg` preserves the original embedded normal-map JPEG bytes. `queen-body-front.webp` preserves every RGBA pixel of the approved source image using lossless WebP. Source-camera UVs apply that higher-resolution image directly to existing visible front triangles; there is no added face surface or poster plane. Original side/back UVs and normal-map UVs remain intact. Both UV sets retain glTF TOPDOWN orientation, with `texture.flipY=false`.

Five original jaw triangles are explicitly assigned to the existing high-resolution face material after native-pose ray checks found that the visibility gate had left them on the old body material. Their UVs and source pixels are unchanged. The build script pins this correction to the recorded source GLB hash.

The reconstructed geometry is intentionally bounded for mobile rendering. Fingers, outer ear/jaw facets and side/back details remain coarser than the source illustration. The earlier fused-cape reconstruction and its failed automatic rig are not the game model.

UV-island duplicates now share area-weighted normals at coincident source positions. This removes lighting seams without changing positions, topology, either UV set or skin weights. The exported normal map remains available, but its faceted relief is disabled on the reconstructed body. The body still casts its silhouette shadow. It does not receive additional real-time shadows, avoiding triangular shadow patches on top of the source image's painted lighting.

The archived lighting and body-map attachment code is retained for provenance and legacy validation. The current game uses the original-art character described above.
