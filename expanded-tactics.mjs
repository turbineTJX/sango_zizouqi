// Four additional troop toolboxes. Each still has exactly six basic choices.
const skill=(name,category,threshold,cooldown,range,effect,description,role,tradeoff,extra={})=>({name,category,threshold,cooldown,range,effect,visual:category==='intellect'?'shockwave':'slash',description,role,tradeoff,...extra});
export const EXPANDED_TACTICS={
 cleave:skill('横扫','force',30,20,1,'cleave','横扫相邻最多三队敌军，各造成 0.95 倍武技伤害','近身群攻','敌军分散或不贴身时收益低'),
 bulwark:skill('铁壁','force',40,26,1,'bulwark','接敌后防御 +30%、军纪 +20%，持续 10 步；期间移速减半','双抗承伤','没有伤害，转场变慢'),
 riposte:skill('反击','force',55,26,1,'riposte','8 步内受相邻敌军直接攻击后反击（0.55 倍武技）；每步最多一次，不触发反击链或额外战意','反击消耗','需要被近敌攻击；远射、持续伤害不触发'),
 curse:skill('衰咒','intellect',35,24,2,'curse','造成 0.55 倍谋略伤害并叠一层衰咒；自身咒击 8 步，普攻改按 0.8 倍谋略威力对军纪结算并续叠；每层攻击、谋略威力、军纪 −6%，最多三层，刷新 10 步','叠咒削弱','需要持续接近同一目标；可净化，停攻后过期'),
 blight:skill('枯竭','intellect',45,26,2,'blight','造成 0.7 倍谋略伤害，使目标受到的治疗降低 50%，持续 10 步','近程减疗','不禁止护盾或净化，不降低战后恢复'),
 mirage:skill('幻卫','intellect',40,28,2,'mirage','为一队接敌友军召出三道幻卫，持续 10 步；分担接下来三次直接命中的 50% 伤害，每次最多为目标兵力上限的 8%','幻象承伤','不占格、不攻击、不形成 ZOC；持续伤害穿过幻卫'),
 bandage:skill('包扎','force',25,22,2,'bandage','为一队友军救治兵力上限 6% 的已有伤兵；施放后重置普攻间隔','稳定急救','短程单体，只恢复真实伤兵'),
 supply:skill('输粮','force',20,24,3,'supply','为一队其他友军增加 24 战意；战意缺口至少 15 时发动','战意支援','不鼓舞自身，不治疗、不造成伤害'),
 camp:skill('营垒','force',40,28,2,'camp','为两格内最多两队接敌友军提升防御 25%，持续 8 步','前线防护','只防物理伤害，不提升军纪或自身输出'),
 regrowth:skill('回春','intellect',45,30,3,'regrowth','为一队友军施加 6 步持续治疗，每步最多救治兵力上限的 1.5%＋谋略威力/50000；施放后重置普攻间隔','持续恢复','不能复活；受减疗和伤兵预算限制，重复施放不叠加'),
 purify:skill('祛厄','intellect',40,24,3,'purify','清除一队友军全部控制与减益，再救治兵力上限 5% 的伤兵；无减益不发动；重置普攻间隔','净化救急','没有护盾和免控期，不能预先施放'),
 passage:skill('奇门','intellect',40,28,3,'passage','使一队其他近战友军 6 步内无视敌方 ZOC；可切向后排，不能穿过部队、城门或水陆限制；受援者 18 步内不能再次获得','开路支援','无伤害、不加速、不解除嘲讽；窗口短，需突击队配合'),
 bombard:skill('投石','force',30,24,5,'bombard','轰击 2～5 格内一队敌军（1.45 倍武技），波及其相邻最多两队（0.65 倍）','远程轰击','近身不能发动，分散布阵能减少波及',{minRange:2}),
 ram:skill('撞城','force',50,28,2,'ram','优先撞击两格内敌方城门（武技威力与攻城威力之和的 3 倍）；无城门目标时攻击一队敌军（1.1 倍武技）','攻城突击','需要推进至近处，无法同时保持远程安全'),
 emplace:skill('架设','force',35,28,5,'emplace','交战时架设 10 步：攻击 +20%、普攻与武力射击射程 +1，期间无法移动','定点火力','无法转场，仍有两格普攻盲区'),
 plague:skill('疫矢','intellect',40,26,5,'plague','命中（0.6 倍谋略），施加 10 步疫伤和 10 步 50% 减疗；疫伤每步为当前谋略威力×(12/280＋0.08)，受军纪抵御，不叠加','疫伤压疗','持续伤害兑现较慢；净化可同时清除疫伤和减疗'),
 tremor:skill('震军','intellect',55,28,4,'tremor','震击相邻最多两队（0.75 倍谋略），使其普攻间隔 +25%、谋略威力 −15%，持续 6 步','群体压制','没有硬控，不阻止移动或施法'),
 nexus:skill('阵枢','intellect',45,30,3,'nexus','为一队其他友军提升谋略威力、军纪各 20%，持续 8 步','谋略增益','无直接伤害；需要谋攻或承伤队友兑现'),
 navalRam:skill('艨冲','force',40,24,3,'navalRam','沿最多两格水路冲击一队敌方舰船（1.7 倍武技）；不能穿过部队或登岸','水上突击','只能冲击舰船，需要真实空闲水路'),
 broadside:skill('舷射','force',30,22,4,'broadside','齐射射程内相邻最多两队敌军，各造成 1.05 倍武技伤害','舰队火力','缺少减伤、治疗和状态压制'),
 anchor:skill('抛锚','force',35,24,4,'anchor','接战后自身减伤 25% 持续 8 步，期间停止移动','水上守线','无法追击或转场，不保护其他友军'),
 undertow:skill('涡流','intellect',45,26,4,'undertow','冲击相邻最多两队（0.65 倍谋略），施加迟滞 6 步及一层衰咒 10 步','水陆控场','没有硬控，衰咒与其他来源共用三层上限'),
 mist:skill('雾隐','intellect',40,28,2,'mist','为附近最多两队接敌友军各召出两道幻卫，持续 8 步；每道分担一次直接命中的 50%，最多为兵力上限的 8%','群体幻护','不挡持续伤害、不隐身、不叠加已有幻卫'),
 boarding:skill('接舷','intellect',45,28,2,'boarding','为两格内一队其他舰船救治兵力上限 10% 的伤兵，并增加 20 战意；重置普攻间隔','舰队补给','只能支援其他舰船，不能补充阵亡士兵'),
};
export const EXPANDED_FORCE={halberd:['cleave','bulwark','riposte'],logistics:['bandage','supply','camp'],siege:['bombard','ram','emplace'],ship:['navalRam','broadside','anchor']};
export const EXPANDED_INTELLECT={halberd:['curse','blight','mirage'],logistics:['regrowth','purify','passage'],siege:['plague','tremor','nexus'],ship:['undertow','mist','boarding']};
const role=(id,name,ids,position,cost)=>({id,name,ids,position,cost});
export const EXPANDED_ROLES={
 halberd:[role('assault','反击战坦',['bulwark','riposte','cleave'],'前排承伤并反击近敌','放弃叠咒、减疗与幻卫'),role('guard','幻卫护阵',['bulwark','mirage','riposte'],'保护接敌队友，承受直接攻击','放弃范围主动伤害与减疗'),role('control','诅咒战坦',['bulwark','curse','blight'],'接近前线维持诅咒，压制敌方治疗','放弃反击与幻卫')],
 logistics:[role('assault','开路策应',['supply','passage','purify'],'跟随突击队，提供战意与奇门窗口','放弃持续恢复与防御强化'),role('guard','前阵军医',['camp','bandage','purify'],'站在主坦后一至两格救治、净化','放弃奇门、鼓舞与持续恢复'),role('control','后阵医辅',['regrowth','supply','purify'],'在后方三格内支援主坦和输出','放弃营垒、急救与开路')],
 siege:[role('assault','攻城火力',['emplace','bombard','ram'],'远程架设；攻城时向城门推进','放弃减疗、震军与阵枢'),role('guard','阵枢支援',['nexus','tremor','bombard'],'跟随谋攻主力提供增益与压制','放弃疫伤、架设与撞城'),role('control','疫伤压制',['plague','tremor','nexus'],'瞄准受治疗目标，持续压低其作战能力','放弃物理轰击与攻城爆发')],
 ship:[role('assault','水上突击',['navalRam','broadside','anchor'],'沿水道突击，接战后抛锚输出','放弃幻卫、涡流与补给'),role('guard','舰队护航',['anchor','mist','boarding'],'靠近友船和岸边部队承伤、幻护、补给','放弃主动伤害战法'),role('control','涡流策应',['undertow','mist','boarding'],'从水面压制岸边敌军并支援舰队','放弃冲撞、齐射与自身减伤')],
};
