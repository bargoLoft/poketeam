import { useState, useEffect } from 'react';
import typeColors, { getTypeKo } from '../data/typeColors';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { apiService } from '../services/apiService';
import { megaForms, fetchMegaData, getMegaStoneUrl } from '../utils/megaUtils';

function PokemonCard({ pokemon, battleData, activeMega, onToggleMega, isSelected, onClick, onRemove }) {
  const availableForms = megaForms[pokemon.name] || null;
  const [megaDataCache, setMegaDataCache] = useState({});

  // Toggle Mega Form
  const handleToggleMega = async (e, form) => {
    e.stopPropagation();
    if (activeMega !== form) {
      if (!megaDataCache[form]) {
        const data = await fetchMegaData(pokemon.name, form);
        if (data) {
          setMegaDataCache(prev => ({ ...prev, [form]: data }));
        }
      }
    }
    // Call parent handler
    onToggleMega(e, form);
  };

  const isMega = activeMega !== null;
  const megaData = isMega ? megaDataCache[activeMega] : null;

  const spriteUrl = isMega && megaData ? megaData.spriteUrl : apiService.getSpriteUrl(pokemon.name);
  
  let koName = getPokemonKo(pokemon.name);
  if (isMega) {
    if (activeMega === 'x') koName = `메가${koName}X`;
    else if (activeMega === 'y') koName = `메가${koName}Y`;
    else koName = `메가${koName}`;
  }
  
  const types = isMega && megaData ? megaData.types : (pokemon.summary?.types || []);
  
  // Localized Ability & Moves
  const [abilityInfo, setAbilityInfo] = useState(null);
  const [topMoves, setTopMoves] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchMeta = async () => {
      if (!battleData || !battleData.rows) return;
      
      const abilitiesData = battleData.rows
        .filter(r => r.category === 'ability' && r.percentage_value >= 10)
        .sort((a,b) => b.percentage_value - a.percentage_value);
      
      const abilitiesWithInfo = await Promise.all(
        abilitiesData.map(async (a) => {
          const info = await apiService.fetchAbilityInfo(a.name);
          return { ...a, ...info };
        })
      );
      if (isMounted) setAbilityInfo(abilitiesWithInfo);

      const movesData = battleData.rows.filter(r => r.category === 'move').sort((a,b) => a.rank - b.rank).slice(0, 4);
      const movesWithInfo = await Promise.all(
        movesData.map(async (m) => {
          const info = await apiService.fetchMoveInfo(m.name);
          return { ...m, ...info };
        })
      );
      if (isMounted) setTopMoves(movesWithInfo);
    };
    fetchMeta();
    return () => { isMounted = false; };
  }, [battleData]);

  // Base Stats
  const baseStatsToUse = pokemon.summary?.baseStats || {};
  const calcBaseHP = (val) => Math.max(1, Math.round(((val - 60) * 2 - 31) / 2));
  const calcBaseOther = (val) => Math.max(1, Math.round(((val - 5) * 2 - 31) / 2));

  // PokeAPI mega stats are true base stats. Original API is Lv50.
  const normStats = {
    hp: isMega && megaData ? megaData.baseStats.hp : calcBaseHP(baseStatsToUse.hp || 60),
    atk: isMega && megaData ? megaData.baseStats.attack : calcBaseOther(baseStatsToUse.attack || 5),
    def: isMega && megaData ? megaData.baseStats.defense : calcBaseOther(baseStatsToUse.defense || 5),
    spa: isMega && megaData ? megaData.baseStats.sp_attack : calcBaseOther(baseStatsToUse.sp_attack || 5),
    spd: isMega && megaData ? megaData.baseStats.sp_defense : calcBaseOther(baseStatsToUse.sp_defense || 5),
    spe: isMega && megaData ? megaData.baseStats.speed : calcBaseOther(baseStatsToUse.speed || 5),
  };

  // Detailed Colors
  const getColor = (val) => {
    if (val >= 130) return '#d946ef'; // Fuchsia
    if (val >= 110) return '#10b981'; // Emerald
    if (val >= 90) return '#3b82f6';  // Blue
    if (val >= 70) return '#f59e0b';  // Amber
    return '#ef4444'; // Red
  };

  const getBackgroundStyle = () => {
    if (!types || types.length === 0) return undefined;
    
    const hexToRgba = (hex, alpha) => {
      if (!hex) return `rgba(0,0,0,${alpha})`;
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
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    if (types.length === 1) {
      const c = typeColors[types[0]];
      return hexToRgba(c, 0.4);
    } else if (types.length >= 2) {
      const c1 = hexToRgba(typeColors[types[0]], 0.4);
      const c2 = hexToRgba(typeColors[types[1]], 0.4);
      return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
    }
    return undefined;
  };

  return (
    <div
      className={`pokemon-card${isSelected ? ' pokemon-card--selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${koName} 카드`}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <button
        className="pokemon-card__delete"
        onClick={(e) => { e.stopPropagation(); onRemove(e); }}
        aria-label={`${koName} 제거`}
      >
        ×
      </button>

      {/* Image & Mega Actions Column */}
      <div className="pokemon-card__image-col">
        <div className="pokemon-card__image-wrapper" style={{ background: getBackgroundStyle() }}>
          <img
            className="pokemon-card__image"
            src={spriteUrl}
            alt={koName}
            loading="lazy"
            onError={(e) => {
              e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
            }}
          />
        </div>
        
        {availableForms && (
          <div className="mega-actions">
            {availableForms.map(form => (
              <button
                key={form}
                className={`mega-action-btn mega-action-btn--${form} ${activeMega === form ? 'active' : ''}`}
                onClick={(e) => handleToggleMega(e, form)}
                title={`메가진화 ${form.toUpperCase()}`}
              >
                <img src={getMegaStoneUrl(pokemon.name, form)} alt={`mega-${form}`} className="mega-stone-icon" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pokemon-card__info">
        <div className="pokemon-card__header-row">
          <div className="pokemon-card__name-type">
            <span className="pokemon-card__name">{koName}</span>
            <div className="pokemon-card__types">
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
        </div>
        
        {/* Meta Info (Ability and Top Moves) */}
        <div className="pokemon-card__meta">
          {abilityInfo && abilityInfo.length > 0 && (
            <div className="pokemon-card__abilities">
              {abilityInfo.map((ab, i) => (
                <div key={i} className="meta-pill" title={ab.flavor.replace(/\n|\f/g, ' ')}>
                  <span className="meta-text">{ab.name} <span style={{fontSize: '0.6rem', color: 'var(--accent-primary)'}}>{Math.round(ab.percentage_value)}%</span></span>
                </div>
              ))}
            </div>
          )}
          
          {topMoves.length > 0 && (
            <div className="pokemon-card__top-moves">
              {topMoves.map((m, i) => {
                const color = typeColors[m.type] || '#ccc';
                // Use rgba for a softer background fill
                const bgStr = `linear-gradient(90deg, ${color}40 ${m.percentage_value}%, rgba(0,0,0,0.03) ${m.percentage_value}%)`;
                return (
                  <div 
                    key={i} 
                    className="top-move-item" 
                    style={{ background: bgStr, borderLeftColor: color }}
                  >
                    <span className="top-move-name">{m.name}</span>
                    <span className="top-move-pct">{Math.round(m.percentage_value)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vertical Base Stats on the Right */}
      <div className="pokemon-card__vertical-stats">
        <div className="v-stat"><span className="v-stat-lbl">H</span><span className="v-stat-val" style={{color: getColor(normStats.hp)}}>{normStats.hp}</span></div>
        <div className="v-stat"><span className="v-stat-lbl">A</span><span className="v-stat-val" style={{color: getColor(normStats.atk)}}>{normStats.atk}</span></div>
        <div className="v-stat"><span className="v-stat-lbl">B</span><span className="v-stat-val" style={{color: getColor(normStats.def)}}>{normStats.def}</span></div>
        <div className="v-stat"><span className="v-stat-lbl">C</span><span className="v-stat-val" style={{color: getColor(normStats.spa)}}>{normStats.spa}</span></div>
        <div className="v-stat"><span className="v-stat-lbl">D</span><span className="v-stat-val" style={{color: getColor(normStats.spd)}}>{normStats.spd}</span></div>
        <div className="v-stat"><span className="v-stat-lbl">S</span><span className="v-stat-val" style={{color: getColor(normStats.spe)}}>{normStats.spe}</span></div>
      </div>
    </div>
  );
}

export default PokemonCard;
