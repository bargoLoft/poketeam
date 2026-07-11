import { useState, useEffect } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { apiService } from '../services/apiService';
import { getMoveTotalPower, calcDamageRange, getKOBadge } from '../utils/damageCalc';
import { abilityBoosts } from '../data/abilityBoostData';
import { damageItems } from '../data/itemBoostData';
import moveFlagsData from '../data/moveFlags.json';

export function MoveBox({ pokemon, derived, oppDerived, partyBattleData }) {
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
      const topAbils = partyBattleData[pokemon.name]?.rows?.filter(r => r.category === 'ability').sort((a,b)=>a.rank-b.rank);
      setAbilityToggled(topAbils && topAbils.length > 0 && topAbils[0].name === derived.abilityKo);
      
      const topItems = partyBattleData[pokemon.name]?.rows?.filter(r => r.category === 'held_item').sort((a,b)=>a.rank-b.rank);
      setItemToggled(topItems && topItems.length > 0 && topItems[0].name === derived.itemName);
    }
  }, [derived?.abilityKo, derived?.itemName, pokemon?.name, partyBattleData]);

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
  }, [pokemon, partyBattleData]);

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
          ⚔️ {pokemon.name}의 주요 기술
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--glass-bg)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenRankDropdown(prev => prev === 'neg' ? null : 'neg')}
                style={{
                  width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: offenseRank <= -3 ? '#3b82f6' : 'transparent', color: offenseRank <= -3 ? '#fff' : '#cbd5e1'
                }}
              >
                {offenseRank <= -3 ? offenseRank : '3-'}
              </button>
              {openRankDropdown === 'neg' && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
                  {[-3, -4, -5, -6].map(r => (
                    <button key={r} onClick={() => { setOffenseRank(r); setOpenRankDropdown(null); }} style={{ width: '28px', height: '20px', fontSize: '0.65rem', fontWeight: 'bold', border: 'none', background: offenseRank === r ? '#3b82f6' : 'transparent', color: offenseRank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {[-2, -1, 0, 1, 2].map(rank => (
              <button
                key={rank}
                onClick={() => { setOffenseRank(rank); setOpenRankDropdown(null); }}
                style={{
                  width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: offenseRank === rank ? (rank > 0 ? '#ef4444' : rank < 0 ? '#3b82f6' : '#64748b') : 'transparent',
                  color: offenseRank === rank ? '#fff' : (rank === 0 ? '#94a3b8' : '#cbd5e1')
                }}
              >
                {rank === 0 ? '-' : Math.abs(rank)}
              </button>
            ))}

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenRankDropdown(prev => prev === 'pos' ? null : 'pos')}
                style={{
                  width: '24px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  background: offenseRank >= 3 ? '#ef4444' : 'transparent', color: offenseRank >= 3 ? '#fff' : '#cbd5e1'
                }}
              >
                {offenseRank >= 3 ? `+${offenseRank}` : '3+'}
              </button>
              {openRankDropdown === 'pos' && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '2px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
                  {[3, 4, 5, 6].map(r => (
                    <button key={r} onClick={() => { setOffenseRank(r); setOpenRankDropdown(null); }} style={{ width: '28px', height: '20px', fontSize: '0.65rem', fontWeight: 'bold', border: 'none', background: offenseRank === r ? '#ef4444' : 'transparent', color: offenseRank === r ? '#fff' : '#475569', borderRadius: '2px', cursor: 'pointer' }}>
                      +{r}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </h3>
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <table className="dp2-table dp2-move-table">
          <thead>
            <tr>
              <th style={{width:'5%'}}></th>
              <th style={{width:'24%'}}>기술명</th>
              <th style={{width:'15%'}}>위력/결정력</th>
              <th style={{width:'36%'}}>대면 데미지 예측</th>
              <th style={{width:'20%'}}>명중/효과</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m, idx) => {
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
                <tr key={idx}>
                  <td>
                    <img src={getPokeApiTypeIconUrl(info.type)} alt={info.type} title={getTypeKo(info.type)} className="dp2-move-type-icon" />
                  </td>
                  <td>
                    <div className="dp2-move-name-cell">
                      <span className={`dp2-move-name ${isStab ? 'dp2-stab' : ''}`} style={{ color: nameColor, fontWeight: 'bold' }}>
                        {info.damageClass === 'physical' && '⚔ '}
                        {info.damageClass === 'special' && '✦ '}
                        {info.damageClass === 'status' && '◈ '}
                        {info.name || m.name}
                      </span>
                      {pct > 0 && <span className="dp2-move-pct" style={pctStyle}>{pct.toFixed(1)}%</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {info.power > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <span style={{ fontWeight: 'bold', color: powerColor, fontSize: '0.85rem' }}>{info.power}</span>
                         <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', marginTop: '2px', fontWeight: 'bold' }}>
                           {powerRating.toLocaleString()}
                         </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{padding: '4px'}}>
                    {info.damageClass === 'status' ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(() => {
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
                              '껍질깨기': { text: '공/특공/속 2랭↑ 방/특방 1랭↓', color: '#991b1b' },
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
                                  let prefix = '';
                                  const isOpponentTarget = ['selected-pokemon', 'all-opponents', 'random-opponent', 'opponents-field'].includes(info.target);
                                  if (info.category === 'damage-lower' || isOpponentTarget) prefix = '상대 ';
                                  const chanceStr = info.statChance > 0 && info.statChance < 100 ? `${info.statChance}% ` : '';
                                  notes.push({ text: `${chanceStr}${prefix}${label}${arrow}`, color: sc.change > 0 ? '#3b82f6' : '#f97316' });
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
                                  const chanceStr = info.ailmentChance > 0 && info.ailmentChance < 100 ? `${info.ailmentChance}% ` : '';
                                  notes.push({ text: `${chanceStr}${ailMeta.text}`, color: ailMeta.color });
                                }
                              }
                            }
                            return notes;
                          };
                          
                          const notes = getMoveNotes(info);
                          if (notes.length === 0) return <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{info.flavorText || '변화기'}</span>;
                          return notes.map((n, i) => (
                            <span key={i} style={{ background: `${n.color}15`, color: n.color, border: `1px solid ${n.color}30`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                              {n.text}
                            </span>
                          ));
                        })()}
                      </div>
                    ) : (
                      matchupDamage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                               {matchupDamage.effectiveness !== undefined && matchupDamage.effectiveness !== 1 && !matchupDamage.isImmune && (
                                  <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', background: matchupDamage.effectiveness > 1 ? '#fee2e2' : '#f1f5f9', color: matchupDamage.effectiveness > 1 ? '#dc2626' : '#64748b' }}>
                                    x{matchupDamage.effectiveness}
                                  </span>
                               )}
                               <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: matchupDamage.minPct >= 100 ? '#dc2626' : '#1e293b' }}>
                                 {matchupDamage.minPct.toFixed(1)}% ~ {matchupDamage.maxPct.toFixed(1)}%
                               </span>
                            </div>
                            <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold', 
                              background: getKOBadge(matchupDamage).color + '15', 
                              color: getKOBadge(matchupDamage).color 
                            }}>
                              {getKOBadge(matchupDamage).label}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', position: 'relative' }}>
                            {/* Base Min Damage Bar */}
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(matchupDamage.minPct, 100)}%`, background: matchupDamage.minPct >= 100 ? '#dc2626' : '#f59e0b', borderRadius: '3px 0 0 3px' }} />
                            {/* Random Range Indicator */}
                            <div style={{ position: 'absolute', left: `${Math.min(matchupDamage.minPct, 100)}%`, top: 0, height: '100%', width: `${Math.min(matchupDamage.maxPct - matchupDamage.minPct, 100 - Math.min(matchupDamage.minPct, 100))}%`, background: matchupDamage.maxPct >= 100 ? '#ef4444' : '#fcd34d', opacity: 0.6, borderRadius: '0 3px 3px 0' }} />
                          </div>
                        </div>
                      ) : '-'
                    )}
                  </td>
                  <td>
                     <span style={{fontSize:'0.75rem', color: info.accuracy && info.accuracy < 100 ? '#f97316' : '#64748b'}}>
                       {info.accuracy ? `명중 ${info.accuracy}` : '-'}
                     </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
