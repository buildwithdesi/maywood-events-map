"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map as MapLibre, Marker, Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowRight,
  ArrowSquareOut,
  CaretDown,
  Funnel,
  MapPin,
  NavigationArrow,
  Tree,
  X,
} from "@phosphor-icons/react";
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
import { CategoryGlyph } from "@/components/CategoryIcon";
import { useTheme } from "@/components/ThemeProvider";
import SiteNav from "@/components/SiteNav";
import { consumeJustUnlocked } from "@/lib/gate";

// Keyless vector tiles. Style swaps with theme (see globals.css --map-style).
const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

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

function VenuePin({
  venue,
  active,
}: {
  venue: Venue;
  active: boolean;
}) {
  const primary = venue.events[0];
  const category = CATEGORY_MAP[primary.category];
  const multi = venue.events.length > 1;

  return (
    <div
      style={{
        transform: active ? "scale(1.14)" : "scale(1)",
        transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="relative flex cursor-pointer flex-col items-center"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white"
        style={{
          background: category.color,
          boxShadow: active
            ? `0 0 0 5px ${category.color}2e, 0 12px 24px -10px rgba(15, 40, 28, 0.55)`
            : "0 8px 18px -8px rgba(15, 40, 28, 0.45)",
        }}
      >
        <CategoryGlyph id={primary.category} size={18} weight="fill" />
      </div>
      <div
        className="mt-[-4px] h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-white"
        style={{ background: category.color }}
      />
      {multi && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-ink px-1 font-mono text-[10px] font-bold leading-none text-white">
          {venue.events.length}
        </span>
      )}
    </div>
  );
}

export default function MaywoodMap() {
  const { resolved: theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(ALL_CATEGORY_IDS)
  );
  const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consumeJustUnlocked()) setShowWelcome(true);
  }, []);

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

  // Re-fit whenever filters change the visible venue set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || venues.length === 0) return;
    if (venues.length === 1) {
      map.flyTo({
        center: [venues[0].lng, venues[0].lat],
        zoom: 15,
        duration: 700,
      });
      return;
    }
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const v of venues) {
      minLng = Math.min(minLng, v.lng);
      minLat = Math.min(minLat, v.lat);
      maxLng = Math.max(maxLng, v.lng);
      maxLat = Math.max(maxLat, v.lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 90, duration: 700, maxZoom: 15.5 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, mapReady]);

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function focusOn(lat: number, lng: number) {
    const map = mapRef.current;
    if (!map) return;
    const zoom = map.getZoom() ?? 0;
    map.flyTo({ center: [lng, lat], zoom: Math.max(zoom, 15), duration: 600 });
  }

  function selectVenue(venue: Venue) {
    setSelectedVenueKey(venue.key);
    focusOn(venue.lat, venue.lng);
  }

  function selectEvent(event: MaywoodEvent) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    setSelectedVenueKey(key);
    focusOn(event.lat, event.lng);
  }

  const allCategoriesOn = activeCategories.size === ALL_CATEGORY_IDS.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      {/* Map — compact strip on mobile so the event list gets the screen */}
      <div className="order-1 h-[28vh] max-h-[220px] w-full shrink-0 lg:order-2 lg:h-full lg:max-h-none lg:min-h-0 lg:flex-1">
        <MapLibre
          key={theme}
          ref={mapRef}
          initialViewState={{
            longitude: MAYWOOD_CENTER.lng,
            latitude: MAYWOOD_CENTER.lat,
            zoom: 13,
          }}
          mapStyle={MAP_STYLES[theme]}
          onLoad={() => setMapReady(true)}
          onClick={() => setSelectedVenueKey(null)}
          style={{ width: "100%", height: "100%" }}
          attributionControl={{ compact: true }}
        >
          {venues.map((venue) => (
            <Marker
              key={venue.key}
              longitude={venue.lng}
              latitude={venue.lat}
              anchor="bottom"
              style={{ zIndex: venue.key === selectedVenueKey ? 5 : undefined }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                selectVenue(venue);
              }}
            >
              <VenuePin venue={venue} active={venue.key === selectedVenueKey} />
            </Marker>
          ))}

          {selectedVenue && (
            <Popup
              longitude={selectedVenue.lng}
              latitude={selectedVenue.lat}
              anchor="bottom"
              offset={52}
              closeButton={false}
              closeOnClick={false}
              maxWidth="300px"
              onClose={() => setSelectedVenueKey(null)}
            >
              <div className="relative max-w-[280px] p-4 font-body">
                <button
                  type="button"
                  onClick={() => setSelectedVenueKey(null)}
                  aria-label="Close"
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line hover:text-ink"
                >
                  <X size={12} weight="bold" />
                </button>
                <p className="pr-6 font-display text-sm font-bold text-ink">
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
                          <span
                            className="mt-0.5 shrink-0"
                            style={{ color: category.color }}
                            aria-hidden
                          >
                            <CategoryGlyph id={event.category} size={15} weight="fill" />
                          </span>
                          <div>
                            <p className="font-display text-sm font-semibold leading-tight text-ink">
                              {event.title}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] font-medium text-brand-dark">
                              {event.dateLabel} · {event.timeLabel}
                            </p>
                            <p className="mt-1 text-xs leading-snug text-ink-soft">
                              {event.description}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {event.links.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark transition hover:bg-brand hover:text-white"
                                >
                                  {link.label}
                                  <ArrowSquareOut size={10} weight="bold" />
                                </a>
                              ))}
                              <a
                                href={directionsUrl(event)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-dark"
                              >
                                <NavigationArrow size={10} weight="fill" />
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
            </Popup>
          )}
        </MapLibre>
      </div>

      {/* Rail — events own the column; chrome stays thin */}
      <aside className="order-2 flex min-h-0 w-full flex-1 flex-col bg-surface lg:order-1 lg:h-full lg:w-[360px] lg:flex-none lg:border-r lg:border-line">
        {/* Banner + controls — title gets full width, nothing truncates */}
        <div className="shrink-0 border-b border-line px-3 py-3 lg:px-4">
          <div className="rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-soft to-surface px-3.5 py-3 shadow-[0_12px_32px_-24px_var(--shadow-ink)]">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_8px_20px_-12px_rgba(15,122,77,0.65)]"
                aria-hidden
              >
                <Tree size={18} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[17px] font-bold leading-tight tracking-tight text-ink sm:text-lg">
                  Maywood Summer 2026
                </h1>
                <p className="mt-1 text-xs leading-snug text-ink-soft">
                  {filteredEvents.length} events across the village
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                  showFilters
                    ? "border-brand bg-surface text-brand-dark"
                    : "border-line/80 bg-surface/80 text-ink-soft hover:border-brand/30"
                }`}
                aria-expanded={showFilters}
              >
                <Funnel size={13} weight="bold" />
                Filters
              </button>
              <Link
                href="/planner"
                className="group flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark active:scale-[0.98]"
              >
                Plan your day
                <ArrowRight
                  size={13}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          <div className="mt-3">
            <SiteNav />
          </div>

          {showWelcome && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand-soft px-3 py-2">
              <p className="text-xs font-medium text-ink">
                Tap an event to explore the map.
              </p>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="shrink-0 text-xs font-semibold text-brand-dark underline underline-offset-2"
              >
                Got it
              </button>
            </div>
          )}

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className="shrink-0"
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Categories — collapsed by default everywhere */}
        {showFilters && (
          <div className="shrink-0 border-b border-line px-3 py-2 lg:px-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Categories
              </p>
              {!allCategoriesOn && (
                <button
                  onClick={() => setActiveCategories(new Set(ALL_CATEGORY_IDS))}
                  className="text-[10px] font-semibold text-brand hover:underline"
                >
                  Reset all
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((category) => {
                const on = activeCategories.has(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    title={category.label}
                    className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition active:scale-[0.97]"
                    style={{
                      borderColor: on ? category.color : "var(--line)",
                      background: on ? `${category.color}14` : "var(--surface-muted)",
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      opacity: on ? 1 : 0.65,
                    }}
                  >
                    <CategoryGlyph
                      id={category.id}
                      size={11}
                      weight="fill"
                      color={on ? category.color : "currentColor"}
                    />
                    {category.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Event list — primary surface */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-line/70 px-3 py-2 lg:px-4">
            <p className="text-xs font-medium text-ink-soft">
              {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
            </p>
            <CaretDown
              size={12}
              className="text-brand/70 lg:hidden"
              aria-hidden
            />
          </div>
          <div
            ref={railRef}
            className="event-rail min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 lg:px-4 lg:py-3"
          >
            <ul className="flex flex-col gap-1.5">
              {filteredEvents.map((event, index) => {
                const category = CATEGORY_MAP[event.category];
                const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
                const active = key === selectedVenueKey;
                return (
                  <li
                    key={event.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    className="animate-[marker-pop_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
                  >
                    <button
                      onClick={() => selectEvent(event)}
                      className="w-full rounded-xl border bg-surface p-2.5 text-left transition hover:border-brand/40 hover:shadow-[0_8px_24px_-16px_rgba(15,40,28,0.35)] active:scale-[0.99]"
                      style={{
                        borderColor: active ? category.color : "var(--line)",
                        boxShadow: active
                          ? `0 0 0 1px ${category.color}, 0 8px 24px -16px ${category.color}33`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: `${category.color}14`,
                            color: category.color,
                          }}
                          aria-hidden
                        >
                          <CategoryGlyph id={event.category} size={15} weight="fill" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-[13px] font-semibold leading-snug text-ink">
                            {event.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] font-medium text-brand-dark">
                            {event.dateLabel} · {event.timeLabel}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-soft">
                            <MapPin size={11} weight="fill" className="shrink-0" />
                            {event.venue}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredEvents.length === 0 && (
                <li className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-10 text-center">
                  <MapPin size={20} className="text-ink-soft/50" />
                  <p className="text-sm text-ink-soft">No events match these filters.</p>
                </li>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition active:scale-[0.97] lg:px-3 lg:py-1 lg:text-xs ${className}`}
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
