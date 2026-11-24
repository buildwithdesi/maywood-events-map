#!/usr/bin/env bash
# Re-runnable check for the admin lockout. Run against a local `next start`:
#   ADMIN_EXPORT_SECRET=<32+ random chars> npm run start   (other terminal)
#   ADMIN_EXPORT_SECRET=<same value> bash scripts/admin-lockout-test.sh http://localhost:3000/tools/events
# Weak-secret check: start the server with a SHORT secret, then run
#   ADMIN_EXPORT_SECRET=<same short value> bash scripts/admin-lockout-test.sh <base> --short
set -u
BASE="${1:?base url}"; SECRET="${ADMIN_EXPORT_SECRET:?set ADMIN_EXPORT_SECRET}"
URL="$BASE/api/admin/submissions?status=bogus"   # bogus status: auth passes -> 400, no database needed
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
fail=0; check() { if [ "$2" = "$3" ]; then echo "PASS $1 ($2)"; else echo "FAIL $1 expected $3 got $2"; fail=1; fi; }

if [ "${2:-}" = "--short" ]; then
  check "short secret fails closed even with the right value" "$(code -H "x-admin-secret: $SECRET" "$URL")" 503
  check "short secret: wrong value also 503" "$(code -H 'x-admin-secret: nope' "$URL")" 503
  exit $fail
fi

for i in $(seq 1 10); do code -H "x-vercel-forwarded-for: 203.0.113.7" -H "x-admin-secret: wrong-$i" "$URL" >/dev/null; done
check "wrong guess after 10 failures is throttled" "$(code -H 'x-vercel-forwarded-for: 203.0.113.7' -H 'x-admin-secret: wrong-x' "$URL")" 429
check "Retry-After present on 429" "$(curl -si -H 'x-vercel-forwarded-for: 203.0.113.7' -H 'x-admin-secret: wrong-y' "$URL" | grep -ci '^retry-after:')" 1
check "locked bucket: correct secret ALSO gets 429 (no oracle)" "$(code -H 'x-vercel-forwarded-for: 203.0.113.7' -H "x-admin-secret: $SECRET" "$URL")" 429
check "x-forwarded-for is ignored (spoof does not reset)" "$(code -H 'x-vercel-forwarded-for: 203.0.113.7' -H 'x-forwarded-for: 198.51.100.9' -H 'x-admin-secret: wrong-z' "$URL")" 429
check "a different real IP is not locked" "$(code -H 'x-vercel-forwarded-for: 203.0.113.8' -H 'x-admin-secret: wrong-a' "$URL")" 401
# unknown bucket (no address headers) is separate from real IPs
for i in $(seq 1 10); do code -H "x-admin-secret: wrong-$i" "$URL" >/dev/null; done
check "unknown bucket locks on its own" "$(code -H 'x-admin-secret: wrong-u' "$URL")" 429
check "correct secret in a fresh real-IP bucket passes" "$(code -H 'x-vercel-forwarded-for: 203.0.113.50' -H "x-admin-secret: $SECRET" "$URL")" 400
check "locked unknown bucket: correct secret ALSO gets 429" "$(code -H "x-admin-secret: $SECRET" "$URL")" 429
check "real IP still unaffected by unknown bucket" "$(code -H 'x-vercel-forwarded-for: 203.0.113.9' -H 'x-admin-secret: wrong-b' "$URL")" 401
exit $fail
