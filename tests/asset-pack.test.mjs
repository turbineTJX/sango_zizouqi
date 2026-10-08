import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {publicAssetURL,assetCatalog,applyAssetCatalog,catalogAssetURLs} from '../asset-catalog.mjs';
import {assetFile,resolveAssetRoot,PROJECT_ROOT} from '../asset-workspace.mjs';
import {serveAssets} from '../asset-server.mjs';
import {bundleAssetPack,validateAssetPack} from '../scripts/asset-pack.mjs';
import {art,sanitizeOfficerArt} from '../art-assets.mjs';
import {TOWN_ART,townSprite} from '../town-art.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'sango-assets-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const root=join(dir,'art'),url='./assets/officers/generated/v8/cao/portrait.png',bytes=Buffer.from('approved image');
 await mkdir(join(root,'town'),{recursive:true});await mkdir(join(root,'officers/generated/v8/cao'),{recursive:true});
 const catalog={version:1,id:'test-art',revision:'8',officers:'./assets/officers/manifest.json',town:{art:{buildings:'./assets/town/new-atlas.webp'}}};
 const officers={version:1,id:'original-officers',officers:{cao:{portrait:{url,width:1024,height:1024,sha256:digest(bytes)}}}};
 await writeFile(join(root,'manifest.json'),JSON.stringify(catalog));await writeFile(join(root,'officers/manifest.json'),JSON.stringify(officers));
 await writeFile(join(root,'town/new-atlas.webp'),'new town');await writeFile(assetFile(url,root),bytes);
 await writeFile(join(root,'officers/receipts.json'),'private production');await writeFile(join(root,'officers/candidate.png'),'unapproved');
 return {dir,root,url,catalog,officers};
}
test('asset IDs resolve renamed files and future art revisions without changing rendering',async()=>{
 const previous=structuredClone(assetCatalog);
 try{
  const catalog={version:1,id:'test-art',revision:'42',town:{art:{buildings:'./assets/town/atlas-42.webp'}}};
  applyAssetCatalog(catalog);assert.equal(TOWN_ART.buildings,catalog.town.art.buildings);assert.match(townSprite('commerce'),/atlas-42\.webp/);
  assert.deepEqual(catalogAssetURLs(catalog),['./assets/town/atlas-42.webp']);
  const url='./assets/officers/generated/v42/cao/portrait.png';
  assert.equal(sanitizeOfficerArt({version:1,id:'original-officers',officers:{cao:{portrait:{url}}}}).cao.portrait.url,url);
 }finally{applyAssetCatalog(previous);}
 for(const url of ['https://x/a.png','./assets/../secret.png','./assets/.private/a.png','./assets/a\\b.png','./assets/x.png?query','./assets/a.png" onload="x'])assert.equal(publicAssetURL(url),null);
});
test('asset mount config uses the code root and permits a separate art checkout',async t=>{
 const {dir}=await fixture(t),code=join(dir,'code');await mkdir(join(code,'.local'),{recursive:true});
 assert.equal(resolveAssetRoot(code,{}),join(code,'assets'));
 await writeFile(join(code,'.local/assets.json'),JSON.stringify({root:'../art'}));assert.equal(resolveAssetRoot(code,{}),join(dir,'art'));
 assert.equal(resolveAssetRoot(code,{SANGO_ASSET_ROOT:'../replacement'}),join(dir,'replacement'));
 assert.throws(()=>assetFile('./assets/../../secret',join(dir,'art')),/leaves/);
});
test('the real HTTP asset route reads an external pack and observes updates without a server restart',async t=>{
 const {root}=await fixture(t),server=createServer(async(req,res)=>{if(!await serveAssets(new URL(req.url,'http://localhost').pathname,res,root)){res.writeHead(404);res.end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));t.after(()=>new Promise(ok=>server.close(ok)));
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await (await fetch(base+'/assets/manifest.json')).json()).id,'test-art');
 let r=await fetch(base+'/assets/town/new-atlas.webp');assert.equal(r.headers.get('content-type'),'image/webp');assert.equal(await r.text(),'new town');
 await writeFile(join(root,'town/new-atlas.webp'),'revised town');assert.equal(await (await fetch(base+'/assets/town/new-atlas.webp')).text(),'revised town');
 for(const path of ['/assets/%2eprivate/x.json','/assets/town/..%5c..%5csecret.png','/assets/town/code.js']){
  const response={writeHead(code){this.code=code;},end(){}};await serveAssets(decodeURIComponent(path),response,root);assert.equal(response.code,403);
 }
 assert.equal((await fetch(base+'/assets/missing.png')).status,404);
});
test('art bundling copies only declared runtime files and rejects broken or changed assets',async t=>{
 const {root,dir,url,officers}=await fixture(t),out=join(dir,'bundle');const pack=await bundleAssetPack(out,root);assert.equal(pack.files.size,3);
 assert.deepEqual((await readdir(join(out,'officers'))).sort(),['generated','manifest.json']);
 assert.equal((await validateAssetPack(out)).catalog.revision,'8');
 await writeFile(assetFile(url,root),'changed after approval');await assert.rejects(validateAssetPack(root),/hash mismatch/);
 officers.officers.cao.portrait.url='./assets/officers/generated/v8/other/portrait.png';await writeFile(join(root,'officers/manifest.json'),JSON.stringify(officers));await assert.rejects(validateAssetPack(root),/Invalid officer scene/);
});
test('browser initialization loads both manifests and a missing pack restores the code-only fallback',async t=>{
 const {catalog,officers,url}=await fixture(t),oldFetch=globalThis.fetch,previous=structuredClone(assetCatalog),saved={pack:art.pack,officers:art.officers,images:art.images,failed:art.failed,enabled:art.enabled};
 const calls=[];
 try{
  art.images=new Map();art.failed=new Set();globalThis.fetch=async path=>{calls.push(path);const data=path==='./assets/manifest.json'?catalog:path===catalog.officers?officers:{version:1,id:'builtin'};return new Response(JSON.stringify(data));};
  await art.init();assert.equal(art.portraitURL('cao'),url);assert.equal(TOWN_ART.buildings,catalog.town.art.buildings);assert.ok(calls.includes(catalog.officers));
  globalThis.fetch=async()=>new Response('',{status:404});await art.init();assert.equal(art.portraitURL('cao'),null);assert.equal(TOWN_ART.buildings,'');assert.equal(townSprite('commerce'),'');
 }finally{globalThis.fetch=oldFetch;Object.assign(art,saved);applyAssetCatalog(previous);}
});
test('officer production writes to the configured art checkout and returns actual reference paths',async t=>{
 const {root}=await fixture(t);
 const direction={styleVersion:'test',priority:['cao'],profiles:{cao:{identity:'曹操',signature:'测试',role:{primary:'ruler',secondary:[],evidence:'人物身份',bearing:'沉稳领袖'}}}};
 await writeFile(join(root,'officers/art-direction.json'),JSON.stringify(direction));await writeFile(join(root,'officers/identities.json'),'{}');
 await writeFile(join(root,'officers/receipts.json'),'{}');
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',"const {officerArtJobs}=await import('./scripts/officer-art.mjs');const jobs=await officerArtJobs(['cao']);console.log(JSON.stringify(jobs.map(({output,outputFile,referenceFile})=>({output,outputFile,referenceFile}))));"],{cwd:PROJECT_ROOT,env:{...process.env,SANGO_ASSET_ROOT:root},windowsHide:true,encoding:'utf8'}));
 assert.equal(result.length,11);assert.equal(result[0].output,'assets/officers/generated/v3/cao/portrait.png');assert.equal(result[0].outputFile,join(root,'officers/generated/v3/cao/portrait.png'));assert.equal(result[0].referenceFile,null);
 assert.deepEqual(JSON.parse(await readFile(join(root,'officers/manifest.json'),'utf8')).officers,{});
});
test('simulation modules cannot transitively import the art catalog or workspace',async()=>{
 const visited=new Set(),forbidden=/^(?:asset-catalog|asset-workspace|asset-server|art-assets|art-battle|art-models|town-art|local-art-server)\.mjs$/;
 async function walk(file){
  if(visited.has(file))return;visited.add(file);const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
   const specifier=match[1];if(!specifier.startsWith('.'))continue;const path=resolve(file,'..',specifier);
   assert.doesNotMatch(path.split(/[\\/]/).at(-1),forbidden,'simulation import: '+file+' -> '+specifier);await walk(path);
  }
 }
 await walk(fileURLToPath(new URL('../engine.mjs',import.meta.url)));
 await walk(fileURLToPath(new URL('../strategic-campaign.mjs',import.meta.url)));
 assert.ok(visited.size>20);
});
