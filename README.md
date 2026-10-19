# Zonetjek

A mobile-first web app showing which Copenhagen stops you can reach on a DOT
zone ticket, and how many zones a trip costs.

> ## ⚠️ The data in this app is invented
>
> The zones, the stop-to-zone assignments, which zones touch, the line
> routings and the stop positions were all made up for this prototype. They
> behave plausibly and are internally consistent, but **no fare this app
> reports is correct**. It is a design and interaction prototype, not a travel
> tool. Check [DOT](https://dinoffentligetransport.dk) before you travel.

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
| 2 | Reach, 3 zones | press **+** on the Ticket stepper |
| 3 | Station search open | tap the **From** field |
| 4 | Sheet expanded with stop list | tap **Show stops · 63 stops** |
| 5 | "How many zones?" empty | switch tabs, clear **To** |
| 6 | Nørreport → Lufthavnen = 3 zones | switch tabs, set **To** to Lufthavnen |
| 7 | Danish | tap **DA** |
| 8 | Desktop | widen the window past 900px |

Tapping a stop on the map sets the start (or the destination, once a start is
set on tab 2). Drag to pan, scroll or use **+ / −** to zoom. The ⊕ button above
the zoom controls starts from wherever you are.

## Extending to more of the region

The app knows nothing about Copenhagen specifically. Everything regional lives
in `src/datasets/`, and covering more of Zealand is a data change:

1. Copy `src/datasets/copenhagen.js` to `src/datasets/zealand.js`, give it a
   new `id`, and extend the four lists: `zones`, `stops`, `lines`, `padding`.
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

The brief gave two worked examples. **Nørreport → Lufthavnen = 3 zones through
1 → 3 → 4 holds.** The other does not: the brief showed a 2-zone ticket from
Nørreport reaching *Zone 1 and Zone 2*; here it reaches *Zone 1, 2 and 3*.

The two cannot both be true. Nørreport → Lufthavnen only costs 3 zones because
zone 3 touches zone 1 across Amager; if zone 3 touches zone 1, a 2-zone ticket
from zone 1 necessarily reaches it. **Decided: keep the derived adjacency**, on
the grounds that a model which cannot contradict itself is worth more than
matching an illustrative figure.

## How the map is drawn

The map is schematic, not geographic. Every stop emits a soft circular halo; an
SVG goo filter (gaussian blur plus an alpha threshold) merges the halos of one
zone into a single organic blob, so zone areas are derived from stop positions
rather than drawn by hand. `padding` adds halo centres that carry no stop and
only shape the blobs.

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

Each stop carries an **approximate** real `lat`/`lon` alongside its schematic
`x`/`y` — accurate enough to pick the right neighbouring stop and nothing more.

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
tools/check-dataset.js       dataset and invariant checks
figma-tokens.json            tokens for Figma variables
```

`dataset.js` and `engine.js` have no DOM dependency and run under Node.

## Not built

Real DOT data, route suggestions ("take M2"), fare prices, persistence,
offline support, live position tracking (location is read once per press).
