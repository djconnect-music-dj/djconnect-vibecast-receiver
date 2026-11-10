import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CompactEncrypt,importJWK,calculateJwkThumbprint} from 'jose';
import jsQR from 'jsqr';
import {createRendezvousAdapter} from '../../bootstrap/src/rendezvous.mjs';
import {strictJSON,displayURL,encode,decode,WIRE,SERVICE,ORIGIN} from '../../bootstrap/src/wire.mjs';
const enc=new TextEncoder(),payload=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const later=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function service({lostCreate=0,createStatus=201,consumeLoss=false,mutateCreate=x=>x,mutatePlain=x=>x,consumeRefusal=false}={}){
 const calls=[],creates=[];let state='pending',qr,plain,envelope,consumed=0,refused=false;
 const transport=async(url,opts)=>{
  assert.ok(url.startsWith(SERVICE+'/v1/rendezvous/'));assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.referrerPolicy,'no-referrer');
  const route=url.split('/').at(-1),body=JSON.parse(opts.body);calls.push({route,body});
  if(route==='create'){
   state='pending';creates.push(body);if(creates.length<=lostCreate)throw Error('deliberate lost response, synthetic service only');
   if(createStatus!==201)return new Response(null,{status:createStatus});
   const thumb=await calculateJwkThumbprint(body.browser_public_key),created=Date.now();
   qr={type:'djc-rendezvous-qr',v:WIRE,service_origin:SERVICE,transaction_id:crypto.randomUUID(),generation:body.generation,expires_at:created+120000,browser_key_thumbprint:thumb,qr_capability:encode(crypto.getRandomValues(new Uint8Array(32)))};
   plain=mutatePlain({v:WIRE,transaction_id:qr.transaction_id,generation:qr.generation,browser_key_thumbprint:thumb,expires_at:qr.expires_at,bootstrap_origin:ORIGIN,display_entry_url:'https://ha.example.org/djconnect/vibecast/display',issuer_epoch:encode(new Uint8Array(32))});
   envelope=await new CompactEncrypt(enc.encode(JSON.stringify(plain))).setProtectedHeader({alg:'RSA-OAEP-256',enc:'A256GCM',typ:'djc-rendezvous-destination+jwe',kid:thumb}).encrypt(await importJWK(body.browser_public_key,'RSA-OAEP-256'));
   const answer=mutateCreate({v:WIRE,transaction_id:qr.transaction_id,generation:body.generation,created_at:created,expires_at:qr.expires_at,browser_key_thumbprint:thumb,qr_payload:qr});
   return new Response(JSON.stringify(answer),{status:201,headers:{'content-type':'application/json'}});
  }
  assert.equal(body.v,WIRE);assert.equal(body.transaction_id,qr.transaction_id);assert.equal(body.generation,qr.generation);
  const commitment=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',decode(body.claim_secret,32))));assert.equal(commitment,creates.at(-1).claim_commitment);
  if(route==='poll'){if(state==='pending')state='ready';return payload({v:WIRE,state,expires_at:qr.expires_at,retry_after_ms:2000});}
  if(route==='consume'){assert.equal(state,'ready');if(consumeRefusal&&!refused){refused=true;return new Response(JSON.stringify({v:WIRE,error:consumeRefusal===503?'service_unavailable':'rate_limited',retry_after_ms:2000}),{status:consumeRefusal===503?503:429,headers:{'content-type':'application/json','retry-after':'2'}});}state='consumed';consumed++;if(consumeLoss)throw Error('deliberately lost consume reply');return payload({v:WIRE,state,destination_envelope:envelope,expires_at:qr.expires_at});}
  if(route==='cancel'){state='cancelled';return payload({v:WIRE,state});}
  assert.fail(route);
 };
 return {transport,calls,creates,get qr(){return qr;},get consumed(){return consumed;},get envelope(){return envelope;},setEnvelope:v=>envelope=v};
}
function adapter(server,opts={}){let offset=0;return createRendezvousAdapter({fetch:server.transport,visible:()=>true,monotonic:()=>performance.now()+offset,schedule:(fn,ms)=>ms===2000?setTimeout(()=>{offset+=ms;fn();},1):setTimeout(fn,ms),...opts});}
function scan(matrix){const scale=4,n=(matrix.length+8)*scale,rgba=new Uint8ClampedArray(n*n*4).fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const row=Math.floor(y/scale)-4,col=Math.floor(x/scale)-4;if(matrix[row]?.[col]){const i=(y*n+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}}return jsQR(rgba,n,n)?.data;}
test('actual nonextractable browser key, closed wire, independently decoded QR and JOSE handoff',async()=>{
 const s=service(),keys=[];const subtle={generateKey:async(...args)=>{const pair=await crypto.subtle.generateKey(...args);keys.push(pair.privateKey);return pair;},exportKey:crypto.subtle.exportKey.bind(crypto.subtle),digest:crypto.subtle.digest.bind(crypto.subtle)};
 const a=adapter(s,{crypto:{subtle,getRandomValues:crypto.getRandomValues.bind(crypto)}});const c=await a.create();assert.equal(a.validateChallenge(c),true);assert.deepEqual(JSON.parse(scan(c.matrix)),s.qr);assert.equal(keys[0].extractable,false);await assert.rejects(crypto.subtle.exportKey('jwk',keys[0]));a.expose(c);
 const envelope=await a.wait({challenge:c});const url=await a.verifyDestination(envelope,{challenge:c});assert.equal(url,'https://ha.example.org/djconnect/vibecast/display');assert.equal(s.consumed,1);assert.equal(a.validateChallenge(c),false);await assert.rejects(a.create());
});
test('one pre-QR replacement has independent key/claim and generation; no third create',async()=>{
 for(const losses of [1,2]){const s=service({lostCreate:losses}),a=adapter(s);if(losses===1){const c=await a.create();assert.equal(c.expiresAt,s.qr.expires_at);a.stop();}else await assert.rejects(a.create());assert.equal(s.creates.length,2);assert.notEqual(s.creates[0].browser_public_key.n,s.creates[1].browser_public_key.n);assert.notEqual(s.creates[0].claim_commitment,s.creates[1].claim_commitment);assert.deepEqual(s.creates.map(c=>c.generation),[1,2]);await assert.rejects(a.create());assert.equal(s.creates.length,2);}
});
test('known denial at headers never awaits body or replaces, even after deadline',async()=>{
 for(const status of [400,401,403,409,410,429,503]){let count=0,t=0,reads=0;const a=createRendezvousAdapter({visible:()=>true,monotonic:()=>t,fetch:async()=>{count++;t=15000;return {status, get body(){reads++;throw Error();}};}});await assert.rejects(a.create());assert.equal(count,1);assert.equal(reads,0);}
});
test('complete malformed/misbound create stops without replacement',async()=>{
 for(const mutate of [x=>({...x,extra:true}),x=>({...x,generation:2}),x=>({...x,expires_at:x.expires_at+1}),x=>({...x,qr_payload:{...x.qr_payload,service_origin:'https://else.example.org'}})]){const s=service({mutateCreate:mutate}),a=adapter(s);await assert.rejects(a.create());assert.equal(s.creates.length,1);}
});
test('lost consume is polled to consumed, never redelivered/replayed',async()=>{const s=service({consumeLoss:true}),a=adapter(s);const c=await a.create();a.expose(c);await assert.rejects(a.wait({challenge:c}));assert.equal(s.calls.filter(x=>x.route==='consume').length,1);assert.equal(s.consumed,1);await assert.rejects(a.create());});
test('confirmed cancel releases local authority, does not renew or create',async()=>{const s=service(),a=adapter(s),c=await a.create();a.expose(c);assert.equal(await a.cancel(c),true);assert.equal(a.validateChallenge(c),false);await assert.rejects(a.create());assert.equal(s.creates.length,1);});
test('authenticated plaintext bindings and raw destinations reject without navigation',async()=>{
 for(const mutate of [x=>({...x,transaction_id:crypto.randomUUID()}),x=>({...x,bootstrap_origin:'https://evil.example.org'}),x=>({...x,issuer_epoch:'not-canonical'}),x=>({...x,display_entry_url:'https://ha.example.org/a/../djconnect/vibecast/display'}),x=>({...x,extra:'denied'})]){const s=service({mutatePlain:mutate}),a=adapter(s),c=await a.create();a.expose(c);const e=await a.wait({challenge:c});await assert.rejects(a.verifyDestination(e,{challenge:c}));assert.equal(a.validateChallenge(c),false);}
});
test('stop/hidden while create awaits rejects late authority without replacement',async()=>{const s=service(),gate=later();const a=createRendezvousAdapter({visible:()=>true,fetch:async(...args)=>{const r=await s.transport(...args);await gate.promise;return r;}});const work=a.create();while(s.creates.length===0)await new Promise(r=>setTimeout(r,5));a.stop();gate.resolve();await assert.rejects(work);assert.equal(s.creates.length,1);});
test('strict UTF8/duplicate decoded names/trailing/oversize JSON and canonical base64url',()=>{
 for(const text of ['{"v":1,"v":2}','{"v":1,"\\u0076":2}','{"a":{"x":1,"x":2}}','{}{}','{"x":NaN}','{"x":1.5}','{"x":9007199254740992}'])assert.throws(()=>strictJSON(enc.encode(text)),text);
 assert.throws(()=>strictJSON(new Uint8Array([0xc0,0xaf])));assert.throws(()=>strictJSON(enc.encode('{}'),1));assert.throws(()=>decode('AB',1));assert.throws(()=>decode('AA=',1));
});
test('all pinned Core raw-route negatives before URL normalization',async()=>{const x=JSON.parse(await readFile('docs/contracts/rendezvous-implementation-1/route-cases.json'));for(const c of x.cases){let allowed;try{allowed=displayURL(c.entry_url).startsWith(c.selected_origin+'/');}catch{allowed=false;}assert.equal(allowed,c.allowed,c.id);}});
test('actual adapter and controller compose without cloning private challenge identity',async()=>{
 const {BootstrapController}=await import('../../bootstrap/src/lifecycle.mjs');for(const lostCreate of [0,1]){const s=service({lostCreate}),a=adapter(s),states=[],urls=[];
 const c=new BootstrapController({adapter:a,render:x=>states.push(x.state),navigate:x=>urls.push(x)});await c.start();assert.deepEqual(states,['creating','waiting','confirming','received','redirecting']);assert.deepEqual(urls,['https://ha.example.org/djconnect/vibecast/display']);assert.equal(s.creates.length,lostCreate+1);await c.reconnect();await c.start();assert.equal(s.creates.length,lostCreate+1);}
});
test('explicit consume quota refusal preserves transaction and retries only after pollready/backoff',async()=>{const s=service({consumeRefusal:429}),a=adapter(s),c=await a.create();a.expose(c);const e=await a.wait({challenge:c});assert.equal(await a.verifyDestination(e,{challenge:c}),'https://ha.example.org/djconnect/vibecast/display');assert.equal(s.calls.filter(x=>x.route==='consume').length,2);assert.equal(s.consumed,1);assert.equal(s.creates.length,1);});
test('fresh explicit controller interaction only after authenticated terminal state',async()=>{
 const {BootstrapController}=await import('../../bootstrap/src/lifecycle.mjs');for(const unknown of [true,false]){
 const s=service(unknown?{lostCreate:2}:{consumeLoss:true});let instances=0;const factory=()=>{instances++;return adapter(s);},states=[];const c=new BootstrapController({adapter:factory(),adapterFactory:factory,render:x=>states.push(x),navigate:()=>assert.fail()});await c.start();assert.equal(c.adapter.canRestart(),!unknown);const count=s.creates.length;await c.start();assert.equal(s.creates.length,count);await c.start(true,{explicit:true});assert.equal(instances,unknown?1:2);assert.equal(s.creates.length,unknown?2:2);
 }
});
test('timed-out poll is aborted before another client request; late result is fenced',async()=>{
 const s=service();let clock=0,first=true,signal;const transport=async(url,options)=>{if(url.endsWith('/poll')&&first){first=false;signal=options.signal;return new Promise(()=>{});}if(url.endsWith('/poll'))assert.equal(signal.aborted,true);return s.transport(url,options);};
 const a=createRendezvousAdapter({fetch:transport,visible:()=>true,monotonic:()=>clock,schedule:(fn,ms)=>setTimeout(()=>{clock+=ms;fn();},ms===2000||(ms===10000&&signal&&!signal.aborted)?1:ms)});const c=await a.create();a.expose(c);const e=await a.wait({challenge:c});assert.ok(e);assert.equal(signal.aborted,true);a.stop();
});
test('late old committed create response cannot replace exposed fresh generation',async()=>{
 const s=service(),gate=later();let clock=0,deadline=0,old;
 const transport=async(...args)=>{const response=await s.transport(...args);if(args[0].endsWith('/create')&&JSON.parse(args[1].body).generation===1){old=response;await gate.promise;}return response;};
 const a=createRendezvousAdapter({fetch:transport,visible:()=>true,monotonic:()=>clock,schedule:(fn,ms)=>{if(ms===10000&&deadline++===0)return setTimeout(()=>{clock+=10000;fn();},5);if(ms===2000)return setTimeout(()=>{clock+=2000;fn();},1);return setTimeout(fn,ms);}});
 const c=await a.create();a.expose(c);assert.equal(JSON.parse(scan(c.matrix)).generation,2);gate.resolve();await new Promise(r=>setImmediate(r));assert.equal(a.validateChallenge(c),true);const e=await a.wait({challenge:c});assert.equal(await a.verifyDestination(e,{challenge:c}),'https://ha.example.org/djconnect/vibecast/display');assert.equal(s.creates.length,2);assert.ok(old);
});
test('render failure after sticky exposure cannot replenish create allowance',async()=>{const {BootstrapController}=await import('../../bootstrap/src/lifecycle.mjs');const s=service();let instances=0;const factory=()=>{instances++;return adapter(s);};const c=new BootstrapController({adapter:factory(),adapterFactory:factory,render:x=>{if(x.state==='waiting')throw Error('partial renderer');},navigate:()=>assert.fail()});await c.start();await c.reconnect();await c.start(true,{explicit:true});assert.equal(s.creates.length,1);assert.equal(instances,1);assert.equal(c.state,'unavailable');});
test('late unexportable key-generation result after retirement cannot start POST',async()=>{const gate=later();let calls=0,ready;const subtle={generateKey:async(...args)=>{const pair=await crypto.subtle.generateKey(...args);ready=true;await gate.promise;return pair;},exportKey:crypto.subtle.exportKey.bind(crypto.subtle),digest:crypto.subtle.digest.bind(crypto.subtle)};const a=createRendezvousAdapter({visible:()=>true,fetch:()=>{calls++;assert.fail();},crypto:{subtle,getRandomValues:crypto.getRandomValues.bind(crypto)}});const work=a.create();while(!ready)await new Promise(r=>setTimeout(r,2));a.stop();gate.resolve();await assert.rejects(work);assert.equal(calls,0);});
test('offline wire inputs and generated closed definitions retain exact released hashes',async()=>{
 const {createHash}=await import('node:crypto');const {definitions}=await import('../../bootstrap/src/wire-schema.mjs');const base='docs/contracts/rendezvous-implementation-1/';const record=JSON.parse(await readFile(base+'implementation-contract-release-v1.json'));
 for(const file of ['WIRE_PROFILE_V1.md','CREATE_RECOVERY_PROPOSAL_V1.md','wire-request-schemas-v1.json'])assert.equal(createHash('sha256').update(await readFile(base+file)).digest('hex'),record.contract_hashes['docs/rendezvous/'+file]);
 assert.equal(createHash('sha256').update(await readFile(base+'implementation-contract-release-v1.json')).digest('hex'),'189e71aca07ac49cc6f7db225d3acb10a3a9fc357be02a9eaacb8f30a798c596');
 const schema=JSON.parse(await readFile(base+'wire-request-schemas-v1.json'));for(const [name,value] of Object.entries(definitions))assert.deepEqual(value,schema.$defs[name]);
});
test('build and artifact verification CLIs actually execute from paths containing spaces',async()=>{
 const {execFileSync}=await import('node:child_process');const sha='c'.repeat(40),dir='dist/cli space regression';execFileSync(process.execPath,['scripts/build_bootstrap.mjs',dir],{env:{...process.env}});
 const built=JSON.parse(await readFile(dir+'/build-manifest.json'));assert.match(built.sourceSHA,/^[a-f0-9]{40}$/);assert.throws(()=>execFileSync(process.execPath,['scripts/verify_bootstrap.mjs',dir,sha],{stdio:'pipe'}));
 assert.match(execFileSync(process.execPath,['scripts/verify_bootstrap.mjs',dir,built.sourceSHA],{encoding:'utf8'}),/Artifact verification PASS/);
});
test('compact JOSE duplicate/extra headers, noncanonical segments and authenticated tag tamper reject',async()=>{
 for(const [mutate,atWire] of [[parts=>{const h=new TextDecoder().decode(decode(parts[0],1,2048));parts[0]=encode(enc.encode(h.replace('{','{"alg":"RSA-OAEP-256",')));},false],[parts=>{const h=JSON.parse(new TextDecoder().decode(decode(parts[0],1,2048)));h.zip='DEF';parts[0]=encode(enc.encode(JSON.stringify(h)));},false],[parts=>{parts[4]+='=';},true],[parts=>{const tag=decode(parts[4],16);tag[0]^=1;parts[4]=encode(tag);},false]]){const s=service(),a=adapter(s),c=await a.create();a.expose(c);const parts=s.envelope.split('.');mutate(parts);s.setEnvelope(parts.join('.'));if(atWire)await assert.rejects(a.wait({challenge:c}));else{const e=await a.wait({challenge:c});await assert.rejects(a.verifyDestination(e,{challenge:c}));}assert.equal(a.validateChallenge(c),false);}
});
test('201 body transport failure permits one replacement; complete malformed201 does not',async()=>{for(const incomplete of [true,false]){const s=service();let first=true;const transport=async(...args)=>{const res=await s.transport(...args);if(first&&args[0].endsWith('/create')){first=false;return new Response(incomplete?new ReadableStream({start(c){c.error(Error('synthetic body loss'));}}):'{"v":', {status:201,headers:{'content-type':'application/json'}});}return res;};const a=adapter(s,{fetch:transport});if(incomplete){const c=await a.create();assert.equal(s.creates.length,2);a.stop();}else{await assert.rejects(a.create());assert.equal(s.creates.length,1);}}});
test('long server backoff does not claim early expiry and wakes explicit retry at original expiry',async(t)=>{
 const {BootstrapController}=await import('../../bootstrap/src/lifecycle.mjs');const s=service();let clock=0,wakeLong,longDelay;const a=createRendezvousAdapter({visible:()=>true,monotonic:()=>clock,fetch:async(url,opts)=>url.endsWith('/poll')?payload({v:WIRE,state:'pending',expires_at:s.qr.expires_at,retry_after_ms:120000}):s.transport(url,opts),schedule:(fn,ms)=>{if(ms>100000){longDelay=ms;wakeLong=()=>{clock+=ms;fn();};return -1;}return setTimeout(()=>{if(ms===2000)clock+=ms;fn();},ms===2000?1:ms);},cancel:id=>{if(id!==-1)clearTimeout(id);}});
 const states=[],c=new BootstrapController({adapter:a,adapterFactory:()=>assert.fail('no automatic replacement'),monotonic:()=>clock,render:x=>states.push(x),navigate:()=>assert.fail()});t.after(()=>c.stop());const work=c.start();while(!wakeLong)await new Promise(r=>setTimeout(r,2));assert.equal(states.at(-1).state,'waiting');assert.equal(a.canRestart(),false);assert.ok(longDelay<120000&&longDelay>100000,JSON.stringify({longDelay,clock}));wakeLong();await work;assert.equal(states.at(-1).state,'expired');assert.equal(a.canRestart(),true);assert.equal(s.creates.length,1);
});
