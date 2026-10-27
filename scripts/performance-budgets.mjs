// Acceptance limits are declared before measuring. They do not change game rules
// or discard history. A slow sample remains a failure with its evidence retained.
export const PERFORMANCE_BUDGETS=Object.freeze({
 android:{coldStartMs:15000,importMs:15000,saveCommitMs:4000,serializeMs:4000,validateMs:15000,historyMs:1000,dayMs:15000,mapFrameP95Ms:250},
 desktop:{serializeMs:2000,validateMs:6000,historyMs:500,dayMs:8000,mapFrameP95Ms:50},
 growth:{averageBytesPerDay:250*1024,maxSaveBytes:256*1024*1024}
});
