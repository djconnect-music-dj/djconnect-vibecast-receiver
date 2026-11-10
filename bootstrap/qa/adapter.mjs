// Static QA-only module graph. No URL/query/window configuration or host list.
import {createRendezvousAdapter} from '../src/rendezvous.mjs';
import {unavailableAdapter} from '../src/lifecycle.mjs';
export const QA_BROWSER='https://qa.vibecast.tv';
export const QA_SERVICE='https://api-vibecast-qa.djconnect.dev';
export function createQAAdapter({reloadState}={}){
 if(globalThis.location?.origin!==QA_BROWSER)return unavailableAdapter;
 return createRendezvousAdapter({reloadState,fetch:(url,options)=>{
  if(globalThis.location?.origin!==QA_BROWSER||!url.startsWith(QA_SERVICE+'/v1/rendezvous/'))throw Error('qa_origin_rejected');
  return globalThis.fetch(url,options);
 }});
}
