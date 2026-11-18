import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDomain,rollbackDomain} from '../../scripts/cloudflare_domain.mjs';
import {target} from '../../scripts/cloudflare_readiness.mjs';

const identity={sourceSHA:'a'.repeat(40),runID:'12345'};
const cname={id:'b'.repeat(32),name:target.domain,type:'CNAME',content:target.project+'.pages.dev',ttl:1,proxied:true};
function fixture({existing=false,conflict=false,automatic=false,uncertain=false,visibilityDelay=0,countDelay=0}={}) {
 let missingReads=visibilityDelay,laggingCounts=0;
 const state={domain:existing?{id:'domain-id',name:target.domain}:null,records:existing?[{...cname}]:conflict?[{...cname,type:'A',content:'192.0.2.1'}]:[],calls:[]};
 const options={pause:async()=>{},account:target.account,pagesToken:'synthetic-pages',dnsToken:'synthetic-dns',request:async(url,opts)=>{
  const path=new URL(url).pathname,method=opts.method,body=opts.body?JSON.parse(opts.body):null;
  state.calls.push({path,method,body,token:opts.headers.Authorization});
  const reply=(result,status=200)=>({ok:status===200,status,json:async()=>({success:status===200,result,...(Array.isArray(result)?{result_info:{page:1,total_pages:1,total_count:result.length}}:{})})});
  if(path.endsWith('/projects/'+target.project))return reply({id:target.projectID,name:target.project,production_branch:'main',source:null,subdomain:target.project+'.pages.dev',domains:state.domain?[target.domain]:[]});
  if(path.endsWith('/domains')&&method==='POST') {
   if(uncertain)throw Error('synthetic-pages');
   state.domain={id:'domain-id',name:body.name};if(automatic)state.records=[{...cname,id:'other-actor-record'}];return reply(state.domain);
  }
  if(path.endsWith('/domains/'+target.domain)) {
   if(method==='DELETE'){state.domain=null;return reply(null);}
   return reply(state.domain,state.domain?200:404);
  }
  if(path.endsWith('/dns_records')) {
   if(method==='POST'){state.records.push({id:cname.id,...body});laggingCounts=countDelay;return reply(state.records.at(-1));}
   if(state.records.length&&missingReads-->0)return reply([]);
   if(laggingCounts-->0){const response=reply(state.records),body=await response.json();body.result_info.total_count=state.records.length?0:1;return {...response,json:async()=>body};}
   return reply(state.records);
  }
  if(path.endsWith('/dns_records/'+cname.id)) {
   const record=state.records.find(r=>r.id===cname.id);
   if(method==='DELETE'){state.records=state.records.filter(r=>r.id!==cname.id);laggingCounts=countDelay;return reply(null);}
   return reply(record,record?200:404);
  }
  throw Error('Unexpected test request');
 }};
 return {state,options};
}
test('new root association and DNS restore only same-run exact identities',async()=>{
 const {state,options}=fixture();const saved=[];
 const receipt=await bindDomain(options,{...identity,save:async r=>saved.push(structuredClone(r))});
 assert.equal(receipt.complete,true);assert.equal(receipt.createdRecordID,cname.id);assert.ok(saved.some(r=>r.pendingMutation==='domain-create'));assert.ok(saved.some(r=>r.pendingMutation==='dns-create'));
 assert.equal((await rollbackDomain(options,receipt,identity)).rollback,'PASS');assert.equal(state.domain,null);assert.deepEqual(state.records,[]);
 for(const call of state.calls){if(call.path.includes('/dns_records'))assert.equal(call.token,'Bearer synthetic-dns');else assert.equal(call.token,'Bearer synthetic-pages');}
 assert.ok(state.calls.filter(c=>c.method==='DELETE').every(c=>c.path.endsWith(cname.id)||c.path.endsWith('/domains/'+target.domain)));
 assert.ok(!JSON.stringify(receipt).includes('synthetic-'));
});
test('replacement by another actor after association cannot be claimed or removed',async()=>{
 const {state,options}=fixture({automatic:true});let receipt;
 await assert.rejects(bindDomain(options,{...identity,save:async r=>{receipt=structuredClone(r);}}));
 assert.equal(receipt.createdRecordID,cname.id);assert.equal(state.records[0].id,'other-actor-record');
 const before=state.calls.length;await assert.rejects(rollbackDomain(options,receipt,identity));
 assert.equal(state.calls.slice(before).filter(c=>c.method!=='GET').length,0);assert.equal(state.records[0].id,'other-actor-record');
});
test('pre-existing valid binding is preserved without mutation',async()=>{
 const old=fixture({existing:true});const retained=await bindDomain(old.options,identity);assert.equal(retained.createdRecordID,null);assert.equal(retained.createdDomainID,null);await rollbackDomain(old.options,retained,identity);assert.equal(old.state.calls.filter(c=>c.method!=='GET').length,0);assert.equal(old.state.records.length,1);
});
test('existing website, changed owned record and foreign rollback receipt cannot be overwritten/deleted',async()=>{
 const conflict=fixture({conflict:true});await assert.rejects(bindDomain(conflict.options,identity));assert.equal(conflict.state.calls.filter(c=>c.method!=='GET').length,0);
 const {state,options}=fixture();const receipt=await bindDomain(options,identity);state.records[0].content='other.example';const before=state.calls.length;await assert.rejects(rollbackDomain(options,receipt,identity));assert.equal(state.calls.slice(before).filter(c=>c.method!=='GET').length,0);
 for(const patch of [{sourceSHA:'b'.repeat(40)},{runID:'other'},{project:'djconnect-vibecast-receiver'},{initialAddresses:[cname]}])await assert.rejects(rollbackDomain(options,{...receipt,...patch},identity));
});
test('uncertain provider mutation leaves audit marker and requires reconciliation',async()=>{
 const {state,options}=fixture({uncertain:true});let saved;
 await assert.rejects(bindDomain(options,{...identity,save:async r=>{saved=structuredClone(r);}}));assert.equal(saved.pendingMutation,'domain-create');await assert.rejects(rollbackDomain(options,saved,identity));assert.equal(state.calls.filter(c=>c.method==='DELETE').length,0);
});

test('confirmed own record can propagate through empty lists; other identities still fail immediately',async()=>{
 const delayed=fixture({visibilityDelay:2});let receipt;
 const done=await bindDomain(delayed.options,{...identity,save:async r=>{receipt=structuredClone(r);}});
 assert.equal(done.complete,true);assert.equal(receipt.createdRecordID,cname.id);assert.equal(receipt.stage,'complete');
 const absent=fixture({visibilityDelay:100});await assert.rejects(bindDomain(absent.options,identity),/did not become visible/);
});

test('rollback refuses an unowned association before any DNS deletion',async()=>{
 const {state,options}=fixture();const receipt=await bindDomain(options,identity);
 state.domain={id:'foreign-domain',name:target.domain};state.calls=[];
 await assert.rejects(rollbackDomain(options,receipt,identity));
 assert.equal(state.calls.filter(call=>call.method==='DELETE').length,0);
});

test('post-write count lag requires a later complete inventory for bind and rollback',async()=>{
 const {state,options}=fixture({countDelay:2});const receipt=await bindDomain(options,identity);
 assert.equal(receipt.complete,true);
 assert.equal((await rollbackDomain(options,receipt,identity)).rollback,'PASS');
 assert.equal(state.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/dns_records')).length,1);
});
