// Original voices described by dramatic qualities; the references are for
// characterization, rather than a claim that the performers recorded this game.
export const CHARACTER_VOICE_DIRECTIONS={
 cao:{timbre:'五十岁男性，中低音厚实偏暗，带少许沙砾感，胸腔共鸣充足。威严自信，辞锋灵活，刚柔转换鲜明，言语有雄心和机锋',anchor:'诸将听令，各守其职。大事尚待诸公共成，即刻进兵！'},
 'person-636':{timbre:'四十岁男性，温厚略哑的中音，声音朴实圆润，仁厚诚恳，情意藏在字间，临阵坚定，克制而有分量',anchor:'诸位与我同心，护住百姓。此行有劳诸将，随我进军！'},
 'person-99':{timbre:'四十五岁男性，沉雄宽厚的低音，口腔共鸣开阔，音色浓重冷峻，字头坚实，神情倨傲而端正，话少而有威压',anchor:'关某领命。诸将守住阵脚，随关某进军，休失军纪！'},
 'person-433':{timbre:'三十五岁男性，粗粝洪亮的低中音，胸声饱满，喉音粗豪，直率急烈，字头爆发有力，豪爽而不尖叫',anchor:'俺张飞在此！都稳住阵脚，护住伤兵，随俺杀出重围！'},
 'person-396':{timbre:'三十岁男性，清亮结实的中音，音色明净，气息扎实，忠勇坚毅，温和沉稳中有锋芒，吐字果决流畅',anchor:'云已领命。诸军守住两翼，伤卒先退，我来断后！'},
 'person-290':{timbre:'四十岁男性，清朗雅正的中音，音色清瘦而有金石质感，气息均匀，文雅从容，胸有成竹，重音细致精准',anchor:'诸军听令，各依方略行事。粮秣已备，正可进军。'},
 'person-246':{timbre:'三十岁男性，明亮略高的中音，音色细致圆润，儒雅俊逸，少年统帅的自信和锐气，句锋清晰，收字果断',anchor:'江东诸将，各依所授方略。时机已至，随我破敌！'},
 'person-226':{timbre:'六十岁男性，干涩略哑的偏低音，少量鼻腔共鸣，气息沉稳内敛，老辣审慎，语气藏锋，字句紧密，清楚有力而不虚弱',anchor:'诸将沉住气，切莫轻进。待得时机，再论胜负。'},
 'person-368':{timbre:'三十岁男性，浑厚有弹性的中音，音色温润而结实，年轻君主的威仪，持重果决，措辞亲近而有号召力',anchor:'江东诸将，诸位同心。此事即刻办理，随我出战！'},
 'person-661':{timbre:'三十岁男性，浓亮粗壮的中低音，声音结实锋利，勇武骄矜，桀骜而自负，发令猛劲，重音直接，不用张飞式喉音',anchor:'谁敢与我一战！诸军随我破阵，莫要落后！'},
 'person-425':{timbre:'二十五岁女性，清柔透亮的中音，音色细腻温润，婉转而沉着，柔韧有主见，字头清楚，端庄含蓄，不用撒娇腔',anchor:'所托之事，自当尽力。请诸位依计行事，切莫迟疑。'},
 'person-376':{timbre:'二十三岁女性，明亮清脆的中高音，声线坚实有弹性，英气爽利，自信果敢，短句快断，重音鲜明，声音清楚不尖细',anchor:'此事交给我！众将稳住阵脚，随我冲阵！'}
};
export const CHARACTER_VOICE_REFERENCE={title:'央视1994版《三国演义》的人物表演气质',url:'https://ent.cctv.com/special/C18572/20070607/106277.shtml',method:'Original synthetic timbres designed from character descriptions; no cast recordings used.'};
export function characterVoiceDesign(character){
 const direction=CHARACTER_VOICE_DIRECTIONS[character];if(!direction)throw Error('Unknown character voice: '+character);
 return {version:1,text:direction.anchor,instruct:'三国古装历史正剧的原创人物声线。'+direction.timbre+'。中国人自然地道的普通话，语速明快，字句连贯紧凑，短停顿，句末迅速收住，不拖长元音，不吟诗，不唱戏。干净的单人近讲录音，无音乐和环境声。'};
}
