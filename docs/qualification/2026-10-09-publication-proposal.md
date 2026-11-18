# Bounded source publication proposal — approval pending

Assignment `DJC-VIBECAST-CAST-RECEIVER-ADOPTION-V1-20261009`, same source writer,
branch `codex/djc-vibecast-cast-receiver-adoption-v1-20261009`, original base
`a901fbcd3e894af62b63fafbca8f96738e08ce3c`. Previous exact reviewed baseline
`72584ca786c97f3a50a5654c22a260425887afc5` is retained. This continuation changes
only status/resource/publication documentation; no generated HTML, archive,
source lock, verifier, importer or runtime/test changes. New exact commit/tree
and delta-review GO are recorded externally after commit; old GO is not relabeled.

## Known resources and effect evidence

Owner screenshot evidence is registered in receiver issue #10:

- [6084118956](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6084118956): project `djconnect-vibecast-receiver`, custom domain `receiver.djconnect.dev`, Pages domain `djconnect-vibecast-receiver.pages.dev`, successful main `a901fbc` and historic previews.
- [6087763230](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6087763230): output `wwwroot`, blank displayed build command/root, production `main`, automatic deployments enabled, include paths `*`, build comments enabled, cache disabled, build system3. Include paths are not branch filters.
- [6087835482](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6087835482): existing Custom Receiver `DJConnect VibeCast`, app ID `8EA92910`, shown receiver URL `https://receiver.djconnect.dev/`. Saved/Published state is not verified.
- [6087876072](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6087876072): existing registered target The Frame, Ready For Testing. No serial number is published; actual discovery/engine/network is unqualified.
- [6088099265](https://github.com/pcvantol/djconnect-vibecast-receiver/issues/10#issuecomment-6088099265): component delivery may progress; first submit one bounded candidate/effect/rollback proposal. Registered-device testing does not require global Google publication.

Screenshots supply configuration evidence, not publication authority or a direct
Cloudflare settings readback. The linked repository name was truncated in the
mobile screenshot, but current live bytes also corroborate the exact receiver
baseline. Preview allow/exclude filters remain unknown. Conservatively include
possible public preview for every source push in the proposed approval. Do not
change filters, automatic deploy settings, domains or Console registrations.

## Independent current HTTPS readback

Both known domains passed ordinary certificate-valid HTTPS, no bypass or
credentials. `/` gives 200 `text/html; charset=utf-8`, no-store/no-referrer/nosniff
and existing HSTS. Every root body equals original receiver main `a901fbc`:
SHA256 `b8812d8cc8c46031ea4c7220273bb60e2e3e8684820bad74a27d9501445dd614`.
`/index.html` and `/index` return308 to `/` then the same HTML. Redirect responses
currently have strict-origin-when-cross-origin; final roots have no-referrer.
Candidate wildcard header behavior on generated redirects must be measured after
promotion, not assumed from source. No runtime data belongs in any entry URL.

The new metadata URL `/vibecast-manifest.json` currently returns200 old HTML,
content type text/html and public,max-age0,must-revalidate: existing SPA fallback,
not a qualified manifest. After adoption it must serve actual JSON with the
external pinned manifest bytes and candidate privacy headers. Any wrong body,
redirect or content type is a failed distribution receipt even if HTTP200.
Readback artifacts retain raw response headers/body and sanitized result JSON.
No real CAF, HA Session or Cast device has been launched by these probes.

## Proposed source effects and validation

After explicit approval of the exact reviewed receiving commit:

1. Push that branch unchanged to the existing repository and create its PR.
   This may automatically publish a public Cloudflare preview from `wwwroot`
   before GitHub tests finish. The preview contains static code/metadata only.
2. Run required `test`, projection check and relevant review/check readbacks on
   the exact PR SHA. Fixes that change runtime/import pins require fresh review
   and an updated concrete publication boundary; never silently replace the pin.
3. Protected merge using repository policy, no bypass. Enforced admins, strict
   required `test`, linear history and no force push stay unchanged. A protected
   squash may produce a new main commit; its reviewed tree must be equal.
4. Main merge automatically promotes the existing Pages production site to that
   tree on both existing domains. Wait for actual deployment evidence and read
   exact HTML/manifest/headers/content types on root/index/clean URL/metadata.
   Expected HTML SHA256 `060b6f140a766e218593d0574949cdc8a5cd74cdca21483565cf5cd8dc152701`;
   manifest SHA256 `72239b476e793fe5bb5493d2be5720fcd1f6e64ea83e012c77573732a58c7898`.
5. Record exact remote/local/main, reviewed-tree equality, deployment URL/build
   if available, actual response hashes and qualified status. Required checks
   do not stand in for an external deployment receipt.

Publication covers the exact existing Core supplying7460ef5e build1.0.0. No new
Google app publication, registration/account/cost, HA installation/config/restart,
signing, tv/device operation or new Core/Apple writer is part of this source
step. Those later effects have their own concrete resource/authority gates.

## Rollback and subsequent Finalization

The actual production baseline is the exact `a901fbc` tree/body above. Full Git
recovery of the candidate and prior history is preserved. For this source step,
a failed distribution readback requires holding acceptance and preparing a
reviewed protected revert to the complete prior baseline, including legacy
HTML/tests/headers and removal of the new manifest/import metadata. The revert
itself triggers the same possible preview and automatic main production route;
include that bounded recovery effect in source approval. Verify prior body hash
and behavior after rollback, never force-push or silently mutate Pages settings.
No direct Cloudflare rollback/API operation is assumed available or authorized.

Mandatory Finalization remains pending after source delivery. Its concrete
readback-dependent documentation commit is not known yet. It must receive its
own exact review/publication boundary; include paths `*` means even docs-only
main merges may redeploy the same static bytes. No unchanged-static or docs-only
assumption exempts that later commit from the effect audit.

## Acceptance dependencies retained

The existing Core pin has no HA-ready/presentation acknowledgement. Core owner
proposal #1101/6088108512 and Apple follow-up #87/6088121327 bind the future small
status/handshake to actual renderer/Session generation, not SDK-connect/timers.
Neither register selects a new Core writer here. Keep closed #1136/#1137 closed;
receiver imports a newly qualified bundle only upon a new exact producer handoff,
with a directed delta review. Preserve current Apple conversation/history WIP.

Current software adoption/14tests/10modeledbrowser scenarios remain valid;
real CAF namespace/readiness/non-media idle, reachable compatible installed HA
and exact origin `https://receiver.djconnect.dev`, Apple sender/status and The
Frame multiple-Moment acceptance remain OPEN. Last supplied HA-dev69315f43
installation is not assumed compatible. No serials, credentials or private data
in logs/screenshots. A preview hostname is a different origin and must not be
silently allowed for HA. A technical sender may prove receiver/CAF, not the native
Apple active-session user route. This proposal is component publication, not
full integrated Cast acceptance or terminal Finalization.
