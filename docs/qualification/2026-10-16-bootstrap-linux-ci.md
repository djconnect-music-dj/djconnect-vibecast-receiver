# Linux CI qualification delta

This is the pre-push freeze record. For later actual results and owner policy
execution, see [the measured delivery checkpoint](2026-10-16-bootstrap-delivery-checkpoint.md).

PR17 first tested5cb148e and diagnostic09b62e. Both Linux runs correctly failed
required `test` on all eight QR-resize cases;26other browser cases passed. The
original runs/logs/traces remain evidence, not PASS. macOS qualification alone
was insufficient for this additional operating-system/font layout.

Actual CI diagnostic at320px: root scrollWidth340, panel19.1875–300.8125,
canvas174/185 with available193. The QR/panel itself fit, but surrounding page
content did not. Independent read-only UX investigation additionally reproduced
headerpreferences overflow and tighter QR space at305px available layout.

Fix: below360px let header/preferences wrap on separate lines and reduce panel
padding to1rem. Existing integer raster, panel/root viewport bounds and original
expiry assertions are preserved. New diagnostics include clientWidth/scrollbar
and preference bounds. Failure artifacts are retained by CI. Local44Node+9Python
and34Chromium/WebKit PASS; actual new Linux CI must still qualify the fix.

New isolated Pages target was created via official Pages API, source=null,
projectid a815fc66-5fc2-49d3-812f-28b7401b6643. Wrangler4.151.0 default new-project
command attempted Workers delegation and failed without creating a resource;
no Worker was accepted as the intended Pages distribution.

Peter subsequently explicitly preauthorized necessary execution/merges and
Cloudflare deployment within issue16; no repeated merge permission is required.
Deployment environment self-review policy is a separate explicit setting under
approval review: no such change has been applied. DNS-record access and scoped
CI-deploytoken issuance are unavailable with existing OAuth (10000/9109); no broad
OAuth credential is copied to CI and no unknown DNS record is overwritten.
