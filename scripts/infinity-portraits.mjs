import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {unzipSync} from 'fflate';

// Match the reference game's LoadHeadIcon: source person ID -> headIconID -> Face.
// Display names cannot identify homonymous officers or spelling variants.
async function infinityFaceFiles(infinity,cache,heads){
 const files=new Map(),pending=new Map();
 for(const head of new Set(heads)){
  const name=head+'_1.png';let file;
  for(const directory of ['Project/Assets/Mods/Content/Assets/Face','Build/Mods/Face/Assets/Face','Build/Content/Assets/Face']){
   const path=resolve(infinity,directory,name);
   try{await readFile(path);file=path;break;}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  if(file)files.set(head,file);
  else pending.set(name,head);
 }
 // Some local checkouts omit Face even though the original download includes it.
 // Recover only exact portrait entries, never arbitrary archive paths.
 if(pending.size){
  const archive=resolve(infinity,'..',basename(infinity)+'.zip');let bytes;
  try{bytes=await readFile(archive);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(bytes){
   const prefix=basename(infinity)+'/Project/Assets/Mods/Content/Assets/Face/';
   const entries=unzipSync(bytes,{filter:entry=>entry.name.startsWith(prefix)&&pending.has(entry.name.slice(prefix.length))});
   await mkdir(cache,{recursive:true});
   for(const [name,head] of pending){
    const data=entries[prefix+name];if(!data)continue;
    const file=resolve(cache,name);await writeFile(file,data);
    files.set(head,file);
   }
  }
 }
 return files;
}
export async function infinityPortraitFiles(infinity,cache,officers){
 const library=JSON.parse(await readFile(resolve(infinity,'Build/Content/Data/Common/PersonLibrary.json'),'utf8')).PersonLibrary;
 const common=officers.filter(o=>o.sourceKind==='common'),heads=new Map();
 for(const officer of common){const person=library[officer.sourceId],head=person?.headIconID;if(person?.Id===officer.sourceId&&Number.isInteger(head)&&head>=0)heads.set(officer.id,head);}
 const files=await infinityFaceFiles(infinity,cache,heads.values()),portraits={},missing=[];
 for(const officer of common){const file=files.get(heads.get(officer.id));if(file)portraits[officer.id]=file;else missing.push(officer.id);}
 return {portraits,missing};
}

// These ranges are explicitly designated as generic custom faces by the source.
// Never draw a random officer's face from the named public officer library.
export async function infinityGenericPortraitFiles(infinity,cache){
 const config=JSON.parse(await readFile(resolve(infinity,'Build/Content/Data/FaceConfig.json'),'utf8')),heads={male:[],female:[]};
 for(const range of config.HeadIdRanges||[]){
  if(![0,1].includes(range.sexType)||!Number.isSafeInteger(range.startId)||range.startId<0||!Number.isSafeInteger(range.endId)||range.endId<range.startId||range.endId-range.startId>=1000)throw Error('Invalid generic face range');
  const sex=range.sexType===1?'female':'male';for(let id=range.startId;id<=range.endId;id++)heads[sex].push(id);
 }
 for(const sex of Object.keys(heads))heads[sex]=[...new Set(heads[sex])].sort((a,b)=>a-b);
 const files=await infinityFaceFiles(infinity,cache,[...heads.male,...heads.female]),portraits={male:[],female:[]},missing=[];
 for(const [sex,ids] of Object.entries(heads))for(const headId of ids){const file=files.get(headId);if(file)portraits[sex].push({headId,file});else missing.push(headId);}
 return {portraits,missing};
}
