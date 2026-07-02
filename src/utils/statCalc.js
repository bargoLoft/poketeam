/**
 * Stat calculation utilities for Pokémon Team Builder
 * 
 * The championsbattledata API returns Level 50 stats (0 EV, Neutral Nature)
 * instead of True Base Stats.
 * 
 * Lv50 stat formula:
 *   HP:    floor((Base*2 + 31) / 2) + 60
 *   Other: floor((Base*2 + 31) / 2) + 5
 * 
 * Simplified reverse:
 *   HP:    Lv50 - 75  (since 31/2 ≈ 15, 60+15=75)
 *   Other: Lv50 - 20  (since 31/2 ≈ 15, 5+15=20)
 */

/**
 * Convert a Lv50 stat value (0 EV, Neutral) back to approximate base stat.
 * Uses the simplified reverse: HP → val - 75, Others → val - 20
 */
export function lv50ToBase(lv50Val, isHp = false) {
  if (!lv50Val || lv50Val <= 0) return isHp ? 1 : 1;
  const offset = isHp ? 75 : 20;
  return Math.max(1, lv50Val - offset);
}

/**
 * Convert all Lv50 stats to base stats.
 * @param {object} lv50Stats - { hp, attack, defense, sp_attack, sp_defense, speed }
 * @returns {object} - { hp, atk, def, spa, spd, spe, total }
 */
export function convertAllStats(lv50Stats) {
  if (!lv50Stats) return { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1, total: 6 };
  
  const hp  = lv50ToBase(lv50Stats.hp, true);
  const atk = lv50ToBase(lv50Stats.attack, false);
  const def = lv50ToBase(lv50Stats.defense, false);
  const spa = lv50ToBase(lv50Stats.sp_attack, false);
  const spd = lv50ToBase(lv50Stats.sp_defense, false);
  const spe = lv50ToBase(lv50Stats.speed, false);
  const total = hp + atk + def + spa + spd + spe;
  
  return { hp, atk, def, spa, spd, spe, total };
}

/**
 * Forward Lv50 stat calculation from base stat.
 */
export const calcHpLv50 = (base, ev = 0) =>
  Math.floor((base * 2 + 31 + ev / 4) / 2) + 60;

export const calcStatLv50 = (base, ev = 0, natureMult = 1.0) =>
  Math.floor((Math.floor((base * 2 + 31 + ev / 4) / 2) + 5) * natureMult);
