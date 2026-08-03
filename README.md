# Maywood Summer 2026 Events Map

An interactive map of every summer 2026 event across the Village of Maywood, Illinois. Filter by day and category, tap a pin, read the details, and get one-tap directions. Built for Maywood residents.

The map runs on MapLibre GL with free OpenFreeMap vector tiles. **No API key, no billing account, no usage caps to configure.** It just renders.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- `react-map-gl` + `maplibre-gl` (keyless, OpenFreeMap tiles)
- `@phosphor-icons/react` for iconography
- Supabase (service_role) for email gate collection
- Deploy target: Vercel

## Run it

```
npm install
npm run dev
```

Open the dev URL it prints (usually http://localhost:3000, Next.js bumps the port if taken). The map needs zero configuration.

## Email gate

Visitors must enter an email before the map unlocks. Emails land in the
`maywood_event_emails` table on the Digital Alchemy Website Supabase project
(RLS deny-all, service_role only).

Required env vars:

```
SUPABASE_URL=https://dpjhklcjrnqacewnvoue.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EXPORT_SECRET=pick_a_long_random_string
```

Export your list anytime:

The secret goes in a header. It is not accepted from the query string, because
URLs are recorded in server access logs, proxies, and shell history.

```
# JSON
curl -H "x-admin-secret: YOUR_ADMIN_EXPORT_SECRET" \
  "https://YOUR_DOMAIN/api/emails"

# CSV download
curl -OJ -H "x-admin-secret: YOUR_ADMIN_EXPORT_SECRET" \
  "https://YOUR_DOMAIN/api/emails?format=csv"
```

Returning visitors stay unlocked via `localStorage` (they are not re-prompted).

## Events data

Event data lives in `data/events.json`. Each event has a title, category, date, time, venue, address, coordinates, description, and links. Categories and colors are defined in `lib/events.ts`, category icons in `components/CategoryIcon.tsx`.

Events at the same venue (for example the three at Veterans Park) automatically stack into one map pin with a count badge, so the map never gets messy.

To add or edit events, edit `data/events.json`.

## Optional: Google keys (not needed for the map)

The map itself is fully keyless. Two optional server-side features can use a Google key:

- **Travel times in the Planner** (`/api/travel`): uses the Distance Matrix API when `GOOGLE_MAPS_API_KEY` is set, otherwise falls back to straight-line estimates. Works fine without it.
- **Geocode refresh script** (`scripts/geocode.mjs`): snaps pins to Google's exact geocodes. Only needed when addresses change:

```powershell
$env:GOOGLE_MAPS_API_KEY="your_server_key"; node scripts/geocode.mjs
```

These keys are server-only. Never prefix them with `NEXT_PUBLIC_`.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the Supabase env vars (above) in the Vercel project settings.
4. Deploy. No map key setup required.

## Map tiles & attribution

Tiles are served by [OpenFreeMap](https://openfreemap.org) (free, no key, no limits) using OpenStreetMap data. The attribution control on the map satisfies the OSM attribution requirement, leave it visible.

## Troubleshooting

- `ethereum` / `evmAsk.js` console errors are from a crypto wallet browser extension, not this app.
- Ad-blocker `ERR_BLOCKED_BY_CLIENT` noise is harmless.
- If tiles ever fail to load, check https://openfreemap.org status; the style URL is set in `components/MaywoodMap.tsx` (`MAP_STYLE`).
