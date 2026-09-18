"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Filter,
  Heart,
  House,
  MapPin,
  Route,
  Search,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  applyFilters,
  catalog,
  CATEGORY_LABEL,
  categoriesIn,
  CROWD_COLOR,
  CROWD_LABEL,
  defaultFilters,
  districtsIn,
  formatHours,
  groupPlacesByDistrict,
  ITINERARIES,
  officialEventUrl,
  placeCategories,
  places as allPlaces,
  sortPlaces,
  type Filters,
  type Place,
  type SortMode,
} from "@/lib/catalog";
import { DayPlanPanel } from "@/components/day-plan-panel";
import { SaturdayPlanPanel } from "@/components/saturday-plan-panel";
import {
  dayPlanPlaceIds,
  getDayPlan,
  LUGDUNUM_ID,
  LUGDUNUM_SUNDAY,
  orderPlacesForDayPlan,
} from "@/lib/day-plans";
import { useFavorites } from "@/lib/favorites";
import {
  HOME,
  SATURDAY_FROM_HOME_ID,
  proposeSaturdayFromFavorites,
} from "@/lib/saturday-plans";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--map-wash)] text-sm text-muted-foreground">
      Chargement de la carte…
    </div>
  ),
});

function InterestDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${i < value ? "bg-primary" : "bg-primary/20"}`}
        />
      ))}
    </span>
  );
}

function CrowdPill({ crowd }: { crowd: Place["crowd"] }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ background: CROWD_COLOR[crowd] }}
    >
      <Users className="size-3" />
      {CROWD_LABEL[crowd]}
    </span>
  );
}

function FavoriteButton({
  on,
  onToggle,
  name,
}: {
  on: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
    >
      <Heart className={`size-4 ${on ? "fill-primary text-primary" : ""}`} />
    </button>
  );
}

function PlaceCard({
  place,
  active,
  favorite,
  onClick,
  onToggleFavorite,
  hideDistrict = false,
}: {
  place: Place;
  active: boolean;
  favorite: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  hideDistrict?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border transition ${
        active
          ? "border-primary bg-primary/8 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      }`}
    >
      <button type="button" onClick={onClick} className="w-full px-3 py-3 pr-12 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-heading text-[15px] font-medium leading-tight">{place.name}</p>
            {!hideDistrict || place.exceptional ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {hideDistrict ? null : place.district}
                {!hideDistrict && place.exceptional ? " · " : null}
                {place.exceptional ? "ouverture exceptionnelle" : null}
              </p>
            ) : null}
          </div>
          <CrowdPill crowd={place.crowd} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Intérêt <InterestDots value={place.interest} />
          </span>
          {placeCategories(place).map((c) => (
            <span key={c}>{CATEGORY_LABEL[c] ?? c}</span>
          ))}
        </div>
      </button>
      <div className="absolute top-1.5 right-1.5">
        <FavoriteButton on={favorite} onToggle={onToggleFavorite} name={place.name} />
      </div>
    </div>
  );
}

function SortSelect({ value, onChange }: { value: SortMode; onChange: (value: SortMode) => void }) {
  return (
    <select
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value as SortMode)}
    >
      <option value="interest">Trier par intérêt</option>
      <option value="district">Trier par quartier</option>
      <option value="crowd">Les moins fréquentés d&apos;abord</option>
      <option value="name">A → Z</option>
    </select>
  );
}

function PlaceList({
  places,
  sort,
  selectedId,
  favorites,
  onSelect,
  onToggleFavorite,
  emptyMessage,
}: {
  places: Place[];
  sort: SortMode;
  selectedId: number | null;
  favorites: Set<number>;
  onSelect: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  emptyMessage?: string;
}) {
  if (places.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Aucun lieu avec ces filtres. Élargissez le quartier ou l'affluence."}
      </p>
    );
  }

  if (sort !== "district") {
    return (
      <div className="space-y-2">
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            active={place.id === selectedId}
            favorite={favorites.has(place.id)}
            onClick={() => onSelect(place.id)}
            onToggleFavorite={() => onToggleFavorite(place.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupPlacesByDistrict(places).map((group) => (
        <section key={group.district}>
          <h3 className="sticky top-0 z-10 mb-2 bg-background/95 px-1 py-1.5 font-heading text-sm backdrop-blur">
            {group.district}
            <span className="ml-2 text-xs font-sans font-normal text-muted-foreground">
              {group.places.length}
            </span>
          </h3>
          <div className="space-y-2">
            {group.places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                hideDistrict
                active={place.id === selectedId}
                favorite={favorites.has(place.id)}
                onClick={() => onSelect(place.id)}
                onToggleFavorite={() => onToggleFavorite(place.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlaceDetail({
  place,
  favorite,
  onToggleFavorite,
}: {
  place: Place;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const url = officialEventUrl(place);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CrowdPill crowd={place.crowd} />
          {place.price === "reduit" ? (
            <Badge variant="outline">Tarif JEP réduit</Badge>
          ) : (
            <Badge>Gratuit</Badge>
          )}
          {place.exceptional ? <Badge variant="secondary">Ouverture rare</Badge> : null}
          {placeCategories(place).map((cat) => (
            <Badge key={cat} variant="outline">
              {CATEGORY_LABEL[cat] ?? cat}
            </Badge>
          ))}
          {place.reservation === "obligatoire" ? (
            <Badge variant="outline">Réservation obligatoire</Badge>
          ) : place.reservation === "sans" ? (
            <Badge variant="outline">Sans réservation</Badge>
          ) : null}
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <h2 className="font-heading text-2xl leading-tight">{place.name}</h2>
          <Button
            size="sm"
            variant={favorite ? "default" : "outline"}
            onClick={onToggleFavorite}
          >
            <Heart className={favorite ? "fill-current" : ""} />
            {favorite ? "Gardé" : "Garder"}
          </Button>
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          {place.address || place.district}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/70 p-3">
          <p className="text-xs text-muted-foreground">Intérêt</p>
          <p className="mt-1 flex items-center gap-2 font-medium">
            <InterestDots value={place.interest} />
            {place.interest}/5
          </p>
        </div>
        <div className="rounded-lg bg-muted/70 p-3">
          <p className="text-xs text-muted-foreground">Horaires JEP</p>
          <p className="mt-1 font-medium leading-snug">{formatHours(place.hours)}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed">{place.whyGo}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{place.crowdNote}</p>
      {place.summary ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{place.summary}</p>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Animations ({place.events.length})
        </p>
        <ul className="space-y-2">
          {place.events.slice(0, 8).map((event) => (
            <li key={event.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-sm font-medium">{event.name}</p>
              {event.description ? (
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{event.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {url ? (
          <a
            className={buttonVariants()}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Fiche officielle
            <ExternalLink className="size-4" />
          </a>
        ) : null}
        <a
          className={buttonVariants({ variant: "outline" })}
          href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Itinéraire OSM
        </a>
      </div>
    </div>
  );
}

function FiltersForm({
  filters,
  setFilters,
  districts,
  categories,
}: {
  filters: Filters;
  setFilters: (next: Filters) => void;
  districts: string[];
  categories: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filters.scope === "lyon" ? "default" : "outline"}
          onClick={() => setFilters({ ...filters, scope: "lyon" })}
        >
          Lyon ville
        </Button>
        <Button
          size="sm"
          variant={filters.scope === "metro" ? "default" : "outline"}
          onClick={() => setFilters({ ...filters, scope: "metro" })}
        >
          Métropole
        </Button>
        <Button
          size="sm"
          variant={filters.price === "gratuit" ? "default" : "outline"}
          onClick={() =>
            setFilters({
              ...filters,
              price: filters.price === "gratuit" ? "all" : "gratuit",
            })
          }
        >
          Gratuit seulement
        </Button>
        <Button
          size="sm"
          variant={filters.exceptionalOnly ? "default" : "outline"}
          onClick={() => setFilters({ ...filters, exceptionalOnly: !filters.exceptionalOnly })}
        >
          Ouvertures exceptionnelles
        </Button>
        <Button
          size="sm"
          variant={filters.noQueueBias ? "default" : "outline"}
          onClick={() => setFilters({ ...filters, noQueueBias: !filters.noQueueBias })}
        >
          Sans les sites saturés
        </Button>
        <Button
          size="sm"
          variant={filters.favoritesOnly ? "default" : "outline"}
          onClick={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
        >
          <Heart className={filters.favoritesOnly ? "fill-current" : ""} />
          Favoris
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Affluence max.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3, 4] as const).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={filters.maxCrowd === level ? "default" : "outline"}
              onClick={() => setFilters({ ...filters, maxCrowd: level })}
            >
              {CROWD_LABEL[level]}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Intérêt min.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={filters.minInterest === level ? "default" : "outline"}
              onClick={() => setFilters({ ...filters, minInterest: level })}
            >
              {level}+
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Quartier
        </p>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          value={filters.district ?? ""}
          onChange={(e) => setFilters({ ...filters, district: e.target.value || null })}
        >
          <option value="">Tous</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Catégorie
        </p>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          value={filters.category ?? ""}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
        >
          <option value="">Tous</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c] ?? c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function Explorer() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("interest");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const { ids: favorites, toggle: toggleFavorite, count: favoriteCount } = useFavorites();

  const favoritePlaces = useMemo(
    () => allPlaces.filter((place) => favorites.has(place.id)),
    [favorites],
  );
  const saturdayPlan = useMemo(
    () => proposeSaturdayFromFavorites(favoritePlaces),
    [favoritePlaces],
  );
  const saturdayMode = filters.itinerary === SATURDAY_FROM_HOME_ID;
  const activeSaturday = saturdayPlan.proposals[0] ?? null;

  useEffect(() => {
    if (!saturdayMode) return;
    if (!activeSaturday?.stops.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (current && activeSaturday.stops.some((stop) => stop.placeId === current)) return current;
      return null;
    });
  }, [saturdayMode, activeSaturday]);

  const filtered = useMemo(() => {
    if (saturdayMode) {
      if (!activeSaturday) return [];
      const byId = new Map(allPlaces.map((place) => [place.id, place]));
      const seen = new Set<number>();
      const ordered: Place[] = [];
      for (const stop of activeSaturday.stops) {
        const place = byId.get(stop.placeId);
        if (!place || seen.has(place.id)) continue;
        seen.add(place.id);
        ordered.push(place);
      }
      return ordered;
    }
    let list = applyFilters(allPlaces, filters);
    if (filters.favoritesOnly) list = list.filter((place) => favorites.has(place.id));
    const plan = getDayPlan(filters.itinerary);
    if (plan) return orderPlacesForDayPlan(list, plan);
    return sortPlaces(list, sort);
  }, [activeSaturday, favorites, filters, saturdayMode, sort]);

  const emptyListMessage = saturdayMode
    ? undefined
    : filters.favoritesOnly
      ? favoriteCount === 0
        ? "Aucun favori pour l'instant. Le cœur sur une fiche le garde dans ce navigateur."
        : "Aucun de vos favoris ne correspond aux autres filtres."
      : undefined;

  const dayPlan = getDayPlan(filters.itinerary);
  const dayMode = saturdayMode || Boolean(dayPlan);

  const dayPlanRoute = useMemo(() => {
    if (!dayPlan) return null;
    const points: [number, number][] = [[HOME.lat, HOME.lng]];
    for (const id of dayPlanPlaceIds(dayPlan)) {
      const place = allPlaces.find((item) => item.id === id);
      if (place) points.push([place.lat, place.lng]);
    }
    return points;
  }, [dayPlan]);

  const selected = filtered.find((p) => p.id === selectedId) ?? allPlaces.find((p) => p.id === selectedId) ?? null;

  const lyonPool = filters.scope === "lyon" ? allPlaces.filter((p) => p.inLyon) : allPlaces;
  const districts = districtsIn(lyonPool);
  const categories = categoriesIn(lyonPool);

  const stats = catalog.meta.counts;

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b border-border bg-[color-mix(in_oklch,var(--background),var(--primary)_4%)]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                19–20 septembre 2026 · 43e édition
              </p>
              <h1 className="font-heading mt-1 text-3xl leading-none md:text-4xl">
                Journées du patrimoine à Lyon
              </h1>
              <p className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-muted-foreground md:block">
                {stats.gratuit} lieux gratuits recensés dans le programme officiel. Affluence et notes
                d&apos;intérêt sont des estimations pour composer un week-end tenable. Samedi : crématorium,
                Villa Berliet, orgue à 18h. Dimanche : Lugdunum le matin, Guignol et Gadagne l&apos;après-midi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <a className="underline-offset-2 hover:underline" href={catalog.meta.sourceUrl} target="_blank" rel="noreferrer">
                Programme officiel
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                placeholder="Villa Berliet, soie, Fourvière, archives…"
                className="h-10 w-full rounded-lg border border-input bg-card pr-2.5 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={filters.favoritesOnly ? "default" : "outline"}
                onClick={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
              >
                <Heart className={filters.favoritesOnly ? "fill-current" : ""} />
                Favoris
                {favoriteCount ? ` (${favoriteCount})` : ""}
              </Button>
              <Button
                size="sm"
                variant={filters.itinerary === SATURDAY_FROM_HOME_ID ? "default" : "outline"}
                onClick={() => {
                  const next =
                    filters.itinerary === SATURDAY_FROM_HOME_ID ? null : SATURDAY_FROM_HOME_ID;
                  setFilters({ ...filters, itinerary: next });
                }}
              >
                <House className="size-3.5" />
                Samedi crématorium → orgue
              </Button>
              {ITINERARIES.map((it) => (
                <Button
                  key={it.id}
                  size="sm"
                  variant={filters.itinerary === it.id ? "default" : "outline"}
                  onClick={() => {
                    const next = filters.itinerary === it.id ? null : it.id;
                    setFilters({
                      ...filters,
                      itinerary: next,
                    });
                    if (next === LUGDUNUM_SUNDAY.id) setSelectedId(LUGDUNUM_ID);
                  }}
                >
                  {it.id === LUGDUNUM_SUNDAY.id ? <Route className="size-3.5" /> : null}
                  {it.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,400px)_1fr] lg:overflow-hidden xl:grid-cols-[380px_1fr_360px]">
        <aside className="hidden min-h-0 flex-col overflow-hidden border-r border-border lg:flex">
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
            <p className="text-sm">
              <span className="font-heading text-lg">{filtered.length}</span>{" "}
              <span className="text-muted-foreground">lieux</span>
            </p>
            {saturdayMode || dayPlan ? (
              <p className="text-xs text-muted-foreground">Ordre du parcours</p>
            ) : (
              <SortSelect value={sort} onChange={setSort} />
            )}
          </div>
          <Separator />
          <div className="shrink-0 px-4 py-3">
            <FiltersForm
              filters={filters}
              setFilters={setFilters}
              districts={districts}
              categories={categories}
            />
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-3">
              {saturdayMode ? (
                <div className="mb-5 xl:hidden">
                  <SaturdayPlanPanel
                    result={saturdayPlan}
                    selectedId={selectedId}
                    onSelectPlace={setSelectedId}
                  />
                </div>
              ) : dayPlan ? (
                <div className="mb-5 xl:hidden">
                  <DayPlanPanel plan={dayPlan} selectedId={selectedId} onSelect={setSelectedId} />
                </div>
              ) : null}
              <PlaceList
                places={filtered}
                sort={saturdayMode || dayPlan ? "interest" : sort}
                selectedId={selectedId}
                favorites={favorites}
                onSelect={setSelectedId}
                onToggleFavorite={toggleFavorite}
                emptyMessage={emptyListMessage}
              />
            </div>
          </div>
        </aside>

        <section
          className={`relative min-w-0 overflow-hidden lg:h-auto lg:max-h-none lg:min-h-0 ${
            dayMode ? "h-[38vh] max-h-[280px] min-h-[240px]" : "h-[55vh] min-h-[420px]"
          }`}
        >
          <div className="absolute inset-0">
            <MapView
              places={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              home={saturdayMode || dayPlan ? HOME : null}
              route={saturdayMode ? (activeSaturday?.route ?? null) : dayPlanRoute}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap items-start justify-between gap-2 lg:inset-x-4">
            <div className="pointer-events-auto rounded-xl border border-border bg-card/95 p-3 text-xs shadow-sm backdrop-blur">
              <p className="mb-1.5 font-medium">Affluence estimée</p>
              <div className="flex flex-wrap gap-2">
                {([1, 2, 3, 4] as const).map((level) => (
                  <span key={level} className="inline-flex items-center gap-1">
                    <span className="size-2.5 rounded-full" style={{ background: CROWD_COLOR[level] }} />
                    {CROWD_LABEL[level]}
                  </span>
                ))}
              </div>
            </div>
            <div className="pointer-events-auto flex gap-2 lg:hidden">
              <Sheet open={mobileList} onOpenChange={setMobileList}>
                <SheetTrigger render={<Button />}>
                  <Filter />
                  Liste ({filtered.length})
                </SheetTrigger>
                <SheetContent side="bottom" className="flex h-[80dvh] flex-col gap-0 overflow-hidden">
                  <SheetHeader>
                    <SheetTitle>Lieux filtrés</SheetTitle>
                    <SheetDescription>
                      {filtered.length} résultats · {filters.scope === "lyon" ? "Lyon" : "Métropole"}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                    <FiltersForm
                      filters={filters}
                      setFilters={setFilters}
                      districts={districts}
                      categories={categories}
                    />
                    <div className="mt-3">
                      <SortSelect value={sort} onChange={setSort} />
                    </div>
                    <div className="mt-4">
                      <PlaceList
                        places={filtered}
                        sort={saturdayMode || dayPlan ? "interest" : sort}
                        selectedId={selectedId}
                        favorites={favorites}
                        onSelect={(id) => {
                          setSelectedId(id);
                          setMobileList(false);
                        }}
                        onToggleFavorite={toggleFavorite}
                        emptyMessage={emptyListMessage}
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </section>

        {dayMode ? (
          <div className="border-t border-border bg-background px-4 py-5 lg:hidden">
            {saturdayMode ? (
              <SaturdayPlanPanel
                result={saturdayPlan}
                selectedId={selectedId}
                onSelectPlace={setSelectedId}
              />
            ) : dayPlan ? (
              <DayPlanPanel plan={dayPlan} selectedId={selectedId} onSelect={setSelectedId} />
            ) : null}
          </div>
        ) : null}

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border xl:block">
          <div className="p-5">
            {saturdayMode ? (
              <div className="space-y-6">
                <SaturdayPlanPanel
                  result={saturdayPlan}
                  selectedId={selectedId}
                  onSelectPlace={setSelectedId}
                />
                {selected ? (
                  <>
                    <Separator />
                    <PlaceDetail
                      place={selected}
                      favorite={favorites.has(selected.id)}
                      onToggleFavorite={() => toggleFavorite(selected.id)}
                    />
                  </>
                ) : null}
              </div>
            ) : dayPlan ? (
              <div className="space-y-6">
                <DayPlanPanel plan={dayPlan} selectedId={selectedId} onSelect={setSelectedId} />
                {selected ? (
                  <>
                    <Separator />
                    <PlaceDetail
                      place={selected}
                      favorite={favorites.has(selected.id)}
                      onToggleFavorite={() => toggleFavorite(selected.id)}
                    />
                  </>
                ) : null}
              </div>
            ) : selected ? (
              <PlaceDetail
                place={selected}
                favorite={favorites.has(selected.id)}
                onToggleFavorite={() => toggleFavorite(selected.id)}
              />
            ) : (
              <EmptyDetail filters={filters} />
            )}
          </div>
        </aside>
      </div>

      {selected ? (
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-card xl:hidden">
          <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-heading text-lg">{selected.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selected.district} · {formatHours(selected.hours)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FavoriteButton
                on={favorites.has(selected.id)}
                onToggle={() => toggleFavorite(selected.id)}
                name={selected.name}
              />
              <Sheet>
                <SheetTrigger render={<Button size="sm" />}>Fiche</SheetTrigger>
                <SheetContent side="bottom" className="h-[85dvh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{selected.name}</SheetTitle>
                    <SheetDescription>{selected.district}</SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-8">
                    <PlaceDetail
                      place={selected}
                      favorite={favorites.has(selected.id)}
                      onToggleFavorite={() => toggleFavorite(selected.id)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="shrink-0 border-t border-border px-4 py-3 text-center text-[11px] text-muted-foreground">
        {catalog.meta.disclaimer} Thèmes 2026 : {catalog.meta.theme.join(" · ")}.
      </footer>
    </div>
  );
}

function EmptyDetail({ filters }: { filters: Filters }) {
  const itinerary = ITINERARIES.find((i) => i.id === filters.itinerary);
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="flex items-center gap-2 text-primary">
        <Star className="size-4" />
        <p className="font-heading text-xl text-foreground">Comment s&apos;en servir</p>
      </div>
      <p>
        Cliquez un point sur la carte. La couleur indique l&apos;affluence probable, la taille l&apos;intérêt
        patrimonial. Le cœur sur une fiche garde le lieu dans ce navigateur. Samedi : 72 route de Vienne,
        crématorium, Villa Berliet, concert d&apos;orgue à 18h. Dimanche : Lugdunum, Guignol et Gadagne.
      </p>
      <p>
        Le programme officiel recense bien plus que les adresses les plus relayées : Hôtel de Ville, Célestins,
        crypte des Brotteaux, soieries…
      </p>
      {itinerary ? (
        <p className="rounded-lg bg-muted p-3">
          <span className="font-medium">{itinerary.label}. </span>
          {itinerary.blurb}
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          <li>Samedi : crématorium dès le matin, Villa Berliet sans se presser, Auditorium en fin d&apos;après-midi.</li>
          <li>Dimanche : Lugdunum le matin, descente au Vieux-Lyon pour Guignol puis Gadagne.</li>
          <li>Les files se forment dès l&apos;ouverture sur l&apos;Hôtel de Ville et Villa Berliet.</li>
        </ul>
      )}
      <p className="flex items-center gap-2 text-muted-foreground">
        <CalendarDays className="size-4" />
        Thèmes nationaux : photographie, et patrimoine en péril.
      </p>
    </div>
  );
}
