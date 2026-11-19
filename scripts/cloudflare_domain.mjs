import {readFile,writeFile} from 'node:fs/promises';
import {inspectStable as inspect,target,safeReadFailure} from './cloudflare_readiness.mjs';
import {api,guard} from './promotion_guard.mjs';

const projectRoute=`/accounts/${target.account}/pages/projects/${target.project}`;
const domainRoute=projectRoute+'/domains/'+target.domain;
const dnsRoute=`/zones/${target.zone}/dns_records`;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const expected=record=>record?.name===target.domain&&record.type==='CNAME'&&record.content===target.project+'.pages.dev'&&record.proxied===true;
const addresses=records=>records.filter(r=>r.name===target.domain&&['A','AAAA','CNAME'].includes(r.type));
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(value);

function client({pagesToken,dnsToken,request=fetch}) {
 return async function call(route,method,body,dns=false,missing=false) {
  let response,data;
  try {
   response=await request('https://api.cloudflare.com/client/v4'+route,{method,redirect:'error',headers:{Authorization:'Bearer '+(dns?dnsToken:pagesToken),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
   if(missing&&response.status===404)return null;
   data=await response.json();
  }catch {throw Error('Cloudflare domain operation failed');}
  if(!response.ok||data.success!==true)throw Error('Cloudflare domain operation denied');
  return data.result;
 };
}

export async function bindDomain(options,{sourceSHA,runID,save=async()=>{}}) {
 if(!/^[a-f0-9]{40}$/.test(sourceSHA)||!/^\d+$/.test(runID))throw Error('Invalid publication identity');
 const initial=await inspect(options),prior=addresses(initial.records),call=client(options);
 if(prior.length>1||prior.some(r=>!expected(r)))throw Error('Existing root destination must not be replaced');
 const domain=await call(domainRoute,'GET',null,false,true);
 if(domain&&(domain.name!==target.domain||!identifier(domain.id)))throw Error('Unexpected domain identity');
 if(!domain&&prior.length)throw Error('Unassociated existing DNS is not owned by this run');
 const receipt={schema:1,sourceSHA,runID,account:target.account,project:target.project,zone:target.zone,domain:target.domain,initialAddresses:prior,initialDomainID:domain?.id??null,createdDomainID:null,createdRecordID:null,pendingMutation:null,stage:'baseline',complete:false};
 await save(receipt);
 // Create and retain the exact DNS mutation receipt before association. Pages
 // must not cause an observed record to be guessed as this run's property.
 if(!prior.length) {
  const before=addresses((await inspect(options)).records);
  if(before.length)throw Error('Root appeared before DNS creation; ownership is unknown');
  receipt.stage='dns-create';receipt.pendingMutation='dns-create';await save(receipt);
  const created=await call(dnsRoute,'POST',{type:'CNAME',name:target.domain,content:target.project+'.pages.dev',ttl:1,proxied:true},true);
  if(!expected(created)||!identifier(created.id))throw Error('Unexpected created DNS record');
  receipt.createdRecordID=created.id;receipt.pendingMutation=null;await save(receipt);
 }
 const assertCurrent=async stage=>{
  receipt.stage=stage;await save(receipt);
  const deadline=AbortSignal.timeout(30000),request=options.request??fetch;
  const observedOptions={...options,request:(url,init)=>request(url,{...init,signal:AbortSignal.any([init.signal,deadline])})};
  for(let attempt=1;attempt<=20&&!deadline.aborted;attempt++) {
   const current=addresses((await inspect(observedOptions)).records);
   receipt.rootReadback={attempt,addresses:current};await save(receipt);
   const ownedID=receipt.createdRecordID??prior[0]?.id;
   if(current.length) {
    if(current.length!==1||!expected(current[0])||current[0].id!==ownedID)throw Error('Root identity changed; do not associate or delete');
    return;
   }
   if(attempt<20)await(options.pause??pause)(500);
  }
  throw Error('Confirmed root record did not become visible');
 };
 await assertCurrent('dns-before-association');
 if(!domain) {
  receipt.stage='domain-create';receipt.pendingMutation='domain-create';await save(receipt);
  const created=await call(projectRoute+'/domains','POST',{name:target.domain});
  if(created?.name!==target.domain||!identifier(created.id))throw Error('Unexpected created domain identity');
  receipt.createdDomainID=created.id;receipt.pendingMutation=null;await save(receipt);
 }
 await assertCurrent('dns-after-association');
 receipt.stage='complete';receipt.complete=true;await save(receipt);return receipt;
}

export async function rollbackDomain(options,receipt,{sourceSHA,runID}) {
 if(options.account!==target.account||!options.pagesToken||!options.dnsToken||!/^[a-f0-9]{40}$/.test(sourceSHA)||!/^\d+$/.test(runID))throw Error('Invalid rollback context');
 if(receipt.schema!==1||receipt.sourceSHA!==sourceSHA||receipt.runID!==runID||receipt.account!==target.account||receipt.project!==target.project||receipt.zone!==target.zone||receipt.domain!==target.domain||!Array.isArray(receipt.initialAddresses))throw Error('Untrusted rollback receipt');
 if(receipt.pendingMutation)throw Error('Unconfirmed mutation requires manual reconciliation');
 if(receipt.createdRecordID&&receipt.initialAddresses.length)throw Error('Cannot delete a pre-existing root');
 if(receipt.createdDomainID&&receipt.initialDomainID)throw Error('Cannot delete a pre-existing association');
 const currentBefore=addresses((await inspect(options)).records);
 if(receipt.createdRecordID&&currentBefore.some(r=>r.id!==receipt.createdRecordID||!expected(r)))throw Error('Root ownership changed; no rollback writes');
 if(!receipt.createdRecordID&&JSON.stringify(currentBefore)!==JSON.stringify(receipt.initialAddresses))throw Error('Unowned root changed; no rollback writes');
 const call=client(options);
 const domainBefore=await call(domainRoute,'GET',null,false,true);
 if(domainBefore&&(domainBefore.name!==target.domain||domainBefore.id!==(receipt.createdDomainID??receipt.initialDomainID)))throw Error('Association ownership changed; no rollback writes');
 if(receipt.createdRecordID) {
  if(!identifier(receipt.createdRecordID))throw Error('Invalid rollback DNS identity');
  const route=dnsRoute+'/'+receipt.createdRecordID,record=await call(route,'GET',null,true,true);
  if(record) {
   if(record.id!==receipt.createdRecordID||!expected(record))throw Error('Owned DNS changed; do not delete');
   await call(route,'DELETE',null,true);
  }
 }
 if(receipt.createdDomainID) {
  const domain=await call(domainRoute,'GET',null,false,true);
  if(domain) {
   if(domain.id!==receipt.createdDomainID||domain.name!==target.domain)throw Error('Owned domain changed; do not delete');
   await call(domainRoute,'DELETE');
  }
 }
 const current=addresses((await inspect(options)).records);
 if(JSON.stringify(current)!==JSON.stringify(receipt.initialAddresses))throw Error('Initial root binding was not restored');
 const domain=await call(domainRoute,'GET',null,false,true);
 if((domain?.id??null)!==receipt.initialDomainID)throw Error('Initial association was not restored');
 return {schema:1,sourceSHA,runID,domain:target.domain,rollback:'PASS',scope:'only this run created root binding; Pages artifact retained'};
}

if(process.argv[1]===new URL(import.meta.url).pathname) {
 try {
  const options={pagesToken:process.env.CLOUDFLARE_API_TOKEN,dnsToken:process.env.CLOUDFLARE_DNS_API_TOKEN,account:process.env.CLOUDFLARE_ACCOUNT_ID,observe:observation=>writeFile('cloudflare-read-observation.json',JSON.stringify(observation,null,2)+'\n')};
  if(options.account!==target.account||!options.pagesToken||!options.dnsToken)throw Error('Missing scoped credentials');
  const identity={sourceSHA:process.env.GITHUB_SHA,runID:process.env.GITHUB_RUN_ID};
  if(process.argv[2]==='bind') {
   const repository=process.env.GITHUB_REPOSITORY;
   guard({repository,branch:process.env.GITHUB_REF,sha:process.env.CANDIDATE_SHA,checkoutSHA:identity.sourceSHA,currentMain:api(`repos/${repository}/commits/main`).sha,run:api(`repos/${repository}/actions/runs/${process.env.ARTIFACT_RUN_ID}`),environment:api(`repos/${repository}/environments/vibecast-production`),config:JSON.parse(await readFile('bootstrap/deployment.json','utf8')),account:options.account});
   await bindDomain(options,{...identity,save:receipt=>writeFile('domain-receipt.json',JSON.stringify(receipt,null,2)+'\n')});
   process.stdout.write('Fixed root association and DNS readback PASS; TLS and artifact checks still required\n');
  } else if(process.argv[2]==='rollback') {
   const receipt=JSON.parse(await readFile('domain-receipt.json','utf8'));
   await writeFile('domain-rollback.json',JSON.stringify(await rollbackDomain(options,receipt,identity),null,2)+'\n');
   process.stdout.write('Only this run created root binding restored; Pages artifact retained\n');
  } else throw Error('Unknown action');
 }catch(error) {const failure=safeReadFailure(error);await writeFile('cloudflare-failure.json',JSON.stringify(failure,null,2)+'\n');process.stderr.write(JSON.stringify(failure)+'\n');process.exitCode=1;}
}
