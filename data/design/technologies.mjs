export const TECHNOLOGY_BRANCHES={economy:'民生',military:'军务',craft:'工造',defense:'守备'};
export const TECHNOLOGY_AFFINITIES={trade:'商贸',farming:'农耕',garrison:'军镇',craft:'工造',water:'水乡',frontier:'边塞'};
const node=(id,name,branch,tier,description,parameters={})=>({id,name,parameters:{branch,tier,requiredProgress:100,cost:tier===1?200:600,days:tier===1?10:20,prerequisites:[],buildings:{},anyBuildings:[],order:0,researchers:tier===1?1:2,affinity:null,troopId:null,waterRequired:false,unlocks:[],income:{},militaryDiscount:0,constructionDiscount:0,visionRadius:0,description,...parameters},source:'city-technology.mjs',todo:''});
export default {
 schemaVersion:1,id:'technologies',name:'科技与兵种装备解锁一览表',integration:'runtime',
 description:'城市科技树：四条分支、最多两层。固定地方资质决定研究范围，复合设施、治安和真实技术负责人决定开始条件；按实际工作日推进，完成即生效。',
 records:[
  node('taxation','商税法','economy',1,'本城金收入提高20%。',{buildings:{commerce:1},income:{gold:.2}}),
  node('tradeLaw','通商法','economy',2,'本城金收入再提高30%，与商税法合计50%。',{prerequisites:['taxation'],buildings:{commerce:3,granary:2,workshop:2},order:70,affinity:'trade',income:{gold:.3}}),
  node('cultivation','农垦法','economy',1,'本城粮食收入提高20%。',{buildings:{farm:1},income:{grain:.2}}),
  node('irrigation','灌溉法','economy',2,'本城粮食收入再提高30%，与农垦法合计50%。',{prerequisites:['cultivation'],buildings:{farm:3,granary:3,workshop:2},order:70,affinity:'farming',income:{grain:.3}}),
  node('militaryRegistry','军籍法','military',1,'本城预备兵收入提高20%。',{order:60,income:{manpower:.2}}),
  node('militaryHouseholds','营户法','military',2,'本城预备兵收入再提高30%，与军籍法合计50%。',{prerequisites:['militaryRegistry'],buildings:{farm:2,granary:2,drill:2},order:75,affinity:'garrison',income:{manpower:.3}}),
  node('militarySupply','军需法','military',2,'本城编制、改编、补兵和携带装备费用降低25%。',{prerequisites:['militaryRegistry'],buildings:{commerce:2,workshop:3,granary:2},order:75,affinity:'garrison',militaryDiscount:.25}),
  node('efficientConstruction','省工法','craft',1,'本城负责的设施建设费用降低20%。',{buildings:{workshop:1},constructionDiscount:.2}),
  node('siegeEngineering','攻城器械','craft',2,'本城可配备重型冲车、投石车和井栏。',{prerequisites:['efficientConstruction'],buildings:{workshop:4,drill:3,walls:2},order:75,affinity:'craft',unlocks:['heavyRam','siege','tower']}),
  node('shipbuilding','战船营造','craft',2,'本城可配备艨艟、楼船和斗舰。',{prerequisites:['efficientConstruction'],buildings:{workshop:3,granary:2,drill:2},order:70,affinity:'water',waterRequired:true,unlocks:['mengchong','louShip','fightingShip']}),
  node('watchtower','烽堠法','defense',1,'在所属城镇或府的区域随机选址建成瞭望塔，以塔为中心持续提供半径32的视野。',{cost:400,buildings:{walls:1},visionRadius:32}),
  node('beaconNetwork','连烽法','defense',2,'原址升级区域瞭望塔，持续视野半径扩大至38。',{prerequisites:['watchtower'],buildings:{walls:3,workshop:2,drill:2},order:75,affinity:'frontier',visionRadius:38}),
  node('towerDefense','守备箭术','defense',2,'解锁箭塔建设与扩建，在原址战场射击敌军。',{prerequisites:['watchtower'],buildings:{workshop:2,walls:2,drill:2},order:70}),
  node('militaryMusic','军乐鼓吹','defense',2,'解锁军乐台建设与扩建，在原址战场鼓舞附近友军战意。',{prerequisites:['watchtower'],buildings:{drill:3,walls:2,granary:2},order:70}),
  node('battlefieldMedicine','战地救护','defense',2,'解锁救护营建设与扩建，在原址战场救治附近友军真实伤兵。',{prerequisites:['watchtower'],buildings:{clinic:2,workshop:2,granary:2},order:70}),
  ...[
   ['qingzhou','青州兵',{buildings:{drill:2,granary:2,workshop:2}}],['baier','白毦兵',{buildings:{drill:2,granary:3,clinic:1}}],
   ['rattan','藤甲兵',{buildings:{workshop:3,drill:2,granary:2}}],['greatHalberd','大戟士',{buildings:{drill:3,workshop:2,granary:2}}],
   ['tigerCavalry','虎豹骑',{buildings:{drill:3,workshop:2,granary:2},order:80}],['whiteHorse','白马骑',{buildings:{drill:3,granary:2,walls:2},order:80}],
   ['crossbow','连弩兵',{buildings:{workshop:3,drill:2,granary:2}}],['longbow','长弓兵',{buildings:{drill:3,workshop:2,granary:2}}]
  ].map(([id,name,conditions])=>node(id,name+'技术','military',2,'本城可编制、改编和整补'+name+'。',{prerequisites:['militaryRegistry'],order:75,troopId:id,unlocks:[id],...conditions}))
 ]
};
