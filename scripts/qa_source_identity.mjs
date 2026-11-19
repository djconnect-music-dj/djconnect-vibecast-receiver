// Exact local clean-source binding; Git environment overrides are never authority.
import {execFileSync} from 'node:child_process';import {readFile,realpath,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';
export const repositoryRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env=()=>Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')));
export const sha256=x=>createHash('sha256').update(x).digest('hex');
export function gitRead(args){return execFileSync('git',['--no-replace-objects','--no-optional-locks',...args],{cwd:repositoryRoot,env:env(),maxBuffer:32*1024*1024});}
export async function fixedSourceIdentity(expected){
 const root=await realpath(repositoryRoot);
 if(await realpath(process.cwd())!==root)throw Error('QA must run from its real repository root');
 if(await realpath(gitRead(['rev-parse','--show-toplevel']).toString().trim())!==root)throw Error('QA real worktree required');
 if(gitRead(['rev-parse','--is-inside-work-tree']).toString().trim()!=='true')throw Error('QA real worktree required');
 const head=gitRead(['rev-parse','--verify','HEAD^{commit}']).toString().trim();
 if(!/^[a-f0-9]{40}$/.test(head)||(expected!==undefined&&expected!==head))throw Error('QA claimed SHA differs from real HEAD');
 if(gitRead(['status','--porcelain=v1','--untracked-files=normal']).length)throw Error('QA clean source required');
 return head;
}
export async function inputBytes(name){
 if(!/^[a-zA-Z0-9._/-]+$/.test(name)||name.split('/').includes('..')||path.isAbsolute(name))throw Error('Unsafe QA source path');
 const root=await realpath(repositoryRoot),file=path.join(root,name);
 if((await lstat(file)).isSymbolicLink()||await realpath(file)!==file)throw Error('Unsafe QA source path');
 return readFile(file);
}
export async function sourceInventory(head){
 const names=gitRead(['ls-tree','-r','--name-only','-z',head,'--','bootstrap','scripts/build_bootstrap_qa.mjs','scripts/verify_bootstrap_qa.mjs','scripts/qa_source_identity.mjs','package.json','package-lock.json']).toString().split('\0').filter(Boolean).sort();
 const hashes={};for(const name of names){const actual=await inputBytes(name);if(!actual.equals(gitRead(['show',head+':'+name])))throw Error('QA input differs from exact committed source: '+name);hashes[name]=sha256(actual);}
 for(const required of ['bootstrap/qa/adapter.mjs','scripts/build_bootstrap_qa.mjs','scripts/verify_bootstrap_qa.mjs','scripts/qa_source_identity.mjs','package.json','package-lock.json'])if(!Object.hasOwn(hashes,required))throw Error('QA source closure missing');
 return hashes;
}
export async function verifyInventory(head,sourceFiles,installedFiles){
 if(await fixedSourceIdentity(head)!==head||JSON.stringify(await sourceInventory(head))!==JSON.stringify(sourceFiles))throw Error('QA committed source inventory mismatch');
 for(const [name,hash] of Object.entries(installedFiles)){if(!name.startsWith('node_modules/')||sha256(await inputBytes(name))!==hash)throw Error('QA installed graph drift');}
}
