// Type matchup chart
const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Water: 1, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
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

/**
 * Calculates type effectiveness multiplier
 * @param {string} attackType - The type of the attacking move
 * @param {string[]} defendTypes - The type(s) of the defending Pokemon
 * @returns {number} The multiplier (e.g., 0, 0.5, 1, 2, 4)
 */
export function getEffectiveness(attackType, defendTypes) {
  const safeDefendTypes = Array.isArray(defendTypes) ? defendTypes : (defendTypes ? [defendTypes] : []);
  if (safeDefendTypes.length === 0) return 1;
  let multiplier = 1;
  for (const defType of safeDefendTypes) {
    if (TYPE_CHART[attackType] && TYPE_CHART[attackType][defType] !== undefined) {
      multiplier *= TYPE_CHART[attackType][defType];
    }
  }
  return multiplier;
}

/**
 * Calculates offensive coverage details of a Pokemon against a list of opponent types
 * @param {string[]} myTypes - Types of the attacking Pokemon (used as STAB types)
 * @param {Array<{id: string, name: string, sprite: string, types: string[]}>} oppPokemonList - List of opponent Pokemon
 * @returns {Object} { score, details }
 */
export function getOffensiveCoverageDetails(myTypes, oppPokemonList) {
  const safeMyTypes = Array.isArray(myTypes) ? myTypes : (myTypes ? [myTypes] : []);
  let score = 0;
  let details = [];
  
  for (const opp of oppPokemonList) {
    let bestMultiplier = 1;
    let bestType = null;
    
    for (const myType of safeMyTypes) {
      const multiplier = getEffectiveness(myType, opp.types);
      if (multiplier > bestMultiplier) {
        bestMultiplier = multiplier;
        bestType = myType;
      }
    }
    
    if (bestMultiplier >= 2) {
      score++;
      
      const weakTypes = opp.types.filter(t => getEffectiveness(bestType, [t]) >= 2);
      
      details.push({
        targetId: opp.id,
        targetName: opp.name,
        targetSprite: opp.sprite,
        targetTypes: weakTypes.length > 0 ? weakTypes : opp.types,
        attackType: bestType,
        multiplier: bestMultiplier
      });
    }
  }
  
  return { score, details };
}

/**
 * Calculates defensive weakness details of a Pokemon against a list of opponent types
 * @param {string[]} myTypes - Types of the defending Pokemon
 * @param {Array<{id: string, name: string, sprite: string, types: string[]}>} oppPokemonList - List of opponent Pokemon
 * @returns {Object} { score, details }
 */
export function getDefensiveWeaknessDetails(myTypes, oppPokemonList) {
  const safeMyTypes = Array.isArray(myTypes) ? myTypes : (myTypes ? [myTypes] : []);
  let score = 0;
  let details = [];
  
  for (const opp of oppPokemonList) {
    let worstMultiplier = 1;
    let worstType = null;
    
    for (const oppType of opp.types) {
      const multiplier = getEffectiveness(oppType, myTypes);
      if (multiplier > worstMultiplier) {
        worstMultiplier = multiplier;
        worstType = oppType;
      }
    }
    
    if (worstMultiplier >= 2) {
      score++;
      details.push({
        attackerId: opp.id,
        attackerName: opp.name,
        attackerSprite: opp.sprite,
        targetTypes: opp.types,
        attackType: worstType,
        multiplier: worstMultiplier
      });
    }
  }
  
  return { score, details };
}

/**
 * Calculates defensive resistance details (which opponents we wall)
 * @param {string[]} myTypes - Types of our defending Pokemon
 * @param {Array<{id: string, name: string, sprite: string, types: string[]}>} oppPokemonList - List of opponent Pokemon
 * @returns {Object} { score, details }
 */
export function getDefensiveResistanceDetails(myTypes, oppPokemonList) {
  const safeMyTypes = Array.isArray(myTypes) ? myTypes : (myTypes ? [myTypes] : []);
  let score = 0;
  let details = [];
  
  for (const opp of oppPokemonList) {
    let worstMultiplier = -1;
    
    for (const oppType of opp.types) {
      const multiplier = getEffectiveness(oppType, myTypes);
      if (multiplier > worstMultiplier) {
        worstMultiplier = multiplier;
      }
    }
    
    const isWalled = worstMultiplier <= 0.5 && worstMultiplier >= 0;
    
    if (isWalled) {
      if (worstMultiplier === 0) score += 3;
      else if (worstMultiplier === 0.25) score += 2;
      else score += 1;
      
      for (const oppType of opp.types) {
        const multiplier = getEffectiveness(oppType, myTypes);
        details.push({
          targetId: opp.id + '-' + oppType,
          targetName: opp.name,
          targetSprite: opp.sprite,
          targetTypes: opp.types,
          attackType: oppType,
          multiplier: multiplier
        });
      }
    } else {
      // If not completely walled, still include 0x and 0.25x (Partial Immunities/Heavy Resists)
      for (const oppType of opp.types) {
        const multiplier = getEffectiveness(oppType, myTypes);
        if (multiplier === 0 || multiplier === 0.25) {
          score += (multiplier === 0 ? 2 : 1);
          details.push({
            targetId: opp.id + '-' + oppType,
            targetName: opp.name,
            targetSprite: opp.sprite,
            targetTypes: opp.types,
            attackType: oppType,
            multiplier: multiplier
          });
        }
      }
    }
  }
  
  return { score, details };
}
