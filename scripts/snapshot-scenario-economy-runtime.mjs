import {readdir,readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const name=process.argv.slice(2).find(a=>a.startsWith('--name='))?.slice(7)||'runtime-'+new Date().toISOString().replace(/[^0-9]/g,'');
assert.ok(/^[a-z0-9-]+$/.test(name),'Snapshot name must be lowercase letters, digits or hyphens');
const manifestName=process.argv.slice(2).find(a=>a.startsWith('--manifest-name='))?.slice(16)||'runtime-manifest.json';
assert.ok(/^[a-z0-9-]+\.json$/.test(manifestName),'Manifest name must be a local JSON filename');
const root=resolve('.'),base=resolve(root,'outputs/scenario-economy'),target=resolve(base,name);
assert.ok(relative(root,target)&&!relative(root,target).startsWith('..'));
await mkdir(base,{recursive:true});await mkdir(target); // Never overwrite an audited runtime.
await mkdir(join(base,'baseline'),{recursive:true});
for(const name of await readdir(base))if(/-(360|180)(-failed-save)?\.json$/.test(name))await copyFile(join(base,name),join(base,'baseline',name));
await mkdir(join(base,'baseline/warfare'),{recursive:true});
for(const name of await readdir(join(base,'warfare')))if(/-180\.json$/.test(name))await copyFile(join(base,'warfare',name),join(base,'baseline/warfare',name));
const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));
async function walk(folder){for(const e of await readdir(join(root,folder),{withFileTypes:true})){const p=join(folder,e.name);if(e.isDirectory())await walk(p);else if(/\.(mjs|json)$/.test(e.name))files.push(p);}}
await walk('data');await walk('scripts');
files.push('package.json');
const sources={};
// Store exactly the bytes used by the audit; concurrent workspace edits cannot
// change imported modules halfway through a multi-scenario run.
for(const file of files){const data=await readFile(join(root,file));sources[file.replaceAll('\\','/')]=createHash('sha256').update(data).digest('hex');await mkdir(dirname(join(target,file)),{recursive:true});await writeFile(join(target,file),data);}
const changed=[];for(const [file,hash] of Object.entries(sources))if(createHash('sha256').update(await readFile(join(root,file))).digest('hex')!==hash)changed.push(file);
assert.equal(changed.length,0,'Source changed during snapshot creation: '+changed.join(', '));
await writeFile(join(base,manifestName),JSON.stringify({createdAt:new Date().toISOString(),runtimeDirectory:relative(root,target).replaceAll('\\','/'),sources},null,2));
console.log(JSON.stringify({runtime:target,manifest:join(base,manifestName),files:files.length}));
