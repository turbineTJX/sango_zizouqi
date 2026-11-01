export async function chooseAssignment(page,selector,id){
 await page.locator(selector).click();
 await page.locator(`[data-assignment-choice="${id}"]`).check();
 await page.locator('[data-action="assignment-picker-confirm"]').click();
}
