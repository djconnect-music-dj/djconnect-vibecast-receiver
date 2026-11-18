# First bootstrap publication route — 2026-10-16

Same issue16, one receiverwriter. Scoped secret-name presence was confirmed after
Peter saved both credentials. Actual protected read-only run
[38927449565](https://github.com/pcvantol/djconnect-vibecast-receiver/actions/runs/38927449565)
SUCCESS on source d0107eacb02b33f170dd24c7a13b740808102058 (protectedPR20).
MainCI38927227018 and projection38927227059 SUCCESS. Independent reviews bound
52a1a89ba29bea97cfab928eb614cf007ac0bf65/tree7527c5fc3ea4102f7ec8e8675ec5ccbf173bdfb4,
identical to main. No bypass. Required environment approval was actually applied
under Peter's explicit owner-selfreview permission. Timer remains paused.

[Actual sanitized receipt](2026-10-16-cloudflare-readiness.json): fixed Direct
Upload project, no Git source, main branch, correct account/zone and complete
DNS inventory **records=[]**. These are actual GET measurements, not guesses.
Read access PASS; write capability NOT_TESTED until controlled publication.
The deployment config now pins this read qualification. This document describes
the reviewed code route; it does not claim a deployment/domain/TLS result.

## Explicit first-publication scope

The existing single dispatch-only Publish VibeCast bootstrap workflow remains the
only upload route. Required owner environment approval, trusted successful
push/main CI, exact current-main artifact, fixed project/account/output,
stale-run rechecks and production concurrency remain mandatory. New config mode
INITIAL_BINDING_ONLY adds a pre-upload check: no existing vibecast.tv Pages
association or root A/AAAA/CNAME. Thus this first-publication rollback cannot be
mistaken for a general update/rollback system for an already live website.
Subsequent live-artifact promotion needs a separately reviewed rollback route.

1. Verify artifact, existing Cast HTTPS bytes/privacy, fixed target and fresh
   complete DNS inventory. Refuse an existing root before any upload.
2. Upload only the tested artifact through pinned Wrangler. Verify all immutable
   HTTPS bytes, hashes, contenttypes, complete artifact-bound headers and404.
3. Only after immutable qualification, recheck main/CI/environment/target, then
   create the exact proxied root CNAME to vibecast-tv-bootstrap.pages.dev and
   retain its confirmed creation ID, then associate exactly vibecast.tv with
   the fixed Pages project. Recheck that exact DNS ID before and after association.
   No update/PUT/patch or guessed ownership of an observed record.
   DNS-first ordering deliberately obtains an attributable creation receipt;
   this initially unused domain can return a provisioning error until the Pages
   association completes. Such a transient state is never publication PASS.
4. Wait at most five minutes for full root HTTPS artifact/readback qualification
   with normal TLS. Repeat the complete hash/header/404 check while provisioning
   propagates; a timeout/final failure remains a failed workflow. Cast again must
   remain exact. There is no root/TLS waiver or local upload workaround.
5. Retain sanitized preflight, immutable URL, source-bound domain mutation receipt,
   root receipt, manifest and any rollback receipt. No token/provider error body
   or raw Wrangler log is uploaded.

This is the separately reviewed staged sequence anticipated by PR19. It replaces
that earlier route's domain/TLS-before-dispatch assumption. Domain/TLS must now
qualify in the same controlled job after the verified immutable artifact and
before any full publication PASS.

## First-binding rollback and limits

Before each mutation, record a pending-operation marker. After a confirmed
response, record the exact created domain/DNS identity. A same-job failure after
association invokes rollback only from that local receipt, bound to the exact
sourceSHA/runID/project/account/zone/domain. It removes only this run's newly
created matching CNAME and association, then independently reads original root
and association state back. Existing matching resources are preserved; changed
resource IDs/destinations and foreign receipts are rejected. Lost/ambiguous
provider responses retain an unresolved audit marker and require reconciliation;
no unknown resource is deleted and no rollback PASS is fabricated.

The first-publication baseline was no root binding and no previous live bootstrap
artifact. Rollback restores only that binding absence. Uploaded Pages artifacts
are retained for diagnosis; no prior live artifact is invented, no Cast-project
rollback or project deletion occurs. An immutable-check failure happens before
any domain binding. Rollback tests are modeled API tests until a live rollback
is actually exercised; report it separately. No unnecessary live DNS toggling
is required to claim those modeled negative checks.

Current SOURCE/CI source stages delivered; actual PAGES/DOMAIN_TLS/rollback write
outcomes remain unexecuted here. Rendezvous contract remains unavailable;
production frontend stays explicitly unavailable without a fake QR. Apple/HA E2E
OPEN and physical TV NOT_RUN. Own Finalization and Core1101 terminal handoff await
actual publication receipts and truthful remaining acceptance disposition.
