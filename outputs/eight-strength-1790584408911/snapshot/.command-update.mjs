import fs from 'node:fs';
const edit=(p,f)=>{const t=fs.readFileSync(p,'utf8');fs.writeFileSync(p,f(t));};
const replace=(p,a,b)=>edit(p,t=>{if(!t.includes(a))throw Error(p+': '+a);return t.replace(a,b);});
const path='data/design/stratagems.mjs';
let txt=fs.readFileSync(path,'utf8');
for(const [key,change] of Object.entries({
 'cao-wuchao':{name:'魏武挥鞭',group:'defense',duration:0,description:'我军在场各队获得魔免：解除并免疫所有战斗异常，仅承受物理普攻伤害；免疫战法、谋略普攻及持续与传导伤害。持续回合＝4＋⌊施放时自身军纪÷25⌋，最多12回合；不影响缺粮与主动代价',side:0,effect:'magicImmunity',disciplineDuration:{base:4,per:25,max:12}},
 'jia-speed':{duration:24,description:'选择一支在场友军，移动力 +1、攻击间隔缩短25%（攻速提高约33%）、无视ZOC，持续24回合；不穿越部队或不可通行地形',effect:'rapidAdvance',scope:{shape:'unit'}}
})){
 const start=txt.indexOf('  "'+key+'": {'),end=txt.indexOf('\n  },',start)+5;
 const obj=JSON.parse(txt.slice(start,end).replace(/^  "[^"]+": /,'').replace(/,$/,''));Object.assign(obj,change);delete obj.field;
 if(key==='cao-wuchao'){delete obj.baseStrength;delete obj.intentDrain;delete obj.weights;obj.history='名称取曹操统军意象；按部队军纪持续的全军防护为玩法机制，不对应史实中的超自然能力。';}
 txt=txt.slice(0,start)+'  "'+key+'": '+JSON.stringify(obj,null,2).replace(/\n/g,'\n  ')+','+txt.slice(end);
}
fs.writeFileSync(path,txt);
replace('data/design/schema.mjs','"scope",\n    "baseStrength"','"scope",\n    "disciplineDuration",\n    "baseStrength"');
replace('data/design/schema.mjs','"eightFormation",','"eightFormation",\n    "magicImmunity",\n    "rapidAdvance",');
replace('data/design/battle-statuses.mjs','export const STATUS_DEFINITIONS = {',`export const STATUS_DEFINITIONS = {
  "magicImmune": {"name":"魔免","icon":"shield","tone":"buff","priority":0,"description":"解除并免疫战斗异常，仅承受物理普攻伤害；不免除缺粮或主动代价"},
  "rapidAdvance": {"name":"神速","icon":"wind","tone":"buff","priority":2,"moveBonus":1,"attackFraction":0.25,"description":"移动力 +1，攻击间隔缩短25%，无视ZOC；不能穿越部队或不可通行地形"},`);
replace('design-catalog.mjs',"['army','reserve','circle','rectangle']","['army','reserve','circle','rectangle','unit']");
replace('design-catalog.mjs',"  if(s.maxUses!==undefined)",`  if(r?.shape==='unit')check(s.effect==='rapidAdvance'&&s.side===0&&Object.keys(r).length===1,path,'单队军略无效');
  if(s.effect==='magicImmunity'){const d=s.disciplineDuration;check(s.side===0&&r?.shape==='army'&&d&&Object.keys(d).length===3&&Number.isInteger(d.base)&&d.base>0&&numeric(d.per,1)&&Number.isInteger(d.max)&&d.max>=d.base,'stratagems.'+id,'军纪时长参数无效');}
  else check(s.disciplineDuration===undefined,'stratagems.'+id,'未接入军纪时长');
  if(s.maxUses!==undefined)`);
replace('stratagem-area.mjs',"['circle','rectangle'].includes(s?.scope?.shape)","['circle','rectangle','unit'].includes(s?.scope?.shape)");
replace('stratagem-area.mjs',' const a=areaPosition(point)'," if(s.scope.shape==='unit')return point.x===u.x&&point.y===u.y;\n const a=areaPosition(point)");
replace('stratagem-area.mjs',' const r=s.scope;',' const r=s.scope;\n if(r?.shape===\'unit\')return \'单支友军\';');
replace('stratagem-area.mjs',' if(s.zone)return'," if(s.effect==='rapidAdvance')return !statusOn(b,u,'rapidAdvance');\n if(s.effect==='magicImmunity')return !statusOn(b,u,'magicImmune');\n if(s.side===1&&statusOn(b,u,'magicImmune'))return false;\n if(s.zone)return");
replace('stratagem-area.mjs',' return (s.zone?.statuses'," if(statusOn(b,u,'magicImmune'))return [];\n return (s.zone?.statuses");
replace('stratagem-area-view.mjs',"r.shape==='circle'?", "r.shape==='unit'?`<circle cx=\"${c.x}\" cy=\"${c.y}\" r=\"0.48\"/>`:r.shape==='circle'?");
replace('stratagem-area-view.mjs',"'点击战场选择落点；Esc 取消'","(r.shape==='unit'?'点击一支友军；Esc 取消':'点击战场选择落点；Esc 取消')");
replace('stratagems.mjs',' if(s.zone)return'," if(s.zone||['magicImmunity','rapidAdvance'].includes(e))return");
replace('unit-stats.mjs',"import {statusValue}","import {statusValue}");
replace('unit-stats.mjs',"if(army('disruptUntil'))", "if(army('disruptUntil')&&!on('magicImmune'))");
replace('unit-stats.mjs',"if(on('haste')||army('hasteUntil'))", "if(on('rapidAdvance'))move.push({label:'兵贵神速',add:statusValue(u,'rapidAdvance','moveBonus')});\n if(!on('rapidAdvance')&&(on('haste')||army('hasteUntil')))");
replace('unit-stats.mjs',"(on('attackHaste')?1-statusValue(u,'attackHaste','fraction'):1)","(1-Math.max(on('attackHaste')?statusValue(u,'attackHaste','fraction'):0,on('rapidAdvance')?statusValue(u,'rapidAdvance','attackFraction'):0))");
edit('engagement.mjs',t=>t.replaceAll('traitIgnoresZoc(b,u)',"(traitIgnoresZoc(b,u)||statusOn(b,u,'rapidAdvance'))"));
replace('tactics.mjs',"if(NEGATIVE_STATUSES.includes(key)&&hasStatus(b,u,'stasis'))", "if(NEGATIVE_STATUSES.includes(key)&&(hasStatus(b,u,'stasis')||key!=='hunger'&&hasStatus(b,u,'magicImmune')))");
replace('battle-ai.mjs',"'assault','disrupt'","'assault','magicImmunity','disrupt'");
replace('battle-ai.mjs',"'range','haste'","'range','rapidAdvance','haste'");
replace('battle-ai.mjs','    haste:()=>true,',"    haste:()=>true,\n    rapidAdvance:()=>allies.some(u=>!hasStatus(b,u,'rapidAdvance')),\n    magicImmunity:()=>allies.some(u=>!hasStatus(b,u,'magicImmune')),");
replace('engine.mjs',"import {isAreaStratagem", "import {commandProtectionDuration,commandBlocksDamage} from './command-protection.mjs';\nimport {isAreaStratagem");
replace('engine.mjs',"const drainIntent=u=>{if(!isTargetable(b,u))", "const drainIntent=u=>{if(!isTargetable(b,u)||hasStatus(b,u,'magicImmune'))");
replace('engine.mjs',"    else if(effect==='heal')",`    else if(effect==='magicImmunity'||effect==='rapidAdvance'){
      for(const u of targets){
        if(!stratagemHasEffect(b,strategy,u))continue;
        const steps=effect==='magicImmunity'?commandProtectionDuration(unitAttributes(u,b).discipline):strategy.duration;
        if(effect==='magicImmunity')for(const key of NEGATIVE_STATUSES)if(key!=='hunger')delete u.statuses[key];
        const key=effect==='magicImmunity'?'magicImmune':'rapidAdvance';
        setStatus(b,u,key,steps,{sourceId:profile.id,sourceName:profile.name,sourceSkillName:strategy.name});
        if(provider)combatEffect(b,provider,u,true,0,'impact',{name:strategy.name,visual:'banner'},{text:strategy.name+' · '+steps+'回合',ongoing:true});
      }
    }
    else if(effect==='heal')`);
replace('engine.mjs',"  const kind=intellectual?",`  if(commandBlocksDamage(b,target,{skill,intellectual})){
    if(!skill&&!attack){attacker.cooldown=own.attackInterval;attacker.attackCarry=0;if(orb){orb.charges--;if(!orb.charges)delete attacker.statuses.attackOrb;}}
    combatEffect(b,attacker,target,skill,0,'impact',definition,{text:'魔免',damageKind:intellectual?'intellect':'force'});return 0;
  }
  const kind=intellectual?`);
replace('engine.mjs',"if(hasStatus(b,u,'resolve')||traitImmune(u,key))", "if(hasStatus(b,u,'resolve')||hasStatus(b,u,'magicImmune')||traitImmune(u,key))");
replace('engine.mjs',"const immune=traitImmune(t,key)||", "const immune=hasStatus(b,t,'magicImmune')||traitImmune(t,key)||");
replace('engine.mjs',"    if(['seal','taunt'].includes(key)","    if(t.side!==u.side&&hasStatus(b,t,'magicImmune')&&NEGATIVE_STATUSES.includes(key))return false;\n    if(['seal','taunt'].includes(key)");
replace('engine.mjs',"if(hasStatus(b,u,'stasis')||u.hp<=0)return;", "if(hasStatus(b,u,'stasis')||commandBlocksDamage(b,u,{secondary:true})||u.hp<=0)return;");
replace('engine.mjs',"u.hp>0&&!hasStatus(b,u,'stasis')&&hasStatus(b,u,key)","u.hp>0&&!hasStatus(b,u,'stasis')&&!hasStatus(b,u,'magicImmune')&&hasStatus(b,u,key)");
// Hostile morale drains have no status object; block them at their call sites.
edit('engine.mjs',t=>t.replaceAll('lowerIntent(t,boosted(',"(hasStatus(b,t,'magicImmune')?0:lowerIntent(t,boosted(").replace('boosted(s.drain+opening.drain),u);','boosted(s.drain+opening.drain),u));').replaceAll('lowerIntent(target,boosted(',"(hasStatus(b,target,'magicImmune')?0:lowerIntent(target,boosted(").replace('null,null,false),u);status(target,\'weaken\'','null,null,false),u));status(target,\'weaken\'').replace('boosted(s.drain+opening.drain),u);status(target,','boosted(s.drain+opening.drain),u));status(target,'));
replace('trait-effects.mjs',"  const enemies=b.sides[1-u.side].units.filter(t=>alive(t)&&isTargetable(b,t));", "  const enemies=b.sides[1-u.side].units.filter(t=>alive(t)&&isTargetable(b,t)&&!hasStatus(b,t,'magicImmune'));");
replace('combat-rules.mjs','RULES_VERSION = 72','RULES_VERSION = 73');
replace('docs/current-docs.json','"rulesVersion": 72','"rulesVersion": 73');
