// Authoritative design data. Edit here; no generated overview edits.
export const MOVEMENT_RULES = {
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
      "spear": 28,
      "halberd": 24,
      "cavalry": 42,
      "archer": 28,
      "crossbow": 28,
      "siege": 16,
      "ram": 16,
      "tower": 16,
      "ship": 24
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
    "transport": 100,
    "travelerMultiplier": 1.15,
    "transporterMultiplier": 1.2
  }
};
