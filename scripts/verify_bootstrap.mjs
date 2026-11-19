import {fileURLToPath} from 'node:url';
import {readFile,readdir,lstat} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';
import { CONTRACT } from '../bootstrap/src/rendezvous.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verify(directory,sourceSHA) {
 const manifest=JSON.parse(await readFile(path.join(directory,'build-manifest.json'),'utf8'));
 if(!/^[a-f0-9]{40}$/.test(sourceSHA)||manifest.sourceSHA!==sourceSHA||manifest.product!=='vibecast-tv-bootstrap'||manifest.schema!==1||!['unavailable', CONTRACT].includes(manifest.rendezvous))throw Error('Artifact identity mismatch');
 const expected=[...Object.keys(manifest.files),'build-manifest.json','SHA256SUMS'].sort();
 if(JSON.stringify((await readdir(directory)).sort())!==JSON.stringify(expected))throw Error('Unexpected or missing artifact files');
 const actual={};
 for(const file of expected){if(!/^[a-zA-Z0-9._-]+$/.test(file)||(await lstat(path.join(directory,file))).isSymbolicLink())throw Error('Unsafe artifact member');const bytes=await readFile(path.join(directory,file));if(bytes.length>1048576)throw Error('Oversized artifact');actual[file]=hash(bytes);if(file in manifest.files&&actual[file]!==manifest.files[file])throw Error('Artifact hash mismatch');}
 const sums=Object.entries(actual).filter(([file])=>file!=='SHA256SUMS').sort().map(([file,digest])=>`${digest}  ${file}\n`).join('');
 if(await readFile(path.join(directory,'SHA256SUMS'),'utf8')!==sums)throw Error('Checksum manifest mismatch');
 return manifest;
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){await verify(process.argv[2],process.argv[3]);process.stdout.write('Artifact verification PASS\n');}
