import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {api,guardSource,isReceiverRepositoryName,receiverRepositoryId} from './promotion_guard.mjs';
import {rollbackDomain} from './cloudflare_domain.mjs';
import {target,safeReadFailure} from './cloudflare_readiness.mjs';

// Two measured failed mutations, never a general historical rollback selector.
export const recovery=Object.freeze({sourceSHA:'b4dcff6210714d3504fcebcf07aaa6b15e0372a1',runID:'38933359799',recordID:'d548e42ff358abe72ae62dd6d4a65974',receiptSHA256:'7862100cd05a055c8c72d9bed9955fb3f37154d846cf8006dcfa181e9947e4df'});
export const recoveries=Object.freeze({'restore-run38933359799':recovery,'restore-run38934680867':Object.freeze({sourceSHA:'2363ae88adec172c440c0381ae8bf7b4c54ceb96',runID:'38934680867',recordID:'2466bc3dba8dfbc57afeca117866ff76',receiptSHA256:'fb75076de8a81ae20b9fd0a67ea2d5462c2194560cc4ed4ce5dab1666fc4179e'})});
export function guardRecovery(run,raw,recoveryPin=recovery) {
 if(!Object.values(recoveries).includes(recoveryPin))throw Error('Unknown fixed recovery');
 const recovery=recoveryPin;
 if(String(run.id)!==recovery.runID||run.repository?.id!==receiverRepositoryId||!isReceiverRepositoryName(run.repository.full_name)||run.head_sha!==recovery.sourceSHA||run.head_branch!=='main'||run.event!=='workflow_dispatch'||run.path!=='.github/workflows/bootstrap-publish.yml'||run.status!=='completed'||run.conclusion!=='failure')throw Error('Untrusted failed publication');
 if(createHash('sha256').update(raw).digest('hex')!==recovery.receiptSHA256)throw Error('Recovery receipt hash mismatch');
 const receipt=JSON.parse(raw);
 if(receipt.sourceSHA!==recovery.sourceSHA||receipt.runID!==recovery.runID||receipt.createdRecordID!==recovery.recordID||receipt.createdDomainID!==null||receipt.initialDomainID!==null||receipt.pendingMutation!==null||receipt.complete!==false||receipt.stage!=='dns-before-association'||!Array.isArray(receipt.initialAddresses)||receipt.initialAddresses.length!==0)throw Error('Unexpected recovery scope');
 return receipt;
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
 try {
  const repository=process.env.GITHUB_REPOSITORY,sha=process.env.CANDIDATE_SHA;
  guardSource({repository,branch:process.env.GITHUB_REF,sha,checkoutSHA:process.env.GITHUB_SHA,currentMain:api(`repos/${repository}/commits/main`).sha,run:api(`repos/${repository}/actions/runs/${process.env.ARTIFACT_RUN_ID}`),environment:api(`repos/${repository}/environments/vibecast-production`)});
  const selected=recoveries[process.env.RECOVERY_OPERATION];
  if(!selected)throw Error('Unknown fixed recovery');
  const receipt=guardRecovery(api(`repos/${repository}/actions/runs/${selected.runID}`),await readFile('prior-publication/domain-receipt.json'),selected);
  const options={pagesToken:process.env.CLOUDFLARE_API_TOKEN,dnsToken:process.env.CLOUDFLARE_DNS_API_TOKEN,account:process.env.CLOUDFLARE_ACCOUNT_ID,observe:observation=>writeFile('cloudflare-read-observation.json',JSON.stringify(observation,null,2)+'\n')};
  if(options.account!==target.account)throw Error('Wrong recovery account');
  const restored=await rollbackDomain(options,receipt,selected);
  await writeFile('domain-reconciliation.json',JSON.stringify({...restored,executorSHA:sha,executorRunID:process.env.GITHUB_RUN_ID,priorReceiptSHA256:selected.receiptSHA256},null,2)+'\n');
  process.stdout.write('Exact prior failed-run owned binding restored; no upload or association\n');
 }catch(error){const failure=safeReadFailure(error);await writeFile('cloudflare-failure.json',JSON.stringify(failure,null,2)+'\n');process.stderr.write(JSON.stringify(failure)+'\n');process.exitCode=1;}
}
