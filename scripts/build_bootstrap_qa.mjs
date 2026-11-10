// Closed source-only QA derivation, never an execution/deployment admission.
import {readFile,writeFile,mkdir,readdir,rm,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fixedSourceIdentity,sourceInventory,verifyInventory,inputBytes,sha256} from './qa_source_identity.mjs';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {build as bundle} from 'esbuild';
export const qa=Object.freeze({product:'vibecast-tv-bootstrap-qa',browser:'https://qa.vibecast.tv',service:'https://api-vibecast-qa.djconnect.dev',worker:'djconnect-api-vibecast-qa'});
export const sourcePins=Object.freeze({
 'bootstrap/src/wire.mjs':'2b89c5a139c02a5267cf2f68cff9c14f1e656ccad6e5ea453449c5bc7d79ec33',
 'bootstrap/src/wire-schema.mjs':'01272335b2b4d5c3ee43b98fae4dfd147bbe971307a88a447580c5a73b5a7700',
 'bootstrap/src/app.mjs':'db79f38c3b7e87d9294fa956d63b5a5eed4b2012d9c39c7bf4229df52bd75371',
 'bootstrap/public/_headers':'03dcc81641810e473b6e7dccda1011ff91a80a3be7b9155e6cf76bd7efb80930'
});
const hash=x=>createHash('sha256').update(x).digest('hex');
export function replaceOnce(source,needle,replacement){if(source.split(needle).length!==2)throw Error('QA transform count drift');return source.replace(needle,replacement);}
export function transform(file,source){
 if(hash(source)!==sourcePins[file])throw Error('QA protected input drift: '+file);
 if(file==='bootstrap/src/wire.mjs')return replaceOnce(source,"ORIGIN='https://vibecast.tv', SERVICE='https://api.djconnect.dev'",`ORIGIN='${qa.browser}', SERVICE='${qa.service}'`);
 if(file==='bootstrap/src/wire-schema.mjs')return replaceOnce(source,'"const": "https://api.djconnect.dev"',`"const": "${qa.service}"`);
 if(file==='bootstrap/public/_headers')return replaceOnce(source,"connect-src https://api.djconnect.dev",`connect-src ${qa.service}`);
 if(file==='bootstrap/src/app.mjs'){
  const entry=replaceOnce(source,"import { createRendezvousAdapter } from './rendezvous.mjs';","import {createQAAdapter,QA_BROWSER} from '../qa/adapter.mjs';");
  return replaceOnce(replaceOnce(entry,"const productionOrigin = 'https://vibecast.tv';","const productionOrigin = QA_BROWSER;"),
   'createRendezvousAdapter() : unavailableAdapter','createQAAdapter() : unavailableAdapter');
 }
 throw Error('Unknown QA transform');
}
export async function buildQA(expectedSourceSHA){
 const sourceSHA=await fixedSourceIdentity(expectedSourceSHA),sourceFiles=await sourceInventory(sourceSHA);
 const packageBytes=await inputBytes('package.json');
 if(sha256(packageBytes)!==sourceFiles['package.json'])throw Error('QA package version differs from committed source');
 const {version}=JSON.parse(packageBytes);
 if(typeof version!=='string'||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version))throw Error('Invalid bootstrap version');
 const output='dist/bootstrap-qa';
 // Check all fixed transforms before any output mutation. No caller-supplied paths/origins.
 const inputs={};for(const file of Object.keys(sourcePins))inputs[file]=transform(file,await readFile(file,'utf8'));
 const installedFiles={};
 const plugin={name:'closed-qa-graph',setup(b){
  b.onLoad({filter:/[\\/]bootstrap[\\/]src[\\/](wire|wire-schema|app)\.mjs$/},async args=>({contents:inputs[path.relative(process.cwd(),args.path).split(path.sep).join('/')],loader:'js',resolveDir:path.dirname(args.path)}));
  b.onResolve({filter:/\.\.\/qa\/adapter\.mjs$/},()=>({path:'./qa-adapter.mjs',external:true}));
  b.onLoad({filter:/\.(?:m?js|cjs|json)$/},async args=>{
   const name=path.relative(process.cwd(),args.path).split(path.sep).join('/'),bytes=await inputBytes(name),digest=sha256(bytes);
   if(name.startsWith('node_modules/')){if(Object.hasOwn(installedFiles,name)&&installedFiles[name]!==digest)throw Error('QA installed input changed during build');installedFiles[name]=digest;}
   else if(sourceFiles[name]!==digest)throw Error('Uncommitted QA module input');
   return {contents:bytes.toString(),loader:name.endsWith('.json')?'json':'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const options={bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,metafile:true,legalComments:'inline',plugins:[plugin]};
 const adapterBuild=await bundle({...options,entryPoints:['bootstrap/qa/adapter.mjs']});
 const appBuild=await bundle({...options,entryPoints:['bootstrap/src/app.mjs']});
 const adapter=adapterBuild.outputFiles[0].contents,app=appBuild.outputFiles[0].contents;
 for(const name of [...new Set([...Object.keys(adapterBuild.metafile.inputs),...Object.keys(appBuild.metafile.inputs)])].sort()){
  if(name.startsWith('node_modules/')){if(!Object.hasOwn(installedFiles,name)||installedFiles[name]!==sha256(await inputBytes(name)))throw Error('QA installed graph input drift');}
  else if(!Object.hasOwn(sourceFiles,name))throw Error('Uncommitted QA module graph input: '+name);
 }
 await verifyInventory(sourceSHA,sourceFiles,installedFiles);
 // Refuse symlink destinations/parents instead of following an unrelated tree.
 for(const dir of ['dist',output]){try{if((await lstat(dir)).isSymbolicLink())throw Error('Unsafe QA output');}catch(e){if(e.code!=='ENOENT')throw e;}}
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});const files={};
 async function put(file,bytes){await writeFile(path.join(output,file),bytes);files[file]=hash(bytes);}
 for(const file of (await readdir('bootstrap/public')).sort()){
  if(file==='app.mjs'||file==='qa-adapter.mjs')throw Error('QA output collision');
  if((await lstat('bootstrap/public/'+file)).isSymbolicLink())throw Error('Unsafe QA input');
  let bytes=await inputBytes('bootstrap/public/'+file);
  if(sha256(bytes)!==sourceFiles['bootstrap/public/'+file])throw Error('QA public input differs from committed source');
  if(file==='_headers')bytes=Buffer.from(inputs['bootstrap/public/_headers']);
  if(file==='index.html'){
   const html=replaceOnce(bytes.toString(),'<body>','<body><aside role="note">VibeCast QA — afzonderlijke testbuild, geen productieverbinding.</aside>');
   bytes=Buffer.from(replaceOnce(html,'<!--build-version-->',`${version} (${sourceSHA.slice(0,8)})`));
  }
  await put(file,bytes);
 }
 await put('app.mjs',app);await put('qa-adapter.mjs',adapter);
 await verifyInventory(sourceSHA,sourceFiles,installedFiles);
 const provenance={sourceSHA,sourceClean:true,gitEnvironmentOverridesIgnored:true,committedGraphVerified:true,sourceFiles,installedFiles:Object.fromEntries(Object.entries(installedFiles).sort())};
 const manifest={schema:1,sourceSHA,provenance,product:qa.product,variant:'QA_ONLY',rendezvous:'SOURCE_REVIEW_ONLY',tuple:qa,admitted_test_tuple:null,activation_artifact:null,service_qualified:false,native_accepted:false,sourcePins,files:Object.fromEntries(Object.entries(files).sort())};
 const data=JSON.stringify(manifest,null,2)+'\n';await writeFile(output+'/build-manifest.json',data);
 const hashes={...manifest.files,'build-manifest.json':hash(data)};await writeFile(output+'/SHA256SUMS',Object.entries(hashes).sort().map(([f,h])=>`${h}  ${f}\n`).join(''));return manifest;
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){if(process.argv.length!==2)throw Error('QA build takes no configuration');await buildQA();}
