# -*- coding: utf-8 -*-
"""Generates src/datasets/copenhagen-water.js — the coastline and lakes.

The map is schematic but geographically projected, so the shoreline can be
real. This bakes it in as path data; the app gains no dependency and does no
geometry work at runtime.

Inputs are fetched from the Overpass API (OpenStreetMap), or read from cached
copies with --coast/--water.

  python3 tools/build-water.py
  python3 tools/build-water.py --coast coast.json --water water.json

OpenStreetMap data is © OpenStreetMap contributors, ODbL.

How land is decided: every cell of a grid over the map box casts a ray east.
The whole eastern edge of the fetched area lies in Øresund, so an odd number
of coastline crossings means the cell is inland. Lakes are then punched out of
that raster, and the result is contoured with marching squares.
"""

import argparse
import json
import math
import re
import urllib.parse
import urllib.request
from bisect import bisect_right

ROOT = __file__.rsplit("/tools/", 1)[0]
DATASET = ROOT + "/src/datasets/copenhagen.js"
OUT = ROOT + "/src/datasets/copenhagen-water.js"

BBOX = (55.52, 12.26, 55.84, 12.72)       # south, west, north, east
BOX = (130.0, 130.0, 780.0, 880.0)        # the dataset's map box, in map units
MARGIN = 70.0                             # rasterise past the box (see below)
CELL = 1.5                                # raster resolution, map units
MIN_LAKE_AREA = 90.0                      # map units squared
OVERPASS = "https://overpass-api.de/api/interpreter"
AGENT = "zonetjek/1.0 (+https://github.com/solonnoi/zonetjek)"


def fetch(query):
    body = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(OVERPASS, data=body, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def coastline_query():
    return ('[out:json][timeout:90];(way["natural"="coastline"](%f,%f,%f,%f););out geom;'
            % BBOX)


def water_query():
    return ('[out:json][timeout:120];('
            'way["natural"="water"]["name"](%f,%f,%f,%f);'
            'relation["natural"="water"]["name"](%f,%f,%f,%f););out geom;'
            % (BBOX + BBOX))


def fit_projection():
    """The dataset carries both lat/lon and x/y per stop, and the projection
    that made it is linear, so it can be recovered exactly rather than
    guessed at."""
    src = open(DATASET, encoding="utf-8").read()
    rows = re.findall(
        r'\["[\w]+",\s*"[^"]*",\s*"\w+",\s*(-?[\d.]+),\s*(-?[\d.]+),\s*([\d.]+),\s*([\d.]+)\]',
        src)
    if len(rows) < 20:
        raise SystemExit("could not read stop coordinates from the dataset")
    xs = [float(r[0]) for r in rows]
    ys = [float(r[1]) for r in rows]
    lats = [float(r[2]) for r in rows]
    lons = [float(r[3]) for r in rows]

    def fit(ins, outs):
        n = len(ins)
        sx, sy = sum(ins), sum(outs)
        sxx = sum(v * v for v in ins)
        sxy = sum(a * b for a, b in zip(ins, outs))
        a = (n * sxy - sx * sy) / (n * sxx - sx * sx)
        return a, (sy - a * sx) / n

    a, b = fit(lons, xs)
    c, d = fit(lats, ys)
    err = max(max(abs(a * lo + b - x) for lo, x in zip(lons, xs)),
              max(abs(c * la + d - y) for la, y in zip(lats, ys)))
    if err > 2.0:
        raise SystemExit("projection fit is off by %.2f units; dataset changed shape?" % err)
    print("projection fitted from %d stops, max error %.2f units" % (len(rows), err))
    return (lambda lat, lon: (a * lon + b, c * lat + d))


def segments_from(elements, project):
    """Coastline ways as projected segments."""
    segs = []
    for el in elements:
        geom = el.get("geometry") or []
        pts = [project(p["lat"], p["lon"]) for p in geom if p]
        for i in range(len(pts) - 1):
            if pts[i] != pts[i + 1]:
                segs.append((pts[i], pts[i + 1]))
    return segs


def rings_from_water(elements, project):
    """Named water bodies as projected rings, outers only."""
    rings = []
    for el in elements:
        if el["type"] == "way":
            geom = el.get("geometry") or []
            if len(geom) > 3:
                rings.append([project(p["lat"], p["lon"]) for p in geom])
        else:
            for m in el.get("members", []):
                if m.get("role") == "outer" and m.get("geometry"):
                    g = m["geometry"]
                    if len(g) > 3:
                        rings.append([project(p["lat"], p["lon"]) for p in g])
    return rings


def polygon_area(ring):
    a = 0.0
    for i in range(len(ring)):
        p, q = ring[i], ring[(i + 1) % len(ring)]
        a += p[0] * q[1] - q[0] * p[1]
    return abs(a) / 2.0


def rasterise(segs, lakes, cols, rows, area):
    """1.0 where the cell is land, 0.0 where it is water.

    Rasterised over `area`, which is the map box grown by MARGIN, and forced
    to water along its outer edge. Marching squares can only close a contour
    that stays inside the grid, so a landmass running off the edge would
    otherwise come back as an open fragment. Growing the grid puts that
    artificial shoreline outside the box, where the renderer clips it away."""
    field = [[0.0] * cols for _ in range(rows)]

    # Coastline: odd crossings to the east means inland.
    by_row = [[] for _ in range(rows)]
    for (x1, y1), (x2, y2) in segs:
        if y1 == y2:
            continue
        lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
        j0 = max(0, int(math.ceil((lo - area[1]) / CELL)))
        j1 = min(rows - 1, int(math.floor((hi - area[1]) / CELL)))
        for j in range(j0, j1 + 1):
            y = area[1] + j * CELL
            if not (lo <= y < hi):
                continue
            t = (y - y1) / (y2 - y1)
            by_row[j].append(x1 + (x2 - x1) * t)

    for j in range(rows):
        xs = sorted(by_row[j])
        if not xs:
            continue
        total = len(xs)
        for i in range(cols):
            x = area[0] + i * CELL
            # crossings strictly east of this cell
            if (total - bisect_right(xs, x)) % 2 == 1:
                field[j][i] = 1.0

    # Lakes punch holes in the land.
    for ring in lakes:
        if polygon_area(ring) < MIN_LAKE_AREA:
            continue
        minx = min(p[0] for p in ring); maxx = max(p[0] for p in ring)
        miny = min(p[1] for p in ring); maxy = max(p[1] for p in ring)
        if maxx < area[0] or minx > area[2] or maxy < area[1] or miny > area[3]:
            continue
        i0 = max(0, int((minx - area[0]) / CELL)); i1 = min(cols - 1, int((maxx - area[0]) / CELL) + 1)
        j0 = max(0, int((miny - area[1]) / CELL)); j1 = min(rows - 1, int((maxy - area[1]) / CELL) + 1)
        n = len(ring)
        for j in range(j0, j1 + 1):
            y = area[1] + j * CELL
            xs = []
            for k in range(n):
                x1, y1 = ring[k]
                x2, y2 = ring[(k + 1) % n]
                if y1 == y2:
                    continue
                lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
                if lo <= y < hi:
                    xs.append(x1 + (x2 - x1) * (y - y1) / (y2 - y1))
            xs.sort()
            for i in range(i0, i1 + 1):
                x = area[0] + i * CELL
                if bisect_right(xs, x) % 2 == 1:
                    field[j][i] = 0.0

    # Force the outer ring of cells to water so every contour closes.
    for i in range(cols):
        field[0][i] = 0.0
        field[rows - 1][i] = 0.0
    for j in range(rows):
        field[j][0] = 0.0
        field[j][cols - 1] = 0.0
    return field


def contour(field, cols, rows, area, level=0.5):
    """Marching squares. Segments are directed so a case and its complement
    run opposite ways, which is what lets them chain into closed rings."""
    def at(i, j):
        return field[j][i]

    def lerp(xa, ya, va, xb, yb, vb):
        t = (level - va) / ((vb - va) or 1e-9)
        return (round(xa + (xb - xa) * t, 2), round(ya + (yb - ya) * t, 2))

    segs = []
    for j in range(rows - 1):
        for i in range(cols - 1):
            v0, v1 = at(i, j), at(i + 1, j)
            v2, v3 = at(i + 1, j + 1), at(i, j + 1)
            idx = (1 if v0 > level else 0) | (2 if v1 > level else 0) | \
                  (4 if v2 > level else 0) | (8 if v3 > level else 0)
            if idx in (0, 15):
                continue
            x0, y0 = area[0] + i * CELL, area[1] + j * CELL
            x1, y1 = x0 + CELL, y0 + CELL
            top = lambda: lerp(x0, y0, v0, x1, y0, v1)
            right = lambda: lerp(x1, y0, v1, x1, y1, v2)
            bottom = lambda: lerp(x1, y1, v2, x0, y1, v3)
            left = lambda: lerp(x0, y1, v3, x0, y0, v0)
            table = {
                1: [(left, top)], 2: [(top, right)], 3: [(left, right)],
                4: [(right, bottom)], 6: [(top, bottom)], 7: [(left, bottom)],
                8: [(bottom, left)], 9: [(bottom, top)], 11: [(bottom, right)],
                12: [(right, left)], 13: [(right, top)], 14: [(top, left)],
                5: [(left, top), (right, bottom)],
                10: [(top, right), (bottom, left)],
            }
            for a, b in table[idx]:
                segs.append((a(), b()))

    starts = {}
    for s in segs:
        starts.setdefault(s[0], []).append(s)
    used = set()
    rings = []
    for s in segs:
        if id(s) in used:
            continue
        ring = [s[0], s[1]]
        used.add(id(s))
        for _ in range(2000000):
            nxt = None
            for cand in starts.get(ring[-1], ()):
                if id(cand) not in used:
                    nxt = cand
                    break
            if nxt is None:
                break
            used.add(id(nxt))
            ring.append(nxt[1])
            if nxt[1] == ring[0]:
                break
        if len(ring) > 4:
            rings.append(ring)
    return rings


def chaikin(ring, passes=2):
    pts = ring
    for _ in range(passes):
        out = []
        n = len(pts)
        for i in range(n):
            ax, ay = pts[i]
            bx, by = pts[(i + 1) % n]
            out.append((ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25))
            out.append((ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75))
        pts = out
    return pts


def simplify(ring, eps):
    if len(ring) < 4:
        return ring

    def dist(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        l2 = dx * dx + dy * dy
        t = 0.0 if not l2 else max(0.0, min(1.0, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / l2))
        return math.hypot(p[0] - (a[0] + t*dx), p[1] - (a[1] + t*dy))

    def run(pts):
        if len(pts) < 3:
            return pts
        worst, idx = 0.0, 0
        for i in range(1, len(pts) - 1):
            d = dist(pts[i], pts[0], pts[-1])
            if d > worst:
                worst, idx = d, i
        if worst <= eps:
            return [pts[0], pts[-1]]
        return run(pts[:idx + 1])[:-1] + run(pts[idx:])

    return run(list(ring) + [ring[0]])[:-1]


def to_path(rings):
    out = []
    for r in rings:
        if len(r) < 3:
            continue
        out.append("M" + " L".join("%.1f %.1f" % p for p in r) + "Z")
    return "".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--coast")
    ap.add_argument("--water")
    args = ap.parse_args()

    project = fit_projection()

    coast = json.load(open(args.coast)) if args.coast else fetch(coastline_query())
    print("coastline ways:", len(coast.get("elements", [])))
    segs = segments_from(coast["elements"], project)
    print("coastline segments:", len(segs))

    water = json.load(open(args.water)) if args.water else fetch(water_query())
    lakes = rings_from_water(water["elements"], project)
    big = [r for r in lakes if polygon_area(r) >= MIN_LAKE_AREA]
    print("named water bodies: %d, large enough to draw: %d" % (len(lakes), len(big)))

    area = (BOX[0] - MARGIN, BOX[1] - MARGIN, BOX[2] + MARGIN, BOX[3] + MARGIN)
    cols = int((area[2] - area[0]) / CELL) + 1
    rows = int((area[3] - area[1]) / CELL) + 1
    print("rasterising %dx%d cells over %s..." % (cols, rows, str(area)))
    field = rasterise(segs, lakes, cols, rows, area)
    land_cells = sum(int(v) for row in field for v in row)
    print("land covers %.0f%% of the rasterised area" % (100.0 * land_cells / (cols * rows)))

    rings = contour(field, cols, rows, area)
    rings = [simplify(chaikin(r), 0.7) for r in rings if polygon_area(r) > 40]
    rings.sort(key=polygon_area, reverse=True)
    path = to_path(rings)
    print("land rings: %d, path data %.1fKB" % (len(rings), len(path) / 1024.0))

    body = '''/* Coastline and lakes for the Copenhagen dataset.

   Generated by tools/build-water.py from OpenStreetMap.
   OpenStreetMap data is (c) OpenStreetMap contributors, ODbL.

   `land` is one path of closed rings covering every landmass in the map box,
   with lakes as counter-wound holes, so it fills correctly with
   fill-rule="evenodd". The sea is simply everything else. */

const WATER_COPENHAGEN = {
  dataset: "copenhagen",
  box: [%s],
  land: "%s"
};
''' % (", ".join(str(v) for v in BOX), path)
    open(OUT, "w", encoding="utf-8").write(body)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
