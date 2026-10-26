// Save payloads live in IndexedDB; localStorage remains for small preferences.
// Only automatic slots are cached for the synchronous lobby/route previews.
export const SAVE_DATABASE='sango-saves';
export const MAX_SAVE_BYTES=256*1024*1024;
export const AUTOMATIC_KEYS=['sango-sovereign-v2','sango-historical-battle-v1','sango-battle-lab-v1'];
const isSaveKey=key=>AUTOMATIC_KEYS.includes(key)||/^sango-manual-save-v1:[a-zA-Z0-9-]+$/.test(key);
const unavailable=()=>new Error('本机存档存储不可用，请导出当前进度');
const legacyKeys=storage=>{try{return Array.from({length:storage?.length||0},(_,i)=>storage.key(i)).filter(isSaveKey);}catch{return [];}};
const legacyRead=(storage,key)=>{try{return storage?.getItem(key)??null;}catch{return null;}};

export async function openSaveStorage({database=SAVE_DATABASE,indexedDB:factory,legacy}={}){
 try{factory??=globalThis.indexedDB;}catch{}
 if(legacy===undefined)try{legacy=globalThis.localStorage;}catch{}
 let db=null,openingError=null;
 try{
  if(!factory)throw unavailable();
  db=await new Promise((resolve,reject)=>{
   let settled=false;
   const request=factory.open(database,2);
   request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains('slots'))request.result.createObjectStore('slots');
    const versions=request.result.createObjectStore('slot-versions');
    // Storage metadata only. Existing game payloads remain byte-for-byte intact.
    const keys=request.transaction.objectStore('slots').openKeyCursor();
    keys.onsuccess=()=>{const cursor=keys.result;if(cursor){versions.put(crypto.randomUUID(),cursor.key);cursor.continue();}};
   };
   request.onerror=()=>{settled=true;reject(request.error||unavailable());};
   request.onblocked=()=>{settled=true;reject(new Error('请关闭其它游戏窗口后重试存档'));};
   request.onsuccess=()=>{if(settled)request.result.close();else{settled=true;resolve(request.result);}};
  });
 }catch(error){openingError=error;}
 const cache=new Map(),durable=new Map(),revisions=new Map(),pending=new Set();
 function transaction(mode,operation){
  if(!db)return Promise.reject(openingError||unavailable());
  // Create the transaction now, including during pagehide, rather than after
  // an asynchronous queue. IndexedDB serializes writes in submission order.
  const promise=new Promise((resolve,reject)=>{
   let tx,request;
   try{
    tx=db.transaction(['slots','slot-versions'],mode,mode==='readwrite'?{durability:'strict'}:undefined);
    tx.oncomplete=()=>resolve(typeof request==='function'?request():request?.result);
    tx.onabort=()=>reject(tx.error||new Error('存档写入未完成，原存档已保留'));
    tx.onerror=()=>{}; // The terminal abort carries the transaction result.
    request=operation(tx.objectStore('slots'),tx.objectStore('slot-versions'));
   }catch(error){try{tx?.abort();}catch{}reject(error);}
  });
  pending.add(promise);promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;
 }
 const storage={
  get available(){return !!db;},
  peek:key=>cache.get(key)??null,
  async getItem(key){
   if(!isSaveKey(key))throw new Error('无效存档');
   if(!db)return legacyRead(legacy,key);
   return (await transaction('readonly',store=>store.get(key)))??legacyRead(legacy,key);
  },
  async getItemWithVersion(key){
   if(!isSaveKey(key))throw new Error('无效存档');
   if(!db)return {raw:legacyRead(legacy,key),version:null};
   const entry=await transaction('readonly',(store,versions)=>{const raw=store.get(key),version=versions.get(key);return ()=>({raw:raw.result,version:version.result??null});});
   return entry.raw===undefined?{raw:legacyRead(legacy,key),version:null}:entry;
  },
  async entryVersions(){
   if(!db)return new Map(legacyKeys(legacy).map(key=>[key,null]));
   const entries=await transaction('readonly',(store,versions)=>{const keys=store.getAllKeys(),versionKeys=versions.getAllKeys(),values=versions.getAll();return ()=>{const tokens=new Map(versionKeys.result.map((key,i)=>[key,values.result[i]]));return new Map(keys.result.map(key=>[key,tokens.get(key)??null]));};});
   for(const key of legacyKeys(legacy))if(!entries.has(key))entries.set(key,null);
   return entries;
  },
  setItem(key,value){
   if(!isSaveKey(key)||typeof value!=='string')return Promise.reject(new Error('无效存档'));
   const revision=(revisions.get(key)||0)+1;revisions.set(key,revision);
   if(AUTOMATIC_KEYS.includes(key))cache.set(key,value);
   return transaction('readwrite',(store,versions)=>{const request=store.put(value,key);versions.put(crypto.randomUUID(),key);return request;}).then(()=>{if(AUTOMATIC_KEYS.includes(key))durable.set(key,value);}).catch(error=>{
    if(revisions.get(key)===revision&&AUTOMATIC_KEYS.includes(key)){if(!durable.has(key))cache.delete(key);else cache.set(key,durable.get(key));}
    throw error;
   });
  },
  async removeItem(key){
   if(!isSaveKey(key))throw new Error('无效存档');
   const revision=(revisions.get(key)||0)+1;revisions.set(key,revision);
   await transaction('readwrite',(store,versions)=>{const request=store.delete(key);versions.delete(key);return request;});durable.delete(key);if(revisions.get(key)===revision)cache.delete(key);
   try{legacy?.removeItem(key);}catch{}
  },
  async keys(){return db?[...new Set([...await transaction('readonly',store=>store.getAllKeys()),...legacyKeys(legacy)])]:legacyKeys(legacy);},
  async flush(){await Promise.all([...pending]);},
  close(){db?.close();db=null;},
 };
 if(db){
  db.onversionchange=()=>storage.close();
  // Transfer existing bytes only after a durable commit. Game-version checking
  // stays with validateSave; no old game structure is upgraded here.
  for(const key of legacyKeys(legacy)){
   const present=await transaction('readonly',store=>store.get(key)),raw=legacyRead(legacy,key);
   if(present===undefined&&raw!==null){try{await storage.setItem(key,raw);}catch{continue;}}
   try{if(legacyRead(legacy,key)===raw)legacy?.removeItem(key);}catch{}
  }
 }
 for(const key of AUTOMATIC_KEYS){const raw=await storage.getItem(key);if(raw!==null){cache.set(key,raw);durable.set(key,raw);}}
 return storage;
}

// Browser verification tools use the same persistence boundary as the app.
export async function readSavedGame(key){const store=await openSaveStorage();try{return await store.getItem(key);}finally{store.close();}}
export async function writeSavedGame(key,value){const store=await openSaveStorage();try{await store.setItem(key,value);}finally{store.close();}}
export async function removeSavedGame(key){const store=await openSaveStorage();try{await store.removeItem(key);}finally{store.close();}}
