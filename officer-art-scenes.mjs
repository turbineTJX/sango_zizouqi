// Presentation vocabulary only. No simulation state or rule randomness is changed.
export const OFFICER_ART_SCENES={
 portrait:{label:'独立头像',format:'头像',width:1024,height:1024,transparent:false,fit:'cover',focus:'50% 45%',brief:'近正面头肩像，完整头饰，眉眼自然放松、嘴唇轻合、目光沉静，无手和武器。'},
 detail:{label:'人物立绘',format:'全身立绘',width:1024,height:2560,transparent:true,fit:'contain',focus:'50% 50%',brief:'完整头饰至双脚的透明全身立绘，重心稳定、自然站姿，手臂放松或低位持标志物，头部平正，神态中性沉稳。'},
 domestic:{label:'案牍内政',format:'半身像',width:1152,height:1536,transparent:false,fit:'contain',focus:'50% 45%',brief:'平视侧坐案前，肩部放松，低幅度阅简、翻页或执笔，眼神自然落在文书，专注而不皱眉瞪眼。'},
 inspection:{label:'现场巡视',format:'横向场景',width:1536,height:1024,transparent:false,fit:'contain',focus:'32% 42%',brief:'侧身或四分之三站姿，双手低位持卷、兵器或收于袖内，平静观察现场，不抬臂遮眼、前伸手掌或扭身。'},
 training:{label:'整军训练',format:'宽幅场景',width:1792,height:1008,transparent:false,fit:'contain',focus:'40% 42%',brief:'平视整军监督或器械检查，沉静站立、低位自然持兵器或坐姿检查器械，嘴唇闭合，不大幅指点、挥击或蹲摆动作。'},
 diplomacy:{label:'外交接洽',format:'半身像',width:1024,height:1280,transparent:false,fit:'contain',focus:'50% 42%',brief:'平视自然坐姿或轻微侧站，双手安放桌面或低位拢袖，神态礼貌中性，轻微转头听取意见，不夸张作揖、大笑或挑眉。'},
 command:{label:'军团指挥',format:'宽幅场景',width:1536,height:864,transparent:false,fit:'contain',focus:'62% 40%',brief:'自然端坐地图案前，略微前倾，一手轻触近处路线或图筹，另一手安放桌面或低位持扇，沉静研判，不俯压案面或伸长手臂。'},
 travel:{label:'行旅运输',format:'行旅全身像',width:1024,height:1792,transparent:false,fit:'contain',focus:'50% 50%',brief:'完整双脚的普通小步行走，侧面或三分之四朝前，目光沿路，衣摆轻微运动，持物贴近身体，不奔跑、大幅回头或披风飞扬。'},
 report:{label:'报喜奏报',format:'横向半身像',width:1536,height:1152,transparent:false,fit:'contain',focus:'50% 42%',brief:'平静呈报结果，低位自然持简、文书或扇，略有满意但保持嘴唇闭合，手势靠近身体，不大笑、拳礼或向镜头递卷。'},
 'report-concern':{label:'告急奏报',format:'近景半身像',width:1152,height:1536,transparent:false,fit:'contain',focus:'50% 40%',brief:'坐姿阅急报、略低眼神与轻微凝神，仍沉着中性，双手自然放置，不惊慌瞪眼、张口、扶额、抓须或前伸警示。'},
 battle:{label:'战斗切入',format:'宽幅人物像',width:2048,height:1152,transparent:false,fit:'contain',focus:'27% 43%',brief:'平视沉稳军姿的横幅人物像，人物在左半幅，兵器或羽扇贴近身体自然持握，神态坚定中性；不怒吼、挥击、突刺、扭身或夸张透视。'}
};
export const OFFICER_ART_KEYS=Object.keys(OFFICER_ART_SCENES);
// Production assets and UI scenes are separate: three originals serve every view.
export const OFFICER_ART_SOURCES={
 neutral:{label:'站立母图',format:'透明全身母图',width:1536,height:2560,transparent:true,fit:'contain',focus:'50% 50%',brief:'完整头饰至双脚，自然稳定站立，面容清晰；头饰顶部留白约3%，头部居中并位于画面上部，手臂舒适低放，标志物靠近身体。'},
 work:{label:'办事母图',format:'透明全身母图',width:1536,height:2560,transparent:true,fit:'contain',focus:'50% 50%',brief:'完整头饰至双脚，轻微侧身办理本职事务，以自然低位手势和个人道具区别站立母图；人物居中，不绘制桌案、建筑或环境背景。'},
 command:{label:'指挥母图',format:'透明全身母图',width:1536,height:2560,transparent:true,fit:'contain',focus:'50% 50%',brief:'完整头饰至双脚，轻微侧转研判或部署，保持本人的文武职责；自然低位持兵器、指挥物或本职道具，人物居中，不绘制军帐、战场或环境背景。'}
};
export const OFFICER_ART_SOURCE_KEYS=Object.keys(OFFICER_ART_SOURCES);
export const OFFICER_ART_ASSET_KEYS=[...new Set([...OFFICER_ART_KEYS,...OFFICER_ART_SOURCE_KEYS])];
export const OFFICER_ART_FORMAT_VERSION='pose-reuse-v4';
export const OFFICER_ART_LEGACY_VERSION='scene-neutral-v3';
export const OFFICER_ART_SOURCE_FALLBACKS={neutral:['detail'],work:['domestic','diplomacy'],command:['battle','training']};
export const OFFICER_ART_VIEWS={
 portrait:{source:'neutral',frame:'face',background:'hall'},roster:{source:'neutral',frame:'face',background:'hall'},
 detail:{source:'neutral',frame:'full',background:'none'},
 domestic:{source:'work',frame:'half',background:'hall'},inspection:{source:'work',frame:'half',background:'field'},
 training:{source:'command',frame:'half',background:'camp'},diplomacy:{source:'work',frame:'half',background:'hall'},
 command:{source:'command',frame:'half',background:'camp'},travel:{source:'neutral',frame:'full',background:'road'},
 report:{source:'work',frame:'half',background:'hall'},'report-concern':{source:'work',frame:'half',background:'hall'},
 battle:{source:'command',frame:'half',background:'camp'}
};
export function validArtCrop(rect){return Array.isArray(rect)&&rect.length===4&&rect.every(Number.isFinite)&&rect[0]>=0&&rect[1]>=0&&rect[2]>0&&rect[3]>0&&rect[0]+rect[2]<=1.000001&&rect[1]+rect[3]<=1.000001;}
export function officerArtView(entry,source,scene){
 const view=OFFICER_ART_VIEWS[scene]||OFFICER_ART_VIEWS.detail;
 const reusable=OFFICER_ART_SOURCE_KEYS.includes(source),framing=entry.framing||'full';
 let crop=[0,0,1,1];
 if(reusable&&framing==='full'&&view.frame==='face'){
  const height=Math.min(.3,entry.width/entry.height),width=height*entry.height/entry.width;
  crop=[(1-width)/2,.015,width,height];
 }else if(reusable&&framing==='full'&&view.frame==='half')crop=[0,0,1,.62];
 if(reusable&&validArtCrop(entry.crops?.[view.frame]))crop=entry.crops[view.frame];
 const width=entry.width*crop[2],height=entry.height*crop[3];
 return {...view,crop,width,height,fit:view.frame==='face'?'cover':'contain',reusable};
}
export const OFFICER_ART_STYLE='原创汉末三国策略游戏的半写实手绘人物，参考三国志系列人物像的克制、沉稳和自然比例：细墨线、柔和笔触、低饱和青绿与暖赭、自然布帛和铁铜，面容清晰，柔和均衡光线。表情尽量中性，眉眼放松、嘴唇自然闭合，动作幅度小、手部舒适。同一人物只制作站立、办事、指挥三张可复用母图，头像、半身和横幅由界面裁剪与共享背景组合，不为每种界面重新作画。完整头饰，无文字、水印、边框和拼图，只有一名主体人物。';
export const OFFICER_ART_LOCK='固定脸型、年龄、胡须、头饰、体型、主色与标志物，身份参考不锁定皱眉或动作。重新设计自然姿态与取景，只做细微神态差异。禁止怒吼、露齿、大笑、瞪眼、挑眉、鬼脸、抓须扶额、向镜头伸掌、大幅挥击、伸臂指点、扭身、飞扬披风和夸张透视；手臂靠近身体，头肩与五官比例正常。中性与自然优先于表情差异。';
export function workArtScene({kind,direction,buildingKey}={}){
 if(['build','repair','rescue'].includes(kind)||['farm','granary','walls'].includes(buildingKey))return 'inspection';
 if(['train','recruit','prepare'].includes(kind)||['barracks','drill'].includes(buildingKey)||['military','martial'].includes(direction))return 'training';
 return 'domestic';
}
export function reportArtScene(node={}){
 if(node.category==='occupation'&&node.phase==='lost')return 'report-concern';
 if(node.category==='battle'&&node.phase==='settled'&&node.result?.winner&&node.result.winner!==node.faction)return 'report-concern';
 const concern=['event','pause','failure','cancel','blocked','failed','war','DEAD','CAPTIVE','TRANSPORT_LOST','leave-warning','resigned','changed-side','offer-paused','displaced'];
 return concern.includes(node.phase)||node.result?.lost===true?'report-concern':'report';
}
export function activityArtScene(activity={},work={}){
 if(activity.milestone)return reportArtScene(activity);
 if(activity.code==='mission')return activity.fromId&&activity.toId?'travel':'diplomacy';
 if(['travel','march','free-travel','return'].includes(activity.code))return 'travel';
 if(activity.code==='battle')return 'command';
 if(activity.code==='army')return 'command';
 if(activity.code==='diplomacy')return 'diplomacy';
 if(activity.code==='domestic')return workArtScene({...activity,...work});
 if(['governor','assigned'].includes(activity.code))return 'domestic';
 return 'detail';
}
