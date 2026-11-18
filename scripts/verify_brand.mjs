import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyBrand() {
 const pin=JSON.parse(await readFile('bootstrap/brand-assets.json','utf8'));
 if(pin.producer!=='pcvantol/djconnect'||pin.sourceSHA!=='97a20fa17d60aa32cf92dc106707d70540ee479e'||pin.finalizationSHA!=='e390c5a81e2d2d272a46cc720c83cc4667c355c1')throw Error('Unqualified brand producer');
 const raw=await readFile(pin.manifest);
 if(sha(raw)!==pin.manifestSHA256||pin.manifestSHA256!=='3fbdfe2a3ae326900a721c6bca1ebfd95c3f4a19d48c938efb86b0fad4cef56f')throw Error('Brand manifest mismatch');
 const manifest=JSON.parse(raw);
 for(const [local,source] of Object.entries(pin.assets)) {
  const expected=manifest.files[source],bytes=await readFile(local);
  if(!expected||sha(bytes)!==expected.sha256||bytes.length!==expected.bytes)throw Error('Brand asset differs from protected producer');
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==expected.width||bytes.readUInt32BE(20)!==expected.height||bytes[25]!==6)throw Error('Expected canonical RGBA PNG');
 }
 return pin;
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){await verifyBrand();process.stdout.write('Protected Core brand assets PASS\n');}
