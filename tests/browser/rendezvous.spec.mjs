// Browser ADOPTION fixture only: synthetic service at intercepted fixed API URL.
// Actual browser fetch/WebCrypto/JWE/QR/view/event execution; no live API/HA/native.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {CompactEncrypt,calculateJwkThumbprint,importJWK} from 'jose';
import jsQR from 'jsqr';
const WIRE='djc-rendezvous/1',SERVICE='https://api.djconnect.dev',ORIGIN='https://vibecast.tv';
const text=new TextEncoder();
function scan(matrix){const scale=4,n=(matrix.length+8)*scale,rgba=new Uint8ClampedArray(n*n*4).fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.floor(y/scale)-4,c=Math.floor(x/scale)-4;if(matrix[r]?.[c]){const i=(y*n+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}}return jsQR(rgba,n,n)?.data;}
async function fixture(page,{lostCreate=0,deny=0,loseConsume=false,longBackoff=false,denyAfter=Infinity,consumeBackoff=false,consumeAfterCommit503=false,actualApp=false,reconcileAsReady=false,controlledClock=false}={}){
 const calls=[],keys=[];let current,state='pending',envelope,createCount=0;
 let ready=!actualApp,refusePoll=false,heldPoll;
 const browserOrigin=actualApp?ORIGIN:'http://127.0.0.1:4186';
 if(actualApp)await page.route(ORIGIN+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const name=path==='/'?'index.html':path.slice(1);
  if(!/^[a-zA-Z0-9._-]+$/.test(name))return route.abort();
  const type=name.endsWith('.mjs')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'image/png';
  return route.fulfill({contentType:type,body:await readFile('dist/bootstrap/'+name)});
 });
 const html=(await readFile('bootstrap/public/index.html','utf8')).replace('<script type="module" src="/app.mjs"></script>','');
 await page.route('**/adapter-fixture',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.route(SERVICE+'/v1/rendezvous/**',async route=>{
  const req=route.request(),name=req.url().split('/').at(-1);if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':browserOrigin,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}});
  const body=req.postDataJSON();calls.push({name,body});
  const respond=(value,status=200)=>route.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':browserOrigin},body:JSON.stringify(value)});
  if(name==='poll'&&heldPoll){
   const held=heldPoll;heldPoll=null;
   await held;
   return route.abort().catch(()=>{});
  }
  if(name==='create'){
   state='pending';createCount++;keys.push(body.browser_public_key);if(createCount<=lostCreate)return route.abort('failed');if(deny||createCount>denyAfter)return respond({v:WIRE,error:deny===429?'rate_limited':'service_unavailable'},deny||503);
   const created=controlledClock?await page.evaluate(()=>Date.now()):Date.now();
   const thumb=await calculateJwkThumbprint(body.browser_public_key);current={type:'djc-rendezvous-qr',v:WIRE,service_origin:SERVICE,transaction_id:crypto.randomUUID(),generation:body.generation,expires_at:created+120000,browser_key_thumbprint:thumb,qr_capability:Buffer.alloc(32,9).toString('base64url')};
   await page.evaluate(value=>{window.fixtureExpected=value;},current);
   const plain={v:WIRE,transaction_id:current.transaction_id,generation:current.generation,browser_key_thumbprint:thumb,expires_at:current.expires_at,bootstrap_origin:ORIGIN,display_entry_url:'https://ha.example.org/djconnect/vibecast/display',issuer_epoch:Buffer.alloc(32,7).toString('base64url')};
   envelope=await new CompactEncrypt(text.encode(JSON.stringify(plain))).setProtectedHeader({alg:'RSA-OAEP-256',enc:'A256GCM',typ:'djc-rendezvous-destination+jwe',kid:thumb}).encrypt(await importJWK(body.browser_public_key,'RSA-OAEP-256'));
   return respond({v:WIRE,transaction_id:current.transaction_id,generation:current.generation,created_at:created,expires_at:current.expires_at,browser_key_thumbprint:thumb,qr_payload:current},201);
  }
  if(name==='poll'){if(refusePoll){refusePoll=false;return respond({v:WIRE,error:'service_unavailable',retry_after_ms:2000},503);}if(reconcileAsReady&&state==='consumed')return respond({v:WIRE,state:'ready',expires_at:current.expires_at,retry_after_ms:2000});if(consumeBackoff&&state==='consumed')return respond({v:WIRE,error:'service_unavailable',retry_after_ms:120000},503);if(longBackoff)return respond({v:WIRE,state:'pending',expires_at:current.expires_at,retry_after_ms:120000});if(ready&&state==='pending')state='ready';return respond({v:WIRE,state,expires_at:current.expires_at,retry_after_ms:2000});}
  if(name==='consume'){state='consumed';if(consumeAfterCommit503)return respond({v:WIRE,error:'service_unavailable',retry_after_ms:2000},503);if(loseConsume)return route.abort('failed');return respond({v:WIRE,state,destination_envelope:envelope,expires_at:current.expires_at});}
  throw Error('unexpected test route');
 });
 await page.goto(actualApp?ORIGIN:'/adapter-fixture');
 await page.evaluate(()=>{window.fixtureStates=[];window.fixtureUrls=[];window.fixtureDiagnostics={decrypt:[],verify:[],visibility:[]};});
 return {calls,keys,get qr(){return current;},ready:()=>{ready=true;},refuseNextPoll:()=>{refusePoll=true;},
  holdNextPoll(){let release;heldPoll=new Promise(resolve=>{release=resolve;});return release;}};
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

for(const failure of ['transport loss','503 after commit'])test(`consume with ${failure} cannot replay or rotate at the original deadline`,async({page})=>{
 const f=await fixture(page,{loseConsume:failure==='transport loss',consumeAfterCommit503:failure==='503 after commit',consumeBackoff:true});
 await run(page,{accelerate:true,holdLong:true,autoRotate:true});
 await expect.poll(()=>page.evaluate(()=>typeof window.fixtureLongWake)).toBe('function');
 await page.evaluate(()=>window.fixtureLongWake());
 await expect(page.locator('html')).toHaveAttribute('data-state','expired');
 await expect(page.locator('#qr-panel')).toBeHidden();
 expect(f.calls.filter(x=>x.name==='consume')).toHaveLength(1);
 expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);
});

test('actual app reload restores the same invitation and key without another create',async({page})=>{
 const f=await fixture(page,{actualApp:true});
 const panel=page.locator('#qr-panel');
 const pixels=()=>page.locator('#qr').evaluate(canvas=>canvas.toDataURL());
 await expect(panel).toBeVisible();
 const original=await pixels();
 const deadline=await page.locator('#expiry').textContent();
 await page.reload();
 await expect(panel).toBeVisible();
 expect(await pixels()).toBe(original);
 expect(await page.locator('#expiry').textContent()).toBe(deadline);
 expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);
 await page.route('https://ha.example.org/**',route=>route.fulfill({body:'Synthetic destination'}));
 f.ready();
 await expect(page).toHaveURL('https://ha.example.org/djconnect/vibecast/display');
 expect(f.calls.filter(x=>x.name==='consume')).toHaveLength(1);
});

test('actual app reload retains the durable consume fence after a 503',async({page})=>{
 const f=await fixture(page,{actualApp:true,consumeAfterCommit503:true,reconcileAsReady:true});
 await expect(page.locator('#qr-panel')).toBeVisible();
 f.ready();
 const consumes=()=>f.calls.filter(x=>x.name==='consume').length;
 await expect.poll(consumes).toBe(1);
 await expect(page.locator('#qr-panel')).toBeHidden();
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-state','confirming');
 await expect(page.locator('#qr-panel')).toBeHidden();
 const polls=()=>f.calls.filter(x=>x.name==='poll').length;
 const afterReload=polls();
 await expect.poll(polls).toBeGreaterThan(afterReload);
 expect(consumes()).toBe(1);
 expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);
});

test('actual app reload cannot replace an invitation on a wall clock jump alone',async({page})=>{
 const f=await fixture(page,{actualApp:true});
 await expect(page.locator('#qr-panel')).toBeVisible();
 const calls=f.calls.length;
 await page.addInitScript(expiry=>{Date.now=()=>expiry;},f.qr.expires_at+1);
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();
 expect(f.calls).toHaveLength(calls);
});

test('actual app reload starts a fresh invitation after both deadlines of a settled QR',async({page})=>{
 const f=await fixture(page,{actualApp:true,controlledClock:true});
 await expect(page.locator('#qr-panel')).toBeVisible();
 const original=f.qr;
 await page.addInitScript(offset=>{
  const wall=Date.now.bind(Date),monotonic=performance.now.bind(performance);
  Date.now=()=>wall()+offset;
  Object.defineProperty(performance,'now',{value:()=>monotonic()+offset});
 },121000);
 await page.reload();
 await expect(page.locator('#qr-panel')).toBeVisible();
 expect(f.calls.map(call=>call.name)).toEqual(['create','create']);
 expect(f.qr.transaction_id).not.toBe(original.transaction_id);
 expect(f.keys[1]).not.toEqual(f.keys[0]);
});

test('actual app reload can replace a settled QR after background expiry cleanup',async({page})=>{
 await page.addInitScript(()=>{
  const schedule=window.setTimeout.bind(window);
  window.setTimeout=(callback,delay,...args)=>{
   if(delay>100000) window.fixtureExpiryCleanup=callback;
   return schedule(callback,delay,...args);
  };
 });
 const f=await fixture(page,{actualApp:true,controlledClock:true});
 await expect(page.locator('#qr-panel')).toBeVisible();
 await page.evaluate(()=>{
  Object.defineProperty(document,'visibilityState',{value:'hidden'});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('#qr-panel')).toBeHidden();
 await page.evaluate(()=>{
  const wall=Date.now.bind(Date),monotonic=performance.now.bind(performance);
  Date.now=()=>wall()+121000;
  Object.defineProperty(performance,'now',{value:()=>monotonic()+121000});
  window.fixtureExpiryCleanup();
 });
 await expect.poll(()=>page.evaluate(()=>Boolean(JSON.parse(sessionStorage.getItem('vibecast-qr-resume-v1'))?.restart))).toBe(true);
 await page.addInitScript(()=>{
  const wall=Date.now.bind(Date),monotonic=performance.now.bind(performance);
  Date.now=()=>wall()+121000;
  Object.defineProperty(performance,'now',{value:()=>monotonic()+121000});
 });
 await page.reload();
 await expect(page.locator('#qr-panel')).toBeVisible();
 expect(f.calls.map(call=>call.name)).toEqual(['create','create']);
});

test('actual app reload respects transient poll refusal before restoring the QR',async({page})=>{
 const f=await fixture(page,{actualApp:true});
 const panel=page.locator('#qr-panel');
 await expect(panel).toBeVisible();
 const deadline=await page.locator('#expiry').textContent();
 f.refuseNextPoll();
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-state','confirming');
 await expect(panel).toBeHidden();
 await expect(panel).toBeVisible();
 expect(await page.locator('#expiry').textContent()).toBe(deadline);
 expect(f.calls.filter(x=>x.name==='create')).toHaveLength(1);
});

test('five same-tab reloads recover after an interrupted poll without resetting its deadline',async({page})=>{
 const f=await fixture(page,{actualApp:true,controlledClock:true});
 const panel=page.locator('#qr-panel');
 await expect(panel).toBeVisible();
 const original=f.qr;
 const release=f.holdNextPoll();
 try{
  await expect.poll(()=>f.calls.map(call=>call.name)).toEqual(['create','poll']);
  for(let reload=0;reload<4;reload++){
   await page.reload();
   await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('vibecast-qr-resume-v1'))?.restart?.expires)).toBe(original.expires_at);
   await expect(page.locator('html')).toHaveAttribute('data-state','creating');
   await expect(panel).toBeHidden();
   expect(f.calls.map(call=>call.name)).toEqual(['create','poll']);
  }
 }finally{release();}
 await page.addInitScript(()=>{
  const wall=Date.now.bind(Date),monotonic=performance.now.bind(performance);
  Date.now=()=>wall()+121000;
  Object.defineProperty(performance,'now',{value:()=>monotonic()+121000});
 });
 await page.reload();
 await expect(panel).toBeVisible();
 expect(f.calls.map(call=>call.name)).toEqual(['create','poll','create']);
 expect(f.qr.transaction_id).not.toBe(original.transaction_id);
});

test('an interrupted poll after uncertain consume never authorizes a new invitation',async({page})=>{
 const f=await fixture(page,{actualApp:true,consumeAfterCommit503:true,reconcileAsReady:true,controlledClock:true});
 await expect(page.locator('#qr-panel')).toBeVisible();
 f.ready();
 await expect.poll(()=>f.calls.filter(call=>call.name==='consume').length).toBe(1);
 const calls=f.calls.length;
 const release=f.holdNextPoll();
 try{
  await expect.poll(()=>f.calls.length).toBeGreaterThan(calls);
  await page.addInitScript(()=>{
   const wall=Date.now.bind(Date),monotonic=performance.now.bind(performance);
   Date.now=()=>wall()+121000;
   Object.defineProperty(performance,'now',{value:()=>monotonic()+121000});
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
  expect(f.calls.filter(call=>call.name==='create'||call.name==='consume').map(call=>call.name)).toEqual(['create','consume']);
 }finally{release();}
});
