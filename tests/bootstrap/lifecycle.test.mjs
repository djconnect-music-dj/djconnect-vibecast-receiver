import test from 'node:test';import assert from 'node:assert/strict';
import {BootstrapController,unavailableAdapter,validMatrix} from '../../bootstrap/src/lifecycle.mjs';
import {chooseEffects,createEffectsUpdater} from '../../bootstrap/src/effects.mjs';
import {locales,selectLocale} from '../../bootstrap/src/locales.mjs';
import {build} from '../../scripts/build_bootstrap.mjs';
import {readFile,readdir} from 'node:fs/promises';
const matrix=()=>Array.from({length:21},()=>Array(21).fill(false));
const pending=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness() {
 let time=1000;const calls=[],channels=[],timers=new Map();let timer=0;
 const adapter={contract:'TEST_ONLY_NOT_WIRE',create:async()=>({expiresAt:2000,matrix:matrix(),testBinding:'window-a'}),validateChallenge:c=>c.testBinding==='window-a',wait:args=>{const d=pending();channels.push({...d,args});return d.promise;},verifyDestination:async(e,{challenge})=>{if(e.binding!==challenge.testBinding)throw new Error('misbound');return e.url;},allowsDestination:url=>url.origin==='https://ha.example' && url.pathname==='/display' && !url.search};
 const controller=new BootstrapController({adapter,render:s=>calls.push(s),navigate:url=>calls.push({url}),now:()=>time,schedule:(f,delay)=>{timers.set(++timer,{f,delay});return timer;},cancel:id=>timers.delete(id)});
 return {controller,adapter,calls,channels,timers,advance:t=>{time=t;for(const {f} of [...timers.values()]) f();}};
}
test('production without a producer makes no request or QR',async()=>{const states=[];const c=new BootstrapController({render:s=>states.push(s),navigate:()=>assert.fail()});await c.start();assert.deepEqual(states,[{state:'unavailable'}]);await c.start(false);assert.equal(states.at(-1).state,'unsupported');});
test('verified challenge waits, confirms and redirects only once',async()=>{const h=harness();const p=h.controller.start();await tick();assert.equal(h.calls.at(-1).state,'waiting');h.channels[0].args.onConfirming();assert.equal(h.calls.at(-1).state,'confirming');h.channels[0].resolve({binding:'window-a',url:'https://ha.example/display'});await p;assert.equal(h.calls.at(-1).url,'https://ha.example/display');assert.equal(h.timers.size,0);assert.equal(h.controller.challenge,null);h.channels[0].args.onConfirming();assert.equal(h.calls.filter(c=>c.url).length,1);});
test('expiry invalidates pending exchange and late results',async()=>{const h=harness();const p=h.controller.start();await tick();h.advance(2000);assert.equal(h.calls.at(-1).state,'expired');h.channels[0].resolve({binding:'window-a',url:'https://ha.example/display'});await p;assert.equal(h.calls.filter(c=>c.url).length,0);});
test('superseded generation cannot deliver or change current UI',async()=>{const h=harness();const a=h.controller.start();await tick();const b=h.controller.start();await tick();h.channels[0].resolve({binding:'window-a',url:'https://ha.example/display'});await a;assert.equal(h.calls.at(-1).state,'waiting');h.channels[1].resolve({binding:'window-a',url:'https://ha.example/display'});await b;assert.equal(h.calls.filter(c=>c.url).length,1);});
test('reconnect retains original expiry and retires old channel',async()=>{const h=harness();const a=h.controller.start();await tick();h.advance(1700);const b=h.controller.reconnect();await tick();assert.equal(h.controller.challenge.expiresAt,2000);assert.equal(h.channels[0].args.signal.aborted,true);h.channels[0].resolve({binding:'window-a',url:'https://ha.example/display'});await a;assert.equal(h.calls.filter(c=>c.url).length,0);h.advance(2000);h.channels[1].reject(new Error('network'));await b;assert.equal(h.calls.at(-1).state,'expired');});
test('verification resolving after expiry or stop cannot navigate',async()=>{for(const stop of [false,true]){const h=harness(),verified=pending();h.adapter.verifyDestination=()=>verified.promise;const p=h.controller.start();await tick();h.channels[0].resolve({});await tick();if(stop)h.controller.stop();else h.advance(2001);verified.resolve('https://ha.example/display');await p;assert.equal(h.calls.filter(c=>c.url).length,0);}});
test('reject unsafe or unqualified destinations',async()=>{for(const url of ['http://ha.example/display','javascript:alert(1)','https://user:secret@ha.example/display','https://ha.example/display#secret','https://other.example/display','https://ha.example/else','https://ha.example/display?url=https://evil.example','https://ha.example.evil.example/display']){const h=harness();const p=h.controller.start();await tick();h.channels[0].resolve({binding:'window-a',url});await p;assert.equal(h.calls.at(-1).state,'unsafe',url);assert.equal(h.calls.filter(c=>c.url).length,0);}});
test('misbound, tampered and network failures never navigate',async()=>{for(const binding of ['window-b',undefined]){const h=harness();const p=h.controller.start();await tick();h.channels[0].resolve({binding,url:'https://ha.example/display'});await p;assert.equal(h.calls.filter(c=>c.url).length,0);}const h=harness();const p=h.controller.start();await tick();h.channels[0].reject(new Error('network'));await p;assert.equal(h.calls.at(-1).state,'recovering');h.controller.stop();});
test('unknown adapter, expired challenge and malformed matrix fail closed',async()=>{for(const kind of ['unknown','expired','matrix','binding']){const h=harness();if(kind==='unknown')h.adapter.wait=null;else h.adapter.create=async()=>({expiresAt:kind==='expired'?900:2000,matrix:kind==='matrix'?[[true]]:matrix(),testBinding:kind==='binding'?'wrong':'window-a'});await h.controller.start();assert.equal(h.calls.at(-1).state,'unknown');assert.equal(h.channels.length,0);}assert.equal(validMatrix(matrix()),true);assert.equal(validMatrix(Array(21).fill(Array(21).fill(1))),false);});
test('fewer effects and accessibility always win; slow or unknown uses solid',()=>{const frames=Array(44).fill(16);assert.equal(chooseEffects({supported:true,frames}),'glass');assert.equal(chooseEffects({supported:true,frames:Array(44).fill(30)}),'soft');for(const args of [{supported:false,frames},{supported:true,reduced:true,frames},{supported:true,highContrast:true,frames},{supported:true,frames:[]},{supported:true,frames:Array(44).fill(80)}])assert.equal(chooseEffects(args),'solid');});
test('preference changes share one frame sample and late results respect reduced effects',async()=>{
 const reading=pending();let reduced=false,samples=0,mode;
 const update=createEffectsUpdater({readPreferences:()=>({supported:true,reduced}),apply:next=>{mode=next;},sample:()=>{samples++;return reading.promise;}});
 update();reduced=true;update();reduced=false;update();await tick();assert.equal(samples,1);
 reduced=true;update();reading.resolve(Array(44).fill(16));await tick();assert.equal(mode,'solid');
 reduced=false;update();assert.equal(mode,'glass');assert.equal(samples,1);
});
test('a failed frame sample leaves solid mode and can retry on a later preference event',async()=>{
 let samples=0,mode;
 const update=createEffectsUpdater({readPreferences:()=>({supported:true}),apply:next=>{mode=next;},sample:async()=>{if(++samples===1)throw Error('unavailable');return Array(44).fill(30);}});
 update();await tick();assert.equal(mode,'solid');assert.equal(samples,1);
 update();await tick();assert.equal(mode,'soft');assert.equal(samples,2);
});
test('all states and controls exist in five complete languages',()=>{assert.equal(selectLocale('NL-nl'),'nl');assert.equal(selectLocale('zh'),'en');assert.equal(Object.keys(locales).length,5);for(const copy of Object.values(locales)){assert.deepEqual(Object.keys(copy),Object.keys(locales.en));for(const value of Object.values(copy))assert.ok(typeof value==='string'?value.length:value.length===2&&value.every(Boolean));}});
test('build is byte-reproducible, omits redundant wire modules and rejects Cast output/invalid source',async()=>{const sha='1'.repeat(40);await build('dist/check-a',sha);await build('dist/check-b',sha);const names=await readdir('dist/check-a');for(const name of names)assert.deepEqual(await readFile('dist/check-a/'+name),await readFile('dist/check-b/'+name));assert.ok(names.includes('rendezvous.mjs'));assert.ok(!names.includes('wire.mjs')&&!names.includes('wire-schema.mjs'));await assert.rejects(build('wwwroot',sha));await assert.rejects(build('dist/check-c','main'));const manifest=JSON.parse(await readFile('dist/check-a/build-manifest.json'));assert.equal(manifest.rendezvous,'djc-rendezvous/1-implementation.1');assert.equal(manifest.sourceSHA,sha);});
test('wall-clock rollback cannot extend the original monotonic challenge deadline',async()=>{let wall=1000,mono=0,deadline;const states=[];const wait=pending();const c=new BootstrapController({adapter:{contract:'TEST_ONLY',create:async()=>({expiresAt:2000,matrix:matrix()}),validateChallenge:()=>true,wait:()=>wait.promise,verifyDestination:async()=> 'https://ha.example/display',allowsDestination:()=>true},render:s=>states.push(s.state),navigate:()=>assert.fail(),now:()=>wall,monotonic:()=>mono,schedule:fn=>{deadline=fn;return 1;},cancel:()=>{}});const p=c.start();await tick();wall=0;mono=1001;deadline();assert.equal(states.at(-1),'expired');wait.resolve({});await p;});
test('public artifact contains no fixtures, credentials, storage or executable injection',async()=>{await build('dist/privacy-test','a'.repeat(40));for(const name of await readdir('dist/privacy-test')){const source=await readFile('dist/privacy-test/'+name,'utf8');assert.doesNotMatch(source,/TEST_ONLY|testBinding|ha\.example|oauth_token|CLOUDFLARE_API_TOKEN|localStorage|sessionStorage|eval\(/,name);}const headers=await readFile('dist/privacy-test/_headers','utf8');assert.match(headers,/connect-src https:\/\/api\.djconnect\.dev;/);});
test('expiry reached during deadline arming cannot be overwritten by waiting at start or reconnect',async()=>{
 for(const reconnect of [false,true]) {
  let clock=1000,reads=0,race=false;const states=[],channel=pending();
  const c=new BootstrapController({adapter:{contract:'TEST_ONLY',create:async()=>({expiresAt:2000,matrix:matrix()}),validateChallenge:()=>true,wait:()=>channel.promise,verifyDestination:async()=> 'https://ha.example/display',allowsDestination:()=>true},render:s=>states.push(s.state),navigate:()=>assert.fail(),now:()=>{if(race&&++reads>=2)clock=2001;return clock;},monotonic:()=>0,schedule:()=>1,cancel:()=>{}});
  if(reconnect){const work=c.start();await tick();race=true;await c.reconnect();channel.resolve({});await work;}
  else {race=true;await c.start();}
  assert.equal(c.state,'expired');assert.equal(c.challenge,null);assert.equal(states.at(-1),'expired');
 }
});

test('early server expiry hides the QR and preserves the original rotation deadline', async () => {
 let now = 0, deadline, replacements = 0;
 const states = [];
 const adapter = {
  bounded: true, contract: 'TEST_ONLY',
  create: async () => ({expiresAt: 120000, monotonicDeadline: 120000, matrix: matrix()}),
  validateChallenge: () => true, verifyDestination: () => assert.fail(), allowsDestination: () => false,
  wait: async () => { now = 119900; throw Object.assign(Error('expired'), {state: 'expired'}); },
  canRestart: () => now === 120000, canRotate: () => now === 120000
 };
 const c = new BootstrapController({adapter, autoRotate: true,
  adapterFactory: () => { replacements++; return unavailableAdapter; },
  now: () => now, monotonic: () => now,
  schedule: (callback, delay) => { deadline = {callback, delay}; return 1; }, cancel: () => {},
  render: ({state}) => states.push(state), navigate: () => assert.fail()
 });
 await c.start();
 assert.deepEqual(states, ['creating', 'waiting', 'expired']);
 assert.equal(deadline.delay, 100);
 assert.equal(replacements, 0);
 now = 120000;
 deadline.callback();
 assert.equal(replacements, 1);
});
