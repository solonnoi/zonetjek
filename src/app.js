/* Zonetjek — state and view wiring. */

const MODE_ORDER = ["metro", "stog", "bus", "regional", "harbour"];

/* Ticket range and opening stop come from the active dataset, so a wider
   region brings its own sensible limits. */
const TICKET_MIN = DATA.ticket.min;
const TICKET_MAX = DATA.ticket.max;

const state = {
  tab: "reach",
  fromId: DATA.home,
  from2Id: null,
  toId: null,
  ticket: TICKET_MIN,
  modes: MODE_ORDER.slice(),
  expanded: false
};

const el = {
  map: document.getElementById("map"),
  overlay: document.getElementById("map-overlay"),
  chips: document.getElementById("chips"),
  sheet: document.getElementById("sheet"),
  sheetBody: document.getElementById("sheet-body"),
  sheetHandle: document.getElementById("sheet-handle"),
  stopList: document.getElementById("stop-list"),
  ticketValue: document.getElementById("ticket-value"),
  ticketMinus: document.getElementById("ticket-minus"),
  ticketPlus: document.getElementById("ticket-plus")
};

/* Fields, keyed by the slot they fill. */
const FIELDS = [
  { key: "from",  input: "input-from",  results: "results-from",  slot: "fromId" },
  { key: "from2", input: "input-from2", results: "results-from2", slot: "from2Id" },
  { key: "to",    input: "input-to",    results: "results-to",    slot: "toId" }
];

/* ---------- helpers ---------- */

function fold(s) {
  return s.toLowerCase()
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/å/g, "a")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function ringVar(ring) {
  return "var(--ring-" + Math.min(ring, 4) + ")";
}

function modeLabel(mode) {
  return t("mode." + mode);
}

function stopZoneRing(zoneId, ringByZone) {
  return ringByZone && ringByZone[zoneId] !== undefined ? ringByZone[zoneId] : null;
}

/* ---------- derived state ---------- */

function currentReach() {
  const from = state.fromId ? STOP_BY_ID[state.fromId] : null;
  if (!from) return { ringByZone: null, stops: [], from: null };
  const ringByZone = reachableZones(from.zone, state.ticket);
  const stops = reachableStops(from.zone, state.ticket, state.modes);
  return { ringByZone: ringByZone, stops: stops, from: from };
}

function currentRoute() {
  if (!state.from2Id || !state.toId) return null;
  return findRoute(state.from2Id, state.toId, state.modes);
}

/* ---------- map ---------- */

function pushMap() {
  if (state.tab === "reach") {
    const reach = currentReach();
    const reachableIds = reach.stops.reduce(function (acc, s) { acc[s.id] = true; return acc; }, {});
    MapView.render({
      ringByZone: reach.ringByZone,
      activeModes: state.modes,
      selectedId: state.fromId,
      endId: null,
      routeStops: null,
      isDim: function (s) { return !reachableIds[s.id]; }
    });
  } else {
    const route = currentRoute();
    const ringByZone = {};
    if (route) route.zones.forEach(function (z, i) { ringByZone[z] = Math.min(i, 4); });
    MapView.render({
      ringByZone: route ? ringByZone : null,
      activeModes: state.modes,
      selectedId: state.from2Id,
      endId: state.toId,
      routeStops: route ? route.stops : null,
      isDim: function (s) { return !servedBy(s, state.modes); }
    });
  }
}

function recentre() {
  if (state.tab === "reach") {
    const reach = currentReach();
    if (reach.ringByZone) MapView.fitToZones(Object.keys(reach.ringByZone));
    else MapView.fitToZones(["1", "2"]);
  } else {
    const route = currentRoute();
    if (route) MapView.fitToStops(route.stops);
    else MapView.fitToZones(["1", "2"]);
  }
}

/* ---------- sheet ---------- */

function zonePillsHtml(zoneIds, ringByZone, withArrows) {
  return zoneIds.map(function (z, i) {
    const ring = stopZoneRing(z, ringByZone);
    const pill = '<span class="zone-pill" style="background:' +
      (ring === null ? "var(--ring-4)" : ringVar(ring)) + '">' +
      t("zone", { n: z }) + "</span>";
    return (withArrows && i ? '<span class="zone-arrow" aria-hidden="true">→</span>' : "") + pill;
  }).join("");
}

function renderSheet() {
  el.sheet.classList.toggle("is-expanded", state.expanded && state.tab === "reach");
  el.sheetHandle.setAttribute("aria-expanded", String(state.expanded && state.tab === "reach"));

  if (state.tab === "reach") {
    renderReachSheet();
  } else {
    renderCountSheet();
  }
  measureSheet();
}

function renderReachSheet() {
  const reach = currentReach();
  if (!reach.from) {
    el.sheetBody.innerHTML = '<div class="empty"><h2>' + t("empty.title") + "</h2><p>" +
      t("empty.sub") + "</p></div>";
    el.stopList.innerHTML = "";
    return;
  }

  const zoneIds = Object.keys(reach.ringByZone)
    .sort(function (a, b) { return reach.ringByZone[a] - reach.ringByZone[b]; });

  if (!state.modes.length) {
    el.sheetBody.innerHTML = '<div class="empty"><h2>' + t("noModes.title") + "</h2><p>" +
      t("noModes.sub") + "</p></div>";
    el.stopList.innerHTML = "";
    announce(t("noModes.sub"));
    return;
  }

  announce(t("live.reach", {
    n: state.ticket, x: reach.from.name, c: reach.stops.length
  }));

  el.sheetBody.innerHTML = [
    '<p class="sheet-lead">' + t("reach.lead", {
      n: "<strong>" + state.ticket + "</strong>",
      x: "<strong>" + reach.from.name + "</strong>"
    }) + "</p>",
    '<div class="zone-pills">' + zonePillsHtml(zoneIds, reach.ringByZone, false) + "</div>",
    '<button type="button" class="link-btn" id="toggle-stops">' +
      (state.expanded ? t("hideStops") : t("showStops")) +
      '<span class="sep" aria-hidden="true">·</span>' +
      t("stops.count", { n: reach.stops.length }) + "</button>"
  ].join("");

  /* Grouped stop list, start zone first. */
  const groups = zoneIds.map(function (z) {
    const rows = reach.stops.filter(function (s) { return s.zone === z; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, "da"); });
    if (!rows.length) return "";
    const isStart = z === reach.from.zone;
    return [
      '<section class="zone-group">',
      '<div class="zone-group-head">',
      '<span class="zone-dot" style="background:' + ringVar(reach.ringByZone[z]) + '"></span>',
      "<h3>" + t("zone", { n: z }) + "</h3>",
      isStart ? '<span class="tag">' + t("yourZone") + "</span>" : "",
      "</div>",
      "<ul>" + rows.map(function (s) {
        return '<li><button type="button" class="stop-row" data-stop-row="' + s.id + '">' +
          '<span class="stop-name">' + s.name + "</span>" +
          '<span class="stop-modes">' + MODE_ORDER.filter(function (m) {
            return s.modes.indexOf(m) !== -1 && state.modes.indexOf(m) !== -1;
          }).map(function (m) {
            return '<span class="mode-tag">' + modeLabel(m) + "</span>";
          }).join("") + "</span></button></li>";
      }).join("") + "</ul>",
      "</section>"
    ].join("");
  }).join("");

  el.stopList.innerHTML = groups;
}

function renderCountSheet() {
  el.stopList.innerHTML = "";
  if (!state.from2Id || !state.toId) {
    el.sheetBody.innerHTML = '<div class="empty"><h2>' + t("empty.title") + "</h2><p>" +
      t("empty.sub") + "</p></div>";
    return;
  }
  const route = currentRoute();
  if (!route) {
    el.sheetBody.innerHTML = '<div class="empty"><h2>' + t("noRoute.title") + "</h2><p>" +
      t("noRoute.sub") + "</p></div>";
    announce(t("noRoute.sub"));
    return;
  }
  announce(t("live.count", {
    x: STOP_BY_ID[state.from2Id].name,
    y: STOP_BY_ID[state.toId].name,
    n: route.count
  }));
  const ringByZone = {};
  route.zones.forEach(function (z, i) { ringByZone[z] = Math.min(i, 4); });

  el.sheetBody.innerHTML = [
    '<div class="count-block">',
    '<p class="count-label">' + t("count.need") + "</p>",
    '<p class="count-big">' + t("count.zones", { n: route.count }) + "</p>",
    "</div>",
    '<p class="count-sub">' + t("count.through") + "</p>",
    '<div class="zone-pills">' + zonePillsHtml(route.zones, ringByZone, true) + "</div>"
  ].join("");
}

/* One polite announcement per recalculation, so the result is not silent for
   anyone who cannot see the sheet. */
function announce(text) {
  const live = document.getElementById("live");
  if (live) live.textContent = text;
}

function measureSheet() {
  requestAnimationFrame(function () {
    document.documentElement.style.setProperty("--sheet-h", el.sheet.offsetHeight + "px");
  });
}

/* ---------- fields ---------- */

function fieldEls(field) {
  return {
    input: document.getElementById(field.input),
    results: document.getElementById(field.results),
    wrap: document.querySelector('[data-field="' + field.key + '"]')
  };
}

function syncFields() {
  FIELDS.forEach(function (f) {
    const nodes = fieldEls(f);
    const id = state[f.slot];
    if (document.activeElement !== nodes.input) {
      nodes.input.value = id ? STOP_BY_ID[id].name : "";
    }
    nodes.wrap.classList.toggle("is-filled", Boolean(id));
  });
  el.ticketValue.textContent = String(state.ticket);
  el.ticketMinus.disabled = state.ticket <= TICKET_MIN;
  el.ticketPlus.disabled = state.ticket >= TICKET_MAX;
}

function searchStops(query) {
  const q = fold(query.trim());
  const pool = STOPS.filter(function (s) { return servedBy(s, state.modes); });
  if (!q) {
    return pool.slice().sort(function (a, b) {
      return ZONES[a.zone].ring - ZONES[b.zone].ring || a.name.localeCompare(b.name, "da");
    }).slice(0, 8);
  }
  const hits = pool.filter(function (s) { return fold(s.name).indexOf(q) !== -1; });
  hits.sort(function (a, b) {
    const ap = fold(a.name).indexOf(q) === 0 ? 0 : 1;
    const bp = fold(b.name).indexOf(q) === 0 ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name, "da");
  });
  return hits.slice(0, 8);
}

function openResults(field) {
  const nodes = fieldEls(field);
  const matches = searchStops(nodes.input.value);
  nodes.results.innerHTML = matches.length
    ? matches.map(function (s, i) {
        return '<li class="res-item" role="option" id="' + field.key + "-opt-" + i +
          '" data-pick="' + s.id + '">' +
          '<span class="res-name">' + s.name + "</span>" +
          '<span class="zone-chip">' + t("zone", { n: s.zone }) + "</span></li>";
      }).join("")
    : '<li class="res-empty">' + t("noResults") + "</li>";
  nodes.results.classList.add("is-open");
  nodes.input.setAttribute("aria-expanded", "true");
  setCursor(field, 0);
}

/* Moves the combobox's active option without moving DOM focus. */
function setCursor(field, index) {
  const nodes = fieldEls(field);
  const items = Array.prototype.slice.call(nodes.results.querySelectorAll("[data-pick]"));
  if (!items.length) {
    nodes.input.removeAttribute("aria-activedescendant");
    return -1;
  }
  const i = (index + items.length) % items.length;
  items.forEach(function (li, n) {
    li.classList.toggle("is-cursor", n === i);
    li.setAttribute("aria-selected", String(n === i));
  });
  nodes.input.setAttribute("aria-activedescendant", items[i].id);
  items[i].scrollIntoView({ block: "nearest" });
  return i;
}

function cursorIndex(field) {
  const items = Array.prototype.slice.call(
    fieldEls(field).results.querySelectorAll("[data-pick]"));
  return items.findIndex(function (li) { return li.classList.contains("is-cursor"); });
}

function closeResults(field) {
  const nodes = fieldEls(field);
  nodes.results.classList.remove("is-open");
  nodes.input.setAttribute("aria-expanded", "false");
  nodes.input.removeAttribute("aria-activedescendant");
}

function closeAllResults() {
  FIELDS.forEach(closeResults);
}

function pick(field, stopId) {
  /* A hand-picked stop is no longer "where you are". */
  document.getElementById("locate").classList.remove("is-active");
  state[field.slot] = stopId;
  /* Keep the two "From" fields in step — it is the same question. */
  if (field.slot === "fromId") state.from2Id = stopId;
  if (field.slot === "from2Id") state.fromId = stopId;
  closeResults(field);
  fieldEls(field).input.blur();
  render({ recentre: true });
}

/* ---------- chips ---------- */

/* Built once, then updated in place — re-rendering the row would drop
   focus from the chip the user just pressed. */
function renderChips() {
  if (!el.chips.children.length) {
    el.chips.innerHTML = MODE_ORDER.map(function (m) {
      return '<button type="button" class="chip" data-mode="' + m + '"></button>';
    }).join("");
  }
  MODE_ORDER.forEach(function (m) {
    const btn = el.chips.querySelector('[data-mode="' + m + '"]');
    btn.textContent = modeLabel(m);
    btn.setAttribute("aria-pressed", String(state.modes.indexOf(m) !== -1));
  });
}

/* ---------- tabs ---------- */

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  });
  document.getElementById("pane-reach").classList.toggle("is-active", tab === "reach");
  document.getElementById("pane-count").classList.toggle("is-active", tab === "count");
  closeAllResults();
  render({ recentre: true });
}

/* ---------- render ---------- */

function render(opts) {
  syncFields();
  renderChips();
  renderSheet();
  if (opts && opts.recentre) recentre();
  pushMap();
}

/* ---------- events ---------- */

function bindEvents() {
  document.querySelectorAll(".segmented [data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { setTab(b.dataset.tab); });
  });

  document.querySelectorAll(".lang [data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      LANG = b.dataset.lang;
      document.querySelectorAll(".lang [data-lang]").forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.lang === LANG));
      });
      applyStaticCopy();
      render();
      MapView.refreshPins();
    });
  });

  el.ticketMinus.addEventListener("click", function () {
    state.ticket = Math.max(TICKET_MIN, state.ticket - 1);
    render({ recentre: true });
  });
  el.ticketPlus.addEventListener("click", function () {
    state.ticket = Math.min(TICKET_MAX, state.ticket + 1);
    render({ recentre: true });
  });

  el.chips.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    const m = btn.dataset.mode;
    const i = state.modes.indexOf(m);
    if (i === -1) state.modes.push(m); else state.modes.splice(i, 1);
    render();
  });

  document.getElementById("swap").addEventListener("click", function () {
    const a = state.from2Id, b = state.toId;
    state.from2Id = b;
    state.toId = a;
    if (b) state.fromId = b;
    render({ recentre: true });
  });

  el.sheetHandle.addEventListener("click", function () {
    if (state.tab !== "reach") return;
    state.expanded = !state.expanded;
    renderSheet();
  });

  el.sheetBody.addEventListener("click", function (e) {
    if (e.target.closest("#toggle-stops")) {
      state.expanded = !state.expanded;
      renderSheet();
    }
  });

  el.stopList.addEventListener("click", function (e) {
    const row = e.target.closest("[data-stop-row]");
    if (!row) return;
    state.toId = row.dataset.stopRow;
    setTab("count");
  });

  FIELDS.forEach(function (f) {
    const nodes = fieldEls(f);
    nodes.input.addEventListener("focus", function () {
      /* Select what is there so typing replaces the stop rather than
         editing it into nonsense. */
      nodes.input.select();
      openResults(f);
    });
    nodes.input.addEventListener("input", function () { openResults(f); });
    nodes.input.addEventListener("keydown", function (e) {
      const open = nodes.results.classList.contains("is-open");
      if (e.key === "Escape") { closeResults(f); nodes.input.blur(); return; }
      if (!open) return;
      const items = Array.prototype.slice.call(nodes.results.querySelectorAll("[data-pick]"));
      if (!items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor(f, cursorIndex(f) + (e.key === "ArrowDown" ? 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const i = Math.max(0, cursorIndex(f));
        pick(f, items[i].dataset.pick);
      }
    });
    nodes.results.addEventListener("mousedown", function (e) {
      const item = e.target.closest("[data-pick]");
      if (!item) return;
      e.preventDefault();
      pick(f, item.dataset.pick);
    });
  });

  document.querySelectorAll("[data-clear]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.fromId = null;
      state.from2Id = null;
      state.expanded = false;
      render();
      document.getElementById("input-from").focus();
    });
  });

  document.addEventListener("pointerdown", function (e) {
    /* Not every event target is an Element (the document itself, for one). */
    const target = e.target instanceof Element ? e.target : null;
    if (!target || !target.closest(".field")) closeAllResults();
  });

  document.getElementById("locate").addEventListener("click", locateMe);

  document.getElementById("zoom-in").addEventListener("click", function () { MapView.zoomBy(0.78); });
  document.getElementById("zoom-out").addEventListener("click", function () { MapView.zoomBy(1.28); });

  window.addEventListener("resize", measureSheet);
}

/* ---------- toast ---------- */

let toastTimer = null;

function showToast(text) {
  const node = document.getElementById("toast");
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { node.hidden = true; }, 4500);
}

/* ---------- geolocation ---------- */

/* The map is schematic, so a real position cannot be drawn on it honestly.
   A fix is only used to resolve the nearest stop, which becomes the start. */
function locateMe() {
  const btn = document.getElementById("locate");

  if (!navigator.geolocation) { showToast(t("geo.unsupported")); return; }
  if (!window.isSecureContext) { showToast(t("geo.insecure")); return; }

  btn.classList.add("is-busy");
  btn.classList.remove("is-active");
  btn.disabled = true;
  announce(t("geo.locating"));

  function done() {
    btn.classList.remove("is-busy");
    btn.disabled = false;
  }

  navigator.geolocation.getCurrentPosition(function (pos) {
    done();
    const near = nearestStop(pos.coords.latitude, pos.coords.longitude, state.modes);
    if (!near) { showToast(t("geo.faraway")); announce(t("geo.faraway")); return; }

    state.fromId = near.stop.id;
    state.from2Id = near.stop.id;
    btn.classList.add("is-active");
    render({ recentre: true });

    const msg = t("geo.found", { x: near.stop.name, km: near.km.toFixed(1) });
    showToast(msg);
    announce(msg);
  }, function (err) {
    done();
    const key = err.code === 1 ? "geo.denied" : "geo.unavailable";
    showToast(t(key));
    announce(t(key));
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

/* ---------- start ---------- */

function onMapStopClick(stopId) {
  if (state.tab === "reach") {
    state.fromId = stopId;
    state.from2Id = stopId;
  } else if (!state.from2Id) {
    state.from2Id = stopId;
    state.fromId = stopId;
  } else {
    state.toId = stopId;
  }
  render({ recentre: false });
}

applyStaticCopy();
MapView.init(el.map, el.overlay, onMapStopClick);
bindEvents();
state.from2Id = state.fromId;
render({ recentre: true });
