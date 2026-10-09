// Coverage describes gameplay decisions, not navigation clicks. A fixed policy
// is an explicit AI choice; it still uses the common legality and settlement.
const entry=(pages,shared,ai,policy)=>({pages,shared,ai,policy});
export const PLAYER_AI_DECISIONS=Object.freeze({
 domestic:entry(['city','domestic','appoint','personnel'],[['domestic.mjs','assignDomestic'],['domestic.mjs','dismissDomestic'],['officer-recommendation.mjs','rankOfficerCandidates']],[['talent-lifecycle.mjs','prepareEnemyDomestic']],'按本城真实需求补任；保留已开始工作'),
 proposals:entry(['proposals'],[['domestic.mjs','actionCandidates'],['domestic.mjs','decideDomesticProposal']],[['domestic.mjs','beginDomesticTurn']],'同一候选与开办处理器；AI即时准奏，玩家可逐案裁示'),
 priority:entry(['affairs'],[['domestic.mjs','setDomesticPriority'],['faction-affairs.mjs','fillFactionAppointments']],[['talent-lifecycle.mjs','prepareEnemyDomestic']],'各势力独立优先顺序，缺粮缺金时先安排生产'),
 budgets:entry(['budget'],[['city-budget.mjs','cityBudget'],['city-budget.mjs','setCityBudget']],[['strategic-ai.mjs','strategicCityBudget'],['strategic-ai.mjs','manageStrategicEconomy']],'城市保留底线采用保存值；动态需求随真实军政办理估算'),
 governor:entry(['governor'],[['strategic-campaign.mjs','appointGovernor']],[['talent-lifecycle.mjs','prepareEnemyDomestic']],'从合法驻城人选按共用太守评分任命'),
 scouting:entry(['scouting'],[['scouting.mjs','dispatchScout'],['scouting.mjs','recallScout']],[['strategic-scouting-ai.mjs','planStrategicScouting']],'合法周边终点、实际负责人、共同每日行程与情报期限'),
 formation:entry(['troops'],[['strategic-campaign.mjs','prepareCityUnits'],['strategic-campaign.mjs','changeCityTroop'],['strategic-campaign.mjs','equipCityUnit'],['strategic-campaign.mjs','recruitLocalUnits'],['strategic-campaign.mjs','disbandCityUnits']],[['strategic-ai.mjs','manageStrategicEconomy'],['siege-defense.mjs','siegeDefensePlan']],'实际技术、编制费用、兵源与本城预算；守城自动编制共用方案'),
 expedition:entry(['expedition','commanders'],[['strategic-orders.mjs','requestFactionOrder'],['strategic-campaign.mjs','expeditionError'],['officer-recommendation.mjs','rankOfficerCandidates']],[['strategic-ai.mjs','planStrategicAI']],'选真实部队与指挥，旬初选择目标，军令逐日复核'),
 routes:entry(['routes'],[['strategic-campaign.mjs','findCampaignRoute'],['strategic-campaign.mjs','orderCampaignArmy']],[['strategic-ai.mjs','planStrategicAI']],'公开道路与本方合法情报；实际移动才接敌'),
 transport:entry(['transport'],[['strategic-orders.mjs','requestFactionOrder'],['strategic-campaign.mjs','transferOfficer']],[['strategic-ai.mjs','safeStrategicTransportRoute'],['strategic-ai.mjs','planStrategicAI']],'本方库存、实际人员与已知道路威胁；真实装卸'),
 timing:entry(['interruption'],[['strategic-orders.mjs','requestFactionOrder']],[['strategic-ai.mjs','expeditionTiming']],'保留即刻与完成后执行；等待命令随存档保存'),
 diplomacy:entry(['diplomacy'],[['diplomacy.mjs','assignDiplomat'],['diplomacy.mjs','dismissDiplomat'],['diplomacy.mjs','setDiplomaticGoal'],['diplomacy.mjs','setDiplomaticBudget'],['diplomacy.mjs','approveDiplomaticProposal'],['diplomacy.mjs','decideDiplomaticProposal']],[['diplomacy.mjs','planDiplomaticAI'],['diplomacy.mjs','evaluateDiplomaticProposal']],'默认自动方向与保存预算底线；按合法情报评价，批准与实际签约分开'),
 armies:entry(['armies'],[['army-management.mjs','previewMilitaryFlow'],['army-management.mjs','applyMilitaryFlow'],['army-appointments.mjs','appointArmyRoles'],['postbattle-appointments.mjs','confirmPostbattleAppointments'],['battle-appointments.mjs','appointBattleRoles']],[['strategic-management-ai.mjs','chooseArmyManagement'],['strategic-management-ai.mjs','manageArmyManagementAI'],['army-appointments.mjs','recommendArmyAppointments'],['army-appointments.mjs','settleArmyAppointments'],['battle-appointments.mjs','planArrivalAppointmentsAI']],'只有军团长与军师；共同评分与真实人员任命，战后补任失效职位；保留作战和增援承诺'),
 march:entry(['marchMode'],[['strategic-campaign.mjs','setArmyMarchMode']],[['strategic-management-ai.mjs','chooseArmyMarchMode']],'安全友方行程可轻装，返城按任务恢复辎重；急行须实际提前到达且携粮与士气能支撑行程'),
 support:entry(['battles'],[['strategic-orders.mjs','requestFactionOrder']],[['strategic-support-ai.mjs','planStrategicSupport']],'实际战场与已知粮路，使用真实队伍、预算和期限'),
 defense:entry(['encounter'],[['siege-defense.mjs','siegeDefensePlan'],['strategic-campaign.mjs','prepareAutoSiegeDefense']],[['siege-defense.mjs','siegeDefensePlan']],'无法编制时接受空城占领；有实际守军时进入共同战场'),
 deployment:entry(['deployment','reinforcements'],[['engine.mjs','fillSlots'],['engine.mjs','lockDeployment'],['engine.mjs','deployUnit'],['engine.mjs','configureBattleIntent']],[['engine.mjs','planBattleCouncilAI'],['battle-ai.mjs','planEnemyArmy'],['battle-ai.mjs','rankEnemyReserves']],'后台处理战前会议和援军；共同布阵与人数限制，保留在场部队及逐队撤离设置，不为凑羁绊调序'),
 command:entry(['combat','stratagems'],[['engine.mjs','issueCommand']],[['battle-ai.mjs','chooseEnemyCommand'],['strategic-ai.mjs','planStrategicAI']],'固定条件与优先序、共用选区；战略战场按真实战损和补给撤退'),
 retreat:entry(['deployment','reinforcements'],[['battle-council.mjs','configureCouncilRetreat'],['strategic-retreat.mjs','retreatDestinations'],['strategic-retreat.mjs','configureRetreatDestination']],[['strategic-retreat.mjs','initializeRetreatDestinations'],['strategic-ai.mjs','planStrategicAI']],'逐队撤离默认继承已保存设置；撤离节点按本方合法情报选最近可达处'),
 treasure:entry(['treasures'],[['treasures.mjs','grantTreasure'],['treasures.mjs','equipTreasure'],['treasures.mjs','storeTreasure']],[['treasures.mjs','manageTreasuresAI']],'按实际收藏与资格授予装备；已有合法装备保留，未分配宝物保留城库'),
 captive:entry(['personnel'],[['officer-fates.mjs','releaseCaptive']],[['diplomacy.mjs','diplomaticCandidates'],['diplomacy.mjs','advanceDiplomacy']],'优先实际外交赎回和交换；未达成保留俘虏，失去关押条件按公共规则释放')
});
export const NON_DECISION_PAGES=Object.freeze({
 modes:'选择游戏运行模式',scenarios:'选择开局剧本',factions:'选择玩家或观察势力',custom:'编辑双方的初始战役与规则输入',saves:'本机存档与显示设置',
 map:'地图浏览，业务决策见对应对象页',officer:'只读人物详情',scoutReport:'已保存侦察报告',intelligence:'只读合法情报',unit:'只读部队详情',tactics:'查看固定战法，自动施放共用引擎',buildings:'只读设施详情，建设修复归内政',reports:'已发生事项核阅',harvest:'实际入库统计',battleReport:'共同战后结算',replay:'已保存战斗回放',records:'已保存人物与城市活动',abilities:'只读能力说明'
});
