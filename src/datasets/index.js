/* Register every dataset here. Adding one is the whole extension story:
   write src/datasets/<name>.js, add it below, add its <script> tag in
   index.html, and it becomes selectable with ?dataset=<id>. */

const DATASETS = [
  DATASET_COPENHAGEN
];

const DEFAULT_DATASET = "copenhagen";

function pickDataset() {
  let wanted = DEFAULT_DATASET;
  try {
    const asked = new URLSearchParams(location.search).get("dataset");
    if (asked) wanted = asked;
  } catch (e) { /* no URL to read; fall back to the default */ }

  const found = DATASETS.filter(function (d) { return d.id === wanted; })[0];
  if (!found) {
    console.warn('Zonetjek: no dataset "' + wanted + '", using ' + DEFAULT_DATASET);
    return DATASETS.filter(function (d) { return d.id === DEFAULT_DATASET; })[0];
  }
  return found;
}
