#!/usr/bin/env python3
"""Check the companion drawings against the rules they were drawn to.

    python tools/check_silhouettes.py

The rule that matters most is that the set must stay apart without colour
(the notes kept with this project), because the owner is
colour-blind.  So every drawing is flattened to a pure black shape at icon
size and the shapes are compared with each other: any pair that is nearly the
same shape is reported, along with drawings whose subject is lost at that size.

Writes the flattened shapes next to the originals under silhouettes/ so they
can be looked at, and prints a table.  Nothing is deleted or overwritten in the
companions folder itself.
"""
from __future__ import annotations

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPANIONS = os.path.join(ROOT, "companions", "frames")
OUT = os.path.join(COMPANIONS, "silhouettes")
SIZE = 64                 # the size the picker shows them at
INK = 245                 # anything darker than this counts as drawn
TOO_ALIKE = 0.90          # share of pixels that may match before it is a clash
TOO_THIN = 0.06           # a shape smaller than this reads as a speck
TOO_HEAVY = 0.62          # a shape larger than this reads as a blob


def silhouette(path):
    """Flatten onto white, then make every drawn pixel black."""
    image = Image.open(path).convert("RGBA")
    flat = Image.new("RGB", image.size, "white")
    flat.paste(image, mask=image.split()[3])
    small = flat.convert("L").resize((SIZE, SIZE), Image.LANCZOS)
    return small.point(lambda v: 0 if v < INK else 255, mode="1")


def pixels(shape):
    """One byte per pixel: 0 where the drawing is, 255 where the paper is."""
    return shape.convert("L").tobytes()


def coverage(shape):
    return pixels(shape).count(0) / float(SIZE * SIZE)


def sameness(a, b):
    same = sum(1 for x, y in zip(pixels(a), pixels(b)) if x == y)
    return same / float(SIZE * SIZE)


def main():
    if not os.path.isdir(COMPANIONS):
        print(f"no companions folder yet: {COMPANIONS}")
        return 1
    names = sorted(n for n in os.listdir(COMPANIONS) if n.endswith(".png"))
    if not names:
        print("no drawings to check")
        return 1
    os.makedirs(OUT, exist_ok=True)

    shapes = {}
    problems = []
    print(f"{'drawing':34} {'ink':>6}  読み取り")
    for name in names:
        shape = silhouette(os.path.join(COMPANIONS, name))
        shape.save(os.path.join(OUT, name))
        shapes[name] = shape
        ink = coverage(shape)
        if ink < TOO_THIN:
            note = "小さすぎる（アイコンで消える）"
            problems.append(f"{name}: 黒く塗られる面積が {ink:.0%} しかない")
        elif ink > TOO_HEAVY:
            note = "塗りつぶしに近い（形が出ない）"
            problems.append(f"{name}: 黒い面積が {ink:.0%} で塊になる")
        else:
            note = "ok"
        print(f"{name:34} {ink:6.1%}  {note}")

    print()
    worst = []
    listed = sorted(shapes)
    for i, a in enumerate(listed):
        for b in listed[i + 1:]:
            worst.append((sameness(shapes[a], shapes[b]), a, b))
    worst.sort(reverse=True)
    for score, a, b in worst[:5]:
        mark = "  <-- 似すぎ" if score >= TOO_ALIKE else ""
        print(f"{score:6.1%}  {a} / {b}{mark}")
        if score >= TOO_ALIKE:
            problems.append(f"{a} と {b} が黒一色で {score:.0%} 一致する")

    print()
    if problems:
        print(f"直すもの {len(problems)} 件")
        for line in problems:
            print(f"  - {line}")
        return 1
    print(f"{len(names)} 体すべて、色を抜いても互いに見分けられる")
    print(f"確認用の黒い形: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
