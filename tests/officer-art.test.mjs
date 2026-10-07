import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pngInfo,promptFor,officerArtRole,officerArtJobs} from '../scripts/officer-art.mjs';
import {artRole,roleSceneBrief} from '../scripts/officer-art-roles.mjs';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {assetURL,sanitizeOfficerArt,art} from '../art-assets.mjs';
import {workArtScene,reportArtScene,activityArtScene,OFFICER_ART_KEYS,OFFICER_ART_SCENES,OFFICER_ART_FORMAT_VERSION} from '../officer-art-scenes.mjs';
const own=(id,scene)=>`./assets/officers/generated/v3/${id}/${scene}.png`;
const local='/local-art/files/'+'b'.repeat(24)+'.png';
test('art role follows recorded biography direction and cannot change with stats or combat troop type',()=>{
 assert.equal(officerArtRole('person-1').primary,'martial');
 assert.deepEqual(officerArtRole('person-1').secondary,['commander']);
 assert.equal(officerArtRole('person-4').primary,'martial');
 for(const id of ['person-2','person-3','person-5','person-6'])assert.equal(officerArtRole(id).primary,'civil');
 for(const id of ['person-1','person-2'])for(const scene of OFFICER_ART_KEYS){
  const officer=OFFICER_BY_ID[id];
  assert.equal(promptFor({...officer,force:0,intellect:100,type:'cavalry'},scene),promptFor({...officer,force:100,intellect:0,type:'spear'},scene));
 }
 assert.notEqual(roleSceneBrief(officerArtRole('person-1'),'domestic'),roleSceneBrief(officerArtRole('person-2'),'domestic'));
 assert.notEqual(roleSceneBrief(officerArtRole('person-1'),'battle'),roleSceneBrief(officerArtRole('person-2'),'battle'));
});
test('unclassified officers have blocked tasks instead of a stat-derived generic prompt',async()=>{
 const officer=OFFICER_CATALOG.find(o=>!officerArtRole(o.id));assert.ok(officer);
 assert.throws(()=>promptFor({...officer,intellect:100,force:0},'portrait'),/先依据身份和传记/);
 const jobs=await officerArtJobs([officer.id]);assert.equal(jobs.length,OFFICER_ART_KEYS.length);
 for(const job of jobs){assert.equal(job.status,'blocked-role');assert.equal(job.roleNeedsReview,true);assert.equal(job.role,null);assert.equal(job.prompt,null);}
});
test('incomplete or unknown art classifications cannot enter production',()=>{
 assert.equal(artRole({identity:'unclassified',type:'spear',force:100,intellect:0}),null);
 for(const role of [{primary:'spear',secondary:[],evidence:'biography',bearing:'military'},{primary:'martial',secondary:[],evidence:'',bearing:'military'},{primary:'civil',secondary:['unknown'],evidence:'biography',bearing:'scholar'}])assert.throws(()=>artRole({role}));
 assert.throws(()=>roleSceneBrief(officerArtRole('person-1'),'unknown'));
});
test('own assets are limited to the same officer and known scene, no arbitrary paths',()=>{
 for(const path of ['file:///C:/secret.png','./assets/officers/generated/v1/cao/../../secret.png','./assets/officers/generated/v1/cao/private.png','https://x/assets/officers/generated/v1/cao/detail.png'])assert.equal(assetURL(path),null);
 const result=sanitizeOfficerArt({version:1,id:'original-officers',officers:{cao:{detail:{url:own('cao','detail')},battle:{url:own('person-99','battle')},report:{url:local}}}});
 assert.equal(result.cao.detail.url,own('cao','detail'));assert.equal(result.cao.battle,undefined);assert.equal(result.cao.report,undefined);
});
test('scene priority keeps original identity on missing/failed scene and honours the switch',()=>{
 const saved={officers:art.officers,pack:art.pack,enabled:art.enabled,failed:art.failed};
 try{
  art.officers=sanitizeOfficerArt({version:1,id:'original-officers',officers:{cao:{portrait:{url:own('cao','portrait'),width:1024,height:1024},detail:{url:own('cao','detail')},battle:{url:own('cao','battle'),width:2048,height:1152,fit:'contain'}}}});art.pack={id:'local',portraits:{cao:local}};art.enabled=true;art.failed=new Set();
  assert.equal(art.portraitURL('cao','battle'),own('cao','battle'));assert.equal(art.portraitURL('cao','travel'),own('cao','portrait'));assert.equal(art.portraitURL('cao','roster'),own('cao','portrait'));
  assert.equal(art.resolvePortrait('cao','battle').fit,'contain');assert.equal(art.resolvePortrait('cao','battle').width,2048);
  art.failed.add(own('cao','battle'));assert.equal(art.portraitURL('cao','battle'),own('cao','portrait'));art.failed.add(own('cao','portrait'));assert.equal(art.portraitURL('cao','battle'),own('cao','detail'));art.failed.add(own('cao','detail'));assert.equal(art.portraitURL('cao','battle'),local);
  art.enabled=false;assert.equal(art.portraitURL('cao'),null);
 }finally{Object.assign(art,saved);}
});
test('scene selection follows actual work and outcomes, never guesses an officer',()=>{
 assert.equal(workArtScene({kind:'build',buildingKey:'barracks'}),'inspection');
 assert.equal(workArtScene({kind:'recruit'}),'training');assert.equal(workArtScene({kind:'research'}),'domestic');
 assert.equal(reportArtScene({phase:'complete'}),'report');assert.equal(reportArtScene({phase:'CAPTIVE'}),'report-concern');
 assert.equal(reportArtScene({category:'battle',phase:'settled',faction:'cao',result:{winner:'yuan'}}),'report-concern');
 assert.equal(reportArtScene({category:'battle',phase:'settled',faction:'cao',result:{winner:null}}),'report');
 assert.equal(reportArtScene({category:'occupation',phase:'lost'}),'report-concern');
 assert.equal(activityArtScene({code:'mission',fromId:'a',toId:'b'}),'travel');assert.equal(activityArtScene({code:'mission'}),'diplomacy');
 assert.equal(activityArtScene({code:'dead'}),'detail');assert.equal(activityArtScene({code:'absent'}),'detail');
});
test('approved originals have valid frames, full alpha standees, exact file hashes and current identities',async()=>{
 const receipts=JSON.parse(await readFile(new URL('../assets/officers/receipts.json',import.meta.url),'utf8'));
 const manifest=JSON.parse(await readFile(new URL('../assets/officers/manifest.json',import.meta.url),'utf8'));
 const identities=JSON.parse(await readFile(new URL('../assets/officers/identities.json',import.meta.url),'utf8'));
 assert.equal(manifest.formatVersion,OFFICER_ART_FORMAT_VERSION);const hashes=new Set();
 for(const [id,scenes] of Object.entries(manifest.officers)){
  const keys=Object.keys(scenes);assert.ok(keys.every(s=>OFFICER_ART_KEYS.includes(s)));assert.ok(scenes.portrait);
  const sizes=new Set();for(const scene of keys){const receipt=receipts[id][scene],entry=scenes[scene];assert.ok(receipt.approved);assert.equal(receipt.masterSha256,identities[id].sha256);assert.equal(receipt.sha256,entry.sha256);assert.equal(receipt.formatVersion,OFFICER_ART_FORMAT_VERSION);const bytes=await readFile(new URL('../'+entry.url,import.meta.url)),info=pngInfo(bytes,scene);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(info.width,entry.width);assert.equal(info.height,entry.height);hashes.add(entry.sha256);sizes.add(entry.width+':'+entry.height);if(scene==='detail'){assert.ok(info.transparentFraction>.05);const opaque=Buffer.from(bytes);opaque[25]=2;assert.throws(()=>pngInfo(opaque,'detail'),/RGBA/);}}
  if(keys.length===OFFICER_ART_KEYS.length)assert.ok(sizes.size>=7,'not a uniform portrait batch');
  const portrait=await readFile(new URL('../'+manifest.officers[id].portrait.url,import.meta.url));assert.throws(()=>pngInfo(portrait,'battle'),/画幅不符/);
 }
 assert.equal(hashes.size,Object.values(manifest.officers).reduce((n,s)=>n+Object.keys(s).length,0),'distinct originals, not repeated files');
});
