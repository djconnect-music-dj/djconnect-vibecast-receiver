# Logo palette background and bounded first live update

Peter explicitly requested the logo colours in the site background. The bootstrap
now uses cyan/electric-blue/violet radial glows on a dark navy/violet base, without
images, animation or extra network requests. Text/button colours stay unchanged.
High contrast or reduced transparency gets the previous flat dark background;
forced colours uses Canvas. This is CSS styling, not adoption of the still-open
Core Brand V2 assets. Generated Cast/Core/API/Apple source remain untouched.

## Measured local evidence and complete publication scope

96 Node and10 Python tests PASS;80 actual Chromium/WebKit cases PASS. Eight extra
actual-source screenshots cover390/1920 widths, both engines and normal/increased
contrast. No horizontal overflow, unavailable state and hidden QR retained; parent
inspected normal desktop and mobile outputs. Browser execution is not physical TV.
Eight new update-route tests exercise fixed target/deployment identity, preview
branch, substituted/oversized prior manifest rejection, unknown/foreign production,
persist-before-mutate and bounded rollback. No live rollback is claimed by them.

The new CSS source delta does NOT mean the live artifact delta is CSS-only. Existing
public8953171 predates the source-only adapter delivery. A current-main promotion
also changes app.mjs/lifecycle.mjs/view.mjs and adds licenses.json/page-lifecycle.mjs/
rendezvous.mjs/wire-schema.mjs/wire.mjs. Exact source/reviews for those inputs are
PR30 plus separate FinalizationPR31. Public app still imports unavailableAdapter,
CSP connect-src none and manifest rendezvous unavailable; no production fixtures,
QR or service configuration are introduced. Review/effect admission must include
that full artifact delta rather than silently publishing it as only CSS.

## Separate update route and recovery

The original INITIAL_BINDING_ONLY workflow/config/gates remain intact. New
bootstrap-update.yml uses the same mandatory non-bypassable owner environment,
exact protected current-main successful push/CI artifact guards, same concurrency
and pinned actions/Wrangler. Only scoped Pages Edit is used; no DNS token/record,
association, project setting or Cast deployment mutation. Fixed project/account,
active vibecast.tv domain and canonical successful production are checked.

This first update is bound to prior production6c5dc927-78d3-41bc-b030-3701d488c5ed,
source8953171899c47ab54585a626d4041d822822c81e and independently trusted prior
manifestSHA256e45709d50718d11e314ccaff8c86950a01bbfa5712dc0b0e6e4ff7e9c0855d29.
A different live baseline requires another reviewed source pin. Read-only local
inspection confirmed that prior production ID and full immutable/root artifacts,
all hashes/headers/entry/404 PASS. Prior content is downloaded from its fixed
immutable origin and verified against that committed manifest digest, never just
its own fetched checksums. _headers is not publicly served by Pages: exact candidate
policy bytes must match the old trusted manifest. Prior root uses the same policy.

The exact tested artifact is uploaded to a qualification preview first. Full preview
HTTPS/hash/header/entry/404 qualifies before a fresh main/production-ownership fence
and the same unchanged artifact upload to main. No rebuild occurs in publication.
Production immutable/root and retained Cast bytes/headers must then pass.

Progress is persisted before production upload/rollback. Failure rollback is allowed
ONLY when current canonical production is the exact confirmed deployment from this
run; it restores the precise prior successful production ID and requalifies the old
root. A foreign canonical deployment or unconfirmed upload is manual reconciliation,
not guessed ownership. Crash/cancellation can interrupt cleanup; automatic rollback
is not guaranteed for every failure. No live rollback test is claimed in advance.
The route deliberately refuses a subsequent update until its prior pin is reviewed.

Cloudflare's [rollback API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/rollback/)
restores successful production deployments; a preview is not promotable via rollback.
This route therefore uploads the same prebuilt bytes twice. Full production receipts,
exact manifests and recovery material are retained in a sanitized workflow artifact
(repository retention2days), with permanent terminal hashes recorded in owning10.

Current source/candidate review, protected merge, trusted main CI, actual workflow
publication and final HTTPS readback remain pending until recorded by the executor.
Brand29 candidate extraction/theme reviews remain local; Core1224 protected delivery,
Finalization/full renderer archive and canonical social-preview handoff remain separate.
RENDEZVOUS live qualification, APPLE_HA_E2E and PHYSICAL_TV remain OPEN/NOT_RUN.
Timer OFF. No new assignment or second writer.
