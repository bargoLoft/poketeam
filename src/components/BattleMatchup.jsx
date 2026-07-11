import { useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import DetailPanel from './DetailPanel';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { apiService } from '../services/apiService';
import { getMegaDataSync, fetchMegaData, megaForms } from '../utils/megaUtils';
import { calcHpLv50, calcStatLv50, convertAllStats } from '../utils/statCalc';
import { natureStatsMap, natureTranslations } from '../data/natureData';
import { getPokeApiTypeIconUrl, getTypeKo } from '../data/typeColors';
import { getDefensiveMultiplier } from '../data/typeMatchups';
import { MoveBox } from './MatchupMoveBox';
import TopAbilitiesBox from './TopAbilitiesBox';

// ── Helpers ──────────────────────────────────────────────────────────

function getChampEv(points) {
  return Math.max(0, (points || 0) * 8 - 4);
}

function getTopSamples(poke, partyBattleData) {
  if (!poke || !partyBattleData[poke.name]) return { topNatures: [], topStatPoints: [] };
  const pBattleData = partyBattleData[poke.name];
  if (!pBattleData.rows) return { topNatures: [], topStatPoints: [] };
  
  const topNatures = pBattleData.rows.filter(r => r.category === 'stat_alignment').sort((a,b)=>a.rank-b.rank).slice(0, 3);
  const topStatPoints = pBattleData.rows.filter(r => r.category === 'stat_points').sort((a,b)=>a.rank-b.rank).slice(0, 3);
  const topAbilities = pBattleData.rows.filter(r => r.category === 'ability').sort((a,b)=>a.rank-b.rank).slice(0, 3);
  return { topNatures, topStatPoints, topAbilities };
}

function MatchupTypeBox({ types, topAbilities, activeAbilityName }) {
  if (!types || types.length === 0) return null;
  const matchupGroups = { '4x': [], '2x': [], '0.5x': [], '0.25x': [], '0x': [] };
  
  const capTypes = types.map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
  const multipliers = getDefensiveMultiplier(capTypes);
  
  Object.entries(multipliers).forEach(([atk, mult]) => {
    const atkLower = atk.toLowerCase();
    if (mult === 4) matchupGroups['4x'].push(atkLower);
    else if (mult === 2) matchupGroups['2x'].push(atkLower);
    else if (mult === 0.5) matchupGroups['0.5x'].push(atkLower);
    else if (mult === 0.25) matchupGroups['0.25x'].push(atkLower);
    else if (mult === 0) matchupGroups['0x'].push(atkLower);
  });

  const renderGroup = (title, key, cssClass) => {
    return (
      <div className={`dp2-matchup-row ${cssClass}`} style={{ display: 'flex', alignItems: 'center', padding: '4px', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
        <div style={{ width: '32px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{title}</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {matchupGroups[key].length > 0 ? matchupGroups[key].map(t => (
            <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width:'24px', height:'24px'}} />
          )) : (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dp2-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="dp2-matchups-body" style={{ flex: 1 }}>
        {renderGroup('×4', '4x', 'dp2-row-4x')}
        {renderGroup('×2', '2x', 'dp2-row-2x')}
        {renderGroup('½', '0.5x', 'dp2-row-half')}
        {renderGroup('¼', '0.25x', 'dp2-row-quarter')}
        {renderGroup('×0', '0x', 'dp2-row-immune')}
      </div>
      
      <TopAbilitiesBox 
        topAbilities={topAbilities} 
        activeAbilityName={activeAbilityName} 
      />
    </div>
  );
}

function getDerivedData(poke, megaForm, partyBattleData, allPokemon, overrides = {}) {
  if (!poke || !partyBattleData) return null;
  const pData = allPokemon.find(p => p.name === poke.name);
  if (!pData || !pData.summary) return null;

  const rawStats = pData.summary.baseStats || {};
  let base;
  
  if (megaForm && getMegaDataSync(poke.name, megaForm)?.baseStats) {
    const mdStats = getMegaDataSync(poke.name, megaForm).baseStats;
    base = {
      hp: mdStats.hp,
      atk: mdStats.attack,
      def: mdStats.defense,
      spa: mdStats.sp_attack,
      spd: mdStats.sp_defense,
      spe: mdStats.speed
    };
  } else {
    base = convertAllStats(rawStats);
  }

  let { hp: baseHp, atk: baseAtk, def: baseDef, spa: baseSpa, spd: baseSpd, spe: baseSpe } = base;
  let types = pData.summary.types || [];

  if (megaForm) {
    const md = getMegaDataSync(poke.name, megaForm);
    if (md && md.types && md.types.length > 0) {
      types = md.types;
    }
  }

  const pBattleData = partyBattleData[poke.name] || {};
  let evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  let nature = 'Hardy';
  let itemName = '';
  let abilityKo = '';
  
  if (pBattleData.rows) {
    let topPoints = pBattleData.rows.filter(r => r.category === 'stat_points').sort((a,b)=>a.rank-b.rank);
    let topNatures = pBattleData.rows.filter(r => r.category === 'stat_alignment').sort((a,b)=>a.rank-b.rank);
    
    // basic mega heuristics
    const isX = megaForm === 'X' || megaForm === 'x';
    const isY = megaForm === 'Y' || megaForm === 'y';
    if (isX) {
      const physNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '공격');
      if (physNature) topNatures = [physNature, ...topNatures.filter(n => n !== physNature)];
      const physEv = topPoints.find(p => p.attack_points > 10);
      if (physEv) topPoints = [physEv, ...topPoints.filter(p => p !== physEv)];
    } else if (isY) {
      const spaNature = topNatures.find(n => natureStatsMap[n.name] && natureStatsMap[n.name].up === '특공');
      if (spaNature) topNatures = [spaNature, ...topNatures.filter(n => n !== spaNature)];
      const spaEv = topPoints.find(p => p.sp_atk_points > 10);
      if (spaEv) topPoints = [spaEv, ...topPoints.filter(p => p !== spaEv)];
    }
    
    if (topPoints.length > 0) {
      const sp = topPoints[0];
      evs = { hp: sp.hp_points||0, atk: sp.attack_points||0, def: sp.defense_points||0, spa: sp.sp_atk_points||0, spd: sp.sp_def_points||0, spe: sp.speed_points||0 };
      nature = topNatures.length > 0 ? topNatures[0].name : 'Hardy';
    }
    
    const topItems = pBattleData.rows.filter(r => r.category === 'held_item').sort((a,b)=>a.rank-b.rank);
    if (topItems.length > 0) itemName = topItems[0].name;
    
    const topAbilities = pBattleData.rows.filter(r => r.category === 'ability').sort((a,b)=>a.rank-b.rank);
    if (topAbilities.length > 0) abilityKo = topAbilities[0].name;
  }

  if (megaForm) {
    const md = getMegaDataSync(poke.name, megaForm);
    if (md && md.abilityEng) {
      const cachedAb = apiService._cache.abilities[md.abilityEng];
      if (cachedAb) abilityKo = cachedAb.name;
    }
  }

  // Apply Overrides
  if (overrides.evs) evs = { ...evs, ...overrides.evs };
  if (overrides.nature !== undefined) nature = overrides.nature;
  if (overrides.itemName !== undefined) itemName = overrides.itemName;

  const getNatureMult = (statId) => {
    const info = natureStatsMap[nature];
    if (!info) return 1.0;
    const statMap = { atk: '공격', def: '방어', spa: '특공', spd: '특방', spe: '스피드' };
    if (info.up === statMap[statId]) return 1.1;
    if (info.down === statMap[statId]) return 0.9;
    return 1.0;
  };

  const hp = calcHpLv50(baseHp, Math.max(0, evs.hp * 8 - 4));
  const atk = calcStatLv50(baseAtk, Math.max(0, evs.atk * 8 - 4), getNatureMult('atk'));
  const def = calcStatLv50(baseDef, Math.max(0, evs.def * 8 - 4), getNatureMult('def'));
  const spa = calcStatLv50(baseSpa, Math.max(0, evs.spa * 8 - 4), getNatureMult('spa'));
  const spd = calcStatLv50(baseSpd, Math.max(0, evs.spd * 8 - 4), getNatureMult('spd'));
  let spe = calcStatLv50(baseSpe, Math.max(0, evs.spe * 8 - 4), getNatureMult('spe'));
  
  if (itemName === '구애스카프' || itemName === 'Choice Scarf') spe = Math.floor(spe * 1.5);

  if (overrides.speedMods) {
    if (overrides.speedMods.tailwind) spe = Math.floor(spe * 2);
    if (overrides.speedMods.paralysis) spe = Math.floor(spe * 0.5);
    if (overrides.speedMods.rank > 0) spe = Math.floor(spe * ((2 + overrides.speedMods.rank) / 2));
    else if (overrides.speedMods.rank < 0) spe = Math.floor(spe * (2 / (2 - overrides.speedMods.rank)));
  }
  const physDur = Math.floor(hp * def / 0.411);
  const specDur = Math.floor(hp * spd / 0.411);

  return { hp, atk, def, spa, spd, spe, types, itemName, abilityKo, evs, nature, physDur, specDur };
}

function getSprite(p, megaForm) {
  if (megaForm) {
    const md = getMegaDataSync(p.name, megaForm);
    if (md?.spriteUrl) return md.spriteUrl;
  }
  return apiService.getSpriteUrl(p.name);
}

// ── Components ───────────────────────────────────────────────────────

function BenchSlot({ poke, mega, active, fainted, onClick, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const data = e.dataTransfer.getData('pokemon');
    if (data) onDrop && onDrop(JSON.parse(data));
  };
  const sprite = poke ? getSprite(poke, mega) : null;
  const name = poke ? getPokemonKo(poke.name) : null;
  const border = active ? '2px solid #22c55e' : dragOver ? '2px dashed #3b82f6' : '1px solid #e2e8f0';

  return (
    <div
      onClick={poke && !fainted ? onClick : undefined} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      style={{
        width: 64, height: 64, background: fainted ? '#f8fafc' : '#f1f5f9', border, borderRadius: 12, cursor: poke && !fainted ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
        opacity: fainted ? 0.4 : 1, filter: fainted ? 'grayscale(100%)' : 'none', flexShrink: 0
      }}
    >
      {sprite && <img src={sprite} alt={name} style={{ width: 48, height: 48, imageRendering: 'pixelated', objectFit: 'contain' }} />}
      {active && <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#22c55e', borderRadius: '50%', border: '2px solid white' }} />}
      {fainted && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.75rem' }}>✕</span>}
    </div>
  );
}

function SpeedBadge({ active, label, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '2px 6px',
        borderRadius: '8px',
        fontSize: '0.6rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        background: active ? color : '#f1f5f9',
        color: active ? '#ffffff' : '#94a3b8',
        border: `1px solid ${active ? color : '#e2e8f0'}`,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '36px'
      }}
    >
      {label}
    </div>
  );
}

function SpeedRankController({ rank, onChange }) {
  const [openDropdown, setOpenDropdown] = useState(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--glass-bg)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', width: '100%', justifyContent: 'center' }}>
      {/* Leftmost Dropdown: -3 to -6 */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpenDropdown(prev => prev === 'neg' ? null : 'neg')}
          style={{ width: '20px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: rank <= -3 ? '#3b82f6' : 'transparent', color: rank <= -3 ? '#fff' : '#cbd5e1', transition: 'all 0.15s ease' }}
        >
          {rank <= -3 ? rank : '3-'}
        </button>
        {openDropdown === 'neg' && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
            {[-3, -4, -5, -6].map(r => (
              <button key={r} onClick={() => { onChange(r); setOpenDropdown(null); }} style={{ width: '24px', height: '18px', fontSize: '0.55rem', fontWeight: 'bold', border: 'none', background: rank === r ? '#3b82f6' : 'transparent', color: rank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>{r}</button>
            ))}
          </div>
        )}
      </div>

      {/* Middle Buttons */}
      {[-2, -1, 0, 1, 2].map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          style={{ width: '20px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: rank === r ? (r > 0 ? '#ef4444' : r < 0 ? '#3b82f6' : '#64748b') : 'transparent', color: rank === r ? '#fff' : (r === 0 ? '#94a3b8' : '#cbd5e1'), transition: 'all 0.15s ease' }}
        >
          {r === 0 ? '-' : Math.abs(r)}
        </button>
      ))}

      {/* Rightmost Dropdown: +3 to +6 */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpenDropdown(prev => prev === 'pos' ? null : 'pos')}
          style={{ width: '20px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer', background: rank >= 3 ? '#ef4444' : 'transparent', color: rank >= 3 ? '#fff' : '#cbd5e1', transition: 'all 0.15s ease' }}
        >
          {rank >= 3 ? `+${rank}` : '3+'}
        </button>
        {openDropdown === 'pos' && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
            {[3, 4, 5, 6].map(r => (
              <button key={r} onClick={() => { onChange(r); setOpenDropdown(null); }} style={{ width: '24px', height: '18px', fontSize: '0.55rem', fontWeight: 'bold', border: 'none', background: rank === r ? '#ef4444' : 'transparent', color: rank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>+{r}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

const BattleMatchup = forwardRef(function BattleMatchup({ party, partyMegas, opponentParty, opponentPartyMegas, partyBattleData, allPokemon, battleFormat, setBattleFormat }, ref) {
  const [myBench, setMyBench] = useState([null, null, null]);
  const [oppBench, setOppBench] = useState([null, null, null]);
  const [myFieldIdx, setMyFieldIdx] = useState(0);
  const [oppFieldIdx, setOppFieldIdx] = useState(0);
  const [myFainted, setMyFainted] = useState([false, false, false]);
  const [oppFainted, setOppFainted] = useState([false, false, false]);
  
  const [myOverrides, setMyOverrides] = useState({});
  const [oppOverrides, setOppOverrides] = useState({});
  const [myMegaOverride, setMyMegaOverride] = useState(null);
  const [oppMegaOverride, setOppMegaOverride] = useState(null);

  const myActive = myBench[myFieldIdx];
  const oppActive = oppBench[oppFieldIdx];

  useEffect(() => { setMyOverrides({}); setMyMegaOverride(null); }, [myActive?.name]);
  useEffect(() => { setOppOverrides({}); setOppMegaOverride(null); }, [oppActive?.name]);

  useEffect(() => {
    const isPartyEmpty = party.every(p => p === null);
    if (isPartyEmpty) {
      setOppBench([null, null, null]);
    }
    setMyBench(prev => {
      const next = prev.map(p => (p && party.some(partyP => partyP?.name === p.name)) ? p : null);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [party]);

  useEffect(() => {
    const isOppEmpty = opponentParty.every(p => p === null);
    if (isOppEmpty) {
      setMyBench([null, null, null]);
    }
    setOppBench(prev => {
      const next = prev.map(p => (p && opponentParty.some(partyP => partyP?.name === p.name)) ? p : null);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [opponentParty]);

  useImperativeHandle(ref, () => ({
    addPokemon: (poke, side) => {
      if (!poke) return;
      if (side === 'my') {
        setMyBench(prev => {
          const next = [...prev];
          if (next.some(p => p?.name === poke.name)) return prev;
          const emptyIdx = next.findIndex(p => p === null);
          if (emptyIdx !== -1) {
            next[emptyIdx] = poke;
            if (next[myFieldIdx] === null) setMyFieldIdx(emptyIdx);
          } else {
            // Replace active
            next[myFieldIdx] = poke;
          }
          return next;
        });
      } else {
        setOppBench(prev => {
          const next = [...prev];
          if (next.some(p => p?.name === poke.name)) return prev;
          const emptyIdx = next.findIndex(p => p === null);
          if (emptyIdx !== -1) {
            next[emptyIdx] = poke;
            if (next[oppFieldIdx] === null) setOppFieldIdx(emptyIdx);
          } else {
            next[oppFieldIdx] = poke;
          }
          return next;
        });
      }
    }
  }));

  const toggleBench = useCallback((poke, side) => {
    if (!poke) return;
    if (side === 'my') {
      setMyBench(prev => {
        const next = [...prev];
        const existIdx = next.findIndex(p => p?.name === poke.name);
        if (existIdx !== -1) {
          next[existIdx] = null;
          if (myFieldIdx === existIdx) {
            const firstActive = next.findIndex(p => p !== null);
            setMyFieldIdx(firstActive !== -1 ? firstActive : 0);
          }
        } else {
          const emptyIdx = next.findIndex(p => p === null);
          if (emptyIdx !== -1) {
            next[emptyIdx] = poke;
            if (next[myFieldIdx] === null) setMyFieldIdx(emptyIdx);
          }
        }
        return next;
      });
    } else {
      setOppBench(prev => {
        const next = [...prev];
        const existIdx = next.findIndex(p => p?.name === poke.name);
        if (existIdx !== -1) {
          next[existIdx] = null;
          if (oppFieldIdx === existIdx) {
            const firstActive = next.findIndex(p => p !== null);
            setOppFieldIdx(firstActive !== -1 ? firstActive : 0);
          }
        } else {
          const emptyIdx = next.findIndex(p => p === null);
          if (emptyIdx !== -1) {
            next[emptyIdx] = poke;
            if (next[oppFieldIdx] === null) setOppFieldIdx(emptyIdx);
          }
        }
        return next;
      });
    }
  }, [myFieldIdx, oppFieldIdx]);
  
  const getMyMega = (poke) => {
    if (!poke) return null;
    return myMegaOverride === '' ? null : myMegaOverride;
  };
  
  const getOppMega = (poke) => {
    if (!poke) return null;
    return oppMegaOverride === '' ? null : oppMegaOverride;
  };

  const myActiveMega = getMyMega(myActive);
  const oppActiveMega = getOppMega(oppActive);

  const myDerived = getDerivedData(myActive, myActiveMega, partyBattleData, allPokemon, myOverrides);
  const oppDerived = getDerivedData(oppActive, oppActiveMega, partyBattleData, allPokemon, oppOverrides);

  const mySamples = getTopSamples(myActive, partyBattleData);
  const oppSamples = getTopSamples(oppActive, partyBattleData);

  const renderProfileWithSamples = (poke, derived, samples, overrides, setOverrides, activeMega, setMegaOverride, isOpponent) => {
    if (!poke || !derived) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8' }}>
          포켓몬 선택
        </div>
      );
    }

    const { topNatures, topStatPoints, topAbilities } = samples;
    
    return (
      <div style={{ flex: 1, display: 'flex', background: isOpponent ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: `2px solid ${isOpponent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`, overflow: 'hidden' }}>
        
        {/* Left Column: Profile Info & Natures/EVs */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
          
          {/* Top: Profile Info & Mega */}
          <div style={{ padding: '16px 12px 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            
            {/* Left: Image, Name, Types */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                <img src={getSprite(poke, activeMega)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
                {(megaForms[poke.name] && megaForms[poke.name].length > 0) && (
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-12px', display: 'flex', gap: '4px', zIndex: 10 }}>
                    {activeMega ? (
                      <button
                        onClick={() => setMegaOverride('')}
                        style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        title="일반 폼으로 전환"
                      >
                        <img src={apiService.getSpriteUrl(poke.name)} alt="base form" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#94a3b8', color: '#ffffff', borderRadius: '50%', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold' }}>🔄</span>
                      </button>
                    ) : null}
                    {(megaForms[poke.name] || []).filter(f => f !== activeMega).map(form => (
                      <button
                        key={form}
                        onClick={async () => {
                          const md = await fetchMegaData(poke.name, form);
                          if (md && md.abilityEng) {
                            await apiService.fetchAbilityInfo(md.abilityEng);
                          }
                          setMegaOverride(form);
                        }}
                        style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#ffffff', border: '1.5px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        title={`메가진화 ${form === 'mega' ? '' : form.toUpperCase()}`}
                      >
                        <img src={getSprite(poke, form)} alt={`mega-${form}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                        <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'var(--accent-primary)', color: '#ffffff', borderRadius: '50%', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 'bold' }}>{form === 'mega' ? '⚡' : form.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0', color: isOpponent ? '#b91c1c' : '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {activeMega ? `메가${getPokemonKo(poke.name)}${activeMega === 'x' || activeMega === 'y' ? activeMega.toUpperCase() : ''}` : getPokemonKo(poke.name)}
                </h2>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {derived.types.map(t => <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} style={{ width: 18, height: 18 }} />)}
                </div>
              </div>
            </div>

            {/* Right: Base Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px dashed #cbd5e1', paddingLeft: '20px' }}>
              {(() => {
                const mData = activeMega ? getMegaDataSync(poke.name, activeMega) : null;
                const rawStats = allPokemon.find(p => p.name === poke.name)?.summary?.baseStats || {};
                const converted = convertAllStats(rawStats);
                const bStats = mData?.baseStats || {
                  hp: converted.hp,
                  attack: converted.atk,
                  defense: converted.def,
                  sp_attack: converted.spa,
                  sp_defense: converted.spd,
                  speed: converted.spe
                };
                const labels = ['H', 'A', 'B', 'C', 'D', 'S'];
                const values = [bStats.hp, bStats.attack, bStats.defense, bStats.sp_attack, bStats.sp_defense, bStats.speed];
                const colors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                return labels.map((l, i) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1' }}>
                    <span style={{ width: '12px', color: colors[i] }}>{l}</span>
                    <span style={{ width: '24px', textAlign: 'right', color: '#475569' }}>{values[i]}</span>
                  </div>
                ));
              })()}
            </div>

          </div>

          {/* Bottom: Natures & EVs */}
          <div style={{ padding: '12px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', flex: 1, overflow: 'hidden' }}>
            {/* Natures */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#475569' }}>🧠 성격</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {topNatures.map((n, idx) => {
                  const translation = natureTranslations[n.name] || n.name;
                  const pct = parseFloat(n.percentage_value ?? n.percentage ?? 0) || 0;
                  const isSelected = derived.nature === n.name;
                  const info = natureStatsMap[n.name];
                  const bonusText = info ? `(${info.up}↑ ${info.down}↓)` : '';
                  return (
                    <div
                      key={idx}
                      onClick={() => setOverrides(prev => ({ ...prev, nature: n.name }))}
                      style={{
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        padding: '4px 6px', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        gap: '1px', fontSize: '0.6rem', flex: 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.55rem' }}>
                        <span style={{ color: isSelected ? '#0369a1' : 'var(--accent-primary)' }}>#{n.rank}</span>
                        <span style={{ color: '#64748b' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ color: isSelected ? '#0c4a6e' : '#0f172a', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {translation} <span style={{ color: '#64748b', fontSize: '0.5rem', fontWeight: 'normal' }}>{bonusText}</span>
                      </div>
                    </div>
                  );
                })}
                {topNatures.length === 0 && <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>}
              </div>
            </div>

            {/* EVs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#475569' }}>⚙️ 노력치</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {topStatPoints.map((sp, idx) => {
                  const pct = parseFloat(sp.percentage_value ?? sp.percentage ?? 0) || 0;
                  const raw = { hp: sp.hp_points || 0, atk: sp.attack_points || 0, def: sp.defense_points || 0, spa: sp.sp_atk_points || 0, spd: sp.sp_def_points || 0, spe: sp.speed_points || 0 };
                  const isSelected = Object.keys(raw).every(k => derived.evs[k] === raw[k]);
                  
                  const statKeys = [ { key: 'hp_points', label: 'H' }, { key: 'attack_points', label: 'A' }, { key: 'defense_points', label: 'B' }, { key: 'sp_atk_points', label: 'C' }, { key: 'sp_def_points', label: 'D' }, { key: 'speed_points', label: 'S' } ];
                  const evParts = [];
                  statKeys.forEach(sk => {
                    const val = sp[sk.key];
                    if (val) {
                      const isMax = val === 32;
                      evParts.push(<span key={sk.key} style={{ color: isSelected ? '#047857' : '#475569', fontWeight: isMax ? 'bold' : '500', marginRight: '3px' }}>{sk.label}{val}</span>);
                    }
                  });
                  const evNode = evParts.length > 0 ? evParts : <span style={{ color: '#94a3b8' }}>무진동</span>;
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setOverrides(prev => ({ ...prev, evs: raw }))}
                      style={{
                        background: isSelected ? '#d1fae5' : '#ffffff',
                        border: isSelected ? '1px solid #10b981' : '1px solid #e2e8f0',
                        padding: '4px 6px', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        gap: '1px', fontSize: '0.6rem', flex: 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.55rem' }}>
                        <span style={{ color: isSelected ? '#047857' : 'var(--accent-primary)' }}>#{sp.rank}</span>
                        <span style={{ color: '#64748b' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evNode}
                      </div>
                    </div>
                  );
                })}
                {topStatPoints.length === 0 && <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Defensive Matchups */}
        <div style={{ width: '45%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <MatchupTypeBox 
            types={derived.types} 
            topAbilities={topAbilities} 
            activeAbilityName={derived.abilityKo}
          />
        </div>
        
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ── Main Split ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '8px', gap: '12px' }}>
        
        {/* Center Content: Unified Layout */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
              {/* Header: Profiles and Speed Comparison */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                {/* My Profile */}
                {renderProfileWithSamples(myActive, myDerived, mySamples, myOverrides, setMyOverrides, myActiveMega, setMyMegaOverride, false)}

                {/* Speed & Bulk Comparison */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--glass-bg)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minWidth: '240px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>⚡ 스피드 & 🛡️ 내구 비교</h3>
                  {myDerived && oppDerived ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      
                      {/* Physical Bulk */}
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', textAlign: 'center' }}>물리 내구</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: myDerived.physDur > oppDerived.physDur ? '#3b82f6' : '#94a3b8' }}>{myDerived.physDur.toLocaleString()}</span>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                              <div style={{ width: `${(myDerived.physDur/Math.max(myDerived.physDur, oppDerived.physDur))*100}%`, height: '100%', background: myDerived.physDur >= oppDerived.physDur ? '#3b82f6' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 'bold' }}>VS</div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${(oppDerived.physDur/Math.max(myDerived.physDur, oppDerived.physDur))*100}%`, height: '100%', background: oppDerived.physDur >= myDerived.physDur ? '#3b82f6' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: oppDerived.physDur > myDerived.physDur ? '#3b82f6' : '#94a3b8' }}>{oppDerived.physDur.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Special Bulk */}
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', textAlign: 'center' }}>특수 내구</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: myDerived.specDur > oppDerived.specDur ? '#a855f7' : '#94a3b8' }}>{myDerived.specDur.toLocaleString()}</span>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                              <div style={{ width: `${(myDerived.specDur/Math.max(myDerived.specDur, oppDerived.specDur))*100}%`, height: '100%', background: myDerived.specDur >= oppDerived.specDur ? '#a855f7' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 'bold' }}>VS</div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${(oppDerived.specDur/Math.max(myDerived.specDur, oppDerived.specDur))*100}%`, height: '100%', background: oppDerived.specDur >= myDerived.specDur ? '#a855f7' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: oppDerived.specDur > myDerived.specDur ? '#a855f7' : '#94a3b8' }}>{oppDerived.specDur.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Speed */}
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', textAlign: 'center' }}>스피드</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: myDerived.spe > oppDerived.spe ? '#22c55e' : '#94a3b8' }}>{myDerived.spe.toLocaleString()}</span>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                              <div style={{ width: `${(myDerived.spe/Math.max(myDerived.spe, oppDerived.spe))*100}%`, height: '100%', background: myDerived.spe >= oppDerived.spe ? '#22c55e' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 'bold' }}>VS</div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '70px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${(oppDerived.spe/Math.max(myDerived.spe, oppDerived.spe))*100}%`, height: '100%', background: oppDerived.spe >= myDerived.spe ? '#ef4444' : '#cbd5e1', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: oppDerived.spe > myDerived.spe ? '#ef4444' : '#94a3b8' }}>{oppDerived.spe.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Speed Modifiers Toggles */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textAlign: 'center', marginBottom: '4px' }}>스피드 보정</div>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'stretch' }}>
                          
                          {/* My Modifiers */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <SpeedBadge active={(myOverrides.itemName !== undefined ? myOverrides.itemName : myDerived.itemName) === 'Choice Scarf' || (myOverrides.itemName !== undefined ? myOverrides.itemName : myDerived.itemName) === '구애스카프'} onClick={() => setMyOverrides(prev => ({ ...prev, itemName: ((prev.itemName !== undefined ? prev.itemName : myDerived.itemName) === 'Choice Scarf' || (prev.itemName !== undefined ? prev.itemName : myDerived.itemName) === '구애스카프') ? '' : 'Choice Scarf' }))} label="스카프" color="#3b82f6" />
                              <SpeedBadge active={myOverrides.speedMods?.tailwind} onClick={() => setMyOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), tailwind: !(prev.speedMods?.tailwind) } }))} label="순풍" color="#10b981" />
                              <SpeedBadge active={myOverrides.speedMods?.paralysis} onClick={() => setMyOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), paralysis: !(prev.speedMods?.paralysis) } }))} label="마비" color="#eab308" />
                            </div>
                            <SpeedRankController rank={myOverrides.speedMods?.rank || 0} onChange={(val) => setMyOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), rank: val } }))} />
                          </div>

                          <div style={{ width: '1px', background: '#e2e8f0' }} />

                          {/* Opp Modifiers */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <SpeedBadge active={(oppOverrides.itemName !== undefined ? oppOverrides.itemName : oppDerived.itemName) === 'Choice Scarf' || (oppOverrides.itemName !== undefined ? oppOverrides.itemName : oppDerived.itemName) === '구애스카프'} onClick={() => setOppOverrides(prev => ({ ...prev, itemName: ((prev.itemName !== undefined ? prev.itemName : oppDerived.itemName) === 'Choice Scarf' || (prev.itemName !== undefined ? prev.itemName : oppDerived.itemName) === '구애스카프') ? '' : 'Choice Scarf' }))} label="스카프" color="#ef4444" />
                              <SpeedBadge active={oppOverrides.speedMods?.tailwind} onClick={() => setOppOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), tailwind: !(prev.speedMods?.tailwind) } }))} label="순풍" color="#10b981" />
                              <SpeedBadge active={oppOverrides.speedMods?.paralysis} onClick={() => setOppOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), paralysis: !(prev.speedMods?.paralysis) } }))} label="마비" color="#eab308" />
                            </div>
                            <SpeedRankController rank={oppOverrides.speedMods?.rank || 0} onChange={(val) => setOppOverrides(prev => ({ ...prev, speedMods: { ...(prev.speedMods||{}), rank: val } }))} />
                          </div>

                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>비교 불가</div>
                  )}
                </div>
                {/* Opp Profile */}
                {renderProfileWithSamples(oppActive, oppDerived, oppSamples, oppOverrides, setOppOverrides, oppActiveMega, setOppMegaOverride, true)}
              </div>

              {/* Moves Row (Damage Calc) */}
              <div style={{ display: 'flex', gap: '20px' }}>
                {myDerived ? <MoveBox pokemon={myActive} derived={myDerived} oppDerived={oppDerived} partyBattleData={partyBattleData} /> : <div style={{flex: 1}} />}
                {oppDerived ? <MoveBox pokemon={oppActive} derived={oppDerived} oppDerived={myDerived} partyBattleData={partyBattleData} /> : <div style={{flex: 1}} />}
              </div>
        </div>

        {/* Bottom Horizontal Benches */}
        <div style={{ display: 'flex', flexShrink: 0, gap: '20px', background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          
          {/* Left Bench (My Party) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: '20px', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>내 파티</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
                {party.map((p, i) => {
                  if (!p) return null;
                  const isSel = myBench.some(b => b?.name === p.name);
                  return (
                    <button key={i} onClick={() => toggleBench(p, 'my')} style={{ flexShrink: 0, width: 56, height: 56, padding: 0, borderRadius: 12, background: isSel ? '#dcfce7' : '#f1f5f9', border: isSel ? '2px solid #22c55e' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.1s' }}>
                      <img src={getSprite(p, partyMegas?.[i])} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ width: '2px', height: '100%', background: '#e2e8f0', margin: '0 4px', borderRadius: '2px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                {myBench.map((b, i) => (
                   <BenchSlot key={`mb${i}`} poke={b} mega={b ? getMyMega(b) : null} active={i === myFieldIdx && b} fainted={myFainted[i]} onClick={() => { if (!myFainted[i] && b) setMyFieldIdx(i); }} onDrop={(d) => {}} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Bench (Opponent Party) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>상대 파티</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: 'row-reverse' }}>
              <div style={{ display: 'flex', gap: '8px', flex: 1, overflowX: 'auto', paddingBottom: '4px', flexDirection: 'row-reverse' }}>
                {opponentParty.map((p, i) => {
                  if (!p) return null;
                  const isSel = oppBench.some(b => b?.name === p.name);
                  return (
                    <button key={i} onClick={() => toggleBench(p, 'opp')} style={{ flexShrink: 0, width: 56, height: 56, padding: 0, borderRadius: 12, background: isSel ? '#fee2e2' : '#f1f5f9', border: isSel ? '2px solid #ef4444' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.1s' }}>
                      <img src={getSprite(p, opponentPartyMegas?.[i])} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ width: '2px', height: '100%', background: '#e2e8f0', margin: '0 4px', borderRadius: '2px' }} />
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'row-reverse' }}>
                {oppBench.map((b, i) => (
                   <BenchSlot key={`ob${i}`} poke={b} mega={b ? getOppMega(b) : null} active={i === oppFieldIdx && b} fainted={oppFainted[i]} onClick={() => { if (!oppFainted[i] && b) setOppFieldIdx(i); }} onDrop={(d) => {}} />
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
});

export default BattleMatchup;
