# Validation CLI path handling — separate Finalization

This is the bounded documentary closeout of the six validation entrypoint repairs.
It imports no Core Cast B export and changes no runtime/bootstrap assets.

## Actual source and own-main proof

[Source PR72](https://github.com/djconnect-music-dj/djconnect-vibecast-receiver/pull/72)
merged normally after the owner's explicit decision, with expected head
`12a2a3fc8946753d29364d3af6f1257c25be4d7d`. Protected source
`a634e1f79b3b47a37c9e6f09189f3bcd3ac26a6f` has the identical complete Git tree
`2a951148bf33d680f254b21d5643aaccaff6db5a`; its parent is protected main
`92fb2f8c84e76c1e79c292c1c59eb4fb534f65da`. No protection bypass was used.

PR validation45356786178 and projection45356786060 passed. Actual source-main
[Verify receiver45365616297](https://github.com/djconnect-music-dj/djconnect-vibecast-receiver/actions/runs/45365616297)
and projection45365616407 succeeded. This includes the full tests, both browser
engines, immutable bootstrap/QA verification and real two-origin loopback HTTP UI.
The previously measured local owning run passed142 Node and11 Python tests,
including seven causal CLI cases; its declared network/GitHub fixtures are not
production evidence. No test assertions or promotion decisions were relaxed.

All three actual own-main artifact ZIPs were downloaded. Provider digests match
all raw bytes. The existing bootstrap and QA verifiers pass against the exact
source SHA; the HTTP-UI receipt names that SHA, has two browser cases and PASS.
The [machine source receipt](cli-space-paths-source-2026-11-24.json) records their
IDs, SHA-256 values, file counts, build-manifest hashes and scope.

## Finalization and remaining boundaries

This separate candidate changes only this record, its machine source receipt and
REPOSITORY_STATUS. Its own review, normal protected merge and final-main checks
remain pending at preparation. Only after those actual results may this bounded
repository increment be marked MERGED_RECONCILED / FinalizationPending NO.
No recursive documentation Finalization is needed for that external readback.

There is no existing internal release/tag workflow for this CLI increment; no
new release mechanism, semantic version or tag is invented. No production or QA
publication workflow was dispatched. Current production/rollback and pinned
renderer1.1.4 remain as previously recorded; their old observations are not a
new deployment claim. New Cast B import, Apple/native admission, HA installation,
provider calls, physical TV acceptance and native activation remain separate.
The source and proof branches are retained; no source, WIP, lock or recovery
reference is deleted by this closeout. Sole receiver writer; no timer started.
