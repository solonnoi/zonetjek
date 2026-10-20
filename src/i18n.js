/* Zonetjek — copy. {tokens} are filled by t(). */
const COPY = {
  en: {
    "tab.reach": "Where can I go?",
    "tab.count": "How many zones?",
    "from": "From",
    "to": "To",
    "ticket": "Ticket",
    "search.ph": "Search station or stop",
    "reach.lead": "With {n} zones from {x}, you can reach",
    "reach.lead.nostart": "Pick a station to see where {n} zones take you",
    "count.need": "You need",
    "count.through": "Through zones",
    "count.zones": "{n} zones",
    "showStops": "Show stops",
    "hideStops": "Hide stops",
    "stops.count": "{n} stops",
    "yourZone": "Your zone",
    "zone": "Zone {n}",
    "empty.title": "Where are you going?",
    "empty.sub": "Search above or tap a stop on the map",
    "noRoute.title": "No route",
    "noRoute.sub": "No connection with the modes you have on. Try turning more on.",
    "noResults": "No stops found",
    "noModes.title": "No modes on",
    "noModes.sub": "Turn on at least one mode to see stops.",
    "live.reach": "{n} zones from {x} reaches {c} stops.",
    "live.count": "{x} to {y} needs {n} zones.",
    "footer": "Real DOT zones, part of the network — check DOT before you travel",
    "credit.coast": "Coastline",
    "mode.metro": "Metro",
    "mode.stog": "S-tog",
    "mode.bus": "Bus",
    "mode.regional": "Regional",
    "mode.harbour": "Harbour bus",
    "swap": "Swap from and to",
    "locate": "Use my location",
    "geo.locating": "Finding your location…",
    "geo.found": "Nearest stop: {x}, {km} km away",
    "geo.denied": "Location permission denied. You can search for a stop instead.",
    "geo.unavailable": "Could not get your location. You can search for a stop instead.",
    "geo.unsupported": "This browser cannot share a location.",
    "geo.insecure": "Location needs a secure connection (https or localhost).",
    "geo.faraway": "You are outside the area this prototype covers.",
    "zoom.in": "Zoom in",
    "zoom.out": "Zoom out",
    "clear": "Clear"
  },
  da: {
    "tab.reach": "Hvor kan jeg komme hen?",
    "tab.count": "Hvor mange zoner?",
    "from": "Fra",
    "to": "Til",
    "ticket": "Billet",
    "search.ph": "Søg station eller stop",
    "reach.lead": "Med {n} zoner fra {x}, kan du nå",
    "reach.lead.nostart": "Vælg en station for at se, hvor {n} zoner rækker",
    "count.need": "Du skal bruge",
    "count.through": "Gennem zonerne",
    "count.zones": "{n} zoner",
    "showStops": "Vis stop",
    "hideStops": "Skjul stop",
    "stops.count": "{n} stop",
    "yourZone": "Din zone",
    "zone": "Zone {n}",
    "empty.title": "Hvor skal du hen?",
    "empty.sub": "Søg ovenfor eller tryk på et stop på kortet",
    "noRoute.title": "Ingen rute",
    "noRoute.sub": "Ingen forbindelse med de valgte transportmidler. Prøv at slå flere til.",
    "noResults": "Ingen stop fundet",
    "noModes.title": "Ingen transportmidler",
    "noModes.sub": "Slå mindst ét transportmiddel til for at se stop.",
    "live.reach": "{n} zoner fra {x} når {c} stop.",
    "live.count": "{x} til {y} kræver {n} zoner.",
    "footer": "Rigtige DOT-zoner, dele af nettet — tjek DOT før du rejser",
    "credit.coast": "Kystlinje",
    "mode.metro": "Metro",
    "mode.stog": "S-tog",
    "mode.bus": "Bus",
    "mode.regional": "Regionaltog",
    "mode.harbour": "Havnebus",
    "swap": "Byt fra og til",
    "locate": "Brug min placering",
    "geo.locating": "Finder din placering…",
    "geo.found": "Nærmeste stop: {x}, {km} km væk",
    "geo.denied": "Adgang til placering afvist. Du kan søge efter et stop i stedet.",
    "geo.unavailable": "Kunne ikke finde din placering. Du kan søge efter et stop i stedet.",
    "geo.unsupported": "Denne browser kan ikke dele en placering.",
    "geo.insecure": "Placering kræver en sikker forbindelse (https eller localhost).",
    "geo.faraway": "Du er uden for det område, denne prototype dækker.",
    "zoom.in": "Zoom ind",
    "zoom.out": "Zoom ud",
    "clear": "Ryd"
  }
};

let LANG = "en";

function t(key, vars) {
  const table = COPY[LANG] || COPY.en;
  let out = table[key] !== undefined ? table[key] : (COPY.en[key] !== undefined ? COPY.en[key] : key);
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      out = out.split("{" + k + "}").join(vars[k]);
    });
  }
  return out;
}

/* Re-label every static node that carries a data-i18n* attribute. */
function applyStaticCopy() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-clear]").forEach(function (el) {
    el.setAttribute("aria-label", t("clear"));
  });
}
