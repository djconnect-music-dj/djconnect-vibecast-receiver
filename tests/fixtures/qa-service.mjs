// Synthetic software-only service. No native attestation, actual API, HA or TV.
import {CompactEncrypt,importJWK,calculateJwkThumbprint} from 'jose';
export function syntheticQAService({service='https://api-vibecast-qa.djconnect.dev',origin='https://qa.vibecast.tv',qrService=service,plainOrigin=origin,loseConsume=false}={}){
 const calls=[];let qr,envelope,state='pending';
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','access-control-allow-origin':origin}});
 const fetch=async(url,opts)=>{
  if(!url.startsWith(service+'/v1/rendezvous/'))throw Error('unexpected fixture service');
  const route=url.split('/').at(-1),body=JSON.parse(opts.body);calls.push({route,body,opts});
  if(route==='create'){
   const thumb=await calculateJwkThumbprint(body.browser_public_key),now=Date.now();
   qr={type:'djc-rendezvous-qr',v:'djc-rendezvous/1',service_origin:qrService,transaction_id:crypto.randomUUID(),generation:body.generation,expires_at:now+120000,browser_key_thumbprint:thumb,qr_capability:Buffer.alloc(32,9).toString('base64url')};
   const plain={v:qr.v,transaction_id:qr.transaction_id,generation:qr.generation,expires_at:qr.expires_at,browser_key_thumbprint:thumb,bootstrap_origin:plainOrigin,display_entry_url:'https://ha.example.org/djconnect/vibecast/display',issuer_epoch:Buffer.alloc(32,7).toString('base64url')};
   envelope=await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(plain))).setProtectedHeader({alg:'RSA-OAEP-256',enc:'A256GCM',typ:'djc-rendezvous-destination+jwe',kid:thumb}).encrypt(await importJWK(body.browser_public_key,'RSA-OAEP-256'));
   return json({v:qr.v,transaction_id:qr.transaction_id,generation:qr.generation,expires_at:qr.expires_at,created_at:now,browser_key_thumbprint:thumb,qr_payload:qr},201);
  }
  if(route==='poll'){if(state==='pending')state='ready';return json({v:qr.v,state,expires_at:qr.expires_at,retry_after_ms:2000});}
  if(route==='consume'){state='consumed';if(loseConsume)throw Error('synthetic lost consume reply');return json({v:qr.v,state,expires_at:qr.expires_at,destination_envelope:envelope});}
  if(route==='cancel'){state='cancelled';return json({v:qr.v,state});}
  throw Error('unknown fixture route');
 };
 return{fetch,calls,get qr(){return qr;}};
}
