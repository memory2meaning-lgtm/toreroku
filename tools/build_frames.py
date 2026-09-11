#!/usr/bin/env python3
"""Cut the companion drawings down to the frames the app actually ships.

    python tools/build_frames.py

The drawings come out of image generation about a megapixel each and a
megabyte apiece.  The app shows a companion at 84 pixels on the home screen
and about 170 in the picker, and it is meant to be installed on a phone over
a home connection, so the full-size files have no business being downloaded.

This reads the full-size drawings - the standing pose in companions/ and the
two extra poses in companions/poses/ - and writes small copies into
companions/frames/, which is what index.html and app.js load:

    frames/<slug>-a.png      the standing pose, the one that is nearly always on
    frames/<slug>-blink.png  eyes closed
    frames/<slug>-shift.png  a small movement

A companion with no extra poses still gets its -a frame, and the app simply
has nothing to swap to: the picture stands still.  So this can be run at any
point while the poses are being drawn.

Nothing in companions/ or companions/poses/ is written to or deleted.
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPANIONS = os.path.join(ROOT, "companions")
MASTERS = os.path.join(COMPANIONS, "masters")
POSES = os.path.join(MASTERS, "poses")
OUT = os.path.join(COMPANIONS, "frames")
ICON_SOURCES = os.path.join(MASTERS, "icons")
APP = ROOT

SIZE = 256          # twice the largest size the app shows, for dense screens
COLOURS = 64        # the drawings are flat and muted; 64 is more than they use
POSE_NAMES = ("blink", "shift")
JUMPS = 0.08       # more of the picture than this moving is a different pose


def shrink(path: str, out: str) -> int:
    """Write a small, few-coloured copy of one drawing. Returns its size."""
    with Image.open(path) as art:
        art = art.convert("RGB")
        art.thumbnail((SIZE, SIZE), Image.LANCZOS)
        # A palette holds the flat colours exactly and costs a third of RGB.
        small = art.quantize(colors=COLOURS, method=Image.MEDIANCUT, dither=Image.NONE)
        small.save(out, format="PNG", optimize=True)
    return os.path.getsize(out)


def drift(base: str, pose: str) -> float:
    """How much of the picture moved, as a share of it.

    A frame is only worth swapping to if the character stays where it is: the
    two are shown one after the other, so anything that moves and should not
    reads as the drawing jumping. A blink comes out under half a percent; a
    small movement a few percent. Anything into double figures is a different
    pose, not a frame of the same one.
    """
    with Image.open(base) as first, Image.open(pose) as second:
        a = first.convert("L").resize((256, 256), Image.LANCZOS)
        b = second.convert("L").resize((256, 256), Image.LANCZOS)
        moved = ImageChops.difference(a, b).point(lambda v: 1 if v > 40 else 0)
        return sum(moved.getdata()) / (256.0 * 256.0)


def icons() -> list:
    """Cut the home-screen icons the manifest asks for, if they were drawn.

    Two drawings go in: the plain one, and one with the picture pulled into
    the middle so Android can round the corners off without taking a bite out
    of it. Everything the manifest names comes out of those two.
    """
    wanted = [
        ("icon-source.png", "icon-192.png", 192),
        ("icon-source.png", "icon-512.png", 512),
        ("icon-source-maskable.png", "icon-maskable-512.png", 512),
    ]
    made = []
    for source, name, size in wanted:
        path = os.path.join(ICON_SOURCES, source)
        if not os.path.exists(path):
            continue
        with Image.open(path) as art:
            art = art.convert("RGB").resize((size, size), Image.LANCZOS)
            art.quantize(colors=COLOURS, method=Image.MEDIANCUT, dither=Image.NONE).save(
                os.path.join(APP, name), format="PNG", optimize=True)
        made.append((name, os.path.getsize(os.path.join(APP, name))))
    return made


def main() -> int:
    if not os.path.isdir(MASTERS):
        print("no drawings at " + MASTERS)
        return 1
    os.makedirs(OUT, exist_ok=True)

    stills = sorted(
        name for name in os.listdir(MASTERS)
        if name.startswith("companion-") and name.endswith(".png")
    )
    if not stills:
        print("no drawings to work from")
        return 1

    total_before = 0
    total_after = 0
    rows = []
    for still in stills:
        slug = still[len("companion-"):-len(".png")]
        sources = [(os.path.join(MASTERS, still), slug + "-a.png")]
        for pose in POSE_NAMES:
            src = os.path.join(POSES, slug + "-" + pose + ".png")
            if os.path.exists(src):
                sources.append((src, slug + "-" + pose + ".png"))

        made = []
        moved = {}
        for src, name in sources:
            before = os.path.getsize(src)
            after = shrink(src, os.path.join(OUT, name))
            total_before += before
            total_after += after
            pose = name.rsplit("-", 1)[1][: -len(".png")]
            made.append(pose)
            if pose != "a":
                moved[pose] = drift(sources[0][0], src)
        rows.append((slug, made, moved))

    width = max(len(slug) for slug, _, _ in rows)
    for slug, made, moved in rows:
        missing = [p for p in POSE_NAMES if p not in made]
        note = "" if not missing else "   (still to draw: " + ", ".join(missing) + ")"
        shift = "  ".join("%s %.1f%%" % (p, moved[p] * 100) for p in POSE_NAMES if p in moved)
        loud = [p for p in moved if moved[p] > JUMPS]
        if loud:
            note += "   LOOK AT: " + ", ".join(sorted(loud)) + " (the character moves too much)"
        print(slug.ljust(width) + "  " + shift.ljust(24) + note)

    print("")
    print("%d frames in %s" % (sum(len(m) for _, m, _ in rows), OUT))
    print("%.1f MB of drawings -> %.2f MB shipped" % (
        total_before / 1048576.0, total_after / 1048576.0))
    cut = icons()
    if cut:
        print("")
        for name, size in cut:
            print("%-24s %5.1f KB" % (name, size / 1024.0))
    else:
        print("")
        print("no icon drawings in " + ICON_SOURCES + " - the manifest names three that do not exist")

    waiting = [slug for slug, made, _ in rows if len(made) < 1 + len(POSE_NAMES)]
    if waiting:
        print("no poses yet for: " + ", ".join(waiting))
    return 0


if __name__ == "__main__":
    sys.exit(main())
