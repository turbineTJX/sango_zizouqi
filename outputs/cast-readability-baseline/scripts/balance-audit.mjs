// Reproducible exploratory balance audit. Does not change game rules or saves.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { SCENARIOS, createScenario } from '../scenarios.mjs';
import { activeUnits, stepBattle, issueCommand, lockDeployment, settleBattle, unitAttributes, COMBAT } from '../engine.mjs';
import { hasStatus, unitTactics } from '../tactics.mjs';
import { hexDistance } from '../hex-grid.mjs';
import {commandTrial} from './calibrate-trials.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const out = fileURLToPath(new URL(`../docs/balance-audit-v${RULES_VERSION}/`, import.meta.url));
mkdirSync(out, { recursive: true });
const mean = xs => xs.reduce((a,b)=>a+b,0)/xs.length;
const round = n => Math.round(n*100)/100;
const rows = [];

function run(config, seed, mode='baseline', shield=20) {
  const state=createScenario(config.id,seed,shield), b=state.battle;
  if (['aggressive','defensive'].includes(mode)) b.sides[0].tactic=mode;
  if (mode==='level1') for(const u of b.sides[0].units) u.level=1;
  if (mode==='mixed' || mode==='both-mixed') for(const side of (mode==='mixed'?[b.sides[0]]:b.sides)) for(const u of side.units) {
    if(u.intellect>u.force) u.tactics=({crossbow:['seal','repeat',u.id==='jia'?'undermine':'screen'],archer:['wildfire','fire','smoke'],spear:['ward','thrust','doubt'],cavalry:['harass','rush','relay']})[u.type];
  }
  const detail = new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,{id:u.id,name:u.name,side:u.side,type:u.type,tactics:unitTactics(u).map(s=>s.id),activeTicks:0,blocked:0,phalanxOutOfRange:0,damage:0,gateDamage:0,firstHit:null,entry:null}]));
  let firstGateHit=null,commands=0,firstReady=null, idleFull=0,firstLowCast=null,thirdWaveEntered=false;
  lockDeployment(b);
  while(!b.result) {
    if(b.commandProgress>=12000) {
      firstReady ??= b.tick;
      if(mode==='adaptive') {
        const serial=b.commandSerial;commandTrial(b);commands+=b.commandSerial-serial;
        if(b.commandSerial===serial)idleFull++;
      }
      const command=mode==='rotate'?'reserve':mode==='focus-gate'?'focus':['firestorm','assault','fortify','demoralize'].includes(mode)?mode:null;
      if(command && issueCommand(b,command,command==='focus'?'siege-gate':null)===null) commands++;
      else if(mode!=='adaptive')idleFull++;
    }
    stepBattle(b);
    for(const u of b.sides.flatMap(s=>s.units))assert.ok(u.intent<=COMBAT.intentCap&&u.intent>=0);
    if(b.sides.flatMap(s=>s.units).some(u=>unitTactics(u).some(s=>s.threshold<=30&&u.tacticCasts[s.id])))firstLowCast??=b.tick;
    thirdWaveEntered ||= b.sides[1].units.some(u=>u.wave===3&&u.status==='active');
    const live=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
    assert.equal(new Set(live.map(u=>`${u.x},${u.y}`)).size,live.length);
    for(const side of [0,1]) assert.ok(activeUnits(b,side).length<=6);
    for(const u of live) {
      const d=detail.get(u.id);d.activeTicks++;d.entry ??= b.tick;
      if(u.action==='调整阵线') d.blocked++;
      if(hasStatus(b,u,'phalanx') && activeUnits(b,1-u.side).length && activeUnits(b,1-u.side).every(e=>hexDistance(u,e)>unitAttributes(u,b).range)) d.phalanxOutOfRange++;
    }
    for(const e of b.effects) if(e.damage>0) {
      const d=detail.get(e.from);if(!d)continue;
      // DOT events carry the victim as from; exclude these from actor attribution.
      if(e.text==='灼烧'||e.text==='火攻')continue;
      d.damage+=e.damage;d.firstHit ??= b.tick;
      if(e.to==='siege-gate') {d.gateDamage+=e.damage;firstGateHit ??= b.tick;}
    }
    assert.ok(b.tick<=config.limit);
  }
  const units=b.sides.flatMap(s=>s.units).map(u=>({...detail.get(u.id),hp:u.hp,status:u.status,intent:u.intent,casts:u.tacticCasts}));
  const result={scenario:config.id,seed,mode,shield,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,seconds:round(b.tick*.7),remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),gate:b.siege?.gate.hp??null,firstGateHit,commands,firstReady,idleFull,firstLowCast,thirdWaveEntered,combos:b.comboCounts,units};
  const report=settleBattle(state);
  for(const s of report.stats)assert.equal(s.initial,s.remaining+s.wounded+s.killed);
  result.casualties=report.stats;
  return result;
}

function batch(config,mode,n,shield=20) {
  const games=Array.from({length:n},(_,i)=>run(config,config.seed+i,mode,shield));
  rows.push(...games);
  const summary={scenario:config.id,mode,shield,n,wins:games.filter(g=>g.winner===0).length,draws:games.filter(g=>g.winner===null).length,seconds:round(mean(games.map(g=>g.seconds))),remaining:[0,1].map(s=>round(mean(games.map(g=>g.remaining[s])))),gateBreaks:games.filter(g=>g.reason==='城门失守').length,timeouts:games.filter(g=>g.reason==='久战收兵').length,commands:round(mean(games.map(g=>g.commands))),gateMean:config.gateHp?round(mean(games.map(g=>g.gate))):null,firstLowCast:round(mean(games.filter(g=>g.firstLowCast!==null).map(g=>g.firstLowCast))),thirdWaveEntered:games.filter(g=>g.thirdWaveEntered).length};
  console.log(JSON.stringify(summary));return summary;
}
const summaries=[];
for(const config of SCENARIOS) summaries.push(batch(config,'baseline',100));
for(const config of SCENARIOS) summaries.push(batch(config,'adaptive',100));
for(const config of SCENARIOS) for(const mode of ['firestorm','assault','fortify','demoralize','rotate','mixed','aggressive','defensive','level1']) summaries.push(batch(config,mode,30));
for(const config of SCENARIOS.filter(c=>c.gateHp)) {
  for(const shield of [0,50,100]) summaries.push(batch(config,'baseline',30,shield));
  if(config.id==='siege')summaries.push(batch(config,'focus-gate',30));
}
for(const config of SCENARIOS) summaries.push(batch(config,'both-mixed',30));
writeFileSync(out+'/runs.json.gz',gzipSync(JSON.stringify(rows)));
writeFileSync(out+'/summary.json',JSON.stringify(summaries,null,2)+'\n');
writeFileSync(out+'/default-seeds.json',JSON.stringify(rows.filter(r=>r.mode==='baseline'&&r.shield===20&&r.seed===SCENARIOS.find(s=>s.id===r.scenario).seed),null,2)+'\n');
console.log(`Audit complete: ${rows.length} battles; ${out}`);
