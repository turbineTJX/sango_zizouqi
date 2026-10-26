import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd(),out=resolve(process.argv[2]||'work/current-validation');
assert.ok(relative(root,out)&&!relative(root,out).startsWith('..'),'Use an output directory within the project');
assert.ok(!existsSync(out),'A validation snapshot is immutable; choose a fresh directory');
const files=readdirSync(root).filter(p=>p.endsWith('.mjs'));
function scan(folder){for(const entry of readdirSync(join(root,folder),{withFileTypes:true})){const path=folder+'/'+entry.name;if(entry.isDirectory())scan(path);else if(/\.(mjs|json)$/.test(path))files.push(path);}}
scan('data');scan('scripts');files.push('package.json');files.sort();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),hashes={};
for(const path of files){const bytes=readFileSync(join(root,path)),target=join(out,'runtime',path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);hashes[path]=sha(bytes);}
for(const path of files)assert.equal(sha(readFileSync(join(root,path))),hashes[path],'Concurrent source change: '+path);
const rulesVersion=Number(readFileSync(join(root,'combat-rules.mjs'),'utf8').match(/RULES_VERSION\s*=\s*(\d+)/)[1]);
const manifest={createdAt:new Date().toISOString(),runtime:join(out,'runtime'),rulesVersion,sourceHash:sha(JSON.stringify(hashes)),hashes};
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({runtime:manifest.runtime,rulesVersion,sourceHash:manifest.sourceHash,files:files.length}));
