// Authoritative shared aftermath rules. Battle capture rates confirmed 2026-10-30.
export const OFFICER_FATE_RULES=Object.freeze({
 deathChance:.02,
 captureChance:Object.freeze({field:.01,siege:.05,elimination:.30,transport:.33}),
 woundedCaptureRate:.25,
 noHomeWaitDays:31,
 ransom:Object.freeze({base:300,perHighestStat:5}),
});
