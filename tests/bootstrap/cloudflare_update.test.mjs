import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,project,deployment,ownedRollback,immutableFromLog,downloadPrior,rollbackToPrior} from '../../scripts/cloudflare_update.mjs';
import {target} from '../../scripts/cloudflare_readiness.mjs';
const source='a'.repeat(40),priorID=baseline.id,nextID='aabbccdd-1234-4321-1234-123456789abc';
const origin='https://aabbccdd.vibecast-tv-bootstrap.pages.dev';
function record(id=priorID,url=baseline.origin,sha=baseline.sourceSHA,env='production'){return{id,url,environment:env,latest_stage:{status:'success'},deployment_trigger:{metadata:{commit_hash:sha,branch:env==='production'?'main':'qualification-'+sha.slice(0,12)}}};}
function bound(canonical=record()){return{id:target.projectID,name:target.project,source:null,production_branch:'main',subdomain:target.project+'.pages.dev',domains:[target.domain],canonical_deployment:canonical};}
function receipt(){return{sourceSHA:source,prior:{id:priorID,origin:baseline.origin},production:{id:nextID,origin}};}

test('update accepts only fixed Direct Upload bound project and successful exact deployment',()=>{
 assert.equal(project(bound()).id,priorID);
 assert.equal(deployment(record(),baseline).id,priorID);
 for(const mutate of [p=>p.id='other',p=>p.source={type:'github'},p=>p.domains=[],p=>p.production_branch='staging',p=>p.subdomain='other.pages.dev']){const p=bound();mutate(p);assert.throws(()=>project(p));}
 for(const mutate of [p=>p.id='../escape',p=>p.url='https://other.example',p=>p.environment='preview',p=>p.latest_stage.status='failure',p=>p.deployment_trigger.metadata.commit_hash=source,p=>p.deployment_trigger.metadata.branch='other']){const p=record();mutate(p);assert.throws(()=>deployment(p,baseline));}
});
test('immutable upload result must be exactly one fixed-project origin',()=>{
 assert.equal(immutableFromLog('upload '+origin+'\n'+origin),origin);
 for(const log of ['', 'https://aabbccdd.other.pages.dev',origin+' https://11223344.vibecast-tv-bootstrap.pages.dev'])assert.throws(()=>immutableFromLog(log));
});
test('preview identity must match exact candidate qualification branch, never production',()=>{
 const preview=record(nextID,origin,source,'preview');
 assert.equal(deployment(preview,{origin,sourceSHA:source,environment:'preview'}).id,nextID);
 assert.throws(()=>deployment(preview,{origin,sourceSHA:source}));
 preview.deployment_trigger.metadata.branch='qualification-other';
 assert.throws(()=>deployment(preview,{origin,sourceSHA:source,environment:'preview'}));
});
test('rollback refuses unknown/foreign production, even one carrying same source SHA',()=>{
 assert.equal(ownedRollback(record(),receipt()),false);
 assert.equal(ownedRollback(record(nextID,origin,source),receipt()),true);
 for(const current of [record('11223344-1234-4321-1234-123456789abc',origin,source),record(nextID,'https://other.example',source),record(nextID,origin,'b'.repeat(40))])assert.throws(()=>ownedRollback(current,receipt()));
 const unknown=receipt();unknown.production=null;assert.throws(()=>ownedRollback(record(nextID,origin,source),unknown));
});
test('prior download fails closed before trusting substituted or oversized manifest',async()=>{
 await assert.rejects(downloadPrior({fetcher:async()=>new Response('{}')}),/Untrusted prior manifest/);
 await assert.rejects(downloadPrior({fetcher:async()=>new Response('{}',{headers:{'content-length':'1048577'}})}),/Oversized/);
 await assert.rejects(downloadPrior({fetcher:async()=>new Response('',{status:404})}),/unavailable/);
});
test('confirmed rollback persists intent before POST and verifies old production and root',async()=>{
 const events=[];let active=record(nextID,origin,source);
 await rollbackToPrior({receipt:receipt(),save:async r=>events.push('save:'+r.stage),call:async(route,method='GET')=>{events.push(method);if(method==='POST'){assert.equal(events.at(-2),'save:rollback-pending');assert.ok(route.endsWith('/'+priorID+'/rollback'));active=record();return active;}return bound(active);},read:async(manifest,url)=>{assert.equal(url,'https://vibecast.tv');events.push('read');return{outcome:'PASS'};}});
 assert.deepEqual(events,['GET','save:rollback-pending','POST','GET','read','save:prior-restored']);
});
test('foreign update cannot trigger rollback writes; original unchanged needs only readback',async()=>{
 let posts=0,reads=0;
 const call=async(_route,method)=>{if(method==='POST')posts++;return bound(record('11223344-1234-4321-1234-123456789abc',origin,source));};
 await assert.rejects(rollbackToPrior({call,receipt:receipt(),save:async()=>{},read:async()=>reads++}),/manual reconciliation/);
 assert.equal(posts,0);assert.equal(reads,0);
 await rollbackToPrior({call:async()=>bound(),receipt:receipt(),save:async()=>{},read:async()=>{reads++;return{outcome:'PASS'};}});
 assert.equal(reads,1);assert.equal(posts,0);
});
test('rollback intent save failure prevents mutation, and mismatched restore prevents PASS',async()=>{
 let posts=0;
 await assert.rejects(rollbackToPrior({call:async()=>bound(record(nextID,origin,source)),receipt:receipt(),save:async()=>{throw Error('disk failure');}}),/disk failure/);
 await assert.rejects(rollbackToPrior({call:async(_route,method)=>{if(method==='POST')posts++;return bound(record(nextID,origin,source));},receipt:receipt(),save:async()=>{},read:async()=>{throw Error('must not read');}}),/Deployment identity mismatch/);
 assert.equal(posts,1);
});
