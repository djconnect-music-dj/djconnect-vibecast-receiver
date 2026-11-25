import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseNativeJoinFragment,NativeJoinInvitation,startNativeJoinPage,joinCopy,appStoreURL} from '../../bootstrap/public/join.mjs';
const golden=JSON.parse(await readFile(new URL('../fixtures/native-join-golden.json',import.meta.url)));
const fragment=(fields=golden.fields)=>'#'+new URLSearchParams(fields).toString();
test('Core native-join golden accepts only complete original invitation locators',()=>{
 assert.equal(golden.classification,'SYNTHETIC_NOT_REDEEMABLE');
 for(const ha_url of golden.accepted_origins) assert.deepEqual(parseNativeJoinFragment(fragment({...golden.fields,ha_url})),{...golden.fields,ha_url});
 for(const ha_url of golden.rejected_origins) assert.throws(()=>parseNativeJoinFragment(fragment({...golden.fields,ha_url})),/invalid_invitation/);
});
test('unknown, duplicated, missing, oversized, malformed and wrong-version locators reject',()=>{
 const valid=fragment();
 for(const key of Object.keys(golden.fields)){
  const missing={...golden.fields};delete missing[key];assert.throws(()=>parseNativeJoinFragment(fragment(missing)));
  assert.throws(()=>parseNativeJoinFragment(valid+'&'+key+'='+encodeURIComponent(golden.fields[key])));
  assert.throws(()=>parseNativeJoinFragment(valid.replace(key+'=',key+'=%ZZ')));
 }
 for(const [key,value]of [['v','2'],['issuer_epoch','E'.repeat(42)],['invitation_id','I'.repeat(33)],['invitation_secret','djcg_'+ 'S'.repeat(43)],['invitation_secret','S'.repeat(42)+'+'],['ha_url','https://'+'a'.repeat(1024)+'.example.org']])
  assert.throws(()=>parseNativeJoinFragment(fragment({...golden.fields,[key]:value})));
 for(const value of [valid+'&owner_token=synthetic',valid.replace('v=1','%76=1'),valid+'x'.repeat(2048),valid.slice(1),'',null])assert.throws(()=>parseNativeJoinFragment(value));
});
test('native handoff is explicit, single-use and never extends the original memory ceiling',()=>{
 let now=100;const invitation=new NativeJoinInvitation(fragment(),()=>now);
 assert.equal(invitation.available,true);assert.equal(invitation.take(),'djconnect://join'+fragment());
 assert.equal(invitation.available,false);assert.equal(invitation.take(),null);
 const expired=new NativeJoinInvitation(fragment(),()=>now);now+=120_000;
 assert.equal(expired.available,false);assert.equal(expired.take(),null);
 const hidden=new NativeJoinInvitation(fragment(),()=>now);hidden.clear();assert.equal(hidden.take(),null);
});
function pageFixture({origin='https://vibecast.tv',search='',historyFailure=false,language='nl'}={}){
 const elements=new Map(),callbacks=new Map(),documentCallbacks=new Map(),navigations=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',disabled:true,events:new Map(),addEventListener(name,fn){this.events.set(name,fn);},setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];}});return elements.get(id);};
 const document={documentElement:{lang:'en'},hidden:false,getElementById:element,addEventListener:(name,fn)=>documentCallbacks.set(name,fn)};
 let timer;
 const window={navigator:{language},location:{origin,pathname:'/join',hash:fragment(),search},history:{replaceState(_state,_title,path){if(historyFailure)throw Error('history disabled');window.location.hash='';window.location.search='';window.location.pathname=path;}},addEventListener:(name,fn)=>callbacks.set(name,fn),setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;}};
 const result=startNativeJoinPage({window,document,navigate:url=>navigations.push(url)});
 return {window,document,elements,callbacks,documentCallbacks,navigations,result,expire:()=>timer?.()};
}
test('landing erases URL before rendering, never joins itself, and spends only on Open app',()=>{
 const p=pageFixture();assert.equal(p.window.location.hash,'');assert.equal(p.navigations.length,0);
 assert.equal(p.elements.get('join-install').href,appStoreURL);assert.equal(p.elements.get('join-open').disabled,false);
 assert.equal(p.elements.get('join-rescan').hidden,false);
 assert.ok(!JSON.stringify([...p.elements.values()]).includes(golden.fields.invitation_secret));
 p.elements.get('join-open').events.get('click')();assert.deepEqual(p.navigations,['djconnect://join'+fragment()]);
 p.elements.get('join-open').events.get('click')();assert.equal(p.navigations.length,1);assert.equal(p.elements.get('join-open').disabled,true);
 assert.equal(p.elements.get('join-rescan').hidden,true);
});
test('expiry, hidden page, pagehide, history refusal and foreign origins fail closed without restore',()=>{
 for(const trigger of ['expiry','hidden','pagehide']){
  const p=pageFixture();if(trigger==='expiry')p.expire();else if(trigger==='hidden'){p.document.hidden=true;p.documentCallbacks.get('visibilitychange')();}else p.callbacks.get('pagehide')();
  p.elements.get('join-open').events.get('click')();assert.equal(p.navigations.length,0);assert.equal(p.elements.get('join-open').disabled,true);
 }
 for(const options of [{origin:'https://qa.vibecast.tv'},{origin:'https://evil.example'},{search:'?ha_url=untrusted'},{historyFailure:true}]){
  const p=pageFixture(options);assert.equal(p.elements.get('join-open').disabled,true);p.elements.get('join-open').events.get('click')();assert.equal(p.navigations.length,0);
  if(options.historyFailure)assert.equal(p.elements.get('join-install').href,undefined);
 }
});
test('history refusal at the final app or store boundary prevents external navigation',()=>{
 const p=pageFixture();p.window.history.replaceState=()=>{throw Error('history now unavailable');};
 p.elements.get('join-open').events.get('click')();assert.equal(p.navigations.length,0);
 let prevented=false;p.elements.get('join-install').events.get('click')({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(p.elements.get('join-open').disabled,true);
});
test('a new camera scan in the same tab accepts a new invitation without renewing the previous one',()=>{
 const p=pageFixture();p.window.location.hash=fragment();p.callbacks.get('hashchange')();
 assert.equal(p.elements.get('join-open').disabled,true);
 const next=fragment({...golden.fields,invitation_id:'J'.repeat(32)});
 p.window.location.hash=next;p.callbacks.get('hashchange')();
 assert.equal(p.elements.get('join-open').disabled,false);assert.equal(p.window.location.hash,'');
 p.elements.get('join-open').events.get('click')();assert.deepEqual(p.navigations,['djconnect://join'+next]);
});
test('VibeCast Party native landing has complete copy in all five app languages',()=>{
 const keys=Object.keys(joinCopy.en).sort();assert.deepEqual(Object.keys(joinCopy).sort(),['de','en','es','fr','nl']);
 for(const [language,copy]of Object.entries(joinCopy)){
  assert.deepEqual(Object.keys(copy).sort(),keys);assert.ok(Object.values(copy).every(value=>typeof value==='string'&&value.length>5));assert.match(copy.title,/VibeCast Party/);
  const p=pageFixture({language});assert.equal(p.document.documentElement.lang,language);assert.equal(p.document.title,copy.title);
 }
 assert.equal(pageFixture({language:'unknown'}).document.documentElement.lang,'en');
});
