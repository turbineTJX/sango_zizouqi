// One physical instance per world; both modes read this authoritative catalogue.
export const TREASURE_RULES=Object.freeze({version:2,discoveryChance:.02,eyeChance:.04,captureChance:.05,plunderChance:.10,discoveryInterval:30,bondBonus:1,bondCap:3,totalBondCap:6,minimumHolders:[1,3,6],plunderDamage:.10});
const bond=(name,bondId)=>({name,kind:'bond',bondId,bonus:1,category:'book',description:'已获得的对应羁绊贡献增加1点，单项最多3点；第二档至少3名、最高档至少6名真实在场持有者。'});
const entry=(name,status,steps,description,category='weapon',budget={})=>({name,kind:'entry',status,steps,category,description:'本队每场首次实际上场时'+description+'；每场一次。',...budget});
export const TREASURE_DESIGNS=Object.freeze({
 redFirmament:{...bond('赤霄剑','bondPower'),category:'weapon'},
 darkSteel:{...bond('湛卢剑','bondEscort'),category:'weapon'},
 greatEdge:{...bond('泰阿剑','bondFinisher'),category:'weapon'},
 artOfWar:bond('孙子兵法','bondScholar'),
 sixTeachings:bond('六韬','bondGuard'),
 threeStrategies:bond('三略','bondSteady'),
 weiliao:bond('尉缭子','bondArmor'),
 mozi:bond('墨子','bondSiegebreak'),
 skyHalberd:entry('方天画戟','valor',6,'获得奋战，攻击提高25%，持续6回合'),
 greenDragon:entry('青龙偃月刀','valor',6,'获得奋战，攻击提高25%，持续6回合'),
 serpentSpear:entry('丈八蛇矛','attackHaste',4,'获得速攻，普攻间隔缩短20%，持续4回合'),
 blueSteel:entry('青釭剑','phase',3,'获得穿阵，暂时无视敌方拦截，持续3回合；保留占位、水陆与定身限制'),
 heavenSword:entry('倚天剑','valor',4,'获得奋战，攻击提高25%，持续4回合'),
 ancientBlade:entry('古锭刀','valor',5,'获得奋战，攻击提高25%，持续5回合'),
 twinSwords:entry('双股剑','resolve',4,'获得坚定，免疫七种控制，持续4回合；不驱散已有异常'),
 legendaryBow:entry('养由基弓','longRange',6,'获得远射，远程普攻最大射程增加1，持续6回合；不改变最小射程或战法范围'),
 brightArmor:entry('明光铠','shield',8,'获得护盾，额度为初始兵力4%、最多400，持续8回合','armor',{fraction:.04,cap:400}),
 redHare:entry('赤兔','haste',8,'获得疾行，移动力增加1，持续8回合','horse'),
 dillu:entry('的卢','haste',8,'获得疾行，移动力增加1，持续8回合','horse'),
 shadow:entry('绝影','phase',3,'获得穿阵，暂时无视敌方拦截，持续3回合；不免俘','horse'),
 yellowLightning:entry('爪黄飞电','haste',6,'获得疾行，移动力增加1，持续6回合','horse'),
 medicineBook:entry('青囊书','regrowth',6,'获得休整，每回合救治初始兵力1%、最多100名已有伤兵，6回合累计最多6%且不超过600','medicine',{fraction:.01,cap:100,totalFraction:.06,totalCap:600}),
 mengde:entry('孟德新书','nexus',4,'获得阵枢，谋略威力及军纪提高20%，持续4回合','book'),
 peaceBook:entry('太平要术','resolve',6,'获得坚定，免疫七种控制，持续6回合；不驱散、不获得魔免','book')
});
export const TREASURE_IDS=Object.freeze(Object.keys(TREASURE_DESIGNS));
export const treasureDesign=id=>TREASURE_DESIGNS[id]||null;
export const validTreasureId=id=>id===null||id===undefined||Object.hasOwn(TREASURE_DESIGNS,id);
export const EYE_ACTIONS=Object.freeze(['fair','merchants','build_farm','store','inspect','repair','patrol','build_drill','explore','craftsmen','hire','persuade']);
export const TREASURE_HIDE_REGIONS=Object.freeze({weapon:['关中','中原'],book:['中原','荆州','江东','巴蜀'],armor:['中原','关中'],horse:['关中','中原','荆州'],medicine:['中原','荆州','江东','巴蜀']});
export const DISCOVERY_CATEGORIES=Object.freeze({commerce:['weapon','armor','horse','book'],agriculture:['weapon','book'],military:['book','armor'],martial:['weapon','armor'],technology:['book','medicine'],talent:['book','medicine','weapon']});
export default {schemaVersion:1,id:'treasures',name:'宝物一览表',integration:'integrated',records:TREASURE_IDS.map(id=>({id,...TREASURE_DESIGNS[id]}))};
