// Art roles are editorial decisions grounded in identity/biography, not combat stats or troop types.
export const OFFICER_ART_ROLES={
 martial:'武勇将领',commander:'战场统帅',strategist:'谋士军师',civil:'文臣学士',ruler:'君主领袖',specialist:'特殊职能人物'
};
const purposes={
 portrait:'独立头肩头像，完整头饰，无手和武器。',detail:'透明全身人物立绘，完整头饰至双脚，自然稳定站姿。',
 domestic:'办理城务、补给或研究等内政事务；依人物职责选择实际工作。',inspection:'到现场巡视工程、仓储、田地或设施。',
 training:'整军、训练监督或军务辅助。',diplomacy:'接洽来访者或使者，平静听取意见。',command:'参与军团部署，表现本人实际指挥或辅助职责。',
 travel:'普通小步行旅或运输，完整头饰和双脚，持物贴近身体。',report:'汇报已完成事项，克制满意，嘴唇闭合。',
 'report-concern':'接收或汇报告急消息，沉着凝神，不惊慌。',battle:'战斗切入宽幅人物，位于左半幅，表现本人军事职责，动作克制。'
};
const activities={
 martial:{domestic:'检查军粮、补给或装备；保留本人的护腕、军装及军职气质，不默认案前执笔。',inspection:'实地检查营防、仓储或装备，手臂自然垂放或低位持合适兵器。',training:'近身检查兵器连接、护具或训练器械。',diplomacy:'以军职站姿或稳坐接洽，手安放膝部、桌沿或自然下垂，不默认书生拢袖礼。',command:'在营地判断路线、阵位或布防，军事地图可以使用，文书不是贯穿全套的主道具。',report:'在营门或军务场所自然站立口头汇报，双手舒适，不默认双手捧书。','report-concern':'在岗听取军情或短暂查看单份消息，不默认书斋阅卷。',battle:'穿本人军装，稳健警戒或低位持兵器，保持武人气质，闭嘴且不挥击。'},
 commander:{domestic:'检查军需调配或城防事务，呈现组织军务的职责。',inspection:'巡视营地、工程或运输线路。',training:'监督队列或检查训练准备，不反复改成坐读名册。',diplomacy:'以统帅身份听取使者意见，沉稳军职仪态。',command:'在路线图、阵位图或营地前研判，近处轻触图筹即可。',report:'简洁汇报部署或战果，允许单份军情记录但不必捧卷。','report-concern':'听取紧急军情或判断现场状况，保持统帅镇定。',battle:'表现沉稳临阵指挥；兵器、指挥物和护甲遵从个人设定。'},
 strategist:{domestic:'研读政务、补给资料或检查器械，文书使用有具体目的。',inspection:'观察地形、工程或补给路线。',training:'检查军务准备、器械或部署资料，不扮成冲锋武人。',diplomacy:'以谋臣身份坐谈或安静听取意见。',command:'在军情图、路线或图筹旁研判。',report:'口头汇报或低位持一份有关建议的记录。','report-concern':'审视一份急报或安静听取消息，眉眼放松。',battle:'军帐或阵后筹划、观察军情，个人标志物自然低持，不通用套用羽扇。'},
 civil:{domestic:'依实际职能读写账册、编纂、审阅公文或处理城务。',inspection:'巡视民政设施、档案、仓储或水利现场。',training:'在训练场旁处理名册、军需或记录，不持战斗兵器。',diplomacy:'以文臣或使者身份平静接洽，坐姿或站姿因人物而异。',command:'在军务场所办理文书、补给或联络，表现辅助职责。',report:'呈报公文或口头汇报，不让每个场景都捧同一卷书。','report-concern':'听取消息或审阅一份公文，保持自然中性。',battle:'阵后军务、记录或联络场景，保持文职衣装，不强加护甲或冲锋动作。'},
 ruler:{domestic:'听取城务意见、审视治理事项或查看贡赋补给。',inspection:'以领袖身份巡视治下设施，克制随行观察。',training:'检阅军队或军需准备，强调统领身份。',diplomacy:'以主事者身份稳坐或站立接见。',command:'审视整体部署、地图或军情。',report:'接收或确认成果消息，保持领袖仪态。','report-concern':'沉着听取急报或研判应对。',battle:'表现临阵统领或督战，是否着甲按具体人物设定。'},
 specialist:{domestic:'按已记录的具体职能办理事务，禁止用通用书生动作代替。',inspection:'检查与本人具体职能有关的现场。',training:'依本人具体职能辅助军务，不能凭兵种字段添加武人身份。',diplomacy:'按本人实际身份接洽。',command:'按本人具体职能参与军务。',report:'汇报本职事务，使用与职责相关的道具。','report-concern':'处理本职范围的急报，保持自然神态。',battle:'表现本人有依据的军事辅助职责，不虚构前线作战身份。'}
};
export function artRole(profile){
 const role=profile?.role;if(!role)return null;
 if(!Object.hasOwn(OFFICER_ART_ROLES,role.primary)||!Array.isArray(role.secondary)||role.secondary.some(r=>!Object.hasOwn(OFFICER_ART_ROLES,r))||typeof role.evidence!=='string'||!role.evidence.trim()||typeof role.bearing!=='string'||!role.bearing.trim())throw Error('美术类型须记录有效主类型、次类型、名册传记依据与人物仪态');
 return role;
}
export function roleSceneBrief(role,scene){
 if(!Object.hasOwn(purposes,scene))throw Error('未知美术场景：'+scene);
 return purposes[scene]+(activities[role.primary][scene]||'');
}
export function roleDescription(role){
 return `主类型：${OFFICER_ART_ROLES[role.primary]}；次类型：${role.secondary.map(r=>OFFICER_ART_ROLES[r]).join('、')||'无'}。依据：${role.evidence}。人物仪态：${role.bearing}。${role.propExceptions?'个人道具例外：'+role.propExceptions+'。':''}中性仅限制表情和动作幅度，不能改变人物职业气质；具体个人动作也必须符合该类型。`;
}
