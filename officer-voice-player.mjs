import {VOICE_PROFILES} from './officer-voice-lines.mjs';
import {sanitizeVoiceCatalog} from './asset-catalog.mjs';

export class OfficerVoicePlayer{
 constructor({context,preferences,active,onVoice=()=>{},onDuck=()=>{},speech=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,fetcher=(...args)=>fetch(...args),now=()=>performance.now()}={}){
  Object.assign(this,{context,preferences,active,onVoice,onDuck,speech,Utterance,fetcher,now});
  this.library={};this.buffers=new Map();this.cooldowns=new Map();this.current=null;this.epoch=0;this.lastStart=-Infinity;this.destroyed=false;this.lastUnavailable=false;
 }
 setLibrary(raw){this.stop();this.library=sanitizeVoiceCatalog(raw);this.buffers.clear();}
 // The service worker caches declared clips without retaining decoded speech
 // in memory. A missing pack is harmless; the local Mandarin voice is a fallback.
 async warmLibrary(){
  const library=this.library,entries=Object.values(library);
  const worker=async()=>{while(entries.length&&!this.destroyed&&library===this.library){const entry=entries.shift();try{const r=await this.fetcher(entry.url,{signal:AbortSignal.timeout(8000)});if(r.ok)await r.arrayBuffer();}catch{}}};
  await Promise.all(Array.from({length:Math.min(3,entries.length)},worker));
 }
 allowed(){return !this.destroyed&&this.active()&&!this.preferences().muted&&this.preferences().voice>0;}
 stop(){
  ++this.epoch;const current=this.current;this.current=null;
  if(current){clearTimeout(current.timeout);current.abort?.abort();try{current.source?.stop();}catch{}current.source?.disconnect();current.gain?.disconnect();if(current.utterance)try{this.speech.cancel();}catch{}}
  this.onDuck(false);this.onVoice(null);
 }
 finish(epoch){if(epoch===this.epoch)this.stop();}
 start(line,epoch){
  if(epoch!==this.epoch||!this.allowed())return false;
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
  this.stop();const epoch=this.epoch,ctx=this.context(),abort=new AbortController();this.current={line,abort,preview};
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
  if(epoch!==this.epoch||!this.allowed()){this.finish(epoch);return false;}
  try{
   const voices=this.speech?.getVoices().filter(v=>/^zh(?:[-_](?:CN|TW|SG|Hans|Hant))?(?:[-_]|$)/i.test(v.lang))||[];
   if(!this.Utterance||!voices.length)throw Error('No Mandarin voice');
   const profile=VOICE_PROFILES[line.profile]||VOICE_PROFILES.commander;
   const preferred=voices.find(v=>profile.gender==='female'?/yaoyao|huihui|xiaoxiao|女/i.test(v.name):/kangkang|yunxi|yunjian|male|男/i.test(v.name)&&!/female/i.test(v.name));
   const voice=preferred||voices.find(v=>v.localService)||voices[0],utterance=new this.Utterance(line.text);
   Object.assign(utterance,{voice,lang:voice.lang,rate:profile.rate,pitch:profile.pitch,volume:this.preferences().voice});
   this.current.utterance=utterance;
   utterance.onstart=()=>{if(!this.start(line,epoch))this.finish(epoch);};
   utterance.onend=utterance.onerror=()=>this.finish(epoch);
   this.current.timeout=setTimeout(()=>this.finish(epoch),10000);this.speech.speak(utterance);return true;
  }catch{this.lastUnavailable=true;this.finish(epoch);return false;}
 }
 updateVolume(){
  if(!this.allowed()){this.stop();return;}
  if(this.current?.gain)this.current.gain.gain.setTargetAtTime(this.preferences().voice*.9,this.context().currentTime,.025);
  // SpeechSynthesis does not apply volume changes to an in-flight utterance.
  if(this.current?.utterance)this.stop();
 }
 destroy(){this.destroyed=true;this.stop();this.buffers.clear();}
}
