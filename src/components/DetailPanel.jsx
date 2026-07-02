import { useState, useEffect } from 'react';
import typeColors, { getTypeKo, getTypeEmoji, getTypeIconUrl, getPokeApiTypeIconUrl } from '../data/typeColors';
import { getDefensiveMultiplier } from '../data/typeMatchups';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { apiService } from '../services/apiService';
import { convertAllStats, calcHpLv50, calcStatLv50 } from '../utils/statCalc';
import { hexToRgba } from '../utils/colorUtils';
import { natureTranslations, natureStatsMap } from '../data/natureData';
import LoadingSpinner from './LoadingSpinner';



const getBackgroundGradient = (types) => {
  if (!types || types.length === 0) return '#f8fafc';
  const c1 = typeColors[types[0]] || '#94a3b8';
  const c2 = types.length > 1 ? (typeColors[types[1]] || '#94a3b8') : c1;
  // Create a very light pastel version of the type colors for the background
  return `linear-gradient(135deg, ${c1}15, ${c2}15, #f8fafc)`;
};

function DetailPanel({ pokemon, allPokemon, battleFormat, setBattleFormat, onSuggestionClick }) {
  const [battleData, setBattleData] = useState(null);
  const [moveDetails, setMoveDetails] = useState({});
  const [itemNames, setItemNames] = useState({});
  const [abilityNames, setAbilityNames] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pokemon) {
      setBattleData(null);
      setMoveDetails({});
      setItemNames({});
      setAbilityNames({});
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await apiService.fetchBattleData(battleFormat, pokemon.name);
        setBattleData(data);

        const topMoves = (data.rows || [])
          .filter(r => r.category === 'move')
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 10);
        
        const detailsMap = {};
        await Promise.all(topMoves.map(async (m) => {
          const info = await apiService.fetchMoveInfo(m.name);
          detailsMap[m.name] = info;
        }));
        setMoveDetails(detailsMap);

        const topItemsRaw = (data.rows || []).filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 3);
        const topAbilitiesRaw = (data.rows || []).filter(r => r.category === 'ability').sort((a, b) => a.rank - b.rank).slice(0, 2);

        const itemMap = {};
        await Promise.all(topItemsRaw.map(async (i) => {
          itemMap[i.name] = await apiService.fetchItemInfo(i.name);
        }));
        setItemNames(itemMap);

        const abilityMap = {};
        await Promise.all(topAbilitiesRaw.map(async (a) => {
          abilityMap[a.name] = await apiService.fetchAbilityInfo(a.name);
        }));
        setAbilityNames(abilityMap);

      } catch (err) {
        setError('데이터를 불러오지 못했습니다.');
        setBattleData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pokemon, battleFormat]);

  if (!pokemon) {
    return (
      <main className="detail-panel">
        <div className="detail-panel__empty">
          <span className="detail-panel__empty-icon">⚔️</span>
          <p className="detail-panel__empty-text">포켓몬을 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </main>
    );
  }

  const spriteUrl = apiService.getSpriteUrl(pokemon.name);
  const koName = getPokemonKo(pokemon.name);
  const types = pokemon.summary?.types || [];
  const rawStats = pokemon.summary?.baseStats || {};

  // Convert Lv50 stats → base stats using unified formula
  const base = convertAllStats(rawStats);
  const { hp: baseHp, atk: baseAtk, def: baseDef, spa: baseSpa, spd: baseSpd, spe: baseSpe, total: totalStats } = base;

  // LV50 Stat Calculations
  const hp0 = calcHpLv50(baseHp, 0);
  const hpH252 = calcHpLv50(baseHp, 252);
  const def0 = calcStatLv50(baseDef, 0, 1);
  const spd0 = calcStatLv50(baseSpd, 0, 1);

  const physDur0 = Math.floor(hp0 * def0 / 0.411);
  const physDur252 = Math.floor(hpH252 * def0 / 0.411);
  const specDur0 = Math.floor(hp0 * spd0 / 0.411);
  const specDur252 = Math.floor(hpH252 * spd0 / 0.411);

  const spe0 = calcStatLv50(baseSpe, 0, 1);
  const spe252 = calcStatLv50(baseSpe, 252, 1);
  const spe252Plus = calcStatLv50(baseSpe, 252, 1.1);
  const scarf0 = Math.floor(spe0 * 1.5);
  const scarf252 = Math.floor(spe252 * 1.5);
  const scarf252Plus = Math.floor(spe252Plus * 1.5);

  const isPhysical = baseAtk >= baseSpa;
  const atkStatBase = isPhysical ? baseAtk : baseSpa;

  // Defensive Matchups
  const capTypes = types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
  const multipliers = getDefensiveMultiplier(capTypes);
  
  const matchupGroups = { '4': [], '2': [], '1': [], '0.5': [], '0.25': [], '0': [] };
  Object.entries(multipliers).forEach(([atkType, mult]) => {
    const key = mult.toString();
    if (matchupGroups[key]) {
      matchupGroups[key].push(atkType.toLowerCase());
    }
  });



  // Parsed Battle Data
  const parsedRows = battleData?.rows || [];
  const top10Moves = parsedRows.filter(r => r.category === 'move').sort((a, b) => a.rank - b.rank).slice(0, 10);
  const topItems = parsedRows.filter(r => r.category === 'held_item').sort((a, b) => a.rank - b.rank).slice(0, 3);
  const topAbilities = parsedRows.filter(r => r.category === 'ability').sort((a, b) => a.rank - b.rank).slice(0, 2);
  const topNatures = parsedRows.filter(r => r.category === 'stat_alignment').sort((a, b) => a.rank - b.rank).slice(0, 2);

  // Helper: safely get usage percentage
  const getUsagePct = (row) => {
    const val = row.percentage_value ?? parseFloat(row.percentage) ?? 0;
    if (typeof val === 'number' && !isNaN(val)) {
      return val.toFixed(1);
    }
    return '-';
  };

  // Helper: usage color based on value
  const getUsageColor = (row) => {
    const pct = row.percentage_value ?? parseFloat(row.percentage) ?? 0;
    if (pct >= 50) return '#ef4444';
    if (pct >= 30) return '#f97316';
    if (pct >= 15) return '#eab308';
    if (pct >= 5) return '#22c55e';
    return '#94a3b8';
  };
  const topTeammates = parsedRows
    .filter(r => r.category === 'teammate')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map(t => {
      const pkm = allPokemon.find(p => p.name === t.name || p.battleName === t.name);
      return pkm ? { ...pkm, teammateRank: t.rank } : null;
    }).filter(Boolean);

  let hasSwordsDance = false;
  let hasNastyPlot = false;
  
  top10Moves.forEach(m => {
    const info = moveDetails[m.name];
    if (info) {
      if (info.name === '칼춤') hasSwordsDance = true;
      if (info.name === '나쁜음모') hasNastyPlot = true;
    }
  });

  const physMoves = [];
  const specMoves = [];
  const statusMoves = [];

  top10Moves.forEach(m => {
    const info = moveDetails[m.name];
    if (!info) return;
    const isStab = types.some(t => t.toLowerCase() === info.type.toLowerCase());
    const moveObj = { name: info.name, isStab, type: info.type };
    if (info.damageClass === 'physical') physMoves.push(moveObj);
    else if (info.damageClass === 'special') specMoves.push(moveObj);
    else statusMoves.push(moveObj);
  });

  // No more renderPills — simplified matchup display

  const renderMoves = (moveList, isStab) => {
    const filtered = isStab === null ? moveList : moveList.filter(m => m.isStab === isStab);
    if (filtered.length === 0) return <span className="text-muted" style={{fontSize: '0.75rem'}}>-</span>;
    return (
      <div className="dp-moves-wrap" style={isStab === null ? {justifyContent: 'center'} : {}}>
        {filtered.map(m => (
            <span key={m.name} className={`dp-move-badge ${m.isStab ? 'dp-move-badge--stab' : ''}`} style={{ backgroundColor: typeColors[m.type] || '#666' }}>
              {m.name}
            </span>
        ))}
      </div>
    );
  };

  const sortedMoves = top10Moves.filter(m => moveDetails[m.name]?.damageClass !== 'status');
  const p0 = calcStatLv50(baseAtk, 0, 1);
  const p252Plus = calcStatLv50(baseAtk, 252, 1.1);
  const s0 = calcStatLv50(baseSpa, 0, 1);
  const s252Plus = calcStatLv50(baseSpa, 252, 1.1);
  const setupMultiplier = hasSwordsDance || hasNastyPlot ? 2.0 : 1.0;

  return (
    <main className="detail-panel detail-panel--glass">
      {isLoading && <div className="loading-overlay"><LoadingSpinner /></div>}
      
      <div className="dp-inner">
        {/* TOP ROW: Profile & Base Stats */}
        <div className="dp-top-row">
          <div className="dp-profile">
            <img className="dp-sprite" src={spriteUrl} alt={koName} onError={(e) => e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'} />
            <div className="dp-title-box">
              <h2>{koName}</h2>
              <div className="dp-types">
                {types.map(t => {
                  const cap = t.charAt(0).toUpperCase() + t.slice(1);
                  return (
                    <img key={t} src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width: '28px', height: '28px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}} />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="dp-base-stats-linear">
            <span>{baseHp}H</span> / <span>{baseAtk}A</span> / <span>{baseDef}B</span> / <span>{baseSpa}C</span> / <span>{baseSpd}D</span> / <span>{baseSpe}S</span> / <span style={{color: '#ef4444'}}>{totalStats}T</span>
          </div>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="dp-main-grid dp-3x3-grid">
          
          {/* Row 1, Col 1: 약점 */}
          <div className="dp-matchup-card area-weakness">
              <div className="dp-matchup-header weak">
                <span>약점</span>
              </div>
              <div className="dp-matchup-list">
                {['4', '2'].map(mult => 
                  matchupGroups[mult].map(t => (
                    <div key={t} className="dp-matchup-item">
                      <div className="dp-matchup-item-left">
                        <img src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width: '20px', height: '20px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}} />
                      </div>
                      <div className="dp-matchup-item-right">
                        <span className={`dp-matchup-label ${mult === '4' ? 'red' : 'orange'}`}>×{mult}</span>
                      </div>
                    </div>
                  ))
                )}
                {matchupGroups['4'].length === 0 && matchupGroups['2'].length === 0 && (
                  <div style={{textAlign:'center', padding:'10px', color:'#94a3b8', fontSize:'0.8rem'}}>약점이 없습니다</div>
                )}
              </div>
            </div>

          {/* Row 1, Col 2: 강점 (반감/무효) */}
          <div className="dp-matchup-card area-resistance">
              <div className="dp-matchup-header resist">
                <span>반감 / 무효</span>
              </div>
              <div className="dp-matchup-list">
                {['0.5', '0.25', '0'].map(mult => 
                  matchupGroups[mult].map(t => (
                    <div key={t} className="dp-matchup-item">
                      <div className="dp-matchup-item-left">
                        <img src={getPokeApiTypeIconUrl(t)} alt={t} title={getTypeKo(t)} style={{width: '20px', height: '20px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}} />
                      </div>
                      <div className="dp-matchup-item-right">
                        <span className={`dp-matchup-label ${mult === '0' ? 'gray' : mult === '0.25' ? 'teal' : 'blue'}`}>{mult === '0.5' ? '½' : mult === '0.25' ? '¼' : '×0'}</span>
                      </div>
                    </div>
                  ))
                )}
                {matchupGroups['0.5'].length === 0 && matchupGroups['0.25'].length === 0 && matchupGroups['0'].length === 0 && (
                  <div style={{textAlign:'center', padding:'10px', color:'#94a3b8', fontSize:'0.8rem'}}>반감이 없습니다</div>
                )}
              </div>
            </div>
          
          {/* Row 1, Col 3: 내구 */}
          <div className="dp-card dp-compact-card area-durability">
            <h3 className="dp-card-title">🛡️ 내구</h3>
            <div className="dp-card-content" style={{padding: '4px'}}>
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>무보정</th>
                    <th>H252</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>물리</th>
                    <td>{physDur0.toLocaleString()}</td>
                    <td>{physDur252.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>특수</th>
                    <td>{specDur0.toLocaleString()}</td>
                    <td>{specDur252.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2-3, Col 1: 결정력 */}
          <div className="dp-card dp-compact-card area-firepower">
            <h3 className="dp-card-title">⚔️ 결정력 {hasSwordsDance ? '(칼춤 2랜크)' : hasNastyPlot ? '(나쁜음모 2랜크)' : '(풀보정)'}</h3>
            <div className="dp-card-content" style={{padding: '4px', overflowY: 'auto'}}>
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>기술명</th>
                    <th>위력</th>
                    <th>결정력</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMoves.map((m, idx) => {
                    const info = moveDetails[m.name] || {};
                    const power = info.power || 0;
                    if (power === 0) return null;
                    const isPhysicalMove = info.damageClass === 'physical';
                    const stat252 = isPhysicalMove ? p252Plus : s252Plus;
                    const stabMultiplier = types.some(t => t.toLowerCase() === (info.type || '').toLowerCase()) ? 1.5 : 1;
                    const dmg252 = Math.floor(power * stat252 * stabMultiplier * setupMultiplier);
                    
                    return (
                      <tr key={idx}>
                        <td style={{textAlign:'left', paddingLeft: '4px', fontWeight: types.some(t => t.toLowerCase() === (info.type || '').toLowerCase()) ? 'bold' : 'normal', color: types.some(t => t.toLowerCase() === (info.type || '').toLowerCase()) ? '#1e293b' : '#64748b', fontSize: '0.75rem'}}>
                          <img src={getPokeApiTypeIconUrl(info.type)} alt={info.type} title={getTypeKo(info.type)} style={{width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'}} />
                          <span style={{verticalAlign: 'middle'}}>{info.name}</span>
                        </td>
                        <td style={{color:'#94a3b8', fontSize:'0.72rem'}}>{power}</td>
                        <td style={{fontWeight:'bold', color: setupMultiplier > 1 ? '#ef4444' : '#1e293b'}}>{dmg252.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {sortedMoves.filter(m => moveDetails[m.name]?.power > 0).length === 0 && (
                    <tr><td colSpan="3" className="text-muted" style={{padding:'12px'}}>공격 기술이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2, Col 2: Meta Tags */}
          <div className="area-meta" style={{display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto'}}>
            <div className="dp-meta-tags-grid">
              <div className="dp-meta-box">
                <div className="dp-meta-box-title">도구</div>
                {topItems.slice(0, 3).map(it => {
                  const info = itemNames[it.name] || {};
                  return (
                    <div key={it.name} className="dp-meta-tag">
                      <span className="dp-label" style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        {info.sprite && <img src={info.sprite} alt="" style={{width:'24px', height:'24px', imageRendering:'pixelated'}} />}
                        {info.name || it.name}
                      </span>
                      <span className="dp-pct" style={{color: getUsageColor(it)}}>{getUsagePct(it)}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="dp-meta-box">
                <div className="dp-meta-box-title">특성</div>
                {topAbilities.slice(0, 2).map(ab => {
                  const abilityInfo = abilityNames[ab.name] || {};
                  return (
                    <div key={ab.name} className="dp-meta-tag" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '2px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                        <span className="dp-label" style={{color:'#3b82f6'}}>{abilityInfo.name || ab.name}</span>
                        <span className="dp-pct" style={{color: getUsageColor(ab)}}>{getUsagePct(ab)}%</span>
                      </div>
                      {abilityInfo.flavor && (
                        <div style={{fontSize: '0.6rem', color: '#64748b', lineHeight: 1.2, marginTop: '2px'}}>
                          {abilityInfo.flavor.replace(/\n|\f/g, ' ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="dp-meta-box">
                <div className="dp-meta-box-title">성격</div>
                {topNatures.slice(0, 2).map(nt => {
                  const statChange = natureStatsMap[nt.name];
                  return (
                    <div key={nt.name} className="dp-meta-tag">
                      <span className="dp-label" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <span style={{color:'#10b981'}}>{natureTranslations[nt.name] || nt.name}</span>
                        {statChange && (
                          <span style={{fontSize: '0.6rem', display: 'flex', gap: '4px'}}>
                            <span style={{color: '#ef4444'}}>▲{statChange.up}</span>
                            <span style={{color: '#3b82f6'}}>▼{statChange.down}</span>
                          </span>
                        )}
                      </span>
                      <span className="dp-pct" style={{color: getUsageColor(nt)}}>{getUsagePct(nt)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2, Col 3: 스피드 */}
          <div className="dp-card dp-compact-card area-speed">
            <h3 className="dp-card-title">👟 스피드</h3>
            <div className="dp-card-content" style={{padding: '4px'}}>
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>무보정</th>
                    <th>준/최속</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>기본</th>
                    <td>{spe0}</td>
                    <td>{spe252} / <strong style={{color:'#ef4444'}}>{spe252Plus}</strong></td>
                  </tr>
                  <tr>
                    <th>스카프</th>
                    <td>{scarf0}</td>
                    <td>{scarf252} / <strong style={{color:'#ef4444'}}>{scarf252Plus}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Row 3, Col 2-3: 기술폭 */}
          <div className="dp-card dp-compact-card area-movepool">
            <h3 className="dp-card-title">🎯 주요 채용 기술 (상위 10개)</h3>
            <div className="dp-card-content" style={{padding: '6px', overflowY: 'auto'}}>
              <table className="dp-table">
                <thead>
                  <tr>
                    <th style={{width:'15%'}}>분류</th>
                    <th style={{width:'42%'}}>자속</th>
                    <th style={{width:'43%'}}>비자속</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>물리</th>
                    <td>{renderMoves(physMoves, true)}</td>
                    <td>{renderMoves(physMoves, false)}</td>
                  </tr>
                  <tr>
                    <th>특수</th>
                    <td>{renderMoves(specMoves, true)}</td>
                    <td>{renderMoves(specMoves, false)}</td>
                  </tr>
                  <tr>
                    <th>변화</th>
                    <td colSpan="2">{renderMoves(statusMoves, null)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

export default DetailPanel;
