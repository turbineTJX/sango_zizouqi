import {mkdir,readdir,readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.'),destination=resolve(process.argv[2]||'work/economy-balanced-20261011-v1/runtime');
try{await access(join(destination,'runtime-manifest.json'));throw Error('Use a fresh snapshot path; existing audit inputs must remain immutable');}catch(error){if(error.code!=='ENOENT')throw error;}
const files=(await readdir(root)).filter(f=>f.endsWith('.mjs'));files.push('package.json');
async function walk(directory){for(const e of await readdir(join(root,directory),{withFileTypes:true})){const file=join(directory,e.name);if(e.isDirectory())await walk(file);else if(/\.(mjs|json)$/.test(file))files.push(file);}}
await walk('data');const sources={};
for(const file of files){const target=join(destination,file);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,file),target);sources[file]=createHash('sha256').update(await readFile(target)).digest('hex');}
await writeFile(join(destination,'runtime-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),runtimeDirectory:destination,sources,scope:'Immutable program and design-data snapshot only; no art, saves or injected campaign resources.'},null,2));
console.log(JSON.stringify({runtime:destination,files:files.length}));
