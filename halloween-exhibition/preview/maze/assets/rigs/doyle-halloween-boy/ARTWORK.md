# ドイルのかぼちゃ少年

This dedicated character follows the boy in the Atelier illustration of [Doyle's submitted article](https://note.com/dandy_snake880/n/n084c0d58f567), not the author's profile portrait or the black-cat hammer cover. The selected [original image](https://assets.st-note.com/img/1792671223-PoY0EeLCd5lIjyWQcr7JMNZm.png?width=1200) was materialized and visually inspected at 1054 × 1492. Its SHA256 is `b5010ec0c4613ace1797ec8b38adc38370acc022200d3c02908b705b2aa0cca2`.

The character retains the youthful human boy's short dark indigo hair, warm amber-brown eyes, ribbed orange pumpkin hood and brown stem, and dark purple tied cape, short-sleeved clothing and trousers. The full-length standing legs and simple brown ankle boots are game adaptation of the seated illustration's concealed lower body. They do not claim to be visible in the original. The black cat in the illustration is not a second NPC.

## Dedicated component art

- The built-in image generator produced three selected source sheets. Exact returned dimensions and SHA256 hashes are in `rig.json` and `authoring.json`; the source prompts are in `generation-prompts.json`. Prompted dimensions are not treated as returned dimensions.
- Forty-eight independently painted components make front, right, back and left views. Each has a complete head/hood, cape, tunic torso, waistband, two upper arms, two forearms/hands, two upper trouser legs, and two lower trouser legs/boots.
- The first source supplies heads, capes and upper trouser legs. A layout revision supplies clean sleeveless torso underlayers, waistbands and bare arm parts. A dedicated eight-component supplement supplies complete knee-to-boot parts; the first sheet's edge-touching boot is not used.
- Assembly selects each authored island at alpha > 16 and retains its original alpha within a four-pixel dilation. This removes disconnected low-opacity generation haze without painting new colors or replacing alpha with a chroma key. The retained pixels are deterministically Lanczos-resampled and packed into lossless `parts.webp`.
- No source character is split out of a full-body pose. No other participant's pixels, mirrored views, profile portrait blend, whole-body deformation or whole-image wiggle are used.
- The shared biped renderer supplies independent shoulder/elbow and hip/knee chains with planted world-space feet. The cape has separate secondary motion. The back cape surface is layered over the torso rather than showing the front tunic through it.
- The pumpkin hood meets the purple collar with a short attachment. No added long neck is used. The head, body and limbs stay at the same authored scale through walking.

## Runtime and fallback

The live composition is 320 × 384 at anchor (0.5, 0.84), contentHeight 270. `parts.webp` is 1024 × 1024. The fallback is 1024 × 1024, four 256-pixel cells per row, in down/left/right/up order. Each row uses idle plus three quarter-stride samples from the same rig. Uniform fallback scale is 0.76, anchor is (128, 222), and contentHeight is 205.2. WebP quality 90 retains exact rendered alpha.

Every fallback pose is first drawn onto a 512 × 512 overscan canvas. The build fails if any source alpha would lie outside the final cell's three-pixel inset before the cell is copied. The final measured minimum transparent gutter is 17 pixels across all sixteen cells. This is a separate proof from the live-composer clipping test.

## Review

The real native-Canvas renderer was reviewed as four assembled views, all sixteen fallback frames, highest/lowest walking neck poses, both near-45-degree turn extremes, and 76px/86px game-size projections. The 4,320 movement samples have zero live clipping frames, zero unsupported frames, zero planted-foot drift, and maximum foot-solver residual below 2e-14 rig pixels. The fallback alpha survives encoding exactly. These checks cover cardinal sprite artwork and articulated motion, not a skeletal 3D model, new diagonal drawings or bespoke attack artwork.

This task does not certify browser, real WebGL, mobile, or physical-device playback. The separately published integration tests and runtime checks remain responsible for those surfaces.

## Rebuild

Full-resolution source sheets remain outside the published runtime tree. Supply a source directory containing `article-reference.png`, `parts-original.png`, `torso-hips-revision.png`, and `lower-legs.png`, with hashes matching the manifests.

Run `node scripts/build-doyle-assets.mjs --source-dir /path/to/source`. It uses optional development-only `@napi-rs/canvas`, `pngjs` and `sharp` modules, creates only Doyle files, and emits measured integration metadata beside the source directory. It never edits shared character registries. Review the actual pixels before passing `--accept-visual-review`; automated geometry measurements alone do not grant visual approval.

Run `node scripts/review-doyle-motion.mjs /path/to/review-output` to render the complete motion-extremes and game-size sheets. All review sheets are native Canvas renders, not browser screenshots.
