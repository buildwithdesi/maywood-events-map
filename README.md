# Maywood Summer 2026 Events Map

An interactive Google Map of every summer 2026 event across the Village of Maywood, Illinois. Filter by day and category, tap a pin, read the details, and get one-tap directions. Built for Maywood residents.

Live experience modeled on the Chicago Tech Week map (Monica & Zecco), rebuilt on Google Maps with real geocoded pins, SEO, same-day event stacking, and mobile-first layout.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- `@vis.gl/react-google-maps` (Google's official React wrapper)
- Supabase (service_role) for email gate collection
- Deploy target: Vercel

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

```
# JSON
curl "https://YOUR_DOMAIN/api/emails?secret=YOUR_ADMIN_EXPORT_SECRET"

# CSV download
curl -OJ "https://YOUR_DOMAIN/api/emails?secret=YOUR_ADMIN_EXPORT_SECRET&format=csv"
```

Returning visitors stay unlocked via `localStorage` (they are not re-prompted).

## Events data

Event data lives in `data/events.json`. Each event has a title, category, date, time, venue, address, coordinates, description, and links. Categories and colors are defined in `lib/events.ts`.

Events at the same venue (for example the three at Veterans Park) automatically stack into one map pin with a count badge, so the map never gets messy.

To add or edit events, edit `data/events.json`. Set `"geocoded": false` on any event whose address changed, then re-run the geocode script (below) to refresh its pin.

## Troubleshooting: InvalidKeyMapError

If the console shows `InvalidKeyMapError`, the key is present but Google rejected it. Fix in Google Cloud:

1. **Billing** must be enabled on the project (card on file).
2. Enable **Maps JavaScript API** (APIs & Services → Library).
3. Open the key → **Application restrictions** → HTTP referrers must include:
   - `http://localhost:3000/*`
   - `http://localhost:3001/*`
   - `https://maywood-events-map.vercel.app/*`
   - `https://*.vercel.app/*` (optional, for preview deploys)
4. **API restrictions** → allow at least **Maps JavaScript API**.
5. Wait 1–5 minutes after saving, then hard-refresh the site (Ctrl+Shift+R).

`ethereum` / `evmAsk.js` errors are from a crypto wallet browser extension, not this app.
Ad-blocker `ERR_BLOCKED_BY_CLIENT` on `csp_test` is usually harmless.

## Getting the map running

### 1. Create a Google Cloud project + Maps key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `maywood-events-map`).
2. Enable billing on the project (required even for the free tier). Add a card.
3. Enable these APIs under **APIs & Services > Library**:
   - **Maps JavaScript API** (renders the map)
   - **Geocoding API** (only needed to re-run the geocode script)
4. Go to **APIs & Services > Credentials > Create credentials > API key**. Copy it.

### 2. Lock the browser key down (do NOT skip)

The Maps JavaScript key is exposed in the browser by design, so restrict it so nobody else can use it:

1. Edit the API key in **Credentials**.
2. Under **Application restrictions**, choose **Websites (HTTP referrers)**.
3. Add your domains:
   - `http://localhost:3000/*`
   - `https://your-vercel-domain.vercel.app/*`
   - your custom domain if you add one
4. Under **API restrictions**, restrict the key to **Maps JavaScript API** only.
5. Save.

### 3. Set a budget alert + hard quota cap (so it can never surprise-bill you)

**Budget alert** (emails you, does not stop usage):
1. **Billing > Budgets & alerts > Create budget**.
2. Set the amount to something small like **$5**. Set alert thresholds at 50% / 90% / 100%.

**Hard quota cap** (actually stops overage):
1. **APIs & Services > Maps JavaScript API > Quotas**.
2. Find **Map loads per day** and set a ceiling (e.g. `1000/day`). Once hit, the map stops loading for the rest of the day instead of billing you.
3. Do the same for the Geocoding API if you want (a low cap like `100/day` is plenty).

Free tier is **10,000 map loads/month**, then **$7 per 1,000**. For one town you will almost certainly stay at **$0/month**.

### 4. Add your key locally

Edit `.env.local` and paste the browser key:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your_key
```

Then:

```
npm install
npm run dev
```

Open the dev URL it prints (usually http://localhost:3000). If the map does not show, you left the key blank, that is what the setup screen means.

### 5. (Optional) Refresh pins with real Google geocoding

The pins ship with hand-placed coordinates that are close but not surveyed. To snap every pin to Google's exact geocode, create a **separate server key** (Geocoding API enabled, no referrer restriction), then:

```powershell
$env:GOOGLE_MAPS_API_KEY="your_server_key"; node scripts/geocode.mjs
```

This makes ~15 Geocoding calls (well within the free tier), updates `data/events.json` in place, and marks each event `"geocoded": true`. Re-run with `--force` to redo all of them.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the environment variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (and optionally `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`) in the Vercel project settings.
4. Add your `*.vercel.app` domain to the key's HTTP referrer list (step 2).
5. Deploy.

## Notes

- `.env*` is gitignored, keys never get committed.
- The browser key being public is expected and safe once referrer-restricted.
- The server geocoding key must stay private (never `NEXT_PUBLIC_`).
