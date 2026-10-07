// Authoritative shared economy; players and AI use the same income and costs.
export const ECONOMY_RULES = {
  "budget": {"days": 10, "goldReserve": 500, "grainReserve": 0, "maxReserve": 1000000, "criticalFoodDays": 3},
  "income": {
    "gold": {
      "base": 100,
      "perCommerce": 100
    },
    "grain": {
      "base": 300,
      "perFarm": 770
    },
    "manpower": {
      "base": 100,
      "perBarracks": 294
    },
    "governorPoliticsDivisor": 500
  },
  // Rounded normal sustained-demand coverage, not an executable market quote.
  // Forming spends money + reserves; only formed soldiers consume rations.
  "value": {"gold": 1, "grain": 0.13, "manpower": 0.34},
  "work": {"base": 0.7, "abilityDivisor": 150, "constructionSetbackShare": 0.5},
  "development": {
    "economicBuildings": ["commerce", "farm", "barracks"],
    "localLevels": {"small": 2, "large": 3, "rich": 6, "infrastructure": 5},
    "richCities": ["xuchang", "luoyang", "ye", "town-18", "town-23", "town-30", "town-31", "town-40"],
    "metropolitanMax": 12,
    "externalLevels": {
      "city": {"commerce": 2, "farm": 2, "barracks": 2, "other": 3},
      "gate": {"commerce": 1, "farm": 0, "barracks": 2, "other": 3},
      "port": {"commerce": 3, "farm": 1, "barracks": 1, "other": 3}
    },
    "workValueBase": 100,
    "workValuePerLevel": 50,
    "foodForecastSafety": 0.9,
    "stockSupportDays": 60
  },
  "maintenance": {
    "goldPerThousandTroops": 0,
    "woundedGoldFactor": 0.5
  },
  "recruitment": {
    "reserveCost": 0,
    "reserveTargetBase": 10000,
    "reserveTargetTroopShare": 0.35
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
    "cityTroopTarget": 4500,
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
