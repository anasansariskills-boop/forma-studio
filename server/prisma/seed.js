import { PrismaClient } from '@prisma/client'
import { config } from '../src/config.js'
import { hashPassword } from '../src/lib/auth.js'

const prisma = new PrismaClient()

const IMG = '/img'

const projects = [
  {
    slug: 'casa-marnal',
    title: 'Casa Marnal',
    category: 'ARCHITECTURE',
    status: 'COMPLETED',
    year: 2024,
    location: 'Alentejo',
    country: 'Portugal',
    areaSqm: 340,
    client: 'Sampaio family',
    featured: true,
    sortOrder: 0,
    excerpt: 'A single-storey house laid out around three shaded courtyards, built to sink into the flat Alentejo plain.',
    materials: ['Board-formed concrete', 'Lioz limestone', 'Reclaimed oak', 'Lime plaster'],
    tags: ['house', 'courtyard', 'passive', 'rural'],
    description:
      'The brief asked for a house that could hold four generations without feeling like a hotel. We answered with a low concrete plinth that follows the contour of the site, breaking the plan into three courtyards so that every room opens onto shaded ground rather than the exposed plain.\n\nEach courtyard does a different job. The first is a arrival space, paved in limestone and cooled by a single mature olive tree. The second is domestic — a shallow pool that reads as a dark mirror from the living room. The third is utility: kitchen garden, laundry, and the wood store that fuels the underfloor heating through January.\n\nDeep overhangs carry the summer sun off the glazing, while cross-ventilation through the courtyards keeps the house at 24 °C through the hottest weeks without mechanical cooling. Board-formed concrete was cast on site from the same aggregate as the driveway, so the house ages at the same rate as its ground.',
    coverImageAlt: 'Casa Marnal — west elevation at dusk, board-formed concrete and a deep oak canopy',
  },
  {
    slug: 'casa-pedra-branca',
    title: 'Casa Pedra Branca',
    category: 'ARCHITECTURE',
    status: 'COMPLETED',
    year: 2022,
    location: 'Sintra',
    country: 'Portugal',
    areaSqm: 285,
    client: 'Private',
    featured: true,
    sortOrder: 1,
    excerpt: 'A white lime-rendered house threaded through a pine hillside, with every window framed on a tree rather than a view.',
    materials: ['Lime render', 'Cork insulation', 'Portuguese schist', 'Blackened steel'],
    tags: ['house', 'hillside', 'lime', 'forest'],
    description:
      'Sintra rains two hundred days a year and the hillside moves, so the house is designed as a series of retaining walls that happen to be habitable. Two bars, offset by four metres, follow the fall of the ground; the gap between them becomes a covered street that runs from the parking court down to the garden.\n\nWe rejected the panoramic glass that the site agents requested. Instead the openings are deep and deliberately narrow, each one composed on a trunk or a branch, so the forest is always close and never a backdrop. The interior finishes are lime over cork block — soft, slightly irregular, and able to breathe with the humidity.\n\nA schist stair, cut from the stone excavated during the foundations, links the bars and doubles as the spine of the house. It took a mason and his nephew four months to set by hand.',
    coverImageAlt: 'Casa Pedra Branca — lime-rendered wall and narrow window framing a pine trunk',
  },
  {
    slug: 'boqueiro-house',
    title: 'Boqueiro House',
    category: 'ARCHITECTURE',
    status: 'COMPLETED',
    year: 2021,
    location: 'Comporta',
    country: 'Portugal',
    areaSqm: 190,
    client: 'Private',
    featured: false,
    sortOrder: 2,
    excerpt: 'Four timber pavilions on stilted pads, lifted a metre above a rice field that floods every winter.',
    materials: ['Maritime pine', 'Zinc', 'Bamboo', 'Concrete pads'],
    tags: ['house', 'wetland', 'timber', 'prefabricated'],
    description:
      'The site is a working rice paddy, and the client wanted to keep it working. So the house touches the ground as little as possible: four independent pavilions sit on concrete pads one metre up, and the paddy continues underneath.\n\nEach pavilion is a timber frame built from maritime pine grown ninety kilometres away, panelised in a workshop and assembled in eleven days — the only way to build on ground that is soft for six months of the year. Zinc valleys catch the rain and feed it back into the field channels.\n\nBetween the pavilions, a deck of bamboo strips becomes the social room from April to October. In winter the house reads as a line of lit boxes floating over standing water, which is exactly the image the client described in the first meeting and which we have not been able to improve on since.',
    coverImageAlt: 'Boqueiro House — timber pavilions raised above a flooded rice paddy',
  },
  {
    slug: 'serra-wine-house',
    title: 'Serra Wine House',
    category: 'ARCHITECTURE',
    status: 'COMPLETED',
    year: 2023,
    location: 'Douro',
    country: 'Portugal',
    areaSqm: 610,
    client: 'Quinta do Vale',
    featured: true,
    sortOrder: 3,
    excerpt: 'A winery cut into a schist terrace, where gravity moves the wine and the public route moves through the tanks.',
    materials: ['Shotcrete', 'Schist rubble', 'Weathered steel', 'Oak vats'],
    tags: ['winery', 'landscape', 'industrial', 'hospitality'],
    description:
      'A working winery is a machine that uses height. We gave it the hill: grapes arrive at the top terrace, crush and settle two levels below, and leave as wine at the road, all of it falling rather than being pumped. The building is mostly buried, and the roof is the vineyard.\n\nThe second requirement was to let people look without interrupting. A concrete walkway threads between the fermentation tanks at their own level, glazed on one side and open to the schist on the other, so visitors pass through the process on their way to the tasting room rather than peering in from above.\n\nNothing here is decorated. The shotcrete carries the texture of the formers, the steel is left to rust where the salt wind reaches it, and the only warmth comes from the forty-eight oak vats, which are the loudest objects in the building.',
    coverImageAlt: 'Serra Wine House — fermentation hall seen from the visitor walkway',
  },
  {
    slug: 'marcador-pavilion',
    title: 'Marcador Pavilion',
    category: 'ARCHITECTURE',
    status: 'COMPLETED',
    year: 2023,
    location: 'Évora',
    country: 'Portugal',
    areaSqm: 120,
    client: 'Municipality of Évora',
    featured: false,
    sortOrder: 4,
    excerpt: 'A demountable shade structure for the market square, built from a single kit of forty-eight repeated parts.',
    materials: ['Galvanised steel', 'Cattle hide', 'Rammed earth'],
    tags: ['public', 'pavilion', 'demountable', 'market'],
    description:
      'Évora loses its market square to the July sun, and the municipality had eighteen thousand euro and a planning rule that said nothing could be fixed to the cobbles. We designed a kit: forty-eight identical steel elbows, a tension membrane, and rammed-earth ballast blocks that hold the whole thing down by weight alone.\n\nThe structure goes up in three days with four people and a torque wrench, and comes down in two. It has now spent two summers on the square and one winter in a warehouse, which was the point — a building that only exists when it is needed.\n\nTraders arrange their stalls underneath it the way they like, and the membrane throws a shadow that moves an hour behind the square itself, so the market keeps its rhythm without being lit like a forecourt.',
    coverImageAlt: 'Marcador Pavilion — repeated steel frame over the Évora market square',
  },
  {
    slug: 'alfandega-workspace',
    title: 'Alfândega Workspace',
    category: 'COMMERCIAL',
    status: 'IN_CONSTRUCTION',
    year: 2025,
    location: 'Lisbon',
    country: 'Portugal',
    areaSqm: 1150,
    client: 'Nordlys Group',
    featured: true,
    sortOrder: 5,
    excerpt: 'A 1940s customs hall returned to work: one uninterrupted floor, twenty-one rooms inserted as freestanding timber boxes.',
    materials: ['Existing granite', 'Birch ply', 'Terrazzo', 'Bronze mesh'],
    tags: ['office', 'adaptive reuse', 'heritage', 'warehouse'],
    description:
      'The old customs hall has a sixteen-metre clear span and no columns, and the client wanted to keep it that way. So the new programme — twenty-one rooms for a hundred and forty people — is inserted as furniture. Nothing is attached to the walls or the roof; the boxes stand on their own terrazzo pads and can be picked out wholesale in a decade.\n\nEach box is birch ply, built as a double-skinned shell so that services run inside the cavity rather than across the ceiling. Bronze mesh on the long faces lets light and conversation pass while giving the rooms some privacy.\n\nWhat remains of the 1940s is untouched and deliberately visible: the granite plinths where cargo was checked, the painted numbers on the pillars, the steel windows repaired rather than replaced. The building is being run on 61 percent less energy than the landlord\'s previous office, mostly by using the thermal mass of that floor.',
    coverImageAlt: 'Alfândega Workspace — timber meeting box inside the granite customs hall',
  },
  {
    slug: 'estrela-gallery',
    title: 'Estrela Gallery',
    category: 'COMMERCIAL',
    status: 'COMPLETED',
    year: 2022,
    location: 'Lisbon',
    country: 'Portugal',
    areaSqm: 420,
    client: 'Estrela Cultural Foundation',
    featured: false,
    sortOrder: 6,
    excerpt: 'A private gallery in a former bank vault, organized around daylight that can be tuned by hand.',
    materials: ['Carrara marble', 'Skylight glass', 'Painted plaster', 'Brass'],
    tags: ['gallery', 'culture', 'daylight', 'interior'],
    description:
      'The collection is twentieth-century painting, hung once a year, and the foundation wanted a building that did not compete. We gave them two long halls and a single light source: a north skylight over the stair that washes the walls evenly and never touches a canvas directly.\n\nBelow that, a shutter of brass slats — hand-operated, on a chain, the way the bank\'s vault once worked — lets the curator dial daylight between full and none depending on the show. Electric light is narrow-band and sits in a slot at the picture rail, so the wall appears to be lit by nothing.\n\nThe vault door stayed, and the strong room became the archive. Visitors move from street to café to hall without passing a ticket desk, which was the one request the director repeated at every meeting.',
    coverImageAlt: 'Estrela Gallery — north-lit hall with brass shutter open above the stair',
  },
  {
    slug: 'baixa-flagship',
    title: 'Baixa Flagship',
    category: 'COMMERCIAL',
    status: 'COMPLETED',
    year: 2024,
    location: 'Lisbon',
    country: 'Portugal',
    areaSqm: 260,
    client: 'Casa Figa',
    featured: false,
    sortOrder: 7,
    excerpt: 'A grocery flagship in a Pombalite block, where the shelving is the architecture and the shop can be rebuilt in a week.',
    materials: ['Pine shelving', 'Encaustic tile', 'Corten counter', 'Glass'],
    tags: ['retail', 'food', 'heritage', 'fit-out'],
    description:
      'Casa Figa sells produce, wine and a few hundred household objects, and they move their plan every season. The fit-out therefore has no fixed walls: a continuous pine shelf runs the length of the room at 1.8 metres, carrying everything from crates to the lighting, and the floor below stays empty and re-furnishable.\n\nWe relaid the original encaustic tile in the entry bay, which had been screpped over since the 1970s, and left the Pombalite stucco patched rather than perfect. A Corten counter at the back takes the wine trade and the coffee machine, and is the only new object allowed to look new.\n\nThe whole shop was dismantled and rebuilt twice during a lease negotiation, in seven working days each time, by three people and the same set of shelf brackets.',
    coverImageAlt: 'Baixa Flagship — continuous pine shelving under restored encaustic tile',
  },
  {
    slug: 'hotel-aurora',
    title: 'Hotel Aurora',
    category: 'INTERIOR',
    status: 'COMPLETED',
    year: 2024,
    location: 'Porto',
    country: 'Portugal',
    areaSqm: 1800,
    client: 'Aurora Hotels',
    featured: true,
    sortOrder: 8,
    excerpt: 'Twenty-two rooms and a ground floor for a granite shell that had been a printing works, furnished almost entirely in Portuguese materials.',
    materials: ['Ash', 'Wool', 'Azulejo', 'Cast iron', 'Linen'],
    tags: ['hotel', 'adaptive reuse', 'furniture', 'graphic'],
    description:
      'The building had heavy granite walls and enormous cast-iron printing windows, and the operator wanted a small hotel that felt like a house in Porto rather than a brand. We kept the print-floor grid and built the guest rooms around it: twenty-two, no two identical, because the windows refused to be regular.\n\nEverything you touch was made within three hundred kilometres — ash millwork from Baião, wool bouclé from the Serra da Estrela, linen in the rooms, and new azulejo panels at the reception drawn from a broken eighteenth-century set two streets away.\n\nThe ground floor is deliberately louder: an open bar, a print-shop counter reused as reception, and a stair cut through the floor slab where the presses once came down. Guest numbers are set in old foundry type above each door, which is the only signage the hotel needed.',
    coverImageAlt: 'Hotel Aurora — guest room with cast-iron printing window and ash millwork',
  },
  {
    slug: 'casa-vento-sul',
    title: 'Casa Vento Sul',
    category: 'INTERIOR',
    status: 'IN_DESIGN',
    year: 2025,
    location: 'Algarve',
    country: 'Portugal',
    areaSqm: 220,
    client: 'Private',
    featured: false,
    sortOrder: 9,
    excerpt: 'A holiday house interiors project that removes almost everything and replaces it with eight pieces of furniture.',
    materials: ['Travertine', 'White oak', 'Cork', 'Raw brass'],
    tags: ['interior', 'coastal', 'minimal', 'furniture'],
    description:
      'The house was completed by another practice in 2019 with a good plan and, in the owners\' words, "a very expensive showroom inside". Our brief was subtraction: strip the fitted units, the feature wall, and the imported sofas, then put back only what the family actually uses.\n\nEight pieces of furniture do everything — a dining table that seats ten and works as a desk, four chairs, a daybed, a bookcase that closes the television away, and a chest in each bedroom. All in white oak and cork, all made by two workshops in the Algarve, none of it fixed to the building so it can move with the family.\n\nTravertine survives only where water is: the two bathrooms and the kitchen splash. Brass is left unlacquered so it goes the colour of the hands that touch it, which the owners specifically asked for and which will look wrong in photographs for about two years.',
    coverImageAlt: 'Casa Vento Sul — white oak table and cork bench in the living hall',
  },
  {
    slug: 'principe-atelier',
    title: 'Príncipe Atelier',
    category: 'RENOVATION',
    status: 'COMPLETED',
    year: 2020,
    location: 'Lisbon',
    country: 'Portugal',
    areaSqm: 145,
    client: 'FORMA Studio',
    featured: false,
    sortOrder: 10,
    excerpt: 'Our own studio: a top-floor apartment in Príncipe Real opened up to a single north-lit drawing room and two small offices.',
    materials: ['Pine', 'Lime wash', 'Original cement tiles', 'Steel'],
    tags: ['renovation', 'studio', 'self-build', 'heritage'],
    description:
      'We took the lease on a fourth-floor flat with a leaking roof and a partition layout from 1978, and turned it into the place where this studio does its work. The main space is one long room lit entirely from the north, because drawing needs even light and the bay window on the garden side was the only decent thing in the building.\n\nThe two existing cement-tile floors were lifted, numbered and relaid; the rest is lime wash over original brick, and a pine mezzanine that holds the model library and takes the load of four hundred books without touching the historic walls.\n\nIt seats eleven people, which is one more than we can heat comfortably in February. We have learned to live with that, and the drawing room has been the setting for every project photograph on this site.',
    coverImageAlt: 'Príncipe Atelier — the studio drawing room with north light and pine mezzanine',
  },
  {
    slug: 'casa-sobreiro',
    title: 'Casa Sobreiro',
    category: 'RENOVATION',
    status: 'IN_CONSTRUCTION',
    year: 2022,
    location: 'Sintra',
    country: 'Portugal',
    areaSqm: 210,
    client: 'Private',
    featured: false,
    sortOrder: 11,
    excerpt: 'A 1960s suburban house kept, insulated and re-cut, so that the family who grew up in it could grow old in it too.',
    materials: ['Cork render', 'Existing brick', 'Douglas fir', 'Steel'],
    tags: ['renovation', 'retrofit', 'energy', 'family'],
    description:
      'Three of the four siblings had been teenagers in this house, and none of them wanted a new one. So the plan stayed almost exactly as it was, and the work went into the envelope: a hundred millimetres of cork render outside, new windows in the original openings, and a heat pump where the oil tanks had rusted through.\n\nThe one spatial change was to cut the back wall out and replace it with a Douglas fir frame that reaches the garden, which turns a dark corridor into the main room. Inside, we kept the terrazzo, the built-in cupboards and the terrible 1968 bathroom tiles — they were re-cut and re-grouted rather than replaced.\n\nMeasured over the first full winter, the house used fifty-eight percent less energy than the year before the work, in a building the family will now not have to leave.',
    coverImageAlt: 'Casa Sobreiro — the new fir frame opening the original living room to the garden',
  },
]

const services = [
  {
    slug: 'architecture',
    title: 'Architecture',
    discipline: 'New build',
    sortOrder: 0,
    excerpt: 'Houses, pavilions and small civic works, designed from the first site walk to the last joint.',
    description:
      'We take on a handful of new buildings a year, usually between 100 and 900 square metres, and we design them ourselves rather than handing them to a technical department. The work begins with a survey of the ground — levels, prevailing wind, the neighbour who will complain — and it ends with us on site making the decisions that drawings cannot hold.\n\nOur projects are expected to be quiet, cheap to run and buildable by Portuguese contractors with the materials they already know. We are not interested in a building that needs a specialist to keep it standing.',
    scope: ['Site survey and feasibility', 'Concept to permitted design', 'Technical documentation', 'Tender and contractor selection', 'Site supervision to handover', 'Post-occupancy review at one year'],
    detail: [
      'Typical duration 18 to 34 months.',
      'We work in both metric and imperial briefs, and we handle municipal liaison in Portugal and Spain.',
      'Every scheme is daylight and overheating modelled before the second plan review.',
    ],
  },
  {
    slug: 'interior-design',
    title: 'Interior Design',
    discipline: 'Interiors & furniture',
    sortOrder: 1,
    excerpt: 'Rooms, joinery and fittings — drawn to the millimetre and made by workshops we have worked with for years.',
    description:
      'Interiors are where a building either keeps its promise or quietly fails. We design the inside of our own work and, increasingly, the inside of buildings somebody else started: layouts, joinery, lighting, acoustic strategy and the furniture that has to be made rather than bought.\n\nBecause we draw millwork at 1:5 and visit the workshop during first assembly, what arrives on site is what was on the screen. Two of our four team members spend their Fridays in factories.',
    scope: ['Space planning and layout', 'Bespoke joinery and furniture', 'Material and finish schedules', 'Lighting design', 'Art and soft furnishing curation', 'On-site finishing supervision'],
    detail: [
      'Minimum interior commission 80 m².',
      'We specify no material we cannot source within 500 km twice.',
      'Furniture drawings are released to the maker, never to a catalogue.',
    ],
  },
  {
    slug: 'commercial-design',
    title: 'Commercial Design',
    discipline: 'Workplace, retail & hospitality',
    sortOrder: 2,
    excerpt: 'Offices, galleries, shops and small hotels that have to earn their keep and still be pleasant to stand in.',
    description:
      'Commercial work is a different contract: the client has a trading model, a landlord, and an opening date that cannot move. We have done enough of it to design around all three, and to argue usefully about which of them is worth sacrificing.\n\nOur approach is operational first — how many people, how they actually work, what has to be reconfigured in eighteen months — then architectural. Most of this work is adaptive reuse of buildings that already have more character than a new shell can buy.',
    scope: ['Feasibility and testing of a lease', 'Trading-compatible phasing', 'Landlord and heritage negotiation', 'Fit-out and MEP coordination', 'Brand and wayfinding integration', 'Snagging through opening'],
    detail: [
      'We have delivered four hospitality fit-outs on a fixed opening date.',
      'Retail schemes are designed to be dismantled and rebuilt, and we price for it.',
      'Average commercial project 300 to 1,200 m².',
    ],
  },
  {
    slug: 'residential-renovation',
    title: 'Residential Renovation',
    discipline: 'Retrofit & extension',
    sortOrder: 3,
    excerpt: 'Making existing houses work again — envelope first, fabric second, and very little demolition.',
    description:
      'The greenest building is the one already standing, and in Portugal most of them are badly insulated, damp and heated by oil. We retrofit them properly: envelope and services first, then the plan, then the finishes, which is the opposite order most renovations attempt.\n\nWe survey with a thermal camera and a moisture meter before we draw anything, and we tell clients honestly which parts of their house are worth keeping. On a typical 200 m² retrofit the energy demand falls by half or better, and the family stays in the same neighbourhood.',
    scope: ['Building survey and condition report', 'Thermal and moisture modelling', 'Envelope and insulation strategy', 'Services replacement', 'Structural coordination', 'Heritage and neighbourhood consents'],
    detail: [
      'Typical energy reduction 45 to 65 percent.',
      'We work with residents in the building, in phases, where the client needs it.',
      'Every renovation includes a written maintenance plan for the fabric we specified.',
    ],
  },
]

const team = [
  {
    name: 'Ana Ferreira',
    role: 'Founding Partner',
    sortOrder: 0,
    email: 'ana@forma-studio.com',
    bio: 'Ana opened FORMA in Lisbon in 2011 after eight years with Eduardo Souto de Moura and a spell in Turin. She still draws the first section of every project herself and walks every site at dusk before the concept is signed off. She teaches the design studio at FAUL twice a term.',
    imageAlt: 'Ana Ferreira, founding partner, standing in the studio drawing room',
  },
  {
    name: 'Rui Marques',
    role: 'Partner, Architecture',
    sortOrder: 1,
    email: 'rui@forma-studio.com',
    bio: 'Rui joined in 2014 and runs the architecture side: feasibility through to site supervision. He is the reason our drawings contain joints rather than colour fills, and he has an unmatched ability to make a contractor say yes to a difficult detail.',
    imageAlt: 'Rui Marques, partner for architecture, reviewing a wall section on site',
  },
  {
    name: 'Marta Oliveira',
    role: 'Head of Interiors',
    sortOrder: 2,
    email: 'marta@forma-studio.com',
    bio: 'Marta leads interiors and furniture, and keeps the workshop relationships that make bespoke joinery affordable. Twelve years between Porto and Copenhagen, and a habit of arriving at a factory floor with a full-scale sample of whatever is being argued about.',
    imageAlt: 'Marta Oliveira, head of interiors, beside a full-scale material sample',
  },
  {
    name: 'Tomás Reis',
    role: 'Associate, Fabric & Performance',
    sortOrder: 3,
    email: 'tomas@forma-studio.com',
    bio: 'Tomás handles envelope, energy and comfort modelling, and the unglamorous paperwork of Portuguese permits. He measured every one of our completed retrofits for a year afterwards, which is how the studio learned what it had actually built.',
    imageAlt: 'Tomás Reis, associate for fabric and performance, with a thermal camera',
  },
]

const testimonials = [
  {
    quote:
      'They spent an afternoon in the kitchen before they drew anything, and it showed. Ana understood the house we could not describe to each other.',
    author: 'Elena Sampaio',
    role: 'Homeowner',
    company: 'Casa Marnal',
    featured: true,
    rating: 5,
    sortOrder: 0,
    projectSlug: 'casa-marnal',
  },
  {
    quote:
      'We asked for a winery that could also receive people. FORMA gave us a building where the visitors are part of the process, and our tasting revenue doubled without a single extra tank.',
    author: 'João Bettencourt',
    role: 'Managing Director',
    company: 'Quinta do Vale',
    featured: true,
    rating: 5,
    sortOrder: 1,
    projectSlug: 'serra-wine-house',
  },
  {
    quote:
      'They talked us out of half our programme and into keeping the granite. Twelve months in, the office feels bigger than the lease and costs us well under the old one.',
    author: 'Marc Devos',
    role: 'Head of Workplace',
    company: 'Nordlys Group',
    featured: false,
    rating: 5,
    sortOrder: 2,
    projectSlug: 'alfandega-workspace',
  },
  {
    quote:
      'Twenty-two rooms, no two the same, and not one complaint about it. Small hotels usually end up looking like an airport. This one looks like Porto.',
    author: 'Pedro Lobo',
    role: 'Managing Partner',
    company: 'Aurora Hotels',
    featured: true,
    rating: 5,
    sortOrder: 3,
    projectSlug: 'hotel-aurora',
  },
  {
    quote:
      'Three of us grew up in that house and none of us wanted it knocked about. Rui kept the tiles nobody else would have kept.',
    author: 'Isabel Faria',
    role: 'Homeowner',
    company: 'Casa Sobreiro',
    featured: false,
    rating: 5,
    sortOrder: 4,
    projectSlug: 'casa-sobreiro',
  },
  {
    quote:
      'The gallery is the first building in Lisbon where I can hang a 1940s canvas in daylight and not worry. The brass shutter is worth the whole fee.',
    author: 'Inês Carvalho',
    role: 'Director',
    company: 'Estrela Cultural Foundation',
    featured: false,
    rating: 5,
    sortOrder: 5,
    projectSlug: 'estrela-gallery',
  },
]

const studio = {
  id: 'default',
  heroKicker: 'Lisbon · Founded 2011',
  heroTitle: 'Buildings that hold the light.',
  heroLead:
    'FORMA is an architecture and interiors studio working across Portugal. We design quiet, low-energy buildings — mostly by keeping what already exists and cutting into it carefully.',
  heroImageUrl: `${IMG}/home/hero.jpg`,
  heroImageAlt: 'Casa Marnal — west elevation at dusk, board-formed concrete under a deep oak canopy',
  introImageUrl: `${IMG}/home/intro.jpg`,
  introImageAlt: 'The FORMA drawing room in Príncipe Real, lit from the north',
  philosophyImageUrl: `${IMG}/home/philosophy.jpg`,
  philosophyImageAlt: 'Shadow from a pine slat screen falling across a lime plaster wall',
  introKicker: 'The studio',
  introTitle: 'Eleven people, one long north-lit room.',
  introBody: [
    'We work from a fourth-floor apartment in Príncipe Real that we renovated ourselves, in a single room lit from the north, because drawing needs even light and arguments need a table.',
    'The studio takes a small number of commissions each year — between eight and twelve — and every one of them is led by a partner from the first site walk to the final snag list. Nobody here hands a project over to a department once the drawings are approved.',
  ],
  philosophy: [
    'A building should be made of things that are near. If we cannot source a material within five hundred kilometres, it is the wrong material for this site.',
    'Demolition is a last resort, not a design decision. Most of our work in the last five years has been into existing buildings, and the energy numbers are better for it.',
    'Comfort is measurable. We model daylight, overheating and airtightness before the second plan review, and we come back a year later to check what we said.',
  ],
  process: [
    { step: '01', title: 'Conversation', body: 'You describe the problem; we ask about budget, tolerance and the parts of the building you refuse to lose. No charge, usually two hours in your space rather than ours.' },
    { step: '02', title: 'Survey & feasibility', body: 'Measured survey, thermal and moisture scan, and a written feasibility opinion — including the version of your brief we think is wrong.' },
    { step: '03', title: 'Concept design', body: 'Three weeks to a scheme: plans, the section that matters, physical models, and one material board. We present in person and change it while you watch.' },
    { step: '04', title: 'Development & permits', body: 'Joints, services, structural coordination and the municipal process. Drawings to 1:5 on the parts that will be built by hand.' },
    { step: '05', title: 'Tender & site', body: 'We price with two or three contractors we trust, then are on site weekly. A partner signs off every poured element.' },
    { step: '06', title: 'Handover & after', body: 'Maintenance plan for the fabric we specified, a walk-through at three months, and a measured performance review at one year.' },
  ],
  stats: [
    { value: '2011', label: 'Year founded' },
    { value: '68', label: 'Completed works' },
    { value: '11', label: 'People in the atelier' },
    { value: '45–65%', label: 'Energy cut on retrofits' },
  ],
  street: 'Rua da Rosa 118, 4º',
  city: '1200-384 Lisbon',
  country: 'Portugal',
  email: 'hello@forma-studio.com',
  phone: '+351 213 960 118',
  hours: 'Atelier open Mon–Thu, 9:30–18:30',
  instagram: 'https://instagram.com/forma.studio',
  linkedin: 'https://linkedin.com/company/forma-studio',
  foundedYear: 2011,
}

const inquiryRows = [
  { name: 'Camila Duarte', email: 'camila.duarte@gmail.com', projectType: 'NEW_BUILD', budget: '250k-500k', timeline: 'within-12-months', location: 'Cascais', status: 'NEW', daysAgo: 1, message: 'We have inherited a plot above Guincho with an old store building on it. Three of us want to live there — two adults, one teenager — and we would like to keep the store if it can be a studio. I have the title deed and a soil report from 2019.' },
  { name: 'Anders Holm', email: 'a.holm@nordvest.no', projectType: 'COMMERCIAL', budget: '500k-1m', timeline: 'within-6-months', location: 'Porto', status: 'NEW', daysAgo: 2, message: 'Our client is opening a second office in Porto, roughly 600 m² in a nineteenth-century building. We need someone who has worked with Portuguese heritage constraints before and who can work alongside our Oslo team.' },
  { name: 'Beatriz Nunes', email: 'bia.nunes@gmail.com', projectType: 'RENOVATION', budget: '100k-250k', timeline: 'asap', location: 'Lisbon', status: 'NEW', daysAgo: 3, message: 'Second-floor apartment in Alvalade, built 1958. Damp on the north wall, terrible insulation, and we are told the facade cannot change. Would love to know if you take on apartments.' },
  { name: 'Hélène Marchand', email: 'h.marchand@atelier-m.fr', projectType: 'INTERIOR', budget: '100k-250k', timeline: 'exploring', location: 'Algarve', status: 'READ', daysAgo: 6, message: 'We furnished a house in Lagos in 2019 and hate it. Looking for a studio that will remove rather than add. Not in a hurry, budget flexible for the right plan.' },
  { name: 'Rúben Sequeira', email: 'rsequeira@quintadaluz.pt', projectType: 'NEW_BUILD', budget: 'over-1m', timeline: 'within-12-months', location: 'Alentejo', status: 'REPLIED', daysAgo: 11, message: 'Small wine project, 400 m²: cellar, tasting room, four guest suites. We have the land and a feasibility study. Your Serra Wine House is the reason I am writing.' },
  { name: 'Sofia Almeida', email: 'sofia.almeida@outlook.com', phone: '+351 912 447 090', projectType: 'RENOVATION', budget: 'under-100k', timeline: 'within-6-months', location: 'Sintra', status: 'REPLIED', daysAgo: 15, message: 'Cottage on a plot we inherited. Roof, insulation and one new window. Small budget — is this a job you would look at?' },
  { name: 'Tom Whitfield', email: 'tw@whitfieldproperty.co.uk', projectType: 'INTERIOR', budget: '250k-500k', timeline: 'exploring', location: 'Comporta', status: 'READ', daysAgo: 21, message: 'Buying a shell property in Comporta, want the whole interior and furniture package handled. Would like to understand how you charge on overseas owner projects.' },
  { name: 'Mariana Pinto', email: 'mari.pinto@gmail.com', projectType: 'NEW_BUILD', budget: '250k-500k', timeline: 'exploring', location: 'Braga', status: 'NEW', daysAgo: 24, message: 'Two of us, one child, parents visiting for weeks at a time. Have a plot in a village, planning status unclear. Starting the conversation early and want to do this properly.' },
  { name: 'Diogo Fontes', email: 'd.fontes@casafeiga.pt', projectType: 'COMMERCIAL', budget: '100k-250k', timeline: 'within-6-months', location: 'Lisbon', status: 'ARCHIVED', daysAgo: 38, message: 'Flagship grocery, Baixa, 250 m², lease signed for March. Your Casa Figa work is what we are aiming at, though at a smaller budget.' },
  { name: 'Karolina Nowak', email: 'k.nowak@baltyk.com.pl', projectType: 'RENOVATION', budget: '500k-1m', timeline: 'within-12-months', location: 'Estrela, Lisbon', status: 'REPLIED', daysAgo: 47, message: 'Fourth floor in a building we own outright, 260 m², currently empty and badly maintained. Full retrofit including the roof. Would need to know about your availability in Q2.' },
  { name: 'Miguel Tavares', email: 'miguel@tavarcas.pt', projectType: 'NEW_BUILD', budget: '500k-1m', timeline: 'within-6-months', location: 'Douro', status: 'ARCHIVED', daysAgo: 63, message: 'Warehouse conversion into a small hospitality building. Nine rooms, restaurant below. We have a project manager already and need design only.' },
  { name: 'Anaïs Berthier', email: 'anais.berthier@gmail.com', projectType: 'INTERIOR', budget: 'under-100k', timeline: 'asap', location: 'Porto', status: 'ARCHIVED', daysAgo: 78, message: 'Two-bedroom flat, need joinery and a layout that gives us a workspace for two people permanently at home.' },
  { name: 'Nuno Barreto', email: 'nbarreto@somachado.pt', projectType: 'COMMERCIAL', budget: '250k-500k', timeline: 'exploring', location: 'Évora', status: 'READ', daysAgo: 96, message: 'Bookshop and café in a municipal building, run through a concession. We are bidding for the lease and would want an architect on the bid team.' },
  { name: 'Freya Lindqvist', email: 'freya.l@vestra.se', projectType: 'NEW_BUILD', budget: '100k-250k', timeline: 'exploring', location: 'Lisbon', status: 'ARCHIVED', daysAgo: 131, message: 'Looking for a design practice for a self-build outside Lisbon, Swedish client, Portuguese contractor. Would like to talk about how you work with clients who are not on site.' },
  { name: 'Ricardo Lemos', email: 'ricardo.lemos@gmail.com', phone: '+351 936 118 244', projectType: 'RENOVATION', budget: '100k-250k', timeline: 'within-12-months', location: 'Setúbal', status: 'NEW', daysAgo: 4, message: 'Fishing cottage, half collapsed at the back. Have an architect of record for the permit but need someone to do the actual design.' },
  { name: 'Susana Rocha', email: 'susana@rochaimoveis.pt', projectType: 'INTERIOR', budget: '500k-1m', timeline: 'within-6-months', location: 'Cascais', status: 'NEW', daysAgo: 8, message: 'Developer shell, 480 m², four apartments to be furnished for sale. Referrals only, and we pay for the specification pack if it is well drawn.' },
]

async function main() {
  console.log('Seeding FORMA Studio…')

  // Wipe in dependency order so the script is safe to re-run.
  await prisma.contactInquiry.deleteMany()
  await prisma.testimonial.deleteMany()
  await prisma.projectImage.deleteMany()
  await prisma.project.deleteMany()
  await prisma.service.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.studioProfile.deleteMany()

  const admin = await prisma.adminUser.upsert({
    where: { email: config.seedAdmin.email.toLowerCase() },
    update: { passwordHash: await hashPassword(config.seedAdmin.password) },
    create: {
      email: config.seedAdmin.email.toLowerCase(),
      name: 'Ana Ferreira',
      role: 'admin',
      passwordHash: await hashPassword(config.seedAdmin.password),
    },
  })

  const created = []
  for (const [index, data] of projects.entries()) {
    const { coverImageAlt, ...rest } = data
    const project = await prisma.project.create({
      data: {
        ...rest,
        coverImageAlt,
        coverImageUrl: `${IMG}/projects/${data.slug}/cover.jpg`,
        images: {
          create: [1, 2, 3, 4]
            .filter((n) => n <= galleryCount(data.slug))
            .map((n) => ({
              url: `${IMG}/projects/${data.slug}/${n}.jpg`,
              alt: `${data.title} — view ${n}`,
              caption: null,
              width: 1600,
              height: n % 2 === 0 ? 1000 : 1100,
              sortOrder: n,
            })),
        },
        sortOrder: index,
      },
      select: { id: true, slug: true },
    })
    created.push(project)
  }
  const bySlug = Object.fromEntries(created.map((project) => [project.slug, project.id]))

  const serviceImages = {
    architecture: ['architecture', 'Board-formed concrete house stair against a north light'],
    'interior-design': ['interior', 'Oak joinery and linen in a Lisbon living room'],
    'commercial-design': ['commercial', 'Hotel lobby in stone and brass, daylit from the street'],
    'residential-renovation': ['renovation', 'Retrofitted stone house wall with a new timber window'],
  }

  for (const [index, service] of services.entries()) {
    const [file, alt] = serviceImages[service.slug]
    await prisma.service.create({
      data: { ...service, imageUrl: `${IMG}/services/${file}.jpg`, imageAlt: alt, sortOrder: index },
    })
  }

  for (const [index, member] of team.entries()) {
    await prisma.teamMember.create({
      data: { ...member, imageUrl: `${IMG}/team/${['ana', 'rui', 'marta', 'tomas'][index]}.jpg`, sortOrder: index },
    })
  }

  for (const [index, entry] of testimonials.entries()) {
    const { projectSlug, ...data } = entry
    await prisma.testimonial.create({
      data: {
        ...data,
        projectId: projectSlug ? bySlug[projectSlug] : null,
        sortOrder: index,
      },
    })
  }

  await prisma.studioProfile.create({ data: studio })

  for (const row of inquiryRows) {
    const { daysAgo, ...data } = row
    await prisma.contactInquiry.create({
      data: {
        ...data,
        createdAt: new Date(Date.now() - daysAgo * 86_400_000),
        updatedAt: new Date(Date.now() - Math.max(0, daysAgo - 2) * 86_400_000),
      },
    })
  }

  console.log(
    `  ${created.length} projects · ${services.length} services · ${team.length} team · ${testimonials.length} testimonials · ${inquiryRows.length} inquiries`,
  )
  console.log(`  admin: ${admin.email} / ${config.seedAdmin.password}`)
}

function galleryCount(slug) {
  return { 'casa-marnal': 4, 'serra-wine-house': 4, 'hotel-aurora': 4, 'alfandega-workspace': 3 }[slug] ?? 3
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
