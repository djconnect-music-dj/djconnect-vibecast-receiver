import {calculateJwkThumbprint,compactDecrypt} from 'jose';
import qrcode from 'qrcode-generator';
import {WIRE,ORIGIN,SERVICE,need,encode,decode,closed,strictJSON,schema,displayURL} from './wire.mjs';
export const CONTRACT='djc-rendezvous/1-implementation.1';
const encoder=new TextEncoder();
class TransportFailure extends Error {}
class Stopped extends Error {}
class Terminal extends Error {constructor(state='unavailable'){super('rendezvous_stopped');this.state=state;}}
// No public config/window/URL activation hook. app.mjs continues to import only
// unavailableAdapter. This constructor is for reviewed static adoption/testing.
export function createRendezvousAdapter({fetch:transport=globalThis.fetch,crypto=globalThis.crypto,
 now=Date.now,monotonic=()=>performance.now(),visible=()=>globalThis.document?.visibilityState==='visible',
 schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}={}){
 let used=false,retired=false,exposed=false,epoch=0,active=null,context=null,lastTime=-Infinity,restartAllowed=false,knownExpiry=null;
 let rotationBlocked=false;
 const mono=()=>{const v=monotonic();if(!Number.isFinite(v)||v<0||v<lastTime){dispose();throw new Terminal();}lastTime=v;return v;};
 const sessions=new WeakMap(),waiters=new Set();
 function dispose(){retired=true;epoch++;active?.abort();active=null;for(const stop of waiters)stop();waiters.clear();if(context){context.key=null;context.claim=null;context=null;}}
 function foreground(){need(!retired&&visible());}
 function guard(ticket,deadline=Infinity){foreground();need(ticket===epoch&&mono()<deadline);}
 function live(c){if(c&&knownExpiry&&(c.expires<=now()||c.monoExpires<=mono())){restartAllowed=true;throw new Terminal('expired');}guard(c.ticket);need(context===c&&c.key);}
 async function bound(work,ms,ticket){let timer,stop;const deadline=mono()+ms;try{return await Promise.race([work,new Promise((_,reject)=>{stop=()=>reject(new Stopped());waiters.add(stop);const timeout=()=>{try{const remaining=deadline-mono();if(remaining>0)timer=schedule(timeout,remaining);else reject(new TransportFailure());}catch(e){reject(e);}};timer=schedule(timeout,ms);})]);}finally{cancel(timer);waiters.delete(stop);}}
 async function bytes(response,ticket,deadline,signal){
  need(response.headers.get('content-type')?.split(';')[0].trim()==='application/json');need(!response.headers.get('content-encoding'));
  need(response.body);const reader=response.body.getReader();const chunks=[];let size=0;
  try{for(;;){let r;try{r=await reader.read();}catch{throw new TransportFailure();}guard(ticket,deadline);need(!signal?.aborted);if(r.done)break;size+=r.value.length;need(size<=16384);chunks.push(r.value);}}
  finally{try{void reader.cancel().catch(()=>{});}catch{/* No payload diagnostics. */}}
  const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return all;
 }
 function send(route,body,signal){return transport(SERVICE+'/v1/rendezvous/'+route,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});}
 function auth(c){return {v:WIRE,transaction_id:c.transaction,generation:c.generation,claim_secret:c.claim};}
 async function response(route,c){
  live(c);const request=new AbortController(),parent=active.signal;const abort=()=>request.abort();parent.addEventListener('abort',abort,{once:true});let res,data;
  try{
   try{res=await bound(send(route,auth(c),request.signal),Math.min(10000,c.monoExpires-mono()),c.ticket);}catch{live(c);throw new TransportFailure();}live(c);
   const raw=await bound(bytes(res,c.ticket,c.monoExpires,request.signal),Math.min(10000,c.monoExpires-mono()),c.ticket);live(c);data=strictJSON(raw);
  }finally{request.abort();parent.removeEventListener('abort',abort);} // Client cancellation is not server rollback.
  if(res.status!==200){schema('error',data);const statuses={invalid_request:400,unsupported_version:400,invalid_capability:401,invalid_sender_proof:401,attestation_required:401,app_not_supported:403,origin_denied:403,operation_conflict:409,already_submitted:409,already_consumed:409,cancelled:409,not_ready:409,expired:410,payload_too_large:413,unsupported_content_type:415,rate_limited:429,attestation_unavailable:503,service_unavailable:503};need(statuses[data.error]===res.status);
   let retry=data.retry_after_ms??2000;const header=res.headers.get('retry-after');if(header!==null){need(/^[0-9]+$/.test(header)&&Number.isSafeInteger(Number(header)));retry=Math.max(retry,Number(header)*1000);}
   return {error:data.error,retry};
  }
  schema(route+'_response',data);if(route!=='cancel')need(data.expires_at===c.expires);return data;
 }
 async function pause(c,ms){live(c);need(Number.isFinite(ms)&&ms>=2000);const remaining=Math.min(c.expires-now(),c.monoExpires-mono());let timer,stop;const deadline=mono()+Math.min(ms,remaining);try{await new Promise((resolve,reject)=>{stop=()=>reject(new Stopped());waiters.add(stop);const wake=()=>{try{const remaining=deadline-mono();if(remaining>0)timer=schedule(wake,remaining);else resolve();}catch(e){reject(e);}};timer=schedule(wake,Math.min(ms,remaining));});}finally{cancel(timer);waiters.delete(stop);}live(c);}
 function matrix(payload){const qr=qrcode(0,'M');qr.addData(payload,'Byte');qr.make();const n=qr.getModuleCount();return Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>qr.isDark(y,x)));}
 async function attempt(generation,prepared,start,ticket){
  const {keypair,claim,jwk,thumb,commitment}=prepared;
  const sent=mono(),deadline=Math.min(sent+10000,start+30000);let statusKnown=false;
  const work=(async()=>{
   let res;try{res=await send('create',{v:WIRE,generation,browser_public_key:jwk,claim_commitment:commitment},active.signal);}catch{throw new TransportFailure();}
   // Status classification takes priority over late deadlines/body failures.
   if(ticket!==epoch||retired)throw new Stopped();
   if(res.status!==201){statusKnown=true;throw new Terminal();}
   guard(ticket,deadline);const raw=await bytes(res,ticket,deadline);guard(ticket,deadline);
   let data;try{data=schema('create_response',strictJSON(raw));}catch{throw new Terminal();}
   const wall=now();need(Number.isSafeInteger(wall)&&wall>=0);
   need(data.generation===generation&&data.browser_key_thumbprint===thumb&&data.expires_at-data.created_at===120000&&data.created_at<=wall&&data.expires_at>wall);
   const q=data.qr_payload;schema('qr_payload',q);decode(q.qr_capability,32);decode(q.browser_key_thumbprint,32);
   need(q.transaction_id===data.transaction_id&&q.generation===generation&&q.expires_at===data.expires_at&&q.browser_key_thumbprint===thumb&&q.service_origin===SERVICE);
   const payload=JSON.stringify(q);need(encoder.encode(payload).length<=1024);guard(ticket,deadline);
   const c={ticket,transaction:data.transaction_id,generation,thumb,key:keypair.privateKey,claim,expires:data.expires_at,monoExpires:mono()+data.expires_at-wall,polls:0,consumeStarted:false};
   context=c;knownExpiry={wall:c.expires,mono:c.monoExpires};const challenge=Object.freeze({expiresAt:c.expires,monotonicDeadline:c.monoExpires,matrix:matrix(payload)});sessions.set(challenge,c);return challenge;
  })();
  try{return await bound(work,Math.max(0,deadline-mono()),ticket);}catch(e){if(statusKnown)throw new Terminal();if(e instanceof TransportFailure&&ticket===epoch&&!retired)throw e;throw new Terminal();}
 }
 const adapter={contract:CONTRACT,bounded:true,
  async create({signal}={}){
   if(used||retired)throw new Terminal();used=true;const start=mono();need(Number.isFinite(start)&&start>=0);
   signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted){dispose();throw new Terminal();}
   try{for(let n=0;n<2;n++){
    foreground();const ticket=++epoch;active=new AbortController();const prepDeadline=Math.min(mono()+5000,start+30000);
    const prepared=await bound((async()=>{
     const keypair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['encrypt','decrypt']);guard(ticket,prepDeadline);need(keypair.privateKey.extractable===false);
     const pub=await crypto.subtle.exportKey('jwk',keypair.publicKey);guard(ticket,prepDeadline);const jwk={kty:pub.kty,n:pub.n,e:pub.e};schema('public_key',jwk);const modulus=decode(jwk.n,256);need(modulus[0]&128&&modulus[255]&1);
     const thumb=await calculateJwkThumbprint(jwk,'sha256');guard(ticket,prepDeadline);
     const claim=encode(crypto.getRandomValues(new Uint8Array(32)));const commitment=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',decode(claim,32))));guard(ticket,prepDeadline);
     return {keypair,claim,jwk,thumb,commitment};
    })(),Math.max(0,prepDeadline-mono()),ticket);guard(ticket,prepDeadline);
    try{return await attempt(n+1,prepared,start,ticket);}catch(e){
     // Retire the old epoch before abort, disposal or a new key preparation.
     epoch++;active.abort();active=null;
     if(!(e instanceof TransportFailure)||n===1||retired||!visible()||mono()<start||mono()>=start+30000)throw new Terminal();
    }
   }}catch(e){dispose();throw e instanceof Terminal?e:new Terminal();}
  },
  validateChallenge(challenge){try{const c=sessions.get(challenge);live(c);return true;}catch{return false;}},
  expose(challenge){const c=sessions.get(challenge);live(c);exposed=true;},
  async wait({challenge}){
   const c=sessions.get(challenge);live(c);need(exposed);
   let delay=2000;try{while(c.polls<60){
    await pause(c,delay);delay=2000;c.polls++;let status;try{status=await response('poll',c);}catch(e){if(e instanceof TransportFailure)continue;throw e;}
    if(status.error){if(['rate_limited','service_unavailable','attestation_unavailable','not_ready'].includes(status.error)){delay=Math.max(2000,status.retry);continue;}throw new Terminal(status.error==='expired'?'expired':'unavailable');}
    if(status.state==='cancelled'||status.state==='consumed'){restartAllowed=true;throw new Terminal();}
    if(status.state!=='ready'){delay=Math.max(2000,status.retry_after_ms);continue;}
    if(c.consumeStarted)continue; // A lost consume is reconciled by poll only.
    c.consumeStarted=true;rotationBlocked=true;let result;try{result=await response('consume',c);}catch(e){if(e instanceof TransportFailure)continue;throw e;}
    if(result.error){
     if(['not_ready','rate_limited','service_unavailable','attestation_unavailable'].includes(result.error)){
      c.consumeStarted=false;rotationBlocked=false;
      if(result.error!=='not_ready')delay=Math.max(2000,result.retry);
      continue;
     }
     throw new Terminal(result.error==='expired'?'expired':'unavailable');
    }
    live(c);restartAllowed=true;return result.destination_envelope;
   }throw new Terminal('expired');}catch(e){if(e.state!=='expired')rotationBlocked=true;dispose();throw e instanceof Terminal?e:new Terminal();}
  },
  async verifyDestination(envelope,{challenge}){
   const c=sessions.get(challenge);live(c);try{
    schema('jwe',envelope);const parts=envelope.split('.');const header=closed(strictJSON(decode(parts[0],1,2048),2048),['alg','enc','typ','kid']);
    need(header.alg==='RSA-OAEP-256'&&header.enc==='A256GCM'&&header.typ==='djc-rendezvous-destination+jwe'&&header.kid===c.thumb);
    decode(parts[1],256);decode(parts[2],12);decode(parts[3],1,2048);decode(parts[4],16);
    const {plaintext}=await compactDecrypt(envelope,c.key,{keyManagementAlgorithms:['RSA-OAEP-256'],contentEncryptionAlgorithms:['A256GCM']});live(c);
    const data=closed(strictJSON(plaintext,2048),['v','transaction_id','generation','browser_key_thumbprint','expires_at','bootstrap_origin','display_entry_url','issuer_epoch']);
    need(data.v===WIRE&&data.transaction_id===c.transaction&&data.generation===c.generation&&data.browser_key_thumbprint===c.thumb&&data.expires_at===c.expires&&data.bootstrap_origin===ORIGIN);decode(data.issuer_epoch,32);
    const url=displayURL(data.display_entry_url);live(c);dispose();return url;
   }catch{dispose();throw new Terminal('unsafe');}
  },
  allowsDestination(url){try{return displayURL(url.href)===url.href;}catch{return false;}},
  async cancel(challenge){const c=sessions.get(challenge);try{const result=await response('cancel',c);need(!result.error&&result.state==='cancelled');restartAllowed=true;return true;}finally{dispose();}},
  canRestart(){if(restartAllowed)return true;if(!knownExpiry)return false;try{return knownExpiry.wall<=now()||knownExpiry.mono<=mono();}catch{return false;}},
  canRotate(){
   if(!exposed||rotationBlocked||!knownExpiry||!visible())return false;
   try{return knownExpiry.wall<=now()||knownExpiry.mono<=mono();}catch{return false;}
  },
  stop:dispose
 };
 return Object.freeze(adapter);
}
