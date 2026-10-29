# Overlord S native assets

The continuous anatomical body and eye meshes in `../../overlord-human-data.js` are derived from the MakeHuman hm08 base mesh and adult female morph, released under **CC0 1.0 Universal**. No MakeHuman application code is included.

- Upstream commit: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- [Base mesh](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
- [Adult female morph](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/targets/macrodetails/caucasian-female-young.target)
- [MakeHuman core-asset license](https://www.makehumancommunity.org/about/license.html)

Original asset copyright holders: Data Collection AB, Joel Palmius and Jonas Hauquier. The female target originated with Manuel Bastioni (2014) and was transferred in 2016. The original CC0 release and input hashes are preserved in the generated data module and `preview/scripts/build-overlord-human.py`.

The native rig, fitted regalia, hair, crown, cloth, room, swords, animation direction and effects are authored for this game. The albedo atlas and transparent 2D character artwork were generated for this project using the supplied fictional-character references. Reference screenshots and reference card layouts are not loaded into the native scene.

## 2026-10-29 facial identity correction

`queen-face-reference.jpg` is an exact, unedited copy of the supplied `1000016797.jpg`, the closest character portrait from the three authoritative queen references. Only registered facial pixels are sampled. The reference card is not drawn as a card, plane, or background. No newly generated face atlas is used. Armor, hair and crimson cloth retain `material-atlas-v2.webp`.

The 2D fallback uses the original facial pixels with a feathered curved mask, cached after its first composition. Body artwork and alpha remain unchanged. While this required image loads, the renderer keeps its loading state instead of displaying a different face. Failed reference loads retry with a bounded delay.

The native 3D face remains unresolved. Direct projection and a fitted face surface failed visual QA, so neither is enabled in this change. The published anatomical face is retained. Layered black-gold regalia, pierced crown and tapered hair locks are native geometry. No TRELLIS output is included. Low-frame-rate battle timing and pose transitions share the encounter clock, while movement collision steps remain capped.
