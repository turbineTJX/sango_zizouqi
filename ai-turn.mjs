// Strategic choices share the player's ten-day planning boundary. Daily
// simulation executes saved orders without invoking a new policy.
export const isAITurnStart=s=>!!s.campaign&&((s.campaign.day-1)%10===0||s.campaign.day===s.campaign.startDay)&&s.campaign.phase==='planning'&&!s.finished;
