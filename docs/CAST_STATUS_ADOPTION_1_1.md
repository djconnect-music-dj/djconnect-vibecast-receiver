# Core build 1.1.0 status adoption

Source PR #13 is protected delivered on a9733e3. Actual new Pages-byte/header/
manifest readback PASS is recorded in the [increment delivery/Finalization
receipt](qualification/2026-10-10-status-1.1.0-finalization.md). The candidate
preparation/approval boundary below remains historical. Exact documentation
approval/merge/final-readback identities will be recorded in owning issue #10
only after those effects occur; that register supplies current completion status.

Increment `DJC-VIBECAST-CAST-STATUS-ADOPTION-V1-20261010`, parent
`DJC-VIBECAST-CAST-RECEIVER-ADOPTION-V1-20261009`. Same receiving executor/writer.
Closed source/Finalization #11/#12 and prior 1.0.0 evidence stay historical.
[Owner selection](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6092981568),
ACK6095243668, fresh qualified admission/base/branch/first-source6095278036.
Base `eeecc93b5634d9d9014de60183917835835bf85e`; source branch
`codex/djc-vibecast-cast-status-adoption-v1-20261010`. Admission initially held
for disk2GB<5GB; after owner freed space, fresh canonical verify exited0/MATCH,
minimumdisk5GB and every required row MATCH. No agent repair/cleanup or new writer.

## Exact provenance and preserved rollback

Core source #1138 `c41b6079ed54eb40b0027a6666b0f784bb48f703`, Finalization #1139
`ffaa4df0ea1a184669622a6c98d9f0f5aae7a4f2`; supplying revision remains the actual
reviewed `d7396554cb6179c7cdce67c473bd9b069c4c9a92`, never the squash SHA.
Published build1.1.0 archive:
https://github.com/pcvantol/djconnect/releases/download/internal-ha-c41b6079ed54eb40b0027a6666b0f784bb48f703/vibecast-status-d7396554.tar.gz.
GitHub asset digest and actual downloaded SHA256 both
`939ab00f70d1122410559b6f0eaedf5dd831240e65d04d15a24a58497d5cd74a`.
External manifest `b401cb5e02e7a34b2674c4432c3f79675df6819bb667685124b928915839350a`;
renderer `f0455cbe8b294e55d9add12c9c1fff86578a0f7b8c403314fb7ce2a041c4d60c`;
Cast HTML `cdd24ff51d0719d07d0929d7ab6c988df1b77e10b753f06028ad13b3caad9a14`.
Matching unchanged Core verifier at `vendor/core/1.1.0/build_vibecast.py` has
SHA256 `f24cd2814fc87557142e9892f816075c55d1ea93846274c2c2121dd26e30ba13`.
Status schema is retained unchanged from the same supplying pin with its SHA256
in the active source lock, checked by receiving tests.

The existing unchanged importer validates archive/verifier pins, exact safe
three-file members and Core's `--verify-existing --revision ...
--expected-manifest-sha256 ...`; generated HTML is imported byte-for-byte.
There is no second verifier/build implementation and no hand-edited renderer.
Both original1.0.0 verifier/archive remain untouched. Explicit
`vibecast-source-lock-1.0.0.json` retains the prior lock. Offline commands:

```sh
npm run import:core
npm run verify:core
npm test
```

An isolated temporary rollback test imports the old lock, proves old HTML
`060b6f14...`/manifest`72239b47...`, then reimports the active lock and compares
new bytes. No live rollback performed. A live failed promotion would require
an explicitly authorized reviewed protected revert to the complete eeecc93
baseline, with its own possible preview and automatic main deployment effects.

## Delta and status contract

[Module delta](qualification/status-1.1.0-delta.json) shows unchanged template,
CSS and local Pi adapter; only renderer lifecycle hooks and Cast adapter change.
Local/Static entries retain identical common renderer bytes. The producer's
qualified Pi/local HA build remains separately hosted by HA; Pages distributes
only `wwwroot`. No local Pi claim, permissions, HTML or host is promoted here.

[Canonical supplying contract](https://github.com/pcvantol/djconnect/blob/d7396554cb6179c7cdce67c473bd9b069c4c9a92/docs/product/VIBECAST_CAST_STATUS_CONTRACT.md)
owns the wire behavior. Existing JSON namespace
`urn:x-cast:com.djconnect.vibecast.v1` and `vibecast_handoff` version1 remain.
Opt-in adds both `status_version:1` and fresh32lowercasehex `handoff_id`.
CAF supplies actual sender identity; JSON sender fields confer nothing. Status
responses go only to that current sender, correlated to ID and Session, with
increasing sequence and lease15000ms. No token, HA origin, Profile, artwork,
Moment text/identity, chat/history/search or owner grant is returned.

CAF-ready and transport-open are not HA success. States distinguish
receiver_ready, connecting, snapshot_accepted, presenting(moment|silence),
recovering, error, ended and stopped. Silence is valid active presentation;
missing cards do not mean connection failure. Applied presentation has a5s
heartbeat. Initial/recovery handshake deadline15s is not extended by retry.
New handoff/generation invalidates old callbacks; at most32retired IDs prevent
recent replay from replacing the view. This is correlation, not new authority.
Matching CAF sender/ID/Session `vibecast_stop` clears only the view. Sender
departure/supersession/unload also stop that view. No HTTP Session/playback
control or sender-provided end-grant. Legacy v1 without opt-in still works
without statuses/deadline. Invalid half opt-in fails closed.

Heartbeat represents applied receiver state; it is not independent HA health
or physical TV visibility. A half-open WS can retain applied state until actual
closure is detected. Native sender must expire the lease and reject old/wrong
correlation, not infer success from an SDK callback or status timer alone.

The new adapter declares JSON customNamespaces before start and registers its
listener only after isSystemReady/READY, matching the
[official receiver options](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.CastReceiverOptions)
and [context APIs](https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.CastReceiverContext).
Default idle policy remains enabled. Actual CAF readiness, network loss and
non-media idle/departure behavior still require real-platform evidence.

## Receiving verification and boundaries

33 tests PASS:24Node/9Python.17 status/lifecycle cases execute the actual imported
HTML:13 derived from pinned Core's harness plus4receiving checks for schema,
privacy/actual sender, malformed opt-in, terminal view-only stop and stale
renderer generation. Existing five-language/Moment/attribution tests adjusted
only for the new CAF contract; import adversarial tests, exact1.0restore and
shared local-adapter equivalence included. No test builds another renderer.
Offline projection and diff checks PASS.

Ten local Chrome scenarios (five languages × landscape1920x1080 and
portrait1200x1920) PASS with exact HTML, two-source Moment/progress, later same-track
Moment, correlated statuses and host-stop cleanup. All requests blocked; CAF/HA
transport and content synthetic. JSON [receipt](qualification/status-1.1.0-browser-model.json),
local screenshots/harness retained. No real Session/device/provider or physical
visibility implied. Core's11actual isolated HA/TLS/Broadcast sequences and79
status envelopes are producer evidence, not rerun here or upgraded to CastPASS.

Local BUILD_ADOPTION=PASS; CAST_STATUS_CONTRACT=SOFTWARE_PASS_MODELED.
DISTRIBUTION_BROWSER_QUAL=LOCAL_MODELED_ONLY. New PAGES_DEPLOYMENT=NOT_RUN;
REAL_CAF=NOT_RUN; APPLE_SENDER/TV acceptance OPEN. Independent receiving delta/
security/bounded softwareUX review precedes the exact source publication request.
Old GO/deployment receipts are not applied to changed bytes.

## One bounded source / Finalization publication proposal

Known environment unchanged: Pages `djconnect-vibecast-receiver`, output
`wwwroot`, main automatic production, source pushes may create public previews;
fixed URL https://receiver.djconnect.dev/, app8EA92910, registered The Frame.
Preview is a different origin and receives no implicit HA allowlist grant.
No branch filter/Console/domain/HA setting change is part of this increment.

After independent GO, request owner approval for the exact receiving source
commit/tree: push/PR including publicpreview; required test/projection/Pages
checks; protected merge; automatic production promotion. Probe root/index.html/
index/manifest on both existing domains and immutable deployment URL over valid
HTTPS. Require exact new HTML/manifest hashes above, correct HTML/JSON types,
no-store/no-referrer/nosniff on content responses, redirect-chain privacy readback
and unchanged no-credential/no-proxy behavior. Capture actual main/reviewed-tree
and deployment receipts. No green CI or old1.0site as1.1promotion evidence.

Propose bounded recovery through protected revert to eeecc93 (old1.0hashes),
including its preview/main effects, only under explicit source recovery approval.
No force push, external settings mutation or unreviewed artifact replacement.

Mandatory Finalization follows measured source/main/Pages receipts with its own
exact documentation candidate/review/publication gate. Docs-only pushes and main
merges also may preview/redeploy. Its static bytes must remain the reviewed1.1.0
pins and be read back after the final main. This proposal exposes both effects;
it does not ask for blanket approval of an as-yet unknown Finalization SHA.
Do not reopen #11/#12 or create another product assignment.

## Parallel handoff and stop

Early pin/contract intake: Apple#87/6095244635 and Core#1101/6095244843; updated
candidate/review/servedbytes follow in those same registers. Apple keeps current
conversation/history writer and registered sender follow-up after its own slot
release. No Swift write or sender dispatch. Separate Core paired-live-auth
correction is not a blocker for this local import/review and is not modified here.

Actual installed HA/capabilities, valid reachable HTTPS/WSS/exact receiver origin,
real CAF/AppID/The Frame and native active-session Apple sender must be proven
under separate proper resources/authority. No old HA69315f43 install evidence
as current suitability, implicit HA update/Console publish/signing/TV operation,
new account/cost, LG/Windows/extra intelligence or monitor. Stop after this1.1.0
adoption/publication/own Finalization; full joint acceptance stays OPEN until real.
