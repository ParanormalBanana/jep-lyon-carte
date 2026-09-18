"use client";

import { Clock, Footprints, MapPin } from "lucide-react";
import { places as allPlaces } from "@/lib/catalog";
import {
  formatStopTime,
  type DayPlan,
  type DayPlanStop,
  type DayPlanSuite,
} from "@/lib/day-plans";

function placeName(id: number): string {
  return allPlaces.find((place) => place.id === id)?.name ?? "Lieu";
}

function StopButton({
  stop,
  selectedId,
  onSelect,
}: {
  stop: DayPlanStop;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const active = stop.placeId === selectedId;
  return (
    <button
      type="button"
      onClick={() => onSelect(stop.placeId)}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? "border-primary bg-primary/8 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      }`}
    >
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
        {formatStopTime(stop)}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-snug">{stop.title}</p>
      <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3 shrink-0" />
        {placeName(stop.placeId)}
      </p>
      {stop.note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stop.note}</p> : null}
    </button>
  );
}

function SuiteCard({
  suite,
  selectedId,
  onSelect,
}: {
  suite: DayPlanSuite;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h3 className="font-heading text-base leading-tight">{suite.label}</h3>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Footprints className="size-3.5" />
        {suite.walk}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{suite.blurb}</p>
      <div className="mt-3 space-y-2">
        {suite.stops.map((stop) => (
          <StopButton key={stop.id} stop={stop} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export function DayPlanPanel({
  plan,
  selectedId,
  onSelect,
}: {
  plan: DayPlan;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          <Clock className="size-3.5" />
          {plan.dayLabel}
        </p>
        <h2 className="font-heading mt-1 text-xl leading-tight">{plan.label}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.blurb}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {plan.coreLabel ?? "Sur place, matin → après-midi"}
        </p>
        <ol className="space-y-2">
          {plan.core.map((stop) => (
            <li key={stop.id}>
              <StopButton stop={stop} selectedId={selectedId} onSelect={onSelect} />
            </li>
          ))}
        </ol>
      </div>

      {plan.suites.length ? (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {plan.suitesLabel ?? "Ensuite, une seule suite"}
          </p>
          <div className="space-y-3">
            {plan.suites.map((suite) => (
              <SuiteCard key={suite.id} suite={suite} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
