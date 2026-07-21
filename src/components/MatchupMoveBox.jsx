import { useState, useEffect } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { apiService } from '../services/apiService';
import { getMoveTotalPower, calcDamageRange, getKOBadge } from '../utils/damageCalc';
import { abilityBoosts } from '../data/abilityBoostData';
import { damageItems } from '../data/itemBoostData';
import moveFlagsData from '../data/moveFlags.json';
import { getPokemonKo } from '../data/pokemonNamesKo';

const getMoveNotes = (info) => {
  const notes = [];
  if (info.drain > 0) notes.push({ text: `흡수${info.drain}%`, color: '#22c55e' });
  if (info.drain < 0) notes.push({ text: `반동${Math.abs(info.drain)}%`, color: '#ef4444' });
  if (info.healing > 0) notes.push({ text: `회복${info.healing}%`, color: '#22c55e' });
  
  const customNotes = {
    '역린': { text: '기술고정', color: '#b91c1c' },
    '꽃잎무춤': { text: '기술고정', color: '#b91c1c' },
    '암석봉인': { text: '상대 속도↓', color: '#f97316' },
    '얼어붙은바람': { text: '상대 속도↓', color: '#3b82f6' },
    '땅고르기': { text: '상대 속도↓', color: '#f59e0b' },
    '스케일샷': { text: '방↓ / 속↑', color: '#3b82f6' },
    '인파이트': { text: '방/특방↓', color: '#ef4444' },
    '엄청난힘': { text: '공/방↓', color: '#ef4444' },
    '드래곤테일': { text: '강제교체', color: '#8b5cf6' },
    '날려버리기': { text: '강제교체', color: '#8b5cf6' },
    '울부짖기': { text: '강제교체', color: '#8b5cf6' },
    '볼트체인지': { text: '명중 후 교체', color: '#8b5cf6' },
    '유턴': { text: '명중 후 교체', color: '#8b5cf6' },
    '퀵턴': { text: '명중 후 교체', color: '#8b5cf6' },
    '바톤터치': { text: '랭업 인계 후 교체', color: '#8b5cf6' },
    '막말내뱉기': { text: '상대 공/특공↓ 후 교체', color: '#8b5cf6' },
    '탁쳐서떨구기': { text: '도구해제(위력↑)', color: '#3f6212' },
    '속이다': { text: '풀죽음(첫턴)', color: '#ca8a04' },
    '신속': { text: '우선도+2', color: '#0ea5e9' },
    '스텔스록': { text: '스텔스록', color: '#78350f' },
    '독압정': { text: '독압정', color: '#a855f7' },
    '압정뿌리기': { text: '압정뿌리기', color: '#f59e0b' },
    '끈적끈적네트': { text: '끈적네트', color: '#854d0e' },
    '대타출동': { text: '대타출동(HP25%)', color: '#166534' },
    '방어': { text: '방어', color: '#1e40af' },
    '판별': { text: '방어', color: '#1e40af' },
    '도발': { text: '도발', color: '#991b1b' },
    '앵콜': { text: '앵콜', color: '#9d174d' },
    '용의춤': { text: '공/속 1랭↑', color: '#1e3a8a' },
    '나비춤': { text: '특공/특방/속 1랭↑', color: '#1e3a8a' },
    '껍질깨기': { text: 'ACS 2랭↑ BD 1랭↓', color: '#991b1b' },
    '하품': { text: '졸음(다음턴 수면)', color: '#475569' },
    '사슬묶기': { text: '기술봉쇄', color: '#b91c1c' },
    '트릭': { text: '도구교환', color: '#475569' },
    '길동무': { text: '길동무', color: '#0f172a' },
  };

  if (customNotes[info.name]) {
    notes.push(customNotes[info.name]);
  } else {
    if (info.category === 'force-switch') notes.push({ text: '강제교체', color: '#8b5cf6' });
    if (info.statChanges && info.statChanges.length > 0) {
      info.statChanges.forEach(sc => {
        const statMap = { 'attack': '공', 'defense': '방', 'special-attack': '특공', 'special-defense': '특방', 'speed': '속' };
        const label = statMap[sc.stat] || sc.stat;
        const absChange = Math.abs(sc.change);
        const rankStr = absChange > 1 ? `${absChange}랭` : '';
        const arrow = sc.change > 0 ? `${rankStr}↑` : `${rankStr}↓`;
        const chanceStr = info.statChance > 0 && info.statChance < 100 ? ` ${info.statChance}%` : '';
        notes.push({ text: `${label}${arrow}${chanceStr}`, color: sc.change > 0 ? '#3b82f6' : '#f97316' });
      });
    }
    if (info.ailment && info.ailment !== 'none') {
      const ailMap = { 
        'paralysis': { text: '마비', color: '#eab308' }, 
        'burn': { text: '화상', color: '#ef4444' }, 
        'freeze': { text: '얼음', color: '#06b6d4' }, 
        'poison': { text: '독', color: '#a855f7' }, 
        'sleep': { text: '수면', color: '#64748b' }, 
        'confusion': { text: '혼란', color: '#ec4899' }, 
        'leech-seed': { text: '씨뿌리기', color: '#22c55e' } 
      };
      const ailMeta = ailMap[info.ailment];
      if (ailMeta) {
        const chanceStr = info.ailmentChance > 0 && info.ailmentChance < 100 ? ` ${info.ailmentChance}%` : '';
        notes.push({ text: `${ailMeta.text}${chanceStr}`, color: ailMeta.color });
      }
    }
  }
  return notes;
};


export function MoveBox({ pokemon, derived, oppDerived, partyBattleData, megaForm }) {
  const [moveDetails, setMoveDetails] = useState({});
  const [moves, setMoves] = useState([]);
  const [offenseRank, setOffenseRank] = useState(0);
  const [openRankDropdown, setOpenRankDropdown] = useState(null);
  
  const [abilityToggled, setAbilityToggled] = useState(false);
  const [itemToggled, setItemToggled] = useState(false);

  const [translatedAbilityKo, setTranslatedAbilityKo] = useState('');
  const [translatedItemKo, setTranslatedItemKo] = useState('');

  useEffect(() => {
    if (derived?.abilityKo) {
      apiService.fetchAbilityInfo(derived.abilityKo).then(res => {
        setTranslatedAbilityKo(res?.name || derived.abilityKo);
      });
    } else setTranslatedAbilityKo('');
    
    if (derived?.itemName) {
      apiService.fetchItemInfo(derived.itemName).then(res => {
        setTranslatedItemKo(res?.name || derived.itemName);
      });
    } else setTranslatedItemKo('');
  }, [derived?.abilityKo, derived?.itemName]);

  useEffect(() => {
    if (derived && pokemon && partyBattleData) {
      if (megaForm) {
        setAbilityToggled(true);
      } else {
        const topAbils = partyBattleData[pokemon.name]?.rows?.filter(r => r.category === 'ability').sort((a,b)=>a.rank-b.rank);
        setAbilityToggled(topAbils && topAbils.length > 0 && topAbils[0].name === derived.abilityKo);
      }
      
      const topItems = partyBattleData[pokemon.name]?.rows?.filter(r => r.category === 'held_item').sort((a,b)=>a.rank-b.rank);
      setItemToggled(topItems && topItems.length > 0 && topItems[0].name === derived.itemName);
    }
  }, [derived?.abilityKo, derived?.itemName, pokemon?.name, partyBattleData, megaForm]);

  useEffect(() => {
    if (!pokemon || !partyBattleData) {
      setMoves([]);
      return;
    }
    const bData = partyBattleData[pokemon.name] || {};
    let allMoves = (bData.rows || [])
      .filter(r => r.category === 'move' && (r.percentage_value ?? parseFloat(r.percentage)) >= 1)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10);

    const megaXYMoves = {
      charizard: [
        'flare-blitz', 'outrage', 'dragon-claw', 'flame-charge', 'thunder-punch', 'earthquake', 'dragon-dance', 'roost', 'swords-dance', 'will-o-wisp',
        'flamethrower', 'fire-blast', 'solar-beam', 'focus-blast', 'air-slash', 'weather-ball', 'tailwind', 'protect', 'overheat'
      ],
      mewtwo: [
        'zen-headbutt', 'close-combat', 'ice-punch', 'earthquake', 'poison-jab', 'bulk-up', 'taunt', 'recover', 'drain-punch', 'stone-edge',
        'psystrike', 'ice-beam', 'fire-blast', 'focus-blast', 'shadow-ball', 'aura-sphere', 'calm-mind', 'protect'
      ],
      raichu: [
        'volt-tackle', 'fake-out', 'brick-break', 'thunder-punch', 'wild-charge', 'nuzzle', 'play-rough', 'quick-attack', 'iron-tail', 'dig',
        'thunderbolt', 'focus-blast', 'surf', 'grass-knot', 'hidden-power', 'volt-switch', 'nasty-plot', 'protect', 'encore', 'substitute'
      ]
    };

    let learnableMovesRaw = megaXYMoves[pokemon.name.toLowerCase()] || [];
    if (learnableMovesRaw.length > 0 && megaForm) {
      if (megaForm === 'x') {
        learnableMovesRaw = learnableMovesRaw.slice(0, 10);
      } else if (megaForm === 'y') {
        learnableMovesRaw = learnableMovesRaw.slice(10);
      } else {
        learnableMovesRaw = [];
      }
    } else {
      learnableMovesRaw = [];
    }

    if (learnableMovesRaw.length > 0) {
      const allApiMoves = (bData.rows || []).filter(r => r.category === 'move');
      const extraMoves = learnableMovesRaw.map(m => {
        const normalizedName = m.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const apiMatch = allApiMoves.find(r => r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === normalizedName);
        return {
          name: m,
          category: 'move',
          percentage: apiMatch ? apiMatch.percentage : 0,
          percentage_value: apiMatch ? apiMatch.percentage_value : 0,
          rank: -1
        };
      });
      const existingNames = new Set(extraMoves.map(m => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
      const remainingApiMoves = allMoves.filter(m => !existingNames.has(m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
      allMoves = [...extraMoves, ...remainingApiMoves].slice(0, 10);
    }
    setMoves(allMoves);

    const loadDetails = async () => {
      const detailsMap = {};
      await Promise.all(allMoves.map(async (m) => {
        const info = await apiService.fetchMoveInfo(m.name);
        detailsMap[m.name] = info;
      }));
      setMoveDetails(detailsMap);
    };
    loadDetails();
  }, [pokemon, partyBattleData, megaForm]);

  if (!pokemon) return <div className="dp2-section" style={{ flex: 1 }}><h3 className="dp2-section-title">기술폭</h3><div style={{padding:'12px', textAlign:'center', color:'#94a3b8'}}>선택된 포켓몬 없음</div></div>;

  const calcBadges = [];
  if (derived) {
    const natureMap = { 'Adamant': '고집', 'Jolly': '명랑', 'Modest': '조심', 'Timid': '겁쟁이', 'Brave': '용감', 'Quiet': '냉정', 'Bold': '대담', 'Impish': '장난꾸러기', 'Calm': '차분', 'Careful': '신중' };
    const natureKo = natureMap[derived.nature] || derived.nature;
    if (natureKo) calcBadges.push({ text: natureKo, color: '#f59e0b' });
    
    if (derived.evs?.atk > 0) calcBadges.push({ text: `A${derived.evs.atk}`, color: '#ef4444' });
    if (derived.evs?.spa > 0) calcBadges.push({ text: `C${derived.evs.spa}`, color: '#3b82f6' });
  }

  const hasAbilityBoost = !!abilityBoosts[translatedAbilityKo];
  const hasItemBoost = !!damageItems[translatedItemKo];

  return (
    <div className="dp2-section" style={{ flex: 1, overflow: 'visible' }}>
      <h3 className="dp2-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          주요 기술
          {(calcBadges.length > 0 || hasAbilityBoost || hasItemBoost) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
              {calcBadges.map((badge, idx) => (
                <span key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '2px',
                  fontSize: '0.65rem', padding: '2px 6px',
                  background: `${badge.color}15`, color: badge.color,
                  borderRadius: '4px', border: `1px solid ${badge.color}40`,
                  fontWeight: 'bold', whiteSpace: 'nowrap'
                }}>
                  {badge.text}
                </span>
              ))}
              {hasAbilityBoost && (
                <button
                  onClick={() => setAbilityToggled(!abilityToggled)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '2px',
                    fontSize: '0.65rem', padding: '2px 6px',
                    background: abilityToggled ? '#10b98115' : '#f1f5f9', color: abilityToggled ? '#10b981' : '#94a3b8',
                    borderRadius: '4px', border: `1px solid ${abilityToggled ? '#10b98140' : '#e2e8f0'}`,
                    fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'pointer'
                  }}
                  title="결정력에 영향을 주는 특성입니다. 클릭하여 켜고 끌 수 있습니다."
                >
                  {translatedAbilityKo}
                </button>
              )}
              {hasItemBoost && (
                <button
                  onClick={() => setItemToggled(!itemToggled)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '2px',
                    fontSize: '0.65rem', padding: '2px 6px',
                    background: itemToggled ? '#8b5cf615' : '#f1f5f9', color: itemToggled ? '#8b5cf6' : '#94a3b8',
                    borderRadius: '4px', border: `1px solid ${itemToggled ? '#8b5cf640' : '#e2e8f0'}`,
                    fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'pointer'
                  }}
                  title="결정력에 영향을 주는 도구입니다. 클릭하여 켜고 끌 수 있습니다."
                >
                  {translatedItemKo}
                </button>
              )}
            </div>
          )}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>랭크</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--glass-bg)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={() => setOffenseRank(prev => Math.max(-6, prev - 1))} style={{ padding: '0 4px', fontSize: '0.75rem', fontWeight: 'bold', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>&lt;</button>
            <div style={{ width: '16px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: offenseRank > 0 ? '#ef4444' : offenseRank < 0 ? '#3b82f6' : '#64748b' }}>{offenseRank}</div>
            <button onClick={() => setOffenseRank(prev => Math.min(6, prev + 1))} style={{ padding: '0 4px', fontSize: '0.75rem', fontWeight: 'bold', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>&gt;</button>
          </div>
        </div>
      </h3>
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <table className="dp2-table dp2-move-table">
          <thead>
            <tr>
              <th style={{width:'24px', paddingLeft: '4px'}}></th>
              <th style={{width:'18%'}}>기술명</th>
              <th style={{width:'10%'}}>위력</th>
              <th style={{width:'40%'}}>데미지 예측</th>
              <th style={{width:'7%'}}>명중</th>
              <th style={{width:'25%'}}>부가효과</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredMoves = moves.filter(m => {
                const info = moveDetails[m.name] || {};
                if (!info.damageClass || info.damageClass === 'status') return true;
                const isPhysicalMega = megaForm === 'x' || derived?.abilityKo === '천하장사' || derived?.abilityKo === 'Huge Power' || derived?.abilityKo === '순수한힘';
                const isSpecialMega = megaForm === 'y';
                if (isPhysicalMega && info.damageClass === 'special') return false;
                if (isSpecialMega && info.damageClass === 'physical') return false;
                return true;
              });
              
              const paddingRows = Math.max(0, 10 - filteredMoves.length);

              return (
                <>
                  {filteredMoves.map((m, idx) => {
              const info = moveDetails[m.name] || {};
              const pct = (m.percentage_value ?? parseFloat(m.percentage)) || 0;
              const pctStyle = { background: pct >= 50 ? '#fee2e2' : pct >= 20 ? '#fef3c7' : '#f1f5f9', color: pct >= 50 ? '#dc2626' : pct >= 20 ? '#d97706' : '#475569' };
              const isStab = derived?.types.some(t => t.toLowerCase() === (info.type || '').toLowerCase());
              const nameColor = typeColors[info.type] || '#1e293b';
              const isPhysicalMove = info.damageClass === 'physical';
              
              let powerColor = '#64748b';
              if (info.power >= 120) powerColor = '#dc2626';
              else if (info.power >= 100) powerColor = '#f97316';
              else if (info.power >= 80) powerColor = '#eab308';
              else if (info.power >= 60) powerColor = '#3b82f6';
              else if (info.power >= 40) powerColor = '#22c55e';

              // Calc Damage and Power Rating
              let matchupDamage = null;
              let powerRating = 0;
              if (derived && oppDerived && info.power > 0) {
                const pTypes = derived.types.map(t => t.toLowerCase());
                
                let stat = isPhysicalMove ? derived.atk : derived.spa;
                if (offenseRank > 0) stat = Math.floor(stat * ((2 + offenseRank) / 2));
                else if (offenseRank < 0) stat = Math.floor(stat * (2 / (2 - offenseRank)));
                
                // Power Rating Calc
                const totalPower = getMoveTotalPower(info);
                let moveTypeForCalc = (info.type || '').toLowerCase();
                let finalPowerMult = 1.0;
                let stabMult = derived.types.some(t => t.toLowerCase() === moveTypeForCalc) ? 1.5 : 1.0;
                
                if (abilityToggled) {
                  const abilityMeta = abilityBoosts[translatedAbilityKo];
                  if (abilityMeta) {
                    if (abilityMeta.type === 'stab' && stabMult > 1) stabMult = abilityMeta.mult;
                    else if (abilityMeta.type === 'skin' && moveTypeForCalc === 'normal') {
                       moveTypeForCalc = abilityMeta.newType;
                       finalPowerMult *= abilityMeta.mult;
                       if (derived.types.some(t => t.toLowerCase() === moveTypeForCalc)) stabMult = 1.5;
                    } else if (abilityMeta.type === 'power') {
                       const cond = abilityMeta.condition;
                       const flags = info.englishName ? (moveFlagsData[info.englishName] || {}) : {};
                       let applyBoost = false;
                       if (cond === 'all') applyBoost = true;
                       else if (cond === 'contact' && flags.contact) applyBoost = true;
                       else if (cond === 'punch' && flags.punch) applyBoost = true;
                       else if (cond === 'bite' && flags.bite) applyBoost = true;
                       else if (cond === 'pulse' && flags.pulse) applyBoost = true;
                       else if (cond === 'sound' && flags.sound) applyBoost = true;
                       else if (cond === 'secondary' && flags.secondary) applyBoost = true;
                       else if (cond === 'power<=60' && info.power <= 60) applyBoost = true;
                       else if (cond.startsWith('type:')) {
                         const targetTypes = cond.split(':')[1].split(',');
                         if (targetTypes.includes(moveTypeForCalc)) applyBoost = true;
                       }
                       if (applyBoost) finalPowerMult *= abilityMeta.mult;
                    } else if (abilityMeta.type === 'stat') {
                       if (abilityMeta.stat === 'atk' && isPhysicalMove) stat = Math.floor(stat * abilityMeta.mult);
                       else if (abilityMeta.stat === 'spa' && !isPhysicalMove) stat = Math.floor(stat * abilityMeta.mult);
                    }
                  }
                }

                const effectivePower = Math.floor(totalPower * finalPowerMult);
                let baseDmg = Math.floor(effectivePower * stat * stabMult);
                
                let itemMult = 1.0;
                if (itemToggled) {
                  const itemMeta = damageItems[translatedItemKo];
                  if (itemMeta) {
                    if (itemMeta.type === 'all') itemMult = itemMeta.mult;
                    else if (itemMeta.type === 'physical' && isPhysicalMove) itemMult = itemMeta.mult;
                    else if (itemMeta.type === 'special' && !isPhysicalMove) itemMult = itemMeta.mult;
                    else if (itemMeta.type === moveTypeForCalc) itemMult = itemMeta.mult;
                  }
                }
                
                powerRating = Math.floor(baseDmg * itemMult);

                matchupDamage = calcDamageRange({
                  power: getMoveTotalPower(info),
                  moveType: info.type,
                  damageClass: info.damageClass,
                  attackerAtk: stat, // Wait, stat already has abilityMeta.stat applied here, but calcDamageRange also applies it! 
                  defenderDef: isPhysicalMove ? oppDerived.def : oppDerived.spd,
                  defenderHP: oppDerived.hp,
                  attackerTypes: derived.types,
                  defenderTypes: oppDerived.types,
                  abilityKo: abilityToggled ? translatedAbilityKo : '',
                  itemName: itemToggled ? translatedItemKo : '',
                  moveEngName: info.englishName
                });
              }

              return (
                <tr key={idx} style={{ height: '46px' }}>
                  <td>
                    <img src={getPokeApiTypeIconUrl(info.type)} alt={info.type} title={getTypeKo(info.type)} className="dp2-move-type-icon" />
                  </td>
                  <td>
                    <div className="dp2-move-name-cell">
                      <span className={`dp2-move-name ${isStab ? 'dp2-stab' : ''}`} style={{ color: nameColor, fontWeight: 'bold' }}>
                        {info.name || m.name}
                      </span>
                      {info.priority !== 0 && info.priority !== undefined && (
                        <span className={`dp2-priority-badge ${info.priority > 0 ? 'dp2-priority-plus' : 'dp2-priority-minus'}`}>
                          {info.priority > 0 ? `+${info.priority}` : info.priority}
                        </span>
                      )}
                      {pct > 0 && <span className="dp2-move-pct" style={pctStyle}>{Math.round(pct)}%</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {info.power > 0 ? (
                      <div style={{ height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                           <span style={{ fontWeight: 'bold', color: powerColor, fontSize: '0.85rem', lineHeight: 1 }}>{info.power}</span>
                         </div>
                         <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', lineHeight: 1 }}>
                           {powerRating.toLocaleString()}
                         </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{padding: '2px 0'}}>
                    {info.damageClass === 'status' ? (
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#64748b',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.2',
                        maxHeight: '2.4em',
                        textAlign: 'left'
                      }}>
                        {info.flavorText || '효과 설명 없음'}
                      </div>
                    ) : (
                      matchupDamage ? (
                        <div style={{ height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div style={{ height: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                               {(() => {
                                 let pctColor = matchupDamage.minPct >= 100 ? '#dc2626' : '#1e293b';
                                 if (matchupDamage.isImmune || matchupDamage.effectiveness === 0) pctColor = '#64748b';
                                 else if (matchupDamage.effectiveness >= 4) pctColor = '#b91c1c';
                                 else if (matchupDamage.effectiveness > 1) pctColor = '#ef4444';
                                 else if (matchupDamage.effectiveness <= 0.25) pctColor = '#1d4ed8';
                                 else if (matchupDamage.effectiveness < 1) pctColor = '#3b82f6';
                                 
                                 return (
                                   <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: pctColor, lineHeight: 1 }}>
                                     {matchupDamage.minPct.toFixed(1)}% ~ {matchupDamage.maxPct.toFixed(1)}%
                                   </span>
                                 );
                               })()}
                            </div>
                            <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', 
                              background: getKOBadge(matchupDamage).color + '15', 
                              color: getKOBadge(matchupDamage).color 
                            }}>
                              {getKOBadge(matchupDamage).label}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', position: 'relative', marginBottom: '3px' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(matchupDamage.minPct, 100)}%`, background: matchupDamage.minPct >= 100 ? '#dc2626' : '#f59e0b', borderRadius: '3px 0 0 3px' }} />
                            <div style={{ position: 'absolute', left: `${Math.min(matchupDamage.minPct, 100)}%`, top: 0, height: '100%', width: `${Math.min(matchupDamage.maxPct - matchupDamage.minPct, 100 - Math.min(matchupDamage.minPct, 100))}%`, background: matchupDamage.maxPct >= 100 ? '#ef4444' : '#fcd34d', opacity: 0.6, borderRadius: '0 3px 3px 0' }} />
                          </div>
                        </div>
                      ) : '-'
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                     <span style={{fontSize:'0.75rem', fontWeight: 'bold', color: info.accuracy && info.accuracy < 100 ? '#f97316' : (!info.accuracy && info.damageClass !== 'status' ? '#3b82f6' : '#64748b')}}>
                       {info.accuracy ? info.accuracy : (info.damageClass !== 'status' ? '필중' : '-')}
                     </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', maxHeight: '42px', overflow: 'hidden' }}>
                      {(() => {
                        const notes = getMoveNotes(info);
                        if (notes.length === 0) return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>;
                        return notes.map((n, i) => (
                          <span key={i} style={{ background: `${n.color}15`, color: n.color, border: `1px solid ${n.color}30`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {n.text}
                          </span>
                        ));
                      })()}
                    </div>
                  </td>
                </tr>
              );
              })}
              {Array.from({ length: paddingRows }).map((_, i) => (
                <tr key={`pad-${i}`} style={{ height: '46px' }}>
                  <td colSpan="6" style={{ borderBottom: '1px solid #f1f5f9' }}></td>
                </tr>
              ))}
            </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
