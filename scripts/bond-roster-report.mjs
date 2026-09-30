// Internal design audit generated from the actual roster, never a second allocation source.
export function bondRosterAudit(d){
 const rows=Object.entries(d.bonds).map(([key,b])=>{
  const all=Object.entries(d.bondAssignments).filter(([,a])=>a[key]).sort((a,c)=>c[1][key]-a[1][key]||a[0].localeCompare(c[0]));let sum=0,n=0;while(sum<b.thresholds.at(-1)&&n<all.length)sum+=all[n++][1][key];
  const names=cap=>all.filter(([,a])=>a[key]===cap).map(([id])=>d.officers[id].name).join('、')||'—';
  return `| ${b.name} | ${b.thresholds.join('／')} | ${all.length} | ${names(3)} | ${names(2)} | ${sum>=b.thresholds.at(-1)?n:'不可达'} | ${all.slice(0,n).map(([id,a])=>d.officers[id].name+' '+a[key]).join('、')} |`;
 });
 return '## 个人上限与最高档难度\n\n至少人数按全部832人满级的理论最优组合计算，不承诺某剧本能招齐。最高档仍须这些部队同时在场；普通通常六队上场，后备不能凑点。\n\n| 羁绊 | 档位 | 持有人数 | 3级代表 | 2级名单 | 最高档至少人数 | 理论凑档示例 |\n| --- | --- | --- | --- | --- | --- | --- |\n'+rows.join('\n')+'\n\n';
}
