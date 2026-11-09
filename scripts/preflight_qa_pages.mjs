import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { api, guardTrustedRun, isReceiverRepositoryName } from './promotion_guard.mjs';
import { readbackQAAccess } from './readback_qa_access.mjs';
import { verifyQA } from './verify_bootstrap_qa.mjs';

export function selectQAArtifact({ artifacts, total_count: totalCount }, sha) {
  if (artifacts.length !== totalCount) throw Error('Incomplete CI artifact inventory');
  const candidates = artifacts.filter(({ name }) => name === `bootstrap-qa-${sha}`);
  const [artifact] = candidates;
  if (candidates.length !== 1 || artifact.expired !== false ||
      !Number.isSafeInteger(artifact.id) || artifact.id < 1 ||
      !/^sha256:[0-9a-f]{64}$/.test(artifact.digest)) {
    throw Error('Expected one available QA artifact with a provider digest');
  }
  return artifact;
}

export async function withVerifiedQAPackage(usePackage) {
  const { GITHUB_REPOSITORY: repository, GITHUB_REF: branch, GITHUB_SHA: checkoutSHA,
    CANDIDATE_SHA: sha, ARTIFACT_RUN_ID: runId, RUNNER_TEMP: runnerTemp } = process.env;
  if (!isReceiverRepositoryName(repository) ||
      !/^[1-9][0-9]*$/.test(runId ?? '')) throw Error('Invalid QA repository or CI run ID');

  const repositoryPath = `repos/${repository}`;
  const runPath = `${repositoryPath}/actions/runs/${runId}`;
  const currentMain = () => api(`${repositoryPath}/commits/main`).sha;
  guardTrustedRun({ repository, branch, sha, checkoutSHA, currentMain: currentMain(), run: api(runPath) });

  const { id, digest } = selectQAArtifact(api(`${runPath}/artifacts?per_page=100`), sha);
  const zip = execFileSync('gh', ['api', `${repositoryPath}/actions/artifacts/${id}/zip`], {
    maxBuffer: 8 * 1024 * 1024,
  });
  if (`sha256:${createHash('sha256').update(zip).digest('hex')}` !== digest) {
    throw Error('QA artifact ZIP digest mismatch');
  }

  const scratch = await mkdtemp(path.join(runnerTemp, 'vibecast-qa-preflight-'));
  try {
    const archive = path.join(scratch, 'provider.zip');
    const extracted = path.join(scratch, 'artifact');
    await writeFile(archive, zip);
    await mkdir(extracted);
    const members = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trimEnd().split('\n');
    if (members.length > 64 || members.some(member => !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(member)) ||
        new Set(members).size !== members.length) throw Error('Unexpected QA ZIP member');
    for (const member of members) {
      // Stream bounded bytes into a regular file. Never restore archive metadata or symlinks.
      const bytes = execFileSync('unzip', ['-p', archive, member], { maxBuffer: 1048576 });
      await writeFile(path.join(extracted, member), bytes, { flag: 'wx' });
    }
    const manifest = await verifyQA(extracted, sha);
    const access = await readbackQAAccess(undefined, fetch, Object.keys(manifest.files));
    const assertCurrentMain = () => {
      if (currentMain() !== sha) throw Error('QA candidate changed during preflight');
    };
    assertCurrentMain();
    return await usePackage({
      artifact: { sourceSHA: sha, runId, artifactId: id, zipDigest: digest },
      access, directory: extracted, files: Object.keys(manifest.files),
      sourceFiles: manifest.provenance.sourceFiles, assertCurrentMain,
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const receipt = await withVerifiedQAPackage(({ artifact, access }) => ({ ...artifact, access }));
  console.log(JSON.stringify(receipt));
}
