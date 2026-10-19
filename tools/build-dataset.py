# -*- coding: utf-8 -*-
"""Generates src/datasets/copenhagen.js from published open data.

Inputs (neither is in the repo; both are free downloads):

  --gtfs DIR    an unpacked Rejseplanen GTFS feed, the whole of Danish public
                transport: https://www.rejseplanen.info/labs/GTFS.zip
                (shapes.txt is not needed and can be left out)
  --zones FILE  the DOT fare zones as GeoJSON in WGS84, from Movia's public
                ArcGIS service — 211 polygons, each carrying its zone number
                in `businesske`:
                https://geoservices.moviatrafik.dk/arcgis/rest/services/
                  Hosted/Takstzoner/FeatureServer/0/query
                  ?where=1%3D1&outFields=businesske,name,shortname
                  &returnGeometry=true&outSR=4326&f=geojson

Run:  python3 tools/build-dataset.py --gtfs /tmp/gtfs --zones /tmp/takstzoner.geojson

Every fare fact in the dataset comes from those two files: a stop's zone is
the zone polygon its coordinates fall inside, and a line's stops are the stops
that line actually calls at. The schematic x/y positions and the blob padding
are drawn from the same coordinates but are presentation, not data.

Afterwards: node tools/check-dataset.js
"""

import argparse, collections, csv, json, math, os, re, sys, unicodedata

# --------------------------------------------------------------------------
# What the dataset covers
# --------------------------------------------------------------------------

# The DOT zones of the inner capital area. Lines are cut where they leave it.
SCOPE = {1, 2, 3, 4, 30, 31, 32, 33, 40, 41, 42, 43, 44, 51, 55}

# agency, route number in the feed, then how the dataset should name it.
# Peak-only variants (Bx) and lines that only clip the area are left out; the
# Ring 3 light rail is left out because it would need a sixth mode.
LINES = [
    ("Metroselskabet", "M1",   "M1",   "M1",      "metro"),
    ("Metroselskabet", "M2",   "M2",   "M2",      "metro"),
    ("Metroselskabet", "M3",   "M3",   "M3",      "metro"),
    ("Metroselskabet", "M4",   "M4",   "M4",      "metro"),
    ("DSB S-tog",      "A",    "A",    "A",       "stog"),
    ("DSB S-tog",      "B",    "B",    "B",       "stog"),
    ("DSB S-tog",      "C",    "C",    "C",       "stog"),
    ("DSB S-tog",      "E",    "E",    "E",       "stog"),
    ("DSB S-tog",      "F",    "F",    "F",       "stog"),
    ("DSB S-tog",      "H",    "H",    "H",       "stog"),
    ("DSB",            "RE",   "RE",   "RE",      "regional"),
    ("Skånetrafiken",  "802",  "OR",   "Øresund", "regional"),
    ("Movia",          "1A",   "1A",   "1A",      "bus"),
    ("Movia",          "2A",   "2A",   "2A",      "bus"),
    ("Movia",          "4A",   "4A",   "4A",      "bus"),
    ("Movia",          "5C",   "5C",   "5C",      "bus"),
    ("Movia",          "6A",   "6A",   "6A",      "bus"),
    ("Movia",          "7A",   "7A",   "7A",      "bus"),
    ("Movia",          "8A",   "8A",   "8A",      "bus"),
    ("Movia",          "150S", "150S", "150S",    "bus"),
    ("Movia",          "164",  "164",  "164",     "bus"),
    ("Movia",          "179",  "179",  "179",     "bus"),
    ("Movia",          "200S", "200S", "200S",    "bus"),
    ("Movia",          "250S", "250S", "250S",    "bus"),
    ("Movia",          "350S", "350S", "350S",    "bus"),
    ("Movia",          "500S", "500S", "500S",    "bus"),
    ("Movia",          "991",  "991",  "991",     "harbour"),
    ("Movia",          "992",  "992",  "992",     "harbour"),
]
RAILISH = {"metro", "stog", "regional", "harbour"}

# A service that runs through a zone without calling there would invent an
# adjacency between the zones either side of it. The dataset rules say to give
# it a stop in that zone: a station on its own tracks that it passes. Anything
# not listed here is cut instead (see honest_split).
PASS_THROUGH = [
    ("RE", "Østerport", "Hellerup", "Svanemøllen"),
    ("RE", "Glostrup",  "Valby",    "Brøndbyøster"),
]

# Presentation: the map's own box, and how wide a halo is in real kilometres.
BOX = (130.0, 130.0, 780.0, 880.0)
HALO_KM = 1.15
PAD_SPACING_KM = 0.85
LAT0 = 55.70
KM_PER_DEG_LAT = 110.574
KM_PER_DEG_LON = 111.320 * math.cos(math.radians(LAT0))

HOME = "noerreport"


def km(a_lat, a_lon, b_lat, b_lon):
    p = math.pi / 180
    h = (math.sin((b_lat - a_lat) * p / 2) ** 2 +
         math.cos(a_lat * p) * math.cos(b_lat * p) * math.sin((b_lon - a_lon) * p / 2) ** 2)
    return 2 * 6371.0 * math.asin(min(1, math.sqrt(h)))


# --------------------------------------------------------------------------
# The zone polygons
# --------------------------------------------------------------------------

class Zones:
    def __init__(self, path):
        self.feats = []
        for f in json.load(open(path))["features"]:
            g = f["geometry"]
            polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            cs = [c for poly in polys for ring in poly for c in ring]
            self.feats.append({
                "zone": int(f["properties"]["businesske"]),
                "name": f["properties"]["name"],
                "polys": polys,
                "bbox": (min(c[0] for c in cs), min(c[1] for c in cs),
                         max(c[0] for c in cs), max(c[1] for c in cs)),
            })
        self.by_zone = {f["zone"]: f for f in self.feats}

    @staticmethod
    def _in_ring(lon, lat, ring):
        inside = False
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i][0], ring[i][1]
            x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
            if (y1 > lat) != (y2 > lat):
                if lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
                    inside = not inside
        return inside

    def _contains(self, feat, lat, lon):
        for poly in feat["polys"]:
            if self._in_ring(lon, lat, poly[0]) and \
               not any(self._in_ring(lon, lat, h) for h in poly[1:]):
                return True
        return False

    def zone_of(self, lat, lon):
        for f in self.feats:
            b = f["bbox"]
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and self._contains(f, lat, lon):
                return f["zone"]
        return None

    def name_of(self, z):
        return self.by_zone[z]["name"]

    def polys_of(self, z):
        return self.by_zone[z]["polys"]

    def touching(self, zone_ids, tol_m=60.0):
        """Which zones really share a boundary — the check that catches a line
        running through a zone it never stops in."""
        mx, my = 111320 * math.cos(math.radians(LAT0)), 110540
        grids = {}
        for z in zone_ids:
            g = collections.defaultdict(list)
            for poly in self.polys_of(z):
                for ring in poly:
                    for c in ring:
                        p = (c[0] * mx, c[1] * my)
                        g[(int(p[0] // tol_m), int(p[1] // tol_m))].append(p)
            grids[z] = g
        adj = collections.defaultdict(set)
        for i, a in enumerate(zone_ids):
            for b in zone_ids[i + 1:]:
                ga, gb = grids[a], grids[b]
                if any((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 <= tol_m * tol_m
                       for key, ps in ga.items()
                       for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                       for q in gb.get((key[0] + dx, key[1] + dy), [])
                       for p in ps):
                    adj[a].add(b)
                    adj[b].add(a)
        return adj


# --------------------------------------------------------------------------
# The GTFS feed
# --------------------------------------------------------------------------

class Feed:
    def __init__(self, directory):
        self.dir = directory
        self.stops = {}
        for s in csv.DictReader(open(self._p("stops.txt"))):
            self.stops[s["stop_id"]] = {
                "id": s["stop_id"], "name": s["stop_name"],
                "lat": float(s["stop_lat"]), "lon": float(s["stop_lon"]),
                "parent": s["parent_station"],
            }

    def _p(self, name):
        return os.path.join(self.dir, name)

    def station(self, stop_id):
        """A platform resolves to the station it belongs to."""
        s = self.stops.get(stop_id)
        if s and s["parent"] and s["parent"] in self.stops:
            return self.stops[s["parent"]]
        return s

    def sequences(self, wanted):
        """{(agency, short_name)} -> the stop sequence each of its routes runs,
        taking the variant that calls at the most stops."""
        agencies = {a["agency_id"]: a["agency_name"]
                    for a in csv.DictReader(open(self._p("agency.txt")))}
        route_key = {}
        for r in csv.DictReader(open(self._p("routes.txt"))):
            key = (agencies.get(r["agency_id"]), r["route_short_name"])
            if key in wanted:
                route_key[r["route_id"]] = key
        trip_route = {}
        for t in csv.DictReader(open(self._p("trips.txt"))):
            if t["route_id"] in route_key:
                trip_route[t["trip_id"]] = (route_key[t["route_id"]], t["route_id"],
                                            t["direction_id"])
        rows = collections.defaultdict(list)
        with open(self._p("stop_times.txt"), newline="") as fh:
            rd = csv.reader(fh)
            hdr = next(rd)
            i_trip, i_stop, i_seq = (hdr.index("trip_id"), hdr.index("stop_id"),
                                     hdr.index("stop_sequence"))
            for row in rd:
                if row[i_trip] in trip_route:
                    rows[row[i_trip]].append((int(row[i_seq]), row[i_stop]))
        variants = collections.defaultdict(collections.Counter)
        for tid, items in rows.items():
            items.sort()
            variants[trip_route[tid]][tuple(s for _, s in items)] += 1
        out = collections.defaultdict(list)
        for (key, route_id, direction), counter in variants.items():
            out[key].append(max(counter, key=lambda k: (len(k), counter[k])))
        return out


# --------------------------------------------------------------------------
# Names and ids
# --------------------------------------------------------------------------

def clean_name(name):
    n = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()   # "(Amagerbrogade)"
    n = re.sub(r"\s+St\.?$", "", n).strip()             # "Amagerbro St."
    n = re.sub(r",\s*(Sløjfen|terminalen|broen|Tivoli|Grønttorvet|Frihedsstøtten).*$",
               "", n).strip()
    return n


def slug(name):
    s = name.lower().replace("ø", "oe").replace("æ", "ae").replace("å", "aa")
    s = "".join(c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# --------------------------------------------------------------------------
# Fares: the same two answers the app gives, used here to size the stepper
# --------------------------------------------------------------------------

def longest_trip(stops, lines):
    """The most zones any trip in this dataset costs — the largest ticket worth
    offering. Mirrors findRoute in src/engine.js: the cost of a trip is the
    number of distinct zones it passes through, never fewer than two."""
    import heapq
    zone_of_stop = {s["id"]: s["zone"] for s in stops}
    graph = collections.defaultdict(set)
    for ln in lines:
        for a, b in zip(ln["stops"], ln["stops"][1:]):
            if a != b:
                graph[a].add(b)
                graph[b].add(a)
    worst = (2, None)
    for start in zone_of_stop:
        best = {}
        start_state = (start, (zone_of_stop[start],))
        heap = [(1, start_state)]
        best[start_state] = 1
        reached = {}
        while heap:
            cost, (sid, visited) = heapq.heappop(heap)
            if cost > best.get((sid, visited), 1e9):
                continue
            if sid not in reached:
                reached[sid] = cost
            for nxt in graph[sid]:
                z = zone_of_stop[nxt]
                nv = visited if z in visited else tuple(sorted(visited + (z,)))
                state = (nxt, nv)
                if len(nv) < best.get(state, 1e9):
                    best[state] = len(nv)
                    heapq.heappush(heap, (len(nv), state))
        for sid, cost in reached.items():
            if max(2, cost) > worst[0]:
                worst = (max(2, cost), start + " -> " + sid)
    return worst


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def build(feed, zones):
    wanted = {(agency, number) for agency, number, _, _, _ in LINES}
    seqs = feed.sequences(wanted)

    def in_scope_count(seq):
        return sum(1 for sid in seq
                   if zones.zone_of(feed.station(sid)["lat"], feed.station(sid)["lon"]) in SCOPE)

    raw = {}
    for agency, number, lid, lname, mode in LINES:
        candidates = seqs.get((agency, number))
        if not candidates:
            raise SystemExit("route not in the feed: %s %s" % (agency, number))
        raw[lid] = max(candidates, key=lambda s: (in_scope_count(s), len(s)))

    nodes = {}

    def add_node(key, name, lat, lon, railish):
        if key not in nodes:
            nodes[key] = {"key": key, "name": name, "lat": lat, "lon": lon,
                          "zone": zones.zone_of(lat, lon), "railish": railish,
                          "modes": set()}
        return nodes[key]

    # 1. every station on a rail, metro, regional or harbour line
    for agency, number, lid, lname, mode in LINES:
        if mode not in RAILISH:
            continue
        for sid in raw[lid]:
            st = feed.station(sid)
            add_node(st["id"], clean_name(st["name"]), st["lat"], st["lon"], True)["modes"].add(mode)

    # 2. one interchange, several GTFS stations: Nørreport is three (metro,
    #    S-tog, regional), the airport two. One stop here, carrying every mode.
    canon = {}
    keys = sorted(nodes)
    parent = {k: k for k in keys}

    def find(k):
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            d = km(nodes[a]["lat"], nodes[a]["lon"], nodes[b]["lat"], nodes[b]["lon"])
            if (nodes[a]["name"] == nodes[b]["name"] and d <= 0.45) or d <= 0.15:
                ra, rb = find(a), find(b)
                if ra != rb:
                    parent[rb] = ra
    groups = collections.defaultdict(list)
    for k in keys:
        groups[find(k)].append(k)
    for g in groups.values():
        if len(g) < 2:
            continue
        head = max(g, key=lambda k: (len(nodes[k]["modes"]), len(nodes[k]["name"])))
        lat = sum(nodes[k]["lat"] for k in g) / len(g)
        lon = sum(nodes[k]["lon"] for k in g) / len(g)
        modes = set().union(*(nodes[k]["modes"] for k in g))
        nodes[head].update({"lat": lat, "lon": lon, "modes": modes,
                            "zone": zones.zone_of(lat, lon)})
        for k in g:
            if k != head:
                canon[k] = head
                del nodes[k]

    def node_key(st):
        return canon.get(st["id"], st["id"])

    # 3. bus stops: at a station they are that station, otherwise a stop of
    #    their own — but only the ones the zone maths needs, which is the first
    #    stop in each new zone a line enters, plus the ends of the line.
    railish_nodes = [n for n in nodes.values() if n["railish"]]

    def match_railish(st):
        name = slug(clean_name(st["name"]))
        named = [(km(st["lat"], st["lon"], n["lat"], n["lon"]), n["key"]) for n in railish_nodes
                 if slug(n["name"]) == name or
                 (" st" in st["name"].lower() and slug(n["name"]) in name)]
        named = [c for c in named if c[0] <= 0.9]
        if named:
            return nodes[min(named)[1]]
        d, k = min((km(st["lat"], st["lon"], n["lat"], n["lon"]), n["key"]) for n in railish_nodes)
        return nodes[k] if d <= 0.25 else None

    bus_resolved = {}
    for agency, number, lid, lname, mode in LINES:
        if mode in RAILISH:
            continue
        resolved = []
        for sid in raw[lid]:
            st = feed.station(sid)
            m = match_railish(st)
            resolved.append((m["key"] if m else None, st))
        bus_resolved[lid] = resolved

    # two different bus stops can share a bare name; keep the street then
    seen = collections.defaultdict(set)
    for items in bus_resolved.values():
        for k, st in items:
            if not k:
                seen[clean_name(st["name"])].add(st["id"])
    station_names = {n["name"] for n in railish_nodes}
    ambiguous = {name for name, sids in seen.items()
                 if len(sids) > 1 or name in station_names}

    def bus_name(st):
        bare = clean_name(st["name"])
        m = re.search(r"\(([^)]*)\)\s*$", st["name"])
        return bare + " (" + m.group(1) + ")" if bare in ambiguous and m else bare

    # 4. cut every line where it leaves the area, keeping its longest run inside
    def longest_run(items, zone_of_item):
        runs, cur = [], []
        for it in items:
            if zone_of_item(it) in SCOPE:
                cur.append(it)
            elif cur:
                runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        return max(runs, key=len) if runs else []

    def pass_through(lid, ks):
        by_name = {slug(nodes[k]["name"]): k for k in nodes}
        for line_id, a, b, mid in PASS_THROUGH:
            if line_id != lid:
                continue
            ka, kb, kmid = (by_name.get(slug(a)), by_name.get(slug(b)), by_name.get(slug(mid)))
            if not (ka and kb and kmid):
                raise SystemExit("pass-through stop not in the dataset: %s" % (mid,))
            for i in range(len(ks) - 1):
                if {ks[i], ks[i + 1]} == {ka, kb}:
                    ks = ks[:i + 1] + [kmid] + ks[i + 1:]
                    break
        return ks

    lines = []
    for agency, number, lid, lname, mode in LINES:
        if mode in RAILISH:
            ks = [node_key(feed.station(s)) for s in raw[lid]]
            ks = longest_run(ks, lambda k: nodes[k]["zone"])
            dedup = []
            for k in ks:
                if not dedup or dedup[-1] != k:
                    dedup.append(k)
            ks = pass_through(lid, dedup)
        else:
            def zone_of_item(it):
                k, st = it
                return nodes[k]["zone"] if k else zones.zone_of(st["lat"], st["lon"])
            items = longest_run(bus_resolved[lid], zone_of_item)
            ks, prev = [], None
            for i, (k, st) in enumerate(items):
                z = zone_of_item((k, st))
                if k or z != prev or i in (0, len(items) - 1):
                    if k is None:
                        k = "bus-" + slug(clean_name(st["name"])) + "-" + st["id"][-4:]
                        add_node(k, bus_name(st), st["lat"], st["lon"], False)["zone"] = z
                    if not ks or ks[-1] != k:
                        ks.append(k)
                prev = z
            for k in ks:
                nodes[k]["modes"].add(mode)
        lines.append({"id": lid, "name": lname, "mode": mode, "nodes": ks})

    for ln in lines:
        if ln["mode"] in RAILISH:
            for k in ln["nodes"]:
                nodes[k]["modes"].add(ln["mode"])

    # 5. a line may still step between two zones that do not touch on the
    #    ground. Where PASS_THROUGH has no honest stop to add, cut it there.
    real_adj = zones.touching(sorted(SCOPE))
    for ln in lines:
        pieces, cur = [], []
        for k in ln["nodes"]:
            if cur:
                za, zb = nodes[cur[-1]]["zone"], nodes[k]["zone"]
                if za != zb and zb not in real_adj[za]:
                    pieces.append(cur)
                    cur = []
            cur.append(k)
        pieces.append(cur)
        if len(pieces) > 1:
            kept = max(pieces, key=len)
            print("  cut %s where it runs through a zone it does not stop in: "
                  "kept %d of %d stops" % (ln["id"], len(kept), len(ln["nodes"])))
            ln["nodes"] = kept

    used = {k for ln in lines for k in ln["nodes"]}
    for k in list(nodes):
        if k not in used:
            del nodes[k]

    # 6. ids, and the zone graph the app will derive from these same steps
    taken = {}
    for k, n in sorted(nodes.items(), key=lambda kv: kv[1]["name"]):
        s = base = slug(n["name"])
        i = 2
        while s in taken:
            s = base + "-" + str(i)
            i += 1
        taken[s] = k
        n["id"] = s

    adj = collections.defaultdict(set)
    for ln in lines:
        for a, b in zip(ln["nodes"], ln["nodes"][1:]):
            za, zb = nodes[a]["zone"], nodes[b]["zone"]
            if za != zb:
                adj[za].add(zb)
                adj[zb].add(za)

    zone_ids = sorted({n["zone"] for n in nodes.values()})
    ring, frontier = {1: 0}, [1]
    while frontier:
        nxt = []
        for z in frontier:
            for m in adj[z]:
                if m not in ring:
                    ring[m] = ring[z] + 1
                    nxt.append(m)
        frontier = nxt
    missing = sorted({(min(a, b), max(a, b)) for a in zone_ids for b in real_adj[a]
                      if b not in adj[a]})
    if missing:
        print("  zones that touch but no line in the dataset crosses: " +
              ", ".join("%d-%d" % p for p in missing))

    return nodes, lines, zone_ids, ring


# --------------------------------------------------------------------------
# Emit
# --------------------------------------------------------------------------

def emit(nodes, lines, zone_ids, ring, zones, out_path, feed_date):
    def km_xy(lat, lon):
        return (lon * KM_PER_DEG_LON, -lat * KM_PER_DEG_LAT)

    pts = [km_xy(n["lat"], n["lon"]) for n in nodes.values()]
    for z in zone_ids:
        for poly in zones.polys_of(z):
            pts += [km_xy(c[1], c[0]) for c in poly[0]]
    minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
    miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
    scale = min((BOX[2] - BOX[0]) / (maxx - minx), (BOX[3] - BOX[1]) / (maxy - miny))
    offx = BOX[0] + ((BOX[2] - BOX[0]) - (maxx - minx) * scale) / 2
    offy = BOX[1] + ((BOX[3] - BOX[1]) - (maxy - miny) * scale) / 2

    def project(lat, lon):
        x, y = km_xy(lat, lon)
        return (round(offx + (x - minx) * scale, 1), round(offy + (y - miny) * scale, 1))

    halo = round(HALO_KM * scale)

    def pad_points(z):
        polys = zones.polys_of(z)
        own = [km_xy(n["lat"], n["lon"]) for n in nodes.values() if n["zone"] == z]
        cs = [km_xy(c[1], c[0]) for poly in polys for ring_ in poly for c in ring_]
        x0, x1 = min(c[0] for c in cs), max(c[0] for c in cs)
        y0, y1 = min(c[1] for c in cs), max(c[1] for c in cs)
        out, gy = [], y0 + PAD_SPACING_KM / 2
        while gy < y1:
            gx = x0 + PAD_SPACING_KM / 2
            while gx < x1:
                lat, lon = -gy / KM_PER_DEG_LAT, gx / KM_PER_DEG_LON
                if zones._contains(zones.by_zone[z], lat, lon) and \
                   all((gx - p[0]) ** 2 + (gy - p[1]) ** 2 > (HALO_KM * 0.55) ** 2 for p in own):
                    out.append(project(lat, lon))
                gx += PAD_SPACING_KM
            gy += PAD_SPACING_KM
        return out

    def q(s):
        return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

    order = sorted(nodes.values(), key=lambda n: (ring[n["zone"]], n["zone"], n["name"]))
    w_id = max(len(n["id"]) for n in order) + 3
    w_nm = max(len(n["name"]) for n in order) + 3
    stop_rows = ",\n".join(
        "  [%s %s %s %7.1f, %5.1f, %.4f, %.4f]" % (
            (q(n["id"]) + ",").ljust(w_id), (q(n["name"]) + ",").ljust(w_nm),
            (q(str(n["zone"])) + ",").ljust(6),
            project(n["lat"], n["lon"])[0], project(n["lat"], n["lon"])[1],
            n["lat"], n["lon"])
        for n in order)

    dataset_lines = [{"id": ln["id"], "name": ln["name"], "mode": ln["mode"],
                      "stops": [nodes[k]["id"] for k in ln["nodes"]]} for ln in lines]
    line_rows = ",\n".join(
        "  { id: %s, name: %s, mode: %s, stops: [%s] }" % (
            q(ln["id"]), q(ln["name"]), q(ln["mode"]),
            ",".join(q(s) for s in ln["stops"]))
        for ln in dataset_lines)

    zone_rows = "\n".join(
        '    "%s": { ring: %d },%s/* %s */' % (
            z, ring[z], " " * max(1, 5 - len(str(z))), zones.name_of(z))
        for z in zone_ids)

    pad_rows = ",\n".join(
        '  "%s": [%s]' % (z, ",".join("[%g,%g]" % p for p in pad_points(z)))
        for z in zone_ids)

    stops_for_fares = [{"id": nodes[k]["id"], "zone": nodes[k]["zone"]} for k in nodes]
    ticket_max, worst = longest_trip(stops_for_fares, dataset_lines)

    js = TEMPLATE % {
        "zones": len(zone_ids), "feed_date": feed_date,
        "ticket_max": ticket_max, "worst": worst,
        "halo_km": HALO_KM, "halo": halo, "home": HOME,
        "zone_rows": zone_rows, "stop_rows": stop_rows,
        "line_rows": line_rows, "pad_rows": pad_rows,
    }
    open(out_path, "w").write(js)
    print("  wrote %s — %d stops, %d lines, %d zones, tickets 2-%d"
          % (out_path, len(nodes), len(dataset_lines), len(zone_ids), ticket_max))


TEMPLATE = '''/* Zonetjek dataset — the DOT fare zones of the Copenhagen metropolitan area.
   =========================================================================
   GENERATED FROM OPEN DATA — do not hand-edit; run tools/build-dataset.py.
   Zone numbers, names and boundaries are Movia's published "Takstzoner"
   layer (the 211 DOT zones east of Storebælt). Stop names, coordinates and
   line routings are the Rejseplanen GTFS feed of %(feed_date)s. A stop's zone
   is the zone whose polygon its coordinates fall inside.

   Not data: the schematic x/y, which is the real position projected into the
   map's box, and `padding`, which samples each zone polygon so the halo blobs
   follow the real zone shape. Neither touches a fare.
   =========================================================================

   Coverage: the metro, the S-tog, the two regional services through town, the
   harbour buses and fourteen bus lines, each cut where it leaves the %(zones)d
   zones below. Zone adjacency is derived from consecutive stops, so a line the
   dataset leaves out is a boundary the app does not know about — the Ring 3
   light rail is absent (a sixth mode), and reach in the outer zones is only as
   wide as the lines listed here.

   Rules a dataset must satisfy:
     - every stop's zone exists in `zones`
     - every id in a line's `stops` exists in `stops`
     - every stop is served by at least one line
     - consecutive stops on a line are in the same or a touching zone — a line
       that skips over a zone invents an adjacency that does not exist, and
       zone adjacency is derived from exactly these steps
     - `ring` orders the colour ramp outwards from the central zone

   Two services run through a zone without calling there, which would invent
   exactly that kind of adjacency; per the rule above each is given a stop at a
   station it passes: the RE at Svanemøllen (zone 2) between Østerport and
   Hellerup, and at Brøndbyøster (zone 32) between Glostrup and Valby. */

const DATASET_COPENHAGEN = {
  id: "copenhagen",
  name: { en: "Copenhagen", da: "København" },

  /* Ticket sizes this dataset can meaningfully sell. 2 is DOT's smallest;
     %(ticket_max)d zones is the longest trip it can price (%(worst)s). */
  ticket: { min: 2, max: %(ticket_max)d },

  /* Opening state. */
  home: "%(home)s",

  /* Halo radius, in schematic units, that merges stops into zone blobs:
     %(halo_km).2f km at this dataset's scale. */
  haloRadius: %(halo)d,

  /* ring 0 is the centre; the colour ramp lightens outwards. ring counts zone
     boundaries from zone 1 on the derived graph.
     neighbours are NOT listed here — they are derived from `lines`. */
  zones: {
%(zone_rows)s
  },

  /* id, name, zone, x, y, lat, lon
     x/y are the real position projected into the map's box; the map is
     schematic, so it carries no scale bar.
     lat/lon are the GTFS station coordinates, used to find a nearest stop. */
  stops: [
%(stop_rows)s
  ],

  /* mode: metro | stog | bus | regional | harbour */
  lines: [
%(line_rows)s
  ],

  /* Extra halo centres carrying no stop; they only shape the zone blobs.
     Sampled from each zone's real polygon. */
  padding: {
%(pad_rows)s
  }
};
'''


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gtfs", required=True, help="unpacked Rejseplanen GTFS directory")
    ap.add_argument("--zones", required=True, help="DOT fare zones as GeoJSON (WGS84)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__),
                                                  "..", "src", "datasets", "copenhagen.js"))
    args = ap.parse_args()

    print("reading the zone polygons")
    zones = Zones(args.zones)
    print("reading the feed (stop_times.txt is large; this takes a minute)")
    feed = Feed(args.gtfs)
    feed_date = __import__("datetime").date.fromtimestamp(
        os.path.getmtime(os.path.join(args.gtfs, "stop_times.txt"))).strftime("%-d %B %Y")
    nodes, lines, zone_ids, ring = build(feed, zones)
    emit(nodes, lines, zone_ids, ring, zones, os.path.normpath(args.out), feed_date)
    print("  now run: node tools/check-dataset.js")


if __name__ == "__main__":
    main()
