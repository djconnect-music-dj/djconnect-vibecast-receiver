// Executes imported bytes with modeled DOM/CAF/WS. This is software evidence only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const page = fs.readFileSync(new URL('../wwwroot/index.html', import.meta.url), 'utf8');
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function runtime(lang='en') {
  const elements=new Map(), sockets=[], timers=new Map(), listeners=new Map(); let count=0, receiver;
  const element=()=>({children:[],get firstChild(){return this.children[0]||null;},removeChild(node){this.children.splice(this.children.indexOf(node),1);},appendChild(node){this.children.push(node);},textContent:'',hidden:false,src:'',href:'',style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(key){this[key]='';},addEventListener(){}});
  const document={body:element(),documentElement:{lang,style:{setProperty(){},removeProperty(){}}},querySelector:()=>null,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
  class WS {constructor(url){this.url=url;sockets.push(this);}close(){this.closed=true;this.onclose?.();}}
  const window={location:{protocol:'https:',host:'receiver.test',search:'?session_id=ignored&broadcast_token=ignored'},setTimeout(fn,delay){timers.set(++count,{fn,delay});return count;},clearTimeout(id){timers.delete(id);},setInterval(){},matchMedia:()=>({matches:true}),addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);},cast:{framework:{CastReceiverContext:{getInstance:()=>({addCustomMessageListener(ns,fn){receiver=fn;},start(){},addEventListener(){},isSystemReady:()=>true})},system:{EventType:{READY:"ready",SENDER_DISCONNECTED:"disconnected"},MessageType:{JSON:"JSON"}}}}};
  const context={window,document,navigator:{language:lang},URL,URLSearchParams,Date,WebSocket:WS,CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}}};
  for(const script of scripts)vm.runInNewContext(script,context);
  return {elements,sockets,timers,window,document,handoff(id='s'){receiver({data:{kind:'vibecast_handoff',version:1,ha_url:'https://ha.test',session_id:id,broadcast_token:'t'.repeat(24)}});},frame(socket,value){socket.onmessage({data:JSON.stringify(value)});}};
}
const moment=(id,summary)=>({moment_id:id,type:'artist',summary,content:'Persona detail',playback_item_id:'track',created_at:new Date().toISOString(),presentation_intent:{maximum_duration_seconds:30},source_attribution:{provider:'MusicBrainz',url:'https://musicbrainz.org/recording/11111111-1111-1111-1111-111111111111',url_previous:'https://musicbrainz.org/recording/22222222-2222-2222-2222-222222222222'}});
const snapshot=(id,lang='en')=>({type:'snapshot',session_id:id,capabilities:{view_broadcast:true,owner_controls:false},snapshot:{schema_version:1,session:{session_id:id,locale:lang},broadcast:{snapshot_watermark:1},playback:{item_id:'track',title:'Track',artist:'Artist',album:'Album',artwork_url:'/cover',duration_ms:180000,position_ms:60000},dj_moments:[moment('m1','First persona text')]}});
test('imported renderer shows current snapshot, two sources and later same-track Moments in five languages',()=>{
  for(const lang of ['en','nl','de','fr','es']){
    const r=runtime(lang);assert.equal(r.sockets.length,0);r.handoff();const s=r.sockets[0];
    assert.ok(s.url.startsWith('wss://ha.test/api/djconnect/v1/session/broadcast/ws/s?'));s.onopen();r.frame(s,snapshot('s',lang));
    assert.equal(r.document.documentElement.lang,lang);assert.equal(r.elements.get('title').textContent,'Track');assert.equal(r.elements.get('progress').value,60000);assert.equal(r.elements.get('artwork').src,'https://ha.test/cover');assert.equal(r.elements.get('moment').textContent,'First persona text');assert.equal(r.elements.get('moment-source').hidden,false);assert.equal(r.elements.get('moment-source-previous').hidden,false);assert.equal(r.elements.has('end-session'),false);
    const event={type:'event',data:{session_id:'s',delivery_sequence:2,event_type:'dj_moment_published',payload:{dj_moment:moment('m2','Second persona text')}}};r.frame(s,event);assert.equal(r.elements.get('moment').textContent,'Second persona text');r.frame(s,event);assert.equal(r.elements.get('moment').textContent,'Second persona text');
    r.frame(s,{type:'event',data:{session_id:'s',delivery_sequence:1,event_type:'playback_changed',payload:{playback:{title:'Stale'}}}});assert.equal(r.elements.get('title').textContent,'Track');
    r.frame(s,{type:'event',data:{session_id:'s',delivery_sequence:3,event_type:'runtime_ended',payload:{}}});assert.equal(r.elements.get('moment').textContent,'');assert.equal(r.elements.get('artwork').hidden,true);assert.ok(s.closed);
  }
});
test('new handoff and host-stop invalidate late callbacks/reconnect, incompatible snapshots fail closed',()=>{
  const r=runtime();r.handoff('old');const old=r.sockets[0];r.frame(old,snapshot('old'));old.onclose();assert.ok(r.timers.size);
  r.handoff('new');const active=r.sockets[1];r.frame(active,snapshot('new'));r.frame(old,snapshot('old'));assert.equal(r.elements.get('title').textContent,'Track');old.onclose();assert.equal(r.sockets.length,2);
  r.window.dispatchEvent({type:'djconnect-host-stop'});r.frame(active,snapshot('new'));assert.equal(r.elements.get('title').textContent,'Waiting for a session');assert.equal(r.timers.size,0);assert.ok(active.closed);
  r.handoff('wrong');const wrong=r.sockets.at(-1);const f=snapshot('wrong');f.capabilities.owner_controls=true;r.frame(wrong,f);assert.match(r.elements.get('state').textContent,/compatible/);assert.ok(wrong.closed);
});

test('retired screen authority is absent and a directly injected legacy grant cannot create controls',()=>{
  assert.doesNotMatch(page,/end-session|endGrant|end_grant|broadcast\/control\/end/);
  for(const lang of ['en','nl','de','fr','es']){
    const r=runtime(lang);let requests=0;r.window.fetch=()=>{requests++;throw new Error('HTTP control forbidden');};
    r.window.dispatchEvent({type:'djconnect-handoff',detail:{ha_url:'https://ha.test',session_id:'s',broadcast_token:'t'.repeat(24),end_grant:'legacy-forged-grant'}});
    const socket=r.sockets[0];r.frame(socket,snapshot('s',lang));
    assert.equal(r.elements.has('end-session'),false);assert.equal(r.elements.get('title').textContent,'Track');
    r.frame(socket,{type:'event',data:{session_id:'s',delivery_sequence:2,event_type:'runtime_ended',payload:{}}});
    assert.equal(r.elements.get('moment').textContent,'');assert.equal(r.elements.get('artwork').hidden,true);assert.ok(socket.closed);assert.equal(requests,0);
  }
});
