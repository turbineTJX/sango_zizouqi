// Presentation facts retained with an observed entry after activity receipts expire.
export function isRoutineMerit(node){
 const growth=node?.result?.growth;
 return node?.phase==='merit'&&/^merit:(governor|work-progress):/.test(node.sourceId)&&node.result.leveled===false&&Number.isFinite(growth?.gained)&&growth.gained>=0&&Number.isSafeInteger(growth.before)&&growth.before===growth.after;
}
