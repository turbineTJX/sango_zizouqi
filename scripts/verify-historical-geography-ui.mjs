process.env.WATERWAY_REVIEW_CASE='dongting-bank,poyang-branch,xiangyang-bank,chaohu-ruxu,taihang-pass,yangping-pass,hangu-pass';
process.env.WATERWAY_REVIEW_OUTPUT='outputs/historical-geography-20261108/ui';
await import('./verify-waterway-placement-ui.mjs');
