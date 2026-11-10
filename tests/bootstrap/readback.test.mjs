import test from 'node:test';import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';import{build}from'../../scripts/build_bootstrap.mjs';import{readback}from'../../scripts/readback_bootstrap.mjs';
async function fixture(mutate=()=>{}){
 const directory='dist/readback-fixture';await build(directory,'a'.repeat(40));
 const source=await readFile(directory+'/_headers','utf8');
 const policy=Object.fromEntries(source.split('\n').slice(1).filter(line=>line.includes(':')).map(line=>{const i=line.indexOf(':');return[line.slice(0,i).trim().toLowerCase(),line.slice(i+1).trim()];}));
 return async url=>{const route=url.pathname;const file=['/','/index','/index.html'].includes(route)?'index.html':route==='/__vibecast_missing__'?'404.html':route.slice(1);const headers={...policy,'content-type':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/plain'};mutate(headers,route);return new Response(await readFile(directory+'/'+file),{status:route==='/__vibecast_missing__'?404:200,headers});};
}
test('HTTPS readback checks every exact asset, entry, manifest and real error page',async()=>{const fetcher=await fixture();assert.equal((await readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',fetcher)).outcome,'PASS');});
test('HTTPS readback rejects each missing required header and partial CSP/permissions',async()=>{
 for(const key of ['cache-control','referrer-policy','x-content-type-options','x-frame-options','strict-transport-security','permissions-policy','content-security-policy']){
  const fetcher=await fixture(headers=>delete headers[key]);await assert.rejects(readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',fetcher),/Header policy mismatch/);
 }
 for(const [key,value]of [['content-security-policy',"connect-src 'none'"],['permissions-policy','camera=()']]){
  const fetcher=await fixture(headers=>headers[key]=value);await assert.rejects(readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',fetcher),/Header policy mismatch/);
 }
});
test('manifest, clean entry and error routes must also carry the full policy',async()=>{for(const target of ['/build-manifest.json','/index','/__vibecast_missing__']){const fetcher=await fixture((headers,route)=>{if(route===target)delete headers['content-security-policy'];});await assert.rejects(readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',fetcher),/Header policy mismatch/);}});

test('inert checksum download MIME is explicit; executable and document MIME checks remain strict',async()=>{
 const download=await fixture((headers,route)=>{if(route==='/SHA256SUMS')headers['content-type']='application/octet-stream';});
 assert.equal((await readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',download)).outcome,'PASS');
 for(const target of ['/app.mjs','/','/style.css','/build-manifest.json','/brand-mark-32.png']){
  const wrong=await fixture((headers,route)=>{if(route===target)headers['content-type']='application/octet-stream';});
  await assert.rejects(readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',wrong),/Content type mismatch/);
 }
 const unsafe=await fixture((headers,route)=>{if(route==='/SHA256SUMS')headers['content-type']='text/html';});
 await assert.rejects(readback('dist/readback-fixture/build-manifest.json','https://bootstrap.example',unsafe),/Content type mismatch/);
});
