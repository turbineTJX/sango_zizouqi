// Exercise the public map controls: locating never commits a selection.
export async function locateMapTarget(page,id){
 const pin=page.locator(`.national-world [data-command-city="${id}"]`);
 const name=(await pin.getAttribute('aria-label')).split('，')[0];
 await page.locator('[data-map-target-search]').fill(name);
 await page.locator(`[data-action="map-target-locate"][data-id="${id}"]`).click();
 return page.locator(`.national-world [data-command-city="${id}"]`);
}
export async function chooseMapTarget(page,field,id){
 await page.locator(field).click();
 const pin=await locateMapTarget(page,id);
 await pin.locator('.city-size-mark,.atlas-gate-outline,.junction-banner').first().click();
 await page.locator('[data-action="map-target-confirm"]').click();
}
export async function chooseCommandTarget(page,id){
 const pin=page.locator(`.national-world [data-command-city="${id}"]`);
 const point=await pin.evaluate(el=>({x:+el.dataset.x,y:+el.dataset.y}));
 await panMapTo(page,point);
 await pin.locator('.city-size-mark,.atlas-gate-outline,.junction-banner').first().click();
}

// Pan through the same keyboard controls available to the player, preserving zoom.
export async function panMapTo(page,point){
 const main=page.locator('.national-world');await main.focus();
 for(let i=0;i<320;i++){
  const v=await main.evaluate(el=>({x:el.viewBox.baseVal.x,y:el.viewBox.baseVal.y,width:el.viewBox.baseVal.width,height:el.viewBox.baseVal.height}));
  const dx=Math.max(v.width/2,Math.min(1024-v.width/2,point.x))-(v.x+v.width/2),dy=Math.max(v.height/2,Math.min(1024-v.height/2,point.y))-(v.y+v.height/2);
  if(Math.abs(dx)<=v.width*.051&&Math.abs(dy)<=v.height*.051)return;
  if(Math.abs(dx)>v.width*.051)await page.keyboard.press(dx<0?'ArrowLeft':'ArrowRight');
  if(Math.abs(dy)>v.height*.051)await page.keyboard.press(dy<0?'ArrowUp':'ArrowDown');
 }
 throw Error('Map navigation could not reach the requested point');
}
