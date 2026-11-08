import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

// One mapping per maintained workflow. Screens may be shared when actions use
// the same page; the manual keeps only the player's steps, not design prose.
const mapping=`
打开城市命令|map city-menu city-detail|左键点己方城市 → 信息卡片 → 查看现役兵、预备兵、伤兵、城防耐久及金粮 → 选择委任、军事、人事等入口|城防耐久显示当前值／上限，伤兵为0也保留；完整详情使用同一兵员统计。城市、府和军团共用点选卡片，换选替换、空白或 Esc 收起。
查找空闲人员|city-directory
查找军团或战线|army-card army-detail army-units army-menu battle-history|地图点军团或本势力军团列表 → 信息卡片与当前粮道 → 驻守、变更目的地、详情或管理；战线列表 → 选择战场|军团直接列出现役兵、伤兵、部队数、士气、每日耗粮和携粮／容量。己方军团点选后高亮当前接通的粮道，换选随之切换，断开不画旧路线；完整详情与管理页共用统计。
查阅人物与部队|personnel personnel-abilities personnel-aptitudes personnel-bonds personnel-tactics personnel-stratagems officer officer-current-sight captive-current-loyalty battle-unit battle-officer-aptitudes
查询敌情|intelligence-menu intelligence-directory officer-current-sight officer-lost-sight scout-report|情报 → 类别 → 本势力或天下 → 查找或排序 → 查看对象|未知不表示零或中立；旧据点情报标观察日期。当前视野可查城内武将详情与忠诚，失去视野立即隐藏，不加入人物侦察报告；我方关押或押送的俘虏可实时查看资料。敌方势力数量只含已知据点和可见人员、军团，不能当作实时总量；返回恢复来源列表。
查看城内与建筑|city-interior building-detail node-panel|继续放大或双击城市，或府、港口、关卡 → 查看建筑 → 实际建筑、施工或人员头像 → 状态与负责人|地点卡显示地名、所属主城与驻军；所属主城名称可进入详情。
地图选点|expedition-route transport-relay
委任内政负责人|domestic domestic-landscape direction appointment appointment-selected technology-details technology-details-mobile|筹划阶段 → 己方城市“委任” → 选择内政方向 → 比较本城人选 → 选择并确认；城市详情“管理” → 展开“城市科技” → 节点“详情”查看效果和前置|技术方向使用智力。进阶科技需要同城两名真实技术负责人、多种设施及治安；详情列出缺少条件。金粮兵基础科技增产20%，对应进阶累计50%；军需法减费25%，省工法建设减费20%。研究目标由负责人自动选择，同城同时一项；已付研究中断后保留进度，接续不重复收费。
改任内政方向|direction appointment timing
解除内政|direction-assigned timing
任命或更换太守|governor-entry governor governor-assigned|筹划阶段 → 点击己方城市 → 人事 → 太守 → 比较政治、任职特性与当前事务 → 选择一名本城合法武将 → 确认|任命不会自动开启太守审批；更换人选会收回原审批委托。选人页可点“指引”或按 F1 查看操作。
解除太守|governor-assigned governor-removed|点击己方城市 → 详情 → 管理 → 展开太守 → 解除|解除任命同时收回该城太守审批委托；不解除其他内政职务。
调整全势力内政优先级|affairs|内政 → 委任优先级 → 方向右侧上移或下移|每次调整即保存本势力顺序；关闭不回滚；首位不能上移，末位不能下移。
补齐全势力委任|affairs|内政 → 查看委任优先级 → 表头统一委任|按当前优先级使用真实合法人选，反馈实际补齐数量。
同意一项内政提案|proposals proposals-approved
暂缓提案|proposals
同意本页提案|proposals proposals-approved
委托太守审批|governor-delegation governor-delegated|先从城市人事任命太守 → 主界面内政 → 城市审批 → 找到本城 → 开启太守审批|任命与审批委托分开。再次关闭可收回委托；更换、解除、离城或易主后须重新委托。太守按本城实际资源代批或缓办，汇报收支及异常；未委托时保留人员事务、费用和耗时。
修改城市保留预算|budget budget-draft budget-saved|城市详情 → 收支预算 → 修改保留金、粮 → 保存预算|重置恢复已保存值，关闭不提交。
安排人才工作|loyalty-warning loyalty-talent loyalty-appointment loyalty-assigned loyalty-roster|从忠诚偏低提醒点击“人才事务”（也可从城市“委任”进入“人才”） → 选择负责人并确认 → 主界面内政查看办理情况、必要时处理资源冲突 → 人才名册“能力”页查看忠诚|人才方向使用魅力。离间当前可见邻城的高忠诚非君主武将，须实际赴访，初值240金、当地办理10天、普通成果降低12点；本城同类事务结算后冷却30天，低忠诚后仍须另行劝说签约。安抚从本城合法目标中优先选择忠诚最低者，基础120金、10天、提高15点忠诚，实际效果受成败和特性影响。委任或同意不立即增加忠诚；实际脱离低忠诚状态后清除提醒。辞官与改仕没有倒计时或预告日期，发生后才通知；任职满30天不会直接消除低忠诚。
派遣侦察|scout-source scout-cities scout-officers scout-endpoint-map scout-route scout-running scout-completed scout-landscape player-handoff|侦察 → 城市表 → 本城武将表 → 终点表或地图选点 → 核对用时和费用 → 派遣|可选择在办内政、太守或原侦察负责人；确认冲突提示后立即解除可中止工作并派遣，取消保留原工作。派遣后先待出发，实际执行才开始扫描，取消或读档不会提前探出贼寨；斥候约为常规步军7倍速度，费用为预计天数×10金，确认时从派出城一次付清；余额不足不派遣，途中停止不退费。抵达后斥候消失并释放负责人，已留下的视野与据点情报保留。沿途留下固定地点的临时视野，类似侦察守卫；斥候离开或停止后，覆盖区域到期前仍实时可见，有其它覆盖则继续可见。
调整侦察路线|scout-route
查看报告|scout-contacts scout-report
停止侦察|scout-running
新增城内部队|troop-list troop-officer troop-officer-landscape troop-edit troop-configured troop-review|城市 → 军事 → 编制 → 新增并选择主将 → 设置兵种、兵力和装备 → 确认该队 → 核阅下令
调整城内部队|troop-list troop-edit troop-review|编制列表 → 修改目标队 → 调整兵种、兵力、装备 → 确认该队 → 核阅下令|现役表示当前兵力，拟编及预计费用表示本次草稿；返回保留输入，取消不扣费。
解散城内部队|troop-list troop-disband troop-disband-review|编制列表 → 解散目标队 → 核对待解散与返还兵员 → 下令
从现有部队出征|expedition-select expedition-roles expedition-route expedition-review expedition-landscape||核对拟携粮、每日耗粮、无补给续航、预计行程和可用守军；守军不含伤兵、预备兵和主将外出留城兵。沿途补给仍依真实粮道和城仓；可解除的旧工作经提示确认后立即中止，外出人员须先返城。
出征前临时编制|expedition-select troop-list troop-edit expedition-select|出征选队 → 编制 → 新增或调整部队 → 返回选队 → 任命并选路 → 下令
移除已选部队|expedition-select expedition-landscape|已选部队条 → 点目标队的“×”|只取消本次选择，不解散部队。
讨伐贼寨|bandit bandit-expedition expedition-roles expedition-review|已发现贼寨 → 查看武将与通用头像 → 选择派出城 → 选队与任命 → 核阅路线 → 下令
增援与护路|expedition-select expedition-route march-route|选来源城或军团 → 出征或调动 → 选实际战场或道路节点 → 核阅下令|部队实际抵达后才参加增援或驻守。
下达调动或改令|army-card march-route march-review
返城或驻守节点|march-route march-review
重置行军路线|march-route
切换行军方式|army-menu march-mode
调整军团编制|army-adjust army-roles army-review
拆分军团|army-split army-roles army-split-review
合并军团|army-merge army-merge-review
征募整补|army-recruit army-recruit-review
纯人员调任|light-transfer-person light-transfer-target transfer-empty-review|来源城市 → 人事、调任 → 选择空身人员 → 地图选友城 → 物资留零 → 核阅下令|须未携带现役、伤兵与物资；武将已编制的部队会随行，此时属于运输队。
携兵或携物资运输|transfer-person transport transport-review transport-running transport-detail transport-detail-landscape transport-landscape|来源城市 → 人事、调任 → 选人并核对随行部队 → 地图选友城 → 填金、粮、预备兵 → 核对预计抵达 → 下令 → 地图点运输队查看进度|运兵、运物资与混载同速，统一为常行步兵军团基准的1.5倍；沿实际道路逐段移动，每天至多完成一段。途中遇敌损失随行部队和物资，到达后才交接。
接力运输|transport-options transport-relay transport-review||具备转漕特性时可设置一个己方接力城；抵达后检查再继续，同样使用统一运输速度。
分批运粮|transport-cycles|调任选一名往返运粮人员 → 选择目标和粮数 → 运输选项 → 选择批次 → 核阅下令|须具备漕运特性且无现役、伤兵；运粮与空车返程同速。每批从来源城实际库存装粮，库存不足、城池失守或道路不安全时停止继续装运。
立即执行|timing
完成后执行|timing waiting
返回修改|timing
取消等待命令|waiting
设置外交目标|diplomacy
设置外交底线|diplomacy-budget
委任使臣|diplomacy-cities diplomacy-officers diplomacy-appoint|外交 → 负责人 → 对应方向 → 城市表 → 本城武将表 → 委任|表中比较对应能力、任职、事务与特性；有内政冲突时选择立即或完成后执行。
解除使臣或取消待任|diplomat-assigned|外交 → 展开负责人并召回使臣，或在返城后安排中取消安排
批准外交方案|diplomacy-proposal diplomacy-terms diplomacy-approved|待处理方案 → 核对双方给予及期限 → 按需展开条款与进度 → 批准|“收支地点”只说明双方收付款来源；列出“移交城池”才代表交城。普通换城须双方各有至少两座主城，按城池价值、地理得失与补偿议价，交情只影响报价倍率，战时也可办理；减少战线可提出单方割地停战，交城后才生效停战。都城及最后原有主城不能交出。
交涉或否决方案|diplomacy-proposal
查看履约|diplomacy-approved diplomacy-terms
释放本方所俘人员|prisoner release-confirm release-result
赎回己方被俘人员|captive ransom-confirm ransom-result|被俘人物详情 → 赎回 → 核对姓名和赎金 → 确认|取消不扣费，获释后仍须沿路返城。
通过外交交换俘虏|prisoner-exchange|外交 → 等待使臣提出交换方案 → 核对双方名单 → 批准 → 查看签署与交接
授予宝物|treasures treasure-recipients treasure-grant treasure-equipped|宝物 → 授予 → 接收武将表 → 查看同类替换提示 → 确认授予|可查找、排序并查看所在、任职与事务；内政和侦察负责人仍可合法接收。
收回国库|treasure-equipped treasure-returned
查看三类装备|treasure-slots
查看效果与锁定|treasures treasure-equipped
处理新战线|encounter defense encounter-control
临时守城编制|defense defense-manual troop-edit
自动编制守城|defense defense-auto
放弃无兵守城|defense defense-confirm defense-result
任命参战指挥|battle-appointments reinforcement-roles
排列出阵顺序|battlefield council|在底部后备席拖动顺序 → 松手立即生效|后备席常驻，队伍较多时横向滚动；待援部队单独标明。
调整首发站位|battle-unit deployment-drop|桌面或手机直接拖动我军图形、头像至合法格或另一支我军 → 松手立即换位|拖动过程中羁绊栏保持显示。轻点查看详情；取消手势、无效落点或手势中断保留原位置与存档。详情中的“调整站位”点选入口仍保留预览确认。
设置后备入场位置|battlefield reserve-position|底部后备席 → 点部队查看详情 → 入场位置 → 点合法位置 → 预览确认|详情“自动入场”可清除指定位置，待援部队抵达后才能设置。
设置战斗意图|battle-intent
设置自动撤离人数|retreat-settings|军议 → 撤离设置 → 填单队人数，或勾选多队 → 兵力下限 → 应用|留空关闭自动撤离。
设置撤离目的地|retreat-node
重置阵型|battle-intent
开始战斗|battlefield council|完成任命与部署 → 开战|拖动换位已在松手时生效；使用详情点选站位时须先确认或取消该预览。
查看战场与部队|battlefield battle-unit battle-buffs battle-buffs-landscape battle-support-kit battle-support-power battle-support-power-landscape|点部队或头像 → 战况简报 → 状态 → 按需展开属性影响、完整属性或战法说明|只列个人实际获得的战法，武技、谋略、营务均有大小战法，详情显示当前对应威力。状态直接显示名称、效果、来源与剩余回合或次数。返回战场、关闭或 Esc 保持暂停；普通战斗中点“继续战斗”才恢复。羁绊浮层可收起、切换敌我。
暂停与变速|battlefield stratagem-result|点击播放或暂停图标 → 点击速度按钮切换倍速|主动暂停、查看部队详情时所有战场同步暂停；继续后同步推进。确认切换视图并加载完成会自动继续，玩家同时只指挥一场。
施放全军型军略|stratagem-army stratagem-army-result|军略（暂停） → 查看充能与次数 → 点击可用军略 → 自动继续战斗|成功后短暂标记作用对象。
施放范围军略|stratagem-list stratagem-area stratagem-landscape stratagem-result stratagem-combination stratagem-provider-cost|军略（暂停） → 选择可用项 → 选落点（舍己护军固定以施放者为中心） → 按需旋转 → 核对目标、实际效果与代价 → 施放 → 自动继续战斗|励军固阵每队真实消耗20战意，不足者不受益；舍己护军的施放者只承担疲弱、不领取保护。全部持续时间查看实际提供者效果。取消或 Esc 保持暂停，不消耗充能。
全军撤退|stratagem-army|军略（暂停） → 军令栏的全军撤退|部队沿战场出口撤离，不会立即返城。
援军抵达军议|reinforcement reinforcement-roles|援军到达并暂停 → 调整本军任命 → 后备顺序和入场位置 → 撤离设置 → 继续作战
查看或接管其他战线|battle-navigation battle-navigation-confirm battle-navigation-loading|战斗顶部切换视图 → 选其他战场或大地图 → 核对战斗将继续的提示 → 确认 → 加载完成自动继续|玩家同时只指挥一场；原场交 AI 继续作战，返回大地图也继续后台战斗。取消保留原场与播放状态；待部署、军议等仍须完成确认，读档不自动开播。
核阅战果|battle-report standalone-report
战后补任|postbattle-roles
开始普通模式|lobby scenarios faction
全 AI 观察|scenarios observer-faction observer-map|首页 → 普通模式 → 选择剧本 → 选择观察势力 → 点击玩家执掌切换为全 AI 观战 → 开始观战|局中使用“切换视角”按钮改变观察势力，军政与战斗由 AI 安排。
开始历史战役|custom custom-review|战役模式 → 选择历史模板并载入 → 核对双方及援军 → 核阅 → 开战
编辑自定义战役|custom-editor custom-army custom-reinforcements custom-review|自定义战役 → 选择地图与场景 → 编辑双方军团 → 设置援军 → 核阅开战
编辑单支战役军团|custom-army custom-select custom-roles custom-army-review|该军编制 → 新增或调整部队 → 选择已编队伍 → 任命军团长、军师 → 核阅确认
新建或修改地图|map-editor map-preview map-library|地图编辑器 → 选择用途分类 → 新图或载入 → 绘制地形与道路 → 预览 → 保存或用于战役
管理地图包|map-library
重试战役|standalone-report
进行|map harvest|筹划安排 → 进行 → 需要时暂停 → 处理待办 → 旬末回到筹划
处理奏报|reports
查看旬收获|harvest
查看当前动态与日志|journal officer
查看战史与回放|battle-replay battle-history battle-report|已结束战线 → 进入回放 → 播放或暂停 → 拖动时间条、调整回放速度 → 关闭返回当前局|实时大地图和战场共用一套时间。回放是独立只读记录，不回退世界或重算战果；新战斗逐步记录，旧战斗保留已有每日快照。
查看整局结果|ending
新建手动存档|settings save-create saves
读取存档|saves||仅支持当前规则存档；规则调整后的旧档需重新开局，不自动迁移。
覆盖或删除手动档|saves save-overwrite save-delete
导出当前进度|save-transfer
导入文件|save-transfer|设置 → 导入 → 选择 JSON 文件 → 校验通过后载入|仅支持当前规则存档；不兼容文件提示失败，旧档需重新开局。
调整声音与表现|settings
查阅指引|guide desktop-manual-settings desktop-manual-catalogue||电脑版：设置或全部指引 → 操作手册；可搜索操作、切换及放大截图，返回游戏或 Esc 关闭。手机版使用原有页面指引。
设置指引偏好|settings guide
查看战场指引|battle-help-first battle-help-first-landscape battle-help-first-combat battle-help-basics battle-help-controls battle-help-tactics battle-help-statuses|首次战斗自动显示操作入门 → 下一项按钮与图标 → 去布阵并开战 → 自动显示实战建议 → 下一项状态 → 完成|每项保持暂停。关闭、叉号或 Esc 跳过全部剩余指引，后续战斗不再自动弹出；右上问号和 F1 仍可随时重看。
编辑普通剧本|scenario-editor-overview scenario-city-development scenario-person-appointment scenario-person-schedule scenario-custom-force scenario-initial-diplomacy scenario-landscape-schedule|普通模式 → 剧本编辑器 → 模板、同步武将库 → 设置年月日及城池发展科技 → 配置势力、人物身份与任职、登场及在野日期 → 设置初始外交 → 修正检查 → 保存 → 选择势力 → 开始|模板带入832名公共人物的归属、驻地与登场配置。来源只到年份，按1月1日处理；日期按每月30日填写。在野起始日期只控制何时进入在野，不安排在仕人物定时离职；初始条约不产生费用或功绩。游戏保留剧本及人物快照。
交换与管理剧本|scenario-editor-overview scenario-editor-factions|剧本编辑器 → 导入剧本、导出剧本或目录删除 → 确认|导入完整校验后写入，重复编号另存副本；删除前确认，不影响已开局进度。
编辑宝物配置|treasure-editor treasure-editor-landscape|首页或战役页 → 宝物编辑器 → 查找或分类 → 选择宝物 → 修改名称、效果与持续回合 → 保存配置|保存后用于新局；已有存档保留开局配置。导入后须保存，导出可备份；撤销、重做与恢复默认可回退，刷新恢复上次保存配置。
编辑武将|officer-editor officer-editor-custom officer-editor-landscape|首页或战役页 → 武将编辑器 → 查找人物、新建或复制新建 → 修改五项能力、适性和人物资料 → 保存|保存用于新局；自建人物可在战役选用并进入普通模式人才池。未保存返回须选择保存、舍弃或取消；导入确认后覆盖同编号记录，已有存档保留开局资料。
就地驻守|army-card army-hold army-card-landscape army-hold-landscape
`.trim().split('\n').map(line=>line.split('|'));

export async function loadManualContent(root){
const entries=new Map(mapping.map(([name,images,steps,note])=>[name,{images:images.split(' '),steps,note}]));
assert.equal(entries.size,mapping.length,'Duplicate workflow name');
const reference=await readFile(resolve(root,'docs/玩家行动交互流程.md'),'utf8');
const captures=JSON.parse(await readFile(resolve(root,'docs/images/player-actions/captures.json'),'utf8'));
const categories=[];let category=null,table=false;
for(const line of reference.split(/\r?\n/)){
 if(line.startsWith('## ')){category={name:line.slice(3),actions:[]};categories.push(category);table=false;}
 if(/^\| (行动|选择) \|/.test(line))table=true;
 else if(table&&line.startsWith('| ')&&!line.startsWith('| ---')){
  const [name,sequence]=line.split('|').slice(1).map(s=>s.trim());const m=entries.get(name);assert.ok(m,'Missing screenshots: '+name);
  category.actions.push({id:'action-'+(mapping.findIndex(row=>row[0]===name)+1),name,steps:(m.steps||sequence).split(/\s*→\s*/).map(s=>s.replace(/`/g,'')),images:m.images,note:m.note||''});entries.delete(name);
 }else if(table&&!line.trim())table=false;
}
assert.equal(entries.size,0,'Mapping contains workflows not present in reference');
const chapters=categories.filter(c=>c.actions.length);chapters.unshift(chapters.splice(chapters.findIndex(c=>c.name==='开始游戏与编辑'),1)[0]);const actions=chapters.flatMap(c=>c.actions);
const used=[...new Set(actions.flatMap(a=>a.images))];
for(const id of used){assert.ok(captures[id],'Missing capture '+id);assert.ok((await stat(resolve(root,'docs',captures[id].file))).size>1000,'Empty screenshot '+id);}
return {reference,chapters,actions,used,captures};
}
