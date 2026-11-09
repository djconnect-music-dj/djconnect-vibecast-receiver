import assert from 'node:assert/strict';
import test from 'node:test';
import { selectQAArtifact } from '../../scripts/preflight_qa_pages.mjs';

const sha = 'a'.repeat(40);
const artifact = {
  id: 123,
  name: `bootstrap-qa-${sha}`,
  expired: false,
  digest: `sha256:${'b'.repeat(64)}`,
};

test('selects only the exact, unexpired QA artifact in the trusted run inventory', () => {
  const production = { ...artifact, name: `bootstrap-${sha}` };
  assert.equal(selectQAArtifact({ artifacts: [production, artifact], total_count: 2 }, sha), artifact);
  assert.throws(() => selectQAArtifact({ artifacts: [production], total_count: 1 }, sha), /available QA/);
});

test('rejects incomplete inventories and ambiguous, expired or unpinned QA artifacts', () => {
  assert.throws(() => selectQAArtifact({ artifacts: [artifact], total_count: 2 }, sha), /Incomplete/);
  assert.throws(() => selectQAArtifact({ artifacts: [artifact, artifact], total_count: 2 }, sha), /available QA/);
  for (const change of [{ expired: true }, { digest: null }, { id: '123' }]) {
    const artifacts = [{ ...artifact, ...change }];
    assert.throws(() => selectQAArtifact({ artifacts, total_count: 1 }, sha), /available QA/);
  }
});
