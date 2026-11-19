# Readonly renderer retirement — existing receiver #16

This is the same receiver writer and the explicit downstream retirement input
from Core1101/comment6244193488. Core source PR1202 merge
`5f36abd23a95dea0aeb8bdb9d22a9bccf28a1a4b` and separate Finalization PR1203
`6a3adbc8e66ab380dfea1726ca34728097d0c684` are protected delivered.
The consumer imports published bytes; it does not build or patch Core HTML.
No second writer or separate rendezvous/Apple/Core source change is introduced.

## Pins and bounded delta

`vibecast-source-lock.json` pins the immutable release
`internal-ha-6a3adbc8e66ab380dfea1726ca34728097d0c684` and its
`vibecast-readonly-6a3adbc8.tar.gz`:

- Bundle SHA256: `205eccf041fa56d0fb72c0168499d99644fb28587d51d72c551679bd73efbf34`.
- Manifest SHA256: `ee18b3d9f45341ae522d2406a087c009da48a67a99d7da3e1cbbdf483a5a09d2`.
- Shared renderer SHA256: `6738ebd1676c82fbd07b435508052f87aae22f1bdd97e46485f91cf1622b7b7d`.
- Cast HTML SHA256: `cf4421778d093e130b46866b98ca1ab72b142e5359a1a6d43ea082c1e79e9fab`.
- Original verifier SHA256: `f24cd2814fc87557142e9892f816075c55d1ea93846274c2c2121dd26e30ba13`.
- Unchanged status-schema SHA256: `585d4771f2b38aa3228522a1d0f9872a2ee0149e6f1129c804c1e4840e2e83ae`.

The machine-readable producer handoff is retained at
[core-readonly-handoff-6a3adbc8.json](qualification/core-readonly-handoff-6a3adbc8.json).
Build/status version remains 1.1.0; revision/digests distinguish this import.
All previous bundles/verifiers and the exact prior lock
`vibecast-source-lock-1.1.0.json` remain available for recovery.

Independent archive comparison against d7396554 shows removal of end-grant
storage, button/labels/styles/listener and the HTTP Session-end POST only.
CAF and local adapters, verifier and status schema are unchanged. Genuine
server end still clears the view. A directly injected legacy grant is ignored;
closing the view is not a Session-end command. The Core compatibility endpoint
returns 410 without effects, but that endpoint is not implemented or installed
by this repository. Ordinary paired-owner Session end remains Core-owned.

## Receiving qualification

`npm test` runs the unchanged Core import verifier, adversarial importer tests,
status/lifecycle/privacy regressions and direct renderer execution in five
languages. A disposable-root recovery test restores the exact former Cast HTML
`cdd24ff51d0719d07d0929d7ab6c988df1b77e10b753f06028ad13b3caad9a14`, then
reapplies and checks the readonly import. No live rollback is performed.

`npm run build:bootstrap` and `npm run test:browser` preserve the separate
bootstrap artifact. Twenty added Chromium/WebKit cases execute exact imported
HTML in five languages and portrait/landscape. They inject a legacy grant,
verify absence of the end control/HTTP commands and apply a genuine server-end
frame. CAF/HA and content are modeled; browser execution is real. This is not
physical TV, actual CAF, native sender, live HA or installed B acceptance.

## Publication and rollback

Fresh read-only Pages preflight identifies project
`djconnect-vibecast-receiver`/`06cb62de-b992-44b0-8126-3da4689320c0`, GitHub source,
main production, preview all branches, no build command, output `wwwroot`.
Domains stay `receiver.djconnect.dev` and `djconnect-vibecast-receiver.pages.dev`;
Cast AppID8EA92910 is retained. A source push creates a public preview, and a
protected main merge automatically publishes production. No Git filter/domain/
configuration change or manual upload is part of this import. The separate
Direct Upload bootstrap project is not dispatched.

Only after exact independent review and required green checks may the existing
owner-authorized push/merge/deploy route proceed. Read back new preview and
production immutable/root/index/manifest HTTPS bytes, types and privacy headers;
retain exact source/tree/deployment receipts. Source review is not publication.
If readback fails, use the reviewed protected recovery route: restore prior lock,
archive/verifier and both generated outputs together; test, review and promote
that revert normally. Do not force-push or use a local upload/config bypass.
The offline recovery test does not claim live recovery. Old cached content can
persist; Core's retired endpoint is the server-side compatibility boundary.

Separate Finalization follows actual source/CI/Pages evidence. At preparation,
new source delivery/Pages/Finalization are pending; owning#10 records execution
identities only after they occur. A and B integration and physical/native
acceptance remain open. The timer stays paused.

## Actual source/publication evidence

Source PR27 protected merged `954cce58fb6fe0a209a6ea1812bdad5a92c6a4d8`, tree
`cd47d48676892f1dfe51f2c00b1e9af3ab755294` exactly equals the reviewed1f03371 tree.
Required PR CI39086709418 and source-mainCI39086846662, projection39086846661 PASS.
66Node/10Python/54real-engine browser tests pass;20new Cast cases retain modeled
CAF/HA boundaries. Two exact independent reviews GO, with independent runtime
and browser execution. Previewcd84aa35 and production4aa9e79d each passed new
HTTPS/exact-byte/type/privacy checks. See the separate measured
[Finalization record](qualification/2026-10-18-readonly-renderer-finalization.md)
and [machine receipt](qualification/readonly-renderer-publication-2026-10-18.json).
This supersedes pending source/publication wording above, not physical gates.
