export const HERO_CASES=[
 ['cao','曹操','spear'],['jia','郭嘉','crossbow'],['person-255','荀彧','halberd'],
 ['person-290','诸葛亮','crossbow'],['dun','夏侯惇','spear'],['yuanxia','夏侯渊','archer'],
 ['person-472','典韦','halberd'],['person-636','刘备','spear'],['person-99','关羽','cavalry'],
 ['person-433','张飞','spear'],['person-661','吕布','cavalry'],['person-246','周瑜','archer'],
 ['person-371','孙策','cavalry'],['person-368','孙权','spear'],['person-226','司马懿','crossbow'],
];
export const HERO_COMPOSITIONS=[
 {name:'魏军攻防',team:[['cao','spear'],['dun','halberd'],['person-472','spear'],['jia','crossbow'],['person-255','halberd'],['yuanxia','archer']]},
 {name:'蜀军控阵',team:[['person-636','spear'],['person-99','cavalry'],['person-433','halberd'],['person-290','crossbow'],['person-646','spear'],['person-123','halberd']]},
 {name:'吴军火攻',team:[['person-371','cavalry'],['person-368','spear'],['person-246','archer'],['person-164','archer'],['person-668','halberd'],['person-119','cavalry']]},
];
export const SUPPORT_HEROES=new Set(['cao','jia','person-255','person-636','person-368']);
export function heroCaseTeam(id,type){
 if(SUPPORT_HEROES.has(id))return [[id,type],['liao','cavalry'],['person-646','spear']];
 const setter={'person-99':['person-371','cavalry'],'person-661':['yuanxia','archer'],'person-246':['person-164','archer'],'person-290':['person-558','archer']}[id];
 return [[id,type],setter||['person-646','spear'],id==='person-290'?['person-472','spear']:['person-123','halberd']];
}
export function heroDraft(team,seed,level=8,allocation='equal',mirror=0){
 const six=team.length===6,total=six?18000:9000;
 const enemy=[['shao','spear'],['yan','cavalry'],['tian','archer'],['wen','halberd'],['he','crossbow'],['ju','halberd']].slice(0,team.length);
 const ownTeam=team.map(([id,type],i)=>({id,type,level,troops:allocation==='equal'?3000:six?(i===0?5000:2600):(SUPPORT_HEROES.has(team[0][0])?[1500,5000,2500]:[5000,2500,1500])[i]}));
 const enemyTeam=enemy.map(([id,type])=>({id,type,level,troops:total/team.length}));
 return {seed,terrain:'land',ownTeam:mirror?enemyTeam:ownTeam,enemyTeam:mirror?ownTeam:enemyTeam};
}
