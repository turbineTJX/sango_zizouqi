// AI priorities only; assignment eligibility, movement and illumination are shared.
export const STRATEGIC_SCOUTING_RULES = Object.freeze({
  maxAssignments: 2,
  minimumLocalWorkers: 1,
  frontierPriority: 80,
  planPriority: 200,
  unknownPriority: 80,
  agePriorityPerDay: 20,
  maximumAgePriority: 80
});
