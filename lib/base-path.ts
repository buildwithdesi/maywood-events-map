// The app is served by the hub at https://maywood.digitalalchemy.dev/tools/events
// (Vercel external rewrite). next/link and next/navigation add the basePath
// automatically; raw fetch(), document.cookie and window.location do not, so
// they use these constants.
export const BASE_PATH = "/tools/events";
export const SITE_URL = "https://maywood.digitalalchemy.dev/tools/events";

/** Prefix a root-relative path for raw browser APIs (fetch, cookies, URLs). */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
