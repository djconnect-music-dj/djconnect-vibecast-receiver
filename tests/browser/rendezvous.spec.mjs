// Browser ADOPTION fixture only: synthetic service at intercepted fixed API URL.
// Actual browser fetch/WebCrypto/JWE/QR/view/event execution; no live API/HA/native.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {CompactEncrypt,calculateJwkThumbprint,importJWK} from 'jose';
import jsQR from 'jsqr';
const WIRE='djc-rendezvous/1',SERVICE='https://api.djconnect.dev',ORIGIN='https://vibecast.tv';
const text=new TextEncoder();
function scan(matrix){const scale=4,n=(matrix.length+8)*scale,rgba=new Uint8ClampedArray(n*n*4).fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.floor(y/scale)-4,c=Math.floor(x/scale)-4;if(matrix[r]?.[c]){const i=(y*n+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}}return jsQR(rgba,n,n)?.data;}
async function fixture(page,{lostCreate=0,deny=0,loseConsume=false,longBackoff=false,denyAfter=Infinity}={}){
 const calls=[],keys=[];let current,state='pending',envelope,createCount=0;
 const html=(await readFile('bootstrap/public/index.html','utf8')).replace('<script type="module" src="/app.mjs"></script>','');
 await page.route('**/adapter-fixture',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.route(SERVICE+'/v1/rendezvous/**',async route=>{
  const req=route.request(),name=req.url().split('/').at(-1);if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'http://127.0.0.1:4186','access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}});
  const body=req.postDataJSON();calls.push({name,body});
  const respond=(value,status=200)=>route.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':'http://127.0.0.1:4186'},body:JSON.stringify(value)});
  if(name==='create'){
   state='pending';createCount++;keys.push(body.browser_public_key);if(createCount<=lostCreate)return route.abort('failed');if(deny||createCount>denyAfter)return respond({v:WIRE,error:deny===429?'rate_limited':'service_unavailable'},deny||503);
   const created=Date.now(),thumb=await calculateJwkThumbprint(body.browser_public_key);current={type:'djc-rendezvous-qr',v:WIRE,service_origin:SERVICE,transaction_id:crypto.randomUUID(),generation:body.generation,expires_at:created+120000,browser_key_thumbprint:thumb,qr_capability:Buffer.alloc(32,9).toString('base64url')};
   await page.evaluate(value=>{window.fixtureExpected=value;},current);
   const plain={v:WIRE,transaction_id:current.transaction_id,generation:current.generation,browser_key_thumbprint:thumb,expires_at:current.expires_at,bootstrap_origin:ORIGIN,display_entry_url:'https://ha.example.org/djconnect/vibecast/display',issuer_epoch:Buffer.alloc(32,7).toString('base64url')};
   envelope=await new CompactEncrypt(text.encode(JSON.stringify(plain))).setProtectedHeader({alg:'RSA-OAEP-256',enc:'A256GCM',typ:'djc-rendezvous-destination+jwe',kid:thumb}).encrypt(await importJWK(body.browser_public_key,'RSA-OAEP-256'));
   return respond({v:WIRE,transaction_id:current.transaction_id,generation:current.generation,created_at:created,expires_at:current.expires_at,browser_key_thumbprint:thumb,qr_payload:current},201);
  }
  if(name==='poll'){if(longBackoff)return respond({v:WIRE,state:'pending',expires_at:current.expires_at,retry_after_ms:120000});if(state==='pending')state='ready';return respond({v:WIRE,state,expires_at:current.expires_at,retry_after_ms:2000});}
  if(name==='consume'){state='consumed';if(loseConsume)return route.abort('failed');return respond({v:WIRE,state,destination_envelope:envelope,expires_at:current.expires_at});}
  throw Error('unexpected test route');
 });
 await page.goto('/adapter-fixture');
 await page.evaluate(()=>{window.fixtureStates=[];window.fixtureUrls=[];window.fixtureDiagnostics={decrypt:[],verify:[],visibility:[]};});
 return {calls,keys,get qr(){return current;}};
}
async function run(page,{language='nl',accelerate=false,holdLong=false,diagnostic=false,autoRotate=false}={}){
 await page.evaluate(async({language,accelerate,holdLong,diagnostic,autoRotate})=>{
  const {createRendezvousAdapter}=await import('/rendezvous.mjs'),{BootstrapController}=await import('/lifecycle.mjs'),{renderState}=await import('/view.mjs');
  let offset=0;const options={visible:()=>document.visibilityState==='visible',...(accelerate?{monotonic:()=>performance.now()+offset,schedule:(fn,ms)=>{if(holdLong&&ms>100000){window.fixtureLongWake=()=>{offset+=ms;fn();};return -1;}return ms===2000?setTimeout(()=>{offset+=ms;fn();},10):setTimeout(fn,ms);}}:{})};
  // Test-only stage receipts; never log keys, ciphertext or decrypted payload.
  if(diagnostic){let last=-Infinity;const clock=options.monotonic||(()=>performance.now()),visible=options.visible;options.monotonic=()=>{const value=clock();if(value<last)window.fixtureDiagnostics.clockBackwards=true;last=value;return value;};options.visible=()=>{const value=visible();if(!value)window.fixtureDiagnostics.visibility.push(false);return value;};const decrypt=crypto.subtle.decrypt.bind(crypto.subtle);crypto.subtle.decrypt=async(...args)=>{const step={algorithm:args[0].name};let result;try{result=await decrypt(...args);step.ok=true;}catch(error){step.ok=false;step.errorName=error.name;window.fixtureDiagnostics.decrypt.push(step);throw error;}try{if(step.algorithm==='AES-GCM'){const data=JSON.parse(new TextDecoder().decode(result)),expected=window.fixtureExpected;step.matches={wire:data.v==='djc-rendezvous/1',transaction:data.transaction_id===expected.transaction_id,generation:data.generation===expected.generation,thumb:data.browser_key_thumbprint===expected.browser_key_thumbprint,expiry:data.expires_at===expected.expires_at,origin:data.bootstrap_origin==='https://vibecast.tv',display:data.display_entry_url==='https://ha.example.org/djconnect/vibecast/display'};}}catch{step.observationError=true;}window.fixtureDiagnostics.decrypt.push(step);return result;};}
  window.fixtureOptions=options;window.fixtureFactory=()=>{const adapter=createRendezvousAdapter(options);if(!diagnostic)return adapter;return{...adapter,async verifyDestination(...args){const step={visible:document.visibilityState};window.fixtureDiagnostics.verify.push(step);try{const result=await adapter.verifyDestination(...args);step.ok=true;return result;}catch(error){step.ok=false;step.state=error.state;throw error;}}};};
  window.fixtureAdapter=window.fixtureFactory();
  window.fixtureController=new BootstrapController({adapter:window.fixtureAdapter,adapterFactory:window.fixtureFactory,autoRotate,monotonic:options.monotonic,render:s=>{window.fixtureStates.push(s.state);if(s.challenge)window.fixtureMatrix=s.challenge.matrix;renderState(document,language,s);},navigate:u=>window.fixtureUrls.push(u)});
  const {bindPageLifecycle}=await import('/page-lifecycle.mjs');bindPageLifecycle(window.fixtureController);
  window.fixtureWork=window.fixtureController.start();
 },{language,accelerate,holdLong,diagnostic,autoRotate});
}
test('real fetch and standard browser crypto -> independently decoded QR -> exactly one handoff',async({page})=>{
 const f=await fixture(page);await run(page);await expect(page.locator('html')).toHaveAttribute('data-state','waiting');const matrix=await page.evaluate(()=>window.fixtureMatrix);expect(JSON.parse(scan(matrix))).toEqual(f.qr);
 await expect.poll(()=>page.evaluate(()=>window.fixtureUrls.length)).toBe(1);expect(await page.evaluate(()=>window.fixtureUrls)).toEqual(['https://ha.example.org/djconnect/vibecast/display']);expect(f.calls.filter(c=>c.name==='consume')).toHaveLength(1);await expect(page.locator('#qr-panel')).toBeHidden();
 const times=await page.evaluate(()=>{const c=window.fixtureController;return {empty:c.challenge===null,storage:[localStorage.length,sessionStorage.length]};});expect(times).toEqual({empty:true,storage:[0,0]});
});
test('lost initial response makes exactly one independent pre-QR replacement',async({page})=>{const f=await fixture(page,{lostCreate:1});await run(page,{accelerate:true,diagnostic:true});try{await expect.poll(()=>page.evaluate(()=>window.fixtureUrls.length)).toBe(1);}catch(error){console.log(JSON.stringify({scope:'TEST_ONLY_REDACTED_VERIFICATION_STAGES',diagnostics:await page.evaluate(()=>({stages:window.fixtureDiagnostics,states:window.fixtureStates}))}));throw error;}expect(f.keys).toHaveLength(2);expect(f.keys[0].n).not.toBe(f.keys[1].n);expect(f.calls.filter(c=>c.name==='create').map(c=>c.body.generation)).toEqual([1,2]);});
test('lost consume response reconciles consumed without replay or automatic create',async({page})=>{const f=await fixture(page,{loseConsume:true});await run(page,{accelerate:true});await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');await page.evaluate(async()=>{await window.fixtureController.reconnect();await window.fixtureController.start();});expect(f.calls.filter(c=>c.name==='consume')).toHaveLength(1);expect(f.calls.filter(c=>c.name==='create')).toHaveLength(1);expect(await page.evaluate(()=>window.fixtureUrls)).toEqual([]);});
for(const language of ['en','nl','de','fr','es'])test(`known429 finite unavailable in ${language}, no create storm`,async({page})=>{const f=await fixture(page,{deny:429});await run(page,{language});await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');await expect(page.locator('#state-title')).not.toHaveText('');await expect(page.locator('#qr-panel')).toBeHidden();await page.evaluate(async()=>{for(let n=0;n<3;n++){await window.fixtureController.start();await window.fixtureController.reconnect();}});expect(f.calls.filter(c=>c.name==='create')).toHaveLength(1);});
test('production online/BFCache/hidden events cannot mint an adapter allowance',async({page})=>{const external=[];page.on('request',r=>{if(r.url().startsWith(SERVICE))external.push(r.url());});await page.goto('/');await page.evaluate(()=>{dispatchEvent(new Event('online'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');expect(external).toEqual([]);});
test('automatic rotation does not start a new interaction after authenticated consume',async({page})=>{
 const f=await fixture(page,{loseConsume:true});await run(page,{accelerate:true,autoRotate:true});
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#retry')).toHaveCount(0);
 await page.evaluate(()=>dispatchEvent(new Event('online')));
 expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);
 expect(await page.evaluate(()=>window.fixtureUrls.length)).toBe(0);
});
test('hidden/context loss during actual keygen await cannot expose QR or POST on return',async({page})=>{
 const f=await fixture(page);await page.evaluate(async()=>{
  const {createRendezvousAdapter}=await import('/rendezvous.mjs'),{BootstrapController}=await import('/lifecycle.mjs'),{bindPageLifecycle}=await import('/page-lifecycle.mjs');
  let hidden=false;Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});window.fixtureHide=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};
  const subtle={generateKey:async(...a)=>{const key=await crypto.subtle.generateKey(...a);window.fixtureKeyExtractable=key.privateKey.extractable;await new Promise(r=>window.fixtureReleaseKey=r);return key;},exportKey:crypto.subtle.exportKey.bind(crypto.subtle),digest:crypto.subtle.digest.bind(crypto.subtle)};
  const a=createRendezvousAdapter({crypto:{subtle,getRandomValues:crypto.getRandomValues.bind(crypto)}});window.fixtureController=new BootstrapController({adapter:a,render:s=>window.fixtureStates.push(s.state),navigate:u=>window.fixtureUrls.push(u)});bindPageLifecycle(window.fixtureController);window.fixtureWork=window.fixtureController.start();
 });
 await expect.poll(()=>page.evaluate(()=>typeof window.fixtureReleaseKey)).toBe('function');await page.evaluate(async()=>{window.fixtureHide(true);window.fixtureHide(false);window.fixtureReleaseKey();await window.fixtureWork;dispatchEvent(new Event('online'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});expect(f.calls).toHaveLength(0);expect(await page.evaluate(()=>window.fixtureKeyExtractable)).toBe(false);expect(await page.evaluate(()=>window.fixtureUrls.length)).toBe(0);
});
test('late create response after pagehide is fenced before QR rendering',async({page})=>{const f=await fixture(page);await page.evaluate(async()=>{
 const {createRendezvousAdapter}=await import('/rendezvous.mjs'),{BootstrapController}=await import('/lifecycle.mjs'),{bindPageLifecycle}=await import('/page-lifecycle.mjs');
 const send=globalThis.fetch.bind(globalThis),a=createRendezvousAdapter({visible:()=>true,fetch:async(...args)=>{const r=await send(...args);await new Promise(resolve=>window.fixtureReleaseResponse=resolve);return r;}});
 window.fixtureController=new BootstrapController({adapter:a,render:s=>window.fixtureStates.push(s.state),navigate:u=>window.fixtureUrls.push(u)});bindPageLifecycle(window.fixtureController);window.fixtureWork=window.fixtureController.start();});
 await expect.poll(()=>page.evaluate(()=>typeof window.fixtureReleaseResponse)).toBe('function');await page.evaluate(async()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.fixtureReleaseResponse();await window.fixtureWork;dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);expect(await page.evaluate(()=>window.fixtureStates.includes('waiting'))).toBe(false);expect(await page.evaluate(()=>window.fixtureUrls.length)).toBe(0);
});
test('foreground QR rotates at its original expiry with a new key and no button or reload',async({page})=>{
 const f=await fixture(page,{longBackoff:true,denyAfter:2});
 await run(page,{accelerate:true,holdLong:true,autoRotate:true});
 const creates=()=>f.calls.filter(x=>x.name==='create').length;
 await expect.poll(()=>page.evaluate(()=>typeof window.fixtureLongWake)).toBe('function');
 await expect(page.locator('html')).toHaveAttribute('data-state','waiting');
 await expect(page.locator('#retry')).toHaveCount(0);
 expect(creates()).toBe(1);
 const first=f.qr.transaction_id;
 const url=page.url();
 const expire=()=>page.evaluate(()=>{const wake=window.fixtureLongWake;window.fixtureLongWake=undefined;wake();});
 await expire();
 await expect.poll(creates).toBe(2);
 await expect(page.locator('html')).toHaveAttribute('data-state','waiting');
 await expect(page.locator('#qr-panel')).toBeVisible();
 expect(f.qr.transaction_id).not.toBe(first);
 expect(f.keys[1]).not.toEqual(f.keys[0]);
 expect(page.url()).toBe(url);
 await expect.poll(()=>page.evaluate(()=>typeof window.fixtureLongWake)).toBe('function');
 await expire();
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();
 expect(creates()).toBe(3);
});
