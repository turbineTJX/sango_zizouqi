import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {runInNewContext} from 'node:vm';
import {zipSync} from 'fflate';
import {art,sanitizePack} from '../art-assets.mjs';
import {assetCatalog,applyAssetCatalog} from '../asset-catalog.mjs';
import {serveAssets} from '../asset-server.mjs';
import {readAssetArchive,archiveDigest} from '../asset-archive.mjs';
import {OfficerVoicePlayer} from '../officer-voice-player.mjs';
import {presentationStyle} from '../presentation-style.mjs';
import {BattleTextCache} from '../battle-text-cache.mjs';
import {build} from 'esbuild';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {releaseWorkerSource} from '../scripts/release-worker-source.mjs';

async function directory(t){
 const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'sango-art-performance-'));
 t.after(async()=>{assert.equal(dirname(resolve(root)),parent);assert.ok(basename(root).startsWith('sango-art-performance-'));await rm(root,{recursive:true,force:true});});return root;
}
function restoreArt(t){
 const saved={pack:art.pack,officers:art.officers,enabled:art.enabled,images:art.images,imageListeners:art.imageListeners,failed:art.failed};
 art.images=new Map();art.imageListeners=new Map();art.failed=new Set();t.after(()=>Object.assign(art,saved));
}
test('unchanged loose assets return empty 304 responses and same-size replacements invalidate their validators',async t=>{
 const root=await directory(t);await writeFile(join(root,'fixture.png'),'first');
 const server=createServer(async(req,res)=>{await serveAssets(new URL(req.url,'http://localhost').pathname,res,root,req.headers);});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));t.after(()=>new Promise(ok=>server.close(ok)));const url=`http://127.0.0.1:${server.address().port}/assets/fixture.png`;
 const first=await fetch(url),etag=first.headers.get('etag');assert.equal(await first.text(),'first');assert.ok(etag);
 const unchanged=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
 await new Promise(ok=>setTimeout(ok,10));await writeFile(join(root,'fixture.png'),'other');
 const changed=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);assert.equal(await changed.text(),'other');
});
test('concurrent archive reads share one verified result and packed assets support conditional requests',async t=>{
 const root=await directory(t),files={'manifest.json':Buffer.from('{"version":1,"id":"fixture"}'),'fixture.png':Buffer.alloc(2*1024*1024,9)};
 const index={formatVersion:1,files:Object.entries(files).map(([path,bytes])=>({path,bytes:bytes.length,sha256:archiveDigest(bytes)}))};
 await writeFile(join(root,'art.pack'),zipSync({...files,'pack-index.json':Buffer.from(JSON.stringify(index))}));
 const packs=await Promise.all(Array.from({length:4},()=>readAssetArchive(root)));for(const pack of packs)assert.equal(pack,packs[0]);assert.deepEqual(Buffer.from(packs[0].files.get('fixture.png')),files['fixture.png']);
 const response={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
 await serveAssets('/assets/fixture.png',response,root);const etag=response.headers.ETag;assert.equal(response.status,200);
 await serveAssets('/assets/fixture.png',response,root,{'if-none-match':etag});assert.equal(response.status,304);assert.equal(response.body,undefined);
 // Exercise async fflate workers after the same Node bundling used by release.
 const bundled=join(root,'asset-server.mjs');await build({entryPoints:[fileURLToPath(new URL('../asset-server.mjs',import.meta.url))],bundle:true,platform:'node',format:'esm',target:'node20',outfile:bundled,logLevel:'silent'});
 const release=await import(pathToFileURL(bundled));await release.serveAssets('/assets/fixture.png',response,root);assert.equal(response.status,200);assert.deepEqual(Buffer.from(response.body),files['fixture.png']);
 const desktop=join(root,'asset-server.cjs');await build({entryPoints:[fileURLToPath(new URL('../asset-server.mjs',import.meta.url))],bundle:true,platform:'node',format:'cjs',target:'node20',outfile:desktop,logLevel:'silent'});
 await createRequire(import.meta.url)(desktop).serveAssets('/assets/fixture.png',response,root);assert.equal(response.status,200);assert.deepEqual(Buffer.from(response.body),files['fixture.png']);
 files['fixture.png'][0]^=1;await writeFile(join(root,'art.pack'),zipSync({...files,'pack-index.json':Buffer.from(JSON.stringify(index))}));await assert.rejects(readAssetArchive(root),/checksum/);
});
test('portrait availability is computed on library replacement and image completion wakes only subscribed live views',t=>{
 restoreArt(t);const saved=globalThis.Image;let scans=0,notified=0;
 t.after(()=>{globalThis.Image=saved;});
 globalThis.Image=class{complete=false;naturalWidth=0;load(){this.complete=true;this.naturalWidth=16;this.onload?.();}};
 art.enabled=true;art.pack=sanitizePack({version:1,id:'builtin'});
 art.officers={get cao(){scans++;return {neutral:{url:'./assets/officers/generated/v4/cao/neutral.png'}};}};
 for(let i=0;i<1000;i++)assert.equal(art.active,true);assert.equal(scans,1);
 const url='/local-art/files/'+'a'.repeat(24)+'.png',listener=()=>notified++;
 assert.equal(art.image(url,listener),null);const image=art.images.get(url);art.image(url,listener);image.load();assert.equal(notified,1);assert.equal(art.image(url),image);
 const other='/local-art/files/'+'b'.repeat(24)+'.png';art.image(other,listener);art.releaseImageListener(listener);art.images.get(other).load();assert.equal(notified,1);
 for(let i=0;i<90;i++){const key='/local-art/files/'+i.toString(16).padStart(24,'0')+'.png';art.image(key);art.images.get(key)?.load();}assert.ok(art.images.size<=64);
 art.officers={};assert.equal(art.active,false);
});
test('late initialization cannot overwrite a newer asset catalog or officer library',async t=>{
 restoreArt(t);const savedFetch=globalThis.fetch,savedCatalog=structuredClone(assetCatalog);let release;
 t.after(()=>{globalThis.fetch=savedFetch;applyAssetCatalog(savedCatalog);});
 globalThis.fetch=async url=>url==='./assets/manifest.json'?await new Promise(ok=>{release=()=>ok(Response.json({version:1,id:'old'}));}):Response.json({version:1,id:'builtin'});
 const old=art.init();await Promise.resolve();globalThis.fetch=async url=>Response.json(url==='./assets/manifest.json'?{version:1,id:'new'}:{version:1,id:'builtin'});
 await art.init();release();await old;assert.equal(assetCatalog.id,'new');
});
test('a burst larger than the cache retains the image that just became ready for a paused view',t=>{
 restoreArt(t);const saved=globalThis.Image;t.after(()=>{globalThis.Image=saved;});
 globalThis.Image=class{complete=false;naturalWidth=0;load(){this.complete=true;this.naturalWidth=16;this.onload?.();}};
 art.enabled=true;art.pack=sanitizePack({version:1,id:'fixture'});
 const urls=Array.from({length:65},(_,i)=>'/local-art/files/'+i.toString(16).padStart(24,'0')+'.png');let ready;
 for(const url of urls)art.image(url,()=>{ready=art.image(url);});
 const first=art.images.get(urls[0]);first.load();assert.equal(ready,first);assert.equal(art.image(urls[0]),first);
 for(const url of urls.slice(1))art.images.get(url)?.load();assert.ok(art.images.size<=64);
});
test('a missing local pack retains the initial fallback object while optional manifests finish',async t=>{
 restoreArt(t);const savedFetch=globalThis.fetch,savedCatalog=structuredClone(assetCatalog);let release;
 t.after(()=>{globalThis.fetch=savedFetch;applyAssetCatalog(savedCatalog);});
 globalThis.fetch=async url=>url==='./local-art/manifest.json'?await new Promise(ok=>{release=()=>ok(Response.json({version:1,id:'builtin'}));}):Response.json({version:1,id:'public'});
 const task=art.init(),fallback=art.pack;release();await task;assert.equal(art.pack,fallback);
});
test('voice prefetch shares in-flight work, skips warmed clips and makes no muted requests',async()=>{
 let preferences={muted:true,voice:1},requests=0,release;
 const player=new OfficerVoicePlayer({preferences:()=>preferences,active:()=>false,fetcher:async()=>{requests++;await new Promise(ok=>{release=ok;});return new Response('voice');}});
 player.setLibrary({fixture:{url:'./assets/voice/fixture.ogg',text:'领命',duration:1,sha256:'a'.repeat(64)}});
 await player.warmLibrary();assert.equal(requests,0);preferences={muted:false,voice:1};const first=player.warmLibrary();assert.equal(player.warmLibrary(),first);release();await first;await player.warmLibrary();assert.equal(requests,1);player.destroy();
});
test('explicit voice prefetch finishes its offline copy before reporting completion',async t=>{
 const savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),savedCaches=globalThis.caches;let release,writing=false,complete=false;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{}}}});
 globalThis.caches={open:async()=>({put:async()=>{writing=true;await new Promise(ok=>{release=ok;});}})};
 t.after(()=>{if(savedNavigator)Object.defineProperty(globalThis,'navigator',savedNavigator);else delete globalThis.navigator;globalThis.caches=savedCaches;});
 const player=new OfficerVoicePlayer({preferences:()=>({muted:false,voice:1}),active:()=>false,fetcher:async()=>new Response('voice')});
 player.setLibrary({fixture:{url:'./assets/voice/fixture.ogg',text:'领命',duration:1,sha256:'a'.repeat(64)}});
 const task=player.warmLibrary().then(()=>{complete=true;});await new Promise(ok=>setTimeout(ok,10));assert.equal(writing,true);assert.equal(complete,false);release();await task;assert.equal(complete,true);player.destroy();
});
test('unchanged normalized styles are not rewritten and external resets are repaired',()=>{
 let writes=0;const properties=new Map(),element={style:{getPropertyValue:key=>properties.get(key)||'',setProperty(key,value){writes++;properties.set(key,value==='0px 0px'?'0px':value);}}};
 presentationStyle(element,'translate','0px 0px');presentationStyle(element,'translate','0px 0px');assert.equal(writes,1);properties.clear();presentationStyle(element,'translate','0px 0px');assert.equal(writes,2);
});
test('text bitmaps reuse shaping across frames, separate pixel ratios and release evicted canvases',t=>{
 const saved=globalThis.document;let strokes=0;globalThis.document={createElement:()=>({getContext:()=>({measureText:text=>({width:text.length*10}),setTransform(){},strokeText(){strokes++;},fillText(){}})})};t.after(()=>{globalThis.document=saved;});
 const cache=new BattleTextCache(),first=cache.get('−180',12,'#fff',1);for(let i=0;i<60;i++)assert.equal(cache.get('−180',12,'#fff',1),first);assert.equal(strokes,1);assert.notEqual(cache.get('−180',12,'#fff',2),first);
 for(let i=0;i<120;i++)cache.get(String(i),12,'#fff',1);assert.ok(cache.entries.size<=96);assert.equal(first.canvas.width,0);cache.clear();assert.equal(cache.entries.size,0);
});
test('offline cache writes never delay or reject a successful art response',async()=>{
 const sources=[await readFile(new URL('../sw.js',import.meta.url),'utf8'),releaseWorkerSource('fixture',[])];
 for(const source of sources)for(const fail of [false,true]){
  const handlers={},pending=[];let response,release;const stored=new Promise((ok,no)=>{release=()=>fail?no(Error('quota')):ok();});
  const self={SANGO_SOURCE_OFFLINE:{revision:'fixture',files:[]},registration:{scope:'https://game/'},location:{origin:'https://game'},addEventListener:(key,handler)=>{handlers[key]=handler;}};
  runInNewContext(source,{self,URL,importScripts(){},caches:{open:async()=>({put:()=>stored})},fetch:async()=>new Response('art')});
  handlers.fetch({request:new Request('https://game/assets/fixture.png'),waitUntil:task=>pending.push(task),respondWith:task=>{response=task;}});
  assert.equal(await (await response).text(),'art');release();await Promise.all(pending);
 }
});
test('source and release workers return the last cached asset while offline; release updates preserve that cache',async()=>{
 for(const source of [await readFile(new URL('../sw.js',import.meta.url),'utf8'),releaseWorkerSource('fixture',[])]){
  const handlers={},pending=[],deleted=[];let response;
  const self={SANGO_SOURCE_OFFLINE:{revision:'fixture',files:[]},registration:{scope:'https://game/'},location:{origin:'https://game'},clients:{claim(){}},addEventListener:(key,handler)=>{handlers[key]=handler;}};
  runInNewContext(source,{self,URL,importScripts(){},caches:{open:async()=>({match:async()=>new Response('cached exact bytes')}),keys:async()=>['sango-assets-v1','sango-release-old'],delete:async key=>{deleted.push(key);}},fetch:async()=>{throw Error('offline');}});
  handlers.fetch({request:new Request('https://game/assets/fixture.png'),waitUntil:task=>pending.push(task),respondWith:task=>{response=task;}});assert.equal(await(await response).text(),'cached exact bytes');await Promise.all(pending);
  handlers.activate({waitUntil:task=>pending.push(task)});await Promise.all(pending);assert.ok(!deleted.includes('sango-assets-v1'));
 }
});
