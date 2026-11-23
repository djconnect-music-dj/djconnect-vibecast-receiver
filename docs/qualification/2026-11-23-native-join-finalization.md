# Native VibeCast Live landing — separate Finalization

This is the documentary closeout of the native open/install landing, separate
from renderer adoption, native admission and physical-device acceptance.

## Protected source and exact artifact

[PR70](https://github.com/djconnect-music-dj/djconnect-vibecast-receiver/pull/70)
merged normally after the owner's candidate-specific decision. Reviewed head
`d71842a0ddd56fb4ac90fc885a3233d547083f66` and protected squash source
`a560756f11531f725e047edce670c76b8a59c0e4` have identical complete Git trees.
No admin bypass, status waiver, force push or branch-protection change occurred.

Exact PR CI45263435807 and projection45263436460 succeeded. Exact protected
main [CI45268052289](https://github.com/djconnect-music-dj/djconnect-vibecast-receiver/actions/runs/45268052289)
and projection45268052239 succeeded. The actual uploaded main artifact
`bootstrap-a560756f11531f725e047edce670c76b8a59c0e4` was downloaded and the
unchanged verifier checked every manifest member against that exact source.
Manifest SHA256:
`cd89a4beecd73f55545cf6c5c8bb9da42dc2d59b5eb8147abcdf7be6f98159fa`.

The source adds the five-language, fragment-erasing, RAM-only `/join` landing
with explicit `djconnect://join` open action and real App Store fallback. It
creates no guest issuer, public guest HTML application, API relay or local
session store. [Contract and validation](../NATIVE_JOIN_LANDING.md).

## Publication and independent readback

The ordinary protected [bootstrap update45268870064](https://github.com/djconnect-music-dj/djconnect-vibecast-receiver/actions/runs/45268870064)
uses the exact artifact above. Its existing `vibecast-production` review gate
was traversed through the normal approved state under the owner's explicit
production authority, bound to source, run, manifest and verified rollback.
The required reviewer remains `pcvantol`, administrator bypass remains disabled,
and all source/provenance/project/header/preview/stale-main/rollback guards remain.

Publication succeeded: deployment `fd9efffd-e751-43fe-bff9-3ab692cf2acb`,
immutable `https://fd9efffd.vibecast-tv-bootstrap.pages.dev`, source
`a560756f11531f725e047edce670c76b8a59c0e4`. The actual workflow receipt is
`qualified`; SHA256 `f780fd63391fba1f42d2b2eefbe93ac28164381f5f2d0b257eac13daf821cddd`.
The workflow artifact and independently downloaded main artifact are identical
across all 26 members. A fresh independent provider read confirmed the production
identity. Both immutable and live root passed the complete unchanged readback
again: all manifest bytes, types, privacy headers, redirects, clean `/join`, and
real missing-route404. Four actual published-page Chromium/WebKit desktop/mobile
smoke cases passed using declared synthetic locators: fragment erased, no storage,
no HA requests, responsive copy, no pageerror. No app/store action was clicked.
[Machine receipt](native-join-publication-2026-11-23.json).

The rollback artifact is independently verified deployment
`71043d3a-cb6e-4352-8bb4-7541ffac9ad9`, source
`553239288cf580293a12ecacee0ab2b5696a22fb`, manifest SHA256
`120093adc3ebc7161766cc6684c8d1fbdc71b5b2cb22ce479b66b5417f89cc47`.
Its actual root HTTPS bytes/types/privacy/redirects/404 passed again before
publication. The unchanged Cast production also passed exact bytes/privacy
readback after the source merge; automatic Cast deployment871b086b has source
`a560756f11531f725e047edce670c76b8a59c0e4`.

## Separate acceptance and final reconciliation

Source, software CI, publication and product acceptance remain separate.
Synthetic browser locators are not real invitations or an installed native
app. Physical TV scanning, installed Apple app opening, Core guest admission,
actual admitted-guest count and real Cast/device acceptance remain unclaimed.
No WIP Core renderer snapshot was imported; receiver renderer1.1.4 is unchanged.

This separate documentation candidate requires its own exact review, normal
PR checks/protected merge and final-main reconciliation. No unsupported product
version or semver tag is invented; this repository has no release automation
for this static-landing increment. Original source/evidence and rollback remain
preserved. No timer or independent producer writer is started by this closeout.
