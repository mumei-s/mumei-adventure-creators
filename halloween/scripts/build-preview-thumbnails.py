#!/usr/bin/env python3
"""Build display-only thumbnails for large, actively mapped preview originals.

Original images and sampleFor() mappings remain untouched. Node enumerates the
same collection-aware mappings used by the UI, including automatic collages.
"""

from __future__ import annotations

import hashlib
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
VERSION = "28-4-16"
OUTPUT = ROOT / "assets" / f"preview-thumbnails-v{VERSION}"
MODULE = ROOT / "preview-thumbnails.js"
MAX_EDGE = 384
QUALITY = 78
MIN_SOURCE_BYTES = 60_000
RASTER_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}

ENUMERATE_SOURCES = r"""
import {questions, AUTO} from './catalog.js?v=28.4.6';
import {applyCollection} from './collection.js?v=28.4.6';
import {sampleFor} from './examples.js?v=28.4.6';
const sources = new Map();
for (const collection of ['halloween', 'everyday']) {
  applyCollection(collection);
  for (const question of questions) {
    const values = [...new Set([AUTO, ...question.groups.flatMap(g => g.values)])];
    for (const value of values) {
      const sample = sampleFor(question.key, value);
      const references = sample.kind === 'image' ? [sample.src] : (sample.srcs || []);
      for (const src of references) {
        // SVG fragments and non-file sources retain their original UI route.
        if (src.includes('#') || /^(?:data:|blob:|https?:)/i.test(src)) continue;
        const source = src.split('?', 1)[0].replace(/^\.\//, '');
        if (!sources.has(source)) sources.set(source, []);
        sources.get(source).push({collection, key: question.key, value});
      }
    }
  }
}
console.log(JSON.stringify([...sources].map(([source, uses]) => ({source, uses}))));
"""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def enumerate_sources() -> list[dict]:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", ENUMERATE_SOURCES],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


def main() -> None:
    sources = enumerate_sources()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    entries = []
    raster_count = 0
    raster_source_bytes = 0

    for record in sorted(sources, key=lambda item: item["source"]):
        source = record["source"]
        path = (ROOT / source).resolve()
        if not path.is_relative_to(ROOT):
            raise ValueError(f"Mapped asset escapes the site folder: {source}")
        if not path.is_file():
            raise FileNotFoundError(f"Missing mapped preview: {source}")
        if path.suffix.lower() not in RASTER_SUFFIXES:
            continue

        raw = path.read_bytes()
        raster_count += 1
        raster_source_bytes += len(raw)
        with Image.open(io.BytesIO(raw)) as original:
            source_dimensions = list(original.size)
            if max(original.size) <= MAX_EDGE or len(raw) <= MIN_SOURCE_BYTES:
                continue
            # Preserve the displayed orientation, full frame, aspect and alpha.
            image = ImageOps.exif_transpose(original)
            alpha = "A" in image.getbands() or "transparency" in image.info
            image = image.convert("RGBA" if alpha else "RGB")
            image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, format="WEBP", quality=QUALITY, method=6)
            thumbnail_bytes = buffer.getvalue()
            thumbnail_dimensions = list(image.size)

        output_hash = sha256(thumbnail_bytes)
        filename = output_hash[:20] + ".webp"
        destination = OUTPUT / filename
        if destination.exists() and destination.read_bytes() != thumbnail_bytes:
            raise ValueError(f"Thumbnail hash filename collision: {filename}")
        destination.write_bytes(thumbnail_bytes)
        thumbnail = destination.relative_to(ROOT).as_posix()
        entries.append(
            {
                "source": source,
                # Inspector and generation must bind to this original source.
                "originalSource": source,
                "thumbnail": thumbnail,
                "sourceSha256": sha256(raw),
                "thumbnailSha256": output_hash,
                "sourceBytes": len(raw),
                "thumbnailBytes": len(thumbnail_bytes),
                "sourceDimensions": source_dimensions,
                "thumbnailDimensions": thumbnail_dimensions,
                "hasAlpha": alpha,
                "uses": record["uses"],
            }
        )

    source_bytes = sum(entry["sourceBytes"] for entry in entries)
    output_bytes = sum(entry["thumbnailBytes"] for entry in entries)
    manifest = {
        "version": "28.4.16",
        "scope": "Mapped previews in Halloween and everyday, including implicit AUTO sources",
        "policy": {
            "maxEdge": MAX_EDGE,
            "quality": QUALITY,
            "format": "WebP",
            "minimumSourceBytesExclusive": MIN_SOURCE_BYTES,
            "minimumSourceMaxEdgeExclusive": MAX_EDGE,
            "crop": False,
            "preserveAspect": True,
            "preserveAlpha": True,
            "preserveOriginals": True,
            "originalBinding": "items[].originalSource is the inspector and generation source; items[].thumbnail is display-only",
        },
        "totals": {
            "mappedRasterSources": raster_count,
            "mappedRasterSourceBytes": raster_source_bytes,
            "thumbnailSources": len(entries),
            "sourceBytes": source_bytes,
            "thumbnailBytes": output_bytes,
            "savedBytes": source_bytes - output_bytes,
            "savedPercent": round((1 - output_bytes / source_bytes) * 100, 3)
            if source_bytes
            else 0,
            "allMappedRasterDisplayBytes": raster_source_bytes - source_bytes + output_bytes,
        },
        "items": entries,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    mapping = {entry["source"]: "./" + entry["thumbnail"] for entry in entries}
    module = (
        "// Generated by scripts/build-preview-thumbnails.py. Display only.\n"
        "// Inspector and generation retain the originals recorded in manifest.json.\n"
        "const thumbnails = "
        + json.dumps(mapping, ensure_ascii=False, indent=2)
        + ";\n\n"
        "export function previewThumbnailFor(src) {\n"
        "  if (typeof src !== 'string' || src.includes('#')) return src;\n"
        "  const source = src.split('?', 1)[0].replace(/^\\.\\//, '');\n"
        "  return Object.prototype.hasOwnProperty.call(thumbnails, source) ? thumbnails[source] : src;\n"
        "}\n"
    )
    MODULE.write_text(module, encoding="utf-8")
    print(json.dumps(manifest["totals"], ensure_ascii=False))


if __name__ == "__main__":
    main()
