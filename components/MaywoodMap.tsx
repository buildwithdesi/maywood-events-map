"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  CATEGORIES,
  CATEGORY_MAP,
  EVENTS,
  MAYWOOD_CENTER,
  groupByVenue,
  type CategoryId,
  type MaywoodEvent,
  type Venue,
} from "@/lib/events";
import SiteNav from "@/components/SiteNav";

interface MaywoodMapProps {
  apiKey: string;
  mapId: string;
}

interface DateChip {
  date: string;
  label: string;
}

function chipLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DATE_CHIPS: DateChip[] = (() => {
  const seen = new Map<string, DateChip>();
  for (const event of EVENTS) {
    if (!seen.has(event.date)) {
      seen.set(event.date, { date: event.date, label: chipLabel(event.date) });
    }
  }
  return Array.from(seen.values());
})();

const ALL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

function directionsUrl(event: MaywoodEvent): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`;
}

function MapController({
  venues,
  fitKey,
  focus,
}: {
  venues: Venue[];
  fitKey: string;
  focus: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || venues.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    venues.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lng }));
    if (venues.length === 1) {
      map.setCenter({ lat: venues[0].lat, lng: venues[0].lng });
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, 90);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo(focus);
    const z = map.getZoom() ?? 0;
    if (z < 15) map.setZoom(15);
  }, [map, focus]);

  return null;
}

function VenueMarker({
  venue,
  active,
  onSelect,
}: {
  venue: Venue;
  active: boolean;
  onSelect: (venue: Venue) => void;
}) {
  const primary = venue.events[0];
  const category = CATEGORY_MAP[primary.category];
  const multi = venue.events.length > 1;

  return (
    <AdvancedMarker
      position={{ lat: venue.lat, lng: venue.lng }}
      onClick={() => onSelect(venue)}
      zIndex={active ? 999 : undefined}
      title={venue.venue}
    >
      <div
        style={{
          transform: active ? "scale(1.12)" : "scale(1)",
          transition: "transform 160ms ease",
        }}
        className="relative flex -translate-y-1 cursor-pointer flex-col items-center"
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-lg shadow-lg"
          style={{
            background: category.color,
            boxShadow: active
              ? `0 0 0 4px ${category.color}33, 0 10px 22px -8px rgba(0,0,0,0.6)`
              : "0 8px 18px -8px rgba(0,0,0,0.5)",
          }}
        >
          <span aria-hidden>{category.emoji}</span>
        </div>
        <div
          className="mt-[-3px] h-3 w-3 rotate-45 border-b-2 border-r-2 border-white"
          style={{ background: category.color }}
        />
        {multi && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-ink px-1 text-[11px] font-bold leading-none text-white">
            {venue.events.length}
          </span>
        )}
      </div>
    </AdvancedMarker>
  );
}

export default function MaywoodMap({ apiKey, mapId }: MaywoodMapProps) {
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(ALL_CATEGORY_IDS)
  );
  const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(
    () =>
      EVENTS.filter(
        (e) =>
          (selectedDate === "all" || e.date === selectedDate) &&
          activeCategories.has(e.category)
      ),
    [selectedDate, activeCategories]
  );

  const venues = useMemo(() => groupByVenue(filteredEvents), [filteredEvents]);
  const fitKey = useMemo(
    () => `${selectedDate}|${Array.from(activeCategories).sort().join(",")}`,
    [selectedDate, activeCategories]
  );

  const selectedVenue = useMemo(
    () => venues.find((v) => v.key === selectedVenueKey) ?? null,
    [venues, selectedVenueKey]
  );

  useEffect(() => {
    if (selectedVenueKey && !venues.some((v) => v.key === selectedVenueKey)) {
      setSelectedVenueKey(null);
    }
  }, [venues, selectedVenueKey]);

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVenue(venue: Venue) {
    setSelectedVenueKey(venue.key);
    setFocus({ lat: venue.lat, lng: venue.lng });
  }

  function selectEvent(event: MaywoodEvent) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    setSelectedVenueKey(key);
    setFocus({ lat: event.lat, lng: event.lng });
  }

  const allCategoriesOn = activeCategories.size === ALL_CATEGORY_IDS.length;

  return (
    <APIProvider apiKey={apiKey}>
      <div className="flex h-full w-full flex-col overflow-hidden lg:flex-row">
        {/* Rail */}
        <aside className="order-2 flex w-full flex-col border-line bg-surface lg:order-1 lg:h-full lg:w-[400px] lg:border-r">
          <header className="border-b border-line px-5 pb-4 pt-5">
            <div className="mb-3">
              <SiteNav />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                🌳
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight text-ink">
                Maywood Summer &rsquo;26
              </h1>
            </div>
            <p className="mt-1 text-sm leading-snug text-ink-soft">
              Every summer event across the Village of Maywood on one map. Filter by day,
              tap a pin, get directions. Plan your itinerary in the Planner tab.
            </p>

            {/* Date filter */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Day
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={selectedDate === "all"}
                  onClick={() => setSelectedDate("all")}
                >
                  All
                </FilterChip>
                {DATE_CHIPS.map((chip) => (
                  <FilterChip
                    key={chip.date}
                    active={selectedDate === chip.date}
                    onClick={() => setSelectedDate(chip.date)}
                  >
                    {chip.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  Categories
                </p>
                {!allCategoriesOn && (
                  <button
                    onClick={() => setActiveCategories(new Set(ALL_CATEGORY_IDS))}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => {
                  const on = activeCategories.has(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition"
                      style={{
                        borderColor: on ? category.color : "var(--line)",
                        background: on ? `${category.color}14` : "transparent",
                        color: on ? "var(--ink)" : "var(--ink-soft)",
                        opacity: on ? 1 : 0.6,
                      }}
                    >
                      <span aria-hidden>{category.emoji}</span>
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Event list */}
          <div ref={railRef} className="event-rail flex-1 overflow-y-auto px-3 py-3">
            <p className="px-2 pb-2 text-xs font-medium text-ink-soft">
              {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-2">
              {filteredEvents.map((event) => {
                const category = CATEGORY_MAP[event.category];
                const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
                const active = key === selectedVenueKey;
                return (
                  <li key={event.id}>
                    <button
                      onClick={() => selectEvent(event)}
                      className="w-full rounded-2xl border bg-surface p-3 text-left transition hover:border-brand/60 hover:shadow-sm"
                      style={{
                        borderColor: active ? category.color : "var(--line)",
                        boxShadow: active
                          ? `0 0 0 1px ${category.color}`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                          style={{ background: `${category.color}1a` }}
                          aria-hidden
                        >
                          {category.emoji}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold leading-tight text-ink">
                            {event.title}
                          </p>
                          <p className="mt-1 text-xs font-medium text-brand-dark">
                            {event.dateLabel} · {event.timeLabel}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-soft">
                            📍 {event.venue}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredEvents.length === 0 && (
                <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                  No events match these filters. Try turning categories back on.
                </li>
              )}
            </ul>
          </div>

        </aside>

        {/* Map */}
        <div className="order-1 h-[45vh] w-full lg:order-2 lg:h-full lg:flex-1">
          <GoogleMap
            mapId={mapId}
            defaultCenter={MAYWOOD_CENTER}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            className="h-full w-full"
          >
            <MapController venues={venues} fitKey={fitKey} focus={focus} />
            {venues.map((venue) => (
              <VenueMarker
                key={venue.key}
                venue={venue}
                active={venue.key === selectedVenueKey}
                onSelect={selectVenue}
              />
            ))}
            {selectedVenue && (
              <InfoWindow
                position={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                pixelOffset={[0, -46]}
                onCloseClick={() => setSelectedVenueKey(null)}
                headerDisabled
              >
                <div className="max-w-[280px] p-4 font-body">
                  <p className="font-display text-sm font-bold text-ink">
                    {selectedVenue.venue}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">{selectedVenue.address}</p>
                  <div className="mt-3 flex flex-col gap-3">
                    {selectedVenue.events.map((event) => {
                      const category = CATEGORY_MAP[event.category];
                      return (
                        <div
                          key={event.id}
                          className="border-t border-line pt-3 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-start gap-2">
                            <span aria-hidden>{category.emoji}</span>
                            <div>
                              <p className="font-display text-sm font-semibold leading-tight text-ink">
                                {event.title}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-brand-dark">
                                {event.dateLabel} · {event.timeLabel}
                              </p>
                              <p className="mt-1 text-xs leading-snug text-ink-soft">
                                {event.description}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {event.links.map((link) => (
                                  <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark hover:bg-brand hover:text-white"
                                  >
                                    {link.label}
                                  </a>
                                ))}
                                <a
                                  href={directionsUrl(event)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-dark"
                                >
                                  Directions
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </div>
    </APIProvider>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-semibold transition"
      style={{
        background: active ? "var(--brand)" : "var(--surface-muted)",
        color: active ? "#fff" : "var(--ink-soft)",
        border: active ? "1px solid var(--brand)" : "1px solid var(--line)",
      }}
    >
      {children}
    </button>
  );
}
