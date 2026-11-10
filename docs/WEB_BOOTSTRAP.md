# VibeCast.tv public bootstrap — slice 1

Assignment: DJC-VIBECAST-TV-BOOTSTRAP-CLOUDFLARE-V1-20261015 / [issue16](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/16).
Owning register: #10. Design predecessor: source Core1181/main8a48a6ff,
Finalization1183/main **f32b625eb0a3d1b8abfc2c81378d25d769c6766d**;
[terminal handoff](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/16#issuecomment-6202423207).
Canonical [distribution/trust decisions](https://github.com/pcvantol/djconnect/blob/f32b625eb0a3d1b8abfc2c81378d25d769c6766d/docs/product/VIBECAST_WEB_ENTRY_DISTRIBUTION_V1.md).

## Implementation-contract continuation — 2026-10-19

API protected source2dade83 plus separate Finalization661e5770 and explicit
producerreceipts6272409413/6272559764 now release implementation.1 only. The
[consumer adapter](RENDEZVOUS_ADAPTER.md) and exact offline contract pins are
implemented on the existing receiver writer. Candidate review/delivery status
belongs in owning10; neither source release nor synthetic browser acceptance
qualifies a live service. Production entry remains unavailableAdapter and
connect-src none. No public configuration/activation, bootstrap promotion or
HA/native/physical acceptance is inferred. Historical statements below about
missing source contracts are superseded only for this bounded implementation.

## Source and runtime boundary

`bootstrap/src` and `bootstrap/public` build to **dist/bootstrap**, never wwwroot.
The existing Cast1.1 import, vendor, source locks, origin and AppID are unchanged.
Core owns all shared renderer source. No session UI, Worker, D1, backend, analytics,
third-party font/script, storage or HA/owner credentials are implemented here.

On `https://vibecast.tv`, the browser uses the existing
`djc-rendezvous/1-implementation.1` adapter against `https://api.djconnect.dev`.
The content security policy permits connections to that API origin. The
browser shows the localized unavailable state when the service rejects the
request, including while production returns 503. A verified destination leads
to Home Assistant, which still controls six-digit session admission.

`BootstrapController` is an **internal semantic consumer seam, not a proposed
wire protocol**. The statically imported adapter must
supply create/wait/cancel-by-AbortSignal, challenge validation, destination
verification and exact origin/path/query admission. `contract` is its exact
qualified identity; challenge deadline and boolean QR matrix are internal view
values, not specified API fields. All network/crypto/QR encoding/TTL/endpoint
choices remain producer-owned. No dynamic window adapter, URL-config injection
or dev-fixture switch exists in the public entry. Tests construct explicitly
synthetic, non-scannable matrices; these do not qualify real QR exchange.

The controller retires generations, pending channels and content on new attempts,
expiry, pagehide and terminal results. It rechecks original expiry after each
await and before navigation; reconnect never renews a challenge. A monotonic
bound also prevents wall-clock rollback extending it. Only a verified handoff
may navigate using replace; HTTPS, no userinfo/fragment, exact adapter-owned
origin/path/query validation. Unsolicited query/hash inputs are discarded, never
used for redirection. Verification/network exceptions give recovery without
acceptance; unknown versions fail closed. No credentials enter logs/history/storage.

In a foreground page, an exposed invitation reaching its original deadline
is cleared and the browser requests a new invitation. A denied replacement
shows the unavailable state. Page reload discards the in-memory pairing
context, so the previous invitation cannot be resumed.

## Visual and accessibility implementation

One responsive composition covers landscape TV/desktop and portrait/mobile.
Solid is the initial safe tier. A bounded 45-frame local observation plus actual
CSS support allows Soft/Glass; unavailable features, reduced motion/transparency,
and high contrast force Solid. No UA gating,
telemetry, persistent device identity or looping benchmark. Current sampling is
initial qualification only; thermal/long-running older-TV qualification remains
NOT_RUN. No native Liquid Glass claim.

Opaque QR panel with four-module quiet zone, integer-pixel drawing, no blur or
animation. Only waiting/confirming states expose it; all others erase the canvas. Width-only
ResizeObserver plus a frame-coalesced resize fallback redraws the raster at
integer module sizes after orientation changes, without renewing the challenge.
Locale-complete en/nl/de/fr/es controls/states, live region, semantic headings,
visible focus and 44px controls. Unsupported script engines retain static secure
browser guidance. Browser tests exercise real Chromium and WebKit with production
headers over loopback HTTP (not a production HTTPS or physical-TV receipt).

## Build and qualification

```sh
npm ci --ignore-scripts
npm test
npm run build:bootstrap
npm run build:bootstrap:qa
npx playwright install chromium webkit
npm run test:browser
node scripts/verify_bootstrap.mjs dist/bootstrap "$(git rev-parse HEAD)"
npm run verify:bootstrap:qa -- dist/bootstrap-qa "$(git rev-parse HEAD)"
```

The primary CI job uses Node 24; the separate HTTP/UI qualification job uses
Node 26. `package-lock.json` pins Playwright 1.65.0, Wrangler 4.158.0 and the
browser adapter's bundled jose 6.2.15. There is no runtime npm install on Pages.
The wire parser and schema are compiled into the adapter rather than published
as duplicate standalone modules. Build has no timestamps or machine paths.
Manifest pins sourceSHA, designPin, rendezvous contract identity and
all static file hashes; SHA256SUMS also binds the manifest. The hash file does
not hash itself. Tests compare two builds, deny Cast output, tampering, extra
members and wrong source, and restore exact bytes as local rollback proof.

Run QA qualification from a clean checkout of the exact commit. The QA manifest
binds source and installed module bytes, and the production verifier rejects
the QA artifact. Both builds and the fixture browsers are local evidence;
neither grants QA admission or device acceptance. On macOS the suite uses the
full bundled Chromium and WebKit's Option+Tab button traversal. It still checks
that the next control receives focus and that Enter activates it. Browsers
without a working 2D canvas show the unsupported state before creating a
challenge, and reduced effects still take precedence during frame sampling.

Existing required `test` and `validate-projection` job names remain. PR/main CI
runs Cast plus bootstrap security/state/localization/build regressions, real
Chromium/WebKit tests, artifact verification and uploads bootstrap-<exactSHA>.
No PR job receives Cloudflare secrets. Generated governance is unchanged; only
its separate local extension is widened, and the existing projection validator
passes without manual projection edits.

## Current delivery checkpoint, 2026-10-16

Source PR17 and owner-selfreview delta PR18 are protected delivered. MainCI38865047408
and exact downloaded artifact verification PASS on2e6b8f9f29449d5d07931a0bd4c744518b196b33.
The separate Direct Upload target now exists. Owner-selfreview is applied and read
back; required owner approval, no admin bypass and protected branches remain.
No bootstrap deployment is claimed by this historical checkpoint. See the newer
qualified-access and staged-publication section below. See the
[measured acceptance matrix and next execution steps](qualification/2026-10-16-bootstrap-delivery-checkpoint.md).

The preflight and initial freeze statements below are historical measurements;
they do not override that current checkpoint.

## Historical verified external preflight, 2026-10-15

Existing OAuth Wrangler readback succeeded. Account identity is pinned in
bootstrap/deployment.json, which is not part of the public output. Pages currently
has `djconnect-vibecast-receiver` and `djconnect`; **vibecast-tv-bootstrap does not
yet exist** (API8000007). Cast project's actual build destination is wwwroot,
empty command/root, GitHub integration, main production auto-deploy enabled,
preview setting all, includes *, excludes [], watch all paths. Thus ANY new
branch push can publish an unchanged Cast preview; merge can redeploy existing
Cast production. These are real effect gates even for bootstrap/docs-only changes.
Do not change existing project settings or redirect receiver.djconnect.dev.

vibecast.tv zone exists and is active, nameservers adel/howard.ns.cloudflare.com.
The domain did not resolve at measured HTTPS preflight. OAuth has zone-read but
DNS-record listing returned Authentication error10000: current records remain
UNVERIFIED. Do not guess they are empty or overwrite them. Read DNS configuration
through an owner-authorized DNS-read route before any binding. No account/zone/
DNS/project changes have been made. GitHub secret-name and environment inventories
were empty; local OAuth access is not a minimally scoped CI credential.

## Qualified access and staged first publication

Both scoped secrets were used successfully by protected read-only run38927449565
on d0107eacb02b33f170dd24c7a13b740808102058. Actual complete vibecast.tv DNS inventory
is empty. Fixed Pages target/main/Direct Upload identity matches. Read access is
qualified; edit rights remain NOT_TESTED until the real controlled effect.

The [first-publication route](qualification/2026-10-16-bootstrap-publication-route.md)
now implements immutable upload/readback, then explicit owned root DNS creation and Pages association,
then full TLS/root readback in the same protected job, with same-run binding
rollback on failure. It explicitly refuses an existing live root before upload.
This reviewed staged route supersedes the earlier DNS-before-dispatch ordering;
no check is skipped and no local upload path is introduced. Actual public PASS
still requires the measured workflow receipts.

## Scoped credential and DNS read preflight

Peter confirmed both environment secrets saved on2026-10-16. GitHub secret-name
readback confirms CLOUDFLARE_API_TOKEN and CLOUDFLARE_DNS_API_TOKEN; values are
never retrieved locally. Presence alone is not credential qualification.

Dispatch **Verify VibeCast Cloudflare access** from exact current protected main,
with its successful Verify receiver push/main run id. Required owner environment
approval still applies. The same repository/branch/current-main/trusted-CI and
non-bypassable owner-review checks run before any Cloudflare request. The read
workflow deliberately does not require deployment.json QUALIFIED: it is the
bounded readback needed before that later reviewed qualification.

The two tokens are used separately for GET-only requests to the pinned Pages
project and vibecast.tv zone. Redirects, incomplete/changing pagination, wrong
project/integration/branch or foreign-zone records fail closed. The receipt lists
DNS identity/type/TTL/proxy metadata and A/AAAA/CNAME contents; unrelated TXT/MX
contents and credentials are excluded. Provider error bodies are not logged.
No build dependencies or PR code receive either secret. The sanitized two-day
artifact proves read access only; edit capability, binding, deployment and TLS
remain untested until their own actual controlled effects/readbacks. Review the
real DNS inventory before planning any change; never infer absence from error.

## Owner-approved environment review mode, 2026-10-16

Peter explicitly stated in the owning Workchat: “Ik geef expliciete toestemming
voor owner-selfreview.” Only vibecast-production may permit the required owner
reviewer to approve their own deployment run (prevent_self_review=false).
The promotion guard pins the sole reviewer to pcvantol/user19624891; it also
accepts the stricter true setting. A required approval still blocks the job
until the owner approves it. Independent source reviews, green trusted main CI,
exact artifact/target checks, protected branches and can_admins_bypass=false
remain mandatory. This does not supply the missing scoped Pages credential or
DNS access, qualify deployment.json, or authorize any broader bypass.

## Controlled publication runbook and actual blockers

Proposed isolated Direct Upload target: **vibecast-tv-bootstrap**, fixed output
**dist/bootstrap**, production root **https://vibecast.tv/**. No Git integration
for this new target. Follow Cloudflare's official [Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
and [custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/)
procedures; existing Cast target is not part of provisioning.

1. Independent exact-candidate technical/privacy and product/UX reviews, fixes,
   and candidate-bound owner effect approval before branch push/PR: unchanged
   Cast public preview and protected-main redeploy are disclosed above. Preserve
   exact reviewed SHA/tree; require existing branch checks, no admin bypass.
2. Inspect actual zone records, record prior binding/absence and confirm this
   specific root is unused. Qualified provision: new free Pages Direct Upload
   target in the pinned account, no Worker/functions/service, no paid plan.
   Domain binding/DNS has its own concrete effect gate; never account-wide DNS.
3. Configure **vibecast-production** with the sole required owner reviewer pcvantol (user19624891), owner self-review allowed,
   no admin bypass and protected-main branch policy. Add Pages Edit credential
   restricted to this account with minimal supported scope as environment secret
   CLOUDFLARE_API_TOKEN; set CLOUDFLARE_ACCOUNT_ID variable. Do not reuse local broad
   OAuth, APNs or DNS credentials for CI; no secrets in chat/files/artifacts.
   Actual protected run38927449565 qualified both read routes and empty DNS.
   deployment.json now pins that read qualification, with INITIAL_BINDING_ONLY
   mode. Actual write capability and public root were subsequently qualified by
   run38935679845; the readiness fields remain historical read evidence. Exact DNS
   permission remains separate from the Pages credential.
4. After protected main CI success and exact effect approval, dispatch
   Publish VibeCast bootstrap from main with that main candidate_sha and its
   successful Verify receiver push-run artifact_run_id. Guard checks checkout
   SHA/current main, repository, branch, trusted workflow/event/success, protected
   approval configuration, fixed project/account. It downloads only that trusted
   run's exact named artifact, verifies every byte and fences stale runs again
   immediately before Wrangler. One concurrency group serializes production.
   Project/config unknown, fork/PR/failed/stale/wrong artifact all fail closed.
5. Wrangler deploys only the prebuilt artifact; no rebuild during promotion.
   Measure immutable deployment and custom root, no certificate bypass: expected
   file bytes/types, manifest identity and the complete artifact-bound headerpolicy,
   including cache/referrer/nosniff/frame/HSTS/CSP/permissions on final entries,
   assets, manifest/checksums and the actual HTTP404 page.
   Compare existing Cast HTTPS HTML/manifest/privacy both before and after.
   Save sanitized deployment identity, previous deployment/binding, approvals,
   artifact digest and HTTPS receipts. Workflow failures remain failures, never
   an inferred live PASS. Validate clean index redirect behavior on live host.
6. First-publication rollback baseline is **no root binding** and a pre-created
   isolated Pages project, as measured by the complete empty DNS inventory.
   On failure after binding, restore only this run's newly created matching
   root record/association through its source/run-bound receipt. Unconfirmed
   responses require reconciliation; no unknown resource is deleted. Retain
   uploaded Pages artifacts and sanitized evidence for diagnosis. There was no
   previous live bootstrap artifact to restore; Cast remains untouched.
   Later live-artifact promotion/rollback needs a separately reviewed route;
   current INITIAL_BINDING_ONLY mode rejects an already associated/addressed
   root before upload. No force push or account-wide DNS change.


Actual PUBLIC_WEB_DELIVERY is qualified on source8953171899c47ab54585a626d4041d822822c81e,
mainCI38935324689 and controlled publication38935679845 SUCCESS. Immutable
https://6c5dc927.vibecast-tv-bootstrap.pages.dev and https://vibecast.tv passed
normal TLS, complete artifact hashes/types/headers/redirects/404. Exact scoped
Pages and DNS credentials worked through the protected environment; no local
upload route or broad OAuth credential in CI. Initial-binding rollback/recovery
was actually exercised and original absence read back before final publication.
See [Finalization and measured evidence](qualification/2026-10-16-bootstrap-public-web-finalization.md).

Current INITIAL_BINDING_ONLY mode intentionally rejects the now-existing root
before any subsequent upload. A future live-artifact update/rollback needs its
own reviewed route and concrete candidate; never replay an old cleanup receipt
against the live binding. The old fixed recovery pins reject the current ID.
Timer stays paused. Remaining product gates are qualified rendezvous/TRUST,
HA display admission and Apple scanner/paired-host acceptance, plus physical TV.

## Handoff and acceptance labels

Contract requests: [API90](https://github.com/pcvantol/djconnect-api/issues/90#issuecomment-6201943165),
[Core1101](https://github.com/pcvantol/djconnect/issues/1101#issuecomment-6201943586),
[Apple87](https://github.com/pcvantol/djconnect-app/issues/87#issuecomment-6201943988).
Need exact qualified service/wire/crypto/TTL/browserbinding/redirect rules and
positive/negative fixtures; then static adapter + CSP network allowlist change
gets its own actual review. No receiver-owned server invention.

SOURCE_DELIVERED YES; CI_QUALIFIED PASS; PAGES_DEPLOYED PASS;
DOMAIN_TLS_VERIFIED PASS; RENDEZVOUS_CONNECTED BLOCKED_BY_NAMED_CONTRACT;
APPLE_HA_ONBOARDING_E2E OPEN; PHYSICAL_TV_ACCEPTANCE NOT_RUN.
Live Chromium/WebKit twenty viewport/locale cases PASS_WITH_WARNINGS for the
recorded native-select CSP diagnostic; no CSP relaxation or hidden errors.
Own public-web Finalization is prepared after measured publication; its exact
review/docs-merge/final-main receipts belong in owning10 after execution.
This does not close the integration dependency or establish shared guest/real
CAF/Apple/Cast/LG acceptance.

### Anonymous Access check for the separate QA project

Run `node scripts/readback_qa_access.mjs` before uploading. It checks the custom
QA host, the Pages root and a representative wildcard hostname. After a QA
deployment, pass the eight-character immutable Pages hostname prefix as the
only argument and repeat the check. Each host must redirect the root, build
manifest, browser bundles, checksums and missing-route probe to the account's
Cloudflare Access login. The workflow also checks every route in the verified
artifact inventory. The
receipt contains hostnames and statuses only.

An anonymous redirect establishes the authentication boundary for the routes
probed. Qualify allowed and denied identities separately. For an allowed
identity, verify the deployed artifact bytes, headers and 404 response.

On protected main, the manual **Verify isolated VibeCast QA candidate**
workflow joins that Access check to the exact successful main CI run. It
verifies the GitHub ZIP digest, the QA artifact's source and file inventory,
and that main still matches the selection when the checks end. This workflow
uses read-only GitHub permissions and has no upload step or Cloudflare secret.

### Protected QA preview upload

The manual **Publish isolated VibeCast QA preview** workflow is an
infrastructure qualification step. Run it from protected main only after
reviewing the exact SHA, main CI run, artifact ZIP digest and allowed QA
effect. The `vibecast-qa` job requires explicit owner approval. GitHub permits
owner self-review here, with protected branches and admin bypass disabled.
Use only the separate environment secret `VIBECAST_QA_PAGES_TOKEN` with
account-scoped Cloudflare Pages Edit permission. Never store the production
token, DNS permissions or local Wrangler OAuth in this environment.

The workflow re-verifies the artifact, confirms that the QA Worker is closed,
and uploads only the committed static file inventory to a unique preview branch in the pinned Direct Upload
project with an empty production slot. It checks Access before upload and
again on the immutable URL and branch alias. The preview origin cannot run the
receiver's rendezvous adapter, which is bound to the custom QA hostname.
The preview receipt is an anonymous access check. A permitted tester still
needs to verify HTTPS, bytes, headers and 404 after signing in, and a denied
identity must fail.

Before approving the upload, verify the Cloudflare Access configuration for
all three scopes, including the full wildcard and any overlapping app or
path exceptions. Confirm the permitted identity, deny-by-default behavior,
and the manual stop procedure. Record the review in an owner-authored
comment on receiver issue #10 and pass its ID to the workflow. Use the
following exact lines, substituting the reviewed SHA and ZIP digest:

```text
VibeCast QA preview Access reviewed
Source: <40-character main SHA>
Artifact: sha256:<64-character digest>
Scope: qa.vibecast.tv, vibecast-tv-bootstrap-qa.pages.dev, *.vibecast-tv-bootstrap-qa.pages.dev
Stop: deny and verify exact preview hosts, then revoke QA sessions
```

The owner attestation covers the policy, including the future immutable host
that cannot be probed before creation. On a failed or ambiguous upload, inspect the exact run
branch and SHA in Cloudflare. Apply an explicit deny policy on the immutable
preview and branch alias, check unauthenticated requests on the failing route
and revoke QA sessions. Retain the Access application itself. If an exact
policy cannot intercept the exposed route, keep the incident open and
escalate to the owner for containment of the dedicated QA Pages project. Do not retry on the assumption that a failed command had
no effect. There is no prior QA production deployment for rollback, and Pages
can refuse deletion of a branch's latest preview. Custom-domain publication,
Worker activation and the Apple, HA and Pi trial need separate qualification.

[Cloudflare preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
