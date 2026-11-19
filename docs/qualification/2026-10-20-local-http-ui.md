# Receiver UI and actual local API HTTP qualification

This is the receiver-owned local integration test selected for receiver16. API
owns service/root/authentication code; Core owns the HA display and shared renderer;
Apple owns scanner, installation selection and actual native proof. No new website.

## Supplying source

Use protected API `828fbaf300ca369dcc753b676295e84094d5e8c6` (PR109+110), with
[separate Finalization](https://github.com/pcvantol/djconnect-api/issues/90#issuecomment-6288860618).
The original root squash-provenance main failure is historical and retained there;
its squash-safe correction has green ownmain qualification. It is not bypassed.
`qualification/http-ui/api-source.json` pins the supplying runtime27e9f5ae and
275 exact source/contract/toolchain-manifest files. Each digest was computed from
that exact protected Git blob. Every file is verified before loading supplying
code and after the test; symlinks and path escapes reject. The runtime's own closed
bundle graph must agree with those pins. Installed dependencies come from its
exact package-lock using `npm ci --ignore-scripts`. Neither npm integrity nor the
launched browser version is whole-engine or installed/native acceptance.

## Reproduce

Prepare a read-only checkout of the exact API revision, install its pinned Node
packages without lifecycle scripts, and install this repository's locked packages
and Chromium/WebKit. Then run:

```sh
npm run test:http-ui -- /absolute/path/to/pinned-api-checkout
```

The receiver CI prepares a separate `.qa/api` checkout at that exact SHA, uses
Node26 and runs the same command. It uses no Cloudflare/account/environment secret.
Source/transport-denial tests are also included in normal `npm test`.
The receipt is `artifacts/http-ui/receipt.json`, uploaded separately from the
bootstrap artifact. The API checkout and qualification receipt never enter
`dist/bootstrap` or `wwwroot`. CI retention is two days.

## What actually runs

The actual source-built BootstrapController, renderState, production HTML markup,
styles, images, wire and bundled rendezvous adapter run in Chromium and WebKit at
390px. In the QA HTTP response only, the production app entry script is removed;
a QA controller uses the unchanged adapter. Its sole transport wrapper maps the
fixed canonical API request prefix to the supplying runtime's random loopback
capability. The QA response CSP permits that loopback API origin. Production
app/CSP are not modified and have no URL/env/window activation hook.

Two ephemeral127.0.0.1 HTTP origins are used. Browser loopback is a secure context
for WebCrypto; this is not public HTTPS. API's pinned driver translates the QA
Origin to canonical vibecast.tv, request URL to canonical API and supplies fixed CF
metadata, then maps response ACAO back. Those are explicit fixtures; no fake
sender authentication, approved HA destination, ready/JWE response or native grant
is supplied. No Playwright route fulfillment/interception substitutes HTTP.

For each engine: real OPTIONS204/create201; waiting UI with visible QR; canvas
pixels independently decoded by jsQR and checked for canonical service/wire/expiry;
actual OPTIONS204/poll200; programmatic cancel through the real adapter with
OPTIONS204/cancel200; pending UI resolves to unavailable and QR disappears.
There is no consume or navigation. The test checks no horizontal overflow,
no JS pageerrors, storage counts zero and API outbound zero. It keeps original
clocks and deadlines, but does not wait120s or claim expiry acceptance.

The sanitized receipt records source hashes, engine/UI state and method/route/status
only. It does not persist decoded QR/capability/claim secret/private keys, raw HTTP
bodies, screenshots, video or traces. Those temporary values necessarily exist in
browser/process memory; storage counters/cleanup are not physical erasure proof.
Browsers, API runtime and HTTP listener close in finally. Failure diagnostics contain
only qualification stage/public source filenames, not request/error payloads.

## Evidence and limits

Parent preflight on receiver684ac017 against exact API candidate dfda533/runtime27e9
passed in both engines, with six real preflights. Both independent reviewers gave
fresh scoped ACK/noP1P2 and separately compared52 actual tracked graph inputs with
candidate Git blobs. Original2386 runtime probe/snapshot and later27e9 proof are
retained independently; no approval is transferred between them. This committed
harness strengthens pre-import source coverage to275 files and needs its own exact
reviews, CI/main artifact and separate Finalization. Actual execution identities
will be reconciled in owning10 after they occur; none is asserted prospectively.

Local development validation:99Node/10Python PASS and two-engine HTTP/UI PASS after
the initial missing imported wire-schema inventory was corrected. Earlier failed
inventories were not counted as PASS. Exact candidate ef1b068 received a technical
P2 NO_GO: the new negative test assumed the macOS temporary path was already
canonical. Its test base now uses realpath(tmpdir()); runtime symlink rejection
is unchanged. The corrected test passed with TMPDIR=/tmp as an alias regression. Ordinary84browser regression and candidate/
main CI remain separate measured checks. No unchanged test reruns imply new effects.

Core's protected8b221d07 B contract and its actual isolated12HAHTTP/WSS-group probe
are supplied evidence, not a receiver rerun or selected-live-installation proof.
App must read normal paired transport/context and owner/context for the explicitly
selected stored HA install. Issuer epoch is a process fence, not installation ID.
A only conveys the authenticated destination; after navigation Core B requires its
own claim/resolve/explicit owner approve/original-browser collect. Receiver does
not create Session/consent/owner/display authority. No fictitious HA endpoint.

SOURCE is local qualification only. CI/main/protected delivery require their own
receipts. PAGES/DOMAIN_TLS are prior delivered hero work, not republished here.
RENDEZVOUS public service stays OFF, production unavailableAdapter/CSPnone/hiddenQR
remain. APPLE_HA_E2E OPEN; PHYSICAL_TV NOT_RUN. Actual App Attest needs a supported
signed target and separately admitted native actions; simulator unsupported is an
honest outcome. No fullchain/native/JWE/HA/directedge/TLS/providerpositive claim.
Timer OFF. Separate review-only Core1.1.2/social work remains preserved.
