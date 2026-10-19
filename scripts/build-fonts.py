"""Build the site's web fonts from the installed Fontsource files.

Source Serif 4 and Source Sans 3 (Adobe) are licensed under the SIL Open Font License 1.1 with the
Reserved Font Name "Source". Instancing and subsetting create Modified Versions, so the output is
renamed "Radiuk Serif" / "Radiuk Sans"; copyright, trademark and licence records are kept, and the
licence texts are copied next to the fonts.

Usage (from the repository root, after `npm ci`):
    uv run --with fonttools --with brotli python -I scripts/build-fonts.py
"""

import pathlib
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
FS = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "public" / "fonts"

# Fontsource's latin range, and a reduced extended-Latin range for European names and sub/superscripts.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
    "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
)
EXT = "U+0100-017F,U+0218-021B,U+2070-209F"

SERIF = FS / "source-serif-4" / "files"
SANS = FS / "source-sans-3" / "files"
JOBS = [
    # output file, source, axis limits, unicode range
    ("serif-latin.woff2", SERIF / "source-serif-4-latin-wght-normal.woff2", {"wght": (400, 600)}, LATIN),
    ("serif-latin-ext.woff2", SERIF / "source-serif-4-latin-ext-wght-normal.woff2", {"wght": (400, 600)}, EXT),
    ("serif-italic-latin.woff2", SERIF / "source-serif-4-latin-wght-italic.woff2", {"wght": 400}, LATIN),
    ("serif-italic-latin-ext.woff2", SERIF / "source-serif-4-latin-ext-wght-italic.woff2", {"wght": 400}, EXT),
    ("sans-latin.woff2", SANS / "source-sans-3-latin-wght-normal.woff2", {"wght": (400, 600)}, LATIN),
    ("sans-latin-ext.woff2", SANS / "source-sans-3-latin-ext-wght-normal.woff2", {"wght": (400, 600)}, EXT),
]

RENAMES = [
    ("Source Serif 4", "Radiuk Serif"),
    ("SourceSerif4", "RadiukSerif"),
    ("Source Sans 3", "Radiuk Sans"),
    ("SourceSans3", "RadiukSans"),
]
KEEP_NAME_IDS = {0, 7, 13, 14}  # copyright, trademark, licence description, licence URL


def codepoints(spec: str) -> set[int]:
    out: set[int] = set()
    for part in spec.split(","):
        start, _, end = part.strip().removeprefix("U+").partition("-")
        out.update(range(int(start, 16), int(end or start, 16) + 1))
    return out


def rename(font: TTFont) -> None:
    for record in font["name"].names:
        if record.nameID in KEEP_NAME_IDS:
            continue
        text = record.toUnicode()
        for old, new in RENAMES:
            text = text.replace(old, new)
        record.string = text


def build(out_name: str, source: pathlib.Path, axes: dict, unicode_range: str) -> int:
    font = TTFont(source, lazy=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=codepoints(unicode_range))
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, axes)
    rename(font)
    font.flavor = "woff2"
    target = OUT / out_name
    font.save(target)
    return target.stat().st_size


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for out_name, source, axes, unicode_range in JOBS:
        size = build(out_name, source, axes, unicode_range)
        total += size
        print(f"{out_name:30} {size / 1024:6.1f} KB  (from {source.name}, {source.stat().st_size / 1024:.1f} KB)")
    shutil.copyfile(FS / "source-serif-4" / "LICENSE", OUT / "OFL-source-serif-4.txt")
    shutil.copyfile(FS / "source-sans-3" / "LICENSE", OUT / "OFL-source-sans-3.txt")
    print(f"total {total / 1024:.1f} KB")


if __name__ == "__main__":
    main()
