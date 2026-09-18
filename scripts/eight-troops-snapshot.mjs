import {readFileSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
// Historical test fixture only: never imported by the game or used to read saves.
export function materializeEightTroopsSnapshot(){
 const snapshot=JSON.parse(gunzipSync(readFileSync(new URL('../docs/eight-troops-v16/runtime-snapshot.json.gz',import.meta.url))));
 if(snapshot.rulesVersion!==16)throw Error('Expected rule 16 audit snapshot');
 const dir=mkdtempSync(join(tmpdir(),'sango-rule16-audit-'));
 for(const [file,content]of Object.entries(snapshot.files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(file)||file.startsWith('/')||file.split('/').includes('..'))throw Error('Invalid snapshot path');
  if(snapshot.hashes[file]&&createHash('sha256').update(content).digest('hex')!==snapshot.hashes[file])throw Error('Snapshot hash mismatch: '+file);
  const target=join(dir,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);
 }
 return {dir,hashes:snapshot.hashes,rulesVersion:snapshot.rulesVersion};
}
