import assert from 'node:assert/strict';
import test from 'node:test';
import { requireEmptyQAProduction, selectQAPreview } from '../../scripts/publish_qa_preview.mjs';
import { readbackQAAccess } from '../../scripts/readback_qa_access.mjs';

const host = 'vibecast-tv-bootstrap-qa.pages.dev';
const branch = 'qa-preview-123-1';
const sha = 'c'.repeat(40);
const origin = `https://abcd1234.${host}`;

test('only the bound and empty Direct Upload QA production target qualifies', () => {
  const target = {
    id: 'a8f2e47e-0ad4-46fd-b4bd-bb3358065be8',
    name: 'vibecast-tv-bootstrap-qa',
    subdomain: host,
    production_branch: 'main',
    domains: [host, 'qa.vibecast.tv'],
    canonical_deployment: null,
  };
  assert.doesNotThrow(() => requireEmptyQAProduction(target));
  for (const change of [
    { canonical_deployment: {} }, { source: { type: 'github' } }, { production_branch: branch },
    { domains: [...target.domains, 'unknown.example.com'] }, { id: 'other-project' },
  ]) {
    assert.throws(() => requireEmptyQAProduction({ ...target, ...change }), /fixed Direct Upload/);
  }
});

test('confirmation binds a single new immutable deployment and branch alias to the run and SHA', () => {
  const preview = {
    id: '1e5b0cd2-531d-4843-9adb-40d1a32b20fa',
    environment: 'preview',
    url: origin,
    aliases: [`https://${branch}.${host}`],
    latest_stage: { status: 'success' },
    deployment_trigger: { metadata: { branch, commit_hash: sha } },
  };
  const confirm = (items, prior = []) => selectQAPreview(items, branch, sha, origin, new Set(prior));
  assert.equal(confirm([preview]), preview);
  assert.throws(() => confirm([preview, preview]), /run-owned/);
  assert.throws(() => confirm([preview], [preview.id]), /run-owned/);
  for (const change of [
    { environment: 'production' }, { aliases: [] }, { latest_stage: { status: 'active' } },
    { deployment_trigger: { metadata: { branch, commit_hash: 'b'.repeat(40) } } },
  ]) {
    assert.throws(() => confirm([{ ...preview, ...change }]), /run-owned/);
  }
});

test('preview branch alias is checked independently of the immutable preview URL', async () => {
  const request = async url => Response.redirect(`https://pcvantol.cloudflareaccess.com/cdn-cgi/access/login/${url.hostname}`, 302);
  const result = await readbackQAAccess('abcd1234', request, ['qa-adapter.mjs'], branch);
  assert.deepEqual([...new Set(result.observations.map(({ host: name }) => name))], [
    'qa.vibecast.tv', host, `abcd1234.${host}`, `${branch}.${host}`,
  ]);
  await assert.rejects(readbackQAAccess(undefined, request, [], 'main'), /Invalid QA preview branch/);
});
