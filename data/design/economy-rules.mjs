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
    "economicWorkersPerDirection": 3,
    "offensive": {
      "maxWoundedShare": 0.2,
      "homeFoodDays": 10,
      "lossFactor": 0.3,
      "lossPerPoint": 80,
      "grainPerPoint": 100,
      "goldPerPoint": 50,
      "dayCost": 4,
      "workPerPoint": 100,
      "maxEstimateError": 0.6,
      "judgmentLeadershipWeight": 0.5,
      "counterattackWeight": 0.5,
      "securityPowerPerPoint": 250,
      "securityValueCap": 80,
      "objectiveValues": {"city": 110, "gate": 80, "port": 50},
      "styles": {
        "bold": {"minimumValue": 10, "economicWeight": 0.9, "militaryWeight": 1.15, "ratio": 1.2, "reserve": 0.5, "patience": 30},
        "balanced": {"minimumValue": 25, "economicWeight": 1, "militaryWeight": 1, "ratio": 1.3, "reserve": 0.55, "patience": 40},
        "cautious": {"minimumValue": 40, "economicWeight": 1.15, "militaryWeight": 0.9, "ratio": 1.45, "reserve": 0.65, "patience": 45}
      }
    }
  }
};
