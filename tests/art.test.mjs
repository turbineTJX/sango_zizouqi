import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {art,assetURL,sanitizePack,sampleCurve} from '../art-assets.mjs';
import {serveLocalArt,loadLocalArt} from '../local-art-server.mjs';
test('asset manifest accepts only local opaque asset URLs and valid sprite grids',()=>{
 const url='/local-art/files/'+'a'.repeat(24)+'.png';assert.equal(assetURL(url),url);
 for(const bad of ['https://example.com/a.png','javascript:alert(1)','/local-art/files/../../secret','file:///C:/secret'])assert.equal(assetURL(bad),null);
 const pack=sanitizePack({version:1,id:'test',portraits:{cao:url,dun:'https://x'},troops:{spear:{idle:{url,rows:4,columns:4,frames:4,duration:1},attack:{url,rows:4,columns:0,frames:4,duration:1}}}});
 assert.equal(pack.portraits.cao,url);assert.equal(pack.portraits.dun,undefined);assert.ok(pack.troops.spear.idle);assert.equal(pack.troops.spear.attack,undefined);
});
test('Unity root movement preserves its Hermite curve and endpoints',()=>{
 const keys=[{time:0,value:{y:0},outSlope:{y:0},inSlope:{y:0}},{time:1,value:{y:1},outSlope:{y:0},inSlope:{y:0}}];assert.equal(sampleCurve(keys,.5),.5);assert.equal(sampleCurve(keys,-1),0);assert.equal(sampleCurve(keys,2),1);assert.equal(sampleCurve(keys,.25),.15625);
});

test('generated officers keep sex-matched generic faces across scenes and reload without changing game data',t=>{
 const previous={pack:art.pack,officers:art.officers,generatedOfficers:art.generatedOfficers,failed:art.failed,enabled:art.enabled};
 t.after(()=>Object.assign(art,previous));
 const url=n=>'/local-art/files/'+String(n).repeat(24)+'.png',male=[url(1),url(2)],female=[url(3)];
 art.pack=sanitizePack({version:1,id:'test',generatedPortraits:{male:[...male,'https://x',male[0]],female}});art.officers={};art.failed=new Set();art.enabled=true;
 assert.deepEqual(art.pack.generatedPortraits,{male,female});
 const units=[{id:'bandit-person-1-1',sex:0,generatedOfficer:{seed:3}},{id:'bandit-person-1-2',sex:1,generatedOfficer:{seed:77}}],before=JSON.stringify(units);
 art.setGeneratedOfficers(units);const faces=units.map(u=>art.portraitURL(u.id));assert.deepEqual(faces,[male[1],female[0]]);
 for(const scene of ['roster','detail','battle','report'])assert.deepEqual(units.map(u=>art.portraitURL(u.id,scene)),faces);
 art.setGeneratedOfficers(JSON.parse(before));assert.deepEqual(units.map(u=>art.portraitURL(u.id)),faces);assert.equal(JSON.stringify(units),before);
 assert.equal(art.portraitURL('cao'),null);art.failed.add(male[1]);assert.equal(art.portraitURL(units[0].id),male[0]);
 art.failed.add(male[0]);assert.equal(art.portraitURL(units[0].id),null);
 art.setGeneratedOfficers([]);assert.equal(art.portraitURL(units[1].id),null);
});
test('local file route only exposes manifest-listed assets and sends no-store',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sango-art-')),path=join(dir,'image.png');await writeFile(path,'fixture');const id='b'.repeat(24)+'.png';
 const pack={public:{version:1,id:'local-playtest'},files:{[id]:path}};
 const response=()=>({writeHead(code,headers){this.code=code;this.headers=headers;},end(body){this.body=body;}});
 let res=response();assert.equal(await serveLocalArt('/local-art/files/'+id,res,pack),true);assert.equal(res.code,200);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(String(res.body),'fixture');
 for(const url of ['/local-art/files/../../secret','/local-art/files/no.png','/local-art/files/toString']){res=response();await serveLocalArt(url,res,pack);assert.equal(res.code,404);}
 res=response();await serveLocalArt('/local-art/manifest.json',res,pack);assert.ok(!res.body.includes(dir));
 res=response();await serveLocalArt('/local-art/files/'+id,res,null);assert.equal(res.code,404);assert.equal(await loadLocalArt(dir,false),null);
});
test('simulation modules do not depend on presentation or local art files',async()=>{
 for(const file of ['engine.mjs','combat-rules.mjs','tactics.mjs','unit-stats.mjs','battle-ai.mjs','strategic-campaign.mjs']){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(text,/from\s+['"][^'"]*(?:art-assets|art-battle|art-models|local-art|vendor\/three)/);
 }
});
