// Chinese-native preset speakers, with instruction-driven acting at natural pitch.
import {characterVoiceDesign} from './officer-character-voice-direction.mjs';
export const QWEN_VOICE_PROFILES={
 'male-timid':{speaker:'Dylan',personality:'谨慎恭敬，语调收敛，答话干脆紧促，咬字短促'},
 'male-calm':{speaker:'Uncle_fu',personality:'沉着冷静，声气沉稳，语速利落，落字干净'},
 'male-bold':{speaker:'Uncle_fu',personality:'刚胆豪迈，发声扎实，果决有力，收尾干净'},
 'male-rash':{speaker:'Dylan',personality:'性急爽直，冲劲明显，短句快断，重音鲜明'},
 'female-timid':{speaker:'Serena',personality:'谨慎恭敬，语调收敛，答话干脆紧促，咬字短促'},
 'female-calm':{speaker:'Serena',personality:'沉着冷静，声气清朗，语速利落，落字干净'},
 'female-bold':{speaker:'Vivian',personality:'刚胆英气，发声扎实，果决有力，收尾干净'},
 'female-rash':{speaker:'Vivian',personality:'性急爽直，冲劲明显，短句快断，重音鲜明'}
};
export function officerQwenVoiceDirection(line){
 const profile=QWEN_VOICE_PROFILES[line.profile];if(!profile)throw Error('Unknown voice profile: '+line.profile);
 if(line.character)return {speaker:'character:'+line.character,instruct:'Keep the original designed character voice; delivery follows the short game dialogue.',design:characterVoiceDesign(line.character)};
 const battle=['start','tactic','order','rout','retreat','march'].includes(line.event);
 const situation=battle?'正在战场发令，气势集中，号令短促有力。':line.event==='acknowledge'?'刚接到军令，立即用短促清楚的答语回令，一口气说完。':line.event==='complete'?'事务已毕，向主公简短复命，利落地一口气说完。':line.event==='victory'?'战斗告捷，喜悦痛快，一气说完。':['defeat','draw'].includes(line.event)?'战局不利，沉住气迅速收兵，语气带些不甘。':'当面简短报事，直截了当，迅速说完。';
 return {speaker:profile.speaker,instruct:'古装历史正剧的人物对白，成年'+(line.profile.startsWith('female-')?'女':'男')+'声，普通话清楚地道。'+profile.personality+'。'+situation+'像三国人物面对面说话，语气古雅端正，语速明快，字句紧凑，逗号只作极短换气，句尾迅速收住。保持自然音高和连读，不拖长音、不吟诗、不唱戏，不用现代闲聊、客服或新闻播音腔。'};
}
