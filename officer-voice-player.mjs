import {VOICE_PROFILES} from './officer-voice-lines.mjs';
import {sanitizeVoiceCatalog} from './asset-catalog.mjs';

const mandarin=voice=>/^zh(?:[-_](?:CN|TW|SG|Hans|Hant))?(?:[-_]|$)/i.test(voice.lang);
const voiceGender=voice=>{
 const name=voice.name+' '+(voice.voiceURI||'');
 if(/^(?:male|female)$/i.test(voice.gender||''))return voice.gender.toLowerCase();
 if(/huihui|yaoyao|xiaoxiao|xiaoyi|xiaohan|xiaomeng|xiaomo|xiaorui|xiaoshuang|xiaoxuan|xiaoyan|xiaoyou|xiaozhen|tingting|meijia|female|女/i.test(name))return 'female';
 if(/kangkang|yunxi|yunjian|yunyang|yunfeng|yunhao|yunxia|yunye|yunze|li[ -]?mu|(?:^|[\s_-])male(?:$|[\s_-])|男/i.test(name))return 'male';
 return null;
};
export function selectOfficerDeviceVoice(voices,profile){
 const candidates=voices.filter(voice=>mandarin(voice)&&voiceGender(voice)===profile.gender);
 for(const name of profile.preferredVoices||[]){const matches=candidates.filter(voice=>voice.name.toLowerCase().includes(name.toLowerCase()));if(matches.length)return matches.find(voice=>voice.localService)||matches[0];}
 return candidates.find(voice=>voice.localService)||candidates[0]||null;
}

export class OfficerVoicePlayer{
 constructor({context,preferences,active,onVoice=()=>{},onDuck=()=>{},speech=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,fetcher=(...args)=>fetch(...args),now=()=>performance.now()}={}){
  Object.assign(this,{context,preferences,active,onVoice,onDuck,speech,Utterance,fetcher,now});
  this.library={};this.buffers=new Map();this.cooldowns=new Map();this.current=null;this.epoch=0;this.lastStart=-Infinity;this.destroyed=false;this.lastUnavailable=false;this.warmed=new Set();this.warmTask=null;this.warmAbort=null;
 }
 setLibrary(raw){this.stop();this.warmAbort?.abort();this.warmTask=null;this.warmed.clear();this.library=sanitizeVoiceCatalog(raw);this.buffers.clear();}
 // The service worker caches declared clips without retaining decoded speech
 // in memory. A missing pack is harmless; the local Mandarin voice is a fallback.
 warmLibrary(){
  if(this.destroyed||this.preferences().muted||!this.preferences().voice)return Promise.resolve();
  if(this.warmTask)return this.warmTask;
  const library=this.library,entries=Object.values(library).filter(entry=>!this.warmed.has(entry.url)),abort=new AbortController();this.warmAbort=abort;
  const worker=async()=>{while(entries.length&&!this.destroyed&&!abort.signal.aborted&&library===this.library&&!this.preferences().muted&&this.preferences().voice>0){
   const entry=entries.shift();try{
    const response=await this.fetcher(entry.url,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(8000)])});
    if(response.ok){
     const offlineCopy=globalThis.navigator?.serviceWorker?.controller&&globalThis.caches?response.clone():null;
     await response.arrayBuffer();
     // Explicit prefetch may be awaited before going offline. Ordinary media
     // loads still return without waiting for the worker's background write.
     if(offlineCopy)try{await (await caches.open('sango-assets-v1')).put(entry.url,offlineCopy);}catch{}
     if(library===this.library&&!abort.signal.aborted)this.warmed.add(entry.url);
    }
   }catch{}
  }};
  const task=Promise.all(Array.from({length:Math.min(3,entries.length)},worker)).finally(()=>{if(this.warmTask===task){this.warmTask=null;this.warmAbort=null;}});this.warmTask=task;return task;
 }
 allowed(){return !this.destroyed&&this.active()&&!this.preferences().muted&&this.preferences().voice>0;}
 stop(){
  ++this.epoch;const current=this.current;this.current=null;
  if(current){clearTimeout(current.timeout);current.abort?.abort();try{current.source?.stop();}catch{}current.source?.disconnect();current.gain?.disconnect();if(current.utterance)try{this.speech.cancel();}catch{}}
  this.onDuck(false);this.onVoice(null);
 }
 finish(epoch){if(epoch===this.epoch)this.stop();}
 start(line,epoch){
  if(epoch!==this.epoch||!this.allowed()||this.now()-this.current.requestedAt>1800)return false;
  const now=this.now();if(!this.current.preview){this.lastStart=now;this.cooldowns.set(line.officerId,now);this.cooldowns.set('line:'+line.id,now);}
  if(this.cooldowns.size>256)for(const [key,time]of this.cooldowns)if(now-time>30000)this.cooldowns.delete(key);
  this.lastUnavailable=false;this.onDuck(true);this.onVoice(line);return true;
 }
 async play(line,{preview=false}={}){
  if(!line||!this.allowed())return false;
  const now=this.now(),priority=line.priority||5;
  if(!preview){
   if(now-(this.cooldowns.get('line:'+line.id)??-Infinity)<16000)return false;
   if(!line.terminal&&priority<8&&(now-this.lastStart<3500||now-(this.cooldowns.get(line.officerId)??-Infinity)<8000))return false;
   if(this.current&&priority<=(this.current.line.priority||5)&&!line.terminal)return false;
  }
  this.stop();const epoch=this.epoch,ctx=this.context(),abort=new AbortController();this.current={line,abort,preview,requestedAt:now};
  const entry=this.library[line.id];
  if(entry?.text===line.text&&ctx){
   let buffer=this.buffers.get(line.id),timeout;
   try{
    if(!buffer){
     timeout=setTimeout(()=>abort.abort(),1500);
     const response=await this.fetcher(entry.url,{signal:abort.signal});if(!response.ok)throw Error('Voice clip unavailable');
     buffer=await ctx.decodeAudioData(await response.arrayBuffer());
     if(buffer.duration<.1||buffer.duration>12)throw Error('Invalid voice clip');
     if(epoch!==this.epoch)return false;
     this.buffers.set(line.id,buffer);while(this.buffers.size>12)this.buffers.delete(this.buffers.keys().next().value);
    }
    clearTimeout(timeout);
    if(epoch!==this.epoch||!this.allowed()||this.now()-now>1800){this.finish(epoch);return false;}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=this.preferences().voice*.9;source.connect(gain);gain.connect(ctx.destination);
    Object.assign(this.current,{source,gain});source.onended=()=>this.finish(epoch);
    if(!this.start(line,epoch)){this.finish(epoch);return false;}source.start();
    this.current.timeout=setTimeout(()=>this.finish(epoch),(buffer.duration+1)*1000);return true;
   }catch{clearTimeout(timeout);if(epoch!==this.epoch)return false;}
  }
  if(epoch!==this.epoch||!this.allowed()||this.now()-now>1800){this.finish(epoch);return false;}
  try{
   if(!this.Utterance||!this.speech)throw Error('No speech engine');
   const profile=VOICE_PROFILES[line.profile]||VOICE_PROFILES.commander;
   let voice=selectOfficerDeviceVoice(this.speech.getVoices(),profile);
   // Some engines initially expose only their default voice. Give the voice
   // inventory a short chance to finish, within this event's existing deadline.
   if(!voice&&this.speech.addEventListener){
    await new Promise(resolve=>{
     let timer;const done=()=>{clearTimeout(timer);this.speech.removeEventListener('voiceschanged',refresh);resolve();};
     const refresh=()=>{voice=selectOfficerDeviceVoice(this.speech.getVoices(),profile);if(voice||epoch!==this.epoch)done();};
     this.speech.addEventListener('voiceschanged',refresh);timer=setTimeout(done,Math.max(0,Math.min(500,1800-(this.now()-now))));refresh();
    });
   }
   if(epoch!==this.epoch||!this.allowed()||this.now()-now>1800){this.finish(epoch);return false;}
   if(!voice)throw Error('No matching Mandarin voice');
   const utterance=new this.Utterance(line.text);
   Object.assign(utterance,{voice,lang:voice.lang,rate:profile.rate,pitch:profile.pitch,volume:this.preferences().voice});
   this.current.utterance=utterance;
   utterance.onstart=()=>{if(!this.start(line,epoch)){this.finish(epoch);return;}clearTimeout(this.current.timeout);this.current.timeout=setTimeout(()=>this.finish(epoch),10000);};
   utterance.onend=utterance.onerror=()=>this.finish(epoch);
   this.current.timeout=setTimeout(()=>this.finish(epoch),1800);this.speech.speak(utterance);return true;
  }catch{this.lastUnavailable=true;this.finish(epoch);return false;}
 }
 updateVolume(){
  if(!this.allowed()){this.stop();if(this.preferences().muted||!this.preferences().voice)this.warmAbort?.abort();return;}
  if(this.current?.gain)this.current.gain.gain.setTargetAtTime(this.preferences().voice*.9,this.context().currentTime,.025);
  // SpeechSynthesis does not apply volume changes to an in-flight utterance.
  if(this.current?.utterance)this.stop();
 }
 destroy(){this.destroyed=true;this.warmAbort?.abort();this.stop();this.buffers.clear();this.warmed.clear();}
}
