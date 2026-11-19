import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// An externally prepared checkout is data, never an alternative runtime/policy.
export async function verifyAPISource(root,pin){
 assert.equal(pin.schema,1);assert.equal(pin.repository,'pcvantol/djconnect-api');
 assert.equal(pin.source,'379d70b558508f747d578d7b7d90a665bad7ffc8');
 assert.equal(pin.runtime,'qualification/rendezvous/root-integration-runtime.mjs');
 assert.equal(pin.runtime_sha256,'27e9f5ae2a7b7350f3ae51352cf4efb023ec17f79bc8f42968cc3bdfbfe34854');
 const directory=await realpath(root);assert.equal(directory,path.resolve(root),'API checkout must not be a symlink');
 assert.equal(pin.files[pin.runtime],pin.runtime_sha256);
 for(const [name,digest] of Object.entries(pin.files)){
  assert(/^[a-zA-Z0-9_./-]+$/.test(name)&&!name.split('/').includes('..')&&!path.isAbsolute(name));
  assert(/^[a-f0-9]{64}$/.test(digest));
  const file=path.join(directory,name);assert.equal(await realpath(file),file,'API source symlink');
  assert((await lstat(file)).isFile());assert.equal(sha256(await readFile(file)),digest,'API source drift');
 }
 return directory;
}
export function fixedTransportSource(canonical,base){
 const url=new URL(base);assert.equal(url.protocol,'http:');assert.equal(url.hostname,'127.0.0.1');
 assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.search,'');assert.equal(url.hash,'');
 assert(/^\/[A-Za-z0-9_-]{43}\/v1\/rendezvous\/$/.test(url.pathname));
 assert.equal(canonical,'https://api.djconnect.dev/v1/rendezvous/');return url.href;
}
