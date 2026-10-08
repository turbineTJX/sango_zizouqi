// Authoritative shared economy; players and AI use the same income and costs.
export const ECONOMY_RULES = {
  "income": {
    "gold": {
      "base": 320,
      "perCommerce": 320
    },
    "grain": {
      "base": 1800,
      "perFarm": 1400
    },
    "manpower": {
      "base": 800,
      "perBarracks": 800
    },
    "governorPoliticsDivisor": 500
  },
  "capacity": {
    "grainBase": 10000,
    "grainPerGranary": 10000,
    "manpowerMax": 30000,
    "recruitmentBase": 2000,
    "recruitmentPerBarracks": 1000
  },
  "ai": {
    "foodReserveDays": 20,
    "recruitReserveDays": 10,
    "economicWorkersPerDirection": 3
  }
};
