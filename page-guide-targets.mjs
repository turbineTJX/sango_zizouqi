// Read-only anchors in the live UI. Alternatives are tried in order; an absent
// control is never created, clicked, selected or scrolled into view by help.
const action=name=>`[data-action="${name}"]`;
const actions=(...names)=>names.map(action);
const together=(...groups)=>({groups});
export const PAGE_GUIDE_TARGETS={
 maps:['.map-editor-library',['.map-ground-palette','.map-editor-board'],['[data-map-editor-action="apply"]','[data-map-editor-action="save"]']],
 bandits:['.modal-body details','.command-choices [data-bandit-target]',action('close')],
 ending:['.ending-stats',action('ending-export'),action('ending-new')],
 modes:[action('strategy'),action('campaign-lobby'),action('load')],
 scenarios:[['.scenario-ribbon p','.scenario-ribbon'],'.scenario-ribbon',action('continue-national')],
 factions:['.ruler-strip','.force-summary',action('launch-national')],
 map:[['.strategy-city.selected [data-map-glyph]','.map-metropolis.selected [data-map-glyph]','.self-city-navigation'],'.world-commands','.turn-seal','.national-map-tools'],
 city:[['.strategy-stats','.info-fields'],['.city-command-hub [data-task="domestic"]','.domestic-directions'],['.city-command-hub [data-task="draft"]','.compiled-units'],'[data-page="收支预算"]'],
 domestic:[['.domestic-direction [data-action="domestic-direction-open"]','.domestic-slots .empty:not([disabled])'],['.domestic-slot-person','.domestic-assignee-names .personnel-name','.domestic-slots .empty:not([disabled])'],['.domestic-proposal-actions','.domestic-proposals'],['.domestic-slot-work','.domestic-events','.domestic-workbench']],
 appoint:[action('campaign-command-direction'),'.task-candidate-list tr:has([data-personnel-choice]:not([disabled]))',actions('campaign-pick-confirm','campaign-command-next')],
 proposals:['.domestic-proposal','.domestic-proposal-actions',action('domestic-auto-approve')],
 affairs:[['.faction-affairs [data-action="faction-appoint"]','.faction-affairs'],'.faction-priorities','.domestic-proposals'],
 budget:['.finance-actual',['.city-budget table','.finance-budget table'],['.city-budget-settings','.finance-cities']],
 personnel:[['[data-personnel-filter]','#faction-directory-query','.field-sort-bar'],['.personnel-name','.officer-entry','.info-dossier'],['.personnel-task-grid','.personnel-table','.info-fields']],
 officer:[['.attribute-grid','.officer-stats','.info-fields'],['.officer-strategies','.repertoire-skills','[data-page="战法与军略"]'],['[data-page="行动记录"]','.officer-activity-ledger']],
 governor:['.task-candidate-list',actions('campaign-pick-confirm','campaign-command-next'),['.governor-slot','.info-fields']],
 scouting:['#scout-city','#scout-officer','#scout-target','.map-route-editor','.scout-missions'],
 scoutReport:['.info-fields',['.modal-body>p','.modal-body p'],action('scout-open')],
 troops:[actions('scenario-unit-new','scenario-unit-edit','campaign-unit-new','campaign-unit-edit'),together(['.unit-commander-field','.command-formation'],['.troop-slider','.unit-equipment']),actions('scenario-unit-save','scenario-setup-confirm','campaign-pick-confirm','scenario-setup-next','campaign-command-next')],
 expedition:[['.relationship-matrix-wrap','.compiled-unit-picker','.compiled-units'],'[data-expedition-role]',['.command-decree','.command-target-layout'],['.work-conflicts','.pending-orders']],
 commanders:[['[data-expedition-role="leader"]','[data-scenario-role="leader"]','[data-role="leader"]','[data-battle-appointment-role="leader"]','[data-postbattle-appointment-role="leader"]'],['[data-expedition-role="advisor"]','[data-scenario-role="advisor"]','[data-role="advisor"]','[data-battle-appointment-role="advisor"]','[data-postbattle-appointment-role="advisor"]'],['.commander-repertoire','.army-details-preview','.compiled-units']],
 routes:[['.strategy-city.selected [data-map-glyph]','.map-metropolis.selected [data-map-glyph]','#command-destination'],['.map-route-editor','.map-command-screen .national-map-tools'],['.map-command-footer','.command-decree']],
 transport:['[data-personnel-choice]',['[data-transfer-cargo]','[data-transfer-cycles]'],actions('campaign-pick-confirm','campaign-command-next')],
 interruption:[['.work-conflicts','.modal-body'],['[data-choice="now"]',action('diplomacy-assign-now')],['[data-choice="after"]',action('diplomacy-assign-after')]],
 diplomacy:['.diplomatic-goals','.diplomatic-staff>summary','.diplomatic-proposal','.diplomatic-contracts>summary'],
 intelligence:[['.info-tabs','.intelligence-tabs','.strategy-tabs'],['.personnel-table','.city-directory-list','.info-fields'],['.info-identity>.muted','.info-fields']],
 armies:[['.decision-changes','.unit-muster','.info-fields','.roster-overview'],actions('campaign-pick','campaign-order','military-purpose'),['.decision-facts','.supply-status','.info-fields']],
 marchMode:['.button-row',['.modal-body>p','.modal-body p'],action('march-mode-confirm')],
 battles:[['.strategy-battle-card','.battle-table-wrap'],actions('campaign-focus','campaign-prepare'),actions('campaign-replay','campaign-history','campaign-archive')],
 encounter:[['.encounter-versus','.combat-comparison'],['.compiled-units','[data-action="campaign-defense-prepare"]'],['[name="encounter-control"]',action('start-battle')]],
 deployment:[['.unit-nameplate.side-0','.reserve-bench','.reserve-list'],['.battle-unit.side-0','.deployment-cell','.battle-board'],['.retreat-toolbar','.retreat-council>summary'],action('pause')],
 combat:[['.unit-nameplate','.battle-unit','[data-inspect]'],action('pause'),action('choose-stratagem'),actions('delegate','battle-exit','lobby')],
 stratagems:[['.stratagem-picker','.stratagem-options'],['#stratagem-area-preview','.battle-board'],['[data-area-action="confirm"]',action('close')]],
 reinforcements:[['.reinforcement-arrival','.modal-body'],actions('battle-reinforcement-council','battle-council'),action('battle-reinforcement-continue')],
 unit:[['.unit-state-grid','.attribute-grid','.info-fields'],['.inspection-statuses','.unit-state-grid'],['.tactic-chips','.loadout-grid']],
 tactics:[['.loadout-grid','.tactic-chips','.info-fields'],['.effect-details','.text-detail-scroll','.modal-body'],action('close')],
 buildings:[['.modal-intro','.info-fields'],['.modal-intro','.info-fields'],'.info-strip'],
 reports:[['.report-dispatch','.journal','.officer-activity-ledger'],['.reward-cost','.journal-row','.officer-activity-entry'],action('close')],
 harvest:[['.harvest-totals','.harvest-body'],'.harvest-net',action('close')],
 battleReport:[['.report-table','.snapshot-tables'],['.growth-report','.battle-appointments'],action('close')],
 replay:[['.replay-controls','#snapshot-day'],['.snapshot-board','.snapshot-tables'],action('close')],
 custom:[['[data-custom-option="mapId"]','.historical-battle-library'],'.custom-teams','.custom-reinforcements',action('launch-custom')],
 treasures:['.treasure-table',['[data-treasure-recipient]',action('treasure-select')],['[data-treasure-equip]','.treasure-actions'],action('treasure-confirm')],
 records:[['.officer-activity-paging','.officer-activity-ledger>.muted'],'.officer-activity-days',action('close')],
 abilities:[['.text-detail-view>nav','.text-detail-view'],'.text-detail-scroll',action('close')],
 saves:[together(action('save'),action('load')),together(action('export'),action('import')),'.page-guide-settings']
};

export function visibleGuideRect(element,viewport){
 if(!element?.isConnected||!element.getClientRects().length)return null;
 const win=element.ownerDocument.defaultView;
 let r=element.getBoundingClientRect();
 let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(viewport.width,r.right),bottom=Math.min(viewport.height,r.bottom);
 for(let parent=element;parent;parent=parent.parentElement){
  const style=win.getComputedStyle(parent);
  if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.05)return null;
  if(parent!==element&&/(hidden|clip|auto|scroll)/.test(style.overflowX+' '+style.overflowY)){
   r=parent.getBoundingClientRect();
   if(/hidden|clip|auto|scroll/.test(style.overflowX)){left=Math.max(left,r.left);right=Math.min(right,r.right);}
   if(/hidden|clip|auto|scroll/.test(style.overflowY)){top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}
  }
 }
 if(right-left<8||bottom-top<8)return null;
 return {left,top,width:right-left,height:bottom-top};
}

export function resolveGuideTargets(doc,id,step,currentTopic){
 if(id!==currentTopic)return [];
 const viewport={width:doc.defaultView.innerWidth,height:doc.defaultView.innerHeight};
 const modal=doc.getElementById('modal-panel-root');
 const scope=visibleGuideRect(modal?.querySelector('[role="dialog"]'),viewport)?modal:doc.getElementById('app');
 const spec=PAGE_GUIDE_TARGETS[id]?.[step];
 const groups=spec?.groups||[spec];
 const targets=[];
 for(const group of groups){
  for(const selector of Array.isArray(group)?group:[group]){
   if(!selector)continue;
   const element=[...scope?.querySelectorAll(selector)||[]].find(el=>visibleGuideRect(el,viewport));
   if(element){if(!targets.includes(element))targets.push(element);break;}
  }
 }
 return targets;
}

// Place beside the actual targets, with viewport clamping and overlap avoidance.
export function placeGuideCard(rects,card,viewport){
 const margin=12,gap=18,w=Math.min(card.width,viewport.width-margin*2),h=Math.min(card.height,viewport.height-margin*2);
 if(!rects.length)return {left:(viewport.width-w)/2,top:(viewport.height-h)/2};
 const candidates=rects.flatMap(r=>[
  {left:r.left+r.width+gap,top:r.top+(r.height-h)/2},
  {left:r.left-w-gap,top:r.top+(r.height-h)/2},
  {left:r.left+(r.width-w)/2,top:r.top+r.height+gap},
  {left:r.left+(r.width-w)/2,top:r.top-h-gap}
 ]);
 candidates.push({left:margin,top:margin},{left:viewport.width-w-margin,top:margin},{left:margin,top:viewport.height-h-margin},{left:viewport.width-w-margin,top:viewport.height-h-margin});
 const overlap=(p,r)=>Math.max(0,Math.min(p.left+w,r.left+r.width)-Math.max(p.left,r.left))*Math.max(0,Math.min(p.top+h,r.top+r.height)-Math.max(p.top,r.top));
 return candidates.map((p,index)=>{
  const left=Math.max(margin,Math.min(p.left,viewport.width-w-margin)),top=Math.max(margin,Math.min(p.top,viewport.height-h-margin));
  const score=rects.reduce((sum,r)=>sum+overlap({left,top},r),0)*100+Math.min(...rects.map(r=>Math.hypot(left+w/2-r.left-r.width/2,top+h/2-r.top-r.height/2)))+index;
  return {left,top,score};
 }).sort((a,b)=>a.score-b.score)[0];
}
