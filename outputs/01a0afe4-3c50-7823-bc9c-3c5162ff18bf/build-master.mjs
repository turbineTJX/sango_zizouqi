import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
import {OFFICER_MASTER_COLUMNS as columns,OFFICER_MASTER_ROWS as rows,OFFICER_MASTER_RECORDS as records,ORIGINAL_KEYS,ORIGINAL_ROWS,MASTER_RULES_VERSION} from '../../scripts/officer-master-data.mjs';
const out=fileURLToPath(new URL('./',import.meta.url));
const wb=Workbook.create();
const master=wb.worksheets.add('武将总表'),raw=wb.worksheets.add('来源原字段');
const font='Microsoft YaHei';
const column=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const textWidth=v=>[...String(v??'')].reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0);
const safe=v=>typeof v==='string'&&v.startsWith('=')?"'"+v:v;
function table(sheet,cols,data,header,name){
 const last=column(cols.length-1),end=header+data.length;
 const range=sheet.getRange(`A${header}:${last}${end}`);
 range.values=[cols.map(c=>c.label),...data.map(row=>row.map(safe))];
 range.format.font={name:font,size:10,color:'#243447'};
 range.format.verticalAlignment='center';range.format.wrapText=true;
 range.format.rowHeight=28;
 const t=sheet.tables.add(`A${header}:${last}${end}`,true,name);t.showFilterButton=true;
 t.style='TableStyleMedium2';
 cols.forEach((c,i)=>{
  const col=column(i);sheet.getRange(`${col}${header}:${col}${end}`).format.columnWidth=c.width;
  const body=sheet.getRange(`${col}${header+1}:${col}${end}`);
  body.format.horizontalAlignment=c.format?'right':'left';
  if(c.format)body.setNumberFormat(c.format);
 });
 const head=sheet.getRange(`A${header}:${last}${header}`);
 head.format={fill:'#243B53',font:{name:font,size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:36};
 for(let i=0;i<data.length;i++){
  const lines=Math.max(...data[i].map((v,j)=>Math.ceil(textWidth(v)/Math.max(8,cols[j].width-3))));
  sheet.getRange(`A${header+i+1}:${last}${header+i+1}`).format.rowHeight=Math.min(390,Math.max(28,lines*16+12));
 }
 sheet.showGridLines=false;
 sheet.freezePanes.freezeRows(header);sheet.freezePanes.freezeColumns(2);
 return {last,end};
}
master.tabColor='#243B53';
master.getRange('A2').values=[['三国武将全字段总表']];
master.getRange('A2:L2').format.font={name:font,size:16,bold:true,color:'#243B53'};
master.getRange('A2:L2').format.rowHeight=30;
master.getRange('A3').values=[[`规则 ${MASTER_RULES_VERSION}　835 人　${columns.length} 个字段　41 人已设计技能，794 人待设计　2026-09-17`]];
master.getRange('A4').values=[['新建部队及1级属性为默认3000兵、无军团加成快照；不是正在进行的存档。空数值表示未载或不适用。']];
master.getRange('A5').values=[['按“技能设计状态”筛选名将。原始势力/城池/官职编号保留来源含义，人物关系为初始资料。']];
master.getRange('A3:P5').format.font={name:font,size:10,color:'#526478'};
master.getRange('A3:P5').format.rowHeight=22;
const m=table(master,columns,rows,7,'OfficerMaster');
const groups={身份:'#243B53',能力:'#355C7D',成长:'#5C4675',战法:'#76542D',部队:'#355C7D',人物:'#35544B',适性:'#35544B',关系:'#65506A',来源:'#56616D'};
columns.forEach((c,i)=>master.getRange(`${column(i)}7`).format.fill=groups[c.group]);
master.getRange(`D8:D${m.end}`).conditionalFormats.add('containsText',{text:'待设计',format:{fill:'#FFF2CC',font:{color:'#885E00'}}});

raw.getRange('A2').values=[['来源原字段']];
raw.getRange('A2:L2').format.font={name:font,size:16,bold:true,color:'#243B53'};
raw.getRange('A3').values=[['数据来源：项目武将库、人物资料映射、名将设计、被动技能、战法配置与战斗引擎。原始字段按来源名称保留。']];
raw.getRange('A4').values=[['数组保存为JSON；空格表示原字段缺失。来源等级、忠诚、势力等不等同于游戏运行配置。总表为生成时快照。']];
raw.getRange('A3:P4').format.font={name:font,size:10,color:'#526478'};
raw.getRange('A3:P4').format.rowHeight=22;
const rawCols=[{label:'当前武将编号',width:19},{label:'当前姓名',width:12},{label:'来源类别',width:13},...ORIGINAL_KEYS.map((k,i)=>({label:k,width:/List|Brother|image/.test(k)?36:Math.max(14,k.length+3),format:ORIGINAL_ROWS.every(r=>r[i+3]===null||typeof r[i+3]==='number')?'0':null}))];
table(raw,rawCols,ORIGINAL_ROWS,6,'OfficerSource');

assert.equal(rows.length,835);assert.equal(new Set(records.map(r=>r.id)).size,835);
assert.equal(records.filter(r=>r.status==='已设计').length,41);
assert.deepEqual(master.getRange(`A8:${m.last}${m.end}`).values,rows);
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'武将总表!A7:L10',include:'values',tableMaxRows:4,tableMaxCols:12,maxChars:1800})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:10},summary:'final error scan',maxChars:1000})).ndjson);
for(const [sheetName,range,file] of [['武将总表','A1:L12','master-preview.png'],['武将总表','W7:AB11','skills-preview.png'],['来源原字段','A1:L11','source-preview.png']]){
 if(process.argv.includes('--render-source-only')&&sheetName!=='来源原字段')continue;
 const image=await wb.render({sheetName,range,scale:1.4,format:'png'});
 await fs.writeFile(out+file,new Uint8Array(await image.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(out+'三国武将全字段总表.xlsx');
await fs.writeFile(out+'expected-data.json',JSON.stringify({columns,rows,rawCols,originalRows:ORIGINAL_ROWS}));
console.log('Exported',out+'三国武将全字段总表.xlsx');
