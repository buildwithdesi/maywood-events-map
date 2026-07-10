export interface TravelLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  mode: "driving" | "estimate";
}

export interface TravelPoint {
  id: string;
  lat: number;
  lng: number;
}

/** Haversine fallback when Google Routes isn't configured. */
export function estimateLegs(points: TravelPoint[]): TravelLeg[] {
  const legs: TravelLeg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const meters = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    // Rough urban drive: ~25 mph average
    const seconds = Math.max(60, Math.round((meters / 1609.34 / 25) * 3600));
    legs.push({
      fromId: a.id,
      toId: b.id,
      distanceMeters: Math.round(meters),
      durationSeconds: seconds,
      distanceText: formatMiles(meters),
      durationText: formatDuration(seconds) + " (est.)",
      mode: "estimate",
    });
  }
  return legs;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatMiles(meters: number) {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} m`;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} hr ${rem} min` : `${h} hr`;
}
