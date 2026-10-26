// Authoring only. The FluidSynth binary and SoundFont stay in ignored .local/.
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ASSET_ROOT,PROJECT_ROOT} from '../asset-workspace.mjs';
import {AUDIO_TRACKS,scorePulse} from '../audio-score.mjs';
const out=resolve(PROJECT_ROOT,'.local/music-render'),rendered=resolve(out,'rendered');await mkdir(rendered,{recursive:true});
const scores=Object.entries(AUDIO_TRACKS).map(([id,track])=>({id,...track,events:Array.from({length:track.bars*8},(_,pulse)=>scorePulse(id,pulse).map(e=>({...e,pulse}))).flat()}));
await writeFile(resolve(out,'scores.json'),JSON.stringify(scores));
await new Promise((ok,no)=>{const p=spawn(process.env.PYTHON||'python',[resolve(PROJECT_ROOT,'scripts/render-orchestral-music.py'),resolve(out,'scores.json'),rendered],{cwd:PROJECT_ROOT,stdio:'inherit',windowsHide:true});p.on('error',no);p.on('exit',code=>code===0?ok():no(Error('Music render failed: '+code)));});
const report=JSON.parse(await readFile(resolve(rendered,'manifest.json'),'utf8')),target=resolve(ASSET_ROOT,'music/epic-v1');await mkdir(target,{recursive:true});
const music={};
for(const track of report){
 const filename=track.id+'.ogg',source=resolve(rendered,filename),bytes=await readFile(source),sha256=createHash('sha256').update(bytes).digest('hex');
 await copyFile(source,resolve(target,filename));music[track.id]={url:'./assets/music/epic-v1/'+filename,loopStart:0,loopEnd:track.seconds,sha256};
}
const credits={version:1,title:'三国·君临原创配乐',composition:'Original melodies and arrangements authored for this project; no reference-game music is included.',rendering:'FluidSynth 2.6.1',soundfont:{name:'GeneralUser GS v2.0.3',author:'S. Christian Collins',source:'https://github.com/mrbumpy409/GeneralUser-GS',license:await readFile(resolve(PROJECT_ROOT,'.local/music-tools/GeneralUser-GS-LICENSE.txt'),'utf8')},tracks:report};
await writeFile(resolve(target,'credits.json'),JSON.stringify(credits,null,2)+'\n');
const catalogPath=resolve(ASSET_ROOT,'manifest.json'),catalog=JSON.parse(await readFile(catalogPath,'utf8'));
catalog.music=music;catalog.musicCredits='./assets/music/epic-v1/credits.json';catalog.revision=String(catalog.revision).split('-music-')[0]+'-music-epic1-'+createHash('sha256').update(JSON.stringify(music)).digest('hex').slice(0,8);
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');console.log(JSON.stringify({tracks:report.length,minutes:report.reduce((n,t)=>n+t.seconds,0)/60,assetRoot:ASSET_ROOT,previews:rendered}));
