import { useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import { getMegaDataSync } from '../utils/megaUtils';
import { getStatColor } from '../utils/statUtils';
import { getOffensiveCoverageDetails, getDefensiveWeaknessDetails, getDefensiveResistanceDetails } from '../utils/typeUtils';
import { getPokeApiTypeIconUrl, getTypeKo } from '../data/typeColors';
import typeColors from '../data/typeColors';
import { getPokemonKo } from '../data/pokemonNamesKo';

export default function PartyDashboard({ party, opponentParty, partyMegas, opponentPartyMegas, battleFormat, setBattleFormat, partyBattleData, allPokemon }) {
  const [activeTab, setActiveTab] = useState('matchup');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpeedExpanded, setIsSpeedExpanded] = useState(true);
  const [isSpeedHovered, setIsSpeedHovered] = useState(false);

  const activeParty = party.filter(Boolean);
  const activeOpponents = opponentParty.filter(Boolean);

  // Helper to extract types
  const getTypes = (p, form) => {
    if (!p) return [];
    if (form) {
      const mData = getMegaDataSync(p.name, form);
      if (mData && mData.types) return mData.types;
    }
    return p.summary?.types || [];
  };

  const getSprite = (p, form) => {
    if (!p) return '';
    if (form) {
      const mData = getMegaDataSync(p.name, form);
      if (mData && mData.spriteUrl) return mData.spriteUrl;
    }
    return apiService.getSpriteUrl(p.name);
  };

  // Group by base speed for speed tier
  const speedGroups = useMemo(() => {
    const groups = {};
    const addPokemon = (p, form, isOpponent) => {
      if (!p) return;
      let statsObj = p.summary?.baseStats;
      let sprite = getSprite(p, form);
      let types = getTypes(p, form);
      
      let baseSpeed = 0;
      
      if (form) {
        const mData = getMegaDataSync(p.name, form);
        if (mData) {
          statsObj = mData.baseStats;
          baseSpeed = statsObj.speed || 0;
        }
      }

      if (!form || baseSpeed === 0) {
        const lv50Speed = statsObj?.speed || 5;
        baseSpeed = Math.max(1, Math.round(((lv50Speed - 5) * 2 - 31) / 2));
      }
      if (!groups[baseSpeed]) groups[baseSpeed] = [];
      groups[baseSpeed].push({
        id: `${isOpponent ? 'opp' : 'my'}-${p.name}`,
        name: p.name,
        sprite: sprite,
        types: types,
        isOpponent
      });
    };
    party.forEach((p, i) => addPokemon(p, partyMegas[i], false));
    opponentParty.forEach((p, i) => addPokemon(p, opponentPartyMegas[i], true));
    return groups;
  }, [party, partyMegas, opponentParty, opponentPartyMegas]);

  const uniqueSpeeds = useMemo(() => {
    return Object.keys(speedGroups)
      .map(s => parseInt(s, 10))
      .sort((a, b) => a - b);
  }, [speedGroups]);

  // Type Consistency Analysis
  const typeAnalysis = useMemo(() => {
    if (activeParty.length === 0 || activeOpponents.length === 0) return null;

    const oppList = activeOpponents.map((p, i) => ({
      id: p.name,
      name: p.name,
      sprite: getSprite(p, opponentPartyMegas[i]),
      types: getTypes(p, opponentPartyMegas[i])
    }));

    const myList = activeParty.map((p, i) => ({
      id: p.name,
      name: p.name,
      sprite: getSprite(p, partyMegas[i]),
      types: getTypes(p, partyMegas[i])
    }));

    const offensiveAces = [];
    const defensiveAces = [];
    const oppOffensiveAces = [];
    const oppDefensiveAces = [];

    activeParty.forEach((p, i) => {
      const types = getTypes(p, partyMegas[i]);
      const offRes = getOffensiveCoverageDetails(types, oppList);
      offensiveAces.push({ pokemon: p, form: partyMegas[i], score: offRes.score, details: offRes.details });
      
      const defRes = getDefensiveResistanceDetails(types, oppList);
      defensiveAces.push({ pokemon: p, form: partyMegas[i], score: defRes.score, details: defRes.details });
    });

    activeOpponents.forEach((p, i) => {
      const types = getTypes(p, opponentPartyMegas[i]);
      const offRes = getOffensiveCoverageDetails(types, myList);
      oppOffensiveAces.push({ pokemon: p, form: opponentPartyMegas[i], score: offRes.score, details: offRes.details });
      
      const defRes = getDefensiveResistanceDetails(types, myList);
      oppDefensiveAces.push({ pokemon: p, form: opponentPartyMegas[i], score: defRes.score, details: defRes.details });
    });

    offensiveAces.sort((a, b) => b.score - a.score);
    defensiveAces.sort((a, b) => b.score - a.score);
    oppOffensiveAces.sort((a, b) => b.score - a.score);
    oppDefensiveAces.sort((a, b) => b.score - a.score);

    return { offensiveAces, defensiveAces, oppOffensiveAces, oppDefensiveAces };
  }, [activeParty, activeOpponents, partyMegas, opponentPartyMegas]);

  // Lead Prediction
  const leadPrediction = useMemo(() => {
    if (activeOpponents.length === 0) return [];

    const scores = activeOpponents.map((p, i) => {
      let score = 0;
      const data = partyBattleData[p.name];
      if (data && data.rows) {
        data.rows.forEach(row => {
          const pct = parseFloat(row.percentage) || 0;
          if (row.category === 'move') {
            if (['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web', 'Light Screen', 'Reflect', 'Aurora Veil', 'Fake Out'].includes(row.name)) score += pct * 0.8;
            if (['U-turn', 'Volt Switch', 'Parting Shot', 'Flip Turn'].includes(row.name)) score += pct * 0.3;
            if (['Taunt'].includes(row.name)) score += pct * 0.4;
          } else if (row.category === 'held_item') {
            if (['Focus Sash', 'Light Clay'].includes(row.name)) score += pct * 1.0;
            if (['Choice Scarf'].includes(row.name)) score += pct * 0.3;
          }
        });
      }
      return { pokemon: p, form: opponentPartyMegas[i], score };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [activeOpponents, opponentPartyMegas, partyBattleData]);

  const renderHitDetails = (details, isHalfWidth = false) => {
    // 1. Group by Target to find all attackTypes for each target
    const targetMap = {};
    details.forEach(d => {
      const baseId = d.targetName;
      if (!targetMap[baseId]) {
        targetMap[baseId] = {
          targetId: d.targetId.split('-')[0],
          targetName: d.targetName,
          targetSprite: d.targetSprite,
          targetTypes: d.targetTypes,
          hits: []
        };
      }
      if (!targetMap[baseId].hits.some(h => h.attackType === d.attackType)) {
        targetMap[baseId].hits.push({ attackType: d.attackType, multiplier: d.multiplier });
      }
    });

    // 2. Group by exact combination of attackTypes
    const typeComboMap = {};
    Object.values(targetMap).forEach(target => {
      // Sort types to ensure consistent grouping (e.g. "Flying,Normal" -> "Normal,Flying")
      const comboKey = target.hits.map(h => h.attackType).sort().join(',');
      if (!typeComboMap[comboKey]) {
        typeComboMap[comboKey] = {
          attackTypes: target.hits.map(h => h.attackType).sort(),
          targets: []
        };
      }
      typeComboMap[comboKey].targets.push(target);
    });

    const comboEntries = Object.values(typeComboMap);
    const numGroups = comboEntries.length;

    const gridLayout = numGroups >= 3 
      ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', flex: 1, minHeight: 0 }
      : { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 };

    return (
      <div style={gridLayout} className="hit-details-inner-container">
        {comboEntries.map((combo, idx) => {
          const { attackTypes, targets } = combo;
          
          let gridClass = '';
          if (isHalfWidth) {
            if (numGroups > 1) {
              gridClass = `hit-grid-row-${targets.length}`;
            } else {
              if (targets.length === 2) {
                gridClass = 'hit-grid-col-2';
              } else {
                gridClass = `hit-grid-${targets.length <= 1 ? 1 : targets.length === 2 ? 2 : targets.length <= 4 ? 4 : 6}`;
              }
            }
          } else {
            gridClass = numGroups >= 3 ? (targets.length === 1 ? 'hit-grid-1' : 'hit-grid-fixed-2') : 'hit-grid-fixed-3';
          }

          return (
            <div key={idx} className="hit-group">
              <div className="hit-group-type" style={{ flexDirection: 'column', gap: '2px' }}>
                {attackTypes.map(type => (
                  <img key={type} src={getPokeApiTypeIconUrl(type)} alt={type} title={getTypeKo(type)} style={{width: '32px', height: '32px'}} />
                ))}
              </div>
              <div className={`hit-group-targets ${gridClass}`}>
                {targets.map(d => {
                  let highlightClass = "";
                  if (d.hits.some(h => h.multiplier > 2)) highlightClass = "hit-critical";
                  else if (d.hits.some(h => h.multiplier === 0)) highlightClass = "hit-immune";
                  else if (d.hits.some(h => h.multiplier === 0.25)) highlightClass = "hit-resist-heavy";

                  // Display the most extreme multiplier in the title
                  const maxMult = d.hits.some(h => h.multiplier === 0) ? 0 : Math.max(...d.hits.map(h => h.multiplier));

                  return (
                    <div key={d.targetId} className="hit-target" title={`${getPokemonKo(d.targetName)} (${maxMult}x)`}>
                      <div className={highlightClass} style={{
                        background: getBackgroundStyle(d.targetTypes, 0.4),
                        width: '100%',
                        maxWidth: '76px',
                        aspectRatio: '1 / 1',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <img src={d.targetSprite} alt={d.targetName} className="hit-sprite-small" style={{ background: 'transparent' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getBackgroundStyle = (types, alpha = 0.4) => {
    if (!types || types.length === 0) return 'rgba(0,0,0,0.05)';
    
    const hexToRgba = (hex, a) => {
      if (!hex) return `rgba(0,0,0,${a})`;
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    if (types.length === 1) {
      return hexToRgba(typeColors[types[0]], alpha);
    } else if (types.length >= 2) {
      const c1 = hexToRgba(typeColors[types[0]], alpha);
      const c2 = hexToRgba(typeColors[types[1]], alpha);
      return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
    }
    return 'rgba(0,0,0,0.05)';
  };

  const renderAnalysisList = (list, title, emptyText, themeClass, cardIcon) => {
    if (!list || list.length === 0) {
      return (
        <div className="analysis-card-wrapper">
          <div className={`analysis-card ${themeClass}`} style={{opacity: 0.5}}>
            <div className="card-header">{cardIcon} {title}</div>
            <div className="card-text" style={{marginTop: 'auto', marginBottom: 'auto'}}>{emptyText}</div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="analysis-card-wrapper">
        <div className={`analysis-card ${themeClass}`} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start' }}>
        {list.map((item, idx) => {
          const uniqueTargetsCount = new Set(item.details.map(d => d.targetName)).size;
          const isHalfWidth = idx > 0 && uniqueTargetsCount <= 2;
          return (
          <div key={`${title}-${item.pokemon.name}-${idx}`} className="analysis-row" style={{
            display: 'flex', gap: isHalfWidth ? '8px' : '16px', height: isHalfWidth ? '110px' : '188px', flexShrink: 0,
            borderBottom: idx < list.length - 1 && !isHalfWidth ? '1px solid rgba(0,0,0,0.1)' : 'none',
            paddingBottom: idx < list.length - 1 && !isHalfWidth ? '16px' : '0',
            width: isHalfWidth ? 'calc(50% - 8px)' : '100%'
          }}>
            <div className="card-left" style={isHalfWidth ? { minWidth: '70px', paddingRight: '4px' } : {}}>
              {idx === 0 && (
                <div className="card-header" style={isHalfWidth ? { fontSize: '0.8rem', opacity: 0.8 } : {}}>
                  {cardIcon} {title}
                </div>
              )}
              <div className="dashboard-sprite-wrapper" style={{ 
                background: getBackgroundStyle(item.pokemon.summary?.types),
                width: isHalfWidth ? (idx > 0 ? '76px' : '64px') : '96px',
                height: isHalfWidth ? (idx > 0 ? '76px' : '64px') : '96px'
              }}>
                <img src={getSprite(item.pokemon, item.form)} alt={item.pokemon.name} style={isHalfWidth ? { width: idx > 0 ? '60px' : '52px', height: idx > 0 ? '60px' : '52px' } : {}} />
              </div>
              <div className="card-text">
                <strong style={isHalfWidth ? { fontSize: '0.9rem' } : {}}>{getPokemonKo(item.pokemon.name)}</strong>
              </div>
            </div>
            {item.details.length > 0 ? (
              <div className="card-right hit-details">
                {renderHitDetails(item.details, isHalfWidth)}
              </div>
            ) : (
              <div className="card-right hit-details" style={{justifyContent:'center', alignItems:'center', opacity:0.5}}>
                해당되는 대상이 없습니다
              </div>
            )}
          </div>
        )})}
        </div>
      </div>
    );
  };

  if (activeParty.length === 0 && activeOpponents.length === 0) {
    return (
      <div className="party-dashboard">
        <div className="dashboard-empty" style={{ marginTop: '20px' }}>
          <span className="dashboard-empty-icon">👈</span>
          <p>포켓몬을 추가하면 선출 분석과 스피드 비교가 시작됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="party-dashboard" style={{ paddingTop: '20px', paddingBottom: '0', gap: '0', position: 'relative', overflow: 'hidden' }}>
      
      <div className="dashboard-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, height: '100%', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.dashboard-content::-webkit-scrollbar { display: none; }`}</style>
        
        <div className="selection-analysis" style={{ paddingBottom: '24px' }}>
          <div className="analysis-section">
            <h3 className="section-title">일관성 분석</h3>
            <div className="analysis-cards">
              {renderAnalysisList(typeAnalysis?.offensiveAces, '공격 주축', '데이터 부족', 'ace-card', '⚔️')}
              {renderAnalysisList(typeAnalysis?.oppOffensiveAces, '경계 대상', '데이터 부족', 'threat-card', '⚠️')}
              {renderAnalysisList(typeAnalysis?.defensiveAces, '수비 핵심', '데이터 부족', 'def-card', '🛡️')}
              {renderAnalysisList(typeAnalysis?.oppDefensiveAces, '돌파 주의', '데이터 부족', 'opp-def-card', '🧱')}
            </div>
          </div>

          <div className="analysis-section">
            <h3 className="section-title">상대 선발 예측</h3>
            <div className="lead-prediction-list">
              {leadPrediction.length > 0 ? leadPrediction.map((lead, idx) => (
                <div key={idx} className="lead-item">
                  <div className="lead-rank">{idx + 1}위</div>
                  <img src={getSprite(lead.pokemon, lead.form)} alt={lead.pokemon.name} className="lead-sprite" />
                  <div className="lead-info">
                    <strong>{getPokemonKo(lead.pokemon.name)}</strong>
                    <span className="lead-score">선발 지수: {Math.round(lead.score)}점</span>
                  </div>
                </div>
              )) : (
                <div className="empty-text" style={{padding: '20px', textAlign: 'center', color: '#888'}}>상대 포켓몬을 추가해주세요.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Speed Tier */}
      <div 
        className="analysis-section" 
        style={{ flexShrink: 0, padding: '0 16px 0 16px', position: 'relative', zIndex: isSpeedHovered ? 20 : 5 }}
        onMouseEnter={() => setIsSpeedHovered(true)}
        onMouseLeave={() => setIsSpeedHovered(false)}
      >
        <h3 className="section-title" style={{ marginTop: '0px', marginBottom: '0' }}>스피드 비교</h3>
        <div className="speed-tier-content" style={{ background: 'var(--glass-bg)', padding: '2px 16px 2px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div className="horizontal-speed-track" style={{ height: '136px', margin: '0 0 22px 0', padding: '0' }}>
            <div className="speed-axis-line"></div>
            
            {uniqueSpeeds.map((speed, index) => {
              let pct;
              if (uniqueSpeeds.length === 1) {
                pct = 50;
              } else {
                pct = 5 + (index / (uniqueSpeeds.length - 1)) * 90;
              }
              const pokemons = speedGroups[speed];
              
              return (
                <div key={speed} className="speed-node" style={{ left: `${pct}%` }}>
                  <div className="speed-node-stack">
                    {pokemons.slice(0, 2).map(p => (
                      <div 
                        key={p.id} 
                        className={`speed-node-sprite ${p.isOpponent ? 'speed-node-sprite--opp' : 'speed-node-sprite--my'}`}
                      >
                        <img src={p.sprite} alt={p.name} title={`${p.name} (Spe: ${speed})`} />
                      </div>
                    ))}
                    {pokemons.length > 2 && (
                      <div className="speed-more-badge">
                        +{pokemons.length - 2}
                        <div className="speed-more-tooltip">
                          {pokemons.slice(2).map(p => (
                            <div 
                              key={p.id} 
                              className={`speed-node-sprite ${p.isOpponent ? 'speed-node-sprite--opp' : 'speed-node-sprite--my'}`}
                            >
                              <img src={p.sprite} alt={p.name} title={`${p.name} (Spe: ${speed})`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="speed-node-tick"></div>
                  <div className="speed-node-label" style={{ color: getStatColor(speed), fontWeight: 'bold' }}>{speed}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
