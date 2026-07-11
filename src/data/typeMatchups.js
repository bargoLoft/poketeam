// 방어 상성 계수 (해당 타입이 공격받을 때)
// 1: 보통, 2: 약점, 0.5: 반감, 0: 무효
export const defensiveMatchups = {
  Normal: { Fighting: 2, Ghost: 0 },
  Fire: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 },
  Water: { Electric: 2, Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Electric: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 },
  Grass: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0.5 },
  Ice: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
  Fighting: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 },
  Poison: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 },
  Ground: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 },
  Flying: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 },
  Psychic: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 },
  Bug: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 },
  Rock: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 },
  Ghost: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 },
  Dragon: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5 },
  Dark: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 },
  Steel: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 },
  Fairy: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

// 특정 타입 조합의 방어 배율 계산
export function getDefensiveMultiplier(types) {
  const safeTypes = Array.isArray(types) ? types : (types ? [types] : []);
  const allTypes = Object.keys(defensiveMatchups);
  const multipliers = {};
  
  allTypes.forEach(attackType => {
    let mult = 1;
    safeTypes.forEach(defType => {
      if (defensiveMatchups[defType] && defensiveMatchups[defType][attackType] !== undefined) {
        mult *= defensiveMatchups[defType][attackType];
      }
    });
    multipliers[attackType] = mult;
  });
  
  return multipliers;
}

// 공격 상성 계수 (해당 타입으로 공격할 때)
export const offensiveMatchups = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

// 공격 타입이 어떤 타입을 찌를 수 있는지(2배 이상) 반환
export function getOffensiveCoverage(attackTypes) {
  const allTypes = Object.keys(offensiveMatchups);
  const coverage = {};
  
  allTypes.forEach(defType => {
    let maxMult = 1;
    attackTypes.forEach(atkType => {
      if (offensiveMatchups[atkType]) {
        const mult = offensiveMatchups[atkType][defType] !== undefined ? offensiveMatchups[atkType][defType] : 1;
        if (mult > maxMult) maxMult = mult;
      }
    });
    coverage[defType] = maxMult;
  });
  
  return coverage;
}

// Moves to Type mapping (for sub-weapons)
// This is a basic map of common moves to their types.
export const moveTypeMap = {
  "Earthquake": "Ground", "Earth Power": "Ground", "High Horsepower": "Ground",
  "Close Combat": "Fighting", "Aura Sphere": "Fighting", "Sacred Sword": "Fighting", "Drain Punch": "Fighting", "Body Press": "Fighting",
  "Ice Beam": "Ice", "Ice Spinner": "Ice", "Icicle Crash": "Ice", "Blizzard": "Ice",
  "Thunderbolt": "Electric", "Wild Charge": "Electric", "Volt Switch": "Electric", "Thunder": "Electric", "Electroweb": "Electric",
  "Flamethrower": "Fire", "Heat Wave": "Fire", "Flare Blitz": "Fire", "Fire Punch": "Fire", "Overheat": "Fire", "Armor Cannon": "Fire",
  "Hydro Pump": "Water", "Surf": "Water", "Liquidation": "Water", "Waterfall": "Water", "Aqua Jet": "Water",
  "Shadow Ball": "Ghost", "Shadow Claw": "Ghost", "Poltergeist": "Ghost", "Phantom Force": "Ghost", "Rage Fist": "Ghost",
  "Play Rough": "Fairy", "Moonblast": "Fairy", "Dazzling Gleam": "Fairy",
  "Dark Pulse": "Dark", "Knock Off": "Dark", "Sucker Punch": "Dark", "Crunch": "Dark", "Foul Play": "Dark", "Kowtow Cleave": "Dark",
  "Psychic": "Psychic", "Psyshock": "Psychic", "Zen Headbutt": "Psychic", "Expanding Force": "Psychic",
  "Sludge Bomb": "Poison", "Poison Jab": "Poison", "Gunk Shot": "Poison", "Sludge Wave": "Poison", "Mortal Spin": "Poison",
  "Rock Slide": "Rock", "Stone Edge": "Rock", "Rock Tomb": "Rock", "Meteor Beam": "Rock", "Salt Cure": "Rock",
  "U-turn": "Bug", "First Impression": "Bug", "Pollen Puff": "Bug",
  "Flash Cannon": "Steel", "Iron Head": "Steel", "Heavy Slam": "Steel", "Bullet Punch": "Steel", "Make It Rain": "Steel",
  "Energy Ball": "Grass", "Wood Hammer": "Grass", "Leaf Storm": "Grass", "Giga Drain": "Grass", "Flower Trick": "Grass", "Ivy Cudgel": "Grass",
  "Dragon Claw": "Dragon", "Draco Meteor": "Dragon", "Dragon Pulse": "Dragon", "Outrage": "Dragon", "Dragon Darts": "Dragon", "Glaive Rush": "Dragon",
  "Brave Bird": "Flying", "Hurricane": "Flying", "Air Slash": "Flying", "Acrobatics": "Flying", "Bleakwind Storm": "Flying",
  "Extreme Speed": "Normal", "Double-Edge": "Normal", "Hyper Voice": "Normal", "Fake Out": "Normal", "Facade": "Normal"
};
