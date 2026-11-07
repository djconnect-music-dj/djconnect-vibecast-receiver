import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build as bundle} from 'esbuild';
export const designPin='f32b625eb0a3d1b8abfc2c81378d25d769c6766d';
export async function build(output='dist/bootstrap', sourceSHA=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()) {
 if(!/^[a-f0-9]{40}$/.test(sourceSHA)) throw new Error('Exact source SHA required');
 if(path.resolve(output)===path.resolve('wwwroot') || !path.resolve(output).startsWith(path.resolve('dist')+path.sep)) throw new Error('Output must be an isolated dist subdirectory');
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 const files={};
 for(const directory of ['bootstrap/public','bootstrap/src']) {
  for(const file of (await readdir(directory)).sort()) {
   // The adapter bundle already contains these private implementation modules.
   if(directory==='bootstrap/src' && ['wire.mjs','wire-schema.mjs'].includes(file)) continue;
   if(Object.hasOwn(files,file)) throw new Error('Duplicate output');
   const bytes=file==='rendezvous.mjs' ? Buffer.from((await bundle({entryPoints:[path.join(directory,file)],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,legalComments:'inline'})).outputFiles[0].contents) : await readFile(path.join(directory,file));
   await writeFile(path.join(output,file),bytes);
   files[file]=createHash('sha256').update(bytes).digest('hex');
  }
 }
 const manifest={schema:1,sourceSHA,designPin,product:'vibecast-tv-bootstrap',rendezvous:'unavailable',files:Object.fromEntries(Object.entries(files).sort())};
 const data=JSON.stringify(manifest,null,2)+'\n';
 await writeFile(path.join(output,'build-manifest.json'),data);
 const hashes={...manifest.files,'build-manifest.json':createHash('sha256').update(data).digest('hex')};
 await writeFile(path.join(output,'SHA256SUMS'),Object.entries(hashes).sort().map(([f,h])=>`${h}  ${f}\n`).join(''));
 return manifest;
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)) await build(process.argv[2]);
