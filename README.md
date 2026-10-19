# Zonetjek

A mobile-first web app showing which Copenhagen stops you can reach on a DOT
zone ticket, and how many zones a trip costs.

> ## ⚠️ What this app knows, and what it doesn't
>
> The zone numbers, names and boundaries are DOT's real ones, and the stops
> and line routings come from Rejseplanen's own feed — see
> [Where the data comes from](#where-the-data-comes-from). Two limits remain.
> It carries **part of the network**: the metro, the S-tog, two regional
> services, the harbour buses and fourteen bus lines, cut where they leave the
> 15 zones of the inner capital area — and because zone adjacency is derived
> from those lines, reach in the outer zones is only as wide as the lines it
> knows. And it answers in **zones, never in kroner**. Check
> [DOT](https://dinoffentligetransport.dk) before you travel.

No build step, no dependencies. Serve the folder with any static server:

```bash
python3 -m http.server 4178
```

Then open `http://localhost:4178`. (`.claude/launch.json` wires the same
command to the editor's preview pane.)

## The screens

The app is one interactive surface rather than a set of fixed screens. Each
state from the original brief is reachable like this:

| # | State | How to get there |
|---|---|---|
| 1 | Reach, 2 zones from Nørreport | the opening state |
| 2 | Reach, 3 zones | press **+** on the Ticket stepper (2–7) |
| 3 | Station search open | tap the **From** field |
| 4 | Sheet expanded with stop list | tap **Show stops · 88 stops** |
| 5 | "How many zones?" empty | switch tabs, clear **To** |
| 6 | Nørreport → Lufthavnen = 3 zones | switch tabs, set **To** to Københavns Lufthavn |
| 7 | Danish | tap **DA** |
| 8 | Desktop | widen the window past 900px |

Tapping a stop on the map sets the start (or the destination, once a start is
set on tab 2). Drag to pan, scroll or use **+ / −** to zoom. The ⊕ button above
the zoom controls starts from wherever you are.

## Where the data comes from

`src/datasets/copenhagen.js` is generated, not written. Two published sources
feed it, and nothing in it is invented:

| What | Source |
|---|---|
| zone numbers, names, boundaries | Movia's public ArcGIS layer `Hosted/Takstzoner` — the 211 DOT zones east of Storebælt, each polygon carrying its zone number |
| stops, coordinates, line routings | the [Rejseplanen GTFS feed](https://www.rejseplanen.info/labs/GTFS.zip), all of Danish public transport |

A stop's zone is the zone whose polygon its coordinates fall inside; a line's
stops are the stops that line actually calls at. To rebuild:

```bash
python3 tools/build-dataset.py --gtfs path/to/unpacked-gtfs --zones path/to/takstzoner.geojson
node tools/check-dataset.js
```

The generator (`tools/build-dataset.py`, no dependencies) carries the editorial
decisions, and they are all it carries:

- **Scope.** 15 zones — 1, 2, 3, 4, 30–33, 40–44, 51, 55 — and 28 lines, each
  cut where it leaves them. Peak-only S-tog variants are left out; so is the
  Ring 3 light rail, which would need a sixth mode.
- **Which stops survive.** Every station on a rail, metro, regional or harbour
  line. Of a bus line's stops, only those at a station, those that are the
  first stop in a new zone, and the ends — enough to keep every zone boundary
  the line crosses, without 400 roadside stops.
- **One place, one stop.** The feed keeps the metro, S-tog and regional halves
  of an interchange as separate stations (Nørreport is three). They are merged
  into one stop carrying every mode.
- **Running through a zone.** The RE passes Svanemøllen and Brøndbyøster
  without calling there, which would invent an adjacency across them, so it is
  given a stop at each — the rule below. Where no such stop is honest, the line
  is cut instead; that happens once, to the 500S across Kalveboderne.
- **Positions.** `x`/`y` is the real position projected into the map's box, and
  `padding` samples each zone's real polygon so the blobs follow the real zone
  shape. Presentation, not data: neither touches a fare.

A handful of stations sit *on* a zone boundary, and DOT counts them as being
in either zone — Hellerup is 2/30, Lyngby 41/51. A stop here has one zone, the
one its coordinates fall in, so a trip starting at such a station can come out
a zone dearer than DOT would sell it.

Six boundaries that exist on the ground are missing from the derived graph
(31–43, 32–42, 32–44, 33–43, 40–51, 43–55), because no line the dataset carries
crosses them. Reach from those outer zones is therefore narrower than DOT's.
The generator prints them on every run.

## Extending to more of the region

The app knows nothing about Copenhagen specifically. Everything regional lives
in `src/datasets/`, and covering more of Zealand is a data change:

1. Copy `src/datasets/copenhagen.js` to `src/datasets/zealand.js`, give it a
   new `id`, and extend the four lists: `zones`, `stops`, `lines`, `padding`.
   For this region, widen `SCOPE` in `tools/build-dataset.py` instead and
   regenerate — the two sources above already cover all of Zealand.
2. Add it to the `DATASETS` array in `src/datasets/index.js`.
3. Add its `<script>` tag to `index.html`, next to the others.

It is then live at `?dataset=zealand`, and becomes the default by changing
`DEFAULT_DATASET`. Nothing in `engine.js`, `map.js` or `app.js` needs touching.

A dataset also carries its own `ticket` range (the stepper's min and max), its
opening stop (`home`), and its `haloRadius`, so a sparser region can be drawn
with wider halos without affecting Copenhagen.

### The rules a dataset must follow

```
node tools/check-dataset.js
```

checks every registered dataset and exits non-zero on a problem, so it can gate
a commit. It enforces:

- every stop's zone exists, and every zone has stops
- every line names stops that exist, and every stop is served by some line
- every stop is reachable from the dataset's `home`
- **consecutive stops on a line are in the same or a touching zone**
- the reach/cost invariant below

That fourth rule is the one that bites. Zone adjacency is *derived* from the
steps between consecutive stops, so a line that lists two stops with a zone
sitting between them invents an adjacency that does not exist on the ground —
and suddenly a 3-zone ticket from the city centre reaches somewhere it
shouldn't. If a line runs through a zone without stopping, give it a stop
there anyway.

The engine has no ceiling on zone count; a region-wide dataset with a hundred
zones is fine.

## Zone maths

Two different calculations sit behind the two tabs:

- **Where can I go?** — an *N*-zone ticket reaches every zone within *N−1*
  steps of the start zone on the zone adjacency graph.
- **How many zones?** — the cost is the number of *distinct* zones the route
  passes through, never fewer than two. A Dijkstra search over
  (stop, set of zones visited) minimises the zone set rather than the number of
  zone changes, so a trip that leaves a zone and comes back does not pay twice.
  Mode filters apply, so turning Metro off can change the answer or remove the
  route entirely.

**The invariant:** if a trip costs *N* zones, an *N*-zone ticket bought at the
origin must reach the destination. The two tabs must never contradict each
other. `tools/check-dataset.js` verifies this across every sampled trip.

This matters because an earlier build got it wrong. Zone adjacency was
maintained by hand, drifted out of step with the lines, and the app ended up
pricing Amager Strand → Nørreport at 2 zones while claiming a 2-zone ticket
from Amager Strand could not reach zone 1. Deriving adjacency from the network
makes that class of bug impossible to reintroduce.

### Deviation from the original brief

The brief gave two worked examples, and real data settles both.

**Nørreport → Lufthavnen = 3 zones through 1 → 3 → 4 holds**, exactly as the
brief drew it.

The other example does not, and now it is clear that it never could: the brief
showed a 2-zone ticket from Nørreport reaching *Zone 1 and Zone 2*, where the
app shows *Zone 1, 2 and 3*. Zone 1 and zone 3 really do share a boundary on
Amager — the M2 crosses it between Lergravsparken and Øresund — so a 2-zone
ticket bought in zone 1 is valid in zone 3, and the airport trip costs 3 zones
for the same reason. The two halves of the brief's figure cannot both be true
of Copenhagen. When this was an invented dataset the decision was to keep the
derived adjacency over the illustration; the real zones agree with it.

## How the map is drawn

The map is schematic, not geographic. Every stop emits a soft circular halo; an
SVG goo filter (gaussian blur plus an alpha threshold) merges the halos of one
zone into a single organic blob, so zone areas are drawn from point positions
rather than by hand. `padding` adds halo centres that carry no stop and only
shape the blobs — here they are sampled from the real zone polygons, so each
blob follows the shape of the actual fare zone.

Because most zones are rings, a zone's centroid falls inside the zone it wraps
around. Zone numbers are placed instead at the halo centre farthest from every
other zone — the point deepest inside the zone's own territory.

Markers: metro a filled dot, S-tog and regional a hollow dot, harbour bus a
hollow diamond, bus-only stops a small grey dot. Lines are thin grey strokes,
metro darker and thicker, regional dashed, harbour bus dotted.

Each layer redraws only when its own inputs change, so toggling a mode does not
re-run the goo filter over every zone blob.

## Where am I

The ⊕ control asks the browser for a position and starts from the nearest stop.
Geolocation needs a secure context, so it works over `https` and on `localhost`
but not from a `file://` page; the app says so rather than failing silently, and
handles a denied permission, an unavailable fix, and being outside the region
(beyond 60 km, where "nearest stop" stops being a useful answer).

Each stop carries the real `lat`/`lon` of its station from the feed, alongside
the schematic `x`/`y` the map draws it at.

The user's position is deliberately **not** drawn on the map. The map is
schematic, so there is no honest place to put a "you are here" dot. A position
only ever resolves to a stop.

## Accessibility

Each search field is a real combobox (`aria-expanded`, `aria-activedescendant`,
options that are options rather than nested buttons), so arrow keys and Enter
work and a screen reader announces the highlighted stop. Results are announced
through a polite live region, every control has a visible `:focus-visible`
ring, targets are at least 44px, and `prefers-reduced-motion` is honoured.

The map is pointer-driven; everything it does is also reachable through the
search fields and the stop list.

## Design tokens

Tokens live as CSS custom properties at the top of `styles.css`, and
`figma-tokens.json` carries the same values in W3C Design Tokens format for
import as Figma variables.

| Token | Value |
|---|---|
| `--paper` / `--bg` / `--land` | `#FCFBF8` / `#F3F1EC` / `#EAE7E0` |
| `--ink` / `--muted` / `--muted-2` | `#1F2633` / `#6B7280` / `#B0B5BD` |
| `--ring-0` … `--ring-4` | `#4FC394` `#8ED8B3` `#B7E6CB` `#D5F0DF` `#E4F5EA` |
| `--on-ring` | `#1E4D3A` |

Radii 20 / 14 / 999 / 24, one shared shadow, 44px minimum touch target.
Bricolage Grotesque (600/800) for headings, numbers and zone labels; Figtree
(400–700) for everything else.

## Files

```
index.html                   structure
styles.css                   tokens, layout, components
src/datasets/copenhagen.js   the region: zones, stops, lines, blob padding
src/datasets/index.js        dataset registry and ?dataset= selection
src/dataset.js               loader and validator (no DOM)
src/active.js                binds the chosen dataset to the app
src/engine.js                reach rings and route search (no DOM)
src/i18n.js                  EN/DA copy
src/map.js                   SVG map, camera, pins
src/app.js                   state and view wiring
tools/build-dataset.py       regenerates the dataset from open data
tools/check-dataset.js       dataset and invariant checks
figma-tokens.json            tokens for Figma variables
```

`dataset.js` and `engine.js` have no DOM dependency and run under Node.

## Not built

Fare prices in kroner, route suggestions ("take M2"), the rest of the network
(the Ring 3 light rail would need a sixth mode; so would the local railways),
the region beyond the inner capital zones, persistence, offline support, live
position tracking (location is read once per press).
