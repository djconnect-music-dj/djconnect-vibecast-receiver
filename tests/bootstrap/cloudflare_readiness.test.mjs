import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,target,guardInitialPublication} from '../../scripts/cloudflare_readiness.mjs';

const project={id:target.projectID,name:target.project,production_branch:'main',source:null,subdomain:target.project+'.pages.dev'};
const record={id:'record',name:target.domain,type:'CNAME',content:target.project+'.pages.dev',ttl:1,proxied:true};
function setup({badProject=false,deny=false,badPage=false,foreign=false}={}) {
 const calls=[];
 return {calls,options:{pagesToken:'synthetic-pages-secret',dnsToken:'synthetic-dns-secret',account:target.account,request:async(url,options)=>{
  calls.push({url,options});
  const isProject=url.includes('/pages/projects/');
  return {ok:!deny,json:async()=>deny?{success:false,errors:[{message:'synthetic-dns-secret'}]}:{success:true,result:isProject?{...project,...(badProject?{source:{type:'github'}}:{})}:[foreign?{...record,name:'other.example'}:record,{id:'txt',name:target.domain,type:'TXT',content:'must-not-export',ttl:1}],result_info:{page:badPage?2:1,total_pages:1,total_count:2}}};
 }}};
}
test('readiness only GETs fixed targets with separate credentials and excludes TXT content',async()=>{
 const {calls,options}=setup();const receipt=await inspect(options);
 assert.equal(receipt.read_access,'PASS');assert.equal(receipt.write_access,'NOT_TESTED');assert.equal(receipt.publication,'NOT_RUN');
 assert.equal(calls.length,2);
 for(const call of calls){assert.equal(call.options.method,'GET');assert.equal(call.options.redirect,'error');assert.ok(call.url.startsWith('https://api.cloudflare.com/client/v4/'));}
 assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-pages-secret');assert.equal(calls[1].options.headers.Authorization,'Bearer synthetic-dns-secret');
 const output=JSON.stringify(receipt);for(const secret of ['synthetic-pages-secret','synthetic-dns-secret','must-not-export'])assert.ok(!output.includes(secret));
 assert.equal(receipt.records[0].content,record.content);
});
test('wrong target, incomplete inventory, foreign records and denied access fail closed without error-body leaks',async()=>{
 for(const change of [{badProject:true},{badPage:true},{foreign:true},{deny:true}])await assert.rejects(inspect(setup(change).options),error=>!error.message.includes('synthetic-'));
 const {options,calls}=setup();await assert.rejects(inspect({...options,account:'other'}));await assert.rejects(inspect({...options,dnsToken:''}));assert.equal(calls.length,0);
});

test('empty zones are complete only with explicit zero count',async()=>{const {options}=setup();const previous=options.request;options.request=async(url,opts)=>url.includes('/pages/projects/')?previous(url,opts):({ok:true,json:async()=>({success:true,result:[],result_info:{page:1,total_pages:0,total_count:0}})});assert.deepEqual((await inspect(options)).records,[]);});

test('pagination rejects duplicate identities, count drift and page-count drift',async()=>{
 for(const fault of ['none','duplicate','count','pages']) {
  const {options}=setup();const previous=options.request;
  options.request=async(url,opts)=>{
   if(url.includes('/pages/projects/'))return previous(url,opts);
   const page=Number(new URL(url).searchParams.get('page'));
   return {ok:true,json:async()=>({success:true,result:[{...record,id:fault==='duplicate'?'same':'record'+page}],result_info:{page,total_pages:page===2&&fault==='pages'?3:2,total_count:page===2&&fault==='count'?3:2}})};
  };
  if(fault==='none')assert.equal((await inspect(options)).records.length,2);
  else await assert.rejects(inspect(options));
 }
});

test('initial publication cannot overwrite an already associated or addressed root',()=>{
 const receipt={domain:target.domain,project:{id:target.projectID,domains:[target.project+'.pages.dev']},read_access:'PASS',records:[]};
 assert.doesNotThrow(()=>guardInitialPublication(receipt));
 assert.throws(()=>guardInitialPublication({...receipt,project:{...receipt.project,domains:[target.domain]}}));
 assert.throws(()=>guardInitialPublication({...receipt,records:[{name:target.domain,type:'A',content:'192.0.2.1'}]}));
 assert.throws(()=>guardInitialPublication({...receipt,read_access:'UNKNOWN'}));
});

test('read diagnostics contain only fixed status, numeric pagination and identity booleans',async()=>{
 const {options}=setup();const observations=[];
 await inspect({...options,observe:async value=>observations.push(value)});
 const raw=JSON.stringify(observations);
 for(const secret of ['synthetic-pages-secret','synthetic-dns-secret','must-not-export','vibecast.tv','record'])assert.ok(!raw.includes(secret));
 assert.equal(observations.at(-1).info.total_count,2);assert.equal(observations.at(-1).identities[0].name,true);
 const {safeReadFailure}=await import('../../scripts/cloudflare_readiness.mjs');
 assert.equal(safeReadFailure(Error('Cloudflare read access denied')).reason,'Cloudflare read access denied');
 assert.equal(safeReadFailure(Error('synthetic-dns-secret')).reason,'Unclassified local failure');
});

test('stable inspection retries only full inconsistent inventories, never accepts one or retries foreign identities',async()=>{
 const {inspectStable}=await import('../../scripts/cloudflare_readiness.mjs');
 for(const lag of [2,100]) {
  const {options}=setup();const previous=options.request;let reads=0;
  options.pause=async()=>{};options.request=async(url,opts)=>{
   const response=await previous(url,opts);if(url.includes('/dns_records')&&++reads<=lag){const body=await response.json();body.result_info.total_count=0;return {...response,json:async()=>body};}return response;
  };
  if(lag===2){const result=await inspectStable(options);assert.equal(result.records.length,2);assert.equal(reads,3);}
  else {await assert.rejects(inspectStable(options),/Incomplete DNS inventory/);assert.equal(reads,20);}
 }
 const {options,calls}=setup({foreign:true});options.pause=async()=>{};
 await assert.rejects(inspectStable(options),/Unexpected DNS record identity/);assert.equal(calls.length,2);
});
