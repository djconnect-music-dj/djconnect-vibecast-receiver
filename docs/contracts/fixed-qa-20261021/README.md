# Fixed QA source-review fixture only

Owning API candidate `9a87fb2f3cc821c0a2482e8fa6b88c2340179e78` supplied
these exact local software fixtures. This is a review candidate, NOT protected
release adoption, deployed service, native acceptance or operational admission.
Actual local producer directory: `/Volumes/Shared Data/tmp/pcvantol/djc-fixed-qa-3OLxSC/`.

The schema SHA256 is `24ab72719195f7971e070e56c52ceea7e67e02ee1bd7c6946eca99883194505f`.
Receiver independently read that exact candidate's Git blob
`docs/rendezvous/wire-request-schemas-v1.json`: exactly four production service
occurrences and one production browser occurrence; changing ONLY those to the
fixed QA tuple reproduces the supplied schema byte-for-byte. Its original
SHA256 remains `c00d495222a5bc719e5ef22280e4bbacbb7496f03740cb9c6ccf8b464f4d8a0d`.
All seventeen selected receiver definitions structurally equal this QA schema
with only the QR service const changed; a local regression enforces equality.

Worker hash in the fixture is supplied producer metadata, not a receiver rebuild,
download, deployment or artifact acceptance claim. Current Apple profile and
operational admission remain null; activation_allowed remains false.
