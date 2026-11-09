import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { api, guardSource } from './promotion_guard.mjs';
import { withVerifiedQAPackage } from './preflight_qa_pages.mjs';
import { readbackQAAccess } from './readback_qa_access.mjs';

const account = 'efe77cadf8317a53832fca0848e3ae51';
const projectName = 'vibecast-tv-bootstrap-qa';
const projectId = 'a8f2e47e-0ad4-46fd-b4bd-bb3358065be8';
const host = projectName + '.pages.dev';
const projectRoute = `/accounts/${account}/pages/projects/${projectName}`;
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const candidateOrigin = /^https:\/\/[a-f0-9]{8}\.vibecast-tv-bootstrap-qa\.pages\.dev$/;

export function requireEmptyQAProduction(project) {
  if (project?.id !== projectId || project.name !== projectName || project.subdomain !== host ||
      project.source != null || project.production_branch !== 'main' ||
      !Array.isArray(project.domains) || project.domains.length !== 2 ||
      !project.domains.includes('qa.vibecast.tv') || !project.domains.includes(host) ||
      project.canonical_deployment !== null) {
    throw Error('Expected the fixed Direct Upload QA project with no production deployment');
  }
}

export function selectQAPreview(deployments, branch, sha, origin, priorIds) {
  const matches = deployments.filter(item => item.deployment_trigger?.metadata?.branch === branch);
  const [preview] = matches;
  if (matches.length !== 1 || !uuid.test(preview.id) || priorIds.has(preview.id) ||
      preview.environment !== 'preview' || preview.url !== origin || !candidateOrigin.test(origin) ||
      preview.latest_stage?.status !== 'success' ||
      preview.deployment_trigger.metadata.commit_hash !== sha ||
      !preview.aliases?.includes(`https://${branch}.${host}`)) {
    throw Error('Could not confirm a single successful, run-owned QA preview');
  }
  return preview;
}

async function publish() {
  const env = process.env;
  const { GITHUB_REPOSITORY: repository, GITHUB_REF: branch, GITHUB_SHA: checkoutSHA,
    CANDIDATE_SHA: sha, ARTIFACT_RUN_ID: runId, GITHUB_RUN_ID: uploadId,
    GITHUB_RUN_ATTEMPT: attempt, QA_ARTIFACT_DIGEST: approvedDigest,
    CLOUDFLARE_API_TOKEN: token } = env;
  if (repository !== 'pcvantol/djconnect-vibecast-receiver' ||
      ![runId, uploadId].every(value => /^[1-9][0-9]*$/.test(value ?? '')) || attempt !== '1' ||
      !/^sha256:[0-9a-f]{64}$/.test(approvedDigest ?? '') || !token) {
    throw Error('Exact QA run, approved artifact digest and dedicated credential required');
  }
  const repositoryPath = `repos/${repository}`;
  const checkApprovalPolicy = () => guardSource({
    repository, branch, sha, checkoutSHA, currentMain: api(`${repositoryPath}/commits/main`).sha,
    run: api(`${repositoryPath}/actions/runs/${runId}`),
    environment: api(`${repositoryPath}/environments/vibecast-qa`),
  });
  checkApprovalPolicy();

  const call = async route => {
    const response = await fetch('https://api.cloudflare.com/client/v4' + route, {
      headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok || body.success !== true) throw Error('QA Pages provider read failed');
    return body.result;
  };
  const previewBranch = `qa-preview-${uploadId}-${attempt}`;
  const list = () => call(projectRoute + '/deployments?per_page=25');
  const checkProject = async () => {
    requireEmptyQAProduction(await call(projectRoute));
    const domain = await call(projectRoute + '/domains/qa.vibecast.tv');
    if (domain.name !== 'qa.vibecast.tv' || domain.status !== 'active') {
      throw Error('Expected the active fixed QA domain');
    }
  };
  const save = receipt => writeFile('qa-preview-receipt.json', JSON.stringify(receipt, null, 2) + '\n');

  await withVerifiedQAPackage(async ({ artifact, directory, files, assertCurrentMain }) => {
    if (artifact.zipDigest !== approvedDigest) throw Error('QA digest does not match reviewed selection');
    const health = await fetch('https://api-vibecast-qa.djconnect.dev/health', {
      redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    const service = await health.json();
    if (!health.ok || service.service !== 'djconnect-api-vibecast-qa' ||
        service.activation_allowed !== false || !/^[a-f0-9]{40}$/.test(service.release_sha)) {
      throw Error('Closed QA Worker required for infrastructure-only preview');
    }
    await checkProject();
    const prior = await list();
    if (prior.some(item => item.deployment_trigger?.metadata?.branch === previewBranch)) {
      throw Error('QA preview branch already exists');
    }
    await readbackQAAccess(undefined, fetch, files, previewBranch);
    const receipt = { ...artifact, previewBranch, serviceSHA: service.release_sha, state: 'upload-pending' };
    await save(receipt);
    checkApprovalPolicy();
    assertCurrentMain();

    const { GH_TOKEN, GITHUB_TOKEN, ...wranglerEnv } = env;
    const output = execFileSync('node_modules/.bin/wrangler', [
      'pages', 'deploy', directory, `--project-name=${projectName}`, `--branch=${previewBranch}`,
      `--commit-hash=${sha}`, '--commit-dirty=false',
    ], {
      encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...wranglerEnv, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: 'false' },
    });
    const [origin, ...other] = new Set(output.match(/https:\/\/[a-f0-9]{8}\.vibecast-tv-bootstrap-qa\.pages\.dev\b/g));
    if (!origin || other.length) throw Error('No single immutable QA preview URL in upload output');
    const preview = selectQAPreview(await list(), previewBranch, sha, origin, new Set(prior.map(item => item.id)));
    Object.assign(receipt, { state: 'preview-created', deploymentId: preview.id, origin });
    await save(receipt);
    await checkProject();
    const access = await readbackQAAccess(new URL(origin).hostname.split('.')[0], fetch, files, previewBranch);
    assertCurrentMain();
    await save({ ...receipt, state: 'anonymous-access-verified', access });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await publish();
  } catch (error) {
    // Child-process errors can include tool output. Only emit the operator-facing error.
    console.error(error?.cmd ? 'QA preview upload or verification command failed. Reconcile this run before retrying.' : error.message);
    process.exitCode = 1;
  }
}
