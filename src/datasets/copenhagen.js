/* Zonetjek dataset — Copenhagen zones 1-4.
   =========================================================================
   INVENTED DATA. Zone assignments, line routings and stop positions are made
   up. They behave plausibly; they are not DOT's real zones or fares.
   =========================================================================

   To cover more of the region (all of Zealand, say), copy this file, extend
   the four lists below, and register it in src/datasets/index.js. Nothing
   outside src/datasets/ needs to change. Run `node tools/check-dataset.js`
   to have the rules below checked for you.

   Rules a dataset must satisfy:
     - every stop's zone exists in `zones`
     - every id in a line's `stops` exists in `stops`
     - every stop is served by at least one line
     - consecutive stops on a line are in the same or a touching zone — a line
       that skips over a zone invents an adjacency that does not exist, and
       zone adjacency is derived from exactly these steps
     - `ring` orders the colour ramp outwards from the central zone */

const DATASET_COPENHAGEN = {
  id: "copenhagen",
  name: { en: "Copenhagen", da: "København" },

  /* Ticket sizes this dataset can meaningfully sell. */
  ticket: { min: 2, max: 4 },

  /* Opening state. */
  home: "noerreport",

  /* Halo radius, in schematic units, that merges stops into zone blobs. */
  haloRadius: 46,

  /* ring 0 is the centre; the colour ramp lightens outwards.
     neighbours are NOT listed here — they are derived from `lines`. */
  zones: {
    "1": { ring: 0 },
    "2": { ring: 1 },
    "3": { ring: 2 },
    "4": { ring: 3 }
  },

  /* id, name, zone, x, y, lat, lon
     x/y are schematic positions with no relation to real geography.
     lat/lon are approximate real positions, used only to find a nearest stop. */
  stops: [
  ["noerreport",       "Nørreport",             "1", 480, 455, 55.6833, 12.5714],
  ["osterport",        "Østerport",             "1", 545, 425, 55.6925, 12.5873],
  ["marmorkirken",     "Marmorkirken",          "1", 560, 462, 55.6846, 12.5926],
  ["kgsnytorv",        "Kongens Nytorv",        "1", 535, 492, 55.6806, 12.5853],
  ["gammelstrand",     "Gammel Strand",         "1", 505, 512, 55.6786, 12.5790],
  ["raadhuspladsen",   "Rådhuspladsen",         "1", 478, 520, 55.6759, 12.5700],
  ["koebenhavnh",      "København H",           "1", 452, 540, 55.6727, 12.5655],
  ["vesterport",       "Vesterport",            "1", 438, 500, 55.6781, 12.5586],
  ["forum",           "Forum",                 "1", 442, 462, 55.6810, 12.5536],
  ["nuuksplads",       "Nuuks Plads",           "1", 432, 428, 55.6870, 12.5462],
  ["frederiksberg",    "Frederiksberg",         "1", 408, 470, 55.6814, 12.5330],
  ["akselmollers",     "Aksel Møllers Have",    "1", 405, 440, 55.6868, 12.5330],
  ["fballe",           "Frederiksberg Allé",    "1", 425, 535, 55.6724, 12.5447],
  ["enghaveplads",     "Enghave Plads",         "1", 430, 555, 55.6690, 12.5457],
  ["enghavebrygge",    "Enghave Brygge",        "1", 462, 568, 55.6613, 12.5565],
  ["christianshavn",   "Christianshavn",        "1", 556, 532, 55.6725, 12.5906],
  ["nyhavn",           "Nyhavn",                "1", 552, 500, 55.6796, 12.5897],
  ["diamanten",        "Den Sorte Diamant",     "1", 518, 530, 55.6727, 12.5820],
  ["nordretoldbod",    "Nordre Toldbod",        "1", 572, 450, 55.6898, 12.5975],
  ["refshaleoen",      "Refshaleøen",           "1", 618, 487, 55.6908, 12.6102],
  ["trianglen",        "Trianglen",             "1", 560, 400, 55.6957, 12.5760],
  ["vibenshus",        "Vibenshus Runddel",     "1", 512, 382, 55.7013, 12.5636],
  ["skjoldsplads",     "Skjolds Plads",         "1", 470, 390, 55.7018, 12.5494],
  ["islandsbrygge",    "Islands Brygge",        "1", 528, 560, 55.6633, 12.5852],
  ["norrebro",         "Nørrebro",              "2", 425, 390, 55.7003, 12.5370],
  ["bispebjerg",       "Bispebjerg",            "2", 430, 340, 55.7114, 12.5368],
  ["fuglebakken",      "Fuglebakken",           "2", 392, 395, 55.6967, 12.5272],
  ["grondal",          "Grøndal",               "2", 372, 420, 55.6927, 12.5197],
  ["flintholm",        "Flintholm",             "2", 352, 455, 55.6845, 12.5110],
  ["lindevang",        "Lindevang",             "2", 358, 492, 55.6805, 12.5160],
  ["fasanvej",         "Fasanvej",              "2", 378, 492, 55.6821, 12.5248],
  ["kbhallen",         "KB Hallen",             "2", 340, 535, 55.6766, 12.5064],
  ["vanlose",          "Vanløse",               "2", 330, 440, 55.6877, 12.4955],
  ["ryparken",         "Ryparken",              "2", 502, 340, 55.7132, 12.5610],
  ["svanemollen",      "Svanemøllen",           "2", 556, 360, 55.7047, 12.5779],
  ["nordhavn",         "Nordhavn",              "2", 596, 398, 55.7108, 12.5894],
  ["orientkaj",        "Orientkaj",             "2", 612, 372, 55.7152, 12.5983],
  ["valby",           "Valby",                 "2", 392, 592, 55.6627, 12.5133],
  ["sydhavn",          "Sydhavn",               "2", 428, 598, 55.6552, 12.5365],
  ["teglholmen",       "Teglholmen",            "2", 448, 592, 55.6560, 12.5460],
  ["nyellebjerg",      "Ny Ellebjerg",          "2", 398, 622, 55.6540, 12.5130],
  ["drbyen",           "DR Byen",               "2", 548, 598, 55.6586, 12.5916],
  ["sundby",           "Sundby",                "2", 572, 578, 55.6553, 12.5990],
  ["hellerup",         "Hellerup",              "2", 600, 322, 55.7303, 12.5680],
  ["amagerbro",        "Amagerbro",             "3", 588, 548, 55.6630, 12.5990],
  ["lergravsparken",   "Lergravsparken",        "3", 618, 540, 55.6633, 12.6133],
  ["oresund",          "Øresund",               "3", 646, 548, 55.6617, 12.6244],
  ["amagerstrand",     "Amager Strand",         "3", 664, 522, 55.6640, 12.6350],
  ["femoren",          "Femøren",               "3", 676, 556, 55.6578, 12.6400],
  ["kastrup",          "Kastrup",               "3", 698, 592, 55.6500, 12.6440],
  ["taarnby",          "Tårnby",                "3", 662, 618, 55.6306, 12.5990],
  ["bellacenter",      "Bella Center",          "3", 580, 618, 55.6392, 12.5805],
  ["orestad",          "Ørestad",               "3", 570, 642, 55.6294, 12.5776],
  ["vestamager",       "Vestamager",            "3", 592, 672, 55.6177, 12.5770],
  ["gentofte",         "Gentofte",              "3", 618, 288, 55.7444, 12.5450],
  ["jaegersborg",      "Jægersborg",            "3", 604, 258, 55.7629, 12.5083],
  ["hvidovre",         "Hvidovre",              "3", 352, 646, 55.6413, 12.4752],
  ["friheden",         "Friheden",              "3", 330, 668, 55.6333, 12.4772],
  ["herlev",           "Herlev",                "3", 302, 398, 55.7230, 12.4420],
  ["husum",           "Husum",                 "3", 310, 425, 55.7066, 12.4733],
  ["islev",           "Islev",                 "3", 296, 442, 55.7085, 12.4544],
  ["rodovre",          "Rødovre",               "3", 338, 588, 55.6797, 12.4530],
  ["lufthavnen",       "Lufthavnen",            "4", 730, 648, 55.6281, 12.6500],
  ["lyngby",           "Lyngby",                "4", 588, 222, 55.7706, 12.5033],
  ["klampenborg",      "Klampenborg",           "3", 648, 252, 55.7700, 12.5900],
  ["holte",           "Holte",                 "4", 560, 180, 55.8139, 12.4714],
  ["glostrup",         "Glostrup",              "4", 282, 582, 55.6639, 12.4017],
  ["skovlunde",        "Skovlunde",             "4", 262, 400, 55.7137, 12.4040],
  ["ballerup",         "Ballerup",              "4", 240, 382, 55.7310, 12.3650],
  ["vallensbaek",      "Vallensbæk",            "4", 272, 690, 55.6300, 12.3890]
  ],

  /* mode: metro | stog | bus | regional | harbour */
  lines: [
  { id: "M1", name: "M1", mode: "metro", stops: ["vanlose","flintholm","lindevang","fasanvej","frederiksberg","forum","noerreport","kgsnytorv","christianshavn","islandsbrygge","drbyen","sundby","bellacenter","orestad","vestamager"] },
  { id: "M2", name: "M2", mode: "metro", stops: ["vanlose","flintholm","lindevang","fasanvej","frederiksberg","forum","noerreport","kgsnytorv","christianshavn","amagerbro","lergravsparken","oresund","amagerstrand","femoren","kastrup","lufthavnen"] },
  { id: "M3", name: "M3", mode: "metro", stops: ["koebenhavnh","raadhuspladsen","gammelstrand","kgsnytorv","marmorkirken","osterport","trianglen","vibenshus","skjoldsplads","norrebro","nuuksplads","akselmollers","frederiksberg","fballe","enghaveplads","koebenhavnh"] },
  { id: "M4", name: "M4", mode: "metro", stops: ["orientkaj","nordhavn","osterport","marmorkirken","kgsnytorv","gammelstrand","raadhuspladsen","koebenhavnh","enghavebrygge","sydhavn","nyellebjerg"] },
  { id: "A", name: "A", mode: "stog", stops: ["holte","lyngby","jaegersborg","gentofte","hellerup","svanemollen","osterport","noerreport","vesterport","koebenhavnh","valby","nyellebjerg","hvidovre","friheden","vallensbaek"] },
  { id: "B", name: "B", mode: "stog", stops: ["ballerup","skovlunde","herlev","husum","islev","vanlose","grondal","norrebro","noerreport","vesterport","koebenhavnh","valby","rodovre","glostrup"] },
  { id: "F", name: "F", mode: "stog", stops: ["hellerup","ryparken","bispebjerg","norrebro","fuglebakken","grondal","flintholm","kbhallen","nyellebjerg"] },
  { id: "H", name: "H", mode: "stog", stops: ["ballerup","skovlunde","herlev","husum","islev","vanlose","grondal","norrebro","noerreport","koebenhavnh"] },
  { id: "R1", name: "Øresund", mode: "regional", stops: ["lufthavnen","taarnby","orestad","koebenhavnh","noerreport","osterport","hellerup","klampenborg"] },
  { id: "R3", name: "Vest", mode: "regional", stops: ["koebenhavnh","valby","rodovre","glostrup"] },
  { id: "5C", name: "5C", mode: "bus", stops: ["herlev","husum","norrebro","noerreport","raadhuspladsen","koebenhavnh","islandsbrygge","sundby","kastrup","lufthavnen"] },
  { id: "1A", name: "1A", mode: "bus", stops: ["hellerup","svanemollen","trianglen","osterport","kgsnytorv","raadhuspladsen","fballe","frederiksberg","flintholm","vanlose"] },
  { id: "2A", name: "2A", mode: "bus", stops: ["norrebro","forum","noerreport","kgsnytorv","christianshavn","amagerbro","lergravsparken"] },
  { id: "9A", name: "9A", mode: "bus", stops: ["lufthavnen","kastrup","taarnby","orestad","bellacenter","drbyen","islandsbrygge","koebenhavnh","raadhuspladsen","noerreport"] },
  { id: "350S", name: "350S", mode: "bus", stops: ["ballerup","herlev","husum","norrebro","noerreport","osterport","nordhavn"] },
  { id: "991", name: "991", mode: "harbour", stops: ["refshaleoen","nordretoldbod","nyhavn","gammelstrand","diamanten","islandsbrygge","teglholmen"] }
  ],

  /* Extra halo centres carrying no stop; they only shape the zone blobs. */
  padding: {
  "1": [[500,480],[470,490],[520,520],[492,440],[540,470],[458,520],[505,545],[540,510],[492,408]],
  "2": [[460,360],[400,370],[358,402],[336,478],[344,562],[372,580],[420,620],[480,618],[520,618],[560,556],[592,440],[612,348],[580,330],[540,332],[500,312],[462,330],[332,500]],
  "3": [[640,580],[690,622],[620,652],[560,690],[600,300],[632,312],[328,418],[300,470],[330,622],[322,692],[360,620],[286,420]],
  "4": [[700,620],[752,672],[620,212],[600,192],[260,560],[300,602],[250,420],[280,370],[252,662],[292,662]]
  }
};
