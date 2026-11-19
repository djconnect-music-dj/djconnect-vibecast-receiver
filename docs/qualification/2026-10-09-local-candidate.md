# Local candidate receipt — delivery pending

Assignment `DJC-VIBECAST-CAST-RECEIVER-ADOPTION-V1-20261009`.
ACK/base/branch/first-source: receiver #10/6083184705. Early coordination:
receiver #10/6083343337, Apple #87/6083345759, Core #1101/6083345763.

Reviewed implementation commit `38d98b0e2af5e54a8feb23eff0663cb658d84935`,
tree `53529a7d9972dceb1c676e5013f445a4ba6522c0`, base
`a901fbcd3e894af62b63fafbca8f96738e08ce3c`. Independent read-only reviewer:
GO for local software adoption; no blocking receiver-owned finding. Independent
14 tests (7 Node +7 Python), projection and diff checks PASS. Additional reviewer
checks reject oversized archive members and PAX traversal before extraction.
No source changes made by reviewer. Live CAF/Pages/device acceptance explicitly
excluded from GO; namespace/readiness and non-media idle behavior need real
qualification or a new reviewed Core bundle, never a generated HTML patch.

Original published archive SHA256 and GitHub asset API digest both
`dfb800634652de610e6d3861bc0aedfa1e1cdb1a65dc80b3bdd4a2a3326c56d1`, size29905.
Original supplying verifier GitHub blob and local git hash-object both
`39d617b4b3cdc04b0e03d7377d535af3bd665ab0`, size8412; SHA256 in source lock.
All imported bytes match the external manifest/revision/renderer pins. Producer
supplying revision remains honest across the source squash merge.

Local installed Chrome ran 10 scenarios: five languages × landscape1920×1080
and portrait1200×1920. Exact generated HTML loaded, two source links/current
Moment/progress displayed, later same-track Moment and host-stop cleanup passed,
no horizontal overflow or pageerrors. All outbound requests were aborted;
CAF/channel, HA/WebSocket and content were synthetic. Screenshots visibly name
the synthetic fixture; no hardware/live Session accepted. JSON receipt:
[local-browser-model.json](local-browser-model.json). These tests supplement,
not replace, the producer's real HA/Broadcast software receipts or future
Apple-to-Cast end-user proof. Browser harness/screenshots are retained as local
verification artifacts; no user state or secrets included.

Host canonical verify exit0, manifest3.3.0/bootstrap2.0.21/onboarding4.5.3,
all required rows MATCH. Canonical tracked receiver main/origin and remote
readback stayed at the exact base. Canonical old Git index lock was preserved;
source work was isolated. No existing writer/pickup under this ID was duplicated.

BUILD_ADOPTION=LOCAL_PASS. DISTRIBUTION_BROWSER_QUAL=LOCAL_MODELED_PASS_ONLY.
REAL_CAF_QUAL=NOT_RUN. PAGES_DEPLOYMENT=NOT_RUN. APPLE_SENDER_QUAL=OPEN.
GOOGLE_CAST_TV_QUAL=NOT_RUN. Native macOS route separately unqualified.

Required remote checks, protected PR/merge, exact delivered main readback and
repository Finalization remain PENDING. No push was made because actual
external Pages preview/production triggers, project/URL and specific promotion
authority are unknown. GitHub hooks[]/deployments[] alone are insufficient.
Cast AppID/testdevice and a suitable installed HA/network route are also unknown.
No publication/signing/HA install/config/restart/hardware effect was performed.

The paired Apple history/conversation writer read back current f2782b88 clean,
registered sender follow-up still unstarted, no existing Google Cast SDK/AppID/
Pages URL, existing six-digit browser/Pi handoff only. Its assignment/lab/WIP is
preserved. Sender-source pickup must follow its own slot release, not this
receiver review. No second Core/Apple writer or next capability started.

Finalization disposition: SOURCE_CANDIDATE_READY_FOR_EFFECT_DECISION;
RepositoryState LOCAL_CANDIDATE_NOT_DELIVERED; FinalizationPending YES;
integrated acceptance OPEN. Resume this same pickup, audit concrete effects,
obtain the specific publication/hardware authorities, then continue checks,
protected source delivery, exact-main evidence and Finalization. This receipt
is not terminal Finalization and creates no additional assignment.
