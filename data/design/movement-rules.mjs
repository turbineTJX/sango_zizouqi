// Authoritative design data. Runtime imports this table.
export const MOVEMENT_RULES = {
  "scouting": {"speed":105,"minimumDays":1,"baseMaximumDays":2,"intellectExtension":4,"randomSpread":2},
  "vision": {"city":22,"army":20,"armyIntellectPerPoint":0.12,"scout":36,"unknownDefense":6000,"unknownGateHp":15000},
  "distance": {
    "minimum": 30,
    "coordinateScale": 0.5
  },
  "roadVariants": {
    "main": {
      "offset": 0,
      "names": {
        "land": "官道",
        "mountain": "山道",
        "water": "水路"
      },
      "costFactors": {
        "land": 1,
        "mountain": 1.5,
        "water": 1.15
      }
    }
  },
  "army": {
    "speedByTroop": {
      "spear": 7,
      "halberd": 6,
      "cavalry": 10.5,
      "archer": 7,
      "crossbow": 7,
      "siege": 4,
      "ram": 4,
      "tower": 4,
      "ship": 6,
      "qingzhou": 7,
      "baier": 7,
      "rattan": 6,
      "greatHalberd": 6,
      "tigerCavalry": 10.5,
      "whiteHorse": 10.5,
      "longbow": 7,
      "heavyRam": 4,
      "mengchong": 6,
      "louShip": 6,
      "fightingShip": 6
    },
    "command": {
      "base": 0.85,
      "perPoint": 0.003
    },
    "morale": {
      "base": 0.75,
      "perPoint": 0.003125
    },
    "hunger": [
      {
        "minimum": 3,
        "inclusive": true,
        "penalty": 0.3
      },
      {
        "minimum": 1,
        "inclusive": true,
        "penalty": 0.2
      },
      {
        "minimum": 0,
        "inclusive": false,
        "penalty": 0.1
      }
    ]
  },
  "personnel": {
    "light": 70,
    "transport": 100
  }
};
