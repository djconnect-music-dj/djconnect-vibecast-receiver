import { pathToFileURL } from 'node:url';

const pagesHost = 'vibecast-tv-bootstrap-qa.pages.dev';
const loginOrigin = 'https://pcvantol.cloudflareaccess.com';

export async function readbackQAAccess(deploymentId, fetcher = fetch) {
  if (deploymentId !== undefined && !/^[a-f0-9]{8}$/.test(deploymentId)) {
    throw Error('Expected the eight-character immutable QA Pages deployment ID');
  }

  const hosts = ['qa.vibecast.tv', pagesHost, `${deploymentId ?? 'test-access'}.${pagesHost}`];
  const observations = [];
  for (const host of hosts) {
    for (const route of ['/', '/build-manifest.json', '/app.mjs']) {
      const response = await fetcher(new URL(route, `https://${host}`), {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      await response.body?.cancel();

      const location = response.headers.get('location');
      const login = location && URL.canParse(location) ? new URL(location) : null;
      if (response.status !== 302 || login?.origin !== loginOrigin ||
          login.username || login.password || login.pathname !== `/cdn-cgi/access/login/${host}`) {
        throw Error(`Expected Cloudflare Access for ${host}${route} (HTTP ${response.status})`);
      }
      observations.push({ host, route, status: response.status });
    }
  }

  return { scope: deploymentId === undefined ? 'PRE_UPLOAD' : 'IMMUTABLE_DEPLOYMENT', observations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 3) throw Error('Pass at most one immutable QA Pages deployment ID');
  console.log(JSON.stringify(await readbackQAAccess(process.argv[2])));
}
