import {readback} from './readback_bootstrap.mjs';
export function checkedOrigin(value) {
 const origin=new URL(value);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash||!(origin.hostname==='vibecast.tv'||/^[a-f0-9]{8}\.vibecast-tv-bootstrap\.pages\.dev$/.test(origin.hostname)))throw Error('Fixed production or immutable HTTPS origin required');
 return origin.origin;
}
export async function waitReadback(manifestPath,originString='https://vibecast.tv',{read=readback,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=30}={}) {
 const origin=checkedOrigin(originString),deadline=AbortSignal.timeout(300000);
 let last;
 for(let attempt=1;attempt<=attempts&&!deadline.aborted;attempt++) {
  try {
   const receipt=await read(manifestPath,origin,(url,options)=>fetch(url,{...options,signal:AbortSignal.any([options.signal,deadline])}));
   return {...receipt,attempt};
  }catch(error){last=error;}
  if(attempt<attempts&&!deadline.aborted)await wait(10000);
 }
 throw Error('HTTPS/artifact qualification did not complete: '+String(last?.message??'timeout'));
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
 try {process.stdout.write(JSON.stringify(await waitReadback(process.argv[2],process.argv[3]))+'\n');}
 catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
