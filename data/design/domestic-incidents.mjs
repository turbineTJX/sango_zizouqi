// Player and AI use the same resident characters and real city stores.
export const DOMESTIC_INCIDENT_RULES=Object.freeze({triggerChance:.03,closeRelation:70,hostileRelation:20,hostileChance:.3,closeChanceMultiplier:1,minimumRewardShare:.75,cityLimit:1,historyLimit:240});
const event=(name,{directions=null,kinds=null,social=null,story=null,relationDelta=0,chance=0,quantity=1,progress=1,description})=>Object.freeze({name,directions,kinds,social,story:story&&Object.freeze(story),relationDelta,chance,quantity,progress,description});
export const DOMESTIC_INCIDENTS=Object.freeze({
 unity:event('同心协力',{social:'close',relationDelta:6,chance:.45,quantity:2,progress:2,description:'两人相知甚笃，合办此事默契有加；本轮成事把握与成果大增，工程和研制也更为顺遂。'}),
 rivalry:event('相互掣肘',{social:'hostile',relationDelta:-6,chance:-.45,quantity:.35,progress:.4,description:'两人素有嫌隙，办理时互不相让；本轮成事把握与成果减损，工程和研制进展放缓。'}),
 marketAbuse:event('强夺市货',{directions:['military'],relationDelta:-12,story:{resource:'manpower',amount:-800,source:null,building:null,actor:'bold',text:'{source}巡察市肆，发现{other}强夺摊贩货物，出言制止，二人争执不休。此事传开，乡民离心，部分预备兵离营而去。'},description:'巡市发现同僚强夺市货，争执伤了交情，乡民离心，损失本城可用预备兵。'}),
 marketPeace:event('市肆解纷',{directions:['commerce'],relationDelta:12,story:{resource:'gold',amount:2000,source:'gift',building:'commerce',actor:'civil',text:'{source}得知市肆有商贩争执，{other}主动相助，二人秉公调停，客商重归市集，感其公允，联名献资相谢。'},description:'与同僚合力调停市肆争端，增进交情，并获得客商献资。'}),
 protectHarvest:event('合力护田',{directions:['agriculture'],relationDelta:12,story:{resource:'grain',amount:6000,source:'gift',building:'farm',actor:'any',text:'{source}得知田间水渠决口，邀{other}一道组织乡民堵口，保住乡民田亩。当地乡绅感其恩义，献出私仓积粮相谢，二人交情渐笃。'},description:'与同僚共同处置农田险情，乡绅献粮相谢，增进交情。'}),
 wasteGrain:event('私宴耗粮',{directions:['agriculture'],relationDelta:-10,story:{resource:'grain',amount:-2400,source:null,building:null,actor:'bold',text:'{source}核察仓廪，发现{other}私开公仓，连日纵众设宴，劝诫反遭顶撞。城仓已耗，二人因此生隙。'},description:'发现同僚私取公粮设宴，真实存粮减少，交情下降。'}),
 enlistHelp:event('乡勇归附',{directions:['military'],relationDelta:10,story:{resource:'manpower',amount:2000,source:'volunteers',building:'barracks',actor:'civil',text:'{source}听闻一支乡勇率众来投，{other}出面接洽，二人妥善安置来投乡勇，兵源得以补充，彼此更为信重。'},description:'与同僚共同接洽乡勇，增加实际预备兵，增进交情。'}),
 bullyRecruits:event('欺压乡勇',{directions:['martial'],relationDelta:-10,story:{resource:'manpower',amount:-600,source:null,building:null,actor:'bold',text:'{source}巡视营伍，发现{other}借操练之名欺压新募乡勇，上前劝止。大批乡勇愤而离营，二人也有了嫌隙。'},description:'发现同僚欺压乡勇，损失可用预备兵，并降低交情。'}),
 insight:event('匠心互启',{kinds:['research'],relationDelta:12,chance:.35,progress:2,story:{resource:null,amount:0,source:null,building:null,actor:'any',text:'{source}办事时听{other}谈及研制中的疑难，二人相互启发，偶得新解；当前研制更为顺遂，交情也有所增进。'},description:'与正在研制的同僚相互启发，提高该项目本轮成事把握和实际进展，增进交情。'}),
 volunteers:event('借力助工',{kinds:['build','repair'],relationDelta:10,chance:.30,progress:2,story:{resource:null,amount:0,source:null,building:null,actor:'any',text:'{source}得知{other}所办工程人手吃紧，出面协调乡民相助。施工顺遂，二人也愈加相契。'},description:'帮助同僚的实际工程协调人手，加快本轮进展，增进交情，不追加用度。'})
});
