"""Cuts the Buzz City marks out of Dom's brand sheet into public/brand/.

python3 scripts/brand-assets.py   (needs pillow, numpy, scipy)

source/clt-dynasty-logo-sheet.png is Dom's 1536x1024 original. The marks are cut
from source/clt-dynasty-logo-sheet@4x.png, the same sheet run through
realesrgan-ncnn-vulkan with the realesrgan-x4plus-anime model.

The sheet is keyed off its off-white paper by flood-filling from the border,
so whites enclosed by the art (eyes, gloves, wings) stay opaque. Edge pixels
are un-mixed from the paper colour for a soft edge. Each mark is then the
blobs under its seed points, and gets an ivory die-cut rim so it reads on the
purple jersey too.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent / "public" / "brand"
SHEET = ROOT / "source" / "clt-dynasty-logo-sheet@4x.png"
X = 4
IVORY = (246, 242, 231)

# Seed points (x, y) on the original 1536x1024 sheet, one per separate blob of
# a mark; the y the mark ends at where something else sits just below it; and
# the widest the mark is drawn in CSS px, which is its 1x export.
MARKS = {
    "lockup": ([(300, 300)], None, 560),
    "badge-skyline": ([(1000, 300)], None, 380),
    "head-crowned": ([(1380, 400), (1358, 228)], None, 200),
    "seal": ([(190, 800)], 940, 260),
    "monogram": ([(480, 780)], None, 140),
    "helmet": ([(740, 780)], None, 220),
    "pennant": ([(1100, 770)], None, 320),
    "football-hornet": ([(1390, 780), (1390, 660)], None, 180),
}
WIDTH = {name: w for name, (_, _, w) in MARKS.items()} | {"head": 200, "crown": 120}


def key(rgb):
    """RGBA of the sheet with the paper removed."""
    a = rgb.astype(float)
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, 0)
    paperish = np.abs(a - bg).max(2) < 24
    lab, _ = nd.label(paperish)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    outside = np.isin(lab, border[border > 0])
    # Colour-to-alpha against the paper, only where the art meets the outside.
    band = nd.binary_dilation(outside, iterations=2 * X)
    darker = np.clip((bg - a) / bg, 0, 1).max(2)
    alpha = np.ones(a.shape[:2])
    alpha[band] = darker[band]
    alpha[outside & (darker < 0.08)] = 0
    alpha = np.where(alpha < 0.04, 0, alpha)
    # Specks of the sheet's grain that survive keying would grow their own rim.
    lab, n = nd.label(alpha > 0)
    sizes = nd.sum(np.ones_like(alpha), lab, range(1, n + 1))
    alpha[np.isin(lab, np.flatnonzero(sizes < 150 * X * X) + 1)] = 0
    safe = np.maximum(alpha, 1e-3)[..., None]
    color = np.where(alpha[..., None] > 0, (a - (1 - safe) * bg) / safe, 0)
    return np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)


def cut(rgba, seeds, bottom):
    """The blobs of `rgba` under `seeds`, cropped to them."""
    art = rgba[..., 3] > 0
    if bottom:
        art[bottom * X :] = False
    # Blobs are grouped across the hairline gaps inside one mark (antenna tips, crowns on letters).
    lab, _ = nd.label(nd.binary_dilation(art, iterations=4 * X))
    keep = np.isin(lab, [lab[y * X, x * X] for x, y in seeds]) & art
    assert keep.any(), seeds
    ys, xs = np.nonzero(keep)
    out = rgba.copy()
    out[~keep, 3] = 0
    return out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def rim(rgba, width):
    """Lays the art over an ivory die-cut silhouette `width` px wider than it."""
    alpha = rgba[..., 3].astype(float) / 255
    pad = width + 2
    alpha = np.pad(alpha, pad)
    dist = nd.distance_transform_edt(alpha < 0.5)
    sil = np.clip(width + 1 - dist, 0, 1)
    out = Image.new("RGBA", (alpha.shape[1], alpha.shape[0]), IVORY + (0,))
    out.putalpha(Image.fromarray((sil * 255).astype(np.uint8)))
    art = Image.fromarray(np.pad(rgba, ((pad, pad), (pad, pad), (0, 0))))
    return Image.alpha_composite(out, art)


def trim(im, pad=1):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def save(name, im):
    """1x at the mark's CSS width and 2x at double, both scaled down from the 4x sheet."""
    w = WIDTH[name]
    assert w * 2 <= im.width, (name, im.width)
    sizes = {"": w, "@2x": w * 2}
    for scale, img in ((k, im.resize((v, round(im.height * v / im.width)), Image.LANCZOS)) for k, v in sizes.items()):
        img.save(ROOT / f"{name}{scale}.png", optimize=True)
        img.save(ROOT / f"{name}{scale}.webp", quality=90, method=6)
    print(f"{name}: {im.width}x{im.height} at 4x, 1x {w}px wide")


def split_crown(rgba):
    """The head mark's crown floats clear of the head: the topmost blob that isn't an antenna."""
    solid = rgba[..., 3] > 128
    lab, n = nd.label(solid)
    boxes = nd.find_objects(lab)
    # The crown is the component whose box is widest within the top third.
    top = [i for i, (ys, xs) in enumerate(boxes) if ys.stop < rgba.shape[0] * 0.4]
    crown = max(top, key=lambda i: boxes[i][1].stop - boxes[i][1].start) + 1
    near = nd.binary_dilation(lab == crown, iterations=3 * X)
    head = rgba.copy()
    head[near, 3] = 0
    only = rgba.copy()
    only[~near, 3] = 0
    return head, only


def tile(im, size, bg, scale=0.8):
    """`im` centred on a square tile, fitted to `scale` of it."""
    out = bg.copy() if isinstance(bg, Image.Image) else Image.new("RGBA", (size, size), bg)
    fit = im.copy()
    fit.thumbnail((round(size * scale), round(size * scale)), Image.LANCZOS)
    out.alpha_composite(fit, ((size - fit.width) // 2, (size - fit.height) // 2))
    return out


# The 90s road jersey: deep purple, mostly faint dark pinstripes, a coloured one
# every few, and a little zig-zag kink in some of them now and then. One tile is
# 12 lanes wide; each lane is (colour or None for a faint stripe, kink y or None).
LANE, TILE_H = 32, 480
LANES = [
    ("#2ba3c6", 70),
    (None, None),
    (None, None),
    ("#9fc0f0", 300),
    (None, None),
    ("#62ab9d", None),
    (None, 220),
    (None, None),
    ("#a897e2", 160),
    (None, None),
    ("#3fb4d8", 405),
    (None, None),
]
ROAD = "#3b3e8b"
PAPER = "#f6f2e7"


def lane_points(i, kink):
    """The stripe's centreline down one tile, with a three-tooth kink at `kink`."""
    x = LANE * i + LANE / 2
    if kink is None:
        return [(x, 0), (x, TILE_H)]
    teeth = [(x, kink), (x + 3, kink + 5), (x - 3, kink + 11), (x + 3, kink + 17), (x - 3, kink + 23), (x, kink + 28)]
    return [(x, 0), *teeth, (x, TILE_H)]


def jersey_svg(light):
    """The tile as SVG: the road (purple) jersey, or a faint version for paper panels."""
    faint = "rgb(75 42 143 / 0.08)" if light else "rgb(16 9 52 / 0.3)"
    edge = "rgb(75 42 143 / 0.12)" if light else "rgb(14 8 44 / 0.55)"
    paths = []
    for i, (color, kink) in enumerate(LANES):
        d = "M" + " L".join(f"{x:g} {y:g}" for x, y in lane_points(i, kink))
        if color is None:
            paths.append(f'<path d="{d}" stroke="{faint}" stroke-width="1.5"/>')
            continue
        paths.append(f'<path d="{d}" stroke="{edge}" stroke-width="6"/>')
        opacity = ' stroke-opacity="0.45"' if light else ""
        paths.append(f'<path d="{d}" stroke="{color}" stroke-width="4"{opacity}/>')
    w = LANE * len(LANES)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{TILE_H}" viewBox="0 0 {w} {TILE_H}">'
        f'<g fill="none" stroke-linejoin="miter" stroke-miterlimit="8">{"".join(paths)}</g></svg>\n'
    )


def jersey(width, height, scale=4):
    """The road jersey drawn with PIL at `scale`x and reduced, for the OG image and icons."""
    from PIL import ImageDraw

    im = Image.new("RGB", (width * scale, height * scale), ROAD)
    d = ImageDraw.Draw(im, "RGBA")
    rows = range(0, height + TILE_H, TILE_H)
    for tx in range(0, width + LANE * len(LANES), LANE * len(LANES)):
        for ty in rows:
            for i, (color, kink) in enumerate(LANES):
                pts = [((tx + x) * scale, (ty + y) * scale) for x, y in lane_points(i, kink)]
                if color is None:
                    d.line(pts, fill=(16, 9, 52, 77), width=round(1.5 * scale), joint="curve")
                    continue
                d.line(pts, fill=(14, 8, 44, 140), width=6 * scale, joint="curve")
                d.line(pts, fill=color, width=4 * scale, joint="curve")
    return im.resize((width, height), Image.LANCZOS).convert("RGBA")


def main():
    buzz = ROOT.parent.parent / "components" / "buzz"
    (buzz / "jersey-road.svg").write_text(jersey_svg(light=False))
    (buzz / "jersey-home.svg").write_text(jersey_svg(light=True))

    sheet = key(np.asarray(Image.open(SHEET).convert("RGB")))
    cuts = {name: cut(sheet, seeds, bottom) for name, (seeds, bottom, _) in MARKS.items()}
    cuts["head"], cuts["crown"] = split_crown(cuts["head-crowned"])

    marks = {}
    for name, rgba in cuts.items():
        marks[name] = trim(rim(rgba, 5 * X))
        save(name, marks[name])

    # At 16px the crown turns to mush, so the smallest favicon is the bare head.
    icons = {size: tile(marks["head" if size == 16 else "head-crowned"], size * 4, (0, 0, 0, 0), 1).resize((size, size), Image.LANCZOS) for size in (16, 32, 48, 64)}
    for size in (16, 32):
        icons[size].save(ROOT / f"favicon-{size}.png", optimize=True)
    icons[64].save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)], append_images=[icons[16], icons[32], icons[48]])
    for size, name in ((180, "apple-touch-icon"), (192, "icon-192"), (512, "icon-512")):
        # Home-screen icons get no transparency on iOS, so they sit on the jersey.
        tile(marks["head-crowned"], size, jersey(size, size), 0.8).convert("RGB").save(ROOT / f"{name}.png", optimize=True)

    og = jersey(1200, 630)
    shade = Image.new("L", og.size)
    shade.putdata([min(255, int(150 * (((x - 600) / 600) ** 2 + ((y - 315) / 400) ** 2))) for y in range(630) for x in range(1200)])
    og = Image.composite(Image.new("RGBA", og.size, (23, 13, 49, 255)), og, shade)
    lockup = marks["lockup"].copy()
    lockup.thumbnail((1000, 560), Image.LANCZOS)
    og.alpha_composite(lockup, ((1200 - lockup.width) // 2, (630 - lockup.height) // 2))
    og.convert("RGB").save(ROOT / "og.jpg", quality=88, optimize=True, progressive=True)


if __name__ == "__main__":
    main()
