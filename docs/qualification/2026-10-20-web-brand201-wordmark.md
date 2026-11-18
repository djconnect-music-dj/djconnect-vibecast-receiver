# VibeCast.tv Brand2.0.1 and canonical wordmark

Peter explicitly requested publishing the latest web treatment including the
wordmark. Sole receiverwriter/checkout, base200714014a56a4516ea46056414c60005e546818,
branch codex/vibecast-web-brand201-wordmark. No timer or producer source writes.

## Inputs and actual UI

Protected Core source97a20fa1 and separateFinale390c5a8, manifest3fbdfe2a,
complete74safe-file producerZIP080ddbc0 verified; every selected PNG matches
exact Git blob, manifest SHA/size/dimensions and ZIP bytes. Official small
16/32/40px PNGs replace prior headset assets. New actual canonical primary-dark
wordmark2048x512/566999bytes/2cf02b72 supplies DJConnect + Your music. Your DJ.
Canonical compact-dark1728x448/437338bytes/274651d7 supplies the smaller layout.
No redraw, resampling, generated logo, newfont or manuallyretyped wordmark.
README variants and largeglass128 unchanged bytes. Original licence retained.

Footer uses a canonical responsive picture with intrinsic ratio and alt text;
desktop primary512px, mobile compact320px-oravailable-width. The picture switch
at800px matches the layout switch, preserving primary512px+ and compact below512
per the exact producer variant contract. Footer stacks on mobile. Qualified320px+
layouts keep totalwordmarkwidth256px+, therefore embeddedglass64px+. Existing
VibeCast hero, palette, adaptiveeffects, all5locales, CSP/unavailableAdapter,
public noQR/pairing and separate HA admission unchanged. Tests cover image decode,
intrinsicdimensions/aspect, viewport bounds320/390/1920 and actualunavailable UI.

Local99Node/11Python/102Chromium+WebKit browsercases PASS; actual16normal/contrast/forced-colors
mobile/TV previews generated independently. This is source qualification, not
publicPages/native/HA/physical acceptance. Receiving independent reviews and
protectedCI/merge/publication remain separate.

## Full live delta and effect admission

Compared with actualpublishedf5c/220f, only index.html, style.css, brand-mark-16.png,
brand-mark-32.png, brand-mark-40.png change; brand-wordmark-primary-dark.png and brand-wordmark-compact-dark.png are new.
Build manifest/checksums change to bind the new artifact/source. Every other
public payload file is byte-identical, including unavailable service/networkpolicy.
Cast wwwroot/import/vendor/source locks/API379/workflows untouched.

Current real Pages inventory shows production220f0e59-6bc7-4088-9928-a72a742968c5,
sourcef5c72a5d913b870209ca33ccb45254012da9de9c; complete actual root+immutable
readback matches trusted priorartifact/manifest875bf51f82d6e6a66d1f401148c6eefd9caa16b591f43650b51673d2beb3d600.
The update script baseline is deliberately advanced from older17bf to this
measured220f identity. No automatic advancing or rollback to stale17bf.
Existing source/run/currentmain/owner environmentreview/protectedbranches/
noadminbypass and stale-main fences remain intact. User already authorized
Cloudflarepublication/owner-selfreview; approve this exact reviewed candidate
through the existing required environment gate, no new general permission.

After exacttwo reviews/greenprotectedmerge/mainCI, download and verify trusted
exactmainartifact, dispatch existing bootstrap-update workflow, immutablepreview
fullhash/type/header/404PASS then samebytesproduction/rootreadback. Workflow
retains exactpriorartifact+ownedrollback receipts and refuses foreignproduction.
NoDNS/settingschange or broadOAuth/localuploadworkaround. Prior real220f is the
recovery target; actual publicrollback NOT_RUN unless recovery is required.
Branchpush/mainmerge also publishes unchangedCast throughexistingGitintegration;
read back exactCast3origins both before/after. All effects are owner-authorized.

SOURCE/CI/PAGES/DOMAIN_TLS only qualified by actual measuredreceipts afterward;
RENDEZVOUS stayspublicunqualified; APPLE_HA_E2E OPEN; PHYSICAL_TV NOT_RUN.
Own separateFinalization/Core1101handoff follows actual publication; this source
record does not pre-certify that future delivery.

## Pre-push review correction

First local candidate40244d4 was not pushed/published: product review P2 correctly
found primary-wordmark sizing below the512px producer threshold. Responsive
canonical compact-dark now replaces primary on the smaller layout. Tests assert
actual selected dimensions plus primary512px minimum. No variant rule waived.

A later actual Chromium forced-colors/lightCanvas check found a second pre-merge
P2: white canonical PNG letters lost contrast on Canvaswhite. A forced-colors-only
dark backing now preserves full canonical image bytes and minimumvariantwidth;
light/darkforcedcolors regressioncases verify the backing without recolouring.

PR42 first CI39446654254 also reproduced the earlier pre-existing WebKit lost-create
fixture unsafe outcome. No runtime/API/CSP change caused by this branding slice.
Failure trace retained; cause not yet asserted. Test-only diagnostics wrap native
decrypt and verification stages, recording only boolean fieldmatches/algorithm/
errorclass/visibility, never keys, ciphertext or plaintext. No validators, tests,
timeouts, retrylimits or policy checks are bypassed. Green actualCI remains required.

The diagnosticobserver was separately reviewed and corrected before its first
commit so observation parsing cannot turn a successful native decrypt into a
failure. Native success returns the original buffer even if observation fails;
native failure alone is rethrown. No private material is logged. Ten unchanged
nativecrypto-focused local cases PASS; actualLinuxCI still must classify/qualify.
