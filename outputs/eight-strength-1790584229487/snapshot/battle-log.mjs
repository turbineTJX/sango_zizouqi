export const BATTLE_LOG_LIMIT=300;
export const BATTLE_LOG_KINDS={all:'全部',trait:'特性',tactic:'战法',attack:'普攻',command:'军略',event:'战况',ongoing:'持续效果'};
export function appendBattleLog(b,text,kind='event',side=null){
 b.logs||=[];b.logs.unshift({tick:b.tick,text:String(text).slice(0,999),kind,...(side===0||side===1?{side}:{})});
 b.logs.length=Math.min(b.logs.length,BATTLE_LOG_LIMIT);
}
