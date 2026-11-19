# Measured Pages readback correction

Actual first protected publication run38930633105 on8fa8421ad43fc3b169c25d9950d8364e14353ded
uploaded immutable https://f09a41b5.vibecast-tv-bootstrap.pages.dev successfully,
then FAILED immutable qualification before any domain step. Initial asset request
returned a transient HTTPfailure immediately after upload. Subsequent normalTLS
reads returned all expected files200 with correct HTML/JS/CSS/JSON types. The next
specific failure was SHA256SUMS: Cloudflare serves its exact original bytes as
application/octet-stream, not text/plain. Its no-store/header policy is present.
No DNS association/write or rollback step executed in that failed run. The failed
workflow remains failure, not a substituted PASS.

Correction admits text/plain or application/octet-stream for the inert checksum
file only, retaining exact bytes and full artifact-bound headers. Executable JS,
HTML, CSS and JSON retain their strict MIME checks; text/html for checksums fails.
The bounded full-readback retry now applies to immutable and root propagation.
Only fixed https://vibecast.tv or an eight-hex immutable deployment origin is
accepted; mutable branch aliases, external hosts, URLcredentials, paths, queries
and fragments are rejected. Each retry repeats every hash/header/type/404 check;
exhaustion remains failure.

Using this corrected local verifier, actual immutable HTTPS readback of the full
8fa8421 artifact PASS, with normal TLS and every expected byte/header/404. This
is measured local qualification, not a successful protected publication workflow
or a vibecast.tv root/TLS result. The next protected run must still succeed.
Public frontend/Cast bytes and domain/rollback logic are unchanged.

MainCI38929153758 attempt1 was cancelled after unusually slow Ubuntu package
mirror downloads; ordinary cancellation completed. A later force-cancel request
received409 because completion already occurred, with no additional effect.
Attempt2 reran the same source/workflow unchanged and SUCCESS. No test omitted,
workflow/source weakened, admin merge bypass, or cancelled-run PASS claimed.
