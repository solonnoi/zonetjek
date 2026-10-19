#!/usr/bin/env node
/* Checks every registered dataset against the rules in src/dataset.js, then
   checks the invariant that ties the app's two answers together.

   Run: node tools/check-dataset.js
   Exits non-zero if anything is wrong, so it can gate a commit or CI. */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const datasetFiles = fs.readdirSync(path.join(root, "src/datasets"))
  .filter(f => f.endsWith(".js") && f !== "index.js")
  .map(f => "src/datasets/" + f);

/* Count the registered datasets first, in a throwaway context. */
const probe = vm.createContext({ console });
vm.runInContext(datasetFiles.map(read).join("\n") + read("src/datasets/index.js"), probe);
const total = vm.runInContext("DATASETS.length", probe);

let failed = 0;

for (let n = 0; n < total; n++) {
  /* A fresh context per dataset: engine.js reads the globals at load time. */
  const ctx = vm.createContext({ console });
  vm.runInContext(
    datasetFiles.map(read).join("\n") +
    read("src/datasets/index.js") +
    read("src/dataset.js"), ctx);

  vm.runInContext(`
    var DATA = loadDataset(DATASETS[${n}]);
    var ZONES = DATA.zones, STOPS = DATA.stops,
        STOP_BY_ID = DATA.stopById, LINES = DATA.lines;
  `, ctx);
  vm.runInContext(read("src/engine.js"), ctx);

  const result = vm.runInContext(`(function () {
    const problems = validateDataset(DATA);
    const ids = DATA.stops.map(s => s.id);
    let checked = 0;
    const broken = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j += 3) {
        const a = ids[i], b = ids[j];
        if (a === b) continue;
        const route = findRoute(a, b, ALL_MODES);
        if (!route) continue;
        checked++;
        if (reachableZones(STOP_BY_ID[a].zone, route.count)[STOP_BY_ID[b].zone] === undefined) {
          broken.push(a + " -> " + b + " costs " + route.count + " zones but is out of reach");
        }
      }
    }
    const unreachable = [];
    ids.forEach(id => {
      if (!findRoute(DATA.home, id, ALL_MODES) && id !== DATA.home) unreachable.push(id);
    });
    return {
      id: DATA.id,
      stops: DATA.stops.length,
      lines: DATA.lines.length,
      zones: Object.keys(DATA.zones),
      neighbours: Object.keys(DATA.zones).map(z => z + " -> " + (DATA.zones[z].neighbours.join(", ") || "nothing")),
      ticket: DATA.ticket,
      problems, checked, broken, unreachable
    };
  })()`, ctx);

  console.log(`\n${result.id} — ${result.stops} stops, ${result.lines} lines, ` +
    `${result.zones.length} zones, tickets ${result.ticket.min}-${result.ticket.max}`);
  result.neighbours.forEach(n => console.log("  zone " + n));

  if (result.problems.length) {
    failed += result.problems.length;
    console.log(`  ${result.problems.length} problem(s):`);
    result.problems.forEach(p => console.log("    x " + p));
  } else {
    console.log("  ok  dataset rules pass");
  }

  if (result.unreachable.length) {
    failed += result.unreachable.length;
    console.log(`  x   unreachable from home: ${result.unreachable.join(", ")}`);
  } else {
    console.log("  ok  every stop reachable from the opening stop");
  }

  if (result.broken.length) {
    failed += result.broken.length;
    console.log(`  x   reach/cost invariant broken on ${result.broken.length} of ${result.checked} trips:`);
    result.broken.slice(0, 5).forEach(b => console.log("        " + b));
  } else {
    console.log(`  ok  reach/cost invariant holds across ${result.checked} trips`);
  }
}

console.log(failed ? `\n${failed} problem(s) found.` : "\nAll datasets sound.");
process.exit(failed ? 1 : 0);
