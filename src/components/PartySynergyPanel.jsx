import { useState, useEffect, useMemo } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { getDefensiveMultiplier, offensiveMatchups, moveTypeMap } from '../data/typeMatchups';
import { apiService } from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';

const ALL_TYPES = Object.keys(offensiveMatchups);

export default function PartySynergyPanel({ party, battleFormat }) {
  const [includeSubWeapons, setIncludeSubWeapons] = useState(false);
  const [partyBattleData, setPartyBattleData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const activeParty = party.filter(Boolean);

  // Fetch battle data for the party to get sub-weapons
  useEffect(() => {
    if (!includeSubWeapons || activeParty.length === 0) return;

    const fetchPartyData = async () => {
      setIsLoading(true);
      const newData = { ...partyBattleData };
      const fetchPromises = activeParty.map(async (p) => {
        if (!newData[p.name]) {
          try {
            const data = await apiService.fetchBattleData(battleFormat, p.name);
            newData[p.name] = data;
          } catch (e) {
            console.error(e);
          }
        }
      });
      await Promise.all(fetchPromises);
      setPartyBattleData(newData);
      setIsLoading(false);
    };

    fetchPartyData();
  }, [includeSubWeapons, activeParty, battleFormat]);

  // 방어 상성 계산: 각 포켓몬별로 약점(>1), 반감(<1), 무효(0) 수집
  const defensiveAnalysis = useMemo(() => {
    const analysis = {};
    ALL_TYPES.forEach(t => analysis[t] = { weak: 0, resist: 0, immune: 0, weakTo: [] });

    activeParty.forEach(pokemon => {
      const types = pokemon.summary?.types || [];
      const mults = getDefensiveMultiplier(types);
      
      Object.entries(mults).forEach(([attackType, mult]) => {
        if (mult > 1) {
          analysis[attackType].weak += 1;
          analysis[attackType].weakTo.push(pokemon.name);
        } else if (mult === 0) {
          analysis[attackType].immune += 1;
        } else if (mult < 1) {
          analysis[attackType].resist += 1;
        }
      });
    });
    return analysis;
  }, [activeParty]);

  // 공격 상성 (타점) 계산
  const offensiveAnalysis = useMemo(() => {
    const analysis = {};
    ALL_TYPES.forEach(t => analysis[t] = { hitSuperEffective: 0, hitBy: [] });

    activeParty.forEach(pokemon => {
      let attackTypes = [...(pokemon.summary?.types || [])];
      
      // 서브 웨폰 포함 (Top 4 Moves)
      if (includeSubWeapons && partyBattleData[pokemon.name]) {
        const rows = partyBattleData[pokemon.name].rows || [];
        const moves = rows.filter(r => r.category === 'move').sort((a,b) => a.rank - b.rank).slice(0, 4);
        moves.forEach(m => {
          const moveType = moveTypeMap[m.name];
          if (moveType && !attackTypes.includes(moveType)) {
            attackTypes.push(moveType);
          }
        });
      }

      // 이 포켓몬의 공격 타입들이 찌를 수 있는 타입 계산
      ALL_TYPES.forEach(defType => {
        let canHit = false;
        attackTypes.forEach(atkType => {
          if (offensiveMatchups[atkType]?.[defType] > 1) {
            canHit = true;
          }
        });
        if (canHit) {
          analysis[defType].hitSuperEffective += 1;
          analysis[defType].hitBy.push(pokemon.name);
        }
      });
    });
    return analysis;
  }, [activeParty, includeSubWeapons, partyBattleData]);

  if (activeParty.length === 0) {
    return (
      <div className="synergy-panel">
        <p className="text-muted text-center py-8">파티에 포켓몬을 추가하면 상성을 분석합니다.</p>
      </div>
    );
  }

  return (
    <div className="synergy-panel">
      <div className="synergy-header">
        <h2 className="synergy-title">🛡️ 파티 상성 분석</h2>
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={includeSubWeapons} 
            onChange={(e) => setIncludeSubWeapons(e.target.checked)} 
          />
          <span>서브 웨폰 포함 (Top 4 기술)</span>
        </label>
      </div>

      {isLoading && includeSubWeapons ? (
        <div className="py-4"><LoadingSpinner /></div>
      ) : (
        <div className="synergy-content">
          <div className="synergy-section">
            <h3 className="synergy-section-title">⚠️ 방어 취약점 (파티가 찔리는 타입)</h3>
            <div className="synergy-grid">
              {ALL_TYPES.sort((a, b) => defensiveAnalysis[b].weak - defensiveAnalysis[a].weak).map(type => {
                const { weak, resist, immune } = defensiveAnalysis[type];
                if (weak === 0) return null;
                return (
                  <div key={type} className={`synergy-item ${weak >= 3 ? 'synergy-item--danger' : ''}`}>
                    <img src={getPokeApiTypeIconUrl(type)} alt={type} title={getTypeKo(type)} style={{width: '24px', height: '24px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}} />
                    <div className="synergy-stats">
                      <span className="stat-weak">{weak} 약점</span>
                      {resist > 0 && <span className="stat-resist">{resist} 반감</span>}
                      {immune > 0 && <span className="stat-immune">{immune} 무효</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.values(defensiveAnalysis).every(d => d.weak === 0) && (
              <p className="text-muted">완벽합니다! 특별히 찔리는 타입이 없습니다.</p>
            )}
          </div>

          <div className="synergy-section">
            <h3 className="synergy-section-title">⚔️ 공격 커버리지 (파티가 찌를 수 있는 타입)</h3>
            <div className="synergy-grid">
              {ALL_TYPES.sort((a, b) => offensiveAnalysis[b].hitSuperEffective - offensiveAnalysis[a].hitSuperEffective).map(type => {
                const { hitSuperEffective } = offensiveAnalysis[type];
                return (
                  <div key={type} className={`synergy-item ${hitSuperEffective === 0 ? 'synergy-item--warning' : ''}`}>
                    <span className="type-badge" style={{ backgroundColor: typeColors[type] }}>{getTypeKo(type)}</span>
                    <div className="synergy-stats">
                      {hitSuperEffective > 0 ? (
                        <span className="stat-hit">{hitSuperEffective}마리가 타격 가능</span>
                      ) : (
                        <span className="stat-miss">타점 부족</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
