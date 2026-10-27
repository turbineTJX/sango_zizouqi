export function releaseWorkerSource(revision,files){
 return `const CACHE='sango-release-${revision}',ART_CACHE='sango-assets-v1';const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sango-')&&key!==CACHE&&key!==ART_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/local-art/'))return;
 if(url.pathname.includes('/assets/')){
  const network=fetch(event.request);
  event.waitUntil(network.then(response=>{if(response.ok){const copy=response.clone();return caches.open(ART_CACHE).then(cache=>cache.put(event.request,copy));}}).catch(()=>{}));
  event.respondWith(network.catch(async error=>{const cached=await (await caches.open(ART_CACHE)).match(event.request);if(cached)return cached;throw error;}));return;
 }
 event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
`;
}
