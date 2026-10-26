import {AUDIO_TRACKS,scorePulse,SOUND_CUES} from './audio-score.mjs';
import {createAudioGraph,synthVoice} from './audio-synth.mjs';
import {sanitizeMusicCatalog} from './asset-catalog.mjs';
import {OfficerVoicePlayer} from './officer-voice-player.mjs';

export const AUDIO_STORAGE_KEY='sango-audio-v1';
const DEFAULTS={muted:false,music:.32,sfx:.70,voice:.85,track:'auto'};
const clamp=n=>Math.max(0,Math.min(1,n));
export function audioPreferences(value){
 return {muted:typeof value?.muted==='boolean'?value.muted:DEFAULTS.muted,...Object.fromEntries(['music','sfx','voice'].map(key=>[key,typeof value?.[key]==='number'&&Number.isFinite(value[key])?clamp(value[key]):DEFAULTS[key]])),track:Object.hasOwn(AUDIO_TRACKS,value?.track)?value.track:'auto'};
}
const speaker='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
export class GameAudio{
 constructor({storage,contextFactory,onChange=()=>{},onError=()=>{},onVoice=()=>{}}={}){
  this.storage=storage;this.contextFactory=contextFactory||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio({latencyHint:'interactive'}):null;});this.onChange=onChange;this.onError=onError;
  let saved;try{saved=JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY)||'null');}catch{}
  this.preferences=audioPreferences(saved);this.context=null;this.graph=null;this.scene='lobby';this.soft=false;this.hidden=false;this.active=false;this.unavailable=false;this.destroyed=false;
  this.voices=new Set();this.cooldowns=new Map();this.recent=[];this.sceneBus=null;this.pulse=0;this.nextPulse=0;this.timer=null;this.lastSchedule=0;this.pendingUnlock=null;
  this.desiredScene='lobby';this.library={};this.buffers=new Map();this.bufferLoads=new Map();this.musicEpoch=0;this.musicLoading=null;this.recording=null;this.positions=new Map();
  this.voiceSpeaking=false;this.officerVoice=new OfficerVoicePlayer({context:()=>this.context,preferences:()=>this.preferences,active:()=>this.active&&!this.hidden&&this.context?.state==='running',onVoice,onDuck:speaking=>{this.voiceSpeaking=speaking;this.applyLevels();}});
 }
 async unlock(){
  if(this.destroyed||this.hidden||this.preferences.muted)return false;
  if(this.pendingUnlock)return this.pendingUnlock;
  this.pendingUnlock=(async()=>{
   try{
    if(!this.context){this.context=this.contextFactory();if(!this.context){this.unavailable=true;return false;}this.graph=createAudioGraph(this.context);this.applyLevels();}
    if(this.context.state!=='running')await this.context.resume();
    this.active=!this.hidden&&!this.destroyed&&this.context.state==='running';this.unavailable=!this.active;
    if(this.active&&!this.timer){this.restartMusic();this.timer=setInterval(()=>this.schedule(),75);}
    return this.active;
   }catch{this.unavailable=true;this.active=false;if(!this.graph){try{await this.context?.close();}catch{}this.context=null;}return false;}
   finally{this.onChange();}
  })();
  try{return await this.pendingUnlock;}finally{this.pendingUnlock=null;}
 }
 setPreferences(patch){
  const previous=this.preferences;this.preferences=audioPreferences({...previous,...patch});
  try{this.storage?.setItem(AUDIO_STORAGE_KEY,JSON.stringify(this.preferences));}catch{this.onError('声音偏好暂时无法保存，本次设置仍然有效');}
  if(this.preferences.muted||(!this.preferences.sfx&&previous.sfx))for(const v of this.voices)if(v.bus==='sfx')v.cancel();
  const trackChanged=previous.track!==this.preferences.track;
  if(trackChanged)this.setScene(this.desiredScene,{soft:this.soft});
  else if((!previous.music&&this.preferences.music)||(!this.preferences.music&&previous.music)||previous.muted!==this.preferences.muted)this.restartMusic();
  if(!this.preferences.music&&previous.music)for(const v of this.voices)if(v.bus==='music')v.cancel();
  this.applyLevels();this.onChange();
  if(previous.voice!==this.preferences.voice||previous.muted!==this.preferences.muted)this.officerVoice.updateVolume();
 }
 applyLevels(){
  if(!this.graph)return;const t=this.context.currentTime,{muted,music,sfx}=this.preferences;
  this.graph.master.gain.setTargetAtTime(muted?0:.8,t,.025);
  this.graph.music.gain.cancelScheduledValues(t);this.graph.music.gain.setTargetAtTime(music*(this.soft?.48:1)*(this.voiceSpeaking?.38:1),t,.18);
  this.graph.sfx.gain.setTargetAtTime(sfx,t,.025);
 }
 setScene(scene,{soft=false}={}){
  if(!AUDIO_TRACKS[scene])scene='lobby';
  this.desiredScene=scene;if(this.preferences.track!=='auto'){scene=this.preferences.track;soft=false;}
  if(scene!==this.scene){this.scene=scene;this.restartMusic();}
  if(soft!==this.soft){this.soft=soft;this.applyLevels();}
 }
 restartMusic(){
  if(!this.context||!this.graph)return;
  const epoch=++this.musicEpoch,scene=this.scene;this.rememberPosition();
  if(!this.active||this.hidden||this.preferences.muted||!this.preferences.music){for(const v of this.voices)if(v.bus==='music')v.cancel();return;}
  if(this.library[scene]){
   const ready=this.buffers.get(scene);
   if(ready){this.adoptMusic(ready,scene,epoch);return;}
   this.musicLoading=epoch;
   void this.loadMusic(scene).then(buffer=>{if(epoch===this.musicEpoch)this.adoptMusic(buffer,scene,epoch);}).catch(()=>{if(epoch===this.musicEpoch)this.adoptMusic(null,scene,epoch);});
  }else this.adoptMusic(null,scene,epoch);
 }
 setLibrary(catalog){this.library=sanitizeMusicCatalog(catalog);this.buffers.clear();if(this.active)this.restartMusic();}
 setVoiceLibrary(catalog){this.officerVoice.setLibrary(catalog);void this.officerVoice.warmLibrary();}
 playOfficer(line,options){return this.officerVoice.play(line,options);}
 stopOfficerSpeech(){this.officerVoice.stop();}
 async loadMusic(scene){
  if(this.buffers.has(scene))return this.buffers.get(scene);
  if(this.bufferLoads.has(scene))return this.bufferLoads.get(scene);
  const entry=this.library[scene];if(!entry)return null;
  const task=(async()=>{const response=await fetch(entry.url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Music unavailable');const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
   if(buffer.duration<entry.loopEnd-.1)throw Error('Incomplete music');this.buffers.delete(scene);this.buffers.set(scene,buffer);while(this.buffers.size>2)this.buffers.delete(this.buffers.keys().next().value);return buffer;})();
  this.bufferLoads.set(scene,task);try{return await task;}finally{this.bufferLoads.delete(scene);}
 }
 rememberPosition(){
  const r=this.recording;if(!r||!this.context)return;
  this.positions.set(r.scene,(r.offset+Math.max(0,this.context.currentTime-r.start))%r.loopLength);
 }
 adoptMusic(buffer,scene,epoch){
  if(epoch!==this.musicEpoch||this.destroyed||!this.active||this.hidden||this.preferences.muted||!this.preferences.music)return;
  this.musicLoading=null;this.rememberPosition();
  const now=this.context.currentTime,old=this.sceneBus;
  if(old){old.gain.cancelScheduledValues(now);old.gain.setTargetAtTime(0,now,.5);}
  for(const voice of this.voices)if(voice.bus==='music'&&voice.destination===old)voice.cancel(now,1.5);
  // A voice keeps its old bus connected until it finishes its short fade.
  if(old){const tail=[...this.voices].filter(v=>v.destination===old);if(!tail.length)old.disconnect();else tail.at(-1).retiredBus=old;}
  this.sceneBus=this.context.createGain();this.sceneBus.gain.setValueAtTime(0,now);this.sceneBus.gain.linearRampToValueAtTime(1,now+1.6);this.sceneBus.connect(this.graph.music);this.recording=null;
  this.pulse=0;this.nextPulse=now+.06;this.lastSchedule=now;
  if(buffer){
   const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain(),entry=this.library[scene],start=now+.03,loopEnd=Math.min(entry.loopEnd,buffer.duration),loopLength=loopEnd-entry.loopStart,offset=(this.positions.get(scene)||0)%loopLength;
   source.buffer=buffer;source.loop=true;source.loopStart=entry.loopStart;source.loopEnd=loopEnd;source.connect(gain);gain.connect(this.sceneBus);
   let ended=false;const handle={bus:'music',destination:this.sceneBus,scene,start,offset,loopLength,cancel(at=ctx.currentTime,fade=.04){if(ended)return;if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(at);else{const current=gain.gain.value;gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(current,at);}gain.gain.linearRampToValueAtTime(0,at+fade);try{source.stop(at+fade+.01);}catch{}}};
   source.onended=()=>{if(ended)return;ended=true;source.disconnect();gain.disconnect();this.voices.delete(handle);handle.retiredBus?.disconnect();if(this.recording===handle)this.recording=null;};
   this.recording=handle;this.voices.add(handle);source.start(start,entry.loopStart+offset);return;
  }
  if(this.active)this.schedule();
 }
 voice(spec,at,bus='sfx',destination=this.graph[bus]){
  if(this.voices.size>=96)return;
  let handle;
  handle=synthVoice(this.context,destination,spec,at,()=>{this.voices.delete(handle);handle.retiredBus?.disconnect();});
  Object.assign(handle,{bus,destination});this.voices.add(handle);return handle;
 }
 schedule(){
  const ctx=this.context;if(!ctx||!this.active||ctx.state!=='running'||this.hidden||this.preferences.muted||!this.preferences.music||this.recording||this.musicLoading===this.musicEpoch)return;
  // A throttled tab drops missed notes, never catches up in a burst.
  if(this.nextPulse<ctx.currentTime-.1)this.nextPulse=ctx.currentTime+.04;
  const pulseSeconds=30/AUDIO_TRACKS[this.scene].bpm;
  while(this.nextPulse<ctx.currentTime+.22){
   for(const e of scorePulse(this.scene,this.pulse))this.voice({...e,length:e.length*pulseSeconds},this.nextPulse+(e.offset||0)*pulseSeconds,'music',this.sceneBus);
   this.pulse++;this.nextPulse+=pulseSeconds;
  }
  this.lastSchedule=ctx.currentTime;
 }
 play(key,{pan=0,priority=1}={}){
  if(!this.active||this.hidden||this.preferences.muted||!this.preferences.sfx||this.context?.state!=='running'||!SOUND_CUES[key])return false;
  const now=this.context.currentTime,interval=['melee','arrow','impact'].includes(key)?.13:['tactic','fire','heal'].includes(key)?.3:.055;
  if(now-(this.cooldowns.get(key)??-Infinity)<interval)return false;
  this.recent=this.recent.filter(t=>now-t<.12);if(this.recent.length>=4&&priority<5)return false;
  this.cooldowns.set(key,now);this.recent.push(now);
  // Reserve room for decisive feedback even during a dense melee.
  if(priority>=7)for(const voice of this.voices)if(voice.bus==='sfx'&&voice.priority<5)voice.cancel(now,.025);
  for(const e of SOUND_CUES[key]){const handle=this.voice({...e,pan:Math.max(-.7,Math.min(.7,(e.pan||0)+pan))},now+.004+(e.offset||0));if(handle)handle.priority=priority;}
  if(['victory','defeat','draw'].includes(key)){
   this.graph.music.gain.cancelScheduledValues(now);this.graph.music.gain.setTargetAtTime(this.preferences.music*.18,now,.08);
   this.graph.music.gain.setTargetAtTime(this.preferences.music*(this.soft?.48:1)*(this.voiceSpeaking?.38:1),now+2.5,.4);
  }
  return true;
 }
 async setHidden(hidden){
  this.hidden=hidden;if(hidden)this.stopOfficerSpeech();if(!this.context)return;
  if(hidden){this.rememberPosition();++this.musicEpoch;this.musicLoading=null;for(const v of this.voices)v.cancel(this.context.currentTime,0);this.active=false;clearInterval(this.timer);this.timer=null;try{await this.context.suspend();}catch{}}
  else await this.unlock();
 }
 buttonMarkup(){
  const muted=this.preferences.muted;
  return `<button class="button secondary audio-toggle" data-action="audio-toggle" aria-pressed="${muted}" aria-label="${muted?'开启声音':'静音'}" title="${muted?'开启声音':'静音；音量可在设置中调整'}">${speaker}<span>${muted?'已静音':'声音'}</span></button>`;
 }
 settingsMarkup(){
  const p=this.preferences;
  const labels={music:'背景音乐',sfx:'操作音效',voice:'武将语音'};
  return `<section class="audio-settings" aria-label="声音设置"><div class="audio-heading"><div><h3>声音</h3></div>${this.buttonMarkup()}</div>${Object.keys(labels).map(key=>`<label class="audio-slider"><span>${labels[key]}</span><input type="range" min="0" max="100" step="1" data-audio-volume="${key}" value="${Math.round(p[key]*100)}" aria-label="${labels[key]}音量"><output data-audio-output="${key}">${Math.round(p[key]*100)}%</output></label>`).join('')}<label class="audio-track-picker"><span>配乐曲目</span><select data-audio-track aria-label="配乐曲目"><option value="auto" ${p.track==='auto'?'selected':''}>随季节与形势自动切换</option>${Object.entries(AUDIO_TRACKS).map(([id,t])=>`<option value="${id}" ${p.track===id?'selected':''}>${t.name} · ${t.scene}</option>`).join('')}</select></label><div class="audio-audition"><button class="button secondary" data-action="audio-preview">试听音效</button><button class="button secondary" data-action="audio-voice-preview">试听语音</button><small data-audio-status>${this.statusText()}</small></div></section>`;
 }
 statusText(){return this.unavailable?'声音暂不可用，可点击试听重试':this.preferences.muted?'已静音':`${this.preferences.track==='auto'?'自动配乐':'指定配乐'}：${AUDIO_TRACKS[this.scene].name} · ${AUDIO_TRACKS[this.scene].scene}${this.active?'':' · 点击或按键后播放'}`;}
 async destroy(){this.officerVoice.destroy();this.destroyed=true;++this.musicEpoch;this.buffers.clear();clearInterval(this.timer);this.timer=null;for(const v of this.voices)v.cancel();this.sceneBus?.disconnect();this.graph?.nodes.forEach(n=>n.disconnect());try{await this.context?.close();}catch{}this.active=false;}
}
