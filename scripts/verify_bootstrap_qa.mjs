import {readFile,readdir,lstat} from 'node:fs/promises';import {createHash} from 'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {qa,sourcePins,transform} from './build_bootstrap_qa.mjs';
import {fixedSourceIdentity,verifyInventory} from './qa_source_identity.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function verifyQA(directory,sourceSHA){
 await fixedSourceIdentity(sourceSHA);
 const m=JSON.parse(await readFile(path.join(directory,'build-manifest.json'),'utf8'));
 if(!/^[a-f0-9]{40}$/.test(sourceSHA)||m.sourceSHA!==sourceSHA||m.schema!==1||m.product!==qa.product||m.variant!=='QA_ONLY'||m.rendezvous!=='SOURCE_REVIEW_ONLY'||JSON.stringify(m.tuple)!==JSON.stringify(qa)||m.admitted_test_tuple!==null||m.activation_artifact!==null||m.service_qualified!==false||m.native_accepted!==false||JSON.stringify(m.sourcePins)!==JSON.stringify(sourcePins))throw Error('QA artifact identity mismatch');
 const p=m.provenance;
 if(!p||p.sourceSHA!==sourceSHA||p.sourceClean!==true||p.gitEnvironmentOverridesIgnored!==true||p.committedGraphVerified!==true||!p.sourceFiles||!p.installedFiles||Object.keys(p.installedFiles).length===0)throw Error('QA source provenance required');
 await verifyInventory(sourceSHA,p.sourceFiles,p.installedFiles);
 const expected=[...Object.keys(m.files),'build-manifest.json','SHA256SUMS'].sort();
 if(JSON.stringify((await readdir(directory)).sort())!==JSON.stringify(expected))throw Error('QA member mismatch');
 const hashes={};for(const f of expected){if(!/^[a-zA-Z0-9._-]+$/.test(f)||(await lstat(path.join(directory,f))).isSymbolicLink())throw Error('Unsafe QA member');const bytes=await readFile(path.join(directory,f));if(bytes.length>1048576)throw Error('Oversized QA member');hashes[f]=hash(bytes);if(f in m.files&&m.files[f]!==hashes[f])throw Error('QA hash mismatch');}
 if(await readFile(path.join(directory,'SHA256SUMS'),'utf8')!==Object.entries(hashes).filter(([f])=>f!=='SHA256SUMS').sort().map(([f,h])=>`${h}  ${f}\n`).join(''))throw Error('QA checksums mismatch');
 if(await readFile(path.join(directory,'_headers'),'utf8')!==transform('bootstrap/public/_headers',await readFile('bootstrap/public/_headers','utf8')))throw Error('QA policy mismatch');
 return m;
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){await verifyQA(process.argv[2],process.argv[3]);process.stdout.write('QA-only artifact verification PASS\n');}
