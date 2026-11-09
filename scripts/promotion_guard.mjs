import {execFileSync} from 'node:child_process';

export const receiverRepositoryId = 1324916521;
const receiverNames = new Set([
 'pcvantol/djconnect-vibecast-receiver',
 'djconnect-music-dj/djconnect-vibecast-receiver',
]);

export function isReceiverRepositoryName(name) {
 return receiverNames.has(name);
}

export function guardTrustedRun({repository,branch,sha,checkoutSHA,currentMain,run}) {
 if(!isReceiverRepositoryName(repository)||branch!=='refs/heads/main'||!/^[a-f0-9]{40}$/.test(sha)||sha!==currentMain||sha!==checkoutSHA)throw Error('Wrong repository, branch or stale candidate');
 if(run.head_sha!==sha||run.head_branch!=='main'||run.event!=='push'||run.conclusion!=='success'||run.path!=='.github/workflows/ci.yml'||run.repository?.id!==receiverRepositoryId||run.repository.full_name!==repository)throw Error('Untrusted or failed artifact run');
}
export function guardSource(input) {
 guardTrustedRun(input);
 const {environment}=input;
 if(!environment.protection_rules?.some(rule=>rule.type==='required_reviewers'&&rule.reviewers?.length===1&&rule.reviewers[0].type==='User'&&rule.reviewers[0].reviewer?.login==='pcvantol'&&rule.reviewers[0].reviewer?.id===19624891&&typeof rule.prevent_self_review==='boolean')||environment.can_admins_bypass!==false||environment.deployment_branch_policy?.protected_branches!==true||environment.deployment_branch_policy?.custom_branch_policies!==false)throw Error('Protected non-bypassable owner reviewer environment required');
}
export function guard(input) {
 guardSource(input);
 const {config,account}=input;
 if(config.publication_mode!=='INITIAL_BINDING_ONLY'||config.project!=='vibecast-tv-bootstrap'||config.production_origin!=='https://vibecast.tv'||config.status!=='QUALIFIED'||!config.account_id||config.account_id!==account)throw Error('Unqualified deployment target');
}
export function api(route){return JSON.parse(execFileSync('gh',['api',route],{encoding:'utf8'}));}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const {readFile}=await import('node:fs/promises');
 const repository=process.env.GITHUB_REPOSITORY,sha=process.env.CANDIDATE_SHA;
 const run=api(`repos/${repository}/actions/runs/${process.env.ARTIFACT_RUN_ID}`);
 guard({repository,branch:process.env.GITHUB_REF,sha,checkoutSHA:process.env.GITHUB_SHA,currentMain:api(`repos/${repository}/commits/main`).sha,run,environment:api(`repos/${repository}/environments/vibecast-production`),config:JSON.parse(await readFile('bootstrap/deployment.json','utf8')),account:process.env.CLOUDFLARE_ACCOUNT_ID});
 process.stdout.write('Promotion guard PASS\n');
}
