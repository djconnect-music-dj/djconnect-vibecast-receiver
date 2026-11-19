# Independent bootstrap review and targeted fixes

Assignment DJC-VIBECAST-TV-BOOTSTRAP-CLOUDFLARE-V1-20261015. Same sole writer,
branch codex/vibecast-tv-bootstrap-v1, base cf487797. Peter explicitly authorized
two read-only independent reviewagents in the owning Work chat.

Initial exact review candidate **1f7e0d515349d75ded943f0ba2ced9ce210eb1f0**,
tree28001444d53e4efeef34326236a73600a7922457. Both reviews returned NO-GO;
these initial results are retained and are not relabeled as success.

## Technical/privacy: two P2 findings and fixes

1. Expiry during deadline arming could call expired and then overwrite it with
   waiting/challenge-null. `armDeadline` now returns success, start/reconnect stop
   on expiry, and receive checks current authority before beginning a channel.
   Deterministic independent clock reproduction is covered at both entrypoints.
2. Live readback previously accepted only a CSP/permissions fragment and missed
   frame/HSTS/other policy. It now hash-checks the expected `_headers` artifact
   and compares every full policy value, content type and byte digest. This also
   covers manifest, SHA256SUMS, final clean/index entries and an actual HTTP404
   with exact error-page bytes; an arbitrary or cross-origin redirect fails.
   Negative regressions remove every required header, truncate CSP/permissions,
   and strip security from manifest/clean/error routes. These are local verifier
   tests; production HTTPS/header acceptance still requires real publication.

## Product/UX: one P2 and one P3

- P2: resize/orientation could fractionally scale an old QR raster. Canvas now
  keeps intrinsic integer dimensions; bounded frame-coalesced resize/width-only
  ResizeObserver redraw recomputes scale. It does not request a new challenge,
  renew expiry or alter controller generation. The first herreview on dc4e85f
  found min-content overflow despite an integer canvas: the old fit assertion
  compared against a panel that itself exceeded the viewport. Grid tracks and
  items are now bounded by minmax(0,...) and min-width:0. Actual Chromium/WebKit regression
  exercises landscape→390/320px portrait→landscape in waiting AND confirming,
  both 21x21 and 177x177 synthetic matrices, exact raster/CSS width, module integer
  size, available panel fit, root/panel viewport bounds and unchanged deadline.
- P3: initial qualification wording overstated remote evidence. It now states
  keyboard focus as a desktop proxy; physical remote remains NOT_RUN.

## Actual fix validation

44Node tests +9Python tests PASS. 34actual Chromium156/WebKit27.2 tests PASS,
five languages and both orientations, including all prior cases and the new
resize/viewport regression. Workflow YAML parse/node syntax/diffcheck PASS. Cast
wwwroot/vendor/source locks remain unchanged. No new fixture or service in the
public build; original QR matrices remain explicitly synthetic/non-scannable.

A new exact fix candidate is committed after this freeze record. Its real SHA/
independent re-review identities and outcomes are recorded in owning#10 once
completed; no future GO is invented here. Protected source/CI delivery, new
Pages target/environment/scoped credential, DNS read/binding/TLS, rendezvous,
Apple/HA admission and physical TV acceptance remain separately pending.
