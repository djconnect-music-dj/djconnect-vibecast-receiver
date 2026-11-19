import test from 'node:test';import assert from 'node:assert/strict';
import {checkedOrigin,waitReadback} from '../../scripts/wait_bootstrap.mjs';
test('wait wrapper accepts only fixed root or immutable HTTPS deployment, never mutable branch alias',()=>{
 assert.equal(checkedOrigin('https://vibecast.tv'),'https://vibecast.tv');assert.equal(checkedOrigin('https://f09a41b5.vibecast-tv-bootstrap.pages.dev'),'https://f09a41b5.vibecast-tv-bootstrap.pages.dev');
 for(const origin of ['http://vibecast.tv','https://main.vibecast-tv-bootstrap.pages.dev','https://vibecast.tv.evil.example','https://user@vibecast.tv','https://vibecast.tv/path','https://vibecast.tv/?url=other','https://vibecast.tv/#token'])assert.throws(()=>checkedOrigin(origin));
});
test('transient propagation re-runs full verifier, exhausted verification never becomes PASS',async()=>{
 let calls=0,waits=0;
 const result=await waitReadback('synthetic','https://f09a41b5.vibecast-tv-bootstrap.pages.dev',{attempts:3,read:async()=>{if(++calls===1)throw Error('HTTP404');return {outcome:'PASS'};},wait:async()=>{waits++;}});
 assert.equal(result.attempt,2);assert.equal(calls,2);assert.equal(waits,1);
 calls=0;await assert.rejects(waitReadback('synthetic','https://vibecast.tv',{attempts:3,read:async()=>{calls++;throw Error('hash mismatch');},wait:async()=>{}}),/did not complete/);assert.equal(calls,3);
});
