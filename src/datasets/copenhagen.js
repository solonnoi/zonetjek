/* Zonetjek dataset — the DOT fare zones of the Copenhagen metropolitan area.
   =========================================================================
   GENERATED FROM OPEN DATA — do not hand-edit; run tools/build-dataset.py.
   Zone numbers, names and boundaries are Movia's published "Takstzoner"
   layer (the 211 DOT zones east of Storebælt). Stop names, coordinates and
   line routings are the Rejseplanen GTFS feed of 19 October 2026. A stop's zone
   is the zone whose polygon its coordinates fall inside.

   Not data: the schematic x/y, which is the real position projected into the
   map's box, and `padding`, which samples each zone polygon so the halo blobs
   follow the real zone shape. Neither touches a fare.
   =========================================================================

   Coverage: the metro, the S-tog, the two regional services through town, the
   harbour buses and fourteen bus lines, each cut where it leaves the 15
   zones below. Zone adjacency is derived from consecutive stops, so a line the
   dataset leaves out is a boundary the app does not know about — the Ring 3
   light rail is absent (a sixth mode), and reach in the outer zones is only as
   wide as the lines listed here.

   Rules a dataset must satisfy:
     - every stop's zone exists in `zones`
     - every id in a line's `stops` exists in `stops`
     - every stop is served by at least one line
     - consecutive stops on a line are in the same or a touching zone — a line
       that skips over a zone invents an adjacency that does not exist, and
       zone adjacency is derived from exactly these steps
     - `ring` orders the colour ramp outwards from the central zone

   Two services run through a zone without calling there, which would invent
   exactly that kind of adjacency; per the rule above each is given a stop at a
   station it passes: the RE at Svanemøllen (zone 2) between Østerport and
   Hellerup, and at Brøndbyøster (zone 32) between Glostrup and Valby. */

const DATASET_COPENHAGEN = {
  id: "copenhagen",
  name: { en: "Copenhagen", da: "København" },

  /* Ticket sizes this dataset can meaningfully sell. 2 is DOT's smallest;
     7 zones is the longest trip it can price (ishoej -> naerum). */
  ticket: { min: 2, max: 7 },

  /* Opening state. */
  home: "noerreport",

  /* Halo radius, in schematic units, that merges stops into zone blobs:
     1.15 km at this dataset's scale. */
  haloRadius: 30,

  /* ring 0 is the centre; the colour ramp lightens outwards. ring counts zone
     boundaries from zone 1 on the derived graph.
     neighbours are NOT listed here — they are derived from `lines`. */
  zones: {
    "1": { ring: 0 },    /* København, City */
    "2": { ring: 1 },    /* Valby, Vanløse, Nørrebro, Rypark */
    "3": { ring: 1 },    /* Ørestaden og Sundbyerne */
    "4": { ring: 2 },    /* Lufthavnen, Tårnby og Dragør */
    "30": { ring: 2 },   /* Hellerup og Gentofte */
    "31": { ring: 2 },   /* Buddinge, Gladsaxe og Herlev */
    "32": { ring: 2 },   /* Brøndbyøster og Rødovre */
    "33": { ring: 2 },   /* Avedøre og Friheden */
    "40": { ring: 3 },   /* Klampenborg */
    "41": { ring: 3 },   /* Lyngby, Bagsværd og Hareskov */
    "42": { ring: 3 },   /* Ballerup og Skovlunde */
    "43": { ring: 3 },   /* Glostrup */
    "44": { ring: 3 },   /* Brøndby Strand og Vallensbæk */
    "51": { ring: 4 },   /* Lyngby, Virum og Holte */
    "55": { ring: 4 },   /* Hundige og Ishøj */
  },

  /* id, name, zone, x, y, lat, lon
     x/y are the real position projected into the map's box; the map is
     schematic, so it carries no scale bar.
     lat/lon are the GTFS station coordinates, used to find a nearest stop. */
  stops: [
  ["amagerbro",                               "Amagerbro",                                "1",     636.3, 569.3, 55.6633, 12.6029],
  ["bryggebroen",                             "Bryggebroen",                              "1",     581.2, 573.4, 55.6619, 12.5689],
  ["carlsberg",                               "Carlsberg",                                "1",     530.1, 569.5, 55.6633, 12.5374],
  ["christianshavn",                          "Christianshavn",                           "1",     617.6, 544.4, 55.6721, 12.5914],
  ["dr-byen",                                 "DR Byen",                                  "1",     613.7, 590.8, 55.6558, 12.5890],
  ["det-biovidenskabelige-fakultet",          "Det Biovidenskabelige Fakultet",           "1",     543.1, 511.1, 55.6837, 12.5454],
  ["det-kongelige-bibliotek",                 "Det Kongelige Bibliotek",                  "1",     600.3, 544.0, 55.6722, 12.5807],
  ["dybboelsbro",                             "Dybbølsbro",                               "1",     566.0, 565.0, 55.6648, 12.5595],
  ["enghave-brygge",                          "Enghave Brygge",                           "1",     564.2, 594.8, 55.6544, 12.5584],
  ["enghave-plads",                           "Enghave Plads",                            "1",     543.8, 558.0, 55.6673, 12.5458],
  ["forum",                                   "Forum",                                    "1",     554.5, 516.5, 55.6818, 12.5524],
  ["frederiksberg-alle",                      "Frederiksberg Allé",                       "1",     535.0, 539.6, 55.6737, 12.5404],
  ["gammel-strand",                           "Gammel Strand",                            "1",     598.5, 528.2, 55.6777, 12.5796],
  ["havneholmen",                             "Havneholmen",                              "1",     565.8, 576.2, 55.6609, 12.5594],
  ["islands-brygge",                          "Islands Brygge",                           "1",     607.6, 569.1, 55.6634, 12.5852],
  ["islands-brygge-syd",                      "Islands Brygge Syd",                       "1",     573.5, 590.4, 55.6560, 12.5641],
  ["knippelsbro",                             "Knippelsbro",                              "1",     610.5, 538.3, 55.6742, 12.5870],
  ["kongens-nytorv",                          "Kongens Nytorv",                           "1",     607.6, 524.1, 55.6792, 12.5852],
  ["koebenhavn-h",                            "København H",                              "1",     574.6, 543.2, 55.6725, 12.5648],
  ["lergravsparken",                          "Lergravsparken",                           "1",     658.1, 572.8, 55.6621, 12.6164],
  ["marmorkirken",                            "Marmorkirken",                             "1",     613.1, 506.8, 55.6852, 12.5886],
  ["nordhavn",                                "Nordhavn",                                 "1",     617.3, 446.2, 55.7065, 12.5912],
  ["nordre-toldbod",                          "Nordre Toldbod",                           "1",     630.9, 498.4, 55.6882, 12.5996],
  ["nyhavn",                                  "Nyhavn",                                   "1",     622.3, 524.2, 55.6791, 12.5943],
  ["noerreport",                              "Nørreport",                                "1",     585.3, 511.3, 55.6836, 12.5714],
  ["oceankaj",                                "Oceankaj",                                 "1",     660.9, 423.7, 55.7144, 12.6181],
  ["operaen",                                 "Operaen",                                  "1",     629.9, 516.8, 55.6817, 12.5990],
  ["orientkaj",                               "Orientkaj",                                "1",     624.5, 431.4, 55.7117, 12.5956],
  ["refshaleoeen",                            "Refshaleøen",                              "1",     642.5, 490.2, 55.6911, 12.6068],
  ["raadhuspladsen",                          "Rådhuspladsen",                            "1",     581.0, 532.1, 55.6764, 12.5688],
  ["sjaeloer-boulevard-vigerslev-alle",       "Sjælør Boulevard (Vigerslev Allé)",        "1",     510.3, 571.4, 55.6626, 12.5251],
  ["teglholmen",                              "Teglholmen",                               "1",     552.7, 613.3, 55.6479, 12.5513],
  ["trianglen",                               "Trianglen",                                "1",     592.8, 467.1, 55.6991, 12.5761],
  ["universitetsparken",                      "Universitetsparken",                       "1",     570.1, 464.2, 55.7002, 12.5620],
  ["vesterport",                              "Vesterport",                               "1",     570.2, 533.1, 55.6760, 12.5621],
  ["oeresundsvej-amagerbrogade",              "Øresundsvej (Amagerbrogade)",              "1",     644.6, 584.7, 55.6579, 12.6080],
  ["oesterport",                              "Østerport",                                "1",     609.8, 485.0, 55.6929, 12.5866],
  ["aksel-moellers-have",                     "Aksel Møllers Have",                       "2",     523.4, 503.5, 55.6864, 12.5332],
  ["bispebjerg",                              "Bispebjerg",                               "2",     537.0, 446.5, 55.7063, 12.5416],
  ["damhustorvet",                            "Damhustorvet",                             "2",     429.4, 542.6, 55.6727, 12.4752],
  ["danshoej",                                "Danshøj",                                  "2",     459.5, 566.6, 55.6643, 12.4937],
  ["emdrup",                                  "Emdrup",                                   "2",     535.5, 405.0, 55.7209, 12.5407],
  ["fasanvej",                                "Fasanvej",                                 "2",     507.0, 517.0, 55.6817, 12.5231],
  ["flintholm",                               "Flintholm",                                "2",     468.1, 505.6, 55.6857, 12.4991],
  ["frederiksberg",                           "Frederiksberg",                            "2",     521.0, 518.3, 55.6812, 12.5317],
  ["fuglebakken",                             "Fuglebakken",                              "2",     514.0, 477.7, 55.6954, 12.5274],
  ["gladsaxevej-frederiksborgvej",            "Gladsaxevej (Frederiksborgvej)",           "2",     510.5, 387.9, 55.7269, 12.5253],
  ["groendal",                                "Grøndal",                                  "2",     495.5, 491.1, 55.6907, 12.5160],
  ["hilleroedmotorvejen-tingbjerg",           "Hillerødmotorvejen, Tingbjerg",            "2",     449.9, 395.3, 55.7243, 12.4878],
  ["husum",                                   "Husum",                                    "2",     411.4, 437.8, 55.7094, 12.4640],
  ["hvidovregade",                            "Hvidovregade",                             "2",     436.2, 600.1, 55.6526, 12.4794],
  ["islev",                                   "Islev",                                    "2",     420.0, 466.0, 55.6995, 12.4694],
  ["jyllingevej",                             "Jyllingevej",                              "2",     432.7, 490.9, 55.6908, 12.4772],
  ["kb-hallen",                               "KB Hallen",                                "2",     457.2, 527.6, 55.6780, 12.4923],
  ["koebenhavn-syd",                          "København Syd",                            "2",     496.6, 600.0, 55.6526, 12.5166],
  ["langgade",                                "Langgade",                                 "2",     476.5, 558.7, 55.6671, 12.5042],
  ["lindevang",                               "Lindevang",                                "2",     490.5, 511.8, 55.6835, 12.5129],
  ["mozarts-plads",                           "Mozarts Plads",                            "2",     524.6, 610.1, 55.6490, 12.5340],
  ["nuuks-plads",                             "Nuuks Plads",                              "2",     539.1, 496.6, 55.6888, 12.5429],
  ["noerrebro",                               "Nørrebro",                                 "2",     531.1, 462.7, 55.7007, 12.5379],
  ["noerrebros-runddel",                      "Nørrebros Runddel",                        "2",     548.8, 481.9, 55.6939, 12.5489],
  ["peter-bangs-vej",                         "Peter Bangs Vej",                          "2",     475.2, 525.8, 55.6786, 12.5034],
  ["poul-henningsens-plads",                  "Poul Henningsens Plads",                   "2",     593.8, 438.3, 55.7092, 12.5767],
  ["ryparken",                                "Ryparken",                                 "2",     566.0, 420.8, 55.7154, 12.5595],
  ["sjaeloer",                                "Sjælør",                                   "2",     513.8, 602.4, 55.6517, 12.5273],
  ["skjolds-plads",                           "Skjolds Plads",                            "2",     547.7, 455.3, 55.7033, 12.5482],
  ["slotsherrensvej-taarnvej-2",              "Slotsherrensvej (Tårnvej)",                "2",     392.7, 459.3, 55.7019, 12.4525],
  ["sluseholmen",                             "Sluseholmen",                              "2",     540.5, 619.3, 55.6458, 12.5437],
  ["svanemoellen",                            "Svanemøllen",                              "2",     596.0, 420.3, 55.7156, 12.5780],
  ["sydhavn",                                 "Sydhavn",                                  "2",     529.8, 593.8, 55.6548, 12.5372],
  ["tingbjerg-gavlhusvej",                    "Tingbjerg, Gavlhusvej",                    "2",     453.5, 404.6, 55.7211, 12.4900],
  ["tuborgvej-lyngbyvej",                     "Tuborgvej (Lyngbyvej)",                    "2",     552.2, 388.2, 55.7268, 12.5510],
  ["valby",                                   "Valby",                                    "2",     493.0, 567.4, 55.6640, 12.5145],
  ["vanloese",                                "Vanløse",                                  "2",     455.3, 500.8, 55.6873, 12.4911],
  ["vibenshus-runddel",                       "Vibenshus Runddel",                        "2",     573.3, 446.7, 55.7063, 12.5640],
  ["vigerslev-alle",                          "Vigerslev Alle",                           "2",     467.5, 579.1, 55.6599, 12.4987],
  ["aalholm",                                 "Ålholm",                                   "2",     458.5, 543.6, 55.6723, 12.4931],
  ["aamarken",                                "Åmarken",                                  "2",     469.1, 635.7, 55.6401, 12.4997],
  ["amager-strand",                           "Amager Strand",                            "3",     682.7, 588.8, 55.6565, 12.6316],
  ["bella-center",                            "Bella Center",                             "3",     603.9, 641.5, 55.6381, 12.5829],
  ["femoeren",                                "Femøren",                                  "3",     693.6, 620.6, 55.6453, 12.6383],
  ["sundby",                                  "Sundby",                                   "3",     608.4, 621.1, 55.6452, 12.5857],
  ["sundbyvester-plads-amagerbrogade",        "Sundbyvester Plads (Amagerbrogade)",       "3",     654.7, 617.9, 55.6463, 12.6143],
  ["vestamager",                              "Vestamager",                               "3",     591.5, 694.7, 55.6194, 12.5753],
  ["willumsvej",                              "Willumsvej",                               "3",     659.6, 635.4, 55.6402, 12.6173],
  ["oerestad",                                "Ørestad",                                  "3",     597.7, 668.0, 55.6287, 12.5791],
  ["oeresund",                                "Øresund",                                  "3",     677.6, 574.0, 55.6617, 12.6285],
  ["oeresundsvej-kastrupvej",                 "Øresundsvej (Kastrupvej)",                 "3",     654.8, 578.7, 55.6600, 12.6143],
  ["dragoer-stationsplads",                   "Dragør Stationsplads",                     "4",     743.7, 763.5, 55.5953, 12.6693],
  ["kastrup",                                 "Kastrup",                                  "4",     707.2, 648.1, 55.6357, 12.6467],
  ["korsvejens-skole-taarnbyvej",             "Korsvejens Skole (Tårnbyvej)",             "4",     661.8, 649.4, 55.6353, 12.6187],
  ["koebenhavns-lufthavn",                    "Københavns Lufthavn",                      "4",     711.3, 665.1, 55.6298, 12.6493],
  ["taarnby",                                 "Tårnby",                                   "4",     634.9, 664.9, 55.6299, 12.6021],
  ["bernstorffsvej",                          "Bernstorffsvej",                           "30",    562.7, 341.8, 55.7431, 12.5575],
  ["brogaardsvej-ermelundsvej",               "Brogårdsvej (Ermelundsvej)",               "30",    525.5, 307.8, 55.7550, 12.5345],
  ["brogaardsvej-lyngbyvej",                  "Brogårdsvej (Lyngbyvej)",                  "30",    507.2, 315.8, 55.7522, 12.5232],
  ["callisensvej",                            "Callisensvej",                             "30",    593.6, 379.4, 55.7299, 12.5766],
  ["charlottenlund",                          "Charlottenlund",                           "30",    586.4, 316.7, 55.7519, 12.5721],
  ["gentofte",                                "Gentofte",                                 "30",    537.0, 311.9, 55.7535, 12.5416],
  ["hellerup",                                "Hellerup",                                 "30",    579.2, 376.1, 55.7310, 12.5677],
  ["buddinge",                                "Buddinge",                                 "31",    460.0, 329.4, 55.7474, 12.4940],
  ["dyssegaard",                              "Dyssegård",                                "31",    527.5, 371.5, 55.7326, 12.5357],
  ["elverhoejen",                             "Elverhøjen",                               "31",    385.9, 406.0, 55.7206, 12.4483],
  ["gladsaxe-trafikplads-gladsaxe-moellevej", "Gladsaxe Trafikplads (Gladsaxe Møllevej)", "31",    428.8, 357.7, 55.7375, 12.4748],
  ["gladsaxe-trafikplads-terminalen",         "Gladsaxe Trafikplads, Terminalen",         "31",    428.1, 359.9, 55.7367, 12.4744],
  ["gladsaxevej-soeborg-hovedgade",           "Gladsaxevej (Søborg Hovedgade)",           "31",    509.3, 384.5, 55.7281, 12.5245],
  ["herlev",                                  "Herlev",                                   "31",    378.4, 410.7, 55.7189, 12.4437],
  ["herlev-hospital",                         "Herlev Hospital",                          "31",    383.0, 379.2, 55.7299, 12.4465],
  ["kildebakke",                              "Kildebakke",                               "31",    483.4, 337.3, 55.7446, 12.5085],
  ["noerre-gymnasium",                        "Nørre Gymnasium",                          "31",    421.4, 413.4, 55.7179, 12.4702],
  ["roedovre-nord",                           "Rødovre Nord",                             "31",    353.1, 448.3, 55.7057, 12.4280],
  ["vangede",                                 "Vangede",                                  "31",    507.4, 351.5, 55.7397, 12.5233],
  ["broendbyoester",                          "Brøndbyøster",                             "32",    372.8, 564.4, 55.6651, 12.4402],
  ["hvidovre",                                "Hvidovre",                                 "32",    428.1, 566.0, 55.6645, 12.4743],
  ["park-alle",                               "Park Allé",                                "32",    395.8, 583.2, 55.6585, 12.4544],
  ["roedovre",                                "Rødovre",                                  "32",    402.6, 565.1, 55.6648, 12.4586],
  ["slotsherrensvej-taarnvej",                "Slotsherrensvej (Tårnvej)",                "32",    390.5, 462.4, 55.7008, 12.4511],
  ["avedoere",                                "Avedøre",                                  "33",    395.5, 678.2, 55.6252, 12.4543],
  ["avedoereholmen-stamholmen",               "Avedøreholmen (Stamholmen)",               "33",    418.8, 709.0, 55.6144, 12.4686],
  ["cph-business-park-avedoere-havnevej",     "CPH Business Park (Avedøre Havnevej)",     "33",    430.1, 706.8, 55.6152, 12.4756],
  ["friheden",                                "Friheden",                                 "33",    441.4, 667.6, 55.6289, 12.4826],
  ["hvidovregaards-alle",                     "Hvidovregårds Allé",                       "33",    463.2, 642.1, 55.6378, 12.4960],
  ["klampenborg",                             "Klampenborg",                              "40",    611.7, 243.6, 55.7774, 12.5877],
  ["lille-fredensvej",                        "Lille Fredensvej",                         "40",    590.1, 308.0, 55.7549, 12.5744],
  ["ordrup",                                  "Ordrup",                                   "40",    605.1, 284.6, 55.7631, 12.5836],
  ["ridebanevang",                            "Ridebanevang",                             "40",    519.0, 286.3, 55.7625, 12.5305],
  ["skovshoved-strandvejen",                  "Skovshoved, Strandvejen",                  "40",    625.7, 284.7, 55.7631, 12.5964],
  ["bagsvaerd",                               "Bagsværd",                                 "41",    394.4, 288.1, 55.7619, 12.4536],
  ["gladsaxe-kirke-gladsaxe-moellevej",       "Gladsaxe Kirke (Gladsaxe Møllevej)",       "41",    425.2, 347.6, 55.7410, 12.4726],
  ["hareskov",                                "Hareskov",                                 "41",    317.4, 276.2, 55.7660, 12.4060],
  ["jaegersborg",                             "Jægersborg",                               "41",    504.5, 288.8, 55.7616, 12.5216],
  ["klampenborgvej",                          "Klampenborgvej",                           "41",    508.1, 250.3, 55.7751, 12.5238],
  ["lyngby",                                  "Lyngby",                                   "41",    474.6, 270.3, 55.7681, 12.5031],
  ["skovbrynet",                              "Skovbrynet",                               "41",    359.6, 278.6, 55.7652, 12.4320],
  ["stengaarden",                             "Stengården",                               "41",    426.2, 303.3, 55.7565, 12.4732],
  ["ballerup",                                "Ballerup",                                 "42",    240.2, 379.4, 55.7299, 12.3583],
  ["malmparken",                              "Malmparken",                               "42",    285.1, 394.4, 55.7246, 12.3860],
  ["marielundvej",                            "Marielundvej",                             "42",    352.2, 393.0, 55.7251, 12.4275],
  ["ring-4-nordbuen",                         "Ring 4 (Nordbuen)",                        "42",    287.0, 339.8, 55.7438, 12.3872],
  ["skovlunde",                               "Skovlunde",                                "42",    313.4, 399.7, 55.7228, 12.4035],
  ["skovvejens-skole-vest-skovvej",           "Skovvejens skole - vest (Skovvej)",        "42",    254.4, 343.9, 55.7423, 12.3671],
  ["sydbuen",                                 "Sydbuen",                                  "42",    243.8, 430.5, 55.7120, 12.3605],
  ["albertslund",                             "Albertslund",                              "43",    231.8, 584.4, 55.6580, 12.3531],
  ["broendby-hallen",                         "Brøndby Hallen",                           "43",    331.9, 617.1, 55.6466, 12.4150],
  ["glostrup",                                "Glostrup",                                 "43",    304.2, 569.8, 55.6631, 12.3978],
  ["broendby-strand",                         "Brøndby Strand",                           "44",    344.4, 690.3, 55.6209, 12.4227],
  ["fyrmestervej",                            "Fyrmestervej",                             "44",    356.8, 699.3, 55.6178, 12.4303],
  ["holte",                                   "Holte",                                    "51",    419.1, 157.3, 55.8077, 12.4688],
  ["naerum",                                  "Nærum",                                    "51",    516.3, 140.7, 55.8135, 12.5288],
  ["sorgenfri",                               "Sorgenfri",                                "51",    443.0, 232.7, 55.7813, 12.4835],
  ["virum",                                   "Virum",                                    "51",    426.5, 191.8, 55.7956, 12.4733],
  ["ishoej",                                  "Ishøj",                                    "55",    239.6, 711.9, 55.6134, 12.3579],
  ["vallensbaek",                             "Vallensbæk",                               "55",    289.0, 683.7, 55.6233, 12.3884]
  ],

  /* mode: metro | stog | bus | regional | harbour */
  lines: [
  { id: "M1", name: "M1", mode: "metro", stops: ["vanloese","flintholm","lindevang","fasanvej","frederiksberg","forum","noerreport","kongens-nytorv","christianshavn","islands-brygge","dr-byen","sundby","bella-center","oerestad","vestamager"] },
  { id: "M2", name: "M2", mode: "metro", stops: ["vanloese","flintholm","lindevang","fasanvej","frederiksberg","forum","noerreport","kongens-nytorv","christianshavn","amagerbro","lergravsparken","oeresund","amager-strand","femoeren","kastrup","koebenhavns-lufthavn"] },
  { id: "M3", name: "M3", mode: "metro", stops: ["koebenhavn-h","raadhuspladsen","gammel-strand","kongens-nytorv","marmorkirken","oesterport","trianglen","poul-henningsens-plads","vibenshus-runddel","skjolds-plads","noerrebro","noerrebros-runddel","nuuks-plads","aksel-moellers-have","frederiksberg","frederiksberg-alle","enghave-plads","koebenhavn-h"] },
  { id: "M4", name: "M4", mode: "metro", stops: ["koebenhavn-syd","mozarts-plads","sluseholmen","enghave-brygge","havneholmen","koebenhavn-h","raadhuspladsen","gammel-strand","kongens-nytorv","marmorkirken","oesterport","nordhavn","orientkaj"] },
  { id: "A", name: "A", mode: "stog", stops: ["ishoej","vallensbaek","broendby-strand","avedoere","friheden","aamarken","koebenhavn-syd","sjaeloer","sydhavn","dybboelsbro","koebenhavn-h","vesterport","noerreport","oesterport","nordhavn","svanemoellen","hellerup","bernstorffsvej","gentofte","jaegersborg","lyngby","sorgenfri","virum","holte"] },
  { id: "B", name: "B", mode: "stog", stops: ["hareskov","skovbrynet","bagsvaerd","stengaarden","buddinge","kildebakke","vangede","dyssegaard","emdrup","ryparken","svanemoellen","nordhavn","oesterport","noerreport","vesterport","koebenhavn-h","dybboelsbro","carlsberg","valby","danshoej","hvidovre","roedovre","broendbyoester","glostrup","albertslund"] },
  { id: "C", name: "C", mode: "stog", stops: ["klampenborg","ordrup","charlottenlund","hellerup","svanemoellen","nordhavn","oesterport","noerreport","vesterport","koebenhavn-h","dybboelsbro","carlsberg","valby","langgade","peter-bangs-vej","flintholm","vanloese","jyllingevej","islev","husum","herlev","skovlunde","malmparken","ballerup"] },
  { id: "E", name: "E", mode: "stog", stops: ["holte","virum","sorgenfri","lyngby","jaegersborg","gentofte","bernstorffsvej","hellerup","svanemoellen","nordhavn","oesterport","noerreport","vesterport","koebenhavn-h","dybboelsbro","sydhavn","sjaeloer","koebenhavn-syd","aamarken","friheden","avedoere","broendby-strand","vallensbaek","ishoej"] },
  { id: "F", name: "F", mode: "stog", stops: ["klampenborg","ordrup","charlottenlund","hellerup","ryparken","bispebjerg","noerrebro","fuglebakken","groendal","flintholm","kb-hallen","aalholm","danshoej","vigerslev-alle","koebenhavn-syd"] },
  { id: "H", name: "H", mode: "stog", stops: ["ballerup","malmparken","skovlunde","herlev","husum","islev","jyllingevej","vanloese","flintholm","peter-bangs-vej","langgade","valby","carlsberg","dybboelsbro","koebenhavn-h","vesterport","noerreport","oesterport"] },
  { id: "RE", name: "RE", mode: "regional", stops: ["glostrup","broendbyoester","valby","koebenhavn-h","noerreport","oesterport","svanemoellen","hellerup","klampenborg"] },
  { id: "OR", name: "Øresund", mode: "regional", stops: ["oesterport","noerreport","koebenhavn-h","oerestad","taarnby","koebenhavns-lufthavn"] },
  { id: "1A", name: "1A", mode: "bus", stops: ["avedoere","hvidovregade","koebenhavn-syd","sjaeloer","sjaeloer-boulevard-vigerslev-alle","carlsberg","enghave-plads","frederiksberg-alle","forum","trianglen","poul-henningsens-plads","svanemoellen","callisensvej","hellerup"] },
  { id: "2A", name: "2A", mode: "bus", stops: ["tingbjerg-gavlhusvej","groendal","aksel-moellers-have","det-biovidenskabelige-fakultet","forum","raadhuspladsen","koebenhavn-h","gammel-strand","knippelsbro","christianshavn","refshaleoeen"] },
  { id: "4A", name: "4A", mode: "bus", stops: ["buddinge","gladsaxevej-frederiksborgvej","noerrebro","fasanvej","valby","koebenhavn-syd","aamarken","hvidovregaards-alle","friheden"] },
  { id: "5C", name: "5C", mode: "bus", stops: ["koebenhavns-lufthavn","willumsvej","oeresundsvej-amagerbrogade","amagerbro","koebenhavn-h","raadhuspladsen","noerreport","noerrebros-runddel","noerrebro","elverhoejen","herlev-hospital"] },
  { id: "6A", name: "6A", mode: "bus", stops: ["noerreport","skjolds-plads","bispebjerg","gladsaxevej-soeborg-hovedgade","buddinge"] },
  { id: "7A", name: "7A", mode: "bus", stops: ["roedovre-nord","slotsherrensvej-taarnvej","damhustorvet","aalholm","frederiksberg-alle","koebenhavn-h"] },
  { id: "8A", name: "8A", mode: "bus", stops: ["lergravsparken","oeresundsvej-kastrupvej","bella-center","sluseholmen","mozarts-plads","sjaeloer","valby"] },
  { id: "150S", name: "150S", mode: "bus", stops: ["naerum","klampenborgvej","brogaardsvej-lyngbyvej","tuborgvej-lyngbyvej","ryparken","vibenshus-runddel","universitetsparken","noerreport"] },
  { id: "164", name: "164", mode: "bus", stops: ["oceankaj","orientkaj","svanemoellen","callisensvej","hellerup","bernstorffsvej","vangede","gladsaxe-kirke-gladsaxe-moellevej","ring-4-nordbuen","ballerup"] },
  { id: "179", name: "179", mode: "bus", stops: ["lyngby","jaegersborg","ridebanevang","brogaardsvej-ermelundsvej","gentofte","bernstorffsvej","charlottenlund","lille-fredensvej","skovshoved-strandvejen"] },
  { id: "200S", name: "200S", mode: "bus", stops: ["avedoereholmen-stamholmen","friheden","park-alle","roedovre","slotsherrensvej-taarnvej-2","husum","noerre-gymnasium","gladsaxe-trafikplads-terminalen"] },
  { id: "250S", name: "250S", mode: "bus", stops: ["bagsvaerd","gladsaxe-trafikplads-gladsaxe-moellevej","hilleroedmotorvejen-tingbjerg","noerrebro","nuuks-plads","forum","raadhuspladsen","koebenhavn-h","amagerbro","sundbyvester-plads-amagerbrogade","korsvejens-skole-taarnbyvej","taarnby","dragoer-stationsplads"] },
  { id: "350S", name: "350S", mode: "bus", stops: ["noerreport","noerrebros-runddel","noerrebro","elverhoejen","marielundvej","malmparken","ballerup"] },
  { id: "500S", name: "500S", mode: "bus", stops: ["cph-business-park-avedoere-havnevej","fyrmestervej","broendby-strand","broendby-hallen","glostrup","sydbuen","ballerup","skovvejens-skole-vest-skovvej"] },
  { id: "991", name: "991", mode: "harbour", stops: ["orientkaj","refshaleoeen","nordre-toldbod","operaen","nyhavn","knippelsbro","det-kongelige-bibliotek","bryggebroen","islands-brygge-syd","enghave-brygge","teglholmen"] },
  { id: "992", name: "992", mode: "harbour", stops: ["teglholmen","enghave-brygge","islands-brygge-syd","bryggebroen","det-kongelige-bibliotek","knippelsbro","nyhavn","operaen","nordre-toldbod","refshaleoeen","orientkaj"] }
  ],

  /* Extra halo centres carrying no stop; they only shape the zone blobs.
     Sampled from each zone's real polygon. */
  padding: {
  "1": [[652.1,401.6],[674.1,401.6],[696,401.6],[586.3,445.5],[630.2,467.4],[564.4,489.4],[586.3,489.4],[652.1,511.3],[674.1,511.3],[652.1,533.2],[674.1,533.2],[696,533.2],[586.3,555.2],[652.1,555.2],[674.1,555.2],[696,555.2],[542.4,599.1]],
  "2": [[531.2,377.3],[575,399.3],[597,399.3],[421.5,421.2],[443.4,421.2],[465.3,421.2],[487.3,421.2],[509.2,421.2],[531.2,421.2],[443.4,443.2],[465.3,443.2],[487.3,443.2],[509.2,443.2],[443.4,465.1],[465.3,465.1],[487.3,465.1],[465.3,487],[443.4,552.9],[509.2,552.9],[443.4,574.8],[509.2,574.8],[465.3,596.7],[465.3,618.7],[487.3,618.7],[509.2,618.7],[487.3,640.6],[509.2,640.6],[531.2,640.6],[487.3,662.6],[509.2,662.6],[531.2,662.6],[465.3,684.5],[487.3,684.5],[509.2,684.5],[465.3,706.5],[487.3,706.5],[509.2,706.5]],
  "3": [[624.6,595.2],[646.6,595.2],[558.8,617.1],[580.7,617.1],[624.6,617.1],[536.9,639.1],[558.8,639.1],[580.7,639.1],[624.6,639.1],[536.9,661],[558.8,661],[580.7,661],[536.9,683],[558.8,683],[514.9,704.9],[536.9,704.9],[558.8,704.9],[493,726.8],[514.9,726.8],[536.9,726.8],[493,748.8]],
  "4": [[672.3,628.1],[694.2,628.1],[650.4,672],[672.3,672],[694.2,672],[738.1,672],[760.1,672],[606.5,693.9],[628.4,693.9],[650.4,693.9],[672.3,693.9],[694.2,693.9],[716.2,693.9],[738.1,693.9],[760.1,693.9],[562.6,715.9],[584.5,715.9],[606.5,715.9],[628.4,715.9],[650.4,715.9],[672.3,715.9],[694.2,715.9],[716.2,715.9],[738.1,715.9],[760.1,715.9],[518.7,737.8],[540.7,737.8],[562.6,737.8],[584.5,737.8],[606.5,737.8],[628.4,737.8],[650.4,737.8],[672.3,737.8],[694.2,737.8],[716.2,737.8],[738.1,737.8],[496.8,759.8],[518.7,759.8],[540.7,759.8],[562.6,759.8],[584.5,759.8],[606.5,759.8],[628.4,759.8],[650.4,759.8],[672.3,759.8],[694.2,759.8],[716.2,759.8],[496.8,781.7],[518.7,781.7],[540.7,781.7],[562.6,781.7],[584.5,781.7],[606.5,781.7],[628.4,781.7],[650.4,781.7],[672.3,781.7],[694.2,781.7],[716.2,781.7],[738.1,781.7],[760.1,781.7],[518.7,803.6],[540.7,803.6],[562.6,803.6],[584.5,803.6],[606.5,803.6],[628.4,803.6],[650.4,803.6],[672.3,803.6],[694.2,803.6],[716.2,803.6],[540.7,825.6],[562.6,825.6],[584.5,825.6],[606.5,825.6],[628.4,825.6],[650.4,825.6],[672.3,825.6],[584.5,847.5],[606.5,847.5],[628.4,847.5],[650.4,847.5],[584.5,869.5],[606.5,869.5],[628.4,869.5]],
  "30": [[560.9,310.9],[517,332.9],[539,332.9],[582.9,332.9],[604.8,332.9],[517,354.8],[539,354.8],[582.9,354.8],[604.8,354.8],[560.9,376.7]],
  "31": [[484.2,316.4],[506.1,316.4],[440.3,338.3],[374.5,360.2],[396.4,360.2],[462.3,360.2],[484.2,360.2],[418.4,382.2],[440.3,382.2],[462.3,382.2],[484.2,382.2],[352.5,404.1],[484.2,404.1],[352.5,426.1],[330.6,448],[374.5,448],[330.6,469.9],[374.5,469.9]],
  "32": [[334.6,471.7],[356.5,471.7],[334.6,493.7],[356.5,493.7],[378.5,493.7],[400.4,493.7],[422.3,493.7],[356.5,515.6],[378.5,515.6],[400.4,515.6],[422.3,515.6],[356.5,537.5],[378.5,537.5],[400.4,537.5],[422.3,537.5],[334.6,559.5],[356.5,559.5],[356.5,581.4],[378.5,581.4],[422.3,581.4],[356.5,603.4],[378.5,603.4],[400.4,603.4]],
  "33": [[424.2,598.8],[358.4,620.7],[380.3,620.7],[402.3,620.7],[424.2,620.7],[446.2,620.7],[358.4,642.6],[380.3,642.6],[402.3,642.6],[424.2,642.6],[446.2,642.6],[380.3,664.6],[424.2,664.6],[468.1,664.6],[380.3,686.5],[424.2,686.5],[446.2,686.5],[380.3,708.5],[402.3,708.5],[380.3,730.4],[402.3,730.4],[424.2,730.4],[446.2,730.4]],
  "40": [[606.1,224.7],[540.2,246.6],[562.2,246.6],[584.1,246.6],[518.3,268.5],[540.2,268.5],[562.2,268.5],[584.1,268.5],[540.2,290.5],[562.2,290.5],[584.1,290.5],[606.1,312.4]],
  "41": [[342,277.2],[407.8,277.2],[429.8,277.2],[451.7,277.2],[276.2,299.1],[298.1,299.1],[320.1,299.1],[342,299.1],[364,299.1],[407.8,299.1],[451.7,299.1],[473.7,299.1],[517.5,299.1],[298.1,321.1],[320.1,321.1],[342,321.1],[364,321.1],[385.9,321.1],[407.8,321.1],[429.8,321.1],[451.7,321.1],[473.7,321.1],[320.1,343],[342,343],[364,343],[385.9,343],[407.8,343],[342,365]],
  "42": [[253.3,327.6],[275.2,327.6],[231.3,349.5],[209.4,371.4],[275.2,371.4],[297.2,371.4],[319.1,371.4],[209.4,393.4],[231.3,393.4],[253.3,393.4],[209.4,415.3],[231.3,415.3],[253.3,415.3],[275.2,415.3],[297.2,415.3],[319.1,415.3],[275.2,437.3],[297.2,437.3],[319.1,437.3],[275.2,459.2],[297.2,459.2],[319.1,459.2]],
  "43": [[220.9,437.6],[199,459.5],[220.9,459.5],[242.9,459.5],[264.8,459.5],[199,481.5],[220.9,481.5],[242.9,481.5],[264.8,481.5],[286.7,481.5],[308.7,481.5],[199,503.4],[220.9,503.4],[242.9,503.4],[264.8,503.4],[286.7,503.4],[308.7,503.4],[330.6,503.4],[199,525.3],[220.9,525.3],[242.9,525.3],[264.8,525.3],[286.7,525.3],[308.7,525.3],[330.6,525.3],[220.9,547.3],[242.9,547.3],[264.8,547.3],[286.7,547.3],[308.7,547.3],[330.6,547.3],[242.9,569.2],[264.8,569.2],[286.7,569.2],[330.6,569.2],[264.8,591.2],[286.7,591.2],[308.7,591.2],[330.6,591.2],[264.8,613.1],[286.7,613.1],[308.7,613.1]],
  "44": [[273,635.5],[295,635.5],[316.9,635.5],[338.9,635.5],[295,657.5],[316.9,657.5],[338.9,657.5],[295,679.4],[316.9,679.4],[360.8,679.4],[295,701.4],[316.9,701.4]],
  "51": [[413.8,141],[545.5,141],[348,162.9],[370,162.9],[391.9,162.9],[435.8,162.9],[457.7,162.9],[479.7,162.9],[501.6,162.9],[523.6,162.9],[545.5,162.9],[567.4,162.9],[370,184.9],[391.9,184.9],[457.7,184.9],[479.7,184.9],[501.6,184.9],[523.6,184.9],[545.5,184.9],[370,206.8],[391.9,206.8],[413.8,206.8],[435.8,206.8],[457.7,206.8],[479.7,206.8],[501.6,206.8],[523.6,206.8],[545.5,206.8],[391.9,228.7],[413.8,228.7],[479.7,228.7],[501.6,228.7],[523.6,228.7],[545.5,228.7],[391.9,250.7],[413.8,250.7],[435.8,250.7],[457.7,250.7],[479.7,250.7]],
  "55": [[199.7,635.5],[221.6,635.5],[243.6,635.5],[265.5,635.5],[155.8,657.5],[177.7,657.5],[199.7,657.5],[221.6,657.5],[243.6,657.5],[265.5,657.5],[155.8,679.4],[177.7,679.4],[199.7,679.4],[221.6,679.4],[243.6,679.4],[265.5,679.4],[155.8,701.4],[177.7,701.4],[199.7,701.4],[221.6,701.4],[265.5,701.4],[177.7,723.3],[199.7,723.3],[221.6,723.3],[265.5,723.3],[199.7,745.2],[221.6,745.2],[243.6,745.2],[265.5,745.2],[221.6,767.2],[243.6,767.2]]
  }
};
