import {attackOrbDescription} from './attack-orbs.mjs';
// Four additional troop toolboxes. Each still has exactly six basic choices.
const skill=(name,category,threshold,cooldown,range,effect,description,role,tradeoff,extra={})=>({name,category,threshold,cooldown,range,effect,visual:category==='intellect'?'shockwave':'slash',description,role,tradeoff,...extra});
export const EXPANDED_TACTICS={
 cleave:skill('横扫','force',50,20,1,'cleave','横扫相邻最多三队敌军，各造成 0.95 倍武技伤害','近身群攻','敌军分散或不贴身时收益低'),
 bulwark:skill('坚阵','force',20,26,1,'bulwark','接敌后防御 +30%、军纪 +20%，持续 10 步；期间移速减半','双抗承伤','没有伤害，转场变慢'),
 riposte:skill('反击','force',55,26,1,'riposte','8 步内受相邻敌军直接攻击后反击（0.55 倍武技）；每步最多一次，不触发反击链或额外战意','反击消耗','需要被近敌攻击；远射、持续伤害不触发'),
 curse:skill('衰咒','intellect',25,24,2,'curse',attackOrbDescription('curse'),'叠咒削弱','需要近身普攻，持续攻击同一目标；可净化，停攻后过期',{attackOrb:true}),
 blight:skill('枯竭','intellect',45,26,2,'blight','造成 0.7 倍谋略伤害，使目标受到的治疗降低 50%，持续 10 步','近程减疗','不禁止护盾或净化，不降低战后恢复'),
 mirage:skill('幻卫','intellect',30,28,2,'mirage','为一队接敌友军召出三道幻卫，持续 10 步；分担接下来三次直接命中的 50% 伤害，每次最多为目标兵力上限的 8%','幻象承伤','不占格、不攻击、不形成 ZOC；持续伤害穿过幻卫'),
 bandage:skill('救护','politics',20,22,2,'bandage','救治一队友军兵力上限 6% 的已有伤兵，随营务威力增强；施放后重置普攻间隔','即时救护','仅救治真实伤兵，不复活'),
 supply:skill('鼓舞','intellect',10,24,2,'supply','为一队其他友军增加 24 战意，随谋略威力增强；战意缺口至少 15 时发动','战意策应','不鼓舞自身，不治疗、不造成伤害'),
 camp:skill('修缮','politics',25,28,2,'repair','修复 2 格内己方存活建筑，恢复耐久上限 4% × 营务增效；近 3 步受击时修复量减半。每队每战携带 3 组修缮物资，每次消耗 1 组','阵地修缮','无受损己方建筑时不发动；不能重建，不救治部队；修缮占用本步行动'),
 regrowth:skill('休整','politics',35,30,2,'regrowth','为一队友军施加 6 步持续救护，每步最多救治兵力上限的 1.5%＋营务威力/50000；施放后重置普攻间隔','持续救护','不能复活；受减疗和伤兵预算限制，重复施放不叠加'),
 purify:skill('解厄','intellect',25,24,2,'purify','清除一队友军全部控制与减益，再救治兵力上限 5% 的伤兵；无减益不发动；重置普攻间隔','净化救急','没有护盾和免控期，不能预先施放'),
 passage:skill('协阵','intellect',0,0,1,'aura','装备后每 6 步为相邻其他近战友军救治最多兵力上限 0.5% × 协阵增效的已有伤兵，并恢复 2 × 协阵增效战意（取整）；不提高攻防。同类光环只取最强','近战光环','占用一个战法槽；不影响自身与远程部队，不复活，受伤兵额度、减疗和战意上限限制。离开相邻范围立即失效，来源眩晕、混乱、封技、撤退或溃败时中断',{passive:true,visual:'banner'}),
 bombard:skill('投石','force',60,24,5,'bombard','轰击 2～5 格内一队敌军（1.45 倍武技），波及其相邻最多两队（0.65 倍）','远程轰击','近身不能发动，分散布阵能减少波及',{minRange:2}),
 ram:skill('冲车','force',75,28,2,'ram','优先撞击两格内敌方城门（武技威力与攻城威力之和的 3 倍）；无城门目标时攻击一队敌军（1.1 倍武技）','攻城突击','需要推进至近处，无法同时保持远程安全'),
 emplace:skill('架设','force',20,28,5,'emplace','交战时架设 10 步：攻击 +20%、普攻与武力射击射程 +1，期间无法移动','定点火力','无法转场，仍有两格普攻盲区'),
 plague:skill('疫矢','intellect',50,26,5,'plague','命中（0.6 倍谋略），施加 10 步疫伤和 10 步 50% 减疗；疫伤每步为当前谋略威力×(12/280＋0.08)，受军纪抵御，不叠加','疫伤压疗','持续伤害兑现较慢；净化可同时清除疫伤和减疗'),
 tremor:skill('震军','intellect',60,28,4,'tremor','震击相邻最多两队（0.75 倍谋略），使其普攻间隔 +25%、谋略威力 −15%，持续 6 步','群体压制','没有硬控，不阻止移动或施法'),
 nexus:skill('阵枢','intellect',25,30,3,'nexus','为一队其他友军提升谋略威力、军纪各 20%，持续 8 步','谋略增益','无直接伤害；需要谋攻或承伤队友兑现'),
 navalRam:skill('艨冲','force',60,24,3,'navalRam','沿最多两格水路冲击一队敌方舰船（1.7 倍武技）；不能穿过部队或登岸','水上突击','只能冲击舰船，需要真实空闲水路'),
 broadside:skill('舷射','force',50,22,4,'broadside','齐射射程内相邻最多两队敌军，各造成 1.05 倍武技伤害','舰队火力','缺少减伤、治疗和状态压制'),
 anchor:skill('抛锚','force',20,24,4,'anchor','接战后自身减伤 25% 持续 8 步，期间停止移动','水上守线','无法追击或转场，不保护其他友军'),
 undertow:skill('涡流','intellect',50,26,4,'undertow','冲击相邻最多两队（0.65 倍谋略），施加迟滞 6 步及一层衰咒 10 步','水陆控场','没有硬控，衰咒与其他来源共用三层上限'),
 mist:skill('雾隐','intellect',30,28,2,'mist','为附近最多两队接敌友军各召出两道幻卫，持续 8 步；每道分担一次直接命中的 50%，最多为兵力上限的 8%','群体幻护','不挡持续伤害、不隐身、不叠加已有幻卫'),
 boarding:skill('接舷','intellect',30,28,2,'boarding','为两格内一队其他舰船救治兵力上限 10% 的伤兵，并增加 20 战意；重置普攻间隔','舰队补给','只能支援其他舰船，不能补充阵亡士兵'),
};
export const EXPANDED_FORCE={halberd:['cleave','bulwark','riposte'],logistics:['bandage','regrowth','camp'],siege:['bombard','ram','emplace'],ship:['navalRam','broadside','anchor']};
export const EXPANDED_INTELLECT={halberd:['curse','blight','mirage'],logistics:['supply','purify','passage'],siege:['plague','tremor','nexus'],ship:['undertow','mist','boarding']};
const role=(id,name,ids,position,cost)=>({id,name,ids,position,cost});
export const EXPANDED_ROLES={
 halberd:[role('assault','反击战坦',['bulwark','riposte','cleave'],'前排承伤并反击近敌','放弃叠咒、减疗与幻卫'),role('guard','幻卫护阵',['bulwark','mirage','riposte'],'保护接敌队友，承受直接攻击','放弃范围主动伤害与减疗'),role('control','诅咒战坦',['bulwark','curse','blight'],'接近前线维持诅咒，压制敌方治疗','放弃反击与幻卫')],
 logistics:[role('assault','协阵助战',['passage','supply','bandage'],'随近战队接敌，协阵光环覆盖相邻友军','放弃持续救护、净化与修缮'),role('guard','阵地营务',['camp','bandage','purify'],'守在己方建筑两格内，兼顾修缮与救护','放弃光环、鼓舞与持续救护'),role('control','近阵救护',['regrowth','purify','passage'],'在前线侧后方接战，救护与光环支援友军','放弃修缮、鼓舞与即时救护')],
 siege:[role('assault','攻城火力',['emplace','bombard','ram'],'远程架设；攻城时向城门推进','放弃减疗、震军与阵枢'),role('guard','阵枢支援',['nexus','tremor','bombard'],'跟随谋攻主力提供增益与压制','放弃疫伤、架设与冲车'),role('control','疫伤压制',['plague','tremor','nexus'],'瞄准受治疗目标，持续压低其作战能力','放弃物理轰击与攻城爆发')],
 ship:[role('assault','水上突击',['navalRam','broadside','anchor'],'沿水道突击，接战后抛锚输出','放弃幻卫、涡流与补给'),role('guard','舰队护航',['anchor','mist','boarding'],'靠近友船和岸边部队承伤、幻护、补给','放弃主动伤害战法'),role('control','涡流策应',['undertow','mist','boarding'],'从水面压制岸边敌军并支援舰队','放弃冲撞、齐射与自身减伤')],
};
