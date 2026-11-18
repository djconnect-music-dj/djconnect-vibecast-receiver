import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export function assertHeaders(headers, expected, type) {
 for (const [key, value] of Object.entries(expected)) {
  if (normalized(headers.get(key)) !== normalized(value)) throw Error(`Header policy mismatch: ${key}`);
 }
 const contentType = headers.get('content-type')?.split(';')[0].trim().toLowerCase();
 const allowed = type === 'javascript' ? ['text/javascript', 'application/javascript'] : type === 'checksum' ? ['text/plain','application/octet-stream'] : [type];
 if (!allowed.includes(contentType)) throw Error('Content type mismatch');
}
export async function readback(manifestPath, originString, fetcher = fetch) {
 const directory = path.dirname(manifestPath), manifestBytes = await readFile(manifestPath);
 const manifest = JSON.parse(manifestBytes), origin = new URL(originString);
 if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('Exact HTTPS origin required');
 const policyBytes = await readFile(path.join(directory, '_headers'));
 if (hash(policyBytes) !== manifest.files._headers) throw Error('Expected header artifact hash mismatch');
 const policy = Object.fromEntries(policyBytes.toString().split('\n').slice(1).filter(line => line.includes(':')).map(line => {
  const index = line.indexOf(':'); return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
 }));
 const required = ['cache-control','referrer-policy','x-content-type-options','x-frame-options','strict-transport-security','permissions-policy','content-security-policy'];
 if (required.some(key => !policy[key])) throw Error('Incomplete expected header policy');
 async function check(route, digest, type, status = 200, redirectPath = null) {
  let response = await fetcher(new URL(route, origin), {redirect:'manual',signal:AbortSignal.timeout(20000)});
  if ([301,302,307,308].includes(response.status)) {
   const target = new URL(response.headers.get('location'), origin);
   if (!redirectPath || target.href !== new URL(redirectPath, origin).href) throw Error('Unexpected entry redirect');
   response = await fetcher(target, {redirect:'error',signal:AbortSignal.timeout(20000)});
  }
  if (response.status !== status) throw Error(`Readback HTTP failure: ${route} (${response.status})`);
  assertHeaders(response.headers, policy, type);
  if (hash(new Uint8Array(await response.arrayBuffer())) !== digest) throw Error(`Readback hash mismatch: ${route}`);
 }
 for (const [file, digest] of Object.entries(manifest.files)) {
  if (file === '_headers' || file === '404.html') continue;
  const type = file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.mjs') ? 'javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/json';
  await check(file === 'index.html' ? '/' : '/' + file, digest, type);
 }
 await check('/build-manifest.json', hash(manifestBytes), 'application/json');
 await check('/SHA256SUMS', hash(await readFile(path.join(directory,'SHA256SUMS'))), 'checksum');
 for (const route of ['/index.html','/index']) await check(route, manifest.files['index.html'], 'text/html', 200, '/');
 // Qualify Pages' actual error response; never count a SPA root fallback as 404.
 await check('/__vibecast_missing__', manifest.files['404.html'], 'text/html', 404);
 return {origin:origin.origin, sourceSHA:manifest.sourceSHA, outcome:'PASS'};
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.stdout.write(JSON.stringify(await readback(process.argv[2],process.argv[3]))+'\n');
