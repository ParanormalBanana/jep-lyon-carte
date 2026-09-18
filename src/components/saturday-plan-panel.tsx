"use client";

import { Clock, Footprints, House, MapPin } from "lucide-react";
import { places as allPlaces } from "@/lib/catalog";
import {
  HOME,
  type SaturdayPlanResult,
  type SaturdayStop,
} from "@/lib/saturday-plans";

function placeName(id: number): string {
  return allPlaces.find((place) => place.id === id)?.name ?? "Lieu";
}

function StopButton({
  stop,
  index,
  selectedId,
  onSelect,
}: {
  stop: SaturdayStop;
  index: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const active = stop.placeId === selectedId;
  return (
    <button
      type="button"
      onClick={() => onSelect(stop.placeId)}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
        stop.optional
          ? active
            ? "border-primary border-dashed bg-primary/8 ring-1 ring-primary/30"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-muted/60"
          : active
            ? "border-primary bg-primary/8 ring-1 ring-primary/30"
            : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      }`}
    >
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
        {index + 1} · {stop.arrive}–{stop.leave}
        {stop.optional ? " · optionnel" : ""}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-snug">{stop.title}</p>
      <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3 shrink-0" />
        {placeName(stop.placeId)}
      </p>
      <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
        <Footprints className="mt-0.5 size-3 shrink-0" />
        {stop.walkLabel}
      </p>
      {stop.note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stop.note}</p> : null}
    </button>
  );
}

export function SaturdayPlanPanel({
  result,
  selectedId,
  onSelectPlace,
}: {
  result: SaturdayPlanResult;
  activeId?: string | null;
  selectedId: number | null;
  onSelectProposal?: (id: string) => void;
  onSelectPlace: (id: number) => void;
}) {
  const active = result.proposals[0] ?? null;

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          <Clock className="size-3.5" />
          Samedi 19 septembre
        </p>
        <h2 className="font-heading mt-1 text-xl leading-tight">
          {active?.label ?? "Depuis chez vous"}
        </h2>
        <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
          <House className="mt-0.5 size-4 shrink-0" />
          {HOME.label}, {HOME.district}. Un seul fil : crématorium le matin, Villa Berliet sans se presser,
          Auditorium en fin d’après-midi.
        </p>
      </div>

      {active ? (
        <div>
          <p className="text-xs leading-relaxed text-muted-foreground">{active.blurb}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {active.stopCount} lieux · {active.start}–{active.end} · à pied puis TCL
          </p>
          <ol className="mt-3 space-y-2">
            <li className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <MapPin className="size-3.5" />
                Départ 9h05 · {HOME.label}
              </span>
            </li>
            {active.stops.map((stop, index) => (
              <li key={`${stop.placeId}-${index}`}>
                <StopButton stop={stop} index={index} selectedId={selectedId} onSelect={onSelectPlace} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {result.aside ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          {result.aside}
        </p>
      ) : null}

      {result.sundayOnly.length ? (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            À garder pour dimanche
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {result.sundayOnly.map((place) => (
              <li key={place.id}>
                <button type="button" className="text-left hover:text-foreground" onClick={() => onSelectPlace(place.id)}>
                  {place.name}
                  <span className="text-muted-foreground"> · pas d’horaire samedi</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
