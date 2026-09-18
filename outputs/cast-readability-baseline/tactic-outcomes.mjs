import {STATUS_DISPLAY, statusRemaining} from './status-display.mjs';

// Capture only this synchronous cast; later DOT, regeneration and retaliation
// stay separate and are never advertised as damage/healing already delivered.
export function snapshotTactic(b) {
  return new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id, {
    intent:u.intent, x:u.x, y:u.y, statuses:structuredClone(u.statuses), ready:{...u.skillReady},
  }]));
}
export function tacticOutcome(b, caster, before, events) {
  const hits=events.filter(e=>e.from===caster.id&&!e.ongoing&&!e.combo);
  const units=[...b.sides.flatMap(s=>s.units),...(b.siege?[b.siege.gate]:[])];
  return units.flatMap(u=>{
    const old=before.get(u.id),own=hits.filter(e=>e.to===u.id),changes=[];
    if(old){
      for(const [key,s] of Object.entries(u.statuses)){
        if(s.until<=b.tick || JSON.stringify(s)===JSON.stringify(old.statuses[key]))continue;
        if(old.statuses[key]?.until===s.until && ['illusion','riposte'].includes(key))continue;
        if(key==='shield'){
          for(const layer of s.layers)if(!old.statuses.shield?.layers.some(l=>JSON.stringify(l)===JSON.stringify(layer)))
            changes.push(`护盾 ${layer.amount}（${statusRemaining(layer.until,b.tick)}步）`);
        }else{
          const info=STATUS_DISPLAY[key];
          changes.push(`${info?.name||key}${s.stacks?' '+s.stacks+'层':''}（${statusRemaining(s.until,b.tick)}步）${key==='ward'?'：减伤 '+s.percent+'%':info? '：'+info.description:''}`);
        }
      }
      for(const key of Object.keys(old.statuses))if(old.statuses[key].until>b.tick&&!u.statuses[key])changes.push(`解除${STATUS_DISPLAY[key]?.name||key}`);
      const intent=u.intent-old.intent;
      if(intent)changes.push(`战意 ${intent>0?'+':'−'}${Math.abs(intent)}`);
      const reductions=Object.keys(old.ready).map(id=>old.ready[id]-(u.skillReady[id]??old.ready[id])).filter(n=>n>0);
      if(reductions.length)changes.push(`冷却缩短最多 ${Math.max(...reductions)}步`);
      if(old.x!==u.x||old.y!==u.y)changes.push(`位移至 ${u.x+1},${u.y+1}`);
    }
    const sum=key=>own.reduce((n,e)=>n+(e[key]||0),0);
    const damage=sum('damage'),healing=sum('healing'),absorbed=sum('shieldAbsorbed');
    if(!own.length&&!changes.length)return [];
    return [{id:u.id,name:u.name,damage,healing,absorbed,changes,defeated:damage>0&&u.hp<=0}];
  });
}
export function outcomeLines(events) {
  const result=events.find(e=>e.outcome)?.outcome;
  if(result)return result.map(t=>{
    const parts=[];
    if(t.damage)parts.push(`实际损兵 ${t.damage}`);
    if(t.healing)parts.push(`恢复 ${t.healing}`);
    if(t.absorbed)parts.push(`护盾吸收 ${t.absorbed}`);
    parts.push(...t.changes);
    if(t.defeated)parts.push('溃败');
    return `${t.name}：${parts.join('；')||'无即时数值变化'}`;
  });
  const targets=new Map();
  for(const e of events){
    const key=e.to||e.targetName||e.name;
    const t=targets.get(key)||{name:e.targetName||e.name||'目标',damage:0,healing:0,texts:new Set()};
    t.damage+=e.damage||0;t.healing+=e.healing||0;
    if(e.text&&!e.healing)t.texts.add(e.text);
    if(e.intentBlock)t.texts.add(e.intentBlock);
    targets.set(key,t);
  }
  return [...targets.values()].map(t=>`${t.name}：${[t.damage?'实际损兵 '+t.damage:'',t.healing?'恢复 '+t.healing:'',...t.texts].filter(Boolean).join('；')||'无即时数值变化'}`);
}
