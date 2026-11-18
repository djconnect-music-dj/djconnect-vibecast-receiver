# Exact failed-run DNS reconciliation

Protected publication38933359799 onb4dcff6210714d3504fcebcf07aaa6b15e0372a1
qualified immutable https://08f352f0.vibecast-tv-bootstrap.pages.dev completely.
DNS creation confirmed CNAMEd548e42ff358abe72ae62dd6d4a65974, then inspect failed
before saving a root observation. Automatic rollback also failed at inspection.
There is no successful rollback receipt for this run; root record may remain.
No Pages association was created. Do not replay publication over that state.
Previous run38931998230's actual successful rollback remains separate evidence.

This delta adds only safe diagnostics and a single exact recovery selector to
the existing protected read-access workflow. Diagnostics retain fixed endpoint
categories/status, numeric pagination/counts and record-identity booleans; no raw
body, provider messages, TXT/MX contents, arbitrary error text or credentials.
The complete inventory validators are unchanged pending actual diagnosis.
Cloudflare's [DNS list schema](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/list/)
marks pagination fields optional; a missing field is a hypothesis, not a finding.

Default inspect mode performs GET only. Recovery mode restore-run38933359799 is
not a general historical rollback or upload path. It still needs protected main,
trusted successful current mainCI, required environment approval and the shared
production concurrency lock. It downloads only that fixed failed-run artifact,
validates original repository/workflow/event/mainSHA/completion/failure and pins
exact receiptSHA256
7862100cd05a055c8c72d9bed9955fb3f37154d846cf8006dcfa181e9947e4df.
The receipt's schema/target/original absence/confirmed DNS ID/pending-operation
state must match. Current recovery executor and historical mutation identities
are recorded separately. No user-supplied prior run, resource ID or receipt hash.

Before any recovery write, complete current DNS inventory and exact record GET
must succeed; an unexpected Pages association also fails before DNS deletion.
Only the confirmed matching own ID/name/CNAME/proxy destination can be removed.
Any changed/foreign/ambiguous state stops. Read back original root/association
absence before emitting PASS. No upload, new Pages association, DNS replacement,
local credential workaround, bypass or project deletion. If inventory still
fails, recovery does not execute. Diagnose first, correct only established schema
mismatch through review, then retry exact bounded recovery before publication.
