export type SearchMetric = {
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  trend: number;
};

export function calculateOpportunityScore(metric: SearchMetric): number {
  let score = 0;

  if (metric.position >= 4 && metric.position <= 10) {
    score += 35;
  } else if (metric.position > 10 && metric.position <= 20) {
    score += 25;
  } else if (metric.position > 20 && metric.position <= 30) {
    score += 10;
  }

  if (metric.impressions >= 20000) {
    score += 25;
  } else if (metric.impressions >= 10000) {
    score += 20;
  } else if (metric.impressions >= 5000) {
    score += 15;
  } else if (metric.impressions >= 1000) {
    score += 8;
  }

  if (metric.ctr < 1) {
    score += 20;
  } else if (metric.ctr < 2) {
    score += 15;
  } else if (metric.ctr < 3) {
    score += 10;
  }

  if (metric.trend <= -20) {
    score += 20;
  } else if (metric.trend <= -10) {
    score += 15;
  } else if (metric.trend < 0) {
    score += 8;
  }

  return Math.min(score, 100);
}