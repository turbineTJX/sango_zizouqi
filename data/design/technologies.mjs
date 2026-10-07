export const TECHNOLOGY_BRANCHES={economy:'民生',military:'军务',craft:'工造',defense:'守备'};
export const TECHNOLOGY_AFFINITIES={trade:'商贸',farming:'农耕',garrison:'军镇',craft:'工造',water:'水乡',frontier:'边塞'};
const node=(id,name,branch,tier,description,parameters={})=>({id,name,parameters:{branch,tier,requiredProgress:100,cost:tier===1?200:600,days:tier===1?10:20,prerequisites:[],buildings:{},anyBuildings:[],order:0,affinity:null,troopId:null,waterRequired:false,unlocks:[],income:{},militaryDiscount:0,constructionDiscount:0,visionRadius:0,description,...parameters},source:'city-technology.mjs',todo:''});
export default {
 schemaVersion:1,id:'technologies',name:'科技与兵种装备解锁一览表',integration:'runtime',
 description:'城市科技树：四条分支、最多两层。固定地方资质决定研究范围，设施和治安决定开始条件；按实际工作日推进，完成即生效。',
 records:[
  node('taxation','商税法','economy',1,'本城金收入提高10%。',{buildings:{commerce:1},income:{gold:.1}}),
  node('tradeLaw','通商法','economy',2,'本城金收入再提高15%，与商税法合计25%。',{prerequisites:['taxation'],buildings:{commerce:3},affinity:'trade',income:{gold:.15}}),
  node('cultivation','农垦法','economy',1,'本城粮食收入提高10%。',{buildings:{farm:1},income:{grain:.1}}),
  node('irrigation','灌溉法','economy',2,'本城粮食收入再提高15%，与农垦法合计25%。',{prerequisites:['cultivation'],buildings:{farm:3,granary:2},affinity:'farming',income:{grain:.15}}),
  node('militaryRegistry','军籍法','military',1,'本城预备兵收入提高10%。',{order:60,income:{manpower:.1}}),
  node('militaryHouseholds','营户法','military',2,'本城预备兵收入再提高15%，与军籍法合计25%。',{prerequisites:['militaryRegistry'],anyBuildings:['farm','granary'],order:70,affinity:'garrison',income:{manpower:.15}}),
  node('militarySupply','军需法','military',2,'本城编制、改编、补兵和携带装备费用降低10%。',{prerequisites:['militaryRegistry'],anyBuildings:['commerce','workshop'],affinity:'garrison',militaryDiscount:.1}),
  node('efficientConstruction','省工法','craft',1,'本城负责的设施建设费用降低10%。',{buildings:{workshop:1},constructionDiscount:.1}),
  node('siegeEngineering','攻城器械','craft',2,'本城可配备重型冲车、投石车和井栏。',{prerequisites:['efficientConstruction'],buildings:{workshop:3},affinity:'craft',unlocks:['heavyRam','siege','tower']}),
  node('shipbuilding','战船营造','craft',2,'本城可配备艨艟、楼船和斗舰。',{prerequisites:['efficientConstruction'],buildings:{workshop:2},affinity:'water',waterRequired:true,unlocks:['mengchong','louShip','fightingShip']}),
  node('watchtower','烽堠法','defense',1,'完成后建成瞭望塔，持续获取本城周围视野，半径32。',{cost:400,buildings:{walls:1},visionRadius:32}),
  node('beaconNetwork','连烽法','defense',2,'本城瞭望塔的持续视野半径扩大至38。',{prerequisites:['watchtower'],buildings:{walls:2},order:70,affinity:'frontier',visionRadius:38}),
  ...[
   ['qingzhou','青州兵',{order:70}],['baier','白毦兵',{buildings:{granary:1}}],
   ['rattan','藤甲兵',{buildings:{workshop:1}}],['greatHalberd','大戟士',{buildings:{drill:1}}],
   ['tigerCavalry','虎豹骑',{buildings:{drill:1}}],['whiteHorse','白马骑',{order:70}],
   ['crossbow','连弩兵',{buildings:{workshop:1}}],['longbow','长弓兵',{buildings:{drill:1}}]
  ].map(([id,name,conditions])=>node(id,name+'技术','military',2,'本城可编制、改编和整补'+name+'。',{prerequisites:['militaryRegistry'],troopId:id,unlocks:[id],...conditions}))
 ]
};
