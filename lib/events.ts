import rawEvents from "@/data/events.json";

export type CategoryId =
  | "civic"
  | "community"
  | "health"
  | "festival"
  | "school"
  | "business"
  | "jobs";

export interface EventLink {
  label: string;
  url: string;
}

export interface MaywoodEvent {
  id: string;
  title: string;
  category: CategoryId;
  date: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
  geocoded: boolean;
  description: string;
  links: EventLink[];
}

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: "festival", label: "Festivals & Music", emoji: "🎶", color: "#7c3aed" },
  { id: "community", label: "Community & Picnics", emoji: "🤝", color: "#d97706" },
  { id: "civic", label: "Village Hall in the Park", emoji: "🌳", color: "#2563eb" },
  { id: "health", label: "Health & Wellness", emoji: "🩺", color: "#dc2626" },
  { id: "school", label: "Back to School", emoji: "🎒", color: "#16a34a" },
  { id: "business", label: "Black Business", emoji: "🛍️", color: "#db2777" },
  { id: "jobs", label: "Jobs & Careers", emoji: "💼", color: "#0891b2" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<CategoryId, Category>
);

export const EVENTS: MaywoodEvent[] = (rawEvents as MaywoodEvent[])
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date));

export interface Venue {
  key: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
  events: MaywoodEvent[];
}

export function groupByVenue(events: MaywoodEvent[]): Venue[] {
  const map = new Map<string, Venue>();
  for (const event of events) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    const existing = map.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      map.set(key, {
        key,
        venue: event.venue,
        address: event.address,
        lat: event.lat,
        lng: event.lng,
        events: [event],
      });
    }
  }
  return Array.from(map.values());
}

export const MAYWOOD_CENTER = { lat: 41.8795, lng: -87.8487 };
