import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {api,guardSource} from './promotion_guard.mjs';
import {target} from './cloudflare_readiness.mjs';
import {verify} from './verify_bootstrap.mjs';
import {waitReadback} from './wait_bootstrap.mjs';

// Current independently qualified live baseline; never advance this pin automatically.
export const baseline=Object.freeze({id:'0aefddee-691c-4039-8788-f332db3f9fe4',sourceSHA:'cb064cf2b0f0df89fe9d7b8d60213c264222ef9a',origin:'https://0aefddee.vibecast-tv-bootstrap.pages.dev',manifestSHA256:'370cf37b065a71b5f8f93745e6a21a53c191166b28010a3824c6fc9f1b40a89f'});
const route=`/accounts/${target.account}/pages/projects/${target.project}`;
const priorDirectory='artifacts/update-prior/bootstrap',receiptPath='update-receipt.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export function deployment(value,{id,origin,sourceSHA,environment='production'}) {
 if(!uuid(value?.id)||(id&&value.id!==id)||value.url!==origin||value.environment!==environment||value.latest_stage?.status!=='success'||value.deployment_trigger?.metadata?.commit_hash!==sourceSHA||value.deployment_trigger?.metadata?.branch!==(environment==='production'?'main':'qualification-'+sourceSHA.slice(0,12)))throw Error('Deployment identity mismatch');
 return {id:value.id,origin:value.url,sourceSHA,environment};
}
export function project(value) {
 if(value?.id!==target.projectID||value.name!==target.project||value.source!=null||value.production_branch!=='main'||value.subdomain!==target.project+'.pages.dev'||!value.domains?.includes(target.domain))throw Error('Fixed bound Pages project required');
 return value.canonical_deployment;
}
export function ownedRollback(current,receipt) {
 if(current?.id===receipt.prior.id)return false;
 if(!receipt.production?.id||current?.id!==receipt.production.id||current?.url!==receipt.production.origin||current?.deployment_trigger?.metadata?.commit_hash!==receipt.sourceSHA)throw Error('Unknown or changed production; manual reconciliation required');
 return true;
}
export function immutableFromLog(log) {
 const origins=[...new Set(log.match(/https:\/\/[a-f0-9]{8}\.vibecast-tv-bootstrap\.pages\.dev/g)??[])];
 if(origins.length!==1)throw Error('One immutable deployment origin required');
 return origins[0];
}
export async function downloadPrior({fetcher=fetch,directory=priorDirectory}={}) {
 async function bytes(file) {
  // Pages consumes _headers and canonicalizes index.html; neither is a raw file route.
  if(file==='_headers')return execFileSync('gh',['api','-H','Accept: application/vnd.github.raw+json',
   'repos/pcvantol/djconnect-vibecast-receiver/contents/bootstrap/public/_headers?ref='+baseline.sourceSHA]);
  const route=file==='index.html'?'/':file==='404.html'?'/__vibecast_missing__':'/'+file;
  const response=await fetcher(baseline.origin+route,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.status!==(file==='404.html'?404:200))throw Error('Prior artifact unavailable');
  const length=Number(response.headers.get('content-length'));
  if(length>1048576)throw Error('Oversized prior artifact');
  const data=Buffer.from(await response.arrayBuffer());if(data.length>1048576)throw Error('Oversized prior artifact');return data;
 }
 const manifestBytes=await bytes('build-manifest.json');
 if(hash(manifestBytes)!==baseline.manifestSHA256)throw Error('Untrusted prior manifest');
 const manifest=JSON.parse(manifestBytes);
 const files=[...Object.keys(manifest.files),'SHA256SUMS'];
 if(files.length>100||files.some(f=>! /^[a-zA-Z0-9._-]+$/.test(f)))throw Error('Unsafe prior artifact');
 await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'build-manifest.json'),manifestBytes);
 for(const file of files)await writeFile(path.join(directory,file),await bytes(file));
 await verify(directory,baseline.sourceSHA);
 return path.join(directory,'build-manifest.json');
}
export async function rollbackToPrior({call,receipt,save,read=waitReadback}) {
 const current=project(await call(route));
 if(ownedRollback(current,receipt)) {
  receipt.stage='rollback-pending';await save(receipt);
  await call(route+'/deployments/'+receipt.prior.id+'/rollback','POST');
  const restored=deployment(project(await call(route)),baseline);
  if(restored.id!==receipt.prior.id)throw Error('Prior production identity not restored');
 }
 const proof=await read(priorDirectory+'/build-manifest.json','https://vibecast.tv');
 receipt.stage='prior-restored';receipt.rollback=proof;await save(receipt);return proof;
}

async function main(action) {
 const sourceSHA=process.env.CANDIDATE_SHA,runID=process.env.GITHUB_RUN_ID;
 if(!/^\d+$/.test(runID??'')||process.env.CLOUDFLARE_ACCOUNT_ID!==target.account||!process.env.CLOUDFLARE_API_TOKEN)throw Error('Fixed scoped credentials required');
 const save=r=>writeFile(receiptPath,JSON.stringify(r,null,2)+'\n');
 const call=async(endpoint,method='GET')=>{
  let response,body;try{response=await fetch('https://api.cloudflare.com/client/v4'+endpoint,{method,redirect:'error',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});body=await response.json();}catch{throw Error('Pages request failed');}
  if(!response.ok||body.success!==true)throw Error('Pages request denied');return body.result;
 };
 const sourceGuard=()=>guardSource({repository:process.env.GITHUB_REPOSITORY,branch:process.env.GITHUB_REF,sha:sourceSHA,checkoutSHA:process.env.GITHUB_SHA,currentMain:api('repos/pcvantol/djconnect-vibecast-receiver/commits/main').sha,run:api('repos/pcvantol/djconnect-vibecast-receiver/actions/runs/'+process.env.ARTIFACT_RUN_ID),environment:api('repos/pcvantol/djconnect-vibecast-receiver/environments/vibecast-production')});
 if(action==='prepare') {
  sourceGuard();await verify('dist/bootstrap',sourceSHA);
  const prior=deployment(project(await call(route)),baseline);
  const domain=await call(route+'/domains/'+target.domain);
  if(domain.name!==target.domain||domain.status!=='active')throw Error('Active fixed domain required');
  const manifest=await downloadPrior();
  await waitReadback(manifest,baseline.origin);await waitReadback(manifest,'https://vibecast.tv');
  const priorHeaders=await readFile(priorDirectory+'/_headers','utf8');
  const candidateHeaders=await readFile('dist/bootstrap/_headers','utf8');
  if(candidateHeaders!==priorHeaders)throw Error('Unexpected header policy change');
  const current=deployment(project(await call(route)),baseline);
  if(current.id!==prior.id)throw Error('Production changed during preflight');
  await save({schema:1,sourceSHA,runID,account:target.account,project:target.project,prior,stage:'prepared',production:null});return;
 }
 const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
 if(receipt.schema!==1||receipt.sourceSHA!==sourceSHA||receipt.runID!==runID||receipt.account!==target.account||receipt.project!==target.project||receipt.prior?.id!==baseline.id||receipt.prior.origin!==baseline.origin||receipt.prior.sourceSHA!==baseline.sourceSHA)throw Error('Untrusted update receipt');
 if(action==='begin') {
  if(receipt.stage!=='prepared')throw Error('Update phase mismatch');
  sourceGuard();await verify('dist/bootstrap',sourceSHA);
  const previewOrigin=immutableFromLog(await readFile('bootstrap-preview.log','utf8'));
  const previewID=previewOrigin.split('//')[1].slice(0,8);
  const previews=await call(route+'/deployments?env=preview&per_page=25');
  const preview=previews.find(d=>d.url===previewOrigin&&d.id?.startsWith(previewID));
  receipt.preview=deployment(preview,{origin:previewOrigin,sourceSHA,environment:'preview'});
  await waitReadback('dist/bootstrap/build-manifest.json',previewOrigin);
  const current=deployment(project(await call(route)),baseline);
  if(current.id!==receipt.prior.id)throw Error('Production changed before upload');
  sourceGuard();receipt.stage='production-upload-pending';await save(receipt);return;
 }
 if(action==='adopt') {
  if(receipt.stage!=='production-upload-pending')throw Error('Update phase mismatch');
  const origin=immutableFromLog(await readFile('bootstrap-production.log','utf8'));
  let confirmed;
  for(let n=0;n<20;n++) {
   const current=project(await call(route));
   if(current?.url===origin){confirmed=deployment(current,{origin,sourceSHA});break;}
   if(current?.id!==receipt.prior.id)throw Error('Unexpected production after upload');
   await pause(1000);
  }
  if(!confirmed)throw Error('Unconfirmed production upload; manual reconciliation required');
  receipt.production=confirmed;receipt.stage='production-confirmed';await save(receipt);
  receipt.immutable=await waitReadback('dist/bootstrap/build-manifest.json',origin);
  receipt.root=await waitReadback('dist/bootstrap/build-manifest.json','https://vibecast.tv');
  receipt.stage='qualified';await save(receipt);return;
 }
 if(action==='rollback') {await rollbackToPrior({call,receipt,save});return;}
 throw Error('Unknown update operation');
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)) {
 try{await main(process.argv[2]);process.stdout.write('Fixed bootstrap update step PASS\n');}
 catch {process.stderr.write('Bootstrap update failed; retain receipts for bounded recovery/reconciliation\n');process.exitCode=1;}
}
