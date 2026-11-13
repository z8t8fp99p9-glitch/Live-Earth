# Clear Maple Pavilion — Continuous Brush Revision 002

**Artwork ID:** `clear-maple-pavilion-002`  
**Parent/master:** `clear-maple-pavilion-001` (preserved byte-for-byte)  
**Composition scale:** 90%, centred on 1000 × 700  
**Stroke count:** 63 continuous brush gestures  
**Replay target:** 75 seconds  
**Status:** Runtime source asset authored; schema-v2 renderer and catalogue enabled in this package

## Composition and sequence

The source scene is retained: maple trunk and branches at left, vermilion leaves, pavilion roof and support, hanging wind chime, birds, sun, mountain ridges, foreground bank, stones, grasses, flowering twig, and quiet water accents. Every centreline is scaled uniformly to 90% around the canvas centre. The canvas itself remains 10:7 and is not cropped or stretched.

The order and target counts are: tree structure (7), leaves (12), pavilion (7), wind chime (5), sun/sky (4), birds (2), mountains (4), foreground (8), flowering twig (9), finishing water (5). Total: 63.

## Brush construction

Each record contains one continuous centreline with pressure samples. Thick structural gestures carry more width and time; thin atmosphere marks are sparse. Low-pressure start/end samples create natural lift and taper. The renderer smooths the centreline, constructs a pressure-shaped brush ribbon, and reveals a partial prefix of the same gesture as Replay advances.

## Replay

75 seconds total. Time is distributed using the authored duration weight multiplied by an arc-length factor. A short 520 ms pause is inserted between the major stages. Strokes run sequentially; accents and finishing marks appear late. Reduced-motion preference instantly displays the completed scene.

## Runtime and preservation

`clear-maple-pavilion-002.json` uses `schemaVersion: 2` / `ordered-pressure-strokes`. `live-art-online.js` now supports v1 and v2 in parallel. The active catalogue points clear weather to this revision. Rain stays on its existing v1 path renderer and original Rain JSON. The prior Clear 001 JSON, JPEG master, and old preview are retained unchanged.
