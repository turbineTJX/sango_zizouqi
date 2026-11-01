export const validScenarioDate=d=>!!d&&Number.isSafeInteger(d.year)&&d.year>=1&&d.year<=9999&&Number.isSafeInteger(d.month)&&d.month>=1&&d.month<=12&&Number.isSafeInteger(d.day)&&d.day>=1&&d.day<=30;
export const scenarioDateNumber=d=>d.year*360+(d.month-1)*30+d.day-1;
export const scenarioStartDay=d=>(d.month-1)*30+d.day;
export const scenarioDateDay=(document,date)=>date?scenarioDateNumber(date)-document.year*360+1:scenarioStartDay(document);
export const scenarioDateText=d=>d?`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`:'';
export function parseScenarioDate(value){if(!value)return null;const p=String(value).split('-').map(Number),n=i=>Number.isFinite(p[i])?p[i]:0;return {year:n(0),month:n(1),day:n(2)};}
