# Bootstrap slice local qualification checkpoint

Assignment DJC-VIBECAST-TV-BOOTSTRAP-CLOUDFLARE-V1-20261015.
Source branch codex/vibecast-tv-bootstrap-v1, basecf487797. Exact candidate SHA
is Git HEAD after this checkpoint's commit; artifact manifest pins that SHA,
not a self-referential future hash in this document. This is **local-only**.

- Exact predecessor: Core1181 + separate1183, terminal pinf32b625e/handoff6202423207.
- Fresh full hostverify MATCH; initial sandbox-restricted false DRIFT retained.
- Existing Cast24Node+9Python regressions PASS. New16Node tests PASS (40Node total),
  including original expiry, monotonic clock rollback, stale/late/generation,
  reconnect, misbound/unsafe destination, production no-service, locales,
  effects, reproducible builds, tamper/privacy and promotion-negative controls.
- 26 actual Playwright browser tests PASS: Chromium156/WebKit27.2, en/nl/de/fr/es,
  landscape1920x1080/portrait390x844, production no-service/QR suppression,
  unsolicited URL discard, empty storage, no external requests, keyboard
  focus (desktop proxy; physical remote NOT_RUN), preferences/security headers, real browser expiry and localized state UI.
  Test adapters/matrices explicitly synthetic, not a real scannable service QR.
- Two identical builds and exact artifact verifier PASS. Checksum file includes
  manifest and all static assets. Local restore of tampered previous bytes PASS;
  no Cloudflare rollback action executed.
- Projection validator PASS; generated projection/manifest unmodified. Workflows
  parse with Ruby YAML. node --check for application/readback scripts PASS.
- Real Chromium Dutch landscape and portrait PNGs visually inspected: content
  fits, readable opaque panel, no horizontal overflow, controls visible.
- Cast wwwroot/vendor/source-locks: zero diff versus exact base. Prior actual
  HTTPS receiver HTML cdd24ff5 and privacy readback retained from preflight.

Browser-discovered defects corrected before PASS: local testserver incorrectly
404'd root query; native browser clearTimeout called as a controller method
caused Illegal invocation; CSP upgrade-insecure-requests upgraded WebKit loopback
HTTP subresources to nonexistent HTTPS. Timer wrappers fixed production behavior;
no security bypass used. Removed only redundant upgrade directive: CSP self-only
scripts/styles/default-none/connect-none and HTTPS-only verified destinations
remain. Browser fixtures run on HTTP loopback, not deployed HTTPS acceptance.
Original failing traces/logs retained locally; no failed run is relabeled PASS.

Actual account preflight: Wrangler existing OAuth works; Pages lists two existing
projects; new isolated target absent. Existing Cast Git integration auto-deploys
main AND all preview branches, watch all paths, outputwwwroot. vibecast.tv active
zone; DNS record listing10000authenticationerror, no record inventory/overwrite.
CI repo secrets/environments absent at readback. Full details in WEB_BOOTSTRAP.md.

Independent review, source push/PR/remote CI/protected merge, Pages target/environment/
credential qualification, domain/TLS and own Finalization are PENDING. No source-
delivered/Pages/onboarding/physical PASS. Live rendezvous, actual cryptography,
real QR scanning and destination exchange require exact API/TRUST contracts.
Apple/HA six-digit admission, old-TV hardware, thermal/long-duration behavior,
real CAF/Cast/LG/native media acceptance remain separate OPEN/NOT_RUN.
