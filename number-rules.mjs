// Round once at the settlement/display boundary, after all factors are applied.
// Rates, probabilities, coordinates and carried progress retain their precision.
export const roundResult=value=>{const result=Math.round(value);return result===0?0:result;};
export const integerText=value=>Number.isFinite(value)?roundResult(value).toLocaleString('zh-CN'):'—';
export const percentText=fraction=>integerText(fraction*100)+'%';
export const remainingDaysText=value=>integerText(Math.ceil(Math.max(0,value)));
export const completeDaysText=value=>integerText(Math.floor(Math.max(0,value)));
// A rate of one is 100%: one hex per battle turn / one attack per second.
export const attributeScale=key=>['move','attackSpeed'].includes(key)?100:1;
export const attributeText=(key,value)=>integerText(value*attributeScale(key))+(attributeScale(key)===100?'%':'');
// An unfinished project must never be labelled complete through rounding.
export const progressText=(value,total=100)=>integerText(Math.min(value<total?99:100,roundResult(Math.max(0,value/total*100))));
