import dataset from "@/data/places.json";
import { LUGDUNUM_SUNDAY, LUGDUNUM_SUNDAY_IDS } from "@/lib/day-plans";

export type CrowdLevel = 1 | 2 | 3 | 4;
export type InterestLevel = 1 | 2 | 3 | 4 | 5;
export type Price = "gratuit" | "reduit";
export type Reservation = "sans" | "obligatoire" | "selon-animation";

export type HourSlot = {
  day: "ven" | "sam" | "dim";
  start: string;
  end: string;
  label: string;
};

export type PlaceEvent = {
  id: number;
  name: string;
  description: string;
  tags: string[];
  dates: { start: string; end: string }[];
  url: string | null;
  featured: boolean;
};

export type Place = {
  id: number;
  ids: number[];
  slug: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  district: string;
  inLyon: boolean;
  lat: number;
  lng: number;
  category: string;
  categories: string[];
  interest: InterestLevel;
  whyGo: string;
  crowd: CrowdLevel;
  crowdNote: string;
  exceptional: boolean;
  reservation: Reservation;
  price: Price;
  hours: HourSlot[];
  summary: string;
  sources: string[];
  image: string | null;
  events: PlaceEvent[];
  eventCount: number;
  officialSearch: string;
};

export type Catalog = {
  meta: {
    edition: string;
    dates: string[];
    theme: string[];
    updated: string;
    source: string;
    sourceUrl: string;
    disclaimer: string;
    counts: { places: number; gratuit: number; reduit: number; lyon: number };
  };
  places: Place[];
};

export const catalog = dataset as Catalog;
export const places = catalog.places as Place[];

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  1: "Calme",
  2: "Modérée",
  3: "Forte",
  4: "Très forte",
};

export const CROWD_COLOR: Record<CrowdLevel, string> = {
  1: "#3f6f5b",
  2: "#c48a2a",
  3: "#c45c26",
  4: "#8b1e1e",
};

export const CATEGORY_LABEL: Record<string, string> = {
  musee: "Musée (collections)",
  architecture: "Visite architecturale",
  conference: "Conférence",
  monument: "Monument",
  religieux: "Édifice religieux",
  spectacle: "Théâtre & musique",
  jardin: "Parc & jardin",
  archives: "Archives & bibliothèques",
  institution: "Institution",
  artisanat: "Savoir-faire",
  industriel: "Patrimoine industriel",
  educatif: "École & université",
  balade: "Balade",
  exposition: "Exposition",
  sport: "Sport",
  archeologie: "Archéologie",
  patrimoine: "Patrimoine",
};

export const DAY_LABEL: Record<HourSlot["day"], string> = {
  ven: "Vendredi 18",
  sam: "Samedi 19",
  dim: "Dimanche 20",
};

export type Itinerary = {
  id: string;
  label: string;
  blurb: string;
  match: (place: Place) => boolean;
};

export const ITINERARIES: Itinerary[] = [
  {
    id: LUGDUNUM_SUNDAY.id,
    label: LUGDUNUM_SUNDAY.label,
    blurb: LUGDUNUM_SUNDAY.blurb,
    match: (p) => LUGDUNUM_SUNDAY_IDS.includes(p.id),
  },
  {
    id: "exceptional",
    label: "Ouvertures rares",
    blurb: "Lieux habituellement fermés au public.",
    match: (p) => p.exceptional && p.price === "gratuit",
  },
  {
    id: "quiet",
    label: "Éviter la foule",
    blurb: "Fort intérêt, affluence estimée calme ou modérée.",
    match: (p) => p.interest >= 4 && p.crowd <= 2 && p.price === "gratuit",
  },
  {
    id: "museums",
    label: "Musées",
    blurb: "Vraies visites de collections ou de salles de musée — pas les seules visites de bâtiment.",
    match: (p) => placeCategories(p).includes("musee") && p.price === "gratuit",
  },
  {
    id: "croix-rousse",
    label: "Croix-Rousse",
    blurb: "Soierie, jardin Rosa Mir, ateliers et plateau.",
    match: (p) =>
      p.district === "Lyon 4e" ||
      /canut|rosa mir|soierie|bertone|croix/i.test(p.name + p.address),
  },
  {
    id: "vieux-lyon",
    label: "Vieux-Lyon & Fourvière",
    blurb: "Cathédrale, Gadagne, Lugdunum, Palais Saint-Jean.",
    match: (p) => p.district === "Lyon 5e",
  },
  {
    id: "presquile",
    label: "Presqu'île",
    blurb: "Hôtel de Ville, Beaux-Arts, Célestins, Opéra, Archives.",
    match: (p) => p.district === "Lyon 1er" || p.district === "Lyon 2e",
  },
];

export function formatHours(hours: HourSlot[]): string {
  const days: HourSlot["day"][] = ["ven", "sam", "dim"];
  const parts: string[] = [];
  for (const day of days) {
    const slots = hours.filter((h) => h.day === day);
    if (!slots.length) continue;
    const start = [...slots.map((s) => s.start)].sort()[0];
    const end = [...slots.map((s) => s.end).filter(Boolean)].sort().at(-1) ?? "";
    const short = day === "ven" ? "Ven 18" : day === "sam" ? "Sam 19" : "Dim 20";
    parts.push(end ? `${short} ${start}–${end}` : `${short} ${start}`);
  }
  return parts.join(" · ") || "Horaires selon animation";
}

export function officialEventUrl(place: Place): string | null {
  return place.events.find((e) => e.url)?.url ?? null;
}

export function stars(n: number): string {
  return "●".repeat(n) + "○".repeat(Math.max(0, 5 - n));
}

export type Filters = {
  query: string;
  scope: "lyon" | "metro";
  price: "gratuit" | "all";
  itinerary: string | null;
  category: string | null;
  district: string | null;
  maxCrowd: CrowdLevel;
  minInterest: InterestLevel;
  exceptionalOnly: boolean;
  noQueueBias: boolean;
  favoritesOnly: boolean;
};

export const defaultFilters: Filters = {
  query: "",
  scope: "lyon",
  price: "gratuit",
  itinerary: null,
  category: null,
  district: null,
  maxCrowd: 4,
  minInterest: 1,
  exceptionalOnly: false,
  noQueueBias: false,
  favoritesOnly: false,
};

export function applyFilters(all: Place[], filters: Filters): Place[] {
  const q = filters.query.trim().toLowerCase();
  const itinerary = ITINERARIES.find((i) => i.id === filters.itinerary);

  return all.filter((place) => {
    if (filters.scope === "lyon" && !place.inLyon) return false;
    if (filters.price === "gratuit" && place.price !== "gratuit") return false;
    if (place.crowd > filters.maxCrowd) return false;
    if (place.interest < filters.minInterest) return false;
    if (filters.exceptionalOnly && !place.exceptional) return false;
    if (filters.noQueueBias && place.crowd >= 4) return false;
    if (filters.category && !placeCategories(place).includes(filters.category)) return false;
    if (filters.district && place.district !== filters.district) return false;
    if (itinerary && !itinerary.match(place)) return false;
    if (q) {
      const blob = `${place.name} ${place.address} ${place.summary} ${place.whyGo} ${place.events.map((e) => e.name).join(" ")}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export type SortMode = "interest" | "crowd" | "name" | "district";

export function districtRank(district: string): [number, number, string] {
  const match = district.match(/^Lyon\s+(\d+)/i);
  if (match) return [0, Number(match[1]), district];
  if (district === "Lyon") return [0, 99, district];
  if (district === "Métropole") return [2, 0, district];
  return [1, 0, district];
}

export function compareDistricts(a: string, b: string): number {
  const [ag, an, al] = districtRank(a);
  const [bg, bn, bl] = districtRank(b);
  if (ag !== bg) return ag - bg;
  if (an !== bn) return an - bn;
  return al.localeCompare(bl, "fr");
}

export function sortPlaces(list: Place[], mode: SortMode): Place[] {
  const copy = [...list];
  if (mode === "name") copy.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  else if (mode === "crowd") copy.sort((a, b) => a.crowd - b.crowd || b.interest - a.interest);
  else if (mode === "district") {
    copy.sort(
      (a, b) =>
        compareDistricts(a.district, b.district) ||
        b.interest - a.interest ||
        a.name.localeCompare(b.name, "fr"),
    );
  } else copy.sort((a, b) => b.interest - a.interest || a.crowd - b.crowd || a.name.localeCompare(b.name, "fr"));
  return copy;
}

export function groupPlacesByDistrict(list: Place[]): { district: string; places: Place[] }[] {
  const grouped = new Map<string, Place[]>();
  for (const place of list) {
    const key = place.district || "Autre";
    const bucket = grouped.get(key);
    if (bucket) bucket.push(place);
    else grouped.set(key, [place]);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => compareDistricts(a, b))
    .map(([district, places]) => ({ district, places }));
}

export function districtsIn(list: Place[]): string[] {
  return [...new Set(list.map((p) => p.district))].sort(compareDistricts);
}

export function placeCategories(place: Place): string[] {
  if (place.categories?.length) return place.categories;
  return place.category ? [place.category] : [];
}

export function categoriesIn(list: Place[]): string[] {
  const found = new Set<string>();
  for (const place of list) {
    for (const cat of placeCategories(place)) found.add(cat);
  }
  return [...found].sort((a, b) =>
    (CATEGORY_LABEL[a] ?? a).localeCompare(CATEGORY_LABEL[b] ?? b, "fr"),
  );
}
