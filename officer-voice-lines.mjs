import {OFFICER_BY_ID} from './officer-catalog.mjs';

// Presentation copy only. Profiles and line selection never draw game randomness.
export const VOICE_PROFILES={
 commander:{rate:1,pitch:.84,gender:'male',preferredVoices:['Kangkang','Yunyang','Yunjian','Yunxi']},
 warrior:{rate:1.1,pitch:.78,gender:'male',preferredVoices:['Yunjian','Yunfeng','Kangkang','Yunxi']},
 scholar:{rate:.96,pitch:.96,gender:'male',preferredVoices:['Yunxi','Yunyang','Kangkang','Yunjian']},
 female:{rate:1.02,pitch:1.04,gender:'female',preferredVoices:['Yaoyao','Xiaoxiao','Xiaoyi','Huihui']}
};
const LINES={
 commander:{start:['全军听令，进军！','诸将随我，迎敌！'],tactic:['一鼓作气，破敌！','趁势而进！'],order:['号令已下，诸军协力！','依计行事！'],heal:['整顿队伍，再战！'],rout:['稳住阵脚！'],retreat:['收拢兵马，撤！'],victory:['此战告捷，犒赏三军！'],defeat:['保存实力，来日再战。'],draw:['鸣金收兵，择日再战。'],acknowledge:['得令，即刻办理。','此事交给我。'],march:['兵马已备，即刻启程！'],complete:['主公，所托之事已成。'],discovered:['主公，访得一位贤才。'],recruit:['愿为主公效力。'],scout:['前方军情，已探明。']},
 warrior:{start:['将士们，随我杀！','敌军在前，冲！'],tactic:['看我破阵！','吃我一击！'],order:['众将听令，奋勇向前！','随我杀出一条路！'],heal:['打起精神，再来！'],rout:['莫慌，有我在！'],retreat:['我来断后，快撤！'],victory:['痛快！此战大胜！'],defeat:['今日且退，定要再战！'],draw:['先收兵，再分高下！'],acknowledge:['领命，包在我身上！','得令！'],march:['整军出发！'],complete:['主公，事情办妥了！'],discovered:['访得人才，请主公过目！'],recruit:['愿随主公征战！'],scout:['军情已明，请主公定夺。']},
 scholar:{start:['审势而动，依计进军。','阵势已定，诸军进发。'],tactic:['此计，可破敌军。','时机已至。'],order:['诸军听令，依计而行。','攻其不备，就在此时。'],heal:['休整伤卒，重振军心。'],rout:['稳守阵线，勿乱方寸。'],retreat:['暂避锋芒，有序退兵。'],victory:['诸军用命，方有此胜。'],defeat:['此番失利，当另谋良策。'],draw:['胜负未分，暂且收兵。'],acknowledge:['谨遵主公之命。','臣即刻着手。'],march:['粮秣齐备，可以进军。'],complete:['主公，所议之事已经办成。'],discovered:['访得贤士，或可为主公所用。'],recruit:['愿尽绵薄之力。'],scout:['探报已至，请主公过目。']},
 female:{start:['诸位随我，迎敌！','同心协力，定可破敌！'],tactic:['休想挡住我！','看准时机，出击！'],order:['听我号令，合力破敌！','依计行事！'],heal:['救护伤卒，振作起来。'],rout:['稳住，我们还能再战！'],retreat:['保护伤卒，有序撤退！'],victory:['齐心协力，终于得胜！'],defeat:['暂且退兵，再寻良机。'],draw:['鸣金收兵。'],acknowledge:['领命，定当尽心。','这就去办。'],march:['诸事已备，即刻出发。'],complete:['主公，事情已经办妥。'],discovered:['访得一位贤才，请主公过目。'],recruit:['愿为主公尽力。'],scout:['前方探报已经送到。']}
};
export const OFFICER_SIGNATURES={
 cao:'诸军随我，共定天下！',jia:'胜机已现，正当用计。',liao:'将士用命，随我破敌！',
 'person-99':'关某在此，谁敢阻挡！','person-186':'老将尚能破敌！','person-226':'沉住气，胜机就在眼前。',
 'person-246':'诸军协力，一举破敌！','person-290':'依计行事，自可制敌。','person-371':'江东儿郎，随我出战！',
 'person-396':'云在此，诸位勿忧！','person-425':'愿以此计，助诸军破敌。','person-433':'燕人张飞在此！',
 'person-516':'西凉铁骑，随我冲锋！','person-558':'且看此计，如何破敌。','person-603':'静待其变，乘隙而击。',
 'person-636':'诸位同心，护佑百姓！','person-661':'谁能挡我！'
};
const RULER_LINES={acknowledge:'此事即刻着手。',complete:'此事已成，诸位辛苦。',discovered:'访得贤才，当以礼相待。',scout:'军情已明，可以定夺。'};
export function officerVoiceProfile(officer){
 const o={...OFFICER_BY_ID[officer?.id],...officer};
 if(o.sex===1)return 'female';
 if(o.intellect>=80&&o.intellect>o.force)return 'scholar';
 if(o.force>=85||o.personality===4)return 'warrior';
 return 'commander';
}
export function officerVoiceLine(officer,event,{variant=0,signature=false,sovereign=false}={}){
 if(!officer?.id||!officer.name)return null;
 if(sovereign&&RULER_LINES[event])return {id:'ruler-'+event,text:RULER_LINES[event],profile:'commander',officerId:officer.id,name:officer.name,event};
 const profile=officerVoiceProfile(officer),special=signature&&OFFICER_SIGNATURES[officer.id],lines=LINES[profile][event];
 if(!lines)return null;
 const index=Math.abs(Math.trunc(variant)||0)%lines.length;
 return {id:special?'signature-'+officer.id:profile+'-'+event+'-'+index,text:special||lines[index],profile,officerId:officer.id,name:officer.name,event};
}
export function allOfficerVoiceLines(){
 const lines=[];
 for(const [profile,events] of Object.entries(LINES))for(const [event,texts] of Object.entries(events))texts.forEach((text,i)=>lines.push({id:profile+'-'+event+'-'+i,text,profile}));
 for(const [id,text] of Object.entries(OFFICER_SIGNATURES))lines.push({id:'signature-'+id,text,profile:officerVoiceProfile(OFFICER_BY_ID[id])});
 for(const [event,text] of Object.entries(RULER_LINES))lines.push({id:'ruler-'+event,text,profile:'commander'});
 return lines;
}
