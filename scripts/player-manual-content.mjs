import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

// One mapping per maintained workflow. Screens may be shared when actions use
// the same page; the manual keeps only the player's steps, not design prose.
const mapping=`
打开城市命令|map city-menu|点己方城市 → 选择内政、军事、人事等入口
查找空闲人员|city-directory
查找军团或战线|army-menu battle-history
查阅人物与部队|personnel officer battle-unit
查询敌情|intelligence-menu intelligence-directory scout-report
查看城内与建筑|city-interior building-detail
地图选点|expedition-route transport-relay
委任内政负责人|domestic direction appointment appointment-selected
改任内政方向|direction appointment timing
解除内政|direction-assigned timing
任命或更换太守|city-menu governor
解除太守|governor-assigned
调整全势力内政优先级|affairs
补齐全势力委任|affairs
同意一项内政提案|proposals proposals-approved
暂缓提案|proposals
同意本页提案|proposals proposals-approved
设置后续自动同意|proposals-policy
修改城市保留预算|budget budget-draft budget-saved|城市详情 → 收支预算 → 修改保留金、粮 → 保存预算|重置恢复已保存值，关闭不提交。
安排人才工作|domestic direction talent|城市内政 → 人才方向 → 委任负责人 → 审批提案 → 人才页查看进度
派遣侦察|scout-source scout-route scout-running scout-landscape
调整侦察路线|scout-route
查看报告|scout-contacts scout-report
停止侦察|scout-running
新增城内部队|troop-list troop-officer troop-edit troop-configured troop-review|城市 → 军事 → 编制 → 新增并选择主将 → 设置兵力和装备 → 确认该队 → 核阅下令
调整城内部队|troop-list troop-edit troop-review|编制列表 → 修改目标队 → 调整兵种、兵力、装备 → 确认该队 → 核阅下令
解散城内部队|troop-list troop-disband troop-disband-review|编制列表 → 解散目标队 → 核对待解散与返还兵员 → 下令
从现有部队出征|expedition-select expedition-roles expedition-route expedition-review expedition-landscape
出征前临时编制|expedition-select troop-list troop-edit expedition-select|出征选队 → 编制 → 新增或调整部队 → 返回选队 → 任命并选路 → 下令
移除已选部队|expedition-select expedition-landscape|已选部队条 → 点目标队的“×”|只取消本次选择，不解散部队。
讨伐贼寨|bandit bandit-expedition expedition-roles expedition-review|已发现贼寨 → 选择派出城 → 选队与任命 → 核阅路线 → 下令
增援与护路|expedition-select expedition-route march-route|选来源城或军团 → 出征或调动 → 选实际战场或道路节点 → 核阅下令|部队实际抵达后才参加增援或驻守。
下达调动或改令|army-menu march-route march-review
返城或驻守节点|march-route march-review
重置行军路线|march-route
切换行军方式|army-menu march-mode
调整军团编制|army-adjust army-roles army-review
拆分军团|army-split army-roles army-split-review
合并军团|army-merge army-merge-review
征募整补|army-recruit army-recruit-review
纯人员调任|transfer-person transfer-empty transport-review|来源城市 → 人事、调任 → 选择人员 → 地图选友城 → 物资留零 → 核阅下令
携兵或携物资运输|transfer-person transport transport-review transport-landscape|调任选人 → 地图选友城 → 填金、粮、预备兵 → 核对预计抵达 → 下令
接力运输|transport-options transport-relay transport-review
分批运粮|transport-cycles|调任选一名往返运粮人员 → 选择目标和粮数 → 运输选项 → 选择批次 → 核阅下令
立即执行|timing
完成后执行|timing waiting
返回修改|timing
取消等待命令|waiting
设置外交目标|diplomacy
设置外交底线|diplomacy-budget
委任使臣|diplomacy-appoint
解除使臣或取消待任|diplomat-assigned|外交 → 负责人或待任列表 → 召回或取消待任
批准外交方案|diplomacy-proposal diplomacy-terms diplomacy-approved
交涉或否决方案|diplomacy-proposal
查看履约|diplomacy-approved diplomacy-terms
释放本方所俘人员|prisoner release-confirm release-result
赎回己方被俘人员|captive ransom-confirm ransom-result|被俘人物详情 → 赎回 → 核对姓名和赎金 → 确认|取消不扣费，获释后仍须沿路返城。
通过外交交换俘虏|prisoner-exchange|外交 → 等待使臣提出交换方案 → 核对双方名单 → 批准 → 查看签署与交接
授予宝物|treasures treasure-grant treasure-equipped|宝物 → 授予 → 选择接收人 → 按需勾选同时装备 → 确认
装备／卸下|treasure-equipped
收回城库|treasure-equipped
查看效果与锁定|treasures treasure-equipped
处理新战线|encounter defense encounter-control
临时守城编制|defense defense-manual troop-edit
自动编制守城|defense defense-auto
放弃无兵守城|defense defense-confirm defense-result
任命参战指挥|battle-appointments reinforcement-roles
排列出阵顺序|council
调整首发站位|battle-unit deployment-preview|拖动我军，或详情点“调整站位” → 点合法格或另一支我军 → 核对预览 → 确认|取消保留原位置。
设置后备入场位置|council reserve-position
设置战斗意图|battle-intent
设置自动撤离人数|retreat-settings|军议 → 撤离设置 → 填单队人数，或勾选多队 → 批量人数 → 应用|留空关闭自动撤离。
设置撤离目的地|retreat-node
重置阵型|battle-intent
开始战斗|battlefield council|完成任命与部署 → 确认或取消站位预览 → 确认开战
查看战场与部队|battlefield battle-unit
暂停与变速|battlefield stratagem-result|点击进行或暂停 → 点击速度按钮切换倍速
施放全军型军略|stratagem-army stratagem-army-result|军略 → 查看充能与次数 → 点击可用的全军军略|无范围选点的军略点击即执行。
施放范围军略|stratagem-list stratagem-area stratagem-landscape stratagem-result|军略 → 选择可用项 → 点战场落点 → 按需旋转 → 核对目标 → 施放|取消或 Esc 退出，不消耗充能。
全军撤退|stratagem-army|军略 → 基础军令 → 全军撤退|部队沿战场出口撤离，不会立即返城。
援军抵达军议|reinforcement reinforcement-roles|援军到达并暂停 → 调整本军任命 → 后备顺序和入场位置 → 撤离设置 → 继续作战
查看或接管其他战线|battle-history encounter-control
核阅战果|battle-report standalone-report
战后补任|postbattle-roles
开始普通模式|lobby scenarios faction
全 AI 观察|scenarios faction|首页 → 普通模式 → 全 AI 观察 → 选择剧本和观察势力 → 开始
开始历史战役|custom custom-review|战役模式 → 选择历史模板 → 核对双方及援军 → 核阅 → 开战
编辑自定义战役|custom-editor custom-army custom-reinforcements custom-review|自定义战役 → 选择地图与场景 → 编辑双方军团 → 设置援军 → 核阅开战
编辑单支战役军团|custom-army custom-select custom-roles custom-army-review|该军编制 → 新增或调整部队 → 选择已编队伍 → 任命军团长、军师 → 核阅确认
新建或修改地图|map-editor map-preview map-library|地图编辑器 → 选择用途分类 → 新图或载入 → 绘制地形与道路 → 预览 → 保存或用于战役
管理地图包|map-library
重试战役|standalone-report
执行本旬|map harvest|筹划安排 → 进行 → 处理期间待办 → 旬末回到筹划
处理奏报|reports
查看旬收获|harvest
查看当前动态与日志|journal officer
查看战史与回放|battle-history battle-report
查看整局结果|ending
新建手动存档|settings save-create saves
读取存档|saves
覆盖或删除手动档|saves save-overwrite save-delete
导出当前进度|save-transfer
导入文件|save-transfer|设置 → 导入 → 选择 JSON 文件 → 校验通过后载入
调整声音与表现|settings
查阅指引|guide
设置指引偏好|settings guide
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
