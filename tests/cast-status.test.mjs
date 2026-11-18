import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
// Derived from Core's pinned d7396554 lifecycle harness; execute distribution bytes.
const page=fs.readFileSync(new URL('../wwwroot/index.html',import.meta.url),'utf8');
const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function harness() {
 const listeners=new Map(),cafListeners=new Map(),elements=new Map(),sockets=[],sent=[],timers=new Map();let timerId=0,ready=false,receive,options,offset=0;
 class Clock extends Date {constructor(...args){super(...(args.length?args:[Date.now()+offset]));}static now(){return Date.now()+offset;}}
 const make=()=>({children:[],get firstChild(){return this.children[0]||null;},removeChild(node){this.children.splice(this.children.indexOf(node),1);},appendChild(node){this.children.push(node);},textContent:'',hidden:false,src:'',alt:'',max:0,value:0,style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},addEventListener(){},getBoundingClientRect:()=>({height:10}),scrollHeight:10,clientHeight:10});
 const window={DJC_VIBECAST_MODE:'cast',location:{search:'',protocol:'https:',host:'receiver.test'},addEventListener(n,cb){if(!listeners.has(n))listeners.set(n,[]);listeners.get(n).push(cb);},dispatchEvent(e){for(const cb of listeners.get(e.type)||[])cb(e);},setTimeout(cb,ms){const id=++timerId;timers.set(id,{cb,ms});return id;},clearTimeout(id){timers.delete(id);},setInterval(){return 0;},matchMedia:()=>({matches:true})};
 const context={addCustomMessageListener(ns,cb){assert.ok(ready,'listener requires real readiness');assert.equal(options.customNamespaces[ns],'JSON');receive=cb;},addEventListener(n,cb){cafListeners.set(n,cb);},isSystemReady:()=>ready,start(o){options=o;},sendCustomMessage(ns,id,data){assert.ok(id,'never broadcast');sent.push({ns,id,data});}};
 window.cast={framework:{CastReceiverContext:{getInstance:()=>context},system:{EventType:{READY:'ready',SENDER_DISCONNECTED:'disconnected'},MessageType:{JSON:'JSON'}}}};
 class WS{constructor(url){this.url=url;sockets.push(this);}close(){if(this.onclose)this.onclose();}}
 class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
 const document={documentElement:{lang:'en',style:{setProperty(){},removeProperty(){}}},body:{classList:{toggle(){}}},querySelector:()=>null,getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id);}};
 const sandbox={Date:Clock,window,document,navigator:{language:'en'},CustomEvent,WebSocket:WS,URL,URLSearchParams,console};
 vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[1],sandbox);
 return {advance(ms){offset+=ms;},window,elements,sockets,sent,timers,options,ready(){ready=true;cafListeners.get('ready')();},message(value,id='sender-a'){receive({data:value,senderId:id});},frame(ws,value){ws.onmessage({data:JSON.stringify(value)});},expire(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.cb();}},disconnect(id){cafListeners.get('disconnected')({senderId:id});}};
}
const handoff=(id='a'.repeat(32),session='session-a')=>({kind:'vibecast_handoff',version:1,status_version:1,handoff_id:id,session_id:session,ha_url:'https://ha.test/',broadcast_token:'synthetic-token-with-32-characters'});
const snapshot=(session='session-a',moments=[])=>({type:'snapshot',session_id:session,capabilities:{view_broadcast:true,owner_controls:false},snapshot:{schema_version:1,session:{session_id:session,locale:'en'},broadcast:{snapshot_watermark:1},playback:{title:'Private track title',item_id:'track'},dj_moments:moments}});
const states=h=>h.sent.map(m=>m.data.state);
test('CAF initializes namespace before start and installs listener only when ready',()=>{const h=harness();assert.equal(h.options.customNamespaces['urn:x-cast:com.djconnect.vibecast.v1'],'JSON');assert.deepEqual(h.sent,[]);h.ready();});
test('socket open is not HA acceptance; accepted Silence is active presentation',()=>{const h=harness();h.ready();h.message(handoff());assert.deepEqual(states(h),['receiver_ready','connecting']);h.sockets[0].onopen();assert.equal(states(h).includes('presenting'),false);h.frame(h.sockets[0],snapshot());assert.deepEqual(states(h).slice(-2),['snapshot_accepted','presenting']);assert.equal(h.sent.at(-1).data.presentation,'silence');for(const m of h.sent){assert.equal(m.id,'sender-a');assert.equal(m.data.handoff_id,'a'.repeat(32));assert.equal(m.data.session_id,'session-a');assert.equal(m.data.lease_ms,15000);assert.ok(!JSON.stringify(m).includes('synthetic-token'));assert.ok(!JSON.stringify(m).includes('Private track'));}});
test('same-track updates report Moment and expiry reports Silence without losing readiness',()=>{const h=harness();h.ready();h.message(handoff());h.frame(h.sockets[0],snapshot('session-a',[{moment_id:'m',summary:'Private persona',playback_item_id:'track',created_at:new Date().toISOString(),presentation_intent:{maximum_duration_seconds:1}}]));assert.equal(h.sent.at(-1).data.presentation,'moment');assert.ok(!JSON.stringify(h.sent).includes('Private persona'));});
test('wrong Session/incompatible/auth-error cannot report accepted snapshot',()=>{for(const mode of ['wrong','schema','auth']){const h=harness();h.ready();h.message(handoff());let frame=snapshot();if(mode==='wrong')frame.session_id='wrong';if(mode==='schema')frame.snapshot.schema_version=9;if(mode==='auth')frame={type:'error',error:'private-token-reason'};h.frame(h.sockets[0],frame);assert.equal(states(h).includes('snapshot_accepted'),false);if(mode!=='wrong')assert.equal(h.sent.at(-1).data.state,'error');}});
test('new handoff/sender invalidates callbacks and wrong stop/disconnect',()=>{const h=harness();h.ready();h.message(handoff());const old=h.sockets[0];h.message(handoff('b'.repeat(32),'session-b'),'sender-b');const count=h.sent.length;h.frame(old,snapshot());old.onclose();assert.equal(h.sent.length,count);h.message({kind:'vibecast_stop',version:1,handoff_id:'b'.repeat(32),session_id:'session-b'},'sender-a');h.disconnect('sender-a');assert.equal(h.sockets.length,2);h.frame(h.sockets[1],snapshot('session-b'));assert.equal(h.sent.at(-1).id,'sender-b');h.message({kind:'vibecast_stop',version:1,handoff_id:'b'.repeat(32),session_id:'session-b'},'sender-b');assert.equal(h.sent.at(-1).data.state,'stopped');assert.equal(h.elements.get('title').textContent,'Waiting for a session');});
test('timeout stops access and cannot be revived by late snapshot',()=>{const h=harness();h.ready();h.message(handoff());const old=h.sockets[0];h.expire(15000);assert.equal(h.sent.at(-1).data.state,'error');assert.equal(h.sent.at(-1).data.reason,'snapshot_timeout');const count=h.sent.length;h.frame(old,snapshot());assert.equal(h.sent.length,count);});
test('reconnect withdraws presentation then requires fresh snapshot; Runtime-end terminates',()=>{const h=harness();h.ready();h.message(handoff());h.frame(h.sockets[0],snapshot());h.sockets[0].onclose();assert.equal(h.sent.at(-1).data.state,'recovering');h.expire(1000);h.sockets.at(-1).onopen();assert.notEqual(h.sent.at(-1).data.state,'presenting');h.frame(h.sockets.at(-1),snapshot());assert.equal(h.sent.at(-1).data.state,'presenting');h.frame(h.sockets.at(-1),{type:'event',data:{session_id:'session-a',delivery_sequence:2,event_type:'runtime_ended',payload:{}}});assert.equal(h.sent.at(-1).data.state,'ended');});
test('legacy handoff works without status or privilege uplift',()=>{const h=harness();h.ready();const value=handoff();delete value.status_version;delete value.handoff_id;value.end_grant='invented';h.message(value);h.frame(h.sockets[0],snapshot());assert.deepEqual(h.sent,[]);assert.equal(h.elements.has('end-session'),false);});

test('presentation lease heartbeat and expiry follow real render state',()=>{const h=harness();h.ready();h.message(handoff());h.frame(h.sockets[0],snapshot('session-a',[{moment_id:'m',summary:'Private persona',playback_item_id:'track',created_at:new Date().toISOString(),presentation_intent:{maximum_duration_seconds:1}}]));const before=h.sent.at(-1).data.sequence;h.advance(2000);for(const [id,t] of [...h.timers])if(t.ms<2000){h.timers.delete(id);t.cb();}assert.equal(h.sent.at(-1).data.presentation,'silence');h.expire(5000);assert.ok(h.sent.at(-1).data.sequence>before);assert.equal(h.sent.at(-1).data.state,'presenting');h.expire(15000);assert.equal(h.sent.at(-1).data.state,'presenting');});
test('replayed retired ID cannot replace current session; malformed unrelated sender cannot clear it',()=>{const h=harness();h.ready();h.message(handoff());h.message(handoff('b'.repeat(32),'session-b'),'sender-b');const count=h.sockets.length;h.message(handoff());h.message({kind:'vibecast_handoff',version:99},'intruder');assert.equal(h.sockets.length,count);h.frame(h.sockets.at(-1),snapshot('session-b'));assert.equal(h.sent.at(-1).data.handoff_id,'b'.repeat(32));});
test('unsupported status contract and malformed correlation never receive success',()=>{for(const change of [{status_version:9},{handoff_id:'invalid'},{handoff_id:null}]){const h=harness();h.ready();h.message({...handoff(),...change});assert.deepEqual(h.sent,[]);assert.equal(h.sockets.length,0);}});
test('duplicate retry does not extend the first snapshot deadline',()=>{const h=harness();h.ready();const value=handoff();h.message(value);const deadlines=[...h.timers].filter(([,t])=>t.ms===15000);assert.equal(deadlines.length,1);h.message(value);assert.equal(h.sockets.length,1);assert.deepEqual([...h.timers].filter(([,t])=>t.ms===15000).map(([id])=>id),deadlines.map(([id])=>id));h.expire(15000);assert.equal(h.sent.at(-1).data.reason,'snapshot_timeout');});
test('frequent presentation renders cannot postpone heartbeat',()=>{const h=harness();h.ready();h.message(handoff());h.frame(h.sockets[0],snapshot());const heartbeat=[...h.timers].find(([,t])=>t.ms===5000)[0];for(let sequence=2;sequence<20;sequence++)h.frame(h.sockets[0],{type:'event',data:{session_id:'session-a',delivery_sequence:sequence,event_type:'playback_changed',payload:{playback:{title:'Private update',item_id:'track'}}}});assert.ok(h.timers.has(heartbeat));const before=h.sent.length;h.expire(5000);assert.equal(h.sent.length,before+1);});

const lock=JSON.parse(fs.readFileSync(new URL('../vibecast-source-lock.json',import.meta.url),'utf8'));
const schemaBytes=fs.readFileSync(new URL('../'+lock.status_schema_file,import.meta.url));
assert.equal(createHash('sha256').update(schemaBytes).digest('hex'),lock.status_schema_sha256);
const schema=JSON.parse(schemaBytes);
function checkEnvelope(value) {
 for(const key of schema.required) assert.ok(Object.hasOwn(value,key),key);
 for(const key of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties,key),'extra field '+key);
 for(const [key,rule] of Object.entries(schema.properties)) {
  if(!Object.hasOwn(value,key))continue;
  if(Object.hasOwn(rule,'const'))assert.equal(value[key],rule.const);
  if(rule.enum)assert.ok(rule.enum.includes(value[key]),key);
  if(rule.type==='string'){
   assert.equal(typeof value[key],'string');
   if(rule.minLength)assert.ok(value[key].length>=rule.minLength);
   if(rule.maxLength)assert.ok(value[key].length<=rule.maxLength);
   if(rule.pattern)assert.match(value[key],new RegExp(rule.pattern));
  }
  if(rule.type==='integer'){assert.ok(Number.isInteger(value[key]));assert.ok(value[key]>=rule.minimum);}
 }
 assert.equal(Object.hasOwn(value,'presentation'),value.state==='presenting');
}
test('receiving status envelopes conform to pinned schema without sender-supplied authority or private content',()=>{
 const h=harness();h.ready();
 h.message({...handoff(),senderId:'untrusted-json-sender',end_grant:'untrusted-owner-grant',profile:'private-profile',history:'private-history'},'actual-caf-sender');
 h.frame(h.sockets[0],snapshot());h.expire(5000);
 let sequence=0;
 for(const envelope of h.sent){
  checkEnvelope(envelope.data);assert.equal(envelope.id,'actual-caf-sender');
  assert.ok(envelope.data.sequence>sequence);sequence=envelope.data.sequence;
  for(const secret of ['untrusted-json-sender','untrusted-owner-grant','private-profile','private-history','https://ha.test','synthetic-token'])assert.ok(!JSON.stringify(envelope).includes(secret));
 }
});
test('half opt-in, uppercase correlation and nonnumeric wire version never start HA transport',()=>{
 for(const change of [{status_version:undefined},{handoff_id:undefined},{handoff_id:'A'.repeat(32)},{handoff_id:'a'.repeat(31)},{status_version:'1'},{status_version:true}]){
  const h=harness();h.ready();h.message({...handoff(),...change});assert.equal(h.sockets.length,0);assert.equal(h.sent.length,0);
 }
});
test('view-only stop invokes no HTTP control and terminal stop cancels heartbeat and late renderer status',()=>{
 const h=harness();h.ready();let controls=0;h.window.fetch=()=>{controls++;throw new Error('No receiver HTTP control');};
 h.message({...handoff(),end_grant:'invented'});h.frame(h.sockets[0],snapshot());
 assert.equal(h.elements.has('end-session'),false);
 h.message({kind:'vibecast_stop',version:1,handoff_id:'a'.repeat(32),session_id:'session-a'});
 const count=h.sent.length;h.expire(5000);h.expire(15000);
 h.window.dispatchEvent({type:'djconnect-renderer-status',detail:{generation:1,session_id:'session-a',state:'presenting',presentation:'moment'}});
 assert.equal(h.sent.length,count);assert.equal(controls,0);assert.equal(h.sent.at(-1).data.state,'stopped');
 checkEnvelope(h.sent.at(-1).data);
});
test('superseded renderer generation cannot send success for the new handoff',()=>{
 const h=harness();h.ready();h.message(handoff());h.message(handoff('b'.repeat(32),'session-b'),'sender-b');
 const count=h.sent.length;
 h.window.dispatchEvent({type:'djconnect-renderer-status',detail:{generation:1,session_id:'session-a',state:'presenting',presentation:'moment'}});
 assert.equal(h.sent.length,count);assert.equal(h.sent.at(-1).data.state,'connecting');
 h.frame(h.sockets.at(-1),snapshot('session-b'));for(const entry of h.sent)checkEnvelope(entry.data);
});
