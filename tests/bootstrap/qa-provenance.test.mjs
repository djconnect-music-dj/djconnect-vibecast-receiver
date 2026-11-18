// Disposable Git repositories only; never mutate active checkout/index for tests.
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync,spawnSync} from 'node:child_process';
const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')));
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'vibecast-qa-provenance-'));
 const files={'scripts/qa_source_identity.mjs':await readFile('scripts/qa_source_identity.mjs'),'scripts/build_bootstrap_qa.mjs':'// fixture builder','scripts/verify_bootstrap_qa.mjs':'// fixture verifier','bootstrap/qa/adapter.mjs':'// original fixture','package.json':'{"type":"module"}','package-lock.json':'{}'};
 for(const [name,data]of Object.entries(files)){await mkdir(path.dirname(path.join(root,name)),{recursive:true});await writeFile(path.join(root,name),data);}
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:root,env:cleanEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','--quiet');git('add','.');git('-c','user.name=QA Fixture','-c','user.email=qa@example.invalid','commit','--quiet','-m','Synthetic provenance fixture');
 const run=(code,env={},cwd=root)=>spawnSync(process.execPath,['--input-type=module','-e',`import {fixedSourceIdentity,sourceInventory,gitRead} from ${JSON.stringify(pathToFileURL(path.join(root,'scripts/qa_source_identity.mjs')).href)};${code}`],{cwd,env:{...cleanEnv,...env},encoding:'utf8'});
 return{root,git,run};
}
test('forged Git overrides cannot redirect source identity to a second repository',async()=>{
 const a=await fixture(),b=await fixture();try{
  await writeFile(path.join(b.root,'other'),'separate fixture');b.git('add','other');b.git('-c','user.name=QA Fixture','-c','user.email=qa@example.invalid','commit','--quiet','-m','Other identity');
  const head=a.git('rev-parse','HEAD'),other=b.git('rev-parse','HEAD');assert.notEqual(head,other);
  const env={GIT_DIR:path.join(b.root,'.git'),GIT_WORK_TREE:b.root,GIT_INDEX_FILE:path.join(b.root,'.git','index'),GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'core.worktree',GIT_CONFIG_VALUE_0:b.root};
  const r=a.run('console.log(await fixedSourceIdentity())',env);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),head);
  const forged=a.run(`await fixedSourceIdentity('${other}')`,env);assert.notEqual(forged.status,0);assert.match(forged.stderr,/differs from real HEAD/);
  const counter=spawnSync('git',['rev-parse','HEAD'],{cwd:a.root,env:{...cleanEnv,...env},encoding:'utf8'});assert.equal(counter.status,0);assert.equal(counter.stdout.trim(),other);
 }finally{await rm(a.root,{recursive:true,force:true});await rm(b.root,{recursive:true,force:true});}
});
test('dirty and untracked source fail closed, despite Git status hiding tracked bytes',async()=>{
 const a=await fixture();try{
  const head=a.git('rev-parse','HEAD');let r=a.run(`await sourceInventory(await fixedSourceIdentity('${head}'))`);assert.equal(r.status,0,r.stderr);
  const file='bootstrap/qa/adapter.mjs';await writeFile(path.join(a.root,file),'// changed fixture');
  r=a.run('await fixedSourceIdentity()');assert.notEqual(r.status,0);assert.match(r.stderr,/clean source/);
  a.git('update-index','--assume-unchanged',file);assert.equal(a.git('status','--porcelain'),'');
  r=a.run('await sourceInventory(await fixedSourceIdentity())');assert.notEqual(r.status,0);assert.match(r.stderr,/differs from exact committed source/);
  await writeFile(path.join(a.root,file),'// original fixture');await writeFile(path.join(a.root,'untracked'),'untracked fixture');
  r=a.run('await fixedSourceIdentity()');assert.notEqual(r.status,0);assert.match(r.stderr,/clean source/);
 }finally{await rm(a.root,{recursive:true,force:true});}
});

test('a foreign build working directory cannot borrow the module-root source identity',async()=>{
 const a=await fixture(),b=await fixture();try{
  const head=a.git('rev-parse','HEAD');
  // Previous identity reader bound Git alone; unrelated cwd could supply public bytes.
  const counter=a.run("console.log(gitRead(['rev-parse','HEAD']).toString().trim())",{},b.root);assert.equal(counter.status,0,counter.stderr);assert.equal(counter.stdout.trim(),head);
  const rejected=a.run('await fixedSourceIdentity()',{},b.root);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/must run from its real repository root/);
  const entry=pathToFileURL(path.resolve('scripts/build_bootstrap_qa.mjs')).href;
  const build=spawnSync(process.execPath,['--input-type=module','-e',`import {buildQA} from ${JSON.stringify(entry)};await buildQA();`],{cwd:b.root,env:cleanEnv,encoding:'utf8'});
  assert.notEqual(build.status,0);assert.match(build.stderr,/must run from its real repository root/);
  await assert.rejects(readFile(path.join(b.root,'dist/bootstrap-qa/build-manifest.json')),{code:'ENOENT'});
 }finally{await rm(a.root,{recursive:true,force:true});await rm(b.root,{recursive:true,force:true});}
});

test('Git replacement refs cannot substitute another commit under an approved SHA',async()=>{
 const a=await fixture();try{
  const original=a.git('rev-parse','HEAD'),file='bootstrap/qa/adapter.mjs';
  await writeFile(path.join(a.root,file),'// substituted fixture');a.git('add',file);a.git('-c','user.name=QA Fixture','-c','user.email=qa@example.invalid','commit','--quiet','-m','Replacement fixture');
  const replacement=a.git('rev-parse','HEAD');a.git('reset','--soft',original);a.git('replace',original,replacement);
  assert.equal(a.git('status','--porcelain'),'');assert.equal(a.git('show',original+':'+file),'// substituted fixture');
  const read=a.run(`console.log(gitRead(['show','${original}:${file}']).toString())`);assert.equal(read.status,0,read.stderr);assert.equal(read.stdout.trim(),'// original fixture');
  const rejected=a.run(`await sourceInventory(await fixedSourceIdentity('${original}'))`);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/clean source|differs from exact committed source/);
 }finally{await rm(a.root,{recursive:true,force:true});}
});
