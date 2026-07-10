// One-time (idempotent) build step: turn each event address into a real lat/lng
// using the Google Geocoding API, then write the coordinates back into
// data/events.json. Runs maybe ~15 calls total (well under the 10k/month free
// tier), so this effectively costs nothing.
//
// Usage (PowerShell):
//   $env:GOOGLE_MAPS_API_KEY="your_key"; node scripts/geocode.mjs
//   node scripts/geocode.mjs --force   # re-geocode everything, even done ones
//
// The key used here should be a SERVER key (no HTTP referrer restriction) with
// only the Geocoding API enabled. It is never shipped to the browser.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "events.json");

const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
const force = process.argv.includes("--force");

if (!apiKey) {
  console.error(
    "Missing GOOGLE_MAPS_API_KEY. Set it first, e.g.\n" +
      '  $env:GOOGLE_MAPS_API_KEY="your_key"; node scripts/geocode.mjs'
  );
  process.exit(1);
}

async function geocode(address) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "us");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const body = await res.json();

  if (body.status !== "OK" || !body.results?.length) {
    throw new Error(`${body.status}${body.error_message ? `: ${body.error_message}` : ""}`);
  }
  const { lat, lng } = body.results[0].geometry.location;
  return { lat, lng, formatted: body.results[0].formatted_address };
}

async function main() {
  const raw = await readFile(dataPath, "utf8");
  const events = JSON.parse(raw);

  let updated = 0;
  for (const event of events) {
    if (event.geocoded && !force) {
      continue;
    }
    try {
      const { lat, lng, formatted } = await geocode(event.address);
      event.lat = Number(lat.toFixed(6));
      event.lng = Number(lng.toFixed(6));
      event.geocoded = true;
      updated += 1;
      console.log(`OK  ${event.title} -> ${lat}, ${lng}  (${formatted})`);
    } catch (err) {
      console.warn(`SKIP ${event.title} @ "${event.address}": ${err.message}`);
    }
  }

  await writeFile(dataPath, JSON.stringify(events, null, 2) + "\n", "utf8");
  console.log(`\nDone. Updated ${updated} of ${events.length} events. Wrote ${dataPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
