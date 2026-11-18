import {writeFile} from 'node:fs/promises';
import {api,guardSource} from './promotion_guard.mjs';

export const target=Object.freeze({account:'efe77cadf8317a53832fca0848e3ae51',project:'vibecast-tv-bootstrap',projectID:'a815fc66-5fc2-49d3-812f-28b7401b6643',zone:'14310b82eeb03876e6c551632a046e87',domain:'vibecast.tv'});

// Infrastructure-only readback. Never export credentials, provider error bodies,
// unrelated TXT/MX content, or a write-capability/publication PASS.
export async function inspect({pagesToken,dnsToken,account,request=fetch,observe=async()=>{}}) {
 if(account!==target.account||!pagesToken||!dnsToken)throw Error('Missing credential or incorrect fixed account');
 async function get(route,token) {
  let response,body;
  try {
   response=await request('https://api.cloudflare.com/client/v4'+route,{method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
   body=await response.json();
  } catch {throw Error('Cloudflare read request failed');}
  await observe({stage:route.includes('/dns_records')?'dns-response':'project-response',status:Number.isInteger(response.status)?response.status:null,success:body.success===true});
  if(!response.ok||body.success!==true)throw Error('Cloudflare read access denied');
  return body;
 }
 const project=(await get(`/accounts/${target.account}/pages/projects/${target.project}`,pagesToken)).result;
 if(project?.id!==target.projectID||project.name!==target.project||project.production_branch!=='main'||project.source!=null||project.subdomain!==target.project+'.pages.dev')throw Error('Unexpected Pages target or integration');
 const records=[];
 let totalCount,totalPages;
 const ids=new Set();
 for(let page=1;page<=20;page++) {
  const body=await get(`/zones/${target.zone}/dns_records?per_page=100&page=${page}`,dnsToken);
  const info=body.result_info;
  const integer=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  await observe({stage:'dns-inventory',requestedPage:page,resultLength:Array.isArray(body.result)?body.result.length:null,info:Object.fromEntries(['page','per_page','count','total_pages','total_count'].map(key=>[key,integer(info?.[key])])),identities:Array.isArray(body.result)?body.result.slice(0,100).map(r=>({id:typeof r?.id==='string',name:typeof r?.name==='string'&&(r.name===target.domain||r.name.endsWith('.'+target.domain)),type:typeof r?.type==='string',addressContent:!['A','AAAA','CNAME'].includes(r?.type)||typeof r.content==='string'})):[]});
  if(!Array.isArray(body.result)||!info||info.page!==page||!Number.isInteger(info.total_pages)||info.total_pages<0||info.total_pages>20||!Number.isInteger(info.total_count)||info.total_count<0)throw Error('Incomplete DNS inventory');
  if(totalCount!==undefined&&(totalCount!==info.total_count||totalPages!==info.total_pages))throw Error('DNS inventory changed during read');
  totalPages=info.total_pages;
  totalCount=info.total_count;
  if(info.total_pages===0&&!(page===1&&body.result.length===0&&totalCount===0))throw Error('Incomplete DNS inventory');
  for(const r of body.result) {
   if(typeof r.id!=='string'||typeof r.name!=='string'||!(r.name===target.domain||r.name.endsWith('.'+target.domain))||typeof r.type!=='string')throw Error('Unexpected DNS record identity');
   if(ids.has(r.id))throw Error('Repeated DNS record identity');
   ids.add(r.id);
   const item={id:r.id,name:r.name,type:r.type,ttl:r.ttl,proxied:r.proxied};
   if(['A','AAAA','CNAME'].includes(r.type)){if(typeof r.content!=='string')throw Error('Incomplete DNS target');item.content=r.content;}
   records.push(item);
  }
  if(info.total_pages===0||page===info.total_pages)break;
 }
 if(records.length!==totalCount)throw Error('Incomplete DNS inventory');
 return {schema:1,account:target.account,project:{id:project.id,name:project.name,production_branch:project.production_branch,source:project.source??null,subdomain:project.subdomain,domains:project.domains??[]},zone:target.zone,domain:target.domain,records,read_access:'PASS',write_access:'NOT_TESTED',publication:'NOT_RUN'};
}

export function guardInitialPublication(receipt) {
 if(receipt.domain!==target.domain||receipt.project?.id!==target.projectID||receipt.read_access!=='PASS'||receipt.project.domains.includes(target.domain)||receipt.records.some(r=>r.name===target.domain&&['A','AAAA','CNAME'].includes(r.type)))throw Error('Existing root needs a separately reviewed artifact promotion and rollback route');
}

// A confirmed write can precede Cloudflare's inventory total_count update.
// Retry the entire strict inventory; never accept inconsistent counts or IDs.
export async function inspectStable(options) {
 const deadline=AbortSignal.timeout(30000),request=options.request??fetch;
 const bounded={...options,request:(url,init)=>request(url,{...init,signal:AbortSignal.any([init.signal,deadline])})};
 for(let attempt=1;attempt<=20&&!deadline.aborted;attempt++) {
  try{return await inspect(bounded);}
  catch(error) {
   if(!['Incomplete DNS inventory','DNS inventory changed during read'].includes(error.message)||attempt===20||deadline.aborted)throw error;
  }
  await(options.pause??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(500);
 }
 throw Error('Incomplete DNS inventory');
}

export function safeReadFailure(error) {
 const known=new Set(['Missing credential or incorrect fixed account','Cloudflare read request failed','Cloudflare read access denied','Unexpected Pages target or integration','Incomplete DNS inventory','DNS inventory changed during read','Unexpected DNS record identity','Repeated DNS record identity','Incomplete DNS target']);
 return {outcome:'FAIL',reason:known.has(error?.message)?error.message:'Unclassified local failure'};
}

if(process.argv[1]===new URL(import.meta.url).pathname) {
 try {
  const repository=process.env.GITHUB_REPOSITORY,sha=process.env.CANDIDATE_SHA;
  guardSource({repository,branch:process.env.GITHUB_REF,sha,checkoutSHA:process.env.GITHUB_SHA,currentMain:api(`repos/${repository}/commits/main`).sha,run:api(`repos/${repository}/actions/runs/${process.env.ARTIFACT_RUN_ID}`),environment:api(`repos/${repository}/environments/vibecast-production`)});
  const receipt=await inspect({pagesToken:process.env.CLOUDFLARE_API_TOKEN,dnsToken:process.env.CLOUDFLARE_DNS_API_TOKEN,account:process.env.CLOUDFLARE_ACCOUNT_ID,observe:observation=>writeFile('cloudflare-read-observation.json',JSON.stringify(observation,null,2)+'\n')});
  if(process.argv[2]==='initial-publication')guardInitialPublication(receipt);
  await writeFile('cloudflare-readiness.json',JSON.stringify({...receipt,sourceSHA:sha},null,2)+'\n');
  process.stdout.write('Fixed Pages target and complete DNS read access PASS; no external writes\n');
 } catch(error) {const failure=safeReadFailure(error);await writeFile('cloudflare-failure.json',JSON.stringify(failure,null,2)+'\n');process.stderr.write(JSON.stringify(failure)+'\n');process.exitCode=1;}
}
