import {CampaignRunner} from './campaign-runner.mjs';
import {inspectArchiveRaw} from './save-archives.mjs';
import {validateGameSave} from './game-save-validation.mjs';
// One reader bounds memory and worker count; committed slot tokens still govern
// summary caching. Complete validation always precedes listing/loading a save.
export class ArchiveReader {
 constructor({runner=new CampaignRunner(),background=typeof Worker!=='undefined'}={}){this.runner=runner;this.background=background;this.tail=Promise.resolve();this.generation=0;}
 inspect(raw,manual=false,includeState=false){
  const generation=this.generation;
  const next=this.tail.catch(()=>{}).then(async()=>{
   if(generation!==this.generation)throw Error('存档读取已取消');
   if(!this.background)return inspectArchiveRaw(raw,manual,validateGameSave);
   const result=await this.runner.inspectArchive(raw,manual,includeState);
   if(!result||generation!==this.generation)throw Error('存档读取已取消');
   return result.archive;
  });this.tail=next;return next;
 }
 destroy(){this.generation++;this.runner.destroy();}
}
