# Original palace environment assets

Created for the Halloween palace game on 2026-10-16 with the built-in image-generation tool. These are original fictional environmental scenery, never submitted creator works or portraits. Reference images were used only to understand desired density/readability, not as copied layouts or characters.

- `props-atlas.webp`: 1448 × 1086 RGBA, 12 isolated painted furniture/architecture props. Runtime source rectangles are in `PALACE_ART` in `rpg-art.js`.
- `parquet.webp`: 512 × 512 warm walnut parquet.
- `limestone.webp`: 512 × 512 sage/ivory stone.
- `marble.webp`: 512 × 512 midnight-plum marble.
- `carpet.webp`: 512 × 512 teal/gold woven celestial textile.
- `wainscot-wall.webp`: 768 × 768 hand-painted plaster, carved crescent relief and walnut paneling.

All six runtime WebP files together: 1,069,224 bytes. Furniture atlas retains true alpha. Four surfaces were extracted from the generated four-quadrant material sheet and encoded as local WebP. No remote runtime downloads.

## Generation prompts

Furniture: A production game-art sprite atlas for an ORIGINAL Halloween palace, warm enchanted library and elegant nocturnal palace. Polished hand-painted 2D RPG environment assets, detailed painterly pixels, rich walnut, bronze-gold, midnight teal, plum velvet and honey candlelight. Twelve separate transparent sprites: low library cabinet with books and candles; teal reading armchair; flowering vine in bronze urn; celestial tapestry; writing desk with open book and quill; Gothic moonlit window; standing candelabra; astronomical globe; plum chaise; pumpkin/book/candle arrangement; grand celestial double door; limestone column. Consistent high 3/4 RPG viewpoint; no labels, characters, logos or interface.

Materials: Square texture atlas divided into four equal surface swatches, no labels, objects or perspective. Warm honey-walnut herringbone parquet, sage/ivory weathered limestone, midnight-plum marble with fine bronze grout, deep teal velvet wool with subtle repeating gold crescent/star pattern. Cohesive hand-painted fantasy RPG surface detail, natural ambient light, moderate contrast; no characters, shadows from outside objects, text or logos.

Wall panel: Front orthographic seamless modular palace wall. Upper weathered ivory/sage limestone plaster with faint carved crescent and leaf bas-relief; lower dark walnut wainscoting with inset carved panels, gold corner filigree, carved chair rail and skirting. Tactile hand-painted fantasy RPG material; no furniture, people, text, doors, windows or props.

## Runtime and QA

The real map/collision coordinates are unchanged. The original two shelf footprints are retained. New furniture uses perimeter plinths and room margins. Painted surface files are shared by both renderers. 3D furniture is geometric, with static books, wall details and floor tiles GPU-instanced by material. No claim of AAA graphics or measured device performance is made.

Native Canvas render proof was produced using the actual `createStageRenderer`, actual packaged assets and the actual owner-atlas metadata. This is code-render testing, not a browser screenshot or interactive WebGL/audio validation.
