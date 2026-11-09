import assert from 'node:assert/strict';
import test from 'node:test';
import { readbackQAAccess } from '../../scripts/readback_qa_access.mjs';

function login(url) {
  return `https://pcvantol.cloudflareaccess.com/cdn-cgi/access/login/${url.hostname}?token=example`;
}

test('checks the custom host, Pages root and immutable deployment without following login redirects', async () => {
  const receipt = await readbackQAAccess('abcd1234', async (url, options) => {
    assert.equal(options.redirect, 'manual');
    return Response.redirect(login(url), 302);
  }, ['_headers', 'style.css', 'brand-mark-16.png']);
  assert.equal(receipt.scope, 'IMMUTABLE_DEPLOYMENT');
  assert.deepEqual([...new Set(receipt.observations.map(({ host }) => host))], [
    'qa.vibecast.tv',
    'vibecast-tv-bootstrap-qa.pages.dev',
    'abcd1234.vibecast-tv-bootstrap-qa.pages.dev',
  ]);
  assert.deepEqual([...new Set(receipt.observations.map(({ route }) => route))], [
    '/', '/index.html', '/index', '/build-manifest.json', '/SHA256SUMS',
    '/app.mjs', '/qa-adapter.mjs', '/__vibecast_missing__', '/style.css', '/brand-mark-16.png',
  ]);
  assert.equal(receipt.observations.length, 30);
  assert.doesNotMatch(JSON.stringify(receipt), /token|example/);
});

test('identifies wildcard coverage before a deployment without claiming immutable readback', async () => {
  const receipt = await readbackQAAccess(undefined, async url => Response.redirect(login(url), 302));
  assert.equal(receipt.scope, 'PRE_UPLOAD');
  assert.equal(receipt.observations.at(-1).host, 'test-access.vibecast-tv-bootstrap-qa.pages.dev');
});

test('fails closed for a branch alias, exposed asset or wrong Access destination', async () => {
  await assert.rejects(readbackQAAccess(undefined, () => assert.fail('Unexpected fetch'), ['../public']), /filename/);
  await assert.rejects(readbackQAAccess('main', () => assert.fail('Unexpected fetch')), /immutable/);
  await assert.rejects(readbackQAAccess(undefined, async url =>
    url.pathname === '/qa-adapter.mjs' ? new Response('public') : Response.redirect(login(url), 302)
  ), /qa-adapter\.mjs \(HTTP 200\)/);
  await assert.rejects(readbackQAAccess(undefined, async url =>
    Response.redirect(login(url).replace('pcvantol.cloudflareaccess.com', 'other.cloudflareaccess.com'), 302)
  ), /Expected Cloudflare Access/);
});
