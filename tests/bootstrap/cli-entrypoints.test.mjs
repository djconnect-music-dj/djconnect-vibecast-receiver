import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, readFile, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const entries=['readback_bootstrap','wait_bootstrap','promotion_guard','cloudflare_readiness','cloudflare_domain','reconcile_initial_binding'];
async function fixture(t) {
 const directory=await mkdtemp(path.join(tmpdir(),'vibecast CLI spaces '));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const scripts=path.join(directory,'repo with spaces','scripts');await mkdir(scripts,{recursive:true});
 for(const name of entries)await copyFile(path.join(root,'scripts',name+'.mjs'),path.join(scripts,name+'.mjs'));
 // A declared minimal artifact fixture, not a product build or source proof.
 const artifact=path.join(directory,'artifact');await mkdir(artifact);
 const contents={'_headers':await readFile(path.join(root,'bootstrap/public/_headers')),
   'index.html':'<!doctype html><title>Fixture</title>', '404.html':'<!doctype html><title>Missing fixture</title>',
   'join.html':'<!doctype html><title>Native join fixture</title>', 'app.mjs':'export const fixture=true;'};
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const files={};for(const [file,bytes] of Object.entries(contents)){await writeFile(path.join(artifact,file),bytes);files[file]=hash(bytes);}
 const manifest=JSON.stringify({schema:1,sourceSHA:'a'.repeat(40),product:'vibecast-tv-bootstrap',rendezvous:'unavailable',files});
 await writeFile(path.join(artifact,'build-manifest.json'),manifest);
 await writeFile(path.join(artifact,'SHA256SUMS'),Object.entries({...files,'build-manifest.json':hash(manifest)}).sort().map(([file,digest])=>digest+'  '+file+'\n').join(''));
 const config=path.join(directory,'bootstrap');await mkdir(config);await writeFile(path.join(config,'deployment.json'),'{}');
 const bin=path.join(directory,'bin');await mkdir(bin);
 await writeFile(path.join(bin,'gh'),'#!/bin/sh\nprintf "{}\\n"\n',{mode:0o700});
 const preload=path.join(directory,'modelled-fetch.mjs');
 await writeFile(preload,`import {readFile,appendFile} from 'node:fs/promises';
import path from 'node:path';
const artifact=process.env.DJC_CLI_ARTIFACT;
const source=await readFile(path.join(artifact,'_headers'),'utf8');
const policy=Object.fromEntries(source.split('\\n').slice(1).filter(line=>line.includes(':')).map(line=>{const i=line.indexOf(':');return[line.slice(0,i).trim().toLowerCase(),line.slice(i+1).trim()]}));
globalThis.fetch=async value=>{
 const url=new URL(value);await appendFile(process.env.DJC_CLI_REQUEST_LOG,url.origin+url.pathname+'\\n');
 if(url.origin!=='https://vibecast.tv')throw Error('Unexpected modelled network origin');
 const route=url.pathname,file=['/','/index','/index.html'].includes(route)?'index.html':route==='/join'?'join.html':route==='/__vibecast_missing__'?'404.html':route.slice(1);
 const type=file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/plain';
 return new Response(await readFile(path.join(artifact,file)),{status:route==='/__vibecast_missing__'?404:200,headers:{...policy,'content-type':type}});
};`);
 const requests=path.join(directory,'modelled-requests.log');
 // Deliberately do not inherit provider/GitHub credentials or real gh. Every
 // modeled fetch is local fixture bytes; unexpected origins fail before egress.
 const env={PATH:bin,TMPDIR:directory,DJC_CLI_ARTIFACT:artifact,DJC_CLI_REQUEST_LOG:requests};
 const run=(name,args=[])=>spawnSync(process.execPath,['--import',preload,path.join(scripts,name+'.mjs'),...args],
   {cwd:directory,env,encoding:'utf8',timeout:10000});
 return {directory,scripts,artifact,requests,env,preload,run};
}
function cleanProcess(result) {
 assert.equal(result.error,undefined);
 assert.doesNotMatch(result.stderr,/ERR_MODULE_NOT_FOUND|Cannot find module/);
}

test('actual readback CLI executes with spaces, reports PASS, and rejects invalid bytes/origin',async t=>{
 const f=await fixture(t),manifest=path.join(f.artifact,'build-manifest.json');
 const good=f.run('readback_bootstrap',[manifest,'https://vibecast.tv']);cleanProcess(good);
 assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).outcome,'PASS');
 const routes=await readFile(f.requests,'utf8');assert.match(routes,/https:\/\/vibecast.tv\/join\n/);
 assert.match(routes,/https:\/\/vibecast.tv\/__vibecast_missing__\n/);
 const origin=f.run('readback_bootstrap',[manifest,'http://vibecast.tv']);cleanProcess(origin);
 assert.notEqual(origin.status,0);assert.match(origin.stderr,/Exact HTTPS origin required/);
 await writeFile(path.join(f.artifact,'index.html'),'tampered fixture');
 const corrupt=f.run('readback_bootstrap',[manifest,'https://vibecast.tv']);cleanProcess(corrupt);
 assert.notEqual(corrupt.status,0);assert.match(corrupt.stderr,/Readback hash mismatch/);
});

test('actual waiting CLI executes with spaces and rejects invalid fixed origins without retries',async t=>{
 const f=await fixture(t),manifest=path.join(f.artifact,'build-manifest.json');
 const good=f.run('wait_bootstrap',[manifest,'https://vibecast.tv']);cleanProcess(good);
 assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).attempt,1);
 const bad=f.run('wait_bootstrap',[manifest,'https://untrusted.example']);cleanProcess(bad);
 assert.notEqual(bad.status,0);assert.match(bad.stderr,/Fixed production or immutable HTTPS origin required/);
});

for(const name of entries.slice(2))test('actual '+name+' CLI fails closed instead of silently succeeding in a spaced path',async t=>{
 const f=await fixture(t),result=f.run(name);cleanProcess(result);
 assert.notEqual(result.status,0,'Missing source/credential authority must not be a successful CLI no-op');
 if(name==='promotion_guard')assert.match(result.stderr,/Wrong repository, branch or stale candidate/);
 else assert.equal(JSON.parse(await readFile(path.join(f.directory,'cloudflare-failure.json'),'utf8')).outcome,'FAIL');
 await assert.rejects(readFile(f.requests),/ENOENT/,'No provider request is admitted');
});

test('importing the six tools remains inert after repairing CLI detection',async t=>{
 const f=await fixture(t),entry=path.join(f.directory,'import-only.mjs');
 await writeFile(entry,`import {pathToFileURL} from 'node:url';for(const name of ${JSON.stringify(entries)})await import(pathToFileURL(${JSON.stringify(f.scripts)}+'/'+name+'.mjs'));console.log('IMPORT_ONLY');`);
 const result=spawnSync(process.execPath,['--import',f.preload,entry],{cwd:f.directory,env:f.env,encoding:'utf8',timeout:10000});
 cleanProcess(result);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'IMPORT_ONLY');
 await assert.rejects(readFile(f.requests),/ENOENT/);await assert.rejects(readFile(path.join(f.directory,'cloudflare-failure.json')),/ENOENT/);
});
