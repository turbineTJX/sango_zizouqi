import fs from 'node:fs';
import {STRATAGEM_DESIGNS as designs} from '../data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS as assignments} from '../data/design/assignments.mjs';
const write=(p,s)=>fs.writeFileSync(p,s+'\n');
const edit=(p,f)=>write(p,f(fs.readFileSync(p,'utf8')));
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b);};
designs['cao-wuchao'].name='号令如山';designs['cao-wuchao'].roster=['cao','person-420'];
designs['zhou-redcliffs'].name='火烧连营';designs['zhou-redcliffs'].roster=['person-246','person-603'];
designs['zhuge-eight'].roster=['person-290','person-281'];
designs.heal.roster=designs.heal.roster.filter(id=>id!=='person-420');
designs.refresh.roster=designs.refresh.roster.filter(id=>id!=='person-281');
designs.reinforce.roster=designs.reinforce.roster.filter(id=>!['person-366','person-137'].includes(id));
designs.swift={name:'疾风迅雷',group:'support',cost:1,duration:12,cooldown:56,description:'圆形半径2格；友军获得神速，移动力+1、攻击间隔缩短25%、无视敌军ZOC；基准12回合，按施放者统智折算。',side:0,effect:'rapidAdvance',icon:'wind',scope:{shape:'circle',radius:2},weights:{leadership:.3,intellect:.7},scaling:'duration',roster:['person-366','person-137']};
designs.blockade={name:'十面埋伏',group:'control',cost:1,duration:20,cooldown:64,description:'阻止敌方已经抵达的后备部队正常补位；基准20回合，按施放者统智折算。敌军可用奇兵天降突破封锁，未到援军仍按真实条件抵达。',side:1,effect:'blockade',field:'blockadeUntil',icon:'wind',scope:{shape:'reserve'},weights:{leadership:.3,intellect:.7},scaling:'duration',roster:['person-264','person-662']};
for(const s of Object.values(designs)){delete s.pool;delete s.owner;}
for(const a of Object.values(assignments))a.stratagems=[];
for(const [key,s]of Object.entries(designs))for(const id of s.roster)assignments[id].stratagems.push(key);
write('data/design/stratagems.mjs','// Authoritative military strategies: one shared catalogue and explicit holder rosters.\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(designs,null,2)+';');
edit('data/design/assignments.mjs',s=>s.replace(/export const OFFICER_ASSIGNMENTS = [\s\S]*?;\s*export const TROOP_TACTIC_POOLS/, 'export const OFFICER_ASSIGNMENTS = '+JSON.stringify(assignments,null,2)+';\nexport const TROOP_TACTIC_POOLS'));
edit('stratagems.mjs',s=>{
 s=s.replace(/export const EXCLUSIVE_STRATAGEMS=[\s\S]*?export const stratagemLimit=/,"export const STRATAGEM_POOL=Object.freeze(Object.keys(STRATAGEMS));\nexport const stratagemEligible=id=>Object.hasOwn(OFFICER_BY_ID,id)&&(OFFICER_ASSIGNMENTS[id]?.stratagems.length??0)>0;\nexport const stratagemLimit=");
 s=s.replace(/export const stratagemPoolLabel=.*?;/,'');
 s=s.replace(/export const STRATAGEM_RULE_TEXT=.*?;/,"export const STRATAGEM_RULE_TEXT='全游戏15种军略，不区分基础与专属，仅按明确人物名单分配给有统军、谋划或宗教领袖表现者，取消统一智力门槛。通常1项，诸葛亮2项；任军团长或军师且部队仍存活、已经抵达、未撤离时提供。重复军略只取较强来源。主要效果明显随施放者统率、智力变化，预览显示实际效果。每项独立长冷却，奇兵、整备、雷火和八阵每场各限一次。';");
 s=replace(s,'return {key,bondStrength,','return {key,count:s.scaling===\'count\'?Math.max(1,Math.round(s.baseCount*power)):0,bondStrength,');
 s=replace(s,"blockade:'阻止敌方预备队补位'","forceReserve:'额外出场最多 '+p.count+' 支已抵达后备部队，突破人数限制',tacticRefresh:'刷新已抵达存活部队全部主动战法次数（含专属），剩余冷却缩短 '+percent(p.strength),catastrophe:'敌我皆受影响；全战场随机 '+s.strikes+' 道雷火，半径 '+s.strikeRadius+' 格；每次伤害 '+percent(p.strength*s.randomDamage.min)+'～'+percent(p.strength*s.randomDamage.max)+' 初始兵力',blockade:'阻止敌方预备队正常补位，可用奇兵天降突破'");
 s=replace(s,'+cooldown;','+cooldown+(s.maxUses?\' · 每场\'+s.maxUses+\'次\':\'\');');return s;
});
edit('officer-roster.mjs',s=>s.replace(',stratagemPoolLabel','').replace(' · ${stratagemPoolLabel(k)}','').replace('无军略：基础智力不足70。','无军略：未列入军略持有人名单。'));
edit('stratagem-area.mjs',s=>replace(s,"return r?.shape==='reserve'?'预备队效果':'全军效果';","return r?.shape==='battlefield'?'全战场 · 不分敌我':r?.shape==='reserve'?'已抵达后备部队':'全军效果';"));
edit('data/design/schema.mjs',s=>s.replace('    "owner",\n    "pool",','').replace('    "scaling"','    "scaling", "baseCount", "strikes", "strikeRadius", "randomDamage"').replace("'eightFormation'","'eightFormation','forceReserve','tacticRefresh','catastrophe'"));
edit('design-catalog.mjs',s=>{
 s=s.replace("['shield','heal','firestorm'].includes(s.effect)?'strength'","['shield','heal','firestorm','tacticRefresh','catastrophe'].includes(s.effect)?'strength':s.effect==='forceReserve'?'count'");
 s=s.replace("['army','reserve','circle','rectangle','unit']","['army','reserve','battlefield','circle','rectangle','unit']").replace("s.pool==='exclusive'&&s.side===1","s.side===1");
 s=s.replace(/  if\(s.pool==='ordinary'\)check\([^\n]+\n  check\(\['ordinary','exclusive'\][^\n]+/,"  check(Array.isArray(s.roster)&&s.roster.length>0&&new Set(s.roster).size===s.roster.length&&s.roster.every(id=>exists(tables.officers,id)),'stratagems.'+id+'.roster','军略须有明确人物名单');\n  check([0,1,2].includes(s.side),'stratagems.'+id+'.side','军略目标阵营无效');\n  if(s.effect==='forceReserve')check(r?.shape==='reserve'&&s.side===0&&s.baseCount===2&&s.maxUses===1&&s.duration===0,'stratagems.'+id,'奇兵出场规则无效');\n  if(s.effect==='tacticRefresh')check(r?.shape==='army'&&s.side===0&&numeric(s.baseStrength,.1,.5)&&s.maxUses===1&&s.duration===0,'stratagems.'+id,'战法整备规则无效');\n  if(s.effect==='catastrophe')check(r?.shape==='battlefield'&&s.side===2&&s.maxUses===1&&s.duration===0&&s.strikes===8&&s.strikeRadius===2&&s.randomDamage?.min===.75&&s.randomDamage?.max===1.25&&numeric(s.baseStrength,.1,.3),'stratagems.'+id,'雷火范围与随机伤害规则无效');\n  if(s.effect!=='catastrophe')check(s.side!==2&&r?.shape!=='battlefield'&&s.strikes===undefined&&s.strikeRadius===undefined&&s.randomDamage===undefined,'stratagems.'+id,'未接入雷火参数');\n  if(s.effect!=='forceReserve')check(s.baseCount===undefined,'stratagems.'+id,'未接入额外出场队数');");
 s=s.replace("(u.intellect<70?0:id==='person-290'?2:1)","(id==='person-290'?2:1)");
 s=s.replace(/  for\(const key of a.stratagems\)if\(tables.stratagems\[key\]\?\.pool==='exclusive'\)[^\n]+\n  else if\(tables.stratagems\[key\]\)check\([^\n]+/,"  for(const key of a.stratagems)if(tables.stratagems[key])check(tables.stratagems[key].roster?.includes(id),'assignments.'+id+'.stratagems','不在军略指定人物名单');");return s;
});
console.log(Object.keys(designs).length+' strategies, '+Object.values(assignments).filter(a=>a.stratagems.length).length+' holders');
