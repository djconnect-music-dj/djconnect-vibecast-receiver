import {createHash} from 'node:crypto';import {definitions} from '../../bootstrap/src/wire-schema.mjs';
import {fixedSourceIdentity} from '../../scripts/qa_source_identity.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
import {buildQA,qa,sourcePins,transform,replaceOnce} from '../../scripts/build_bootstrap_qa.mjs';
import {verifyQA} from '../../scripts/verify_bootstrap_qa.mjs';import {verify} from '../../scripts/verify_bootstrap.mjs';
import {createRendezvousAdapter} from '../../bootstrap/src/rendezvous.mjs';import {syntheticQAService} from '../fixtures/qa-service.mjs';
const sha=await fixedSourceIdentity(),dir='dist/bootstrap-qa';await buildQA(sha);
const {createQAAdapter}=await import(pathToFileURL(path.resolve(dir+'/qa-adapter.mjs')));
async function use(s,fn,origin=qa.browser){const loc=globalThis.location,fetch=globalThis.fetch,document=globalThis.document;globalThis.location={origin};globalThis.document={visibilityState:'visible'};globalThis.fetch=s.fetch;try{return await fn(createQAAdapter());}finally{globalThis.location=loc;globalThis.fetch=fetch;globalThis.document=document;}}
test('closed QA derivation is reproducible and production promotion refuses its identity',async()=>{
 const manifest=await verifyQA(dir,sha),before={};for(const f of await readdir(dir))before[f]=await readFile(dir+'/'+f);
 assert.equal(manifest.admitted_test_tuple,null);assert.equal(manifest.activation_artifact,null);assert.equal(manifest.service_qualified,false);
 assert.equal(manifest.provenance.committedGraphVerified,true);assert.equal(manifest.provenance.gitEnvironmentOverridesIgnored,true);
 await assert.rejects(buildQA('a'.repeat(40)),/real HEAD/);
 await assert.rejects(verify(dir,sha),/identity/);await assert.rejects(verifyQA(dir,'b'.repeat(40)),/real HEAD/);
 await buildQA(sha);for(const f of await readdir(dir))assert.deepEqual(await readFile(dir+'/'+f),before[f]);
 await writeFile(dir+'/app.mjs','tampered');await assert.rejects(verifyQA(dir,sha),/hash/);await buildQA(sha);
});
test('QA derivation fails closed on any pinned-source or replacement-count drift',async()=>{
 for(const f of Object.keys(sourcePins))assert.throws(()=>transform(f,'drift'),/input drift/);
 assert.throws(()=>replaceOnce('x x','x','y'),/count drift/);assert.throws(()=>replaceOnce('z','x','y'),/count drift/);
 await assert.rejects(buildQA('main'),/real HEAD/);
});
test('wrong QA origin has no authority and makes zero requests',async()=>{
 for(const origin of ['https://vibecast.tv','https://evil.example.org','http://qa.vibecast.tv','https://qa.vibecast.tv:8443','https://qa.vibecast.tv.evil.example.org','null']){
  const s=syntheticQAService();await use(s,async a=>assert.equal(a.contract,null),origin);assert.equal(s.calls.length,0);
 }
});
test('QA synthetic real crypto preserves original TTL, one consume and bound destination',async()=>{
 const s=syntheticQAService();await use(s,async a=>{const c=await a.create();assert.equal(c.expiresAt,s.qr.expires_at);assert.equal(s.qr.service_origin,qa.service);a.expose(c);const e=await a.wait({challenge:c});assert.equal(await a.verifyDestination(e,{challenge:c}),'https://ha.example.org/djconnect/vibecast/display');assert.equal(s.calls.filter(c=>c.route==='consume').length,1);assert.equal(a.validateChallenge(c),false);await assert.rejects(a.create());});
 for(const c of s.calls){assert.equal(c.opts.credentials,'omit');assert.equal(c.opts.redirect,'error');assert.equal(c.opts.referrerPolicy,'no-referrer');}
});
test('prod and QA adapters reject the opposite QR service, without retry',async()=>{
 const q=syntheticQAService({qrService:'https://api.djconnect.dev'});await use(q,async a=>{await assert.rejects(a.create());});assert.equal(q.calls.length,1);
 const p=syntheticQAService({service:'https://api.djconnect.dev',origin:'https://vibecast.tv',qrService:qa.service});const a=createRendezvousAdapter({fetch:p.fetch,visible:()=>true});await assert.rejects(a.create());assert.equal(p.calls.length,1);
});
test('prod and QA reject the opposite authenticated bootstrap origin',async()=>{
 const q=syntheticQAService({plainOrigin:'https://vibecast.tv'});await use(q,async a=>{const c=await a.create();a.expose(c);const e=await a.wait({challenge:c});await assert.rejects(a.verifyDestination(e,{challenge:c}));});
 const p=syntheticQAService({service:'https://api.djconnect.dev',origin:'https://vibecast.tv',plainOrigin:qa.browser});const a=createRendezvousAdapter({fetch:p.fetch,visible:()=>true});const c=await a.create();a.expose(c);const e=await a.wait({challenge:c});await assert.rejects(a.verifyDestination(e,{challenge:c}));
});
test('QA unknown consume reconciles through poll, never replays or renews',async()=>{
 const s=syntheticQAService({loseConsume:true});await use(s,async a=>{const c=await a.create();a.expose(c);await assert.rejects(a.wait({challenge:c}));await assert.rejects(a.create());});assert.equal(s.calls.filter(c=>c.route==='consume').length,1);assert.equal(s.calls.filter(c=>c.route==='create').length,1);assert.ok(s.calls.filter(c=>c.route==='poll').length>=2);
});
test('origin loss after create blocks every following transport',async()=>{
 const s=syntheticQAService();await use(s,async a=>{const c=await a.create();a.expose(c);globalThis.location.origin='https://vibecast.tv';await assert.rejects(a.cancel(c));});assert.deepEqual(s.calls.map(c=>c.route),['create']);
});

test('all seventeen selected closed schemas match the frozen API QA fixture exactly',async()=>{
 const bytes=await readFile('docs/contracts/fixed-qa-20261021/wire-request-schemas-qa.json');
 const fixture=JSON.parse(await readFile('docs/contracts/fixed-qa-20261021/qa-origin-fixture.json'));
 assert.equal(fixture.source_sha,'9a87fb2f3cc821c0a2482e8fa6b88c2340179e78');assert.equal(fixture.activation_allowed,false);assert.equal(fixture.operational_admission,null);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.wire_schema_sha256);
 const schemas=JSON.parse(bytes).$defs;
 for(const [key,value] of Object.entries(definitions)){const selected=structuredClone(value);if(key==='qr_payload')selected.properties.service_origin.const=qa.service;assert.deepEqual(selected,schemas[key],key);}
});
