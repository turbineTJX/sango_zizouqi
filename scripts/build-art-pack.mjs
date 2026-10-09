import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync} from 'fflate';
import {validateAssetPack} from './asset-pack.mjs';
import {archiveDigest,validateArchiveEntries} from '../asset-archive.mjs';
import {ASSET_ROOT,PROJECT_ROOT} from '../asset-workspace.mjs';
import {sanitizeOfficerArt} from '../art-assets.mjs';

export async function buildArtArchive(destination,root=ASSET_ROOT){
 const pack=await validateAssetPack(root),entries={},files=[];
 entries['manifest.json']=Buffer.from(JSON.stringify(pack.catalog));
 const officers=pack.officers?{version:1,id:'original-officers',officers:sanitizeOfficerArt(pack.officers)}:null;
 if(officers)for(const [id,scenes] of Object.entries(officers.officers))for(const [scene,entry] of Object.entries(scenes))entry.sha256=pack.officers.officers[id][scene].sha256;
 for(const [url,path] of pack.files)entries[url.slice('./assets/'.length)]=url===pack.catalog.officers?Buffer.from(JSON.stringify(officers)):await readFile(path);
 for(const path of Object.keys(entries).sort())files.push({path,bytes:entries[path].length,sha256:archiveDigest(entries[path])});
 const index={formatVersion:1,id:pack.catalog.id,revision:pack.catalog.revision,files};
 entries['pack-index.json']=Buffer.from(JSON.stringify(index));validateArchiveEntries(entries);
 // Already compressed images are stored; only JSON/SVG/text receives compression.
 const zipped=Object.fromEntries(Object.entries(entries).map(([path,bytes])=>[path,[bytes,{level:/\.(json|svg|obj)$/.test(path)?6:0}]]));
 const bytes=zipSync(zipped);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);
 return {...index,bytes:bytes.length,sha256:archiveDigest(bytes)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const destination=resolve(process.argv[2]||resolve(PROJECT_ROOT,'dist','art-'+Date.now(),'art.pack'));
 console.log(JSON.stringify({path:destination,...await buildArtArchive(destination)},null,2));
}
