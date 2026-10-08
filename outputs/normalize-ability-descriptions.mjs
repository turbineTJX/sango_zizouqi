import fs from 'node:fs';
import {TACTIC_DESIGNS as T} from '../data/design/tactics.mjs';
import {TRAIT_DESIGNS as R} from '../data/design/traits.mjs';
import {STRATAGEM_DESIGNS as S} from '../data/design/stratagems.mjs';
const descriptions={
 bulwark:'接敌后获得坚阵10回合：防御提高30%、军纪提高20%，移动速度减半',
 riposte:'获得反击8回合：受到相邻敌军直接攻击后造成武技伤害，每回合最多一次；持续伤害不触发，不递归反击或额外获得战意',
 plague:'造成谋略伤害并施加疫伤10回合：持续损失兵力，救治效果降低50%；伤害受军纪抵御，不叠加，可救护解除',
 tremor:'对一队敌军造成谋略伤害，并施加缓攻6回合：普攻间隔增加25%，不影响战法冷却',
 nexus:'为一队其他友军施加阵枢8回合：谋略威力与军纪各提高20%',
 emplace:'获得架设10回合：攻击提高20%、普攻与武力射击射程增加1，停止移动',
 purify:'为一队友军解除挫锐、定身、缴械、封技、失阵、迟滞、破甲、疲弱、缓攻、短射，并救治已有伤兵',
 cleanse:'为一队友军解除混乱、嘲讽、丧志、抑气，给予护盾并施加坚定3回合',
 lure:'使3格内一队敌军向自身移动1格，并施加破甲6回合：防御降低20%；方阵免疫诱导位移',
 harass:'降低3格内一队敌军的战意，并施加疲弱6回合、失阵4回合：攻击降低20%、失去ZOC，仍可行动；优先可拦截目标，失阵受坚定保护、可整军解除；不造成伤害',
 ambush:'攻击2格内一队敌军，造成谋略伤害，并施加迟滞、疲弱6回合：移动速度减半、攻击降低20%',
 seal:'对4格内一队敌军尝试施加封技，基础5回合，受军纪减免；优先战意高者，不造成伤害',
 gallop:'无需战意；行军接敌或2格内有敌人时发动：获得减伤6回合（直接伤害降低25%）、穿阵4回合（无视敌方ZOC）；有接敌路线时另获疾行6回合（移动力增加1）；不能穿过部队或不可通行地形，不造成伤害',
 rush:'沿最多3格空闲路线冲击，造成武技伤害，对弓弩更强，优先可达后排；获得后阵追击8回合：优先追击后排，对弓弩普攻提高35%；不能穿过有效ZOC',
 valor:'交战范围内获得奋战与破甲8回合：攻击提高25%、防御降低20%',
 relay:'为2格内一队其他友军救治已有伤兵，恢复量随谋略威力提高；战法冷却缩短2回合，并施加疾行4回合，移动力增加1；施放后重置普攻间隔',
 'unique-cao':'为3格内最多2队其他友军施加奋战、营垒7回合：攻击提高20%、防御提高15%，幅度随战法威力提高；增加12战意',
 'unique-person-99':'攻击1格内一队敌军，造成武技伤害；目标兵力低于40%时提高伤害，施放前已有破甲、混乱或迟滞时另提高伤害；命中后施加破甲5回合，防御降低20%；本次新状态不触发增伤',
 'unique-person-433':'攻击1格内目标及其相邻敌军，最多3队，造成武技伤害并尝试施加混乱3回合；自身获得减伤6回合，直接伤害降低15%；控制遵守军纪与坚定规则',
 'unique-person-558':'攻击4格内目标及其相邻敌军，最多3队，造成谋略伤害并施加迟滞4回合，移动速度减半',
 'unique-person-226':'攻击4格内一队敌军，造成谋略伤害，降低24战意并施加疲弱5回合，攻击降低20%；施放前目标战意至少60时提高伤害并额外降低16战意',
 'unique-person-661':'攻击1格内目标及其相邻敌军，最多3队，造成武技伤害；施放前已有破甲或迟滞时提高伤害；命中后施加缓攻4回合，普攻间隔增加25%；本次新状态不触发增伤',
};
const common=s=>s.replace(/(\d+(?:\.\d+)?)\s*日/g,'$1回合').replaceAll('每日','每回合').replaceAll('每步','每回合').replaceAll('破防','破甲').replaceAll('失去ZOC 2回合','失阵2回合（失去ZOC）').replaceAll('失去ZOC并迟滞3回合','失阵、迟滞3回合').replaceAll('失去 ZOC','失阵（失去ZOC）');
const tweaks={
 'unique-person-396':s=>s.replace('自身减伤 12%，持续 5回合','自身获得减伤5回合，直接伤害降低12%').replace('镇静自身，免控 3回合','解除自身混乱、嘲讽、丧志、抑气，并获得坚定3回合'),
 'unique-person-246':s=>s.replace('防御 −20% 6回合','施加破甲6回合，防御降低20%'),
 'mist':s=>s.replace('额外避战1回合','额外获得避战1回合'),
 'regrowth':s=>s.replace('施加 6回合持续救护','施加休整6回合'),
 'suppress':s=>s.replace('使目标移速降低 50%，持续 6回合','施加迟滞6回合，目标移速降低50%'),
 'pierce':s=>s.replace('使目标防御降低 20%，持续 8回合','施加破甲8回合，目标防御降低20%'),
};
for(const [p,table] of [['data/design/tactics.mjs',T],['data/design/traits.mjs',R],['data/design/stratagems.mjs',S]]){
 let src=fs.readFileSync(p,'utf8');
 for(const [id,d]of Object.entries(table)){
  let text=descriptions[id]&&table===T?descriptions[id]:d.description;
  if(table!==R||d.domain==='battle'||d.domain==='command')text=common(text);
  if(table===T&&tweaks[id])text=tweaks[id](text);
  if(table===R){
   if(id==='hero-person-425')text=text.replace('使目标武技威力与谋略威力降低10%，持续2回合','施加挫锐2回合，使目标武技威力与谋略威力降低10%');
   if(id==='hero-person-291')text=text.replace('获得4回合无视ZOC','获得穿阵4回合，无视ZOC');
   if(id==='hero-person-558')text=text.replace('连接6回合','施加连环6回合');
  }
  if(table===S){
   text=text.replace('仅点燃选区内敌军','仅向选区内敌军施加灼烧').replace('并获得 3回合控制保护','并获得坚定3回合');
   if(id==='jia-speed')text=text.replace('选择一支在场友军，','选择一支在场友军，施加神速：');
  }
  if(text!==d.description)src=src.replace(JSON.stringify(d.description),JSON.stringify(text));
 }
 fs.writeFileSync(p,src);
}
let p='data/design/battle-statuses.mjs',src=fs.readFileSync(p,'utf8');src=src.replace('"name":"神速"','"name":"神速"').replace('"name": "战法减伤"','"name": "减伤"');fs.writeFileSync(p,src);
for(const p of ['unit-stats.mjs','tactic-power.mjs']){let s=fs.readFileSync(p,'utf8');s=s.replaceAll('破防','破甲');fs.writeFileSync(p,s);}
let doc=fs.readFileSync('scripts/tactic-power-doc.mjs','utf8').replaceAll('混乱、封技、挑衅','混乱、封技、嘲讽').replaceAll('奇门、追击','穿阵、后阵追击').replaceAll('自身破防','自身破甲');fs.writeFileSync('scripts/tactic-power-doc.mjs',doc);
