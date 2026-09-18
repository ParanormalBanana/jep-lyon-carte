import { places as allPlaces, type Place } from "./catalog";

export const SATURDAY_FROM_HOME_ID = "saturday-home";

export const HOME = {
  label: "72 route de Vienne",
  district: "Lyon 7e · La Mouche",
  lat: 45.740332,
  lng: 4.851427,
} as const;

export const CREMATORIUM_ID = 96288682;
export const VILLA_BERLIET_ID = 94729225;
export const AUDITORIUM_ID = 95556735;

const CORE_IDS = new Set([CREMATORIUM_ID, VILLA_BERLIET_ID, AUDITORIUM_ID]);

export type GeoPoint = { lat: number; lng: number };

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(s)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h)) return 0;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export function formatClock(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function walkMinutes(km: number): number {
  return Math.max(5, Math.round((km / 4.4) * 60));
}

function travel(from: GeoPoint, to: GeoPoint): { km: number; minutes: number; label: string } {
  const km = haversineKm(from, to);
  const onFoot = walkMinutes(km);
  if (km <= 1.8) return { km, minutes: onFoot, label: `${onFoot} min à pied` };
  if (km <= 2.6) return { km, minutes: onFoot, label: `≈${onFoot} min à pied` };
  const tcl = Math.max(18, Math.round(10 + km * 3.8));
  return { km, minutes: tcl, label: `≈${tcl} min en TCL` };
}

type Slot = { start: number; end: number };

function saturdaySlots(place: Place): Slot[] {
  return place.hours
    .filter((h) => h.day === "sam")
    .map((h) => ({
      start: parseMinutes(h.start),
      end: parseMinutes(h.end) || parseMinutes(h.start) + 60,
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
}

function mergeSlots(slots: Slot[]): Slot[] {
  if (!slots.length) return [];
  const out: Slot[] = [{ ...slots[0] }];
  for (const slot of slots.slice(1)) {
    const last = out[out.length - 1];
    if (slot.start <= last.end + 15) last.end = Math.max(last.end, slot.end);
    else out.push({ ...slot });
  }
  return out;
}

function openDuring(place: Place, fromMin: number, toMin: number): boolean {
  return mergeSlots(saturdaySlots(place)).some((slot) => slot.start < toMin && slot.end > fromMin);
}

function mustPlace(id: number): Place {
  const place = allPlaces.find((item) => item.id === id);
  if (!place) throw new Error(`Lieu manquant: ${id}`);
  return place;
}

export type SaturdayStop = {
  placeId: number;
  title: string;
  arrive: string;
  leave: string;
  walkLabel: string;
  walkKm: number;
  walkMin: number;
  note?: string;
  optional?: boolean;
};

export type SaturdayProposal = {
  id: string;
  label: string;
  blurb: string;
  start: string;
  end: string;
  stopCount: number;
  walkKm: number;
  walkMin: number;
  stops: SaturdayStop[];
  skipped: { placeId: number; reason: string }[];
  route: [number, number][];
};

export type SaturdayPlanResult = {
  proposals: SaturdayProposal[];
  sundayOnly: Place[];
  saturdayCount: number;
  favoriteCount: number;
  aside?: string;
};

function pickOnTheWayFavorite(favorites: Place[], berliet: Place, auditorium: Place): Place | null {
  const direct = haversineKm(berliet, auditorium);
  const scored = favorites
    .filter((place) => !CORE_IDS.has(place.id))
    .filter((place) => openDuring(place, 14 * 60, 15 * 60 + 15))
    .map((place) => {
      const detour = haversineKm(berliet, place) + haversineKm(place, auditorium) - direct;
      const towardConcert = haversineKm(place, auditorium) < direct * 0.88;
      return { place, detour, towardConcert };
    })
    .filter((row) => row.towardConcert && row.detour <= 1.35)
    .sort(
      (a, b) =>
        a.detour - b.detour || b.place.interest - a.place.interest || a.place.crowd - b.place.crowd,
    );
  return scored[0]?.place ?? null;
}

function buildCuratedSaturday(optional: Place | null): SaturdayProposal {
  const crematorium = mustPlace(CREMATORIUM_ID);
  const berliet = mustPlace(VILLA_BERLIET_ID);
  const auditorium = mustPlace(AUDITORIUM_ID);

  const homeToCrem = travel(HOME, crematorium);
  const cremToBerliet = travel(crematorium, berliet);
  const afterBerliet = optional ?? auditorium;
  const berlietToNext = travel(berliet, afterBerliet);
  const optionalToAud = optional ? travel(optional, auditorium) : null;

  const berlietLeave = optional ? "13h50" : "14h30";
  const stops: SaturdayStop[] = [
    {
      placeId: CREMATORIUM_ID,
      title: "Visite commentée — histoire funéraire lyonnaise",
      arrive: "9h15",
      leave: "10h30",
      walkLabel: `Depuis chez vous · ${homeToCrem.label}`,
      walkKm: homeToCrem.km,
      walkMin: homeToCrem.minutes,
      note: "Départ 9h05 du 72 route de Vienne. Ouverture 9h, à deux pas du cimetière Nouveau. On laisse la conférence de 14h : l’après-midi est pour Berliet.",
    },
    {
      placeId: VILLA_BERLIET_ID,
      title: "Visite libre — on prend notre temps",
      arrive: "11h05",
      leave: berlietLeave,
      walkLabel: `≈25 min en TCL (T4 Jet d’eau → Monplaisir, puis Montchat) ou 20 min à vélo par le cours Albert Thomas`,
      walkKm: cremToBerliet.km,
      walkMin: Math.max(cremToBerliet.minutes, 22),
      note: "File probable, surtout l’après-midi : arriver tard-matin. Décors Gruber / Majorelle, parc, véhicule de la Fondation. Pause déjeuner sur place ou juste à côté. Dernière sortie pour tenir le créneau tardif de l’Auditorium.",
    },
  ];

  if (optional && optionalToAud) {
    stops.push({
      placeId: optional.id,
      title: `Si le temps le permet — ${optional.name}`,
      arrive: "14h20",
      leave: "15h10",
      walkLabel: berlietToNext.label,
      walkKm: berlietToNext.km,
      walkMin: berlietToNext.minutes,
      optional: true,
      note: "Uniquement si vous quittez la villa vers 13h50. Sinon sautez cette étape et visez directement le dernier départ de visite libre à l’Auditorium.",
    });
  }

  stops.push(
    {
      placeId: AUDITORIUM_ID,
      title: "Visite libre des coulisses (dernier créneau)",
      arrive: "15h30",
      leave: "16h30",
      walkLabel: optional
        ? optionalToAud!.label
        : "≈25 min en TCL depuis Montchat (C16 / T4 vers Part-Dieu–Garibaldi)",
      walkKm: optional ? optionalToAud!.km : berlietToNext.km,
      walkMin: optional ? optionalToAud!.minutes : Math.max(berlietToNext.minutes, 24),
      note: "Sans réservation, 1 h, départs toutes les 15 min jusqu’à 16h30. Viser 15h15–15h30 pour finir pile à la fermeture des visites et ne pas poireauter jusqu’au concert.",
    },
    {
      placeId: AUDITORIUM_ID,
      title: "Concert d’orgue — Yves Lafargue",
      arrive: "18h",
      leave: "19h15",
      walkLabel: "Sur place · foyer de l’Auditorium",
      walkKm: 0,
      walkMin: 5,
      note: "Places déjà réservées. La visite se termine à 16h30 : rester dans le foyer plutôt que de rentrer. Bach, Vivaldi, orgue monumental (6 400 tuyaux).",
    },
  );

  const routePoints = [crematorium, berliet];
  if (optional) routePoints.push(optional);
  routePoints.push(auditorium);

  const walkKm = stops.reduce((sum, stop) => sum + stop.walkKm, 0);
  const walkMin = stops.reduce((sum, stop) => sum + stop.walkMin, 0);

  return {
    id: "crematorium-berliet-orgue",
    label: "Crématorium, Berliet, orgue",
    blurb:
      "Matin à pied depuis le 72 route de Vienne, villa Art nouveau sans se presser, puis l’Auditorium : visite libre au plus tardif et concert d’orgue à 18h (places déjà prises).",
    start: "9h15",
    end: "19h15",
    stopCount: new Set(stops.map((stop) => stop.placeId)).size,
    walkKm,
    walkMin,
    stops,
    skipped: [],
    route: [[HOME.lat, HOME.lng], ...routePoints.map((place) => [place.lat, place.lng] as [number, number])],
  };
}

export function proposeSaturdayFromFavorites(favorites: Place[]): SaturdayPlanResult {
  const berliet = mustPlace(VILLA_BERLIET_ID);
  const auditorium = mustPlace(AUDITORIUM_ID);
  const optional = pickOnTheWayFavorite(favorites, berliet, auditorium);
  const proposal = buildCuratedSaturday(optional);
  const sundayOnly = favorites.filter((place) => saturdaySlots(place).length === 0);
  const aside = optional
    ? undefined
    : "Aucun autre favori ne se trouve sur le trajet Montchat → Garibaldi sans détour. Le temps entre la villa et 15h30 va au trajet, puis au dernier créneau de visite libre.";

  return {
    proposals: [proposal],
    sundayOnly,
    saturdayCount: proposal.stopCount,
    favoriteCount: favorites.length,
    aside,
  };
}

export function saturdayPlaceIds(proposal: SaturdayProposal): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const stop of proposal.stops) {
    if (seen.has(stop.placeId)) continue;
    seen.add(stop.placeId);
    ids.push(stop.placeId);
  }
  return ids;
}
