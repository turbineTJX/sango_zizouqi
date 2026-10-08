import fs from 'node:fs';
import {TACTIC_DESIGNS as T} from '../data/design/tactics.mjs';
import {TRAIT_DESIGNS as R} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS as A} from '../data/design/assignments.mjs';
export function edit(p,a,b){const s=fs.readFileSync(p,'utf8');if(!s.includes(a))throw Error(p+': '+a);fs.writeFileSync(p,s.replaceAll(a,b));}
function record(p,id,old,next){edit(p,'  '+JSON.stringify(id)+': '+JSON.stringify(old,null,2).replaceAll('\n','\n  '),'  '+JSON.stringify(id)+': '+JSON.stringify(next,null,2).replaceAll('\n','\n  '));}
function tactic(id,patch,remove=[]){const n={...T[id],...patch};for(const k of remove)delete n[k];record('data/design/tactics.mjs',id,T[id],n);}
tactic('blight',{threshold:35,cooldown:35,maxUses:2,learningTier:'low',tempoRole:'基础铺垫',description:'对2格内一队敌军造成谋略伤害，并施加疫伤6回合：持续损失兵力，救治效果降低50%；可救护解除',role:'近程减疗'});
tactic('anchor',{description:'自身获得抛锚8回合：停止移动，普攻最大射程增加1；不改变最小射程与战法范围',role:'水上射击阵地',tradeoff:'停止移动，不提供减伤'});
tactic('unique-person-516',{control:'root',steps:2,description:'攻击1格内目标及其相邻敌军，最多2队，造成武技伤害并尝试施加定身2回合；定身不阻止普攻、战法或ZOC'},['debuff']);
tactic('unique-person-371',{selfStatus:'attackHaste',selfStatusSteps:6,description:'攻击2格内一队敌军，造成武技伤害；自身获得速攻6回合，普攻间隔缩短20%；为自身2格内战意最低的另一队友军增加12战意'},['debuff','steps','selfWard','selfWardSteps']);
tactic('unique-person-636',{regrowthFraction:.012,regrowthSteps:6,shield:.04,description:'为3格内最多2队有伤兵的友军施加休整6回合，每回合救治兵力上限1.2%的已有伤兵，并给予护盾；护盾基础为兵力上限4%，受战法威力影响，持续8回合；救治受威力、真实伤兵与疫伤限制'},['heal','intent','buffs','buffSteps']);
edit('data/design/assignments.mjs','"crossbow": [\n    "screen"','"crossbow": [\n    "mirage"');
edit('data/design/assignments.mjs','"ram": [\n    "tremor"','"ram": [\n    "blight"');
edit('data/design/assignments.mjs','"tower": [\n    "nexus"','"tower": [\n    "cutRange"');
const gan=structuredClone(R['hero-person-119']);gan.description='骑兵、舰船首次入场获得伏兵4回合；从伏兵状态发动普攻显形后，获得速攻6回合，普攻间隔缩短20%，每场一次；受伤、接触后无法攻击或到期显形不提供速攻';gan.mechanics[0].steps=4;gan.mechanics.push({event:'revealAttack',effect:'selfStatus',troops:['cavalry','ship'],status:'attackHaste',steps:6,maxUses:1});record('data/design/traits.mjs','hero-person-119',R['hero-person-119'],gan);
edit('data/design/traits.mjs','export const TRAIT_DESIGNS = {','export const TRAIT_DESIGNS = {\n  "battleInsight": {"name":"察阵","tier":"专属","domain":"battle","description":"在场且未混乱、避战或撤离时保持洞察，识别2格内伏兵与疑兵，情报供己方共享；不造成伤害","mechanics":[{"event":"pulse","effect":"selfStatus","status":"insight","steps":1,"interval":1}]},');
record('data/design/assignments.mjs','person-294',A['person-294'],{...A['person-294'],traits:A['person-294'].traits.map(k=>k==='calm'?'battleInsight':k)});
edit('data/design/schema.mjs','"targetRear", "meleeSustain"','"selfStatus", "selfStatusSteps", "regrowthFraction", "regrowthSteps", "targetRear", "meleeSustain"');
edit('data/design/schema.mjs','export const ENGINE_TRAIT_IDS=[','export const ENGINE_TRAIT_IDS=["battleInsight",');
edit('trait-mechanics.mjs',"'enemyCommand'];","'enemyCommand','revealAttack'];");
edit('trait-mechanics.mjs',"'armySpeed'];","'armySpeed','selfStatus'];");
edit('trait-effects.mjs',"case 'entryStealth':case 'phase':case 'rallySelf':case 'commandRefund':targets=[u];break;","case 'selfStatus':case 'entryStealth':case 'phase':case 'rallySelf':case 'commandRefund':targets=[u];break;");
edit('trait-effects.mjs',"case 'entryStealth':status(u,'stealth',r.steps);","case 'selfStatus':{const active=hasStatus(b,u,r.status);status(u,r.status,r.steps);if(!active)api.signal(u,u,name);break;}\n    case 'entryStealth':status(u,'stealth',r.steps);");
edit('engine.mjs',"breakStealth(b,u,'发动普攻');","if(breakStealth(b,u,'发动普攻'))traitEvent(b,u,'revealAttack');");
edit('engine.mjs',"status(target,'plague',10,{sourceId:u.id,amount:Math.round(power*.025)})","status(target,'plague',6,{sourceId:u.id,amount:Math.round(power*.025)})");
edit('engine.mjs','if(s.heal)heal(t,s.heal);',"if(s.heal)heal(t,s.heal);\n          if(s.regrowthFraction)status(t,'regrowth',s.regrowthSteps,{amount:boosted(t.maxHp*s.regrowthFraction,t,'healing'),sourceId:u.id});");
edit('engine.mjs','if(s.selfCleanse){',"if(s.selfStatus)status(u,s.selfStatus,s.selfStatusSteps);\n      if(s.selfCleanse){");
edit('tactics.mjs','if(s.heal)score+=',"if(s.regrowthFraction&&!hasStatus(b,a,'regrowth'))score+=Math.min(recoverableWounded(a),a.maxHp*s.regrowthFraction*s.regrowthSteps)/10;\n  if(s.heal)score+=");
edit('unit-stats.mjs',"on('emplaced')?1:0)-(on('shortRange')", "on('emplaced')?1:0,on('anchored')?statusValue(u,'anchored','amount'):0)-(on('shortRange')");
edit('unit-stats.mjs',"*(on('anchored')?1-statusFraction(u,'anchored',.25):1)",'');
edit('data/design/battle-statuses.mjs','"description": "减伤 25%，停止移动"','"amount": 1,\n    "description": "停止移动，普攻最大射程增加1；不改变最小射程与战法范围"');
edit('status-display.mjs','anchored:`减伤 ${p(25)}%，停止移动`','anchored:`停止移动，普攻最大射程 +1`');
edit('tactic-power.mjs',"taunt:'挑衅'","taunt:'嘲讽',root:'定身'");
edit('tactic-power.mjs',"if(s.effect==='confuse'", "if(s.control==='root')checks.push('root');\n  if(s.effect==='confuse'");
edit('combat-rules.mjs','RULES_VERSION = 74','RULES_VERSION = 75');
const manifest=JSON.parse(fs.readFileSync('docs/current-docs.json'));manifest.rulesVersion=75;fs.writeFileSync('docs/current-docs.json',JSON.stringify(manifest,null,2)+'\n');
