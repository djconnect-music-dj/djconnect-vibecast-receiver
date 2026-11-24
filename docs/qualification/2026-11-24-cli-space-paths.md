# Validation CLI execution from paths containing spaces

The six existing validation command entrypoints compared Node's filesystem
argument with a URL pathname. A checkout under `Shared Data` therefore left
the command body unexecuted, allowing a misleading successful process exit.
They now compare resolved filesystem paths using `fileURLToPath`. Imports stay
inert, and the existing validation, credentials and promotion decisions remain
unchanged.

The product checkpoint is `37880855a5b539d60605a8a26180f6897b0a81e0`, based on
protected main `92fb2f8c84e76c1e79c292c1c59eb4fb534f65da`. Seven causal tests run
the actual six entrypoints from paths with spaces, require real readback output,
reject incorrect artifacts/origins or missing deployment authority, and verify
that importing all six modules has no effects. Network responses and GitHub
data in these tests are declared fixtures, not production observations.

Independent coordinator repetition on 24 November: all seven focused tests
PASS; complete `npm test` PASS with 142 Node tests and 11 Python tests. The
original Core import verification and brand verification also pass. Temporary
test output uses the run-owned Shared Data directory. The two accompanying
documentation records do not change executable source.

This increment contains no Core renderer import, new Cast protocol, bootstrap
asset, deployment configuration, live mutation, release or device acceptance.
The current pinned 1.1.4 assets and existing production rollback remain intact.
Publication, protected merge, separate Finalization and any later deployment
remain separate facts. The new Core Cast B export is a different, unfinished
producer increment and is not adopted here.
