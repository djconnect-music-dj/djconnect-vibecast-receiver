import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm,readFile,realpath} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {verifyAPISource,fixedTransportSource} from '../../qualification/http-ui/source-guard.mjs';
const pin=JSON.parse(await readFile(new URL('../../qualification/http-ui/api-source.json',import.meta.url)));
const base='http://127.0.0.1:12345/'+'a'.repeat(43)+'/v1/rendezvous/';
test('QA bridge refuses remote, credentialed, query, fragment and non-capability endpoints',()=>{
 assert.equal(fixedTransportSource('https://api.djconnect.dev/v1/rendezvous/',base),base);
 for(const b of [base.replace('127.0.0.1','example.org'),base.replace('http:','https:'),base+'?x=1',base+'#x',base.replace('127.0.0.1','user:pass@127.0.0.1'),base.replace('a'.repeat(43),'short')])assert.throws(()=>fixedTransportSource('https://api.djconnect.dev/v1/rendezvous/',b));
 assert.throws(()=>fixedTransportSource('https://other.example/v1/rendezvous/',base));
});
test('different API source/runtime pins fail before source loading',async()=>{
 await assert.rejects(verifyAPISource('/not-loaded',{...pin,source:'0'.repeat(40)}));
 await assert.rejects(verifyAPISource('/not-loaded',{...pin,source:'828fbaf300ca369dcc753b676295e84094d5e8c6'}));
 await assert.rejects(verifyAPISource('/not-loaded',{...pin,runtime_sha256:'0'.repeat(64)}));
});
test('API source drift, path escape and symlink reject before importing runtime',async()=>{
 const dir=await mkdtemp(path.join(await realpath(tmpdir()),'receiver-source-denial-'));
 try{
  await mkdir(path.join(dir,'qualification/rendezvous'),{recursive:true});
  await writeFile(path.join(dir,pin.runtime),'throw Error("MUST_NOT_EXECUTE")');
  const runtimeOnly={...pin,files:{[pin.runtime]:pin.runtime_sha256}};
  await assert.rejects(verifyAPISource(dir,runtimeOnly),/API source drift/);
  await assert.rejects(verifyAPISource(dir,{...pin,files:{'../outside':'a'.repeat(64),[pin.runtime]:pin.runtime_sha256}}));
  await writeFile(path.join(dir,'elsewhere'),'not source');
  await symlink(path.join(dir,'elsewhere'),path.join(dir,'linked'));
  await assert.rejects(verifyAPISource(dir,{...pin,files:{linked:'a'.repeat(64),[pin.runtime]:pin.runtime_sha256}}),/API source symlink/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
