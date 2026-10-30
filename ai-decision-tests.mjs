import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
// Named behavior tests are required, not just a declaration or an import check.
const cases=(file,...names)=>names.map(name=>({file:'tests/'+file+'.test.mjs',name}));
const behaviorTests={
 domestic:[...cases('domestic-cooperation','failed research cooperation cannot count rounded progress as a bonus and remains saveable','failed repair cooperation cannot claim saved fractional work as an extra result'),...cases('officer-recommendation','related traits add fifty once regardless of count and never change real attributes','AI secures needed food staffing with shared task scores, preserves appointments and uses each actor once'),...cases('ai-city-budget','a penniless AI city reuses a waiting optional worker for real cash production','voluntary orders retain the last necessary resident food or cash worker'),...cases('ai-domestic-grain-trade','AI grain purchase with fractional stock remains saveable through actual daily execution'),...cases('talent-economy','player and AI autonomous work reject wasteful management and full-warehouse irrigation, without granting predicted income')],
 proposals:[...cases('domestic-proposals','approval rechecks city gold and sites without charging or substituting the original proposal','automatic approval applies to pending and future work and is saved; free operations need no proposal'),...cases('all-ai-campaign','observation crosses turns without approvals and resumes deterministically from its current save'),...cases('ai-domestic-grain-trade','player grain purchase floors fractional warehouse space before approval and save','AI grain purchase floors fractional warehouse space before approval and save')],
 priority:[...cases('player-ai-decisions','each faction owns a saved domestic priority and budgets never depend on the viewing faction'),...cases('strategic-staffing','ordinary logistics preserves an arrived staffing appointment until its first real work attempt','urgent real food transport may release staffing while lost ownership and duplicate claims invalidate it','AI redistributes an idle prepared garrison to a small city that already has three residents, then performs real work','AI staffing uses available work rather than an unavailable higher attribute and can add a second economic worker','AI staffing leaves productive local appointments in place and sends nobody to a city without real work','AI staffing preserves the source defenders and checks destination rations for a prepared unit','AI personnel sends military aptitude toward the front and civil aptitude toward the rear through real transfers','frontline personnel retains leading military officers and two actual guard units even behind strong walls','personnel roles update with own borders and ignore hidden enemy strength orders and random state','a saved waiting staffing transfer rechecks newly exposed frontline talent before departure')],
 budgets:[...cases('ai-default-policies','AI budget policy preserves saved city floors and reads forecasts without crediting income'),...cases('strategic-planning','preparation forecasting respects the actual harvest date and rejects starvation before income'),...cases('strategic-economy-planning','strategic admission explains rejected forces and rejects malformed reasons on reload'),...cases('integer-resource-quantities','actual city and army rations are whole units and forecasts settle the same grain','save validation rejects fractional physical stocks instead of silently rounding the save')],
 governor:cases('ai-default-policies','AI governor selection uses the shared ranking and excludes queued local officers'),
 scouting:[...cases('strategic-ai-scouting','AI assigns at most two unique scout targets and uses eligible officers in intelligence order','the complete military planner makes identical faction decisions when only hidden enemy state changes'),...cases('talent-intelligence','cao persuasion decisions ignore hidden loyalty and rival staffing','yuan persuasion decisions ignore hidden loyalty and rival staffing','an actual paid persuasion journey rejects a loyal target, saves its response and waits before retrying')],
 formation:cases('strategic-ai','shared recruitment spends one city quota and the AI treasury only, preserving planned grain'),
 expedition:[...cases('strategic-ai','a winnable attack is refused when casualty replacement is unaffordable','deferred AI departure rechecks the home guard when the original work finishes','offensive grain reservations include home rations and wait for actual supplies'),...cases('strategic-algorithms','an optimistic evaluator cannot override source budgets, staffing or physical supply constraints','a substituted battle model receives dated lawful intelligence, never hidden stocks or RNG'),...cases('strategic-planning','default development and recovery cannot veto a better feasible offensive through the switching margin'),...cases('strategic-opposition','paid emergency defense is estimated from observed gold reserves and quota without creating soldiers','timely nearby field reinforcements raise defense losses and can veto a previously viable attack','observed approaching relief counts fully while armies too late on real roads do not count','potential city relief retains half its garrison and includes arrival during the siege','a known neutral objective includes a timely competing hostile force before treating occupation as free','opposition estimates cannot read hidden city resources officers secret orders or random outcomes','militarily inadequate small variants do not prevent assembling an actually superior legal force','a launched operation rechecks newly observed timely relief before contact and really returns','military evidence survives ordinary all AI save continuation and malformed forecasts fail validation')],
 routes:cases('strategic-ai','hungry marching columns reverse continuous road progress once without teleporting','travel estimates charge each road separately, matching lost movement at city arrivals'),
 transport:[...cases('strategic-support-ai','AI plans bounded repeat grain shipments, counts future batches and takes each batch from its source','waiting transports recheck the saved route and do not spend resources after a new visible blockade'),...cases('integer-resource-quantities','fractional supply rates move only whole grain without inventing stock or road capacity'),...cases('strategic-staffing','a staffing promise survives real travel and reload, appoints on arrival and completes only after actual work')],
 timing:cases('strategic-ai','a persisted common AI order waits for real domestic work and never creates an army early','recent real interruption protects the next task across reload except when rescue would be missed'),
 diplomacy:[...cases('diplomacy','player and AI approval use the same final proposal, version and lawful preflight without paying early','AI uses real candidates and ruler valuation, never supplies player approval'),...cases('diplomacy-tempo','unrelated diplomatic priorities never generate city exchanges','AI city exchange waits six strategic turns and cannot bypass the departure gate','city exchange requires visible cities and better road connections for both factions')],
 armies:[...cases('battle-decisions','human and AI appointment selection share scores, local candidates and atomic execution','a withdrawing commander leaves a vacancy until real battle settlement and save reload does not appoint early','postbattle human vacancies persist and reject zero troops while AI fills the same legal roles in background','reinforcement councils appoint only arrived local survivors and preserve prior command effects through reload'),...cases('player-ai-decisions','AI remnant merging calls the shared atomic draft and preserves real men and food','background submission cannot waive the same real military conversion fee'),...cases('strategic-management-ai','management capacity counts zero-strength officers so it skips impossible remnant merges'),...cases('integer-resource-quantities','splitting an odd food stock preserves integer shares and their exact total')],
 march:[...cases('march-duration','sub-one daily movement retains its full remaining road time','army itinerary uses each actual land or water speed instead of reusing land speed'),...cases('strategic-management-ai','march AI restores full baggage at home after arrival or a changed unsafe route','forced march needs a real arrival improvement and enough food for the shorter journey','background AI restores a real arrived light column through the paid shared baggage handler'),...cases('integer-resource-quantities','light baggage floors odd capacity and returns whole grain while conserving the warehouse total')],
 support:cases('strategic-support-ai','a visible blockade of an actual supply corridor dispatches real guards and retains city rations','AI reinforcements walk to an ongoing field battle and enter its actual reserve pool'),
 defense:cases('siege-mobilization','AI mobilizes real reserves on arrival before empty occupation, without waiting for a new turn','no officers, reserves, treasury, quota, or available wounded capacity still means direct empty occupation'),
 deployment:[...cases('battle-decisions','prebattle AI uses legal placement and the same deployment operation on both sides','reinforcement AI keeps positions, action array, intention, retreats, cooldowns and unarrived units','unseen enemy reserves and random state do not change the AI council plan','simultaneous AI councils and complete battles do not depend on controller evaluation order','a shared council preserves the human deployment and never exposes unarrived enemy reserves'),...cases('deployment-order','future arrivals, blockade and retreat never admit a stronger reserve early','replacement choices and combat remain deterministic after save/resume, without changing initiative order')],
 command:[...cases('battle-ai','AI follows fixed command order, holds ineligible commands, and does not refresh active buffs','enemy earns its own gauge and automatically casts only learned commands after enough active intellect'),...cases('stratagem-ai',...Object.values(STRATAGEM_DESIGNS).flatMap(s=>[0,1].map(side=>s.name+' AI holds its full gauge when the condition fails, side '+side)))],
 retreat:cases('battle-retreat','exact current soldiers trigger either side, wounds are excluded, healing never cancels withdrawal','a freed slot waits for actual reserve arrival and a withdrawing force cannot supply commands'),
 treasure:[...cases('treasures','AI allocates a city treasure to an eligible officer in another city without a courier'),...cases('ai-default-policies','AI treasure policy retains an existing lawful equipment choice and never rerolls resources')],
 captive:cases('ai-default-policies','AI captive policy holds a guarded prisoner until lawful release and spends no automatic ransom')
};
behaviorTests.expedition.push(...cases('strategic-concentration',
 "partial preparation rejects an assembled roster that cannot traverse its real water route",
 "an insufficient assault force can fund one bounded real preparation without declaring war or inventing arrivals",
 "partial concentration obeys real destination funding and safe donor roads",
 "concentration arrivals stay reserved until a turn review and continuation preserves the fixed deadline",
 "closing unsafe preparation releases claims without teleporting real journeys and prevents immediate shuffling",
 "a ready attack on the same objective releases concentration claims before reserving its soldiers",
 "a delayed concentration departure rechecks funding and its remaining fixed travel window",
 "hidden enemy stocks and battle randomness cannot alter a partial concentration choice",
 "fixed preparation expiry cancels without refreshing itself or moving travelling troops",
 "concentration validation rejects fractional requirements duplicate claims and deadline resets"));
behaviorTests.support.push(...cases('strategic-support-ai',
 'support preserves an unrelated offensive when its troops have no route or cannot arrive in time',
 'support does not cancel an offensive when released troops still lack food or sufficient strength',
 'support releases a feasible nearby commitment and actually pays for the replacement guard mission'));
behaviorTests.expedition.push(...cases('strategic-planning',
 'bounded target selection preserves different cities instead of filling its shortlist with one roster family','operation deadlines budget forecast preparation once without extending during execution'));
behaviorTests.expedition.push(...cases('precombat-assessment',
 'identical observed armies have symmetric ratings and one shared capability measurement',
 'real troop counters and public terrain change the same force assessment',
 'spent real tactic stocks remove their expected contribution without changing learned tactics',
 'known reserves add discounted strength rather than simultaneous full frontage',
 'only selected actual commanders contribute appointment stats and frontage',
 'static assessment preserves inputs and cannot use hidden orders or a future random seed',
 'closed form losses fall nonlinearly with advantage and remain bounded at parity',
 'offensive facts keep shared real combat features and retain reinforcement resource vetoes'));
behaviorTests.expedition.push(...cases('bandits',
 'bandit AI uses only observed camps and the same paid real expedition, retaining a garrison',
 'real bandit contact uses the common battlefield and deterministic save continuation'));
behaviorTests.expedition.push(...cases('ai-bond-blind',
 'AI force assessment ignores both armies bond points while real combat attributes retain them',
 'shared expedition, formation and unit recommendations give no score or ranking credit to bonds'));
behaviorTests.expedition.push(...cases('strategic-recovery',
 'recovery reports the full sustained grain deficit and preparation cannot mistake it for recruitment money',
 'recovery separates stock shortages from quota and capacity limits without fictional work',
 'candidate and committed recovery forecasts deduct the same real departure load exactly once',
 'recovery forecasts use actual later income and quota without spending current stocks',
 'unused recruitment quotas do not accumulate before the army really returns',
 'replacement capacity includes grain survival, commitments, real prices and shared work limits',
 'economic depth changes risk tolerance but never gives unknown or stale opponents a discount',
 'same current military force can be admitted or held by actual refill resources',
 'equal soldier counts reflect observed officer quality throughout strategic summaries',
 'idle appointments create no fictional work loss while started work keeps its real remaining cost'));
behaviorTests.deployment.push(...cases('ai-bond-blind',
 'AI starter rankings and deployment do not use bond levels or formation marks on side 0',
 'AI starter rankings and deployment do not use bond levels or formation marks on side 1',
 'AI attribute views exclude temporary bond benefits but retain normal tactic buffs without changing inputs'));
behaviorTests.deployment.push(...cases('battle-decisions','simultaneous councils erase single side preview positions and water forms before either AI evaluates'));
behaviorTests.deployment.push(...cases('autochess-positioning','AI reserve entry uses the shared legal operation and does not consult bond points or random state','AI councils preserve active positions during reinforcements while configuring arrived reserves'));
behaviorTests.deployment.push(...cases('battle-spatial-ai',
 'AI deployment and reserve entry rotate with the battlefield without changing RNG or roster order',
 'default and configured reserves wait for a real own-side entry cell on both controllers',
 'occupied reserve fallback and blocked formation marks rotate without choosing rock',
 'automatic movement and tactic paths take corresponding legal routes after rotation'));
behaviorTests.defense.push(...cases('battle-spatial-ai','returning defenders disengage from real contact without saving their own gate as an enemy target'));
behaviorTests.command.push(...cases('battle-spatial-ai','AI area command ties rotate with the caster side while retaining effective target counts'));
behaviorTests.expedition.push(...cases('strategic-tempo',
 'conquest stock value is bounded to fresh observed resources and cannot credit hidden or stale warehouses',
 'large troop formations carry real thirty day rations under the same player and AI stock rules',
 'war stages follow strategic turns while real funded forces limit campaign and joint operations',
 'current training reservations cannot consume every future turn recruitment quota',
 'continuing an affordable attack tolerates bounded changes but never accepts a weaker army',
 'launched operations protect real replacement resources from optional domestic spending',
 'a funded large faction gathers actual troops and launches multiple columns toward one defended objective',
 'a mature second front uses different real depots and officers while preserving the primary operation'));
behaviorTests.routes.push(...cases('strategic-tempo',
 'real carried grain bridges a finite unsupported camp without requiring every route segment to supply the whole trip'));
behaviorTests.expedition.push(...cases('strategic-tempo',
 'sustained refill capacity reduces a long operation burden within a bound without altering losses or food',
 'a stalled middle game front concentrates real troops before the late game without counting arrivals early',
 'middle game concentration can use more than ten arrived units through legal ten-unit armies',
 'early game capacity does not enable the middle game concentration fallback',
 'an observed empty city does not acquire a fictional siege after the expedition departs'));
behaviorTests.expedition.push(...cases('strategic-temperament',
 'ruler personality and attributes change sampled risk taking while early turns and quiet pressure remain bounded',
 'one ruler preference is drawn per strategic turn and survives a real save and daily continuation',
 'a willing ruler can admit an affordable marginal offensive without changing power losses resources or combat RNG',
 'ruler willingness cannot waive actual supply home guards or casualty replacement costs',
 'unopposed occupation retains its high unification value and rewards a smaller sufficient force',
 'a committed operation retains its ruler preference when the next turn draws a different willingness',
 'ruler choice validation rejects modified dice probabilities attributes and old AI saves'));
behaviorTests.expedition.push(...cases('strategic-coordination',
 'central assembly budgets replenishment at its real return depot before reserving distant troops',
 'a recoverable staffing gap retains its original objective and resumes only after real replacement and delivery',
 'a persistent preparation gap expires without extending the original deadline or creating troops',
 'active plan guard repairs can reference a real source depot without borrowing another plans request',
 'a marginal military gap can add real available troops to the same objective only at the next turn review',
 'an imminent real home threat still cancels a preparing attack instead of waiting for promised guards',
 'an unrelated distant city threat does not recall an offensive that cannot reach its defense'));
behaviorTests.routes.push(...cases('strategic-coordination',
 'coordinated forecasts share real depot stocks and daily road throughput between columns',
 'coordinated departures retain grain already reserved by a real waiting transport',
 'coordinated mixed land and water timing matches real ship speeds and daily road arrivals'));
behaviorTests.diplomacy.push(...cases('ai-long-campaign-fixes',
 'deferred payment funds only its unescrowed balance while reciprocal cargo is still travelling'));
behaviorTests.defense.push(...cases('defensive-response','防守方 0 接近界外射手反击并确定性续战','防守方 1 接近界外射手反击并确定性续战'));
const longCampaignCases={
 scouting:cases('strategic-victory','an unknown peaceful main direction obtains real scouting before any declaration or departure'),
 expedition:cases('strategic-victory','every ruler in every original scenario retains unification as the final victory objective','unification values connecting holdings, finishing a region, known last strongholds and future corridors','a viable unification operation reopens an unprotected peace through the shared declaration handler','victory ambition cannot declare war or depart with unaffordable replacement or active protection','unification assessments cannot see hidden foreign ownership, resources, orders or random outcomes','final objectives and score evidence survive deterministic ordinary all AI continuation and reject malformed saves'),
 budgets:cases('ai-long-campaign-fixes','returned real soldiers survive reserve production limits and current save continuation','returned reserve overflow does not block diplomacy without a net incoming shipment'),
 routes:cases('ai-long-campaign-fixes','factual query indexes preserve append order, live read flags, detached lists and reloads','a route forecast uses real friendly depots but never captured grain or nonexistent deliveries','candidate ordering measures the whole junction route before truncating targets'),
 diplomacy:[...cases('ai-long-campaign-fixes','signed future renewals suppress duplicate offers and reject a stale proposal before paying'),...cases('strategic-victory','automatic peace renewal yields to the unification direction but remains available during real recovery','peace with a selected main opponent has a real unification opportunity cost')],
 defense:cases('ai-long-campaign-fixes','border threat estimates reserve part of city troops while real incoming armies remain full threats'),
 transport:cases('ai-long-campaign-fixes','preparing a capture sends real troop transfers without counting their future presence'),
 formation:cases('ai-long-campaign-fixes','front cities prepare actual siege equipment before an attack plan exists'),
};
export const AI_DECISION_TESTS=Object.freeze(Object.fromEntries(Object.entries(behaviorTests).map(([key,tests])=>[key,[...tests,...longCampaignCases[key]||[]]])));
