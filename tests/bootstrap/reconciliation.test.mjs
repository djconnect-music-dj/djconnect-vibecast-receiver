import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {guardRecovery,recovery} from '../../scripts/reconcile_initial_binding.mjs';
const raw=await readFile(new URL('./fixtures/failed-domain-38933359799.json',import.meta.url));
const run={id:Number(recovery.runID),repository:{id:1324916521,full_name:'pcvantol/djconnect-vibecast-receiver'},head_sha:recovery.sourceSHA,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/bootstrap-publish.yml',status:'completed',conclusion:'failure'};
test('recovery accepts only exact measured failed-run receipt and trusted provenance',()=>{
 assert.equal(guardRecovery(run,raw).createdRecordID,recovery.recordID);
 for(const change of [{id:1},{head_sha:'a'.repeat(40)},{head_branch:'feature'},{event:'pull_request'},{path:'.github/workflows/ci.yml'},{status:'in_progress'},{conclusion:'success'},{repository:{id:1324916521,full_name:'other/repo'}},{repository:{...run.repository,id:1}}])assert.throws(()=>guardRecovery({...run,...change},raw));
 const changed=JSON.parse(raw);changed.createdRecordID='foreign';assert.throws(()=>guardRecovery(run,JSON.stringify(changed)));
 assert.throws(()=>guardRecovery(run,Buffer.concat([raw,Buffer.from('\n')])));
});

test('second measured failed mutation has a separate immutable pin; arbitrary selectors fail',async()=>{
 const {recoveries}=await import('../../scripts/reconcile_initial_binding.mjs');
 const pin=recoveries['restore-run38934680867'];
 const raw=await readFile(new URL('./fixtures/failed-domain-38934680867.json',import.meta.url));
 const original={...run,id:Number(pin.runID),head_sha:pin.sourceSHA};
 assert.equal(guardRecovery(original,raw,pin).createdRecordID,pin.recordID);
 assert.throws(()=>guardRecovery(original,raw));
 assert.throws(()=>guardRecovery(original,raw,{...pin}));
});
