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
import SiteNav from "@/components/SiteNav";
import { consumeJustUnlocked } from "@/lib/gate";

// Keyless vector tiles. No API key, no billing, no referrer rules.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(ALL_CATEGORY_IDS)
  );
  const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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
          ref={mapRef}
          initialViewState={{
            longitude: MAYWOOD_CENTER.lng,
            latitude: MAYWOOD_CENTER.lat,
            zoom: 13,
          }}
          mapStyle={MAP_STYLE}
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

      {/* Rail */}
      <aside className="order-2 flex min-h-0 w-full flex-1 flex-col border-line bg-surface lg:order-1 lg:h-full lg:w-[400px] lg:flex-none lg:border-r">
        {/* Compact mobile toolbar */}
        <div className="shrink-0 border-b border-line px-3 py-2 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white"
                aria-hidden
              >
                <Tree size={14} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold leading-none text-ink">
                  Maywood &rsquo;26
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
                  {filteredEvents.length} events
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
                aria-expanded={showMobileFilters}
              >
                <Funnel size={12} weight="bold" />
                Filters
              </button>
              <Link
                href="/planner"
                className="flex items-center gap-0.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Plan
                <ArrowRight size={11} weight="bold" />
              </Link>
            </div>
          </div>
          <div className="mt-2">
            <SiteNav />
          </div>
        </div>

        {/* Desktop header + collapsible mobile filters */}
        <header
          className={`shrink-0 border-b border-line lg:px-5 lg:pb-4 lg:pt-5 ${
            showMobileFilters ? "block px-3 pb-3 pt-2" : "hidden lg:block"
          }`}
        >
          <div className="mb-4 hidden lg:block">
            <SiteNav />
          </div>
          <div className="hidden items-center gap-2.5 lg:flex">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white"
              aria-hidden
            >
              <Tree size={20} weight="fill" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold leading-none tracking-tight text-ink">
                Maywood Summer &rsquo;26
              </h1>
              <p className="mt-1 text-xs text-ink-soft">
                Every event in the village, on one map.
              </p>
            </div>
          </div>

          {showWelcome && (
            <div className="mt-3 rounded-xl border border-brand/25 bg-brand-soft px-3 py-2 text-sm text-ink lg:mt-4 lg:rounded-2xl lg:px-4 lg:py-3">
              <p className="font-display text-xs font-semibold lg:text-sm">
                You&rsquo;re in. Tap an event below to start.
              </p>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="mt-1 text-[11px] font-semibold text-brand-dark underline underline-offset-2"
              >
                Got it
              </button>
            </div>
          )}

          <Link
            href="/planner"
            className="group mt-3 hidden w-full items-center justify-between rounded-2xl bg-brand px-4 py-3 text-white transition hover:bg-brand-dark active:scale-[0.98] lg:flex"
          >
            <span className="font-display text-sm font-bold">Plan your day</span>
            <span className="flex items-center gap-1.5 text-xs font-medium opacity-90">
              All events, travel times
              <ArrowRight
                size={14}
                weight="bold"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>

          {/* Date filter */}
          <div className="mt-3 lg:mt-5">
            <p className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft lg:block">
              Day
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          {/* Category filter */}
          <div className="mt-3 lg:mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
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
                    className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition active:scale-[0.97] lg:gap-1.5 lg:px-2.5 lg:py-1 lg:text-xs"
                    style={{
                      borderColor: on ? category.color : "var(--line)",
                      background: on ? `${category.color}12` : "transparent",
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      opacity: on ? 1 : 0.55,
                    }}
                  >
                    <CategoryGlyph
                      id={category.id}
                      size={12}
                      weight="fill"
                      color={on ? category.color : "currentColor"}
                    />
                    <span className="hidden sm:inline">{category.label}</span>
                    <span className="sm:hidden">{category.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Event list — this is the main mobile surface */}
        <div className="relative min-h-0 flex-1">
          <div className="flex items-center justify-between border-b border-line/60 px-3 py-1.5 lg:hidden">
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-soft">
              Scroll events
            </p>
            <CaretDown size={12} className="animate-bounce text-brand" aria-hidden />
          </div>
          <div
            ref={railRef}
            className="event-rail h-full min-h-0 overflow-y-auto overscroll-contain px-3 py-2 lg:px-3 lg:py-3"
          >
            <p className="hidden px-2 pb-2 font-mono text-[11px] font-medium text-ink-soft lg:block">
              {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-1.5 lg:gap-2">
              {filteredEvents.map((event) => {
                const category = CATEGORY_MAP[event.category];
                const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
                const active = key === selectedVenueKey;
                return (
                  <li key={event.id}>
                    <button
                      onClick={() => selectEvent(event)}
                      className="w-full rounded-xl border bg-surface p-2.5 text-left transition hover:border-brand/50 hover:shadow-sm active:scale-[0.99] lg:rounded-2xl lg:p-3"
                      style={{
                        borderColor: active ? category.color : "var(--line)",
                        boxShadow: active ? `0 0 0 1px ${category.color}` : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2.5 lg:gap-3">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 lg:rounded-xl"
                          style={{
                            background: `${category.color}16`,
                            color: category.color,
                          }}
                          aria-hidden
                        >
                          <CategoryGlyph id={event.category} size={15} weight="fill" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-[13px] font-semibold leading-tight text-ink lg:text-sm">
                            {event.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] font-medium text-brand-dark lg:text-[11px]">
                            {event.dateLabel} · {event.timeLabel}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-soft lg:text-xs">
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
                <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                  <MapPin size={22} className="text-ink-soft/60" />
                  <p className="text-sm text-ink-soft">
                    No events match these filters.
                  </p>
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
