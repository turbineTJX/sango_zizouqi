// Validation of currently supported strategic design fields and handlers.
import {strategicAlgorithmProfile} from './strategic-algorithms.mjs';
export function validateStrategyDesigns(t){
 const errors=[],check=(ok,path,msg)=>{if(!ok)errors.push(path+'：'+msg);},num=(v,min=0,max=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const fields=(r,keys,path)=>{if(!r||typeof r!=='object'||Array.isArray(r)){errors.push(path+'：必须为记录');return false;}for(const key of Object.keys(r))check(keys.includes(key),path,'未接入字段 '+key);return true;};
 const economy=t.economy;
 const planning=t.strategicPlanning;
 if(fields(planning,['version','traceLimit','candidateLimit','pairLimit','forceVariants','assemblyDays','switchMargin','peacePressureRatio','preparationTurns','preparationPenalty','uncertaintyPerDay','maximumUncertainty','peacePriority','defensePriority','resourcePriority','victory','opposition','recovery','tempo','temperament','assessment','algorithms','personnel'],'strategicPlanning')){
  for(const key of ['version','traceLimit','candidateLimit','pairLimit','forceVariants','assemblyDays','preparationTurns'])check(Number.isSafeInteger(planning[key])&&planning[key]>0,'strategicPlanning.'+key,'须为正整数');
  check(planning.pairLimit>=planning.candidateLimit&&planning.pairLimit<=64,'strategicPlanning.pairLimit','边境枚举须覆盖候选且不超过64组');
  for(const key of ['switchMargin','preparationPenalty','uncertaintyPerDay','maximumUncertainty','peacePriority','defensePriority'])check(num(planning[key],0),'strategicPlanning.'+key,'须为非负数');
  check(planning.candidateLimit<=16&&planning.forceVariants<=4&&planning.preparationTurns<=3&&planning.traceLimit<=30,'strategicPlanning','候选、推演或记录超出有限规划上限');
  check(num(planning.peacePressureRatio,.1,3)&&num(planning.resourcePriority,1,2),'strategicPlanning','战略比例无效');
  if(fields(planning.personnel,['frontKeepOfficers','frontGuardUnits','frontGuardTroops','frontMilitaryWeight','rearCivilianWeight','frontDepartureWeight'],'strategicPlanning.personnel')){
   const p=planning.personnel;
   for(const key of ['frontKeepOfficers','frontGuardUnits'])check(Number.isSafeInteger(p[key])&&num(p[key],1,4),'strategicPlanning.personnel.'+key,'前线保留人数须为1至4');
   check(Number.isSafeInteger(p.frontGuardTroops)&&num(p.frontGuardTroops,100,10000),'strategicPlanning.personnel.frontGuardTroops','前线守备人数须为有界整数');
   for(const key of ['frontMilitaryWeight','rearCivilianWeight','frontDepartureWeight'])check(num(p[key],0,1),'strategicPlanning.personnel.'+key,'人才调配权重须为0至1');
  }
  if(fields(planning.temperament,['baseChance','judgmentWeight','politicsWeight','quietAfterTurns','quietPerTurn','maximumQuietBonus','minimumChance','maximumChance','earlyFactor','maximumLossShare','ratioRelief','minimumAdvantage','valueTolerance'],'strategicPlanning.temperament')){
   const p=planning.temperament;
   for(const key of ['judgmentWeight','politicsWeight','quietPerTurn','maximumQuietBonus','minimumChance','maximumChance','earlyFactor','maximumLossShare'])check(num(p[key],0,1),'strategicPlanning.temperament.'+key,'概率与比例须为0至1');
   check(p.minimumChance>0&&p.maximumChance<1&&p.minimumChance<p.maximumChance&&p.earlyFactor>0&&p.earlyFactor<1&&p.maximumLossShare<=.6&&p.maximumQuietBonus<=.2,'strategicPlanning.temperament','须保留随机差异、前期节制及有限风险');
   check(Number.isSafeInteger(p.quietAfterTurns)&&num(p.quietAfterTurns,1,20),'strategicPlanning.temperament.quietAfterTurns','僵持按真实回合计算');
   if(fields(p.baseChance,['1','2','3','4'],'strategicPlanning.temperament.baseChance')){
    check([1,2,3,4].every(k=>num(p.baseChance[k],0,1))&&p.baseChance[1]<=p.baseChance[2]&&p.baseChance[2]<p.baseChance[3]&&p.baseChance[3]<p.baseChance[4],'strategicPlanning.temperament.baseChance','性格冒险概率须依次递增');
   }
   for(const key of ['ratioRelief','minimumAdvantage','valueTolerance'])if(fields(p[key],['cautious','balanced','bold'],'strategicPlanning.temperament.'+key)){
    for(const style of ['cautious','balanced','bold'])check(num(p[key][style],key==='minimumAdvantage'?1:0,key==='ratioRelief'?.5:key==='minimumAdvantage'?2:50),'strategicPlanning.temperament.'+key+'.'+style,'冒险容忍须有界，不能折减实际费用');
   }
  }
  try{if(!planning.algorithms)throw Error();strategicAlgorithmProfile(planning.algorithms);}catch{check(false,'strategicPlanning.algorithms','算法配置无效或实现未注册');}
  if(fields(planning.assessment,['horizonSteps','powerScale','reserveShare','maxSustain','maxControl','damageEffects','healingEffects','protectionEffects','controlEffects'],'strategicPlanning.assessment')){
   const a=planning.assessment;
   check(Number.isSafeInteger(a.horizonSteps)&&num(a.horizonSteps,24,120),'strategicPlanning.assessment.horizonSteps','静态效果预算须为24至120回合');
   check(num(a.powerScale,10,500),'strategicPlanning.assessment.powerScale','战力归一化系数须为10至500');
   for(const key of ['reserveShare','maxSustain','maxControl'])check(num(a[key],0,1),'strategicPlanning.assessment.'+key,'折扣和效果上限须为0至1');
   for(const key of ['damageEffects','healingEffects','protectionEffects','controlEffects']){
    const effects=a[key];check(effects&&typeof effects==='object'&&!Array.isArray(effects)&&Object.keys(effects).length>0,'strategicPlanning.assessment.'+key,'须配置已接入的战法效果预算');
    for(const [effect,value] of Object.entries(effects||{}))check(Object.values(t.tactics).some(s=>s.effect===effect)&&num(value,0,key==='damageEffects'?5:1),'strategicPlanning.assessment.'+key+'.'+effect,'效果须存在且权重须有界');
   }
  }
  if(fields(planning.recovery,['horizonDays','maximumForecastDays','freshIntelligenceDays','maximumAdvantageRelief','minimumAdvantage','bufferLosses','maximumCostRelief'],'strategicPlanning.recovery')){
   const r=planning.recovery;
   for(const key of ['horizonDays','maximumForecastDays','freshIntelligenceDays'])check(Number.isSafeInteger(r[key])&&num(r[key],1,key==='maximumForecastDays'?180:30),'strategicPlanning.recovery.'+key,'补兵预测窗口须有界');
   check(r.maximumForecastDays>=r.horizonDays&&num(r.maximumAdvantageRelief,0,.5)&&num(r.minimumAdvantage,1.2,2)&&num(r.bufferLosses,1,3)&&num(r.maximumCostRelief,1,3),'strategicPlanning.recovery','补兵风险与成本折算须有界');
  }
  if(fields(planning.tempo,['earlyLastTurn','campaignLastTurn','campaignUnits','jointUnits','jointCities','jointFundedCities','maxOperations','columnUnits','campaignAssemblyDays','jointAssemblyDays','executionBufferDays','repairTurns','contactWindowDays','continuationMargin','minimumContinuationAdvantage'],'strategicPlanning.tempo')){
   const p=planning.tempo;for(const k of ['campaignUnits','jointUnits','jointCities','jointFundedCities','maxOperations','columnUnits'])check(Number.isSafeInteger(p[k])&&num(p[k],1,20),'strategicPlanning.tempo.'+k,'军团和准备规模须为有界整数');
   for(const k of ['earlyLastTurn','campaignLastTurn'])check(Number.isSafeInteger(p[k])&&num(p[k],1,200),'strategicPlanning.tempo.'+k,'阶段边界须为有界回合数');
   check(p.earlyLastTurn<p.campaignLastTurn,'strategicPlanning.tempo','中期回合边界须晚于前期');
   check(p.campaignUnits<p.jointUnits&&p.jointFundedCities<=p.jointCities&&p.maxOperations<=2&&p.columnUnits<=10&&num(p.continuationMargin,0,.25)&&num(p.minimumContinuationAdvantage,1.1,1.5),'strategicPlanning.tempo','持续作战和协同规模须有界');
   for(const k of ['campaignAssemblyDays','jointAssemblyDays','executionBufferDays'])check(Number.isSafeInteger(p[k])&&num(p[k],1,40),'strategicPlanning.tempo.'+k,'集结与执行余量须为有界天数');
   check(Number.isSafeInteger(p.repairTurns)&&num(p.repairTurns,1,2)&&Number.isSafeInteger(p.contactWindowDays)&&num(p.contactWindowDays,1,2),'strategicPlanning.tempo','准备修复最多两回合，接敌偏差最多两天');
   check(p.campaignAssemblyDays>=planning.assemblyDays&&p.jointAssemblyDays>=p.campaignAssemblyDays,'strategicPlanning.tempo','集结范围须随实际作战容量递增');
  }
  const oppositionKeys=['emergencyPowerPerMan','citySupportShare','fieldSupportShare','cityResponseDays','minimumBattleDays','maxBattleDays','neutralContestDays','staleMarginPerDay','maxStaleMargin','lossFactor'];
  if(fields(planning.opposition,oppositionKeys,'strategicPlanning.opposition')){
   const o=planning.opposition;
   check(num(o.emergencyPowerPerMan,1,2),'strategicPlanning.opposition.emergencyPowerPerMan','估计战力系数须为1至2');
   for(const key of ['citySupportShare','fieldSupportShare','staleMarginPerDay','maxStaleMargin','lossFactor'])check(num(o[key],0,1),'strategicPlanning.opposition.'+key,'比例须为0至1');
   for(const key of ['cityResponseDays','minimumBattleDays','maxBattleDays','neutralContestDays'])check(Number.isSafeInteger(o[key])&&num(o[key],1,20),'strategicPlanning.opposition.'+key,'到达窗口须为1至20天');
   check(o.citySupportShare<=.5&&o.minimumBattleDays<=o.maxBattleDays,'strategicPlanning.opposition','潜在援军须保留至少一半驻军，交战窗口须有界');
  }
  const victoryKeys=['territoryValue','endgameValue','regionalValue','completionValue','eliminationValue','connectionValue','corridorValue','maxCorridors','focusValue','focusSwitchMargin','maxBonus','observedStockShare','observedStockGoldPerPoint','maxObservedStockBonus'];
  if(fields(planning.victory,victoryKeys,'strategicPlanning.victory')){
   check(num(planning.victory.observedStockShare,0,.5)&&num(planning.victory.observedStockGoldPerPoint,50,500)&&num(planning.victory.maxObservedStockBonus,0,140),'strategicPlanning.victory','情报军资收益折算须有界');
   for(const key of victoryKeys)check(num(planning.victory[key],0,500),'strategicPlanning.victory.'+key,'统一战略参数须为0至500');
   check(planning.victory.territoryValue>0&&planning.victory.maxBonus>0&&Number.isSafeInteger(planning.victory.maxCorridors)&&planning.victory.maxCorridors<=8,'strategicPlanning.victory','统一战略收益或方向上限无效');
  }
 }
 const support=t.strategicSupport;
 if(fields(support,['maxMissions','reinforceRatio','guardRatio','maxTravelDays','guardFoodDays','quietDays','missionDays','minimumCargo','maximumCycles'],'strategicSupport')){
  for(const key of ['maxMissions','maxTravelDays','guardFoodDays','quietDays','missionDays','maximumCycles'])check(Number.isSafeInteger(support[key])&&support[key]>0,'strategicSupport.'+key,'须为正整数');
  for(const key of ['reinforceRatio','guardRatio'])check(num(support[key],1,3),'strategicSupport.'+key,'优势要求须为1至3');
  check(support.maxMissions<=4&&support.maximumCycles>=2&&support.maximumCycles<=5,'strategicSupport','支援名额或真实往返批次超出范围');
  if(fields(support.minimumCargo,['gold','grain','manpower'],'strategicSupport.minimumCargo'))for(const key of ['gold','grain','manpower'])check(Number.isSafeInteger(support.minimumCargo[key])&&support.minimumCargo[key]>0,'strategicSupport.minimumCargo.'+key,'须为正整数');
 }
 const incidents=t.domesticIncidents,rules=incidents?.rules;
 if(fields(rules,['triggerChance','closeRelation','hostileRelation','hostileChance','closeChanceMultiplier','minimumRewardShare','cityLimit','historyLimit'],'domesticIncidents.rules')){
  for(const key of ['triggerChance','hostileChance','closeChanceMultiplier','minimumRewardShare'])check(num(rules[key],0,1),'domesticIncidents.rules.'+key,'须为有效概率');
  check(num(rules.closeRelation,70,100)&&num(rules.hostileRelation,0,20),'domesticIncidents.rules','关系门槛无效');
  for(const key of ['cityLimit','historyLimit'])check(Number.isSafeInteger(rules[key])&&rules[key]>0,'domesticIncidents.rules.'+key,'须为正整数');
 }
 check(!!incidents?.events&&Object.keys(incidents.events).length>0,'domesticIncidents.events','缺少事件库');
 for(const [id,e]of Object.entries(incidents?.events||{})){
  const path='domesticIncidents.events.'+id;if(!fields(e,['name','directions','kinds','social','story','relationDelta','chance','quantity','progress','description'],path))continue;
  check(typeof e.name==='string'&&typeof e.description==='string'&&!/%/.test(e.description),path,'名称或叙述无效');
  check(num(e.chance,-.5,.5)&&num(e.quantity,.25,2)&&num(e.progress,.25,2),path,'事务效果超出范围');
  check(e.directions===null||Array.isArray(e.directions)&&e.directions.every(d=>t.directions[d]),path,'方向无效');
  check(e.kinds===null||Array.isArray(e.kinds)&&e.kinds.every(k=>Object.values(t.domesticActions).some(a=>a.kind===k)),path,'事务类型无效');
  check([null,'close','hostile'].includes(e.social)&&(e.social?!e.story:!!e.story),path,'社会事件类型无效');
  check(Number.isSafeInteger(e.relationDelta)&&e.relationDelta!==0&&num(e.relationDelta,-20,20),path,'交情变化无效');
  if(e.story&&fields(e.story,['resource','amount','source','building','actor','text'],path+'.story')){
   const v=e.story;check([null,'gold','grain','manpower'].includes(v.resource)&&Number.isSafeInteger(v.amount)&&num(v.amount,-3000,10000)&&(v.resource?v.amount!==0:v.amount===0&&e.kinds!==null)&&(!v.resource||e.directions?.length>0),path,'故事资源效果无效');
   check(v.amount>0?['gift','volunteers'].includes(v.source):v.source===null,path,'故事资源来源无效');
   check([null,'farm','commerce','barracks'].includes(v.building)&&['any','civil','bold'].includes(v.actor)&&typeof v.text==='string'&&v.text.includes('{source}')&&v.text.includes('{other}')&&!/概率|成功率|%/.test(v.text),path,'故事当事人或叙述无效');
  }
 }
 for(const [group,keys] of Object.entries({income:['gold','grain','manpower','governorPoliticsDivisor'],capacity:['grainBase','grainPerGranary','manpowerMax','recruitmentBase','recruitmentPerBarracks','armyFoodDays','minimumUnitGrain'],ai:['foodReserveDays','recruitReserveDays','economicWorkersPerDirection','cityTroopTarget']})){
  const row=economy?.[group];if(!fields(row,group==='ai'?[...keys,'offensive']:keys,'economy.'+group))continue;
  for(const key of keys){const value=row[key];if(group==='income'&&key!=='governorPoliticsDivisor'){const subKeys={gold:['base','perCommerce'],grain:['base','perFarm'],manpower:['base','perBarracks']}[key];if(fields(value,subKeys,'economy.income.'+key))for(const sub of subKeys)check(num(value[sub],1),'economy.income.'+key+'.'+sub,'须为正数');}else check(Number.isSafeInteger(value)&&value>0,'economy.'+group+'.'+key,'须为正整数');}
 }
 for(const [group,keys] of Object.entries({value:['gold','grain','manpower'],work:['base','abilityDivisor','managementDiscountBase','constructionSetbackShare','capacityMultiplierMax','preparationIntentMax','preparationShieldMax'],maintenance:['goldPerThousandTroops','woundedGoldFactor'],recruitment:['reserveCost','reserveTargetBase','reserveTargetTroopShare']})){
  const row=economy?.[group];if(fields(row,group==='maintenance'?[...keys,'officerSalaryByLevel']:keys,'economy.'+group))for(const key of keys)check(num(row[key],['reserveCost','goldPerThousandTroops'].includes(key)?0:Number.EPSILON),'economy.'+group+'.'+key,'参数须为有效非负数，比例及收益须大于零');
 }
 check(num(economy?.maintenance?.woundedGoldFactor,0,1)&&num(economy?.recruitment?.reserveTargetTroopShare,0,1),'economy.maintenance','比例须为0至1');
 check(num(economy?.work?.constructionSetbackShare,Number.EPSILON,1),'economy.work.constructionSetbackShare','工程延期比例须大于0且不超过1');
 check(num(economy?.work?.managementDiscountBase,Number.EPSILON,.5),'economy.work.managementDiscountBase','经营优惠须大于0且不超过共同折扣上限');
 check(Number.isSafeInteger(economy?.work?.capacityMultiplierMax)&&num(economy.work.capacityMultiplierMax,1,5)&&Number.isSafeInteger(economy.work.preparationIntentMax)&&num(economy.work.preparationIntentMax,30,60)&&num(economy.work.preparationShieldMax,.35,.6),'economy.work','强化产能和守城准备须有有限上限');
 const development=economy?.development;
 if(fields(development,['economicBuildings','localLevels','richCities','metropolitanMax','externalLevels','workValueBase','workValuePerLevel','foodForecastSafety','stockSupportDays'],'economy.development')){
  check(Array.isArray(development.economicBuildings)&&development.economicBuildings.slice().sort().join(',')==='barracks,commerce,farm','economy.development.economicBuildings','须为三种生产设施');
  check(Array.isArray(development.richCities)&&new Set(development.richCities).size===development.richCities.length&&development.richCities.every(id=>t.cities.some(c=>c.id===id&&c.kind==='city'&&c.citySize==='large')),'economy.development.richCities','须引用独立的大城');
  for(const key of ['metropolitanMax','workValueBase','workValuePerLevel','stockSupportDays'])check(Number.isSafeInteger(development[key])&&development[key]>0,'economy.development.'+key,'须为正整数');
  if(fields(development.localLevels,['small','large','rich','infrastructure'],'economy.development.localLevels'))for(const [key,v]of Object.entries(development.localLevels))check(Number.isSafeInteger(v)&&v>0&&v<=development.metropolitanMax,'economy.development.localLevels.'+key,'等级须在都市圈上限内');
  if(fields(development.externalLevels,['city','junction','gate','port'],'economy.development.externalLevels'))for(const kind of ['city','junction','gate','port']){const row=development.externalLevels[kind];if(fields(row,['commerce','farm','barracks','other'],'economy.development.externalLevels.'+kind))for(const [key,v]of Object.entries(row))check(Number.isSafeInteger(v)&&v>=0&&v<=development.metropolitanMax,'economy.development.externalLevels.'+kind+'.'+key,'等级须为已接入的非负数');}
  check(num(development.foodForecastSafety,Number.EPSILON,1),'economy.development.foodForecastSafety','预计口粮需保留安全余量');
 }
 const offensive=economy?.ai?.offensive,path='economy.ai.offensive';
 if(fields(offensive,['maxWoundedShare','homeFoodDays','styles','lossFactor','lossPerPoint','grainPerPoint','goldPerPoint','dayCost','workPerPoint','maxEstimateError','judgmentLeadershipWeight','counterattackWeight','objectiveValues','securityPowerPerPoint','securityValueCap'],path)){
  for(const key of ['homeFoodDays','lossPerPoint','goldPerPoint','workPerPoint','securityPowerPerPoint','securityValueCap'])check(Number.isSafeInteger(offensive[key])&&offensive[key]>0,path+'.'+key,'须为正整数');
  for(const key of ['grainPerPoint','dayCost'])check(num(offensive[key],.001,1000000),path+'.'+key,'评分费率须为有界正数');
  for(const key of ['lossFactor','maxEstimateError','judgmentLeadershipWeight','counterattackWeight'])check(num(offensive[key],0,1),path+'.'+key,'比例须为0至1');
  if(fields(offensive.objectiveValues,['city','gate','port'],path+'.objectiveValues'))for(const key of ['city','gate','port'])check(num(offensive.objectiveValues[key],1),path+'.objectiveValues.'+key,'须为正数');
  check(num(offensive.maxWoundedShare,0,1),path+'.maxWoundedShare','伤兵比例须为0至1');
  if(fields(offensive.styles,['bold','balanced','cautious'],path+'.styles'))for(const name of ['bold','balanced','cautious']){
   const row=offensive.styles[name];if(fields(row,['minimumValue','economicWeight','militaryWeight','ratio','reserve','patience'],path+'.styles.'+name)){check(num(row.minimumValue),path+'.styles.'+name+'.minimumValue','须为非负数');for(const key of ['economicWeight','militaryWeight'])check(num(row[key],.1,3),path+'.styles.'+name+'.'+key,'倾向权重须为0.1至3');check(num(row.ratio,1,3)&&num(row.reserve,0,1)&&Number.isSafeInteger(row.patience)&&row.patience>0,path+'.styles.'+name,'优势、守备或计划期限无效');}
  }
 }
 const modes={build:'progress',research:'quantity',cash:'quantity',grain:'quantity',effect:'quantity',discount:'quantity',recruit:'quantity',heal:'quantity',repair:'quantity',prepare:'quantity',trade:'chance',rescue:'chance',explore:'chance',hire:'chance',persuade:'chance',reassure:'chance'};
 for(const id of Object.keys(t.directions))check(['leadership','force','intellect','politics','charm'].includes(t.directionStats?.[id]),'directionStats.'+id,'方向须指定唯一主属性');
 check(new Set(Object.values(t.directionStats||{})).size===5,'directionStats','六方向须覆盖五种属性');
 const buildingIds=['commerce','farm','granary','workshop','barracks','clinic','drill','walls','hall','arrowTower','musicStage','aidCamp'];
 for(const id of ['commerce','agriculture','technology','military','martial','talent'])check(typeof t.directions[id]==='string'&&t.directions[id].length>0,'directions.'+id,'缺少内政方向名称');
 for(const id of Object.keys(t.directions))check(['commerce','agriculture','technology','military','martial','talent'].includes(id),'directions.'+id,'新增内政方向须先接入流程');
 for(const id of buildingIds)check(!!t.buildings[id],'buildings.'+id,'缺少已有建筑');
 for(const [id,b] of Object.entries(t.buildings)){
  const path='buildings.'+id;if(!fields(b,['name','direction','cost','days','description','projectName','projectDescription','durability','technology','maximumLevel','combat'],path))continue;
  check(buildingIds.includes(id),path,'新建筑须先接入城市状态与效果');
  if(['arrowTower','musicStage','aidCamp'].includes(id)){
   check(t.technologies.records.some(r=>r.id===b.technology)&&b.maximumLevel===3,path,'战场设施解锁或等级上限无效');
   const expected={arrowTower:'shoot',musicStage:'intent',aidCamp:'heal'}[id],r=b.combat;
   if(fields(r,['effect','range','interval',...(expected==='shoot'?['power','powerPerLevel']:expected==='intent'?['intentPerLevel']:['healPerLevel'])],path+'.combat')){
    check(r.effect===expected&&Number.isSafeInteger(r.range)&&num(r.range,1,5)&&Number.isSafeInteger(r.interval)&&num(r.interval,1,30),path,'战场设施范围或间隔无效');
    if(expected==='shoot')check(num(r.power,1,500)&&num(r.powerPerLevel,0,200),path,'箭塔威力无效');
    if(expected==='intent')check(Number.isSafeInteger(r.intentPerLevel)&&num(r.intentPerLevel,1,5),path,'军乐台战意无效');
    if(expected==='heal')check(num(r.healPerLevel,Number.EPSILON,.02),path,'救护营救治比例无效');
   }
  }else check(b.technology===undefined&&b.combat===undefined&&b.maximumLevel===undefined,path,'普通设施不支持战场效果字段');
  for(const k of ['name','description','projectName','projectDescription'])check(typeof b[k]==='string'&&b[k].length>0,path+'.'+k,'文本不能为空');
  check(Number.isSafeInteger(b.durability)&&b.durability>0&&b.durability<=100000,'buildings.'+id+'.durability','每级耐久须为正整数');
  check(Object.hasOwn(t.directions,b.direction),path+'.direction','未知内政方向');check(num(b.cost)&&Number.isInteger(b.cost),path+'.cost','费用须为非负整数');check(num(b.days,1)&&Number.isInteger(b.days),path+'.days','工期须为正整数天');
 }
 for(const [id,a] of Object.entries(t.domesticActions)){
  const path='domesticActions.'+id;if(!fields(a,['name','direction','cost','days','kind','value','reserveValue','stat','cooperation','power','risk','opportunity'],path))continue;
  check(Object.hasOwn(modes,a.kind),path+'.kind','未实现的内政动作类型');check(a.cooperation===modes[a.kind],path+'.cooperation','协作方式与当前处理器不符');
  check(['leadership','force','intellect','politics','charm'].includes(a.stat),path+'.stat','须指定一个有效主属性');
  const direction=a.kind==='build'?t.buildings[a.value]?.direction:a.direction;
  check(t.directionStats?.[direction]===a.stat,path+'.stat','同方向全部事务必须使用该方向唯一主属性');
  if(a.kind==='build'){
   check(!!t.buildings[a.value],path+'.value','引用不存在的建筑');
   for(const key of ['name','direction','cost','days'])check(!Object.hasOwn(a,key),path+'.'+key,'建设动作须从建筑表读取，不能重复定义');
  }else{
   check(typeof a.name==='string'&&a.name.length>0,path+'.name','名称不能为空');check(Object.hasOwn(t.directions,a.direction),path+'.direction','未知内政方向');
   check(num(a.cost)&&Number.isInteger(a.cost),path+'.cost','费用须为非负整数');check(num(a.days,1)&&Number.isInteger(a.days),path+'.days','工期须为正整数天');
  }
  const targets={effect:['gold','grain'],discount:['commerce','military'],trade:['sell','buy'],rescue:['disaster','mold'],prepare:['intent','shield']};
  if(targets[a.kind])check(targets[a.kind].includes(a.value),path+'.value','处理器不支持此目标');
  else if(a.kind!=='build')check(num(a.value),path+'.value','效果参数须为非负数');
  if(['effect','prepare'].includes(a.kind))check(num(a.power),path+'.power','缺少有效效果强度');
  if(a.risk!==undefined)check(num(a.risk,0,1),path+'.risk','风险须为0～1');
  if(a.kind==='recruit')check(Number.isSafeInteger(a.reserveValue)&&a.reserveValue>0,path+'.reserveValue','征集预备兵须有正整数产出');
  else check(a.reserveValue===undefined,path+'.reserveValue','该命令不支持征集兵源');
  if(a.opportunity!==undefined)check(['master','capture'].includes(a.opportunity),path+'.opportunity','未接入此机会事件');
 }
 for(const [key,cities] of [['roads',t.cities],['demoRoads',t.demoCities]]){
  const roads=t[key],ids=new Set(cities.map(c=>c.id)),seen=new Set(),links=new Map(cities.map(c=>[c.id,[]]));
  check(Array.isArray(roads),key,'道路须为连接数组');if(!Array.isArray(roads))continue;
  for(const [i,edge] of roads.entries()){
   const path=key+'.'+i;check(Array.isArray(edge)&&edge.length===2,path,'道路须恰好连接两个据点');if(!Array.isArray(edge)||edge.length!==2)continue;
   const [a,b]=edge;check(ids.has(a)&&ids.has(b),path,'道路引用不存在的据点 '+a+' / '+b);check(a!==b,path,'道路不能连接自身');
   const pair=[a,b].sort().join('|');check(!seen.has(pair),path,'重复的双向道路');seen.add(pair);
   if(ids.has(a)&&ids.has(b)){links.get(a).push(b);links.get(b).push(a);}
  }
  const visited=new Set(),queue=cities.length?[cities[0].id]:[];while(queue.length){const id=queue.shift();if(visited.has(id))continue;visited.add(id);queue.push(...links.get(id).filter(x=>!visited.has(x)));}
  check(visited.size===cities.length,key,'地图不连通：'+cities.filter(c=>!visited.has(c.id)).map(c=>c.id).join('、'));
 }
 const network=t.roadNetwork;
 if(fields(network,['trailCost','bypasses','nodeNames','nodePositions','geography'],'roadNetwork')){
  const geo=network.geography,edgeKey=e=>[...e].sort().join(':');
  if(fields(geo,['remove','add','terrain'],'roadNetwork.geography')){
   for(const kind of ['remove','add']){
    check(Array.isArray(geo[kind]),'roadNetwork.geography.'+kind,'地理连接须为道路数组');
    const seen=new Set();
    for(const edge of geo[kind]||[]){const valid=Array.isArray(edge)&&edge.length===2&&edge[0]!==edge[1]&&edge.every(id=>t.cities.some(c=>c.id===id)),key=valid?edgeKey(edge):'';
     check(valid&&!seen.has(key),'roadNetwork.geography.'+kind,'地理道路引用无效或重复');seen.add(key);
     check(kind==='add'?t.roads.some(e=>edgeKey(e)===key):!t.roads.some(e=>edgeKey(e)===key),'roadNetwork.geography.'+kind,'道路必须实际落实地理增删');
    }
   }
   for(const [key,terrain] of Object.entries(geo.terrain||{})){
    const edge=t.roads.find(e=>edgeKey(e)===key);
    check(['land','mountain','water'].includes(terrain)&&!!edge,'roadNetwork.geography.terrain.'+key,'地理路段须存在且地形有效');
    check(terrain!=='water'||edge?.every(id=>t.cities.some(c=>c.id===id&&c.kind==='port')),'roadNetwork.geography.terrain.'+key,'水路必须在两个真实港口之间，上下船不能绕过港口');
   }
  }
  check(num(network.trailCost,1),'roadNetwork.trailCost','小路代价须不低于官道');
  check(Array.isArray(network.bypasses),'roadNetwork.bypasses','须为三据点数组');
  const expectedNames=new Set(Object.keys(network.nodePositions||{}));
  for(const key of expectedNames){const ids=key.split(':'),p=network.nodePositions[key];check(ids.length===2&&ids.every(id=>t.cities.some(c=>c.id===id&&c.kind==='city'))&&t.roads.some(e=>[...e].sort().join(':')===key),'roadNetwork.nodePositions.'+key,'节点必须位于已有城市陆路');check(Array.isArray(p)&&p.length===2&&p.every(n=>num(n,0,1024)),'roadNetwork.nodePositions.'+key,'节点坐标必须在地图内');}
  check(network.nodeNames&&typeof network.nodeNames==='object','roadNetwork.nodeNames','须配置节点地名');
  for(const key of expectedNames)check(typeof network.nodeNames?.[key]==='string'&&/^[\p{Script=Han}]{1,5}$/u.test(network.nodeNames[key]),'roadNetwork.nodeNames.'+key,'节点须使用附近地名');
  for(const key of Object.keys(network.nodeNames||{}))check(expectedNames.has(key),'roadNetwork.nodeNames.'+key,'地名未对应实际节点');
  check(new Set(Object.values(network.nodeNames||{})).size===expectedNames.size,'roadNetwork.nodeNames','节点地名须完整且不重复');
  const seen=new Set();
  for(const [i,row] of (network.bypasses||[]).entries()){
   const path='roadNetwork.bypasses.'+i;
   check(Array.isArray(row)&&row.length===3&&new Set(row).size===3,path,'须指定中心据点及两个不同方向');
   if(!Array.isArray(row)||row.length!==3)continue;
   check(row.every(id=>t.cities.some(c=>c.id===id&&c.kind==='city')),path,'仅允许陆上城市，不得横跨关隘港口');
   const [center,...ends]=row;
   check(ends.every(id=>t.roads.some(([a,b])=>a===center&&b===id||b===center&&a===id)),path,'引用的官道不存在');
   check(ends.every(id=>expectedNames.has([center,id].sort().join(':'))),path,'小路端点须配置府节点');
   const key=center+':'+ends.sort().join(':');check(!seen.has(key),path,'重复小路');seen.add(key);
  }
 }
 const m=t.movement;if(!fields(m,['distance','roadVariants','army','personnel','vision','scouting'],'movement'))return errors;
 if(fields(m.scouting,['speed','minimumDays','baseMaximumDays','intellectExtension','randomSpread'],'movement.scouting')){check(num(m.scouting.speed,Number.EPSILON),'movement.scouting.speed','斥候每日行程须大于0');for(const key of ['minimumDays','baseMaximumDays','intellectExtension','randomSpread'])check(Number.isSafeInteger(m.scouting[key])&&m.scouting[key]>=0,'movement.scouting.'+key,'须为非负整数');check(m.scouting.minimumDays>=1&&m.scouting.baseMaximumDays>=m.scouting.minimumDays,'movement.scouting','持续天数范围无效');}
 if(fields(m.vision,['city','army','armyIntellectPerPoint','scout','unknownDefense','unknownGateHp'],'movement.vision')){
  for(const key of ['city','army','scout','unknownDefense','unknownGateHp'])check(num(m.vision[key],Number.EPSILON),'movement.vision.'+key,'须大于0');
  check(num(m.vision.armyIntellectPerPoint,Number.EPSILON),'movement.vision.armyIntellectPerPoint','军团智力视野系数须大于0');
 }
 if(fields(m.distance,['minimum','coordinateScale'],'movement.distance'))for(const key of ['minimum','coordinateScale'])check(num(m.distance[key],Number.EPSILON),'movement.distance.'+key,'须大于0');
 if(fields(m.roadVariants,['main'],'movement.roadVariants'))for(const id of ['main']){
  const r=m.roadVariants[id],path='movement.roadVariants.'+id;if(!fields(r,['offset','names','costFactors'],path))continue;
  check(num(r.offset,-Infinity),path+'.offset','曲线偏移须为有限数');
  for(const part of ['names','costFactors'])if(fields(r[part],['land','mountain','water'],path+'.'+part))for(const terrain of ['land','mountain','water'])check(part==='names'?typeof r[part][terrain]==='string'&&r[part][terrain].length>0:num(r[part][terrain],Number.EPSILON),path+'.'+part+'.'+terrain,'无效道路名称或代价系数');
 }
 if(fields(m.army,['landSpeedFactor','speedByTroop','command','morale','hunger'],'movement.army')){
  check(num(m.army.landSpeedFactor,Number.EPSILON,1),'movement.army.landSpeedFactor','陆路军团速度倍率须大于0且不超过1');
  if(fields(m.army.speedByTroop,Object.keys(t.troops),'movement.army.speedByTroop'))for(const id of Object.keys(t.troops))check(num(m.army.speedByTroop[id],Number.EPSILON),'movement.army.speedByTroop.'+id,'兵种行军速度须大于0');
  for(const key of ['command','morale'])if(fields(m.army[key],['base','perPoint'],'movement.army.'+key))for(const field of ['base','perPoint'])check(num(m.army[key][field]),'movement.army.'+key+'.'+field,'系数须为非负数');
  check(Array.isArray(m.army.hunger),'movement.army.hunger','缺粮规则须为数组');let previous=Infinity;
  for(const r of m.army.hunger||[]){if(!fields(r,['minimum','inclusive','penalty'],'movement.army.hunger'))continue;check(num(r.minimum)&&r.minimum<previous,'movement.army.hunger','阈值须非负且严格降序');previous=r.minimum;check(typeof r.inclusive==='boolean'&&num(r.penalty,0,.99),'movement.army.hunger','无效边界或减速比例');}
 }
 if(fields(m.personnel,['light','transport'],'movement.personnel'))for(const key of ['light','transport'])check(num(m.personnel[key],Number.EPSILON),'movement.personnel.'+key,'速度或倍率须大于0');
 return errors;
}
