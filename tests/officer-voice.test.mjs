import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {allOfficerVoiceLines,officerVoiceLine,officerVoiceProfile,VOICE_PROFILES} from '../officer-voice-lines.mjs';
import {BattleVoiceReader,StrategicVoiceReader,isVoiceRuler} from '../officer-voice-events.mjs';
import {OfficerVoicePlayer,selectOfficerDeviceVoice} from '../officer-voice-player.mjs';
import {sanitizeVoiceCatalog,catalogAssetURLs} from '../asset-catalog.mjs';
import {bundleAssetPack,validateAssetPack} from '../scripts/asset-pack.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {newCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {appendActivityNode} from '../activity-nodes.mjs';
import {ACTIONS} from '../domestic-designs.mjs';

test('all 832 officers have Mandarin dialogue and famous officers resolve by stable ID',()=>{
 const lines=allOfficerVoiceLines(),ids=new Set(lines.map(l=>l.id));assert.equal(ids.size,lines.length);
 for(const o of OFFICER_CATALOG){
  assert.ok(ids.has(officerVoiceLine(o,'start',{signature:true}).id));
  for(const event of ['tactic','order','retreat','victory','acknowledge','complete','recruit','scout'])assert.ok(ids.has(officerVoiceLine(o,event).id));
  if(o.sex===1)assert.equal(officerVoiceProfile(o),'female');
 }
 assert.match(officerVoiceLine(OFFICER_BY_ID['person-433'],'start',{signature:true}).text,/张飞/);
 assert.notEqual(officerVoiceLine(OFFICER_BY_ID.cao,'start',{signature:true}).text,officerVoiceLine(OFFICER_BY_ID['person-290'],'start',{signature:true}).text);
 for(const event of ['acknowledge','complete','discovered','scout']){const line=officerVoiceLine(OFFICER_BY_ID.cao,event,{sovereign:true});assert.ok(ids.has(line.id));assert.doesNotMatch(line.text,/主公|臣/);}
 assert.equal(isVoiceRuler({campaign:{playerFaction:'cao'}},'cao'),true);assert.equal(isVoiceRuler({campaign:{playerFaction:'yuan'}},'cao'),false);
});

test('voice readers observe a complete real battle without changing game state, saves or random sequence',()=>{
 const a=createScenario('custom-battle',521),b=structuredClone(a),reader=new BattleVoiceReader(),heard=new Set();
 assert.deepEqual(reader.read(a.battle),[]);lockDeployment(a.battle);lockDeployment(b.battle);
 for(const c of reader.read(a.battle))heard.add(c.event);
 for(let i=0;i<600&&!a.battle.result;i++){
  stepBattle(a.battle);stepBattle(b.battle);const before=structuredClone(a);
  for(const c of reader.read(a.battle)){heard.add(c.event);assert.ok(c.name&&c.officerId);}
  assert.deepEqual(reader.read(a.battle),[]);assert.deepEqual(a,before);
 }
 assert.ok(a.battle.result);assert.ok(heard.has('start'));assert.ok(heard.has('tactic'));assert.ok(heard.has('victory')||heard.has('draw'));assert.deepEqual(a,b);
 assert.deepEqual(reader.read(structuredClone(a.battle)),[]);
});

test('hidden speakers, hidden targets, decoys and ongoing effects stay silent; multi-target casts speak once',()=>{
 const b=createScenario('custom-battle',521).battle;lockDeployment(b);
 const own=b.sides[0].units.find(u=>u.status==='active'),enemy=b.sides[1].units.find(u=>u.status==='active'),r=new BattleVoiceReader();r.read(b);
 const e={from:enemy.id,to:own.id,label:'火计',skill:true};enemy.statuses.stealth={until:1000};b.effects=[e];assert.deepEqual(r.read(b),[]);
 delete enemy.statuses.stealth;b.tick++;b.effects=[e,{...e,to:enemy.id},{...e,ongoing:true}];assert.equal(r.read(b).length,1);
 b.tick++;b.effects=[{...e,ongoing:true},{...e,enchantment:true},{...e,phase:'cast'}];assert.deepEqual(r.read(b),[]);
 b.tick++;b.effects=[{...e,abilityKind:'trait'},{...e,damageKind:'dot'},{...e,combo:{level:2}}];assert.deepEqual(r.read(b),[]);
 own.withdrawing=true;enemy.status='defeated';b.tick++;b.effects=[];assert.deepEqual(r.read(b),[],'individual withdrawals and casualties do not produce incidental dialogue');
 own.withdrawing=false;enemy.status='active';
 b.tick++;b.effects=[e];assert.deepEqual(r.read(b,{audible:false}),[]);assert.deepEqual(r.read(b),[]);
 enemy.statuses.stealth={until:1000};b.commandSerial++;b.lastCommand={key:'fortify',source:{id:own.id}};b.enemyCommand.commandSerial++;b.enemyCommand.lastCommand={key:'fortify',source:{id:enemy.id}};
 const orders=r.read(b);assert.equal(orders.length,1);assert.equal(orders[0].officerId,own.id);assert.equal(orders[0].side,0);
 r.read(null);assert.deepEqual(r.read(b),[],'returning to a battle primes the current snapshot');
});

test('strategic speech waits for a new important player report to be presented; routine scouting stays silent',()=>{
 const s=newCampaign(41,'guandu-200','cao'),r=new StrategicVoiceReader(),id=s.campaign.idle.find(o=>o.faction==='cao').unit.id;
 assert.deepEqual(r.read(s),[]);
 const add=(sourceId,faction='cao',category='domestic',phase='complete')=>appendActivityNode(s,{sourceId,category,phase,faction,officerId:id,cityId:'xuchang',key:category==='domestic'?Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='build'):null,text:'事项完成'});
 const scout=add('voice-scout','cao','personnel','SCOUT_INTEL');assert.deepEqual(r.read(s,{reportIds:[scout.id]}),[]);
 const own=add('voice-own'),enemy=add('voice-enemy','yuan');const before=JSON.stringify(s);
 assert.deepEqual(r.read(s),[],'new ledger entries alone must not start speech');
 const lines=r.read(s,{reportIds:[own.id,enemy.id]});
 assert.equal(lines.length,1);assert.equal(lines[0].officerId,id);assert.equal(lines[0].event,'complete');assert.equal(lines[0].reportId,own.id);assert.match(lines[0].context,/许昌.*任务完成/);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(r.read(s,{reportIds:[own.id]}),[],'redraw and reopening do not repeat a report');
 const hidden=add('voice-hidden');assert.deepEqual(r.read(s,{audible:false,reportIds:[hidden.id]}),[]);assert.deepEqual(r.read(s,{reportIds:[hidden.id]}),[]);
 const loaded=structuredClone(s);assert.deepEqual(r.read(loaded,{reportIds:loaded.campaign.activity.nodes.map(n=>n.id)}),[]);
 assert.deepEqual(r.read(s,{faction:'yuan'}),[]);
});

test('report batches speak once and do not queue unseen, read or routine completion reports',()=>{
 const s=newCampaign(42,'guandu-200','cao'),r=new StrategicVoiceReader(),id=s.campaign.idle.find(o=>o.faction==='cao').unit.id;r.read(s);
 const add=(sourceId,category,phase,key=null)=>appendActivityNode(s,{sourceId,category,phase,key,faction:'cao',officerId:id,cityId:'xuchang',text:'事项报告'});
 const found=add('found','talent','discovered'),recruit=add('signed','talent','signed');assert.deepEqual(r.read(s),[]);
 const reportIds=[found.id,recruit.id],lines=r.read(s,{reportIds});assert.equal(lines.length,1);assert.equal(lines[0].event,'recruit');assert.deepEqual(r.read(s,{reportIds}),[]);
 const read=add('already-read','talent','signed');r.read(s);read.read=true;assert.deepEqual(r.read(s,{reportIds:[read.id]}),[]);
 const routine=add('routine','domestic','complete',Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='cash'));
 assert.deepEqual(r.read(s,{reportIds:[routine.id]}),[]);
 const unseen=add('unseen-before-background','talent','signed');r.read(s);r.read(s,{audible:false});assert.deepEqual(r.read(s,{reportIds:[unseen.id]}),[]);
});

test('strategic voice observation preserves a real campaign through natural daily processing',()=>{
 const a=newCampaign(97,'guandu-200','cao',{allAI:true}),b=structuredClone(a),r=new StrategicVoiceReader();r.read(a);
 for(let i=0;i<15;i++){
  if(a.campaign.phase==='planning'){beginExecution(a);beginExecution(b);}
  advanceCampaignDay(a);advanceCampaignDay(b);r.read(a,{reportIds:a.campaign.activity.nodes.map(n=>n.id)});assert.deepEqual(a,b);
  if(a.pending||a.finished)break;
 }
});

function playbackFixture(options={}){
 let time=10000,active=true;const prefs={muted:false,voice:.8},announced=[],ducks=[],sources=[];
 const context={currentTime:1,destination:{},async decodeAudioData(){return {duration:2};},createBufferSource(){const s={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;},createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}};
 const p=new OfficerVoicePlayer({context:()=>context,preferences:()=>prefs,active:()=>active,onVoice:l=>announced.push(l),onDuck:v=>ducks.push(v),now:()=>time,speech:null,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),...options});
 return {p,prefs,announced,ducks,sources,context,setTime:t=>time=t,setActive:v=>active=v};
}
const first={...officerVoiceLine(OFFICER_BY_ID.cao,'start',{signature:true}),priority:8};
const clip=line=>({url:'./assets/voices/'+line.id+'.wav',text:line.text,duration:2,sha256:'a'.repeat(64)});

test('recorded speech has one channel, decisive interruptions, cooldowns, ducking and immediate mute',async()=>{
 const f=playbackFixture(),{p}=f;p.setLibrary({[first.id]:clip(first)});
 assert.equal(await p.play(first),true);assert.ok(f.sources[0].started);assert.equal(f.announced.at(-1).officerId,'cao');assert.equal(f.ducks.at(-1),true);
 assert.equal(await p.play(first),false,'same line cannot repeat immediately');
 assert.equal(await p.play({...first,id:'other',priority:5}),false,'low priority does not interrupt');
 const victory={...officerVoiceLine(OFFICER_BY_ID.cao,'victory'),priority:10,terminal:true};p.library[victory.id]=clip(victory);
 assert.equal(await p.play(victory),true);assert.ok(f.sources[0].stopped);assert.equal(p.current.line.event,'victory');
 f.prefs.voice=0;p.updateVolume();assert.equal(p.current,null);assert.equal(f.ducks.at(-1),false);assert.equal(f.announced.at(-1),null);assert.equal(await p.play(first),false);
 p.destroy();
});

test('late or failed clip loads cannot start after hiding, muting, changing scenes or destroying audio',async()=>{
 let resolveFetch;const f=playbackFixture({fetcher:()=>new Promise(ok=>{resolveFetch=ok;})});f.p.setLibrary({[first.id]:clip(first)});
 const loading=f.p.play(first);f.setActive(false);f.p.stop();resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 assert.equal(await loading,false);assert.equal(f.sources.length,0);assert.equal(f.announced.filter(Boolean).length,0);f.p.destroy();
 const unavailable=playbackFixture({fetcher:async()=>{throw Error('offline');}});unavailable.p.setLibrary({[first.id]:clip(first)});assert.equal(await unavailable.p.play(first),false);assert.equal(unavailable.p.lastUnavailable,true);unavailable.p.destroy();
});

test('missing recordings fall back only to Mandarin and stop their utterance on cancellation',async()=>{
 const spoken=[];let cancelled=0;const speech={getVoices:()=>[{lang:'en-US',name:'English'},{lang:'zh-CN',name:'Microsoft Kangkang',localService:true}],speak:u=>{spoken.push(u);u.onstart();},cancel:()=>cancelled++};
 const f=playbackFixture({speech,Utterance:class{constructor(text){this.text=text;}}});assert.equal(await f.p.play(first),true);assert.equal(spoken.length,1);assert.equal(spoken[0].lang,'zh-CN');assert.equal(spoken[0].text,first.text);
 f.p.stop();assert.equal(cancelled,1);assert.equal(f.announced.at(-1),null);f.p.destroy();
 const english=playbackFixture({speech:{...speech,getVoices:()=>[{lang:'en-US',name:'English'}]},Utterance:class{}});assert.equal(await english.p.play(first),false);english.p.destroy();
});

test('device voices match the intended gender and role rather than falling back to the default woman',async()=>{
 const female={lang:'zh-CN',name:'Microsoft Huihui',localService:true},male={lang:'zh-CN',name:'Microsoft Kangkang',localService:true},warrior={lang:'zh-CN',name:'Microsoft Yunjian',localService:true},scholar={lang:'zh-CN',name:'Microsoft Yunxi',localService:true};
 const voices=[female,male,warrior,scholar];
 assert.equal(selectOfficerDeviceVoice(voices,VOICE_PROFILES.commander),male);
 assert.equal(selectOfficerDeviceVoice(voices,VOICE_PROFILES.warrior),warrior);
 assert.equal(selectOfficerDeviceVoice(voices,VOICE_PROFILES.scholar),scholar);
 assert.equal(selectOfficerDeviceVoice(voices,VOICE_PROFILES.female),female);
 assert.equal(selectOfficerDeviceVoice([{lang:'en-US',name:'Male'},female],VOICE_PROFILES.commander),null);
 assert.equal(selectOfficerDeviceVoice([{lang:'zh-CN',name:'Unknown Chinese'}],VOICE_PROFILES.commander),null);
 const spoken=[],speech={getVoices:()=>[female],speak:u=>{spoken.push(u);u.onstart();},cancel(){}};
 const f=playbackFixture({speech,Utterance:class{constructor(text){this.text=text;}}});
 assert.equal(await f.p.play(first),false);assert.equal(spoken.length,0,'a male officer stays silent when only a female voice exists');
 const woman=OFFICER_CATALOG.find(o=>o.sex===1);assert.equal(await f.p.play(officerVoiceLine(woman,'acknowledge')),true);assert.equal(spoken[0].voice,female);f.p.destroy();
});

test('device speech waits briefly for the matching voice inventory and recordings retain priority',async()=>{
 let voices=[{lang:'zh-CN',name:'Microsoft Huihui'}],changed;const spoken=[];
 const male={lang:'zh-CN',name:'Microsoft Kangkang'},speech={getVoices:()=>voices,addEventListener:(event,listener)=>{changed=listener;},removeEventListener:(event,listener)=>{assert.equal(listener,changed);},speak:u=>{spoken.push(u);u.onstart();},cancel(){}};
 const f=playbackFixture({speech,Utterance:class{constructor(text){this.text=text;}}}),pending=f.p.play(first);
 assert.equal(spoken.length,0);voices.push(male);changed();assert.equal(await pending,true);assert.equal(spoken[0].voice,male);f.p.destroy();
 const recorded=playbackFixture({speech:{getVoices(){throw Error('Recordings must not need device voices');}}});recorded.p.setLibrary({[first.id]:clip(first)});
 assert.equal(await recorded.p.play(first),true);assert.ok(recorded.p.current.source);recorded.p.destroy();
});

test('slow recording failures and delayed device speech expire instead of speaking outside their event',async()=>{
 const spoken=[],speech={getVoices:()=>[{lang:'zh-CN',name:'Microsoft Kangkang',localService:true}],speak:u=>spoken.push(u),cancel(){}};
 let rejectFetch;const f=playbackFixture({speech,Utterance:class{constructor(text){this.text=text;}},fetcher:()=>new Promise((ok,no)=>{rejectFetch=no;})});
 f.p.setLibrary({[first.id]:clip(first)});const pending=f.p.play(first);f.setTime(12000);rejectFetch(Error('late failure'));
 assert.equal(await pending,false);assert.equal(spoken.length,0);assert.equal(f.p.current,null);f.p.destroy();
 const delayed=playbackFixture({speech,Utterance:class{constructor(text){this.text=text;}}});
 assert.equal(await delayed.p.play(first),true);delayed.setTime(12000);spoken.at(-1).onstart();
 assert.equal(delayed.p.current,null);assert.equal(delayed.announced.filter(Boolean).length,0);delayed.p.destroy();
});

test('voice assets, text and hashes survive independent bundling; malformed or tampered clips fail validation',async t=>{
 const base=resolve(tmpdir()),root=await mkdtemp(join(base,'sango-voices-'));t.after(async()=>{assert.equal(dirname(root),base);assert.ok(basename(root).startsWith('sango-voices-'));await rm(root,{recursive:true,force:true});});
 const source=join(root,'source'),audio=Buffer.from('RIFF-voice-fixture'),entry={...clip(first),sha256:createHash('sha256').update(audio).digest('hex')};await mkdir(join(source,'voices'),{recursive:true});
 const raw={version:1,id:'voice-test',voices:{[first.id]:entry},voiceCredits:'./assets/voices/credits.json'};
 await writeFile(join(source,'manifest.json'),JSON.stringify(raw));await writeFile(join(source,'voices',first.id+'.wav'),audio);await writeFile(join(source,'voices/credits.json'),'{}');await writeFile(join(source,'voices/private.json'),'private');
 const pack=await bundleAssetPack(join(root,'bundle'),source);assert.equal(pack.files.size,2);assert.deepEqual(pack.catalog.voices,raw.voices);assert.ok(catalogAssetURLs(raw).includes(entry.url));assert.ok((await readFile(join(root,'bundle','voices',first.id+'.wav'))).equals(audio));
 for(const patch of [{url:'https://invalid.test/clip.wav'},{duration:Infinity},{duration:20},{sha256:'bad'},{text:''}])assert.deepEqual(sanitizeVoiceCatalog({[first.id]:{...entry,...patch}}),{});
 await writeFile(join(source,'voices',first.id+'.wav'),'tampered');await assert.rejects(validateAssetPack(source),/hash mismatch/);
});
