/* Turns a raw dataset into the shape the rest of the app uses: stops with
   their modes, a stop index, and zone adjacency derived from the lines.

   Nothing downstream knows which dataset it is working with, so covering a
   larger region is a data change rather than a code change. */

function loadDataset(raw) {
  const stops = raw.stops.map(function (s) {
    return {
      id: s[0], name: s[1], zone: s[2],
      x: s[3], y: s[4],
      lat: s[5], lon: s[6],
      modes: []
    };
  });

  const stopById = stops.reduce(function (acc, s) { acc[s.id] = s; return acc; }, {});

  /* A stop's modes are whatever serves it; never stated twice. */
  raw.lines.forEach(function (line) {
    line.stops.forEach(function (id) {
      const stop = stopById[id];
      if (stop && stop.modes.indexOf(line.mode) === -1) stop.modes.push(line.mode);
    });
  });

  /* Zones touch when a line runs directly between them. Deriving this is what
     keeps the reach rings and the route zone counts from disagreeing. */
  const zones = {};
  Object.keys(raw.zones).forEach(function (z) {
    zones[z] = { ring: raw.zones[z].ring, neighbours: [] };
  });
  function link(a, b) {
    if (a === b || !zones[a] || !zones[b]) return;
    if (zones[a].neighbours.indexOf(b) === -1) zones[a].neighbours.push(b);
  }
  raw.lines.forEach(function (line) {
    for (let i = 0; i < line.stops.length - 1; i++) {
      const a = stopById[line.stops[i]];
      const b = stopById[line.stops[i + 1]];
      if (!a || !b) continue;
      link(a.zone, b.zone);
      link(b.zone, a.zone);
    }
  });
  Object.keys(zones).forEach(function (z) { zones[z].neighbours.sort(); });

  const ticket = raw.ticket || { min: 2, max: Object.keys(zones).length };

  return {
    id: raw.id,
    name: raw.name,
    ticket: ticket,
    home: raw.home,
    haloRadius: raw.haloRadius || 46,
    zones: zones,
    stops: stops,
    stopById: stopById,
    lines: raw.lines,
    padding: raw.padding || {}
  };
}

/* Checks the rules documented at the top of a dataset file. Returns a list of
   human-readable problems; empty means the dataset is sound. */
function validateDataset(data) {
  const problems = [];

  data.stops.forEach(function (s) {
    if (!data.zones[s.zone]) problems.push('stop "' + s.id + '" is in unknown zone ' + s.zone);
    if (typeof s.lat !== "number" || typeof s.lon !== "number") {
      problems.push('stop "' + s.id + '" has no lat/lon');
    }
    if (!s.modes.length) problems.push('stop "' + s.id + '" is not served by any line');
  });

  const seen = {};
  data.stops.forEach(function (s) {
    if (seen[s.id]) problems.push('duplicate stop id "' + s.id + '"');
    seen[s.id] = true;
  });

  data.lines.forEach(function (line) {
    if (line.stops.length < 2) problems.push('line "' + line.id + '" has fewer than two stops');
    line.stops.forEach(function (id) {
      if (!data.stopById[id]) problems.push('line "' + line.id + '" names unknown stop "' + id + '"');
    });
    for (let i = 0; i < line.stops.length - 1; i++) {
      const a = data.stopById[line.stops[i]];
      const b = data.stopById[line.stops[i + 1]];
      if (!a || !b || a.zone === b.zone) continue;
      if (data.zones[a.zone].neighbours.indexOf(b.zone) === -1) {
        problems.push('line "' + line.id + '" jumps zone ' + a.zone + ' to ' + b.zone +
          ' (' + a.name + ' to ' + b.name + ') with nothing in between');
      }
    }
  });

  Object.keys(data.zones).forEach(function (z) {
    if (!data.zones[z].neighbours.length && Object.keys(data.zones).length > 1) {
      problems.push("zone " + z + " is not connected to any other zone");
    }
    if (!data.stops.some(function (s) { return s.zone === z; })) {
      problems.push("zone " + z + " has no stops");
    }
  });

  return problems;
}

if (typeof module !== "undefined") {
  module.exports = { loadDataset: loadDataset, validateDataset: validateDataset };
}
