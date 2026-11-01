import {emptyOfficerLibrary,validateOfficerLibrary} from './officer-library-data.mjs';

// Authored records have their own transaction boundary, independent of game saves.
export async function openOfficerLibrary({indexedDB:factory=globalThis.indexedDB,database='sango-officer-library'}={}){
 if(!factory)throw Error('本机武将存储不可用，可导出武将包保留修改');
 const db=await new Promise((ok,no)=>{const r=factory.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('officers');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('请关闭其它武将编辑窗口后重试'));});
 const transact=(mode,operation)=>new Promise((ok,no)=>{const tx=db.transaction('officers',mode,mode==='readwrite'?{durability:'strict'}:undefined),r=operation(tx.objectStore('officers'));tx.oncomplete=()=>ok(r.result);tx.onabort=()=>no(tx.error||Error('武将写入失败，原记录已保留'));tx.onerror=()=>{};});
 db.onversionchange=()=>db.close();
 return {
  async read(){const value=await transact('readonly',s=>s.get('library'));return value===undefined?emptyOfficerLibrary():validateOfficerLibrary(value);},
  async write(value,expected){
   const valid=validateOfficerLibrary(value);
   await new Promise((ok,no)=>{
    const tx=db.transaction('officers','readwrite',{durability:'strict'}),store=tx.objectStore('officers'),request=store.get('library');let error;
    request.onsuccess=()=>{try{
     const previous=request.result===undefined?emptyOfficerLibrary():validateOfficerLibrary(request.result);
     if(expected&&JSON.stringify(previous)!==JSON.stringify(expected))throw Error('武将库已在其它窗口修改，请重新打开编辑器');
     store.put(valid,'library');
    }catch(e){error=e;tx.abort();}};
    tx.oncomplete=ok;tx.onabort=()=>no(error||tx.error||Error('武将写入失败，原记录已保留'));tx.onerror=()=>{};
   });return valid;
  },close(){db.close();}
 };
}
