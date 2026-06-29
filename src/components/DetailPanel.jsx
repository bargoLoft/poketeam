import { useState, useEffect } from 'react';
import typeColors, { getTypeKo } from '../data/typeColors';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { getStatColor, statLabels } from '../utils/statUtils';
import { apiService } from '../services/apiService';
import LoadingSpinner from './LoadingSpinner';

function DetailPanel({ pokemon, allPokemon, battleFormat, setBattleFormat, onSuggestionClick }) {
  const [battleData, setBattleData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pokemon) {
      setBattleData(null);
      return;
    }

    const loadBattleData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // 포켓몬 이름으로 배틀 데이터 조회 (Doubles or Singles)
        const data = await apiService.fetchBattleData(battleFormat, pokemon.name);
        setBattleData(data);
      } catch (err) {
        setError('배틀 통계를 불러오지 못했습니다.');
        setBattleData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadBattleData();
  }, [pokemon, battleFormat]);

  if (!pokemon) {
    return (
      <main className="detail-panel">
        <div className="detail-panel__empty">
          <span className="detail-panel__empty-icon">⚔️</span>
          <p className="detail-panel__empty-text">
            포켓몬을 선택하면<br />추천 정보가 표시됩니다
          </p>
        </div>
      </main>
    );
  }

  const spriteUrl = apiService.getSpriteUrl(pokemon.name);
  const koName = getPokemonKo(pokemon.name);
  const types = pokemon.summary?.types || [];
  const stats = pokemon.summary?.baseStats || {};
  
  const calcBaseHP = (val) => Math.max(1, Math.round(((val - 60) * 2 - 31) / 2));
  const calcBaseOther = (val) => Math.max(1, Math.round(((val - 5) * 2 - 31) / 2));

  const normalizedStats = {
    hp: stats.hp ? calcBaseHP(stats.hp) : 0,
    atk: stats.attack ? calcBaseOther(stats.attack) : 0,
    def: stats.defense ? calcBaseOther(stats.defense) : 0,
    spa: stats.sp_attack ? calcBaseOther(stats.sp_attack) : 0,
    spd: stats.sp_defense ? calcBaseOther(stats.sp_defense) : 0,
    spe: stats.speed ? calcBaseOther(stats.speed) : 0,
  };
  const statsEntries = Object.entries(normalizedStats);
  const totalStat = Object.values(normalizedStats).reduce((a, b) => a + b, 0);

  // Parse battle data
  const parsedRows = battleData?.rows || [];
  
  const topMoves = parsedRows
    .filter(r => r.category === 'move')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4);
    
  const topItems = parsedRows
    .filter(r => r.category === 'held_item')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
    
  const topAbilities = parsedRows
    .filter(r => r.category === 'ability')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2);

  // Teammates parsing (map back to pokemon objects from allPokemon)
  const topTeammates = parsedRows
    .filter(r => r.category === 'teammate')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6)
    .map(t => {
      const pkm = allPokemon.find(p => p.name === t.name || p.battleName === t.name);
      return pkm ? { ...pkm, teammateRank: t.rank } : null;
    })
    .filter(Boolean);

  return (
    <main className="detail-panel">


      <div className="detail-panel__content">
        {/* Header */}
        <div className="detail-panel__pokemon-header">
          <img
            className="detail-panel__pokemon-image"
            src={spriteUrl}
            alt={koName}
            onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'; }}
          />
          <div className="detail-panel__pokemon-meta">
            <h2 className="detail-panel__pokemon-name">{koName}</h2>
            <div className="detail-panel__pokemon-types">
              {types.map((type) => (
                <span
                  key={type}
                  className="type-badge type-badge--lg"
                  style={{ backgroundColor: typeColors[type] || typeColors['Normal'] }}
                >
                  {getTypeKo(type)}
                </span>
              ))}
            </div>
            
            {!isLoading && topAbilities.length > 0 && (
              <div className="detail-panel__pokemon-roles mt-2">
                {topAbilities.map(a => (
                  <span key={a.name} className="ability-pill" title={`${a.percentage} 채용률`}>
                    {a.name} <small>({a.percentage})</small>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="detail-section">
          <h3 className="detail-section__title">
            <span className="detail-section__title-icon">📊</span>
            종족값
            <span className="detail-section__total">총합 {totalStat}</span>
          </h3>
          <div className="detail-panel__stats-grid">
            {statsEntries.map(([key, value]) => (
              <div className="detail-stat-card" key={key}>
                <div className="detail-stat-card__label">{statLabels[key]}</div>
                <div
                  className="detail-stat-card__value"
                  style={{ color: getStatColor(value) }}
                >
                  {value}
                </div>
                <div className="detail-stat-card__bar">
                  <div
                    className="detail-stat-card__bar-fill"
                    style={{
                      width: `${Math.min((value / 200) * 100, 100)}%`,
                      backgroundColor: getStatColor(value),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {/* Meta Data: Moves & Items */}
            <div className="detail-section meta-stats-grid">
              <div className="meta-stats-card">
                <h4 className="meta-stats-title">🔥 주요 기술</h4>
                <ul className="meta-list">
                  {topMoves.length > 0 ? topMoves.map(m => (
                    <li key={m.name} className="meta-list-item">
                      <span className="meta-item-name">{m.name}</span>
                      <span className="meta-item-pct">{m.percentage}</span>
                    </li>
                  )) : <li className="text-muted">데이터가 없습니다</li>}
                </ul>
              </div>
              <div className="meta-stats-card">
                <h4 className="meta-stats-title">🎒 주요 도구</h4>
                <ul className="meta-list">
                  {topItems.length > 0 ? topItems.map(i => (
                    <li key={i.name} className="meta-list-item">
                      <span className="meta-item-name">{i.name}</span>
                      <span className="meta-item-pct">{i.percentage}</span>
                    </li>
                  )) : <li className="text-muted">데이터가 없습니다</li>}
                </ul>
              </div>
            </div>

            {/* Synergy (Teammates) */}
            <div className="detail-section">
              <h3 className="detail-section__title">
                <span className="detail-section__title-icon">🤝</span>
                자주 함께 쓰이는 포켓몬 ({battleFormat})
              </h3>
              {topTeammates.length > 0 ? (
                <div className="suggestion-grid">
                  {topTeammates.map((p) => (
                    <SuggestionCard key={p.name} pokemon={p} onClick={() => onSuggestionClick(p.name)} />
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4">팀메이트 데이터가 없습니다.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function SuggestionCard({ pokemon, onClick }) {
  const spriteUrl = apiService.getSpriteUrl(pokemon.name);
  const koName = getPokemonKo(pokemon.name);
  const types = pokemon.summary?.types || [];
  
  return (
    <div
      className="suggestion-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${koName} 상세 보기`}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      {pokemon.teammateRank && <span className="suggestion-rank">#{pokemon.teammateRank}</span>}
      <img 
        className="suggestion-card__image" 
        src={spriteUrl} 
        alt={koName} 
        loading="lazy" 
        onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'; }}
      />
      <span className="suggestion-card__name">{koName}</span>
      <div className="suggestion-card__types">
        {types.map((type) => (
          <span
            key={type}
            className="type-badge type-badge--sm"
            style={{ backgroundColor: typeColors[type] || typeColors['Normal'] }}
          >
            {getTypeKo(type)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default DetailPanel;
