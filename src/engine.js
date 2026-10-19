/* Zonetjek — zone maths. Pure functions over the data in data.js. */

const ALL_MODES = ["metro", "stog", "bus", "regional", "harbour"];

function servedBy(stop, modes) {
  return stop.modes.some(function (m) { return modes.indexOf(m) !== -1; });
}

/* Ticket of N zones from a start zone reaches every zone within N-1 rings. */
function reachableZones(startZone, ticket) {
  const rings = {};
  rings[startZone] = 0;
  let frontier = [startZone];
  for (let step = 1; step <= ticket - 1; step++) {
    const next = [];
    frontier.forEach(function (z) {
      (ZONES[z] ? ZONES[z].neighbours : []).forEach(function (n) {
        if (rings[n] === undefined) { rings[n] = step; next.push(n); }
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  return rings; // { zoneId: ringIndex }
}

function reachableStops(startZone, ticket, modes) {
  const rings = reachableZones(startZone, ticket);
  return STOPS.filter(function (s) {
    return rings[s.zone] !== undefined && servedBy(s, modes);
  });
}

/* Adjacency over the transport network, limited to the active modes. */
function buildGraph(modes) {
  const graph = {};
  function link(a, b, mode) {
    (graph[a] = graph[a] || []).push({ to: b, mode: mode });
  }
  LINES.forEach(function (line) {
    if (modes.indexOf(line.mode) === -1) return;
    for (let i = 0; i < line.stops.length - 1; i++) {
      const a = line.stops[i], b = line.stops[i + 1];
      if (a === b) continue;
      link(a, b, line.mode);
      link(b, a, line.mode);
    }
  });
  return graph;
}

/* A trip is priced on the DISTINCT zones it passes through, so the search
   minimises the set of zones visited (not the number of zone changes) and
   re-entering a zone you have already paid for is free. Dijkstra over
   (stop, set of visited zones). */
/* The set of zones paid for so far, kept sorted so the same set always
   serialises to the same state key. A bitmask would be faster but caps the
   app at 31 zones, which a region-wide dataset would exceed. */
function withZone(visited, zone) {
  if (visited.indexOf(zone) !== -1) return visited;
  return visited.concat(zone).sort();
}

/* Smallest-first binary heap, keyed on numeric cost. */
function Heap() { this.items = []; }
Heap.prototype.push = function (cost, value) {
  const a = this.items;
  a.push({ cost: cost, value: value });
  let i = a.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (a[p].cost <= a[i].cost) break;
    const t = a[p]; a[p] = a[i]; a[i] = t;
    i = p;
  }
};
Heap.prototype.pop = function () {
  const a = this.items;
  const top = a[0];
  const last = a.pop();
  if (a.length) {
    a[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l].cost < a[m].cost) m = l;
      if (r < a.length && a[r].cost < a[m].cost) m = r;
      if (m === i) break;
      const t = a[m]; a[m] = a[i]; a[i] = t;
      i = m;
    }
  }
  return top;
};
Heap.prototype.size = function () { return this.items.length; };

/* Returns { stops: [id], zones: [zoneId], count } or null.
   zones is the distinct zones in order of first appearance — the zones the
   ticket has to cover, which is what "Through zones" shows. */
function findRoute(fromId, toId, modes) {
  const from = STOP_BY_ID[fromId], to = STOP_BY_ID[toId];
  if (!from || !to) return null;
  if (fromId === toId) return { stops: [fromId], zones: [from.zone], count: 2 };

  const graph = buildGraph(modes);
  const ZONE_COST = 10000;
  const startVisited = [from.zone];
  const startKey = fromId + "|" + from.zone;

  const best = {};
  const prev = {};
  const heap = new Heap();
  best[startKey] = ZONE_COST;
  heap.push(ZONE_COST, { id: fromId, visited: startVisited });

  let endKey = null;
  while (heap.size()) {
    const node = heap.pop();
    const cur = node.value;
    const key = cur.id + "|" + cur.visited.join(",");
    if (node.cost > best[key]) continue;
    if (cur.id === toId) { endKey = key; break; }
    (graph[cur.id] || []).forEach(function (edge) {
      const visited = withZone(cur.visited, STOP_BY_ID[edge.to].zone);
      const nextKey = edge.to + "|" + visited.join(",");
      const hops = node.cost % ZONE_COST;
      const cost = visited.length * ZONE_COST + hops + 1;
      if (best[nextKey] === undefined || cost < best[nextKey]) {
        best[nextKey] = cost;
        prev[nextKey] = key;
        heap.push(cost, { id: edge.to, visited: visited });
      }
    });
  }
  if (!endKey) return null;

  const path = [];
  for (let key = endKey; key; key = prev[key]) path.unshift(key.split("|")[0]);

  const zones = [];
  path.forEach(function (id) {
    const z = STOP_BY_ID[id].zone;
    if (zones.indexOf(z) === -1) zones.push(z);
  });
  /* DOT never sells fewer than two zones. */
  return { stops: path, zones: zones, count: Math.max(2, zones.length) };
}


/* ---- Finding the user ---- */

/* Great-circle distance in km. */
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Past this the user is not in the area this prototype covers, and the
   "nearest" stop would be a meaningless answer rather than a useful one. */
const MAX_NEAR_KM = 60;

/* Nearest stop to a position, limited to the active modes.
   Returns { stop, km } or null when nothing is close enough. */
function nearestStop(lat, lon, modes) {
  let best = null;
  STOPS.forEach(function (s) {
    if (!servedBy(s, modes)) return;
    const km = distanceKm(lat, lon, s.lat, s.lon);
    if (!best || km < best.km) best = { stop: s, km: km };
  });
  return best && best.km <= MAX_NEAR_KM ? best : null;
}

if (typeof module !== "undefined") {
  module.exports = {
    ALL_MODES, reachableZones, reachableStops, findRoute, servedBy,
    distanceKm, nearestStop, MAX_NEAR_KM
  };
}
