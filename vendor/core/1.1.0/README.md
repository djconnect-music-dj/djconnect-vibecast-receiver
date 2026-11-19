# Immutable build 1.1.0 verifier and status schema

Both files are unchanged from Core supplying revision
`d7396554cb6179c7cdce67c473bd9b069c4c9a92` under the original MIT license.
Original paths: `scripts/build_vibecast.py` and
`examples/client_contracts/vibecast_cast_status/status.schema.json`.
The active source lock pins their SHA256 values. The importer invokes only
Core's `--verify-existing`; schema pin/conformance is checked by receiving tests.
No Core build/render function is invoked or independently implemented here.
Original build 1.0.0 verifier/archive remain at their original vendor paths;
`vibecast-source-lock-1.0.0.json` preserves the exact rollback input pair.

`tests/cast-status.test.mjs` derives its initial harness/cases from the supplying
Core `tests/browser/vibecast_cast_status.mjs`, changes only input loading to
execute committed generated HTML, and adds receiving schema/privacy/generation/
view-stop checks. CAF/transport/DOM are modeled, not hardware qualification.
