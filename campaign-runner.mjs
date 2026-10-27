// A calculation owns a detached world. Only its current caller may commit it.
// Cancelling never changes the last committed day, resources or random states.
export class CampaignRunner {
 constructor({createWorker=()=>new Worker(new URL('./campaign-worker.mjs',import.meta.url),{type:'module'}),runtimeData=globalThis[Symbol.for('sango.runtime-data')]}={}){
  this.createWorker=createWorker;this.runtimeData=runtimeData;this.sequence=0;this.pending=null;this.worker=null;
 }
 get busy(){return !!this.pending;}
 run(state,operation='day'){
  return this.request({state,operation});
 }
 inspectArchive(raw,manual=false,includeState=false){return this.request({operation:'archive',raw,manual,includeState});}
 request(payload){
  if(this.pending)throw Error('A campaign calculation is already running');
  return new Promise((resolve,reject)=>{
   const id=++this.sequence;this.pending={id,resolve,reject};
   try{
    if(!this.worker){
     const worker=this.worker=this.createWorker();
     worker.onmessage=({data})=>{
      if(this.pending?.id!==data.id)return;
      const pending=this.pending;this.pending=null;
      if(data.error)pending.reject(Error(data.error));else pending.resolve(data);
     };
     worker.onerror=event=>{if(this.worker!==worker)return;event.preventDefault?.();this.fail(Error(event.message||'Campaign worker failed'));};
     worker.onmessageerror=()=>{if(this.worker===worker)this.fail(Error('Campaign result could not be read'));};
     this.worker.postMessage({runtimeData:this.runtimeData});
    }
    this.worker.postMessage({id,...payload});
   }catch(error){this.fail(error);}
  });
 }
 fail(error){const pending=this.pending;this.pending=null;this.worker?.terminate();this.worker=null;pending?.reject(error);}
 cancel(){const pending=this.pending;if(!pending)return;this.pending=null;this.worker?.terminate();this.worker=null;pending.resolve(null);}
 destroy(){this.cancel();this.worker?.terminate();this.worker=null;}
}
