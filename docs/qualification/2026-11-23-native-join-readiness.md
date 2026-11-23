# VibeCast Live native landing: source and publication preparation

The native-open/install landing implements Core's selected
`VIBECAST_NATIVE_GUEST_UI_V1` consumer slice. See [scope and lifetime](../NATIVE_JOIN_LANDING.md).
It adds no interactive guest website, API call, guest issuer, durable storage
or Universal Link claim. The imported Cast renderer remains byte-identical.

## Actual prior production and rollback binding

Read-only Cloudflare inspection identified the fixed Direct Upload bootstrap
project `a815fc66-5fc2-49d3-812f-28b7401b6643`, production branch `main`, no Git
integration and existing `vibecast.tv` domain. Its actual successful production
is `71043d3a-cb6e-4352-8bb4-7541ffac9ad9`, source
`553239288cf580293a12ecacee0ab2b5696a22fb`. That exact source remains readable
through the repository's GitHub API after the namespace migration.

The previous update-script baseline `fdaa6ab8`/`d211311b` is still a readable
historical artifact, but is not current production. The pin update in this
increment names the observed current deployment, not a bypass or automatic
advance. The current immutable artifact's complete 23-file set was downloaded;
the manifest SHA256 is
`120093adc3ebc7161766cc6684c8d1fbdc71b5b2cb22ce479b66b5417f89cc47`.
Manifest/files/checksums, full HTTPS header/type/hash readback at both the
immutable origin and `https://vibecast.tv` passed using the existing verifiers.
The source `_headers` came from that exact GitHub source revision, not a
reconstructed or relaxed policy. [Machine receipt](2026-11-23-prior-bootstrap.json).

The Cast distribution is separate: read-only inspection identifies the Git
project `djconnect-vibecast-receiver-org`, ID
`e96ab1d1-6ef9-4613-a4c5-5d2158b7bc80`, source repository ID `1324916521`,
owner `djconnect-music-dj`, output `wwwroot`, production `main`, previews enabled
for all branches. Existing production is `51e459a2-a4ac-4296-a1a6-cb2f40e1e625`,
source `1a9ed50335e25597babf59af613660659ed84c12`. Its public Cast bytes and
privacy headers match the unchanged pinned 1.1.4 renderer. A new source branch
may publish unchanged Cast preview bytes; this does not publish the bootstrap
landing or qualify native Cast.

GitHub's `vibecast-production` environment still requires the fixed owner
reviewer, disallows administrator bypass and requires protected branches.
The normal exact-main successful-CI artifact, preview verification, stale-main
fence and same-run rollback checks remain intact. No environment, provider,
DNS, branch-filter or source protection setting was changed during preparation.

## Validation scope

At exact source `9424236c6c7dfbc3054c3353e38b3e8610f4a9a4`, all 135 Node tests,
11 Python tests and 164 Chromium/WebKit cases passed, with production and QA
manifest verification. The later rollback-pin/documentary delta must pass its
own current-source checks and independent review before protected delivery.
An earlier browser run found existing-tab fragment-only rescans were not
processed; the fix and unit/browser regressions are included. The first full
WIP run was rejected by the existing clean-source QA gate; no gate was weakened.

No new production publication is claimed by this preparation. Protected PR/main
checks and exact publication readbacks will identify their own later revisions.
Actual native app launch, guest redemption, iPhone/TV scanning and physical
Cast remain separate owning-lane acceptance, not outcomes of these fixtures.
