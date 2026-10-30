// Membership must be verified against nationalRoster; no invented recruitment.
export const RECIPES=[
 {id:'wei',name:'许昌常备军',scenario:'guandu-200',faction:'cao',leader:'于禁',advisor:'满宠',team:[['于禁','spear'],['乐进','spear'],['李典','halberd'],['曹洪','cavalry'],['满宠','archer'],['吕虔','archer']]},
 {id:'wu',name:'建业老班底',scenario:'guandu-200',faction:'sunce',leader:'孙权',advisor:'程普',team:[['孙权','halberd'],['程普','spear'],['黄盖','archer'],['韩当','archer'],['蒋钦','archer'],['陈武','spear']]},
 {id:'jing',name:'襄阳守军',scenario:'guandu-200',faction:'force-7',leader:'文聘',advisor:'蒯良',team:[['文聘','spear'],['黄祖','halberd'],['蔡瑁','spear'],['蒯良','archer'],['蒯越','archer'],['伊籍','archer']]},
 {id:'liu',name:'小沛关羽带队',scenario:'warlords-194',faction:'force-2',leader:'关羽',advisor:'刘备',team:[['关羽','spear'],['刘备','spear'],['糜芳','halberd'],['孙乾','archer'],['简雍','archer'],['糜竺','archer']]},
];
export const ENEMIES=[
 {id:'yuan-common',name:'河北常备军',scenario:'guandu-200',faction:'yuan',names:['高览','审配','逢纪','袁谭','袁熙','焦触']},
 {id:'yuan-elite',name:'河北主力',scenario:'guandu-200',faction:'yuan',names:['袁绍','颜良','文丑','张郃','沮授','田丰']},
 {id:'sun-regular',name:'建业常备军',scenario:'guandu-200',faction:'sunce',optional:true,names:['孙权','程普','黄盖','韩当','蒋钦','陈武']},
];
// Chosen before development runs. Validation seeds are never used for tuning.
export const DEVELOPMENT_SEEDS=[28104001];
export const VALIDATION_SEEDS=[68104217,68104739,68105303];
export const CONFIRMATION_SEEDS=[82140611,82141243,82141817];
