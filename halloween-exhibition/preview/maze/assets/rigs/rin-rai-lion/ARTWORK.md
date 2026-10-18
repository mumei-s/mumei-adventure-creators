# ライちゃん / Rai

A childlike golden boy lion cub for `airoumu_rin`. Identity was visually checked against the current [profile avatar](https://note.com/airoumu_rin), and the witch hat, pumpkin badge, cape, plaid shorts, striped socks and black boots follow the [submitted Halloween article](https://note.com/airoumu_rin/n/n7179d2f821e8). The article's unintended female Inori variation is excluded.

## Artwork and animation

- Built-in image generation produced one transparent 1254 × 1254 painterly component sheet, reviewed before integration.
- 52 selected components form four cardinal views. Both arms have independent upper sleeve and forearm/paw parts; both legs have independent thigh and striped-sock/boot parts. The cape and tail have separate secondary motion.
- `authoring.json` records source rectangles, component identifiers, packing scale and exact clipping decisions. Redundant sleeve/cuff pixels in the torso and upper sleeves are excluded so the articulated arms do not double them. Waistband-only shorts overlap the separately articulated thigh/shorts cuffs.
- `parts.webp` uses lossless WebP. The 1024 × 1024 fallback atlas is rendered from this same rig, with four frames for each of front, left, right and back. It is WebP quality 90 with preserved alpha.
- No whole-body wiggle, runtime mirroring or reuse of another participant's artwork.

## Verification

The actual owner-rig Canvas renderer was inspected as four assembled views and a walk/stop contact sheet. Across 1,440 motion samples at 76px and 86px projection, neither foot contact was lost simultaneously, planted feet had zero drift, and the 320 × 384 live composer had no clipped frames. All fallback source rectangles have measured alpha bounds inside their cells.

The runtime provides four cardinal drawings and articulated motion, not independently authored diagonal transition or attack drawings. Browser, physical-device and real WebGL gameplay were not reviewed in this asset task.

## Generation prompt

Use case: identity-preserve / polished game character component atlas. Image 1 is the exact illustration identity and painterly style reference: Rai-chan, a cute little golden BOY lion cub, large glossy amber eyes, soft detailed golden furry mane, large round ears, tiny fang smile, childlike proportions. Witch outfit with floppy black/purple pointed hat and orange pumpkin badge, black-purple cape, white cuffs, orange-and-black PLAID SHORTS, orange/black striped socks and black boots. Image 2 is a technical component layout/prototype ONLY, which you must upgrade to the luminous detailed anime/3D-painted look of image 1. Produce a professional transparent 2048x2048 separated-part game rig sprite atlas. Keep the same four horizontal rows from Image 2: row1 FRONT facing camera, row2 RIGHT PROFILE facing right, row3 BACK with no face, row4 LEFT PROFILE facing left. Preserve the exact general part arrangement and make every component completely separated by transparent space. In each row from left to right: (1) large complete head WITH ears/mane AND witch hat, (2) flowing cape alone (under it a separate curved golden lion tail with fluffy tuft and tiny purple bow), (3) torso waistcoat with orange bow and pumpkin clasp, (4) plaid shorts waistband/hips alone, (5) left upper sleeve, (6) left forearm including white cuff and golden paw-hand, (7) left upper thigh including plaid shorts cuff and golden knee, (8) left lower leg with striped sock and black boot, (9) right upper sleeve, (10) right forearm/cuff/paw, (11) right upper thigh/shorts cuff/golden knee, (12) right lower leg with sock/boot. The first head is biggest, taking about 18% width, cape about 14%, other body parts small. All separated parts depict the SAME character proportions and view within that row. Every arm and leg part has painted rounded ends under joints for cutout animation. No assembled full characters, no duplicate heads, no backgrounds, no labels, no checkerboard. Give dimensional softly shaded fluffy fur, round soft cheeks, detailed silk/cape highlights, boot leather, amber glassy anime eyes, warm golden lighting matching image 1. Never a flat vector, never polygon mane or flat colors. Transparent alpha. Keep the two separate short trouser legs: no skirt, no dress, no girl, no human body. Preserve enough blank margins around every component to avoid clipping. Reference image 2 should only guide part placement and dimensions, never its flat-vector style.

The requested dimensions in the prompt are not the output dimensions: the tool returned the reviewed 1254 × 1254 sheet recorded above.
