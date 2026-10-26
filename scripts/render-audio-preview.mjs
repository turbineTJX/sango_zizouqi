import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {audioBrowser} from './audio-browser.mjs';
import {AUDIO_TRACKS} from '../audio-score.mjs';
const out=fileURLToPath(new URL('../.local/audio-preview/',import.meta.url)),host=await audioBrowser(4311);
try{
 await mkdir(out,{recursive:true});const page=await host.browser.newPage();await page.goto(host.url);await page.locator('[data-action="campaign-lobby"]').waitFor();
 const report=[];
 for(const scene of [...Object.keys(AUDIO_TRACKS),'effects']){
  const rendered=await page.evaluate(async scene=>{
   const {AUDIO_TRACKS,scorePulse,SOUND_CUES}=await import('./audio-score.mjs'),{createAudioGraph,synthVoice}=await import('./audio-synth.mjs'),{waveBytes}=await import('./scripts/audio-wave.mjs');
   const catalog=await fetch('./assets/manifest.json').then(r=>r.ok?r.json():{}).catch(()=>({})),entry=catalog.music?.[scene],track=AUDIO_TRACKS[scene];let buffer;
   if(entry){const ctx=new OfflineAudioContext(2,1,44100),r=await fetch(entry.url);if(!r.ok)throw Error('Music unavailable: '+scene);buffer=await ctx.decodeAudioData(await r.arrayBuffer());}
   else{
    const rate=22050,seconds=track?track.bars*8*30/track.bpm+3:22,ctx=new OfflineAudioContext(2,Math.ceil(rate*seconds),rate),graph=createAudioGraph(ctx);
    if(track){const pulseSeconds=30/track.bpm;for(let pulse=0;pulse<track.bars*8;pulse++)for(const v of scorePulse(scene,pulse))synthVoice(ctx,graph.music,{...v,length:v.length*pulseSeconds},.05+pulse*pulseSeconds);}
    else{let at=.3;for(const [key,voices]of Object.entries(SOUND_CUES)){for(const v of voices)synthVoice(ctx,graph.sfx,v,at+(v.offset||0));at+=['start','victory','defeat','draw'].includes(key)?2.6:.75;}}
    buffer=await ctx.startRendering();
   }
   const {bytes,...metrics}=waveBytes(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   return {base64:btoa(binary),...metrics,title:track?.name||'操作与交战音效',sampled:!!entry};
  },scene);
  const {base64,...metrics}=rendered;await writeFile(out+scene+'.wav',Buffer.from(base64,'base64'));report.push({scene,file:scene+'.wav',...metrics});console.log(JSON.stringify(report.at(-1)));
 }
 await writeFile(out+'manifest.json',JSON.stringify(report,null,2)+'\n');
}finally{await host.close();}
