import {mkdir,readFile,writeFile,stat,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {ASSET_ROOT,PROJECT_ROOT} from '../asset-workspace.mjs';
import {allOfficerVoiceLines} from '../officer-voice-lines.mjs';
import {NEURAL_VOICE_PROFILES,officerVoiceDirection} from './officer-voice-direction.mjs';
import {QWEN_VOICE_PROFILES,officerQwenVoiceDirection} from './officer-qwen-voice-direction.mjs';
import {CHARACTER_VOICE_DIRECTIONS,CHARACTER_VOICE_REFERENCE} from './officer-character-voice-direction.mjs';
import {OFFICER_CHARACTER_VOICES} from '../officer-character-voices.mjs';

// Synthesis is an authoring step only; clients play the completed pack offline.
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const edge=process.argv.includes('--edge'),preview=process.argv.includes('--preview'),local=!edge&&!process.argv.includes('--demo');
if(process.argv.slice(2).some(arg=>!['--edge','--preview','--demo'].includes(arg))||edge&&process.argv.includes('--demo'))throw Error('Usage: render-officer-voices.mjs [--preview] [--demo | --edge]');
const allLines=allOfficerVoiceLines().map(line=>({...line,...(edge?officerVoiceDirection(line):officerQwenVoiceDirection(line))}));
if(!local&&!preview)throw Error('Full character packs require the local Qwen models. Use --preview for legacy auditions.');
const processing={version:2,head:.05,tail:.08,pauseLimit:.22,pauseKeep:.14,previewGap:.2};
const revision=(edge?'neural-cn-v2-':'qwen-cn-v2-')+hash(JSON.stringify({lines:allLines,processing})).slice(0,8);
const lines=preview?allLines.filter(line=>['acknowledge','start'].includes(line.event)&&(line.character?local&&!line.id.includes('-ruler-'):line.id.endsWith('-0')&&!line.id.startsWith('ruler-'))):allLines;
const out=resolve(ASSET_ROOT,'voices',revision),work=resolve(PROJECT_ROOT,'.local','voice-tools',revision);
await mkdir(out,{recursive:true});await mkdir(work,{recursive:true});
const jobs=[];
for(const line of lines){
 const target=resolve(out,line.id+'.wav'),source=resolve(work,line.id+(edge?'.mp3':'.wav'));
 let exists=false;try{exists=(await stat(target)).size>44;}catch{}
 if(!exists)jobs.push({...line,target,source});
}
const jobsPath=resolve(work,'jobs.json');await writeFile(jobsPath,JSON.stringify(jobs),'utf8');
if(jobs.length){
 await new Promise((ok,fail)=>{
  const python=process.env.PYTHON||(local?resolve(PROJECT_ROOT,'.local/voice-tools/qwen-venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'):'python');
  const env=local?{...process.env,SANGO_QWEN_LOCAL:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}:process.env;
  const child=spawn(python,[resolve(PROJECT_ROOT,edge?'scripts/render-officer-voices.py':'scripts/render-qwen-officer-voices.py'),jobsPath],{cwd:PROJECT_ROOT,env,windowsHide:true,stdio:'inherit'});
  child.on('error',fail);child.on('exit',code=>code===0?ok():fail(Error('Neural voice rendering failed: '+code)));
 });
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  for(const job of jobs){
   const source=await readFile(job.source);
   const encoded=await page.evaluate(async({encoded,processing})=>{
    const raw=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const ctx=new OfflineAudioContext(1,1,24000),buffer=await ctx.decodeAudioData(raw.buffer),samples=buffer.getChannelData(0),rate=buffer.sampleRate;
    let first=samples.length,last=0,peak=0;
    for(let i=0;i<samples.length;i++){
     const value=Math.abs(samples[i]);peak=Math.max(peak,value);
     if(value>.003){first=Math.min(first,i);last=i;}
    }
    if(peak<.02)throw Error('Silent voice');
    // Keep consonants and breaths. Only long, genuinely quiet gaps are compacted;
    // speech is never resampled or pitched up to obtain a faster delivery.
    const start=Math.max(0,first-Math.round(rate*processing.head)),end=Math.min(samples.length,last+Math.round(rate*processing.tail));
    const frame=Math.round(rate*.01),parts=[];let cursor=start,gap=-1,length=0,fadeIn=false;
    const add=(from,to,fadeOut=false)=>{
     const part=Float32Array.from(samples.subarray(from,to)),fade=Math.min(Math.round(rate*.003),part.length);
     if(fadeIn)for(let i=0;i<fade;i++)part[i]*=i/fade;
     if(fadeOut)for(let i=0;i<fade;i++)part[part.length-i-1]*=i/fade;
     parts.push(part);length+=part.length;fadeIn=fadeOut;
    };
    const closeGap=to=>{
     if(gap>=0&&to-gap>=rate*processing.pauseLimit){
      const keepFront=Math.round(rate*processing.pauseKeep*.4),keepBack=Math.round(rate*processing.pauseKeep*.6);
      add(cursor,gap+keepFront,true);cursor=to-keepBack;
     }
     gap=-1;
    };
    for(let at=start;at<end;at+=frame){
     let squares=0,top=0;const stop=Math.min(end,at+frame);
     for(let i=at;i<stop;i++){squares+=samples[i]*samples[i];top=Math.max(top,Math.abs(samples[i]));}
     const quiet=Math.sqrt(squares/(stop-at))<.0028&&top<.012;
     if(quiet){if(gap<0)gap=at;}else closeGap(at);
    }
    closeGap(end);add(cursor,end);
    const compacted=new Float32Array(length);let position=0;for(const part of parts){compacted.set(part,position);position+=part.length;}
    const gain=Math.min(2,.82/peak),bytes=new Uint8Array(44+length*2),view=new DataView(bytes.buffer);
    const str=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
    str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,length*2,true);
    for(let i=0;i<length;i++){
     const fade=Math.min(1,i/(rate*.004),(length-i-1)/(rate*.004));
     view.setInt16(44+i*2,Math.round(compacted[i]*gain*fade*32767),true);
    }
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
   },{encoded:source.toString('base64'),processing});
   await writeFile(job.target,Buffer.from(encoded,'base64'));
  }
 }finally{await browser.close();}
}
const voices={};let bytes=0;
for(const line of lines){
 const data=await readFile(resolve(out,line.id+'.wav'));
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,16)!=='WAVEfmt '||data.readUInt16LE(20)!==1||data.readUInt16LE(22)!==1||data.readUInt16LE(34)!==16||data.toString('ascii',36,40)!=='data'||data.readUInt32LE(40)!==data.length-44)throw Error('Invalid WAV: '+line.id);
 const duration=(data.length-44)/data.readUInt32LE(28);
 if(!Number.isFinite(duration)||duration<.1||duration>12)throw Error('Invalid voice duration: '+line.id);
 voices[line.id]={url:'./assets/voices/'+revision+'/'+line.id+'.wav',text:line.text,duration,sha256:hash(data)};bytes+=data.length;
}
if(preview){
 const previews={};
 for(const gender of ['male','female'])for(const event of ['acknowledge','start']){
  const parts=[];let header;
  for(const personality of ['timid','calm','bold','rash']){
   const data=await readFile(resolve(out,gender+'-'+personality+'-'+event+'-0.wav'));
   header??=Buffer.from(data.subarray(0,44));parts.push(data.subarray(44),Buffer.alloc(Math.round(48000*processing.previewGap)));
  }
  const pcm=Buffer.concat(parts);header.writeUInt32LE(36+pcm.length,4);header.writeUInt32LE(pcm.length,40);
  const path=resolve(work,gender+'-'+event+'-preview.wav');await writeFile(path,Buffer.concat([header,pcm]));previews[gender+'-'+event]=path;
 }
 if(local)for(const character of Object.keys(OFFICER_CHARACTER_VOICES)){
  const parts=[];let header;
  for(const event of ['start','acknowledge']){
   const data=await readFile(resolve(out,'character-'+character+'-'+event+'.wav'));
   header??=Buffer.from(data.subarray(0,44));parts.push(data.subarray(44),Buffer.alloc(9600));
  }
  const pcm=Buffer.concat(parts);header.writeUInt32LE(36+pcm.length,4);header.writeUInt32LE(pcm.length,40);
  const path=resolve(work,'character-'+character+'-preview.wav');await writeFile(path,Buffer.concat([header,pcm]));previews[character]=path;
 }
 console.log(JSON.stringify({preview:true,clips:lines.length,revision,previews}));process.exit(0);
}
const credits={version:1,kind:'neural-synthesized-speech',language:'zh-CN',source:edge?'Microsoft Edge online neural speech synthesis':'Qwen3-TTS-12Hz-1.7B-CustomVoice',tool:edge?{name:'edge-tts',version:'7.3.1',url:'https://github.com/rany2/edge-tts'}:{name:'Qwen3-TTS',url:'https://github.com/QwenLM/Qwen3-TTS',model:'https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',license:'Apache-2.0',generation:local?'local GPU with reusable official-demo auditions':'official free demo',demo:'https://huggingface.co/spaces/Qwen/Qwen3-TTS'},text:'Original Sango game dialogue',usage:'AI-generated prototype dialogue; not human voice acting.',profiles:edge?NEURAL_VOICE_PROFILES:QWEN_VOICE_PROFILES,delivery:lines.map(({id,voice,rate,pitch,speaker,instruct})=>({id,voice,rate,pitch,speaker,instruct})),clips:lines.length};
credits.processing=processing;
credits.source='Qwen3-TTS-12Hz-1.7B (CustomVoice + VoiceDesign + Base)';
credits.tool.generation='local GPU';
credits.characters=Object.fromEntries(Object.entries(OFFICER_CHARACTER_VOICES).map(([id,{name}])=>[id,{name,...CHARACTER_VOICE_DIRECTIONS[id],clips:lines.filter(line=>line.character===id).length}]));
credits.characterReference=CHARACTER_VOICE_REFERENCE;
credits.tool.characterModels={design:'https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign',reuse:'https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base',license:'Apache-2.0',method:'VoiceDesign original reference followed by Base voice reuse; no cast audio samples.'};
credits.delivery=lines.map(({id,voice,rate,pitch,speaker,instruct,character,design})=>({id,voice,rate,pitch,speaker,instruct,character,design}));
await writeFile(resolve(out,'credits.json'),JSON.stringify(credits,null,2)+'\n');
// Read immediately before publishing so unrelated art updates are preserved.
// A partial render never replaces the currently working public voice catalog.
const path=resolve(ASSET_ROOT,'manifest.json'),catalog=JSON.parse(await readFile(path,'utf8'));
catalog.voices=voices;catalog.voiceCredits='./assets/voices/'+revision+'/credits.json';
catalog.revision=String(catalog.revision).replace(/-voice-[a-f0-9]+/g,'')+'-voice-'+hash(JSON.stringify(voices)).slice(0,8);
const temporary=path+'.voice-tmp';await writeFile(temporary,JSON.stringify(catalog,null,2)+'\n');await rename(temporary,path);
console.log(JSON.stringify({clips:lines.length,bytes,root:out,revision}));
