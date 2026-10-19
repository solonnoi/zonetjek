/* Zonetjek — schematic map.
   Each stop gets a soft circular halo; a goo filter (blur + alpha threshold)
   merges the halos of one zone into a single organic blob, so the zone areas
   are drawn entirely from stop positions plus a few shaping pad points. */

const RING_VARS = ["--ring-0", "--ring-1", "--ring-2", "--ring-3", "--ring-4"];

const LINE_STYLE = {
  metro:    { stroke: "#8b919b", width: 3.4, dash: "" },
  stog:     { stroke: "#a8aeb6", width: 2.2, dash: "" },
  regional: { stroke: "#a8aeb6", width: 2.2, dash: "8 6" },
  bus:      { stroke: "#c3c8ce", width: 1.5, dash: "" },
  harbour:  { stroke: "#a8aeb6", width: 2,   dash: "0.1 5.5" }
};

/* Which marker a stop gets, most "rail-like" mode wins. */
function markerKind(stop) {
  if (stop.modes.indexOf("metro") !== -1) return "metro";
  if (stop.modes.indexOf("stog") !== -1 || stop.modes.indexOf("regional") !== -1) return "train";
  if (stop.modes.indexOf("harbour") !== -1) return "harbour";
  return "bus";
}

const MapView = (function () {
  let svg, overlay, onStopClick;
  let vb = { x: 0, y: 0, w: 1000, h: 1000 };
  let lastView = null;
  let lastKeys = { zones: null, lines: null, route: null, stops: null, pins: null };

  const CONTENT = { minX: 100, minY: 140, maxX: 790, maxY: 900 };

  function zonePoints(zoneId) {
    const pts = STOPS.filter(function (s) { return s.zone === zoneId; })
      .map(function (s) { return [s.x, s.y]; });
    return pts.concat(ZONE_PADDING[zoneId] || []);
  }

  /* Most zones are rings, so their centroid falls inside the zone they wrap
     around. Put the number at the point deepest inside the zone's own
     territory instead: the halo centre farthest from every other zone. */
  function labelPoint(zoneId) {
    const own = zonePoints(zoneId);
    const others = [];
    Object.keys(ZONES).forEach(function (z) {
      if (z !== zoneId) others.push.apply(others, zonePoints(z));
    });
    let best = own[0], bestDist = -1;
    own.forEach(function (p) {
      let nearest = Infinity;
      others.forEach(function (q) {
        const d = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]);
        if (d < nearest) nearest = d;
      });
      if (nearest > bestDist) { bestDist = nearest; best = p; }
    });
    return { x: best[0], y: best[1] };
  }

  const ZONE_CENTRES = Object.keys(ZONES).reduce(function (acc, z) {
    acc[z] = labelPoint(z);
    return acc;
  }, {});

  function setViewBox() {
    svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    positionPins();
  }

  /* Scale and offset the browser uses for preserveAspectRatio="slice". */
  function transform() {
    const cw = svg.clientWidth || 390;
    const ch = svg.clientHeight || 844;
    const s = Math.max(cw / vb.w, ch / vb.h);
    return {
      s: s,
      ox: (cw - vb.w * s) / 2,
      oy: (ch - vb.h * s) / 2,
      cw: cw,
      ch: ch
    };
  }

  function toScreen(x, y) {
    const tr = transform();
    return { x: tr.ox + (x - vb.x) * tr.s, y: tr.oy + (y - vb.y) * tr.s };
  }

  function toMap(px, py) {
    const tr = transform();
    return { x: (px - tr.ox) / tr.s + vb.x, y: (py - tr.oy) / tr.s + vb.y };
  }

  /* ---------- Static scaffolding ---------- */
  function buildStatic() {
    svg.innerHTML = [
      '<g id="layer-zones"></g>',
      '<g id="layer-lines"></g>',
      '<g id="layer-route"></g>',
      '<g id="layer-stops"></g>',
      '<g id="layer-labels"></g>'
    ].join("");
  }

  /* ---------- Layers ---------- */
  /* Zone outlines are geometry, not state: they depend only on where the
     stops are, so they are contoured once and then only recoloured. This is
     what used to be a per-frame SVG filter over hundreds of circles. */
  let zonePathsDrawn = false;

  function drawZoneShapes() {
    const layer = svg.querySelector("#layer-zones");
    /* Fixed order, outermost ring first, so inner zones always paint on top
       and the order never has to change when reachability does. */
    const order = Object.keys(ZONES).sort(function (a, b) {
      return ZONES[b].ring - ZONES[a].ring;
    });
    layer.innerHTML = order.map(function (z) {
      const d = blobPath(zonePoints(z), HALO_R);
      return '<path class="zone-area" data-zone="' + z + '" fill-rule="evenodd" d="' + d + '"/>';
    }).join("");
    zonePathsDrawn = true;
  }

  function renderZones(view) {
    if (!zonePathsDrawn) drawZoneShapes();
    const reach = view.ringByZone || {};
    const layer = svg.querySelector("#layer-zones");
    Object.keys(ZONES).forEach(function (z) {
      const node = layer.querySelector('[data-zone="' + z + '"]');
      if (!node) return;
      const ring = reach[z];
      node.setAttribute("fill", ring === undefined
        ? "var(--land)"
        : "var(" + RING_VARS[Math.min(ring, RING_VARS.length - 1)] + ")");
    });
  }

  function renderLines(view) {
    const html = LINES.map(function (line) {
      const style = LINE_STYLE[line.mode];
      const d = line.stops.map(function (id, i) {
        const s = STOP_BY_ID[id];
        return (i ? "L" : "M") + s.x + " " + s.y;
      }).join(" ");
      const off = view.activeModes.indexOf(line.mode) === -1;
      return '<path class="line-path' + (off ? " is-dim" : "") + '" d="' + d +
        '" stroke="' + style.stroke + '" stroke-width="' + style.width + '"' +
        (style.dash ? ' stroke-dasharray="' + style.dash + '"' : "") + '/>';
    }).join("");
    svg.querySelector("#layer-lines").innerHTML = html;
  }

  function renderRoute(view) {
    const el = svg.querySelector("#layer-route");
    if (!view.routeStops || view.routeStops.length < 2) { el.innerHTML = ""; return; }
    const d = view.routeStops.map(function (id, i) {
      const s = STOP_BY_ID[id];
      return (i ? "L" : "M") + s.x + " " + s.y;
    }).join(" ");
    el.innerHTML = '<path class="route-path" d="' + d + '"/>';
  }

  function renderStops(view) {
    const html = STOPS.map(function (s) {
      const dim = view.isDim(s);
      const cls = "stop-mark" + (dim ? " is-dim" : "");
      const kind = markerKind(s);
      let mark;
      if (kind === "metro") {
        mark = '<circle class="' + cls + '" cx="' + s.x + '" cy="' + s.y + '" r="4.6" fill="#39414f"/>';
      } else if (kind === "train") {
        mark = '<circle class="' + cls + '" cx="' + s.x + '" cy="' + s.y +
          '" r="4.4" fill="#FCFBF8" stroke="#5c6472" stroke-width="1.9"/>';
      } else if (kind === "harbour") {
        mark = '<rect class="' + cls + '" x="' + (s.x - 3.9) + '" y="' + (s.y - 3.9) +
          '" width="7.8" height="7.8" fill="#FCFBF8" stroke="#5c6472" stroke-width="1.7"' +
          ' transform="rotate(45 ' + s.x + ' ' + s.y + ')"/>';
      } else {
        mark = '<circle class="' + cls + '" cx="' + s.x + '" cy="' + s.y + '" r="3" fill="#7b828d"/>';
      }
      return mark + '<circle class="stop-hit" data-stop="' + s.id + '" cx="' + s.x +
        '" cy="' + s.y + '" r="13"><title>' + s.name + '</title></circle>';
    }).join("");
    svg.querySelector("#layer-stops").innerHTML = html;
  }

  function renderZoneNumbers(view) {
    const reach = view.ringByZone || {};
    const html = Object.keys(ZONES).map(function (z) {
      const c = ZONE_CENTRES[z];
      const off = reach[z] === undefined;
      const size = z.length > 1 ? 40 : 52;
      return '<text class="zone-number' + (off ? " is-off" : "") + '" x="' + c.x +
        '" y="' + c.y + '" font-size="' + size + '">' + z + "</text>";
    }).join("");
    svg.querySelector("#layer-labels").innerHTML = html;
  }

  /* ---------- Pins (HTML, so they do not scale with zoom) ---------- */
  const PIN_SVG = '<svg class="pin-drop" width="22" height="30" viewBox="0 0 22 30" aria-hidden="true">' +
    '<path d="M11 29C11 29 20.5 16.8 20.5 10.5A9.5 9.5 0 1 0 1.5 10.5C1.5 16.8 11 29 11 29Z" ' +
    'fill="currentColor" stroke="#FCFBF8" stroke-width="1.6"/>' +
    '<circle cx="11" cy="10.5" r="3.4" fill="#FCFBF8"/></svg>';

  function renderPins(view) {
    const pins = [];
    if (view.selectedId) pins.push({ id: view.selectedId, end: false });
    if (view.endId && view.endId !== view.selectedId) pins.push({ id: view.endId, end: true });
    overlay.innerHTML = pins.map(function (p) {
      const s = STOP_BY_ID[p.id];
      return '<div class="pin' + (p.end ? " is-end" : "") + '" data-pin="' + p.id + '">' +
        '<span class="pin-label">' + s.name +
        ' <span class="pin-zone">' + t("zone", { n: s.zone }) + "</span></span>" +
        PIN_SVG + "</div>";
    }).join("");
    positionPins();
  }

  function positionPins() {
    if (!overlay) return;
    overlay.querySelectorAll("[data-pin]").forEach(function (el) {
      const s = STOP_BY_ID[el.dataset.pin];
      const p = toScreen(s.x, s.y);
      el.style.left = p.x + "px";
      el.style.top = (p.y + 4) + "px";
    });
  }

  /* ---------- Camera ---------- */
  let lastFit = null;

  function fitToPoints(points, padding) {
    if (!points.length) return;
    lastFit = { points: points, padding: padding };
    const pad = padding === undefined ? 70 : padding;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function (p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    let w = (maxX - minX) + pad * 2;
    let h = (maxY - minY) + pad * 2;
    let cx = (minX + maxX) / 2;
    let cy = (minY + maxY) / 2;

    /* Match the viewport aspect so "slice" crops nothing off the fit. */
    const tr = transform();
    const aspect = tr.cw / tr.ch;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;

    vb = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
    setViewBox();
  }

  function fitToZones(zoneIds, padding) {
    const pts = zoneIds.reduce(function (acc, z) { return acc.concat(zonePoints(z)); }, []);
    fitToPoints(pts.length ? pts : zonePoints("1"), padding);
  }

  function zoomBy(factor, centre) {
    scaleAbout(factor, centre || { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 });
    setViewBox();
  }

  /* ---------- Interaction ---------- */
  /* Every gesture writes the camera at most once per frame. Pointer events
     fire faster than the screen refreshes, and without this a drag queued
     several full redraws per frame. */
  let framePending = false;
  function commitCamera() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(function () {
      framePending = false;
      setViewBox();
    });
  }

  function localPoint(e) {
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function clampWidth(w) {
    return Math.max(160, Math.min(2200, w));
  }

  /* Scale about a fixed map point, so whatever is under the fingers (or the
     cursor) stays under them. */
  function scaleAbout(factor, anchor) {
    const w = clampWidth(vb.w * factor);
    const h = w * (vb.h / vb.w);
    vb = {
      x: anchor.x - (anchor.x - vb.x) * (w / vb.w),
      y: anchor.y - (anchor.y - vb.y) * (h / vb.h),
      w: w,
      h: h
    };
  }

  function bind() {
    const pointers = new Map();
    let pan = null;          /* { x, y } last position of the lone pointer */
    let gesture = null;      /* { dist, mid } baseline of a two-finger pinch */
    let moved = 0;
    let lastTap = 0;

    function pinchState() {
      const pts = Array.from(pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return {
        dist: Math.max(1, Math.hypot(dx, dy)),
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      };
    }

    svg.addEventListener("pointerdown", function (e) {
      /* Throws if the pointer is already gone; never worth failing the gesture. */
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pointers.set(e.pointerId, localPoint(e));
      moved = 0;
      if (pointers.size === 1) {
        pan = localPoint(e);
      } else if (pointers.size === 2) {
        gesture = pinchState();
        pan = null;
      }
    });

    svg.addEventListener("pointermove", function (e) {
      if (!pointers.has(e.pointerId)) return;
      const at = localPoint(e);
      pointers.set(e.pointerId, at);

      if (pointers.size >= 2 && gesture) {
        const next = pinchState();
        const tr = transform();

        /* Zoom by how much the fingers spread... */
        scaleAbout(gesture.dist / next.dist, toMap(next.mid.x, next.mid.y));

        /* ...and pan by how far the pair travelled, so a two-finger drag
           moves the map as well as scaling it. */
        const after = transform();
        vb.x -= (next.mid.x - gesture.mid.x) / after.s;
        vb.y -= (next.mid.y - gesture.mid.y) / after.s;

        moved += Math.abs(next.dist - gesture.dist) +
          Math.abs(next.mid.x - gesture.mid.x) + Math.abs(next.mid.y - gesture.mid.y);
        gesture = next;
        void tr;
        commitCamera();
        return;
      }

      if (!pan) return;
      const tr = transform();
      vb.x -= (at.x - pan.x) / tr.s;
      vb.y -= (at.y - pan.y) / tr.s;
      moved += Math.abs(at.x - pan.x) + Math.abs(at.y - pan.y);
      pan = at;
      svg.classList.add("dragging");
      commitCamera();
    });

    function release(e) {
      const wasSingle = pointers.size === 1;
      const at = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      svg.classList.remove("dragging");

      if (pointers.size < 2) gesture = null;
      if (pointers.size === 1) {
        /* One finger lifted mid-pinch: carry on panning with the other. */
        pan = Array.from(pointers.values())[0];
      } else if (pointers.size === 0) {
        pan = null;
      }

      if (!wasSingle || moved >= 10 || !at) return;

      /* A press that barely moved is a tap. Two in quick succession at the
         same spot zoom in — the usual shortcut when there is no mouse wheel. */
      const now = Date.now();
      if (now - lastTap < 300) {
        lastTap = 0;
        scaleAbout(0.6, toMap(at.x, at.y));
        commitCamera();
        return;
      }
      lastTap = now;

      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const id = hit && hit.dataset ? hit.dataset.stop : null;
      if (id && onStopClick) onStopClick(id);
    }

    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", function (e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) gesture = null;
      if (pointers.size === 0) pan = null;
      svg.classList.remove("dragging");
    });

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      const at = localPoint(e);
      scaleAbout(e.deltaY > 0 ? 1.12 : 0.89, toMap(at.x, at.y));
      commitCamera();
    }, { passive: false });

    window.addEventListener("resize", function () {
      /* The viewBox is matched to the viewport aspect, so a resize has to
         redo the fit or "slice" starts cropping the framed area. */
      if (lastFit) fitToPoints(lastFit.points, lastFit.padding);
      else setViewBox();
    });
  }

  return {
    init: function (svgEl, overlayEl, stopClickHandler) {
      svg = svgEl;
      overlay = overlayEl;
      onStopClick = stopClickHandler;
      buildStatic();
      setViewBox();
      bind();
    },
    /* Each layer is rebuilt only when its own inputs changed. Toggling a mode
       must not re-run the goo filter over every zone blob. */
    render: function (view) {
      lastView = view;
      const keys = {
        zones: JSON.stringify(view.ringByZone),
        lines: view.activeModes.join(","),
        route: view.routeStops ? view.routeStops.join(",") : "",
        stops: STOPS.map(function (s) { return view.isDim(s) ? "1" : "0"; }).join(""),
        pins: [view.selectedId, view.endId, LANG].join("|")
      };
      if (keys.zones !== lastKeys.zones) {
        renderZones(view);
        renderZoneNumbers(view);
      }
      if (keys.lines !== lastKeys.lines) renderLines(view);
      if (keys.route !== lastKeys.route) renderRoute(view);
      if (keys.stops !== lastKeys.stops) renderStops(view);
      if (keys.pins !== lastKeys.pins) renderPins(view);
      /* Pins are positioned in screen space, so they follow every camera move. */
      positionPins();
      lastKeys = keys;
    },
    refreshPins: function () {
      lastKeys.pins = null;
      if (lastView) renderPins(lastView);
    },
    fitToZones: fitToZones,
    fitToStops: function (ids, padding) {
      fitToPoints(ids.map(function (id) {
        return [STOP_BY_ID[id].x, STOP_BY_ID[id].y];
      }), padding === undefined ? 130 : padding);
    },
    zoomBy: zoomBy,
    centres: ZONE_CENTRES,
    content: CONTENT
  };
})();
