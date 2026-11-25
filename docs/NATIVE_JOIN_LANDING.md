# VibeCast Party native join landing

This increment consumes Core's `docs/product/VIBECAST_NATIVE_GUEST_UI_V1.md`.
Core remains the invitation issuer and admission authority. The receiver owns
only the static `https://vibecast.tv/join` open/install landing. This is not a
responsive guest application, session renderer, API proxy or guest identity.

The closed fragment is `v=1`, `ha_url`, `issuer_epoch`, `invitation_id` and
`invitation_secret`, each exactly once. Epoch/ID/secret are respectively
43/32/43 base64url characters. The fragment is at most 2048 characters; the HA
value at most 1024 and a canonical HTTPS origin, optionally ending in `/`.
No userinfo, non-root path, query, fragment, backslash or whitespace is accepted.
Explicit non-default TLS ports are allowed. Unknown fields, duplicated fields,
bad percent encoding, wrong versions and malformed origins fail closed.

The page erases incoming browser fragment/query before presenting controls.
Only the user's **Open DJConnect** action transfers the same validated fragment
to `djconnect://join#...`. The native app must independently validate it and
require Join confirmation before contacting Core. The landing performs no
admission, redemption, service request, automatic app launch or persistence.
It keeps the invitation only in RAM, at most 120 seconds from arrival, clearing
it on use, pagehide or hidden state. This memory ceiling does not extend or
assert the producer's original expiry. A new scan can change an existing tab's
fragment; an equivalent invitation does not renew the exposed invitation.

The App Store target is the existing DJConnect app, ID `6832635823`. After
installation, expiry, page reload or leaving the page, scan the current TV QR
again. No TestFlight invite, deferred-install transfer or Universal Links/AASA
acceptance is fabricated. All instructions are provided in en/nl/de/fr/es.

`bootstrap/public/join.html`, `join.css` and `join.mjs` are included in the
ordinary manifest/hash build. They do not alter the separately imported Cast
renderer. `scripts/readback_bootstrap.mjs` also verifies the clean `/join`
route, exact bytes and full existing privacy/CSP policy when present. It remains
compatible with rollback artifacts that predate this landing.

Golden and unit cases cover malformed/duplicated/oversized locators, unsafe
origins, expiry, one-time handoff, hidden/pagehide, history refusal, five-language
copy and existing-tab rescans. Chromium/WebKit execute the actual built landing
with synthetic, non-redeemable invitations, checking responsive layout, empty
storage, fragment removal and absence of HA/API requests. These software tests
do not qualify an installed iPhone, native launch, QR scan, Core admission,
physical Cast or live production publication.
