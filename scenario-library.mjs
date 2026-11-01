import {validateScenarioDocument,newScenarioId} from './scenario-document.mjs';
import {preflightScenario} from './scenario-preflight.mjs';
export const emptyScenarioLibrary=()=>({format:'sango-scenario-library',version:1,scenarios:[],draft:null});
export function validateScenarioLibrary(input){
 if(input?.format!=='sango-scenario-library'||input.version!==1||!Array.isArray(input.scenarios)||input.scenarios.length>64)throw Error('剧本库无效，最多保存64个剧本');
 const scenarios=input.scenarios.map(d=>validateScenarioDocument(d));
 if(new Set(scenarios.map(d=>d.id)).size!==scenarios.length)throw Error('剧本库编号重复');
 return {format:'sango-scenario-library',version:1,scenarios,draft:input.draft?validateScenarioDocument(input.draft,{playable:false}):null};
}
export function importScenarioDocument(library,input){
 const document=validateScenarioDocument(input),next=structuredClone(library);
 preflightScenario(document);
 if(next.scenarios.some(d=>d.id===document.id)){document.id=newScenarioId();document.name=document.name.slice(0,44)+' 副本';}
 next.scenarios.push(document);next.draft=document;return validateScenarioLibrary(next);
}
export async function openScenarioLibrary({indexedDB:factory=globalThis.indexedDB,database='sango-scenarios-v2'}={}){
 if(!factory)throw Error('本机剧本存储不可用，请导出保留作品');
 const db=await new Promise((ok,no)=>{const r=factory.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('library');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);r.onblocked=()=>no(Error('请关闭其它剧本编辑窗口后重试'));});
 db.onversionchange=()=>db.close();
 const transaction=(mode,operation)=>new Promise((ok,no)=>{const tx=db.transaction('library',mode,mode==='readwrite'?{durability:'strict'}:undefined),request=operation(tx.objectStore('library'));tx.oncomplete=()=>ok(request.result);tx.onabort=()=>no(tx.error||Error('剧本保存失败，原作品已保留'));tx.onerror=()=>{};});
 return {async read(){const value=await transaction('readonly',s=>s.get('library'));return value?validateScenarioLibrary(value):emptyScenarioLibrary();},async write(value){await transaction('readwrite',s=>s.put(validateScenarioLibrary(value),'library'));},close(){db.close();}};
}
