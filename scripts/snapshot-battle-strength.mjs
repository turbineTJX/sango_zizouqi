// Freeze only simulation source and data, never the art workspace.
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=resolve(process.argv[2]);
assert.ok(!existsSync(out),'Use a fresh snapshot directory.');
const paths=readdirSync(root).filter(p=>p.endsWith('.mjs'));
function scan(relative){for(const e of readdirSync(join(root,relative),{withFileTypes:true})){const p=relative+'/'+e.name;if(e.isDirectory())scan(p);else if(/\.(mjs|json)$/.test(p))paths.push(p);}}
scan('data');paths.push('scripts/audit-battle-strength.mjs','package.json');paths.sort();
const sha=b=>createHash('sha256').update(b).digest('hex'),hashes={};
for(const p of paths){const bytes=readFileSync(join(root,p)),dest=join(out,'runtime',p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes);hashes[p]=sha(bytes);}
for(const p of paths)assert.equal(sha(readFileSync(join(root,p))),hashes[p],'Concurrent edit during snapshot: '+p);
const sourceHash=sha(Buffer.from(JSON.stringify(hashes))),rulesVersion=Number(readFileSync(join(root,'combat-rules.mjs'),'utf8').match(/RULES_VERSION\s*=\s*(\d+)/)[1]);
writeFileSync(join(out,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),runtime:join(out,'runtime'),rulesVersion,sourceHash,hashes},null,2));
console.log(JSON.stringify({rulesVersion,files:paths.length,sourceHash,runtime:join(out,'runtime')}));
