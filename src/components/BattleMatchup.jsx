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
  
  const topNatures = pBattleData.rows.filter(r => r.category === 'stat_alignment').sort((a,b)=>a.rank-b.rank).slice(0, 5);
  const topStatPoints = pBattleData.rows.filter(r => r.category === 'stat_points').sort((a,b)=>a.rank-b.rank).slice(0, 10);
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
    const arr = matchupGroups[key];
    const hasOverflow = arr.length > 5;
    
    return (
      <div className={`dp2-matchup-row ${cssClass}`} style={{ display: 'flex', alignItems: 'center', padding: '4px', gap: '8px', borderBottom: '1px solid rgba(0,0,0,0.03)', height: '32px' }}>
        <div style={{ width: '28px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>{title}</div>
        <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <div className="dp2-no-scrollbar" style={{ 
            display: 'flex', gap: '4px', flexWrap: 'nowrap', alignItems: 'center', height: '100%', 
            overflowX: 'auto', width: '100%', paddingRight: hasOverflow ? '16px' : '0',
            maskImage: hasOverflow ? 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)' : 'none',
            WebkitMaskImage: hasOverflow ? 'linear-gradient(to right, black calc(100% - 16px), transparent 100%)' : 'none'
          }}>
            {arr.length > 0 ? (
              arr.map(t => (
                <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width:'22px', height:'22px', flexShrink: 0}} />
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dp2-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px' }}>
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

  return { hp, atk, def, spa, spd, spe, types, itemName, abilityKo, evs, nature, physDur, specDur, baseStats: base };
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--glass-bg)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', justifyContent: 'center' }}>
      <button
        onClick={() => onChange(Math.max(-6, rank - 1))}
        style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: rank > -6 ? '#64748b' : '#cbd5e1', transition: 'all 0.15s ease' }}
        disabled={rank <= -6}
      >
        {"<"}
      </button>
      <div style={{ width: '24px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: rank > 0 ? '#ef4444' : rank < 0 ? '#3b82f6' : '#64748b' }}>
        {rank > 0 ? `+${rank}` : rank === 0 ? '-' : rank}
      </div>
      <button
        onClick={() => onChange(Math.min(6, rank + 1))}
        style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: rank < 6 ? '#64748b' : '#cbd5e1', transition: 'all 0.15s ease' }}
        disabled={rank >= 6}
      >
        {">"}
      </button>
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
            setOppFieldIdx(emptyIdx); // Auto-set active when picking opponent
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

  const myRequired = Math.min(3, party.filter(Boolean).length);
  const oppRequired = Math.min(1, opponentParty.filter(Boolean).length);
  const isSelectionMode = myBench.filter(Boolean).length < myRequired || oppBench.filter(Boolean).length < oppRequired;

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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)', minWidth: 0 }}>
          
          {/* Top: Profile Info & Mega */}
          <div style={{ padding: '4px 0', display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            
            {/* Left: Image, Name, Types */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px' }}>
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: 0, margin: 0, lineHeight: 1 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0', padding: '0', lineHeight: '1', color: isOpponent ? '#b91c1c' : '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {(() => {
                    const rawName = activeMega ? `메가${getPokemonKo(poke.name)}${activeMega === 'x' || activeMega === 'y' ? activeMega.toUpperCase() : ''}` : getPokemonKo(poke.name);
                    return rawName.length > 6 ? rawName.slice(0, 6) : rawName;
                  })()}
                </h2>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {derived.types.map(t => <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} style={{ width: 18, height: 18 }} />)}
                </div>
              </div>
            </div>
            
            {/* Right: Base Stats */}
            <div style={{ width: '50px', flexShrink: 0, paddingBottom: '2px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.65rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#ff5959', fontWeight: 'bold', width: '10px' }}>H</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.hp}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#f59e0b', fontWeight: 'bold', width: '10px' }}>A</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.atk}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#facc15', fontWeight: 'bold', width: '10px' }}>B</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.def}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#3b82f6', fontWeight: 'bold', width: '10px' }}>C</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.spa}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#10b981', fontWeight: 'bold', width: '10px' }}>D</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.spd}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: '#ec4899', fontWeight: 'bold', width: '10px' }}>S</span><span style={{ fontWeight: 'bold', color: '#1e293b' }}>{derived.baseStats.spe}</span></div>
            </div>

          </div>

          {/* Bottom: Natures & EVs */}
          <div style={{ padding: '4px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', flex: 1, overflow: 'hidden' }}>
            {/* Natures */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, width: '50%' }}>
              {/* Removed Nature Title */}
              <div className="dp2-no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '2px', maxHeight: '142px' }}>
                {topNatures.map((n, idx) => {
                  const translation = natureTranslations[n.name] || n.name;
                  const pct = parseFloat(n.percentage_value ?? n.percentage ?? 0) || 0;
                  const isSelected = derived.nature === n.name;
                  const info = natureStatsMap[n.name];
                  const statToLetter = { '공격': 'A', '방어': 'B', '특공': 'C', '특방': 'D', '스피드': 'S' };
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setOverrides(prev => ({ ...prev, nature: n.name }))}
                      style={{
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        padding: '6px', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 'bold', fontSize: '0.65rem' }}>
                        <span style={{ color: isSelected ? '#0369a1' : 'var(--accent-primary)' }}>#{n.rank}</span>
                        <span style={{ color: isSelected ? '#0c4a6e' : '#0f172a' }}>{translation}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', fontSize: '0.65rem' }}>
                          {info ? (
                            <>
                              <span style={{color: '#ef4444', fontWeight: 'bold'}}>{info.up}</span>
                              <span style={{color: '#3b82f6', fontWeight: 'bold'}}>{info.down}</span>
                            </>
                          ) : (
                            <span style={{color: '#94a3b8', fontWeight: 'bold'}}>무보정</span>
                          )}
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 'bold' }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                  );
                })}
                {topNatures.length === 0 && <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>데이터 없음</div>}
              </div>
            </div>

            {/* EVs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, width: '50%' }}>
              {/* Removed EV Title */}
              <div className="dp2-no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '2px', maxHeight: '142px' }}>
                {topStatPoints.map((sp, idx) => {
                  const pct = parseFloat(sp.percentage_value ?? sp.percentage ?? 0) || 0;
                  const raw = { hp: sp.hp_points || 0, atk: sp.attack_points || 0, def: sp.defense_points || 0, spa: sp.sp_atk_points || 0, spd: sp.sp_def_points || 0, spe: sp.speed_points || 0 };
                  const isSelected = Object.keys(raw).every(k => derived.evs[k] === raw[k]);
                  
                  const statKeys = [ { key: 'hp_points', label: 'H' }, { key: 'attack_points', label: 'A' }, { key: 'defense_points', label: 'B' }, { key: 'sp_atk_points', label: 'C' }, { key: 'sp_def_points', label: 'D' }, { key: 'speed_points', label: 'S' } ];
                  
                  const activeStats = statKeys
                    .map(sk => ({ ...sk, val: sp[sk.key] || 0 }))
                    .filter(sk => sk.val > 0)
                    .sort((a, b) => b.val - a.val);

                  const renderPart = (sk) => {
                    let color = '#eab308';
                    if (sk.val >= 30) color = '#ef4444';
                    else if (sk.val < 10) color = '#94a3b8';
                    
                    const isMax = sk.val >= 30;
                    return <span key={sk.key} style={{ color: color, fontWeight: isMax ? 'bold' : '500', marginRight: '3px' }}>{sk.label}{sk.val}</span>;
                  };

                  const top2 = activeStats.slice(0, 2).map(renderPart);
                  const rest = activeStats.slice(2).map(renderPart);

                  const topRowNode = top2.length > 0 ? top2 : <span style={{ color: '#94a3b8' }}>무보정</span>;
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setOverrides(prev => ({ ...prev, evs: raw }))}
                      style={{
                        background: isSelected ? '#d1fae5' : '#ffffff',
                        border: isSelected ? '1px solid #10b981' : '1px solid #e2e8f0',
                        padding: '6px', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 'bold', fontSize: '0.65rem' }}>
                        <span style={{ color: isSelected ? '#047857' : 'var(--accent-primary)' }}>#{sp.rank}</span>
                        <div style={{ display: 'flex', gap: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {topRowNode}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '2px', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rest}
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 'bold' }}>{Math.round(pct)}%</span>
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
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '0', gap: '4px' }}>
        
        {/* Center Content: Unified Layout */}
        {isSelectionMode ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto', background: 'white', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>배틀 선출</h2>
            <div style={{ display: 'flex', gap: '48px', width: '100%', maxWidth: '800px', justifyContent: 'center' }}>
              
              {/* My Selection */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#3b82f6' }}>내 파티 선출 ({myBench.filter(Boolean).length} / {myRequired})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {party.map((p, i) => {
                    if (!p) return null;
                    const isSel = myBench.some(b => b?.name === p.name);
                    const selIdx = myBench.findIndex(b => b?.name === p.name);
                    return (
                      <div key={i} onClick={() => toggleBench(p, 'my')} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '16px', background: isSel ? '#eff6ff' : '#f8fafc', border: isSel ? '3px solid #3b82f6' : '2px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        <img src={getSprite(p)} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                        {isSel && <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', border: '2px solid white' }}>{selIdx + 1}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ width: '2px', background: '#e2e8f0' }} />

              {/* Opponent Selection */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ef4444' }}>상대 선발 예측 ({oppBench.filter(Boolean).length} / {oppRequired})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {opponentParty.map((p, i) => {
                    if (!p) return null;
                    const isSel = oppBench.some(b => b?.name === p.name);
                    return (
                      <div key={i} onClick={() => toggleBench(p, 'opp')} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '16px', background: isSel ? '#fef2f2' : '#f8fafc', border: isSel ? '3px solid #ef4444' : '2px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        <img src={getSprite(p)} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                        {isSel && <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', background: '#ef4444', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', border: '2px solid white' }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
              {/* Header: Profiles and Speed Comparison */}
              <div className="dp2-matchup-container" style={{ display: 'flex', gap: '4px', padding: '0 4px', alignItems: 'stretch' }}>
                {/* My Profile */}
                <div className="dp2-matchup-side">
                  {renderProfileWithSamples(myActive, myDerived, mySamples, myOverrides, setMyOverrides, myActiveMega, setMyMegaOverride, false)}
                </div>

                {/* Speed & Bulk Comparison */}
                <div className="dp2-matchup-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--glass-bg)', padding: '16px 4px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minWidth: '160px' }}>
                  {/* Removed Title */}
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
                        {/* Removed Speed Modifiers Title */}
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
                <div className="dp2-matchup-side">
                  {renderProfileWithSamples(oppActive, oppDerived, oppSamples, oppOverrides, setOppOverrides, oppActiveMega, setOppMegaOverride, true)}
                </div>
              </div>

              {/* Moves Row (Damage Calc) */}
              <div className="dp2-matchup-container" style={{ display: 'flex', gap: '4px', padding: '0 4px' }}>
                <div className="dp2-matchup-side">
                  {myDerived ? <MoveBox pokemon={myActive} derived={myDerived} oppDerived={oppDerived} partyBattleData={partyBattleData} megaForm={myActiveMega} /> : <div style={{flex: 1}} />}
                </div>
                <div className="dp2-matchup-side">
                  {oppDerived ? <MoveBox pokemon={oppActive} derived={oppDerived} oppDerived={myDerived} partyBattleData={partyBattleData} megaForm={oppActiveMega} /> : <div style={{flex: 1}} />}
                </div>
              </div>
        </div>
        )}

        {/* Bottom Horizontal Benches */}
        {!isSelectionMode && (
          <div className="dp2-matchup-container" style={{ display: 'flex', flexShrink: 0, gap: '8px', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {/* Left Bench (My Party) */}
            <div className="dp2-matchup-side" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: '20px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {myBench.map((b, i) => {
                     if (!b) return null; 
                     return <BenchSlot key={`mb${i}`} poke={b} mega={b ? getMyMega(b) : null} active={i === myFieldIdx} fainted={myFainted[i]} onClick={() => { if (!myFainted[i] && b) setMyFieldIdx(i); }} onDrop={(d) => {}} />
                  })}
                </div>
              </div>
            </div>

            {/* Right Bench (Opponent Party) */}
            <div className="dp2-matchup-side" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexDirection: 'row-reverse' }}>
                
                {/* 5 unrevealed */}
                <div style={{ display: 'flex', gap: '8px', flex: 1, overflowX: 'auto', paddingBottom: '4px', flexDirection: 'row-reverse' }}>
                  {opponentParty.map((p, i) => {
                    if (!p) return null;
                    const isSel = oppBench.some(b => b?.name === p.name);
                    if (isSel) return null; // Already revealed

                    return (
                      <button key={i} onClick={() => toggleBench(p, 'opp')} style={{ flexShrink: 0, width: 56, height: 56, padding: 0, borderRadius: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.1s' }}>
                        <img src={getSprite(p, opponentPartyMegas?.[i])} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                      </button>
                    );
                  })}
                </div>
                
                <div style={{ width: '2px', height: '100%', background: '#e2e8f0', margin: '0 4px', borderRadius: '2px' }} />
                
                {/* Revealed Bench */}
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'row' }}>
                  {oppBench.map((b, i) => {
                     if (!b) return null; 
                     return <BenchSlot key={`ob${i}`} poke={b} mega={b ? getOppMega(b) : null} active={i === oppFieldIdx} fainted={oppFainted[i]} onClick={() => { if (!oppFainted[i] && b) setOppFieldIdx(i); }} onDrop={(d) => {}} />
                  })}
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
});

export default BattleMatchup;
