# Bootstrap delivery checkpoint — 2026-10-16

Assignment receiver16, owning receiver10. This checkpoint records delivered
source and measured CI separately from unexecuted public/runtime acceptance.
It is not the assignment Finalization or a replacement producer contract.

## Delivered source and exact evidence

- Source [PR17](https://github.com/pcvantol/djconnect-vibecast-receiver/pull/17):
  candidate a40a51abc088299f3d16f06942ed9636eb64639b, protected main
  b29b6b04ed26aa955df75af4389ce016ba3517d9, identical tree
  a97b964c41158e39ae2b80a38bb2c58000763089. Independent technical/privacy and
  product/UX GO. Linux CI38861929475, projection38861929603 and main38862230799 SUCCESS.
  Earlier Linux QR-resize failures remain failures; the fixed candidate passed
  all34 real Chromium/WebKit browser cases without relaxed assertions.
- Owner-selfreview [PR18](https://github.com/pcvantol/djconnect-vibecast-receiver/pull/18):
  candidate67bf87e9b85f20edbfb355bba59fd26caacd50a4, main
  2e6b8f9f29449d5d07931a0bd4c744518b196b33, identical reviewed tree
  143836d8d773c8109d587ed03c0eee8e9f5a46e1. Both independent reviews GO;
  45Node+9Python local checks PASS. CandidateCI38864853685/projection38864853689
  and [mainCI38865047408](https://github.com/pcvantol/djconnect-vibecast-receiver/actions/runs/38865047408)/projection38865047389 SUCCESS.
- Downloaded actual main artifact bootstrap-2e6b8f9f29449d5d07931a0bd4c744518b196b33:
  exact source identity, full member inventory and every file hash PASS.
  build-manifest.json SHA256
  b07ed1e3524004ceb50a8066386be1dc11c91621604b558d018fd11c487f03bb.
  The artifact belongs to that measured main, not an unknown future docs merge.
- Existing Cast wwwroot/vendor/source locks unchanged. After source and policy
  merges, actual receiver HTTPS HTML/manifest bytes and privacy readbacks PASS.
  This proves distribution, not actual CAF or physical visibility.

Durable measured receipts: owning10/[6210089122](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6210089122).
CI retention is capped by the repository at2days. A verified extracted artifact
is retained at /private/tmp/vibecast16-main-artifact-2e6b8f9, but that local copy
is not a durable release or a substitute for a trusted CI artifact. If the CI
artifact expires before promotion, obtain a fresh successful trusted push/main
run for the current reviewed main; never upload an untrusted replacement under
an old receipt. No file cleanup is authorized by this checkpoint.

## External configuration and remaining access

Separate Pages Direct Upload project vibecast-tv-bootstrap exists, no Git source:
project a815fc66-5fc2-49d3-812f-28b7401b6643, account
 efe77cadf8317a53832fca0848e3ae51. No bootstrap artifact was uploaded.
Production root remains https://vibecast.tv; existing receiver project and origin
are separate and retained.

Peter authorized Cloudflare deployment and explicitly owner-selfreview. Actual
vibecast-production: sole required User pcvantol/id19624891,
prevent_self_review=false, can_admins_bypass=false, protected branches only.
An approval is still mandatory. Prior setting retained for rollback; exact
configuration receipt is owning10/[6210044260](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6210044260).
No repeat generic merge/deploy/selfreview approval is needed within this scope.

At this checkpoint the environment secret inventory is empty. Required minimum
owner action: add an account-scoped Cloudflare Pages Edit token as
CLOUDFLARE_API_TOKEN in repository environment vibecast-production. Keep DNS
read/edit access separately bounded to vibecast.tv. Do not send secrets in chat.
Existing OAuth cannot list DNS records (10000) or issue scoped tokens (9109);
no broad OAuth is reused in CI. No records are assumed empty or overwritten.

## Acceptance matrix and next measured action

| Category | Current evidence | Next required evidence |
| --- | --- | --- |
| SOURCE_DELIVERED | YES, PR17/18 exact tree and protected merge | Checkpoint docs exact candidate/main readback after their own delivery |
| CI_QUALIFIED | PASS source/build/browser/artifact | Current-main trusted artifact for actual promotion |
| PAGES_DEPLOYED | NOT_RUN_ACCESS_GATE | Scoped credential, qualified fixed config, approved environment job; immutable HTTPS/hash/full-header readback |
| DOMAIN_TLS_VERIFIED | NOT_VERIFIED | Actual DNS inventory/prior binding, bounded binding, valid TLS and root/redirect/contenttype/hash/header/404 readback |
| RENDEZVOUS_CONNECTED | BLOCKED_BY_NAMED_CONTRACT | Exact API/TRUST producer pin with positive/negative fixtures; reviewed static adapter and CSP |
| APPLE_HA_ONBOARDING_E2E | OPEN | Qualified Apple scanner and HA display two-step admission, real destination and separate six-digit approval |
| PHYSICAL_TV_ACCEPTANCE | NOT_RUN | Real target/browser/device receipt; QR readability, performance/effects/accessibility and handoff/expiry/recovery on hardware |

The physical matrix is a prepared acceptance list, not a device reservation or
hardware test result. Service tests use synthetic fixtures only; public entry
remains explicitly unavailable and emits no fake QR or service request.

## Publication continuation and rollback

1. Verify scoped credential availability without logging it, actual environment
   protection and fixed target. Qualify deployment.json through independent
   reviews, required CI and protected merge; leave it unqualified before then.
2. Before workflow dispatch, inventory DNS through a real authorized route,
   preserve prior values, execute only the bounded approved binding and establish
   domain/TLS readiness. The current workflow requires root readback in the same
   run. If actual Pages activation cannot complete before first publication,
   stop: a separately reviewed staged workflow is needed; no local upload or
   skipped root check is authorized by this document.
3. Once those prerequisites hold, use the exact current-main successful trusted
   CI artifact, verify its manifest and every member, dispatch the protected
   workflow and provide required owner approval.
4. Read actual immutable deployment and root with normal TLS, all expected
   hashes/contenttypes and artifact-bound cache/referrer/CSP/permissions policy,
   clean/index redirect and true404. Read existing Cast before and after.
5. On failure remove only the newly added binding/restore exact prior values;
   no Cast-project rollback or unrelated DNS changes. For later artifact rollback
   use a dedicated reviewed candidate and the controlled workflow; normal
   stale-main protection intentionally rejects arbitrary old runs.
6. Record actual receipts separately, then own protected Finalization and terminal
   Core1101 handoff. Leave unqualified onboarding/physical outcomes visibly open.

Requests remain [API90](https://github.com/pcvantol/djconnect-api/issues/90#issuecomment-6201943165),
[Core1101](https://github.com/pcvantol/djconnect/issues/1101#issuecomment-6201943586),
[Apple87](https://github.com/pcvantol/djconnect-app/issues/87#issuecomment-6201943988).
No producer implementation, new receiver slice or full-product completion is
inferred from this document. Source/evidence work remains within issue16.
