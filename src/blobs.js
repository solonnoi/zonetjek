/* Zone blobs as plain paths.

   The blobs used to be drawn as one soft circle per stop with an SVG goo
   filter (blur + alpha threshold) merging them. That looks right but the
   filter is re-rasterised on every viewBox change, so panning re-ran a blur
   over hundreds of circles every frame — the main reason the map felt slow on
   a phone.

   The same shape is computed once here instead: a metaball field over the
   stop positions, contoured with marching squares, smoothed, and emitted as a
   path. Panning afterwards is a pure transform, and changing which zones are
   reachable is a fill change rather than a re-render. */

const BLOB_CELL = 4;        /* grid resolution, map units */
const BLOB_LEVEL = 1;       /* field threshold */
const BLOB_REACH = 2.2;     /* how far a circle contributes, in radii */

/* Σ r²/d² — the classic metaball field. A lone point contours at roughly
   `radius`; nearby points bulge together instead of overlapping. */
function blobField(points, radius, cell) {
  const pad = radius * BLOB_REACH + cell * 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(function (p) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  });
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  const cols = Math.ceil((maxX - minX) / cell) + 1;
  const rows = Math.ceil((maxY - minY) / cell) + 1;
  const field = new Float32Array(cols * rows);
  const r2 = radius * radius;
  const reach = radius * BLOB_REACH;

  /* Only cells within reach of a point are touched, so cost scales with the
     number of stops rather than with the area of the map. */
  points.forEach(function (p) {
    const i0 = Math.max(0, Math.floor((p[0] - reach - minX) / cell));
    const i1 = Math.min(cols - 1, Math.ceil((p[0] + reach - minX) / cell));
    const j0 = Math.max(0, Math.floor((p[1] - reach - minY) / cell));
    const j1 = Math.min(rows - 1, Math.ceil((p[1] + reach - minY) / cell));
    for (let j = j0; j <= j1; j++) {
      const y = minY + j * cell;
      const dy = y - p[1];
      for (let i = i0; i <= i1; i++) {
        const x = minX + i * cell;
        const dx = x - p[0];
        field[j * cols + i] += r2 / (dx * dx + dy * dy + 1);
      }
    }
  });

  return { field: field, cols: cols, rows: rows, minX: minX, minY: minY, cell: cell };
}

/* Marching squares. Returns closed rings of points. */
function contourRings(grid, level) {
  const { field, cols, rows, minX, minY, cell } = grid;
  const at = function (i, j) { return field[j * cols + i]; };

  /* Linear interpolation puts the crossing where the field actually crosses
     the level, which is what keeps the outline smooth rather than blocky. */
  function lerp(xa, ya, va, xb, yb, vb) {
    const t = (level - va) / (vb - va || 1e-9);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  }

  const segments = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const v0 = at(i, j), v1 = at(i + 1, j), v2 = at(i + 1, j + 1), v3 = at(i, j + 1);
      let idx = 0;
      if (v0 > level) idx |= 1;
      if (v1 > level) idx |= 2;
      if (v2 > level) idx |= 4;
      if (v3 > level) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const x0 = minX + i * cell, y0 = minY + j * cell;
      const x1 = x0 + cell, y1 = y0 + cell;
      const top = function () { return lerp(x0, y0, v0, x1, y0, v1); };
      const right = function () { return lerp(x1, y0, v1, x1, y1, v2); };
      const bottom = function () { return lerp(x1, y1, v2, x0, y1, v3); };
      const left = function () { return lerp(x0, y1, v3, x0, y0, v0); };

      /* Segments are DIRECTED, keeping the inside consistently on one side.
         A case and its complement must run opposite ways: emit both the same
         way and the contour cannot chain, so one blob stitches into two
         near-identical rings that evenodd then cancels into a thin band. */
      switch (idx) {
        case 1:  segments.push([left(), top()]); break;
        case 2:  segments.push([top(), right()]); break;
        case 3:  segments.push([left(), right()]); break;
        case 4:  segments.push([right(), bottom()]); break;
        case 6:  segments.push([top(), bottom()]); break;
        case 7:  segments.push([left(), bottom()]); break;
        case 8:  segments.push([bottom(), left()]); break;
        case 9:  segments.push([bottom(), top()]); break;
        case 11: segments.push([bottom(), right()]); break;
        case 12: segments.push([right(), left()]); break;
        case 13: segments.push([right(), top()]); break;
        case 14: segments.push([top(), left()]); break;
        /* Saddles: two separate crossings in one cell. */
        case 5:  segments.push([left(), top()], [right(), bottom()]); break;
        case 10: segments.push([top(), right()], [bottom(), left()]); break;
      }
    }
  }

  /* Stitch segments into rings by matching endpoints. */
  const key = function (p) { return Math.round(p[0] * 100) + ":" + Math.round(p[1] * 100); };
  const starts = new Map();
  segments.forEach(function (seg) {
    const k = key(seg[0]);
    if (!starts.has(k)) starts.set(k, []);
    starts.get(k).push(seg);
  });

  const rings = [];
  const used = new Set();
  segments.forEach(function (seg) {
    if (used.has(seg)) return;
    const ring = [seg[0], seg[1]];
    used.add(seg);
    let guard = 0;
    for (;;) {
      if (++guard > 100000) break;
      const candidates = starts.get(key(ring[ring.length - 1])) || [];
      let next = null;
      for (let n = 0; n < candidates.length; n++) {
        if (!used.has(candidates[n])) { next = candidates[n]; break; }
      }
      if (!next) break;
      used.add(next);
      ring.push(next[1]);
      if (key(next[1]) === key(ring[0])) break;
    }
    if (ring.length > 3) rings.push(ring);
  });

  return rings;
}

/* Chaikin corner cutting: rounds the marching-squares staircase off. */
function smoothRing(ring, passes) {
  let pts = ring;
  for (let n = 0; n < (passes || 2); n++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

/* Shoelace area, used to drop specks the contouring leaves behind. */
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/* Ramer-Douglas-Peucker. Smoothing quadruples the point count and most of
   those points sit on a straight run; dropping them cuts the path data by
   about two thirds with no visible difference. */
function simplifyRing(ring, epsilon) {
  if (ring.length < 4) return ring;

  function segmentDistance(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = a[0] + t * dx, cy = a[1] + t * dy;
    return Math.hypot(p[0] - cx, p[1] - cy);
  }

  function run(pts) {
    if (pts.length < 3) return pts;
    let worst = 0, index = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = segmentDistance(pts[i], pts[0], pts[pts.length - 1]);
      if (d > worst) { worst = d; index = i; }
    }
    if (worst <= epsilon) return [pts[0], pts[pts.length - 1]];
    const left = run(pts.slice(0, index + 1));
    const right = run(pts.slice(index));
    return left.slice(0, -1).concat(right);
  }

  /* Treat the closed ring as a loop split at its first point. */
  const open = run(ring.concat([ring[0]]));
  return open.slice(0, -1);
}

function ringToPath(ring) {
  let d = "M" + ring[0][0].toFixed(1) + " " + ring[0][1].toFixed(1);
  for (let i = 1; i < ring.length; i++) {
    d += "L" + ring[i][0].toFixed(1) + " " + ring[i][1].toFixed(1);
  }
  return d + "Z";
}

/* One path covering every ring of a zone. A ring zone can enclose a hole, so
   callers should fill with fill-rule="evenodd". */
function blobPath(points, radius) {
  if (!points.length) return "";
  const grid = blobField(points, radius, BLOB_CELL);
  const minArea = radius * radius * 0.25;   /* smaller than one lone stop */
  return contourRings(grid, BLOB_LEVEL)
    .filter(function (r) { return ringArea(r) >= minArea; })
    .map(function (r) { return ringToPath(simplifyRing(smoothRing(r, 2), 0.9)); })
    .join(" ");
}

if (typeof module !== "undefined") {
  module.exports = { blobPath: blobPath, blobField: blobField, contourRings: contourRings };
}
