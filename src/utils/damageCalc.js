/**
 * damageCalc.js
 * Precise Gen 6 Lv50 damage calculation engine
 *
 * Formula (each modifier step is floor'd):
 *   base = floor( floor(22 * power * atk / def / 50) + 2 )
 *   apply: spread → STAB → type → item
 *   then random roll 85~100/100
 */

import { getEffectiveness } from './typeUtils';
import { damageItems } from '../data/itemBoostData';
import { abilityBoosts } from '../data/abilityBoostData';
import { natureStatsMap } from '../data/natureData';
import moveFlagsData from '../data/moveFlags.json';

// ─── Stat Calculators ────────────────────────────────────────────────

export function calcHP(base, ev = 0, iv = 31) {
  return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * 50 / 100) + 50 + 10;
}

export function calcStat(base, ev = 0, natureMult = 1.0, iv = 31) {
  return Math.floor(
    (Math.floor((base * 2 + iv + Math.floor(ev / 4)) * 50 / 100) + 5) * natureMult
  );
}

export function getNatureMult(natureName, statLabel) {
  const info = natureStatsMap[natureName];
  if (!info) return 1.0;
  if (info.up === statLabel) return 1.1;
  if (info.down === statLabel) return 0.9;
  return 1.0;
}

export function calcSpeed(baseSpe, ev = 0, natureMult = 1.0, hasScarf = false, iv = 31) {
  const stat = calcStat(baseSpe, ev, natureMult, iv);
  return hasScarf ? Math.floor(stat * 1.5) : stat;
}

// ─── Move total power (multi-hit avg) ────────────────────────────────

export function getMoveTotalPower(info) {
  if (!info || !info.power) return 0;
  if (info.minHits && info.maxHits) {
    const avgHits = (info.minHits + info.maxHits) / 2;
    return info.power * avgHits;
  }
  return info.power;
}

// ─── Stat Stage Multipliers ──────────────────────────────────────────

export function getStatStageMult(stage = 0) {
  if (stage === 0) return 1.0;
  if (stage > 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

// ─── Damage Calculation ──────────────────────────────────────────────

/**
 * Compute damage range for a single move.
 * Returns { minDmg, maxDmg, minPct, maxPct, koMin, koMax, effectiveness, isImmune }
 */
export function calcDamageRange({
  power,
  moveType,
  damageClass,
  attackerAtk,
  defenderDef,
  defenderHP,
  attackerTypes = [],
  defenderTypes = [],
  abilityKo = '',
  itemName = '',
  isSpread = false,
  moveEngName = '',
  weather = 'none', // 'sun', 'rain', 'sand', 'hail', 'none'
  isReflect = false,
  isLightScreen = false,
  attackerStages = { atk: 0, spa: 0 },
  defenderStages = { def: 0, spd: 0 },
}) {
  if (!power || power <= 0 || !attackerAtk || !defenderDef || !defenderHP) return null;

  const normMove = moveType.charAt(0).toUpperCase() + moveType.slice(1).toLowerCase();
  const normDef = defenderTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

  const effectiveness = getEffectiveness(normMove, normDef);
  if (effectiveness === 0) {
    return { minDmg: 0, maxDmg: 0, minPct: 0, maxPct: 0, koMin: Infinity, koMax: Infinity, effectiveness: 0, isImmune: true };
  }

  const abilityMeta = abilityBoosts[abilityKo] || null;

  // ── Stat Stages ─────────────────────────────────────────────────────
  let finalAtk = attackerAtk;
  let finalDef = defenderDef;

  if (damageClass === 'physical') {
    finalAtk = Math.floor(finalAtk * getStatStageMult(attackerStages.atk));
    finalDef = Math.floor(finalDef * getStatStageMult(defenderStages.def));
  } else {
    finalAtk = Math.floor(finalAtk * getStatStageMult(attackerStages.spa));
    finalDef = Math.floor(finalDef * getStatStageMult(defenderStages.spd));
  }

  // Sandstorm SpD boost for Rock types
  if (weather === 'sand' && normDef.includes('Rock') && damageClass === 'special') {
    finalDef = Math.floor(finalDef * 1.5);
  }

  // ── STAB ───────────────────────────────────────────────────────────
  let stabMult = attackerTypes.some(t => t.toLowerCase() === moveType.toLowerCase()) ? 1.5 : 1.0;
  if (abilityMeta?.type === 'stab' && stabMult > 1) stabMult = abilityMeta.mult;

  // ── Skin ability / power ability ────────────────────────────────────
  let effectiveMoveType = moveType.toLowerCase();
  let abilityPowerMult = 1.0;

  if (abilityMeta?.type === 'skin' && effectiveMoveType === 'normal') {
    effectiveMoveType = abilityMeta.newType;
    abilityPowerMult *= abilityMeta.mult;
    stabMult = attackerTypes.some(t => t.toLowerCase() === effectiveMoveType) ? 1.5 : 1.0;
  } else if (abilityMeta?.type === 'power') {
    const cond = abilityMeta.condition;
    const flags = moveFlagsData[moveEngName] || {};
    let apply = false;
    if (cond === 'all') apply = true;
    else if (cond === 'contact' && flags.contact) apply = true;
    else if (cond === 'punch' && flags.punch) apply = true;
    else if (cond === 'bite' && flags.bite) apply = true;
    else if (cond === 'pulse' && flags.pulse) apply = true;
    else if (cond === 'power<=60' && power <= 60) apply = true;
    else if (cond.startsWith('type:')) {
      const tts = cond.split(':')[1].split(',');
      if (tts.includes(effectiveMoveType)) apply = true;
    }
    if (apply) abilityPowerMult *= abilityMeta.mult;
  }

  // ── Item ────────────────────────────────────────────────────────────
  let itemMult = 1.0;
  const itemMeta = damageItems[itemName];
  if (itemMeta) {
    let applyItem = false;
    if (itemMeta.type === 'all') applyItem = true;
    else if (itemMeta.type === 'physical' && damageClass === 'physical') applyItem = true;
    else if (itemMeta.type === 'special' && damageClass === 'special') applyItem = true;
    else if (itemMeta.type === effectiveMoveType) applyItem = true;
    if (applyItem) itemMult = itemMeta.mult;
  }

  const spreadMult = isSpread ? 0.75 : 1.0;
  const effectivePower = Math.floor(power * abilityPowerMult);

  // ── Base damage ─────────────────────────────────────────────────────
  const baseDmg = Math.floor(Math.floor(22 * effectivePower * finalAtk / finalDef / 50) + 2);

  // ── Apply modifiers (each floored) ──────────────────────────────────
  let dmg = baseDmg;

  // Weather modifier
  if (weather === 'sun') {
    if (effectiveMoveType === 'fire') dmg = Math.floor(dmg * 1.5);
    if (effectiveMoveType === 'water') dmg = Math.floor(dmg * 0.5);
  } else if (weather === 'rain') {
    if (effectiveMoveType === 'water') dmg = Math.floor(dmg * 1.5);
    if (effectiveMoveType === 'fire') dmg = Math.floor(dmg * 0.5);
  }

  // Screen modifiers (Double battles = 2/3)
  if (isReflect && damageClass === 'physical') {
    dmg = Math.floor(dmg * 2 / 3);
  } else if (isLightScreen && damageClass === 'special') {
    dmg = Math.floor(dmg * 2 / 3);
  }

  dmg = Math.floor(dmg * spreadMult);
  dmg = Math.floor(dmg * stabMult);
  dmg = Math.floor(dmg * effectiveness);
  dmg = Math.floor(dmg * itemMult);

  // ── Random rolls (85~100) ───────────────────────────────────────────
  const minDmg = Math.floor(dmg * 85 / 100);
  const maxDmg = Math.floor(dmg * 100 / 100);

  const minPct = (minDmg / defenderHP) * 100;
  const maxPct = (maxDmg / defenderHP) * 100;

  const koMin = maxPct >= 100 ? 1 : Math.ceil(100 / maxPct);
  const koMax = minPct > 0 ? Math.ceil(100 / minPct) : Infinity;

  let koProbability = 100;
  if (koMin !== koMax) {
    const rolls = [];
    for (let i = 85; i <= 100; i++) rolls.push(Math.floor(dmg * i / 100));

    if (koMin === 1) {
      let count = 0;
      for (const r of rolls) if (r >= defenderHP) count++;
      koProbability = (count / 16) * 100;
    } else if (koMin === 2) {
      let count = 0;
      for (const r1 of rolls) {
        for (const r2 of rolls) {
          if (r1 + r2 >= defenderHP) count++;
        }
      }
      koProbability = (count / 256) * 100;
    } else if (koMin === 3) {
      let count = 0;
      for (const r1 of rolls) {
        for (const r2 of rolls) {
          for (const r3 of rolls) {
            if (r1 + r2 + r3 >= defenderHP) count++;
          }
        }
      }
      koProbability = (count / 4096) * 100;
    } else {
      koProbability = 0;
    }
  }

  return { minDmg, maxDmg, minPct, maxPct, koMin, koMax, koProbability, effectiveness, isImmune: false };
}

/**
 * Returns KO badge label and color for display.
 * - 확1: guaranteed OHKO on min roll
 * - 난1: OHKO only on max roll
 * - 확2: guaranteed 2HKO on min roll
 * - 난2: 2HKO only on max roll
 * - 확3, 난3, 4타+
 */
export function getKOBadge(result) {
  if (!result || result.isImmune) return { label: '무효', color: '#64748b' };
  const { koMin, koMax, koProbability } = result;
  const probStr = koProbability > 0 && koProbability < 100 ? ` (${koProbability.toFixed(1)}%)` : '';
  if (koMin === 1 && koMax === 1) return { label: '확1', color: '#dc2626' };
  if (koMin === 1 && koMax > 1)   return { label: `난1${probStr}`, color: '#f97316' };
  if (koMax === 2 && koMin <= 2)  return { label: '확2', color: '#eab308' };
  if (koMin === 2)                return { label: `난2${probStr}`, color: '#3b82f6' };
  if (koMax === 3 && koMin <= 3)  return { label: '확3', color: '#64748b' };
  if (koMin === 3)                return { label: `난3${probStr}`, color: '#94a3b8' };
  return { label: `${koMax}타+`, color: '#94a3b8' };
}
