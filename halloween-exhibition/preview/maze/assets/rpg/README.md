# Original Halloween RPG art

Created on 2026-10-14 using the built-in OpenAI image-generation tool from original prompts. No third-party source images, franchise characters, logos or screenshots were used. Deterministic cropping, resizing and WebP compression normalized the delivered assets. AI generation does not guarantee exclusivity or copyright eligibility; no third-party stock license or commercial-game parity is claimed.

Runtime images (total 1,454,424 bytes):

- `lantern-keeper-atlas.webp`: 1024×1024 RGBA, 4 columns × 4 rows, 256-pixel cells. Rows down / left / right / up; columns idle / step A / passing / step B variant. Crop `(column*256,row*256,256,256)`, foot anchor `(128,238)`, content height218. All frames have clear gutters and no clipped limbs. Some step A/B poses are similar: limited hand-painted four-frame animation.
- `pumpkin.webp`, `ghost.webp`, `bat.webp`, `zombie.webp`, `vampire.webp`, `franken.webp`: each 512×512 RGBA, original fictional creatures.
- `battle-library.webp`: 1536×1024 painted haunted library; also supplies the clipped exploration floor inlay.
- `bookcase.webp`: 459×656; `window.webp`: 348×656; `column.webp`: 330×656; `pumpkins.webp`: 656×359. Source-alpha bounds and ground-contact cropping are in `rpg-art.js`.
- `floor.webp`: 512×512, four-by-four slate slabs. Runtime uses one 128-pixel slab per world tile, preserving scale.

Full-color images, all sixteen normalized hero frames and floor repeat were visually inspected. All alpha channels and runtime dimensions were checked. Source PNG masters and generation prompts are retained with the project delivery artifacts, outside the public runtime bundle.

The friendly stitched zombie and original vampire count were generated using the already original pumpkin/ghost artwork as style references. Neither uses an actor likeness. Both are non-gory and have explicit boot-ground anchors in `ART_ANCHORS`.

`franken.webp` is the original broad stitched/clockwork alchemist’s golem, using only the earlier original zombie/vampire art as style references. Full alpha bounds are (51,27)–(465,484); boot anchor (271,481). It is a fictional non-gory creature, with no actor likeness or third-party franchise source.
