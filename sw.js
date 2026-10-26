importScripts('./source-offline-files.js');
const scopeId=[...self.registration.scope].reduce((hash,c)=>(Math.imul(hash,31)+c.charCodeAt(0))>>>0,0).toString(16);
const PREFIX='sango-source-'+scopeId+'-',CACHE=PREFIX+self.SANGO_SOURCE_OFFLINE.revision;
const ART_CACHE='sango-assets-v1',FILES=self.SANGO_SOURCE_OFFLINE.files;
const codePaths=new Set(FILES.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 // Activation waits for every required module, including dynamic imports and CSS.
 await (await caches.open(CACHE)).addAll(FILES);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(key=>key!==CACHE&&(key.startsWith(PREFIX)||key.startsWith('sango-art-decoupled-'))).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/local-art/'))return;
 if(codePaths.has(url.pathname)){
  event.respondWith((async()=>{
   const cached=await (await caches.open(CACHE)).match(event.request,{ignoreSearch:true});
   return cached||fetch(event.request);
  })());return;
 }
 if(url.pathname.includes('/assets/'))event.respondWith((async()=>{
  const cache=await caches.open(ART_CACHE);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch(error){const cached=await cache.match(event.request);if(cached)return cached;throw error;}
 })());
});
