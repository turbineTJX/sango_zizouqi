// Validation of currently supported strategic design fields and handlers.
export function validateStrategyDesigns(t){
 const errors=[],check=(ok,path,msg)=>{if(!ok)errors.push(path+'：'+msg);},num=(v,min=0,max=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const fields=(r,keys,path)=>{if(!r||typeof r!=='object'||Array.isArray(r)){errors.push(path+'：必须为记录');return false;}for(const key of Object.keys(r))check(keys.includes(key),path,'未接入字段 '+key);return true;};
 const economy=t.economy;
 for(const [group,keys] of Object.entries({income:['gold','grain','manpower','governorPoliticsDivisor'],capacity:['grainBase','grainPerGranary','manpowerMax','recruitmentBase','recruitmentPerBarracks'],ai:['foodReserveDays','recruitReserveDays','economicWorkersPerDirection']})){
  const row=economy?.[group];if(!fields(row,keys,'economy.'+group))continue;
  for(const key of keys){const value=row[key];if(group==='income'&&key!=='governorPoliticsDivisor'){const subKeys={gold:['base','perCommerce'],grain:['base','perFarm'],manpower:['base','perBarracks']}[key];if(fields(value,subKeys,'economy.income.'+key))for(const sub of subKeys)check(num(value[sub],1),'economy.income.'+key+'.'+sub,'须为正数');}else check(Number.isSafeInteger(value)&&value>0,'economy.'+group+'.'+key,'须为正整数');}
 }
 const modes={build:'progress',research:'quantity',cash:'quantity',grain:'quantity',effect:'quantity',discount:'quantity',recruit:'quantity',heal:'quantity',repair:'quantity',prepare:'quantity',trade:'chance',rescue:'chance',trial:'chance',explore:'chance',hire:'chance',persuade:'chance',reassure:'chance'};
 for(const id of Object.keys(t.directions))check(['leadership','force','intellect','politics','charm'].includes(t.directionStats?.[id]),'directionStats.'+id,'方向须指定唯一主属性');
 check(new Set(Object.values(t.directionStats||{})).size===5,'directionStats','六方向须覆盖五种属性');
 const buildingIds=['commerce','farm','granary','workshop','barracks','clinic','drill','walls','hall'];
 for(const id of ['commerce','agriculture','technology','military','martial','talent'])check(typeof t.directions[id]==='string'&&t.directions[id].length>0,'directions.'+id,'缺少内政方向名称');
 for(const id of Object.keys(t.directions))check(['commerce','agriculture','technology','military','martial','talent'].includes(id),'directions.'+id,'新增内政方向须先接入流程');
 for(const id of buildingIds)check(!!t.buildings[id],'buildings.'+id,'缺少已有建筑');
 for(const [id,b] of Object.entries(t.buildings)){
  const path='buildings.'+id;if(!fields(b,['name','direction','cost','days','description','projectName','projectDescription'],path))continue;
  check(buildingIds.includes(id),path,'新建筑须先接入城市状态与效果');
  for(const k of ['name','description','projectName','projectDescription'])check(typeof b[k]==='string'&&b[k].length>0,path+'.'+k,'文本不能为空');
  check(Object.hasOwn(t.directions,b.direction),path+'.direction','未知内政方向');check(num(b.cost)&&Number.isInteger(b.cost),path+'.cost','费用须为非负整数');check(num(b.days,1)&&Number.isInteger(b.days),path+'.days','工期须为正整数天');
 }
 for(const [id,a] of Object.entries(t.domesticActions)){
  const path='domesticActions.'+id;if(!fields(a,['name','direction','cost','days','kind','value','stat','cooperation','power','risk','opportunity'],path))continue;
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
 if(fields(network,['trailCost','bypasses'],'roadNetwork')){
  check(num(network.trailCost,1),'roadNetwork.trailCost','小路代价须不低于官道');
  check(Array.isArray(network.bypasses),'roadNetwork.bypasses','须为三据点数组');
  const seen=new Set();
  for(const [i,row] of (network.bypasses||[]).entries()){
   const path='roadNetwork.bypasses.'+i;
   check(Array.isArray(row)&&row.length===3&&new Set(row).size===3,path,'须指定中心据点及两个不同方向');
   if(!Array.isArray(row)||row.length!==3)continue;
   check(row.every(id=>t.cities.some(c=>c.id===id&&c.kind==='city')),path,'仅允许陆上城市，不得横跨关隘港口');
   const [center,...ends]=row;
   check(ends.every(id=>t.roads.some(([a,b])=>a===center&&b===id||b===center&&a===id)),path,'引用的官道不存在');
   const key=center+':'+ends.sort().join(':');check(!seen.has(key),path,'重复小路');seen.add(key);
  }
 }
 const m=t.movement;if(!fields(m,['distance','roadVariants','army','personnel'],'movement'))return errors;
 if(fields(m.distance,['minimum','coordinateScale'],'movement.distance'))for(const key of ['minimum','coordinateScale'])check(num(m.distance[key],Number.EPSILON),'movement.distance.'+key,'须大于0');
 if(fields(m.roadVariants,['main'],'movement.roadVariants'))for(const id of ['main']){
  const r=m.roadVariants[id],path='movement.roadVariants.'+id;if(!fields(r,['offset','names','costFactors'],path))continue;
  check(num(r.offset,-Infinity),path+'.offset','曲线偏移须为有限数');
  for(const part of ['names','costFactors'])if(fields(r[part],['land','mountain','water'],path+'.'+part))for(const terrain of ['land','mountain','water'])check(part==='names'?typeof r[part][terrain]==='string'&&r[part][terrain].length>0:num(r[part][terrain],Number.EPSILON),path+'.'+part+'.'+terrain,'无效道路名称或代价系数');
 }
 if(fields(m.army,['speedByTroop','command','morale','hunger'],'movement.army')){
  if(fields(m.army.speedByTroop,Object.keys(t.troops),'movement.army.speedByTroop'))for(const id of Object.keys(t.troops))check(num(m.army.speedByTroop[id],Number.EPSILON),'movement.army.speedByTroop.'+id,'兵种行军速度须大于0');
  for(const key of ['command','morale'])if(fields(m.army[key],['base','perPoint'],'movement.army.'+key))for(const field of ['base','perPoint'])check(num(m.army[key][field]),'movement.army.'+key+'.'+field,'系数须为非负数');
  check(Array.isArray(m.army.hunger),'movement.army.hunger','缺粮规则须为数组');let previous=Infinity;
  for(const r of m.army.hunger||[]){if(!fields(r,['minimum','inclusive','penalty'],'movement.army.hunger'))continue;check(num(r.minimum)&&r.minimum<previous,'movement.army.hunger','阈值须非负且严格降序');previous=r.minimum;check(typeof r.inclusive==='boolean'&&num(r.penalty,0,.99),'movement.army.hunger','无效边界或减速比例');}
 }
 if(fields(m.personnel,['light','transport','travelerMultiplier','transporterMultiplier'],'movement.personnel'))for(const key of ['light','transport','travelerMultiplier','transporterMultiplier'])check(num(m.personnel[key],Number.EPSILON),'movement.personnel.'+key,'速度或倍率须大于0');
 return errors;
}
