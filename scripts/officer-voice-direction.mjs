// Authoring only. Keep voices at their natural pitch; punctuation supplies phrasing.
export const NEURAL_VOICE_PROFILES={
 'male-timid':{voice:'zh-CN-YunxiNeural',rate:-10},
 'male-calm':{voice:'zh-CN-YunxiNeural',rate:-4},
 'male-bold':{voice:'zh-CN-YunyangNeural',rate:-2},
 'male-rash':{voice:'zh-CN-YunjianNeural',rate:7},
 'female-timid':{voice:'zh-CN-XiaoxiaoNeural',rate:-10},
 'female-calm':{voice:'zh-CN-XiaoxiaoNeural',rate:-3},
 'female-bold':{voice:'zh-CN-XiaoyiNeural',rate:1},
 'female-rash':{voice:'zh-CN-XiaoyiNeural',rate:7}
};
const COMBAT=new Set(['start','tactic','order','rout','retreat','march']);
export function officerVoiceDirection(line){
 const profile=NEURAL_VOICE_PROFILES[line.profile];
 if(!profile)throw Error('Unknown voice profile: '+line.profile);
 const event=line.event;
 let rate=profile.rate;
 if(COMBAT.has(event))rate+=4;
 else if(['defeat','draw'].includes(event))rate-=3;
 // No stitched syllables, artificial bass or emotional tags in spoken text.
 return {voice:profile.voice,rate:(rate>=0?'+':'')+rate+'%',pitch:'+0Hz'};
}
