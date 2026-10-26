import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ASSET_ROOT,PROJECT_ROOT} from '../asset-workspace.mjs';
import {allOfficerVoiceLines,VOICE_PROFILES} from '../officer-voice-lines.mjs';

// Authoring tool only. The game plays completed files on every platform.
if(process.platform!=='win32')throw Error('此制作工具需要 Windows 中文语音。游戏播放不依赖 Windows。');
const lines=allOfficerVoiceLines(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const revision='synth-cn-v2-'+hash(JSON.stringify({lines,profiles:VOICE_PROFILES})).slice(0,8),out=resolve(ASSET_ROOT,'voices',revision),work=resolve(PROJECT_ROOT,'.local','voice-tools');
await mkdir(out,{recursive:true});await mkdir(work,{recursive:true});
const jobs=[];
for(const line of lines){const target=resolve(out,line.id+'.wav');let exists=false;try{exists=(await stat(target)).size>44;}catch{}if(!exists)jobs.push({...line,...VOICE_PROFILES[line.profile],target});}
const jobsPath=resolve(work,'jobs.json'),script=resolve(work,'render.ps1');
await writeFile(jobsPath,JSON.stringify(jobs),'utf8');
await writeFile(script,'\ufeff'+String.raw`param([string]$Jobs)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $available = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'zh-CN' })
 if ($available.Count -eq 0) { throw 'No installed Mandarin voice' }
 $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
 foreach ($job in (Get-Content -LiteralPath $Jobs -Raw -Encoding UTF8 | ConvertFrom-Json)) {
  $gender = if ($job.gender -eq 'female') { 'Female' } else { 'Male' }
  $match = $available | Where-Object { $_.VoiceInfo.Gender.ToString() -eq $gender } | Select-Object -First 1
  if (-not $match) { $match = $available[0] }
  $synth.SelectVoice($match.VoiceInfo.Name)
  $synth.SetOutputToWaveFile($job.target, $format)
  $rate = [int](($job.rate - 1) * 100)
  $rateText = if ($rate -ge 0) { '+' + $rate + '%' } else { [string]$rate + '%' }
  $pitch = [int](($job.pitch - 1) * 60)
  $text = [System.Security.SecurityElement]::Escape($job.text)
  $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN"><prosody rate="' + $rateText + '" pitch="' + $pitch + '%">' + $text + '</prosody></speak>'
  $synth.SpeakSsml($ssml)
  $synth.SetOutputToNull()
 }
} finally { $synth.Dispose() }
`,'utf8');
if(jobs.length)await new Promise((ok,fail)=>{const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Jobs',jobsPath],{windowsHide:true,stdio:'inherit'});child.on('error',fail);child.on('exit',code=>code===0?ok():fail(Error('Voice rendering failed: '+code)));});
const voices={};let bytes=0;
for(const line of lines){
 const path=resolve(out,line.id+'.wav');let data=await readFile(path);if(data.toString('ascii',0,4)!=='RIFF')throw Error('Invalid WAV: '+line.id);
 let offset=12,duration=0,byteRate=0;
 while(offset+8<=data.length){
  const kind=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);if(kind==='fmt ')byteRate=data.readUInt32LE(offset+16);
  if(kind==='data'){
   const pcm=data.subarray(offset+8,offset+8+size);let first=pcm.length,last=0,peak=0;
   for(let i=0;i<pcm.length;i+=2){const value=Math.abs(pcm.readInt16LE(i));peak=Math.max(peak,value);if(value>180){first=Math.min(first,i);last=i;}}
   if(peak<500)throw Error('Silent voice: '+line.id);
   const start=Math.max(0,first-1920),end=Math.min(pcm.length,last+3200),trimmed=Buffer.from(pcm.subarray(start,end));
   const gain=Math.min(3,24000/peak);for(let i=0;i<trimmed.length;i+=2)trimmed.writeInt16LE(Math.round(trimmed.readInt16LE(i)*gain),i);
   const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+trimmed.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(16000,24);header.writeUInt32LE(32000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(trimmed.length,40);
   data=Buffer.concat([header,trimmed]);duration=trimmed.length/32000;await writeFile(path,data);break;
  }
  offset+=8+size+(size%2);
 }
 if(!Number.isFinite(duration)||duration<.1||duration>12)throw Error('Invalid voice duration: '+line.id);
 voices[line.id]={url:'./assets/voices/'+revision+'/'+line.id+'.wav',text:line.text,duration,sha256:hash(data)};bytes+=data.length;
}
const credits={version:1,kind:'synthesized-speech',language:'zh-CN',source:'Windows installed Mandarin speech synthesis',text:'Original Sango game dialogue',profiles:VOICE_PROFILES,clips:lines.length};
await writeFile(resolve(out,'credits.json'),JSON.stringify(credits,null,2)+'\n');
const path=resolve(ASSET_ROOT,'manifest.json'),catalog=JSON.parse(await readFile(path,'utf8'));
catalog.voices=voices;catalog.voiceCredits='./assets/voices/'+revision+'/credits.json';catalog.revision=catalog.revision.replace(/-voice-[a-f0-9]+$/,'')+'-voice-'+hash(JSON.stringify(voices)).slice(0,8);
await writeFile(path,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({clips:lines.length,bytes,root:out,revision}));
