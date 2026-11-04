import {OFFICER_BY_ID,BASE_OFFICER_CATALOG} from './officer-catalog.mjs';
import {OFFICER_CHARACTER_VOICES} from './officer-character-voices.mjs';

// Presentation only. Gender and the recorded personality determine delivery,
// independently of force, intellect, faction and game randomness.
export const VOICE_PROFILES={
 "male-timid": {
  "gender": "male",
  "personality": "timid",
  "rate": 1.04,
  "pitch": 1,
  "preferredVoices": [
   "Yunxi",
   "Yunyang",
   "Kangkang"
  ]
 },
 "male-calm": {
  "gender": "male",
  "personality": "calm",
  "rate": 1.06,
  "pitch": 1,
  "preferredVoices": [
   "Yunxi",
   "Yunyang",
   "Yunjian",
   "Kangkang"
  ]
 },
 "male-bold": {
  "gender": "male",
  "personality": "bold",
  "rate": 1.08,
  "pitch": 1,
  "preferredVoices": [
   "Yunyang",
   "Yunjian",
   "Yunxi",
   "Kangkang"
  ]
 },
 "male-rash": {
  "gender": "male",
  "personality": "rash",
  "rate": 1.12,
  "pitch": 1,
  "preferredVoices": [
   "Yunjian",
   "Yunfeng",
   "Yunxi",
   "Kangkang"
  ]
 },
 "female-timid": {
  "gender": "female",
  "personality": "timid",
  "rate": 1.04,
  "pitch": 1,
  "preferredVoices": [
   "Xiaoxiao",
   "Xiaoyi",
   "Yaoyao",
   "Huihui"
  ]
 },
 "female-calm": {
  "gender": "female",
  "personality": "calm",
  "rate": 1.06,
  "pitch": 1,
  "preferredVoices": [
   "Xiaoxiao",
   "Xiaoyi",
   "Yaoyao",
   "Huihui"
  ]
 },
 "female-bold": {
  "gender": "female",
  "personality": "bold",
  "rate": 1.08,
  "pitch": 1,
  "preferredVoices": [
   "Xiaoyi",
   "Xiaoxiao",
   "Yaoyao",
   "Huihui"
  ]
 },
 "female-rash": {
  "gender": "female",
  "personality": "rash",
  "rate": 1.12,
  "pitch": 1,
  "preferredVoices": [
   "Xiaoyi",
   "Xiaoxiao",
   "Yaoyao",
   "Huihui"
  ]
 }
};
const LINES={
 "timid": {
  "start": [
   "诸军谨慎，进兵！",
   "切勿冒进，守住阵脚。"
  ],
  "tactic": [
   "看准破绽，再出手！",
   "就是此时，出手！"
  ],
  "order": [
   "按计行事，切莫冒进。",
   "相互照应，稳住阵脚。"
  ],
  "heal": [
   "先护住伤卒，莫要慌乱。"
  ],
  "rout": [
   "稳住，别乱了阵脚！"
  ],
  "retreat": [
   "不要恋战，快撤！"
  ],
  "victory": [
   "总算得胜了，诸位辛苦。"
  ],
  "defeat": [
   "先撤回去，再作打算。"
  ],
  "draw": [
   "先收兵吧。"
  ],
  "acknowledge": [
   "谨领命。",
   "遵命，即刻筹备。"
  ],
  "march": [
   "一路警戒，出发。"
  ],
  "complete": [
   "主公，所托已毕。"
  ],
  "discovered": [
   "主公，访得贤才。"
  ],
  "recruit": [
   "愿为主公效命。"
  ],
  "scout": [
   "探报已至，请主公过目。"
  ]
 },
 "calm": {
  "start": [
   "依计进军。",
   "阵势已定，进军。"
  ],
  "tactic": [
   "此计可破敌。",
   "时机已至。"
  ],
  "order": [
   "诸军听令，依计而行。",
   "攻其不备，就在此时。"
  ],
  "heal": [
   "休整伤卒，重振军心。"
  ],
  "rout": [
   "稳守阵线，勿乱方寸。"
  ],
  "retreat": [
   "暂避锋芒，有序退兵。"
  ],
  "victory": [
   "诸军用命，方有此胜。"
  ],
  "defeat": [
   "此番失利，当另谋良策。"
  ],
  "draw": [
   "胜负未分，暂且收兵。"
  ],
  "acknowledge": [
   "谨遵主命。",
   "遵命。"
  ],
  "march": [
   "粮秣齐备，可以进军。"
  ],
  "complete": [
   "主公，此事已成。"
  ],
  "discovered": [
   "访得贤士，或可招揽。"
  ],
  "recruit": [
   "愿尽绵薄之力。"
  ],
  "scout": [
   "探报已至，请主公过目。"
  ]
 },
 "bold": {
  "start": [
   "全军听令，进军！",
   "诸将随我，迎敌！"
  ],
  "tactic": [
   "一鼓作气，破敌！",
   "趁势而进！"
  ],
  "order": [
   "号令已下，诸军协力！",
   "依计行事！"
  ],
  "heal": [
   "整顿队伍，再战！"
  ],
  "rout": [
   "稳住阵脚！"
  ],
  "retreat": [
   "我来断后，收拢兵马！"
  ],
  "victory": [
   "此战告捷，犒赏三军！"
  ],
  "defeat": [
   "保存实力，来日再战。"
  ],
  "draw": [
   "鸣金收兵。"
  ],
  "acknowledge": [
   "得令，必不辱命！",
   "交予我便是。"
  ],
  "march": [
   "兵马已备，即刻启程！"
  ],
  "complete": [
   "主公，幸不辱命！"
  ],
  "discovered": [
   "主公，访得一位贤才！"
  ],
  "recruit": [
   "愿随主公，共成大业！"
  ],
  "scout": [
   "前方军情，已探明。"
  ]
 },
 "rash": {
  "start": [
   "众将随我杀！",
   "众将，冲阵！"
  ],
  "tactic": [
   "看我破阵！",
   "吃我一击！"
  ],
  "order": [
   "众将听令，奋勇向前！",
   "随我杀出一条路！"
  ],
  "heal": [
   "打起精神，再来！"
  ],
  "rout": [
   "都别退，跟紧我！"
  ],
  "retreat": [
   "快走！我来断后！"
  ],
  "victory": [
   "痛快！此战大胜！"
  ],
  "defeat": [
   "今日且退，定要再战！"
  ],
  "draw": [
   "先收兵，再分高下！"
  ],
  "acknowledge": [
   "得令，看我的！",
   "领命，即刻办！"
  ],
  "march": [
   "整军出发！"
  ],
  "complete": [
   "主公，办妥了！"
  ],
  "discovered": [
   "访得人才，请主公过目！"
  ],
  "recruit": [
   "愿随主公征战！"
  ],
  "scout": [
   "军情已明，请主公定夺。"
  ]
 }
};
const PERSONALITY_KEYS={1:'timid',2:'calm',3:'bold',4:'rash'};
export const OFFICER_SIGNATURES={
 cao:'诸军随我，共定天下！',jia:'胜机已现，正当用计。',liao:'将士用命，随我破敌！',
 'person-99':'关某在此，谁敢阻挡！','person-186':'老将尚能破敌！','person-226':'沉住气，胜机就在眼前。',
 'person-246':'诸军协力，一举破敌！','person-290':'依计行事，自可制敌。','person-371':'江东儿郎，随我出战！',
 'person-396':'云在此，诸位勿忧！','person-425':'愿以此计，助诸军破敌。','person-433':'燕人张飞在此！',
 'person-516':'西凉铁骑，随我冲锋！','person-558':'且看此计，如何破敌。','person-603':'静待其变，乘隙而击。',
 'person-636':'诸位同心，护佑百姓！','person-661':'谁能挡我！'
};
const RULER_LINES={
 "timid": {
  "acknowledge": "此事小心办理。",
  "complete": "诸事已毕，诸位辛苦。",
  "discovered": "访得贤才，请来一见。",
  "scout": "探报已至，容我斟酌。"
 },
 "calm": {
  "acknowledge": "此事即刻办理。",
  "complete": "此事已成，诸位辛苦。",
  "discovered": "访得贤才，当以礼相待。",
  "scout": "军情已明，可以定夺。"
 },
 "bold": {
  "acknowledge": "即刻着手，务必办妥！",
  "complete": "诸事已成，有劳诸位！",
  "discovered": "访得贤才，速速相迎！",
  "scout": "军情已明，即刻议事！"
 },
 "rash": {
  "acknowledge": "事不宜迟，这就去办！",
  "complete": "诸事已成！",
  "discovered": "好！快请贤才来见！",
  "scout": "军情已明，莫要耽搁！"
 }
};
export function officerVoiceProfile(officer){
 const o={...OFFICER_BY_ID[officer?.id],...officer};
 return (o.sex===1?'female':'male')+'-'+(PERSONALITY_KEYS[o.personality]||'calm');
}
// Signature recordings belong to their published base personality. An edited
// officer with another voice uses the matching general line, including offline.
const SIGNATURE_PROFILES=Object.fromEntries(BASE_OFFICER_CATALOG.filter(o=>OFFICER_SIGNATURES[o.id]).map(o=>[o.id,officerVoiceProfile(o)]));
const CHARACTER_PROFILES=Object.fromEntries(BASE_OFFICER_CATALOG.filter(o=>OFFICER_CHARACTER_VOICES[o.id]).map(o=>[o.id,officerVoiceProfile(o)]));
export function officerVoiceLine(officer,event,{variant=0,signature=false,sovereign=false}={}){
 if(!officer?.id||!officer.name)return null;
 const profile=officerVoiceProfile(officer),personality=VOICE_PROFILES[profile].personality;
 const character=profile===CHARACTER_PROFILES[officer.id]?OFFICER_CHARACTER_VOICES[officer.id]:null;
 const characterText=character&&(sovereign?character.ruler[event]:null)||character?.lines[event];
 if(characterText)return {id:'character-'+officer.id+'-'+(sovereign&&character.ruler[event]?'ruler-':'')+event,text:characterText,profile,character:officer.id,officerId:officer.id,name:officer.name,event};
 if(sovereign&&RULER_LINES[personality][event])return {id:'ruler-'+profile+'-'+event,text:RULER_LINES[personality][event],profile,officerId:officer.id,name:officer.name,event};
 const special=signature&&profile===SIGNATURE_PROFILES[officer.id]&&OFFICER_SIGNATURES[officer.id],lines=LINES[personality][event];
 if(!lines)return null;
 const index=Math.abs(Math.trunc(variant)||0)%lines.length;
 return {id:special?'signature-'+officer.id:profile+'-'+event+'-'+index,text:special||lines[index],profile,officerId:officer.id,name:officer.name,event};
}
export function allOfficerVoiceLines(){
 const lines=[];
 for(const [profile,settings] of Object.entries(VOICE_PROFILES)){
  for(const [event,texts] of Object.entries(LINES[settings.personality]))texts.forEach((text,i)=>lines.push({id:profile+'-'+event+'-'+i,text,profile,event}));
  for(const [event,text] of Object.entries(RULER_LINES[settings.personality]))lines.push({id:'ruler-'+profile+'-'+event,text,profile,event});
 }
 for(const [id,text] of Object.entries(OFFICER_SIGNATURES))lines.push({id:'signature-'+id,text,profile:SIGNATURE_PROFILES[id],event:'start'});
 for(const [character,pack] of Object.entries(OFFICER_CHARACTER_VOICES)){
  for(const [event,text] of Object.entries(pack.lines))lines.push({id:'character-'+character+'-'+event,text,profile:CHARACTER_PROFILES[character],character,event});
  for(const [event,text] of Object.entries(pack.ruler))lines.push({id:'character-'+character+'-ruler-'+event,text,profile:CHARACTER_PROFILES[character],character,event});
 }
 return lines;
}
