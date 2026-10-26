// Replace a running game's fixture through its real import flow. Direct storage
// writes can be overwritten by that game's pagehide save during navigation.
export async function importSaveFixture(page,data){
 const raw=typeof data==='string'?data:JSON.stringify(data);
 await page.locator('[data-action="settings"]').first().waitFor({state:'attached'});
 await page.evaluate(()=>{document.querySelector('#page-guide-root [data-guide-action="close"]')?.click();document.getElementById('toast').textContent='';document.querySelector('[data-action="settings"]').click();document.querySelector('[data-guide-action="toggle"][aria-pressed="true"]')?.click();});
 await page.locator('#import-file').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await page.getByText('存档导入成功',{exact:true}).waitFor();
}
