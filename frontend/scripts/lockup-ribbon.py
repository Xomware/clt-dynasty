"""Splits lockup@2x.png into the art above the FANTASY FOOTBALL ribbon and the ribbon.

python3 scripts/lockup-ribbon.py   (needs pillow, numpy, scipy)

Both pieces keep the lockup's full canvas, so they stack back into it exactly.
Under each letter of CLT DYNASTY runs a dark outline, a 13-15px white rim, then
the ribbon's purple. A quadratic RANSAC'd through where the purple starts finds
the arch; a quartic refit on everything near it follows the flatter tails. Both
pieces keep the white rim. At the tails the C and Y reach below the arch, so
their teal and outlines stay with the letters.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent / "public" / "brand"


def classify(a):
    """W white, T teal, P purple, . clear, ? anything else (antialiased edges)."""
    r, g, b, al = (a[..., i] for i in range(4))
    out = np.full(a.shape[:2], "?")
    out[(b > r) & (g < 90)] = "P"
    out[(g > 120) & (b > 120) & (r < 120)] = "T"
    out[np.minimum(np.minimum(r, g), b) > 190] = "W"
    out[al < 128] = "."
    return out


def rim_points(a):
    kinds = classify(a)
    pts = []
    for x in range(a.shape[1]):
        runs = []
        for y in range(500, a.shape[0]):
            k = kinds[y, x]
            if runs and (k == "?" or runs[-1][0] == k):
                runs[-1][2] += 1
            elif k != "?":
                runs.append([k, y, 1])
        for (k0, _, _), (k1, _, n1), (k2, y2, n2), (k3, _, n3) in zip(runs, runs[1:], runs[2:], runs[3:]):
            if (k0, k1, k2, k3) == ("T", "P", "W", "P") and 3 <= n1 <= 10 and 10 <= n2 <= 20 and n3 >= 15:
                pts.append((x, y2 + n2))
    return np.array(pts, float)


def arch(pts, width):
    rng = np.random.default_rng(1)
    best = None
    for _ in range(3000):
        s = pts[rng.choice(len(pts), 3, replace=False)]
        c = np.polyfit(s[:, 0], s[:, 1], 2)
        n = (np.abs(np.polyval(c, pts[:, 0]) - pts[:, 1]) < 2.5).sum()
        if best is None or n > best[1]:
            best = (c, n)
    near = np.abs(np.polyval(best[0], pts[:, 0]) - pts[:, 1]) < 15
    c4 = np.polyfit(pts[near, 0], pts[near, 1], 4)
    lo, hi = pts[near, 0].min(), pts[near, 0].max()
    xs = np.arange(width)
    xc = np.clip(xs, lo, hi)
    # Past the last sample, carry on along the tangent.
    return np.polyval(c4, xc) + np.polyval(np.polyder(c4), xc) * (xs - xc)


def main():
    src = Image.open(ROOT / "lockup@2x.png").convert("RGBA")
    a = np.asarray(src).astype(int)
    h, w = a.shape[:2]
    end = arch(rim_points(a), w)
    start = end - 14
    xs = np.arange(w)
    yy = np.arange(h)[:, None]
    top = np.clip((end[None, :] + 0.75 - yy) / 1.5, 0, 1)
    rib = np.clip((yy - (start[None, :] - 0.75)) / 1.5, 0, 1)

    teal = (a[..., 1] > 120) & (a[..., 2] > 120) & (a[..., 0] < 120) & (a[..., 3] > 128)
    ends = ((xs < 170) | (xs > 950))[None, :]
    letter = nd.binary_dilation(teal & (yy > start[None, :]) & ends, iterations=22) & ends
    letter = nd.gaussian_filter(letter.astype(float), 0.8)
    top = np.maximum(top, letter)
    rib *= 1 - letter

    one = Image.open(ROOT / "lockup.png").size
    for name, keep in (("lockup-top", top), ("ribbon", rib)):
        piece = a.copy()
        piece[..., 3] = a[..., 3] * keep
        im = Image.fromarray(piece.astype(np.uint8), "RGBA")
        im.save(ROOT / f"{name}@2x.webp", quality=90, method=6)
        im.resize(one, Image.LANCZOS).save(ROOT / f"{name}.webp", quality=90, method=6)


if __name__ == "__main__":
    main()
