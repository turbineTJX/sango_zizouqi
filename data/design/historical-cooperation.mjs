// Research catalog, checked 2026-10-11. Game relationships are not historical proof.
// Records describe evidence and current public mechanics, never name-only combat bonuses.
const history=volume=>`https://zh.wikisource.org/wiki/三國志/卷${volume}`;
const novel=chapter=>`https://zh.wikisource.org/wiki/三國演義/第${chapter}回`;
export const COOPERATION_GAME_REFERENCES = [
  {game:'三国志11威力加强版',kind:'官方机制',description:'单挑中可由同部队武将援护；官方以刘备、关羽援护张飞对吕布为例。不能据此推出完整亲爱名单。',url:'https://www.gamecity.ne.jp/sangokushi/11wpk/game/04.htm'},
  {game:'三国志13',kind:'官方机制',description:'交往与互助建立羁绊，影响内政和同部队战斗；官方列出孙策、周瑜的断金之交。',url:'https://www.gamecity.ne.jp/sangokushi13/system1.html'},
  {game:'三国志13',kind:'社区名单',description:'特殊羁绊包括曹操与许褚、曹操与荀彧、关羽与周仓、诸葛亮与姜维等；名单是社区整理，不是完整官方数据库。',url:'https://www.gamersky.com/handbook/201602/714636.shtml'},
  {game:'三国志14',kind:'官方机制',description:'同势力同军团、正常状态且关系良好的附近部队可连携；至多五队同时发动战法。亲爱与实际共同作战必须另行区分。',url:'https://www.gamecity.ne.jp/manual/JuLnHe14/jp/5100.html'},
  {game:'三国志14',kind:'社区名单',description:'社区亲爱表包含曹操与郭嘉、许褚、典韦等；游戏名单混合史实与演义。',url:'https://www.gamersky.com/handbook/202001/1258339.shtml'},
  {game:'三国志8 REMAKE',kind:'官方机制',description:'信赖及相生关系可在内政、训练与战斗中合作；夫妻、义兄弟可成为相生。官方机制页没有列出所有默认组合。',url:'https://www.gamecity.com.tw/manual/sangokushi8-re/sc/3500.html'},
];

// Friendly here is a design interpretation of documented collaboration, not a
// claim that the biography explicitly calls every pair close personal friends.
export const HISTORICAL_RELATIONSHIPS = [
  {ids:['person-396','person-487'],type:'friendly',basis:'赵云、邓芝共同执行箕谷任务；游戏采用友好基准65。',source:history('36')},
  {ids:['person-290','person-137'],type:'liked',basis:'诸葛亮器重姜维并教授军事；参照13特殊羁绊及14亲爱名单，采用亲爱70。',source:history('44')},
  {ids:['person-342','person-291'],type:'friendly',basis:'曹仁守樊、徐晃从外解围；游戏采用友好65，不称史书记载私人亲爱。',source:history('17')},
  {ids:['person-489','person-652'],type:'friendly',basis:'董袭、凌统同为前部，合力突破黄祖水军；游戏采用友好65。',source:history('55')},
];

export const HISTORICAL_COOPERATIONS = [
  {faction:'魏',names:['曹操','典韦','许褚'],basis:'史实护主',evidence:'典韦护卫曹操并在宛城断后；许褚任宿卫并在渭水掩护。二人各与曹操合作，不把三人描述成长期共同作战小队。',game:'13曹操—许褚特殊羁绊；14亲爱名单',mechanics:'曹操真实支援后，受益护卫可接续攻击连携；两名护卫共用残血邻军授盾。',sources:[history('18')]},
  {faction:'魏',names:['曹操','郭嘉'],basis:'史实谋辅',evidence:'郭嘉随曹操征讨并参与军谋，属于谋士与统帅的合作。',game:'14亲爱名单',mechanics:'曹操支援启动，郭嘉压制敌方战意及战法威胁；同目标进攻继续沿用集火连携。',sources:[history('14')]},
  {faction:'魏',names:['曹操','荀彧','荀攸'],basis:'史实军政分工',evidence:'荀彧居中筹划、荀攸随军献策；不能把全部政务合作都解释成三人每战同行。',game:'13曹操—荀彧特殊羁绊',mechanics:'荀彧真实救伤、荀攸重整次数和冷却；仅实际战法支援参与连携，内政仍走内政规则。',sources:[history('10')]},
  {faction:'魏',names:['张辽','李典','乐进'],basis:'史实共同作战',evidence:'合肥分工出击与守城。李典传明确三人素不睦，但李典以公义协同，不应把共同作战写成天然亲密。',game:'14张辽—李典、乐进亲爱是游戏化设定',mechanics:'保持突击、军阵与牵制、残血收割分工；关系编辑允许表现从不睦到合作。',sources:[history('17'),history('18')]},
  {faction:'魏',names:['曹仁','徐晃','满宠'],basis:'史实共同作战',evidence:'曹仁与满宠守樊城，徐晃从外解围，适合阵线维持与外线突破。',game:'不依赖指定特殊羁绊名称',mechanics:'曹仁与徐晃新增友好基准；护卫、军阵、摧锋和普通支援连携共用结算。',sources:[history('09'),history('17'),history('26')]},
  {faction:'魏',names:['司马懿','张郃','郭淮'],basis:'史实军中合作',evidence:'郭淮稳定汉中军情、推张郃为军主，并在司马懿指挥下参与对蜀部署；是不同阶段的合作班底。',game:'历史班底参考',mechanics:'已有破甲压制、物理进攻、护卫与克骑衔接；本轮通用连携也适用。',sources:[history('26')]},
  {faction:'蜀',names:['关羽','廖化'],basis:'史实任职',evidence:'廖化为关羽主簿；这证明从属合作，不能据此虚构固定合击事迹。',game:'14社区表廖化亲爱关羽',mechanics:'廖化保留聚势1并增加战歌2，靠真实普攻为附近关羽或其他合法主力补战意。',sources:[history('45')]},
  {faction:'蜀',names:['关羽','周仓'],basis:'演义搭档',evidence:'周仓随关羽为演义叙事，不能列为正史记载的武将。',game:'13关羽—周仓特殊羁绊；14亲爱名单',mechanics:'周仓保留锐锋1并增加摧锋2，普攻概率破甲可供关羽后续战法利用。',sources:[novel('028')]},
  {faction:'蜀',names:['赵云','邓芝'],basis:'史实共同作战',evidence:'箕谷兵弱敌强，二人共同执行任务；赵云敛众固守、亲自断后。重在保全队伍，不塑造成必胜突击。',game:'本轮依据史实补入友好；没有声称14默认列出此亲爱',mechanics:'邓芝远击1替换为战歌2，保留克骑1；支援附近赵云启动，双方新增友好65。',sources:[history('36')]},
  {faction:'蜀',names:['赵云','陈到'],basis:'史实忠勇护军定位',evidence:'季汉辅臣赞并称赵子龙、陈叔至，注称两人忠勇；陈到还负责永安白毦兵。不是固定共同战役搭档的证明。',game:'14赵云亲爱陈到',mechanics:'保留赵云护卫2、陈到护卫2与军阵1；相邻残血保护及普通支援接续，不增加姓名倍率。',sources:[history('45'),history('40')]},
  {faction:'蜀',names:['诸葛亮','姜维'],basis:'史实器重与传承',evidence:'诸葛亮称姜维思虑精密、敏于军事，并安排教授军事。传承关系与二人共同合击不同。',game:'13特殊羁绊；14亲爱名单',mechanics:'补入亲爱70；八阵控制、克骑前排、普通战法连携沿用公共条件。',sources:[history('44')]},
  {faction:'蜀',names:['刘备','法正','黄忠'],basis:'史实共同作战',evidence:'法正提出汉中战略，在定军山判断可击，刘备命黄忠乘高进攻。是谋辅提供时机、主力完成攻击的明确例子。',game:'14黄忠亲爱法正',mechanics:'法正普通辅助战法接续黄忠进攻；百步穿杨、分击与公共目标条件保留。',sources:[history('37')]},
  {faction:'蜀',names:['刘备','关羽','张飞'],basis:'史实长期从属；桃园结义属演义',evidence:'正史记恩若兄弟、分统部曲；桃园盟誓不当作正史事件。',game:'11官方援护例；13官方羁绊例',mechanics:'既有桃园、张飞控制、关羽追击及刘备救伤；本轮可由救伤接续队友攻击。',sources:[history('36'),novel('001')]},
  {faction:'蜀',names:['刘备','庞统','黄忠','魏延'],basis:'同次征战班底',evidence:'庞统随刘备入蜀，黄忠、魏延参与刘备军征战；不把同军事实扩写成每两人均有固定合击。',game:'合作方向来自征战背景',mechanics:'已有连环铺垫和后续物理传导，真实连携另按目标、支援记录和关系判定。',sources:[history('37'),history('36'),history('40')]},
  {faction:'吴',names:['孙策','周瑜'],basis:'史实友善与共同作战',evidence:'少年友善、资源互通，周瑜随孙策渡江征战。',game:'13官方断金之交；14义兄弟',mechanics:'孙策实际鼓舞周瑜，周瑜可在短窗口内接续战法，火源条件仍独立成立。',sources:[history('54')]},
  {faction:'吴',names:['孙策','太史慈'],basis:'招纳归附；游戏特殊羁绊',evidence:'太史慈归孙策并受信任；以剑交心的羁绊名称是游戏表达。',game:'13特殊羁绊；14亲爱',mechanics:'已有孙策鼓舞太史慈的门槛支援，也可接续真实支援连携。',sources:[history('49')]},
  {faction:'吴',names:['周瑜','黄盖','程普'],basis:'史实共同作战',evidence:'周瑜、程普领军抗曹，黄盖建议并执行火攻；苦肉连锁细节不能全部当正史。',game:'13周瑜—黄盖特殊羁绊；14亲爱',mechanics:'黄盖火谋铺火，周瑜利用已有灼烧；程普维持阵线。',sources:[history('54'),history('55')]},
  {faction:'吴',names:['孙权','周泰','蒋钦'],basis:'史实护主与从属',evidence:'周泰早年与蒋钦从孙策，后多次护卫孙权；不是要求三人始终同时上阵。',game:'14周泰亲爱孙权、蒋钦',mechanics:'已有护卫与碧眼军略保护；实际支援窗口内可接续进攻。',sources:[history('55')]},
  {faction:'吴',names:['鲁肃','吕蒙'],basis:'史实结友与谋略交流',evidence:'吕蒙为鲁肃筹划对关羽的防备，鲁肃拜其母并结友。',game:'14亲爱',mechanics:'辅助战法与前线控制接续；保留军政合作和战斗合作的区别。',sources:[history('54')]},
  {faction:'吴',names:['吕蒙','蒋钦'],basis:'史实劝学与军中分工',evidence:'孙权劝二人学习，并称二人进益；吕蒙谋划沿江游兵分工，蒋钦亦参与合肥护卫。不是劝学即可获得全军战斗倍率。',game:'14吕蒙亲爱蒋钦',mechanics:'蓄锐后备、远击支援与前排协作；不新增劝学战斗倍率。',sources:[history('54'),history('55')]},
  {faction:'吴',names:['董袭','凌统'],basis:'史实共同作战',evidence:'讨黄祖时同为前部，董袭斩断蒙冲系索，为大军打开进路。',game:'本轮依据史实补入友好',mechanics:'新增友好65；锐锋、护卫与普通控制进攻连携适用。',sources:[history('55')]},
  {faction:'吴',names:['陆逊','朱然','韩当','徐盛'],basis:'史实统帅与部将',evidence:'夷陵抵御刘备的统帅和参战将领；属于统领多队，不是人人有私人亲爱。',game:'统帅班底参考',mechanics:'已有铺火、连环、利用灼烧和远程跟进；通用连携补足支援接续。',sources:[history('58'),history('55')]},
  {faction:'吴',names:['甘宁','凌统'],basis:'正史有怨亦共同护主；演义有和解',evidence:'正史记杀父之怨、孙权制止和分屯，也记合肥一同死战；演义中救命结交不能倒填为正史亲密。',game:'13人物介绍和14亲爱采用和解叙事',mechanics:'保留当前游戏亲爱与共同护卫机制，但文档清楚标注来源，不称天然史实挚友。',sources:[history('55'),novel('068')]},
  {faction:'群雄',names:['吕布','陈宫','高顺','张辽'],basis:'同军班底与内部矛盾',evidence:'有同军征战，但吕布不总听陈宫意见，也疏远高顺；同阵营不能推定全员互爱。',game:'14有亲爱，也有高顺厌恶陈宫',mechanics:'谋略压制、前排承伤、突进沿公共规则衔接；不自动给全员同队倍率。',sources:[history('07')]},
  {faction:'群雄',names:['袁绍','颜良','文丑'],basis:'同军名将；游戏组合',evidence:'同为袁绍将领；双台柱是游戏羁绊，不据此声称长期固定双人合击有史证。',game:'13颜良—文丑特殊羁绊',mechanics:'已有同目标连携与勇武分工；不增加固定合击。',sources:[history('06'),history('17')]},
  {faction:'混搭',names:['周瑜','小乔','孙策','大乔','曹操','甄氏'],basis:'婚姻或同阵营战术改编',evidence:'婚姻关系和战场支援能力分别处理；美女武将参与战斗及曹操—甄氏配合是本游戏改编。',game:'13羁绊及8 REMAKE相生可参考机制，不证明夫妻实际合战',mechanics:'既有倾国1与战歌2，真实名额和范围成本保留；也能支援非配偶及其他合法队友。',sources:[history('54'),history('05')]},
];
