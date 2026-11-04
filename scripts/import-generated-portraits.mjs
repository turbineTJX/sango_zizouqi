import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadLocalArt} from '../local-art-server.mjs';
import {infinityGenericPortraitFiles} from './infinity-portraits.mjs';
import {exportPlaytestArt} from './export-playtest-art.mjs';

// Add the requested pool without rebuilding or replacing unrelated local art.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'.local/art');
const infinity=process.argv[2]||JSON.parse(await readFile(resolve(root,'art.local.json'),'utf8')).infinity;
const manifest=await loadLocalArt(root);if(!manifest)throw Error('Import the reference artwork first');
const generic=await infinityGenericPortraitFiles(infinity,resolve(out,'infinity-faces'));
if(generic.missing.length||!generic.portraits.male.length||!generic.portraits.female.length)throw Error('Generic portraits missing: '+generic.missing.join(','));
const portraits={male:[],female:[]};manifest.sources??={};
for(const [sex,entries]of Object.entries(generic.portraits))for(const {file}of entries){
 const bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex'),id=sha256.slice(0,24)+extname(file).toLowerCase();
 manifest.files[id]=file;manifest.sources[id]={source:'infinity/generic-portraits',sha256,bytes:bytes.length,localOnly:true};portraits[sex].push('/local-art/files/'+id);
}
manifest.public.generatedPortraits=portraits;
await mkdir(out,{recursive:true});await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const exported=await exportPlaytestArt(root);
console.log(JSON.stringify({male:portraits.male.length,female:portraits.female.length,...exported},null,2));
