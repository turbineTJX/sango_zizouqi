import {readFile,writeFile} from 'node:fs/promises';
import {nationalWorld,NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {SETTLEMENT_TIER_PROPOSAL as plan} from '../data/design/settlement-tier-proposal.mjs';
const audit=JSON.parse(await readFile('outputs/historical-geography-20261108/settlement-proposal.json','utf8'));
if(!audit.passed||audit.status!=='proposal')throw Error('先通过主城与府候选核查');
const world=nationalWorld('guandu-200'),byId=new Map(world.cities.map(c=>[c.id,c])),names=ids=>ids.map(id=>byId.get(id).name).join('、');
const promoted=audit.changes.filter(c=>c.to==='large'),demoted=audit.changes.filter(c=>c.to==='small');
const text=`# 主城与府分层设计候选

建议将现有76座城池分为48座主城、28座城邑府，另保留24处道路乡邑府；全图仍是153处地点，其中府共52处、关卡12处、港口41处。主城承担区域经营与势力存续，府承担副中心、边地、产业和交通分工。

这是分层设计候选，运行版本仍为54座大城、22座小城。候选名单已完整覆盖76座城池，并通过七个剧本的开局主城检查；五处府的建议归属与当前道路最近主城不同，需要在改级时一并落实。48是逐城归类的结果，不是强行凑出的配额。

## 判断标准

${plan.principles.map(p=>'- '+p).join('\n')}

原底图的方框、圆圈只能说明参考图中的层级，不能直接决定汉末三国游戏中的主城。也不能把“三国时期的郡治”“后世的都城”或“现代的大城市”单独作为判据。这里的府是游戏分层，不对应史制中的固定行政等级。

侯官升为主城主要出于闽地独立经营和地域间距，不把它说成汉末的州郡首府。[福州地方志](https://www.fuzhou.gov.cn/zgfzzt/zjrc/qhyg/202509/t20250925_5083026.htm)区分了汉末侯官、三国建安郡和西晋晋安郡；地图沿用侯官名称。城、关、港的分工参考[《三国志11》官方介绍](https://www.gamecity.com.tw/sangokushi/11wpk/game/02.html)，具体分层是本项目的设计选择。

## 主城名单

| 区域 | 主城 | 区域作用 |
| --- | --- | --- |
${plan.regions.map(r=>'| '+r.name+' | '+names(r.main)+' | '+r.role+' |').join('\n')}

陈留、平原、汝南、小沛、吴、新野、庐江、云南、建宁、武陵、桂阳、零陵这十二处，保留已确认的主城地位。小沛、新野等是兼顾历史起家舞台和开局势力存续的明确例外，不为减少主城数量而抹去。

## 城邑府名单及分工

“建议主城”表示设计上的区域归属。城邑府保留原有人员、钱粮、兵源、军政、驻军、城防和占领；不把现有城池转成无独立账本的道路节点，也不因改级移动人物或凭空增加资源。现有道路乡邑府继续沿用附属地点规则。

| 府 | 建议主城 | 分工与取舍 |
| --- | --- | --- |
${plan.prefectures.map(p=>'| '+byId.get(p.id).name+' | '+byId.get(p.center).name+' | '+p.role+' |').join('\n')}

## 相对当前版本的调整

建议提升为主城的8处：${promoted.map(c=>c.name).join('、')}。前七处补回辽东、幽州、青徐、荆州与巴地的重要中心；侯官补闽地经营中心。

建议改为府的14处：${demoted.map(c=>c.name).join('、')}。它们仍有历史、经济或军事价值，只是在这套区域分工中不单独承担主城职责。军事要冲可以是有城防、有驻军的府，不能把“府”统一画成没有城墙的小村落。

## 剧本检查

| 剧本 | 开局势力数 | 候选名单下缺少主城的势力 |
| --- | ---: | --- |
${audit.openings.map(o=>'| '+NATIONAL_SCENARIOS.find(s=>s.id===o.scenario).name+' | '+o.factions+' | '+(o.missing.length?o.missing.join('、'):'无')+' |').join('\n')}

每个开局势力至少拥有一座候选主城；全部37势力的群雄集结也通过。势力失去最后主城的现行规则不变，府不能单独维持势力存续。后续应用候选时仍需复核实际经营、进攻目标和能力成长，不仅检查开局名单。

## 改级前需要落实的五处归属

当前都市圈按道路行程选择最近主城。以下差异说明分层不能只换城池图标，还要核对同岸通道、港口转接和各段行程；不能靠手工写死一个主城名称来掩盖错误道路。

| 府 | 建议归属 | 候选等级下当前道路最近主城 |
| --- | --- | --- |
${audit.pendingCenterAssignments.map(p=>'| '+p.name+' | '+p.recommendedCenter+' | '+p.currentRoadCenter+' |').join('\n')}

西平、柳城优先核对地域通道；钟离核对淮河渡口；广陵核对淮泗北岸行程；井陉核对太行山前通道。改级应用还需同步都市圈、设施上限、经济与征兵、AI目标估值、势力覆灭、剧本校验、模型和标签。新增主城不自动添人添兵，改为府也不清除原有建设或驻军。

候选数据见[分层设计表](../data/design/settlement-tier-proposal.mjs)，完整性与开局核查入口为 \`npm run audit:settlement-tiers\`。历史地理修正及其依据见[全国地图与战略AI](全国地图与战略AI.md)。
`;
await writeFile('docs/主城与府分层设计候选.md',text);console.log('已生成48主城、28城邑府的逐城候选与七剧本检查');
