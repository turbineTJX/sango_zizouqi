// Compare the actual simulation dependency closure, allowing presentation-only edits.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),frozen=resolve(process.argv[2]||'work/historical-cooperation-final-r128-20261011/runtime'),seen=new Set();
function visit(file){
 file=resolve(root,file);if(seen.has(file))return;seen.add(file);
 const bytes=readFileSync(file),key=relative(root,file);assert.deepEqual(readFileSync(resolve(frozen,key)),bytes,'Simulation source changed: '+key);
 const source=bytes.toString('utf8');for(const m of source.matchAll(/\b(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(resolve(dirname(file),m[1]));
}
visit('engine.mjs');visit('battle-generator.mjs');visit('strategic-campaign.mjs');
const hashes=Object.fromEntries([...seen].sort().map(f=>[relative(root,f).replaceAll('\\','/'),createHash('sha256').update(readFileSync(f)).digest('hex')]));
console.log(JSON.stringify({files:seen.size,simulationHash:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),frozen,verified:true}));
