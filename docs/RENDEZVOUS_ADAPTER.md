# Receiver adapter — implementation.1

Receiver16 consumes protected API source2dade83f338ae5f931856934ab0c23b6f6c66f05
and separate Finalization661e5770eb5249b1b02bbdc2426ba7e575fc8881. Exact producer
receipts6272409413/6272559764 satisfy the source release's two conditions.
[Offline fixed inputs](contracts/rendezvous-implementation-1/README.md) bind
wire/schema/pre-QR/Core lexical policy. This is source implementation, not a
qualified live service or actual HA/iPhone/TV acceptance.

## Implementation and authority

`rendezvous.mjs` bundles jose 6.2.15 and qrcode-generator 2.0.4 using esbuild 0.28.2.
The producer's frozen wire profile still records its original jose 6.2.12
test oracle; the consumer dependency update does not repin that contract.
No hand-built OAEP/GCM. Each transaction owns a fresh nonextractable RSA2048 key,
independent32byte claim and RFC7638 thumbprint; private key/claim stay in closure/
WeakMap context and are dropped at retirement. JS references/abort do not prove
secure erasure or server rollback. Strict UTF8/decoded duplicate keys/closed
schemas/canonical base64url, exact compact JWE header/framing, AEAD and complete
transaction/generation/thumbprint/expiry/bootstrap-origin checks precede raw
Core URL validation and replace navigation. There is no central HA fetch,
credential, storage, analytics, screen grant or independent paired-owner proof.

One foreground pre-QR replacement only: max2POST starts, fresh authority and
wiregeneration increment,5s preparation/10s sentattempt/30s interaction. Local
monotone bounds never estimate unknown serverexpiry. Every continuation checks
controller epoch/attempt/phase, foreground and deadline; old attempts are fenced
before abort. Known non201 headers retire before body/deadline handling; complete
invalid201 never replaces. Acceptance/exposure is sticky before render callbacks.

Polls respect >=2s, original120s expiry and60attempt limit; 429/503 hints remain
bounded within the original deadline. Each request is separately aborted on local
timeout before the next request. An uncertain consume is reconciled through poll,
never retried; an explicit canonical quota/service refusal may retry after backoff
and authenticated ready. Server one-time consume is not redefined by a client.
The original implementation used an explicit restart. The no-button receiver
candidate instead rotates an exposed invitation in a foreground page at its
original known deadline. Each rotation uses a fresh adapter, transaction and key.
Authenticated consumed/cancelled and an in-flight or uncertain consume do not
allow rotation. A server expiry received early clears the QR immediately and
keeps the original local deadline. Unknown create/cancel and renderer/context
loss do not reset allowance. Visibility/pagehide/BFCache retires the interaction.
Online/restoration never creates authority. This changes post-QR browser policy,
which requires API/Core review before live promotion. Wire and expiry are unchanged.

## Evidence and remaining limits

New Node tests exercise actual WebCrypto/JWE and independent jsQR1.4.0 decode,
closed wire and Core corpus, bounded loss/replacement/retry, unknown consume,
request abort, late body/keygen and partial rendering. Actual Chromium/WebKit
exercise fetch/WebCrypto/QR/view and DOM lifecycle callbacks. Browser service
responses are explicitly synthetic intercepted fixtures; controlled-clock cases
are marked. They are not live API, native enrollment/AppAttest, HA admission,
actual OS suspension/GC/secure-erasure or physical-TV acceptance.

Independent WIP reviews found and fixed challenge-identity cloning, stuck consume
quota recovery, missing perrequest abort and misleading permanent retry. Regression
coverage includes composed controller+adapter, not only direct adapter calls.
The migration's path-space CLI entry bug was also found: build and verify now use
fileURLToPath so local artifact commands actually execute on Shared Data.

Default app entry still imports unavailableAdapter; CSP connect-src none and
build-manifest rendezvous unavailable remain. No production fixture switch,
window/URL adapter injection or live service configuration was added. Only a later
exact service/configuration adoption and protected review can enable network/CSP.
Live bootstrap promotion needs its separately reviewed update/rollback route;
INITIAL_BINDING_ONLY cannot overwrite the already live root. Branch/main pushes
may redeploy unchanged Cast bytes through its existing Git-connected Pages route.
BrandV2 receiver29 is separately selected but awaits protected Core1224 acceptance;
no candidate branding or renderer fragment is mixed into this adapter import.

Local validation before final review: 88 Node / 10 Python tests PASS (final successful exit); 80 actual
Chromium/WebKit cases PASS (26 new adoption cases, 54 existing regressions).
The first expanded JWE-negative run had86 PASS/1 FAIL: padded tag was rejected
by the closed consume-response schema before the test's expected decrypt stage.
The test now asserts that earlier rejection at the correct boundary; runtime
validation was not relaxed. Initial browser startup also exposed the path-space
CLI bug, then the sandbox's loopback listen restriction; the corrected CLI and
approved loopback run produced the actual browser result. These failed attempts
are not relabeled as successful runs.

A second expanded run exposed a controlled-time fixture error: the hung-poll
scheduler also accelerated the create deadline. It now accelerates10s only while
the selected hung poll signal is active; production deadlines are unchanged.
The final run exited0 with87 Node and10 Python tests PASS; earlier failures stay
recorded above, and no runtime predicate was relaxed.

Final UX review additionally found premature expiry when a server backoff exceeded
remaining lifetime. Source now waits without requests until the original expiry,
then exposes safe explicit retry. The integrated controlled-clock regression
also caught an initial scheduling overshoot; both target and actual scheduled
wait are now clamped. Node+actual DOM/view browser regressions cover this boundary.
Prior technical GO on2df797a is historical; both reviewers must bind the new exact
candidate after this source correction. No review is carried across by inference.
