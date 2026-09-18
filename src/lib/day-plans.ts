export const LUGDUNUM_ID = 96337194;
export const GADAGNE_ID = 95004432;
export const GUIGNOL_ID = 93283262;

export type DayPlanStop = {
  id: string;
  start: string;
  end: string | null;
  title: string;
  placeId: number;
  note?: string;
};

export type DayPlanSuite = {
  id: string;
  label: string;
  walk: string;
  blurb: string;
  stops: DayPlanStop[];
};

export type DayPlan = {
  id: string;
  label: string;
  dayLabel: string;
  blurb: string;
  coreLabel?: string;
  suitesLabel?: string;
  core: DayPlanStop[];
  suites: DayPlanSuite[];
};

export const LUGDUNUM_SUNDAY: DayPlan = {
  id: "lugdunum-sunday",
  label: "Dimanche Lugdunum → Guignol",
  dayLabel: "Dimanche 20 septembre",
  coreLabel: "Colline, puis Vieux-Lyon",
  blurb:
    "Matin à Lugdunum (créneaux officiels, sans chevauchement). Le trou de programme 12h10–14h sert à descendre au Vieux-Lyon : coulisses de Guignol à 13h30, puis Gadagne (histoire de Lyon et marionnettes). Tempodysée n’est que le samedi.",
  core: [
    {
      id: "arrivee",
      start: "10:00",
      end: null,
      title: "Arrivée : expo et atelier libre",
      placeId: LUGDUNUM_ID,
      note: "Départ ~9h20 du 72 route de Vienne (métro D → Vieux-Lyon, funiculaire Minimes). Lumières enfouies jusqu’à 18h · Dessinateurs d’histoire jusqu’à 17h30.",
    },
    {
      id: "coulisses",
      start: "10:30",
      end: "11:30",
      title: "Coulisses du patrimoine",
      placeId: LUGDUNUM_ID,
      note: "Chantier de restauration de l’entrée nord du grand théâtre. Même horaire : visite Du site au musée en langue des signes.",
    },
    {
      id: "cyanotype",
      start: "11:30",
      end: "12:10",
      title: "Atelier cyanotype — Lumières révélées",
      placeId: LUGDUNUM_ID,
      note: "Inscription le jour même. Si c’est complet, on raccourcit et on descend plus tôt : les séances de 14h30, 15h30 et 16h30 chevauchent Guignol et Gadagne.",
    },
    {
      id: "guignol",
      start: "13:30",
      end: "14:45",
      title: "Guignol vivant — coulisses",
      placeId: GUIGNOL_ID,
      note: "12h10–13h25 : descente à pied ou Minimes, pause au Vieux-Lyon. 2 rue Louis Carrand, cave du palais Bondy, collection Mourguet. Créneau 13h30–17h ; on ne s’éternise pas pour enchaîner Gadagne.",
    },
    {
      id: "gadagne",
      start: "15:00",
      end: "17:30",
      title: "Gadagne — histoire de Lyon et marionnettes",
      placeId: GADAGNE_ID,
      note: "3 min à pied. Médiation 14h30–17h30, expo L’œil de Mermoz jusqu’à 18h. Conte jonglé « La grande marraine » à 16h15 (1 h, places limitées) si vous restez ; sinon les salles suffisent.",
    },
  ],
  suites: [],
};

export function dayPlanPlaceIds(plan: DayPlan): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const stop of [...plan.core, ...plan.suites.flatMap((suite) => suite.stops)]) {
    if (seen.has(stop.placeId)) continue;
    seen.add(stop.placeId);
    ids.push(stop.placeId);
  }
  return ids;
}

export const LUGDUNUM_SUNDAY_IDS = dayPlanPlaceIds(LUGDUNUM_SUNDAY);

export function getDayPlan(itineraryId: string | null): DayPlan | null {
  if (itineraryId === LUGDUNUM_SUNDAY.id || itineraryId === "sunday-guignol") return LUGDUNUM_SUNDAY;
  return null;
}

export function orderPlacesForDayPlan<T extends { id: number }>(list: T[], plan: DayPlan): T[] {
  const order = new Map(dayPlanPlaceIds(plan).map((id, i) => [id, i]));
  return [...list].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export function formatStopTime(stop: DayPlanStop): string {
  if (!stop.end) return stop.start.replace(":", "h");
  return `${stop.start.replace(":", "h")}–${stop.end.replace(":", "h")}`;
}
