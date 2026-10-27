// Release tables must be installed before loading the synchronous engine graph.
// The worker calls the same handlers as the foreground and headless audits.
let engine;
self.onmessage=async({data})=>{
 if(!data.id){if(data.runtimeData)globalThis[Symbol.for('sango.runtime-data')]=data.runtimeData;return;}
 const {id,state,operation}=data;
 try{
  engine??=await import('./strategic-campaign.mjs');
  if(operation==='archive'){
   const {inspectArchiveRaw}=await import('./save-archives.mjs'),{validateGameSave}=await import('./game-save-validation.mjs');
   const archive=inspectArchiveRaw(data.raw,data.manual,validateGameSave);
   if(!data.includeState)delete archive.state;
   self.postMessage({id,archive});return;
  }
  const start=performance.now();
  const result=operation==='begin'?engine.beginExecution(state):engine.advanceCampaignDay(state);
  self.postMessage({id,state,result,computeMs:performance.now()-start});
 }catch(error){self.postMessage({id,error:error?.message||String(error)});}
};
