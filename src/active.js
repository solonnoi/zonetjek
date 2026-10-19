/* The dataset this page is running on. Everything downstream reads these
   names and never knows which region it is showing. */

const DATA = loadDataset(pickDataset());

const ZONES = DATA.zones;
const STOPS = DATA.stops;
const STOP_BY_ID = DATA.stopById;
const LINES = DATA.lines;
const ZONE_PADDING = DATA.padding;
const HALO_R = DATA.haloRadius;

/* A dataset that breaks its own rules says so in the console rather than
   failing quietly somewhere far away. */
(function reportDatasetProblems() {
  const problems = validateDataset(DATA);
  if (!problems.length) return;
  console.warn('Zonetjek: dataset "' + DATA.id + '" has ' + problems.length + ' problem(s):');
  problems.forEach(function (p) { console.warn("  - " + p); });
})();
