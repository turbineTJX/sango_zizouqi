import {NATIONAL_MAP} from './data/national-map.mjs';
import {OFFICER_CATALOG} from './officer-catalog.mjs';

export const NATIONAL_FACTIONS={...NATIONAL_MAP.forces,sunce:{name:'孙策',short:'孙',color:'#ac7a35',leaderSourceId:OFFICER_CATALOG.find(u=>u.name==='孙策').sourceId},liuzhang:{name:'刘璋',short:'刘',color:'#667743'}};
export const NATIONAL_SCENARIOS=Object.freeze([
 {id:'guandu-200',name:'官渡风云',year:200,era:'建安五年',difficulty:'推荐入门',capital:'xuchang',description:'曹操立足许昌，袁绍雄踞河北。先守住黄河沿线，再向江东、荆襄与巴蜀推进。',hint:'曹操开局拥有多座城池与充足人才；先委任内政，再从许昌编军北上。',factions:['cao','yuan','force-7','sunce'],note:'四势力试玩：曹操、袁绍、刘表、孙策。其他地区为地方据点；归属与兵力为玩法改编。'},
 {id:'heroes-251',name:'英雄集结',year:251,era:'群英并起',difficulty:'群雄混战',capital:'xuchang',description:'曹操居中原，袁绍据河北，刘备领巴蜀荆襄，孙策控江东。四方群英同世，争夺关津与天下。',hint:'四方均有腹地与前线，先守住关隘和粮道，再集中军团突破。',factions:['cao','yuan','force-2','sunce'],note:'四势力架空试玩；参考项目人物按区域归并，不限制生卒年。'},
]);
export const nationalScenario=id=>NATIONAL_SCENARIOS.find(s=>s.id===id);
const key=n=>NATIONAL_MAP.cities.find(c=>c.sourceId===n).id;
const guanduOwners={};
for(const [owner,ids] of Object.entries({cao:[8,9,10,11,12,13,14,16,17,18],yuan:[2,3,4,5,6,7],'force-13':[1],'force-2':[15],'force-4':[20,21,22],sunce:[23,24,25,26,27],'force-7':[19,28,29,30,31,32,33,34,35],liuzhang:[36,38,39,40,41,42],'force-10':[37]}))for(const id of ids)guanduOwners[key(id)]=owner;
const heroOwners={};
for(const [owner,ids]of Object.entries({cao:[12,13,14,15,16,17,18,19,20,21,22],yuan:[1,2,3,4,5,6,7,8],'force-2':[30,31,33,35,36,37,38,39,40,41,42],sunce:[9,10,11,23,24,25,26,27,28,29,32,34]}))for(const n of ids)heroOwners[key(n)]=owner;
const gateParents={43:7,44:16,45:18,46:18,47:18,48:37,49:38,50:38,51:40,52:40};
export function nationalWorld(id){
 if(!nationalScenario(id))throw new Error('未知天下剧本');
 const cities=NATIONAL_MAP.cities.map(c=>({...c,water:c.kind==='port'||[9,11,23,24,25,26,27,28,30,31,32,33,34,35,36,39].includes(c.sourceId),garrison:0}));
 const owners=id==='guandu-200'?guanduOwners:heroOwners,allowed=nationalScenario(id).factions;
 for(const c of cities){const parent=NATIONAL_MAP.portParents[c.id]||(gateParents[c.sourceId]?key(gateParents[c.sourceId]):null),owner=owners[c.id]||owners[parent];c.owner=allowed.includes(owner)?owner:'neutral';}
 return {cities,roads:structuredClone(NATIONAL_MAP.roads)};
}
// Explicit opening rosters take precedence over the timeless reference roster.
const opening={cao:['曹操','夏侯惇','夏侯渊','许褚','张辽','于禁','乐进','徐晃','李典','曹仁','曹洪','郭嘉','荀彧','荀攸','程昱','满宠','陈群'],yuan:['袁绍','颜良','文丑','张郃','高览','沮授','田丰','审配','逢纪','许攸','袁谭','袁尚','袁熙'],'force-2':['刘备','关羽','张飞','赵云','孙乾','简雍','糜竺'],'force-4':['马腾','马超','马岱','庞德','韩遂'],sunce:['孙策','孙权','周瑜','鲁肃','程普','黄盖','韩当','周泰','蒋钦','太史慈','张昭','张纮'],'force-7':['刘表','黄忠','魏延','文聘','黄祖','蔡瑁','蒯良','蒯越','韩玄','刘琦','刘琮'],liuzhang:['刘璋','张任','严颜','法正','黄权','刘巴','吴懿','李严'],'force-10':['张鲁','张卫','阎圃','杨松'],'force-13':['公孙度','公孙康']};
export function nationalRoster(id,cities){
 const common=OFFICER_CATALOG.filter(u=>u.sourceKind==='common'),bySource=new Map(common.map(u=>[u.sourceId,u]));
 const placed=new Map(),capital={cao:'xuchang',yuan:'ye','force-2':key(15),'force-4':key(22),sunce:key(23),'force-7':key(30),liuzhang:key(40),'force-10':key(37),'force-13':key(1)};
 if(id==='guandu-200')for(const [faction,names]of Object.entries(opening).filter(([f])=>nationalScenario(id).factions.includes(f)))for(const name of names){const u=common.find(u=>u.name===name||u.aliases.includes(name));if(u)placed.set(u.id,{id:u.id,faction,cityId:capital[faction]});}
 const sourceFaction={...Object.fromEntries(['force-9','force-11','force-16','force-17','force-18','force-19','force-20','force-29','force-30','force-41'].map(f=>[f,'cao'])),'force-3':'sunce','force-23':'sunce','force-24':'sunce','force-25':'sunce','force-5':'liuzhang','force-28':'liuzhang','force-39':'liuzhang','force-40':'liuzhang','force-32':'force-7','force-33':'force-7','force-34':'force-7','force-35':'force-7','force-12':'yuan','force-14':'yuan','force-15':'yuan','force-21':'yuan','force-42':'force-4'};
 for(const p of NATIONAL_MAP.people){const u=bySource.get(p.sourceId);if(!u||placed.has(u.id))continue;
  if(id==='guandu-200'&&((u.birthYear&&u.birthYear>184)||(u.deathYear&&u.deathYear<200)))continue;
  const faction=id==='heroes-251'?({cao:'cao',yuan:'yuan','force-2':'force-2','force-3':'sunce'}[p.faction]||cities.find(c=>c.id===p.cityId)?.owner||'neutral'):sourceFaction[p.faction]||p.faction;
  const home=cities.find(c=>c.id===p.cityId&&c.owner===faction)||cities.find(c=>c.owner===faction&&c.kind==='city');
  if(home&&faction!=='neutral')placed.set(u.id,{id:u.id,faction,cityId:home.id});
 }
 return [...placed.values()];
}
export function campaignDate(s){const spec=nationalScenario(s.campaign?.scenarioId);if(!spec)return `第 ${s.campaign.day} 天`;const d=s.campaign.day-1;return `${spec.year+Math.floor(d/360)} 年 ${Math.floor(d%360/30)+1} 月 ${d%30+1} 日`;}
