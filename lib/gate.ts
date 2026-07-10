const STORAGE_KEY = "maywood-events-gate-v1";
const COOKIE_NAME = "maywood_gate";

export interface GateRecord {
  email: string;
  at: number;
}

/** One unlock per browser. localStorage + cookie backup so it sticks. */
export function hasGateUnlock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GateRecord>;
      if (parsed.email) return true;
    }
  } catch {
    // fall through to cookie
  }
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAME}=1`));
}

export function persistGateUnlock(email: string) {
  const record: GateRecord = { email: email.toLowerCase(), at: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  // 1 year — same browser, don't re-ask
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  sessionStorage.setItem("maywood-just-unlocked", "1");
}

export function consumeJustUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  const flag = sessionStorage.getItem("maywood-just-unlocked");
  if (!flag) return false;
  sessionStorage.removeItem("maywood-just-unlocked");
  return true;
}

export { STORAGE_KEY };
