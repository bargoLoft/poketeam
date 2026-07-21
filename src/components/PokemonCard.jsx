import { useState, useEffect, useRef } from 'react';
import typeColors, { getTypeKo, getPokeApiTypeIconUrl } from '../data/typeColors';
import { getPokemonKo } from '../data/pokemonNamesKo';
import { apiService } from '../services/apiService';
import { megaForms, fetchMegaData, getMegaStoneUrl } from '../utils/megaUtils';

function PokemonCard({ pokemon, battleData, activeMega, onToggleMega, isSelected, onClick, onRemove }) {
  const availableForms = megaForms[pokemon.name] || null;
  const [megaDataCache, setMegaDataCache] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAbilityTooltip, setShowAbilityTooltip] = useState(false);
  const tooltipTimer = useRef(null);
  const abilityTooltipTimer = useRef(null);

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
    onToggleMega(e, form);
  };

  const isMega = activeMega !== null && activeMega !== undefined && activeMega !== 'base' && activeMega !== false;
  const megaData = isMega ? megaDataCache[activeMega] : null;

  const spriteUrl = isMega && megaData ? megaData.spriteUrl : apiService.getSpriteUrl(pokemon.name);
  
  let koName = getPokemonKo(pokemon.name);
  if (isMega) {
    if (activeMega === 'x') koName = `메가${koName}X`;
    else if (activeMega === 'y') koName = `메가${koName}Y`;
    else koName = `메가${koName}`;
  }
  
  const types = isMega && megaData ? megaData.types : (pokemon.summary?.types || []);
  
  // Localized Ability, Moves, and Items
  const [abilityInfo, setAbilityInfo] = useState(null);
  const [topMoves, setTopMoves] = useState([]);
  const [topItems, setTopItems] = useState([]);

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

      // Fetch top items for ALL pokemon
      const itemsData = battleData.rows.filter(r => r.category === 'held_item').sort((a,b) => b.percentage_value - a.percentage_value).slice(0, 5); // top 5
      const itemsWithInfo = await Promise.all(
        itemsData.map(async (i) => {
          const info = await apiService.fetchItemInfo(i.name);
          return { ...i, ...info };
        })
      );
      if (isMounted) setTopItems(itemsWithInfo);
    };
    fetchMeta();
    return () => { isMounted = false; };
  }, [battleData, pokemon.name]);

  // Base Stats
  const baseStatsToUse = pokemon.summary?.baseStats || {};
  const calcBaseHP = (val) => Math.max(1, Math.round(((val - 60) * 2 - 31) / 2));
  const calcBaseOther = (val) => Math.max(1, Math.round(((val - 5) * 2 - 31) / 2));

  const normStats = {
    hp: isMega && megaData ? megaData.baseStats.hp : calcBaseHP(baseStatsToUse.hp || 60),
    atk: isMega && megaData ? megaData.baseStats.attack : calcBaseOther(baseStatsToUse.attack || 5),
    def: isMega && megaData ? megaData.baseStats.defense : calcBaseOther(baseStatsToUse.defense || 5),
    spa: isMega && megaData ? megaData.baseStats.sp_attack : calcBaseOther(baseStatsToUse.sp_attack || 5),
    spd: isMega && megaData ? megaData.baseStats.sp_defense : calcBaseOther(baseStatsToUse.sp_defense || 5),
    spe: isMega && megaData ? megaData.baseStats.speed : calcBaseOther(baseStatsToUse.speed || 5),
  };

  const getColor = (val) => {
    if (val >= 130) return '#d946ef';
    if (val >= 110) return '#10b981';
    if (val >= 90) return '#3b82f6';
    if (val >= 70) return '#f59e0b';
    return '#ef4444';
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

  const handleMouseEnter = () => {
    clearTimeout(tooltipTimer.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    tooltipTimer.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100); // slight delay to prevent flicker when moving into tooltip
  };

  const handleAbilityMouseEnter = () => {
    clearTimeout(abilityTooltipTimer.current);
    setShowAbilityTooltip(true);
  };

  const handleAbilityMouseLeave = () => {
    abilityTooltipTimer.current = setTimeout(() => {
      setShowAbilityTooltip(false);
    }, 100);
  };

  // Determine what to show in the primary item slot
  let primaryItemDisplay = null;
  if (isMega) {
    let megaItemPct = null;
    if (topItems && topItems.length > 0) {
      let match = null;
      if (activeMega === 'x') {
        match = topItems.find(i => i.name.includes('X'));
      } else if (activeMega === 'y') {
        match = topItems.find(i => i.name.includes('Y'));
      } else {
        match = topItems.find(i => i.name.includes('나이트'));
      }
      if (match) megaItemPct = match.percentage_value;
    }
    primaryItemDisplay = {
      sprite: getMegaStoneUrl(pokemon.name, activeMega),
      name: activeMega === 'mega' ? '메가진화' : `메가진화 (${activeMega.toUpperCase()})`,
      isMegaIcon: true,
      pct: megaItemPct
    };
  } else if (topItems.length > 0) {
    primaryItemDisplay = {
      sprite: topItems[0].sprite,
      name: topItems[0].name,
      pct: topItems[0].percentage_value
    };
  }

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
        
        {abilityInfo && abilityInfo.length > 0 && (
          <div 
            className="item-hover-container" 
            style={{ textAlign: 'center', marginBottom: '-2px' }}
            onMouseEnter={handleAbilityMouseEnter}
            onMouseLeave={handleAbilityMouseLeave}
          >
            <div className="pokemon-card__abilities" style={{ display: 'flex', justifyContent: 'center' }}>
              {abilityInfo.slice(0, 1).map((ab, i) => (
                <div key={i} className="top-item-icon" title={ab.flavor.replace(/\n|\f/g, ' ')}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>{ab.name}</span>
                  <span className="top-item-pct" style={{ fontSize: '0.6rem', flexShrink: 0, marginLeft: 'auto' }}>{Math.round(ab.percentage_value)}%</span>
                </div>
              ))}
            </div>

            {showAbilityTooltip && abilityInfo.length > 0 && (
              <div className="item-dropdown-tooltip">
                <div className="tooltip-section">
                  <div className="tooltip-title">특성 순위</div>
                  {abilityInfo.map((ab, i) => (
                    <div key={i} className="tooltip-row" style={{ display: 'grid', gridTemplateColumns: '20px 1fr 30px', gap: '8px', alignItems: 'center' }}>
                      <span className="tooltip-rank">{i + 1}</span>
                      <span className="tooltip-item-name" style={{ textAlign: 'left', fontSize: '0.65rem' }}>{ab.name}</span>
                      <span className="tooltip-item-pct">{Math.round(ab.percentage_value)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div 
          className="item-hover-container" 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          {primaryItemDisplay ? (
            <div className={`top-item-icon primary-item-trigger ${primaryItemDisplay.isMegaIcon ? 'is-mega' : ''}`}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                {primaryItemDisplay.sprite ? (
                  <img src={primaryItemDisplay.sprite} alt={primaryItemDisplay.name} style={{ flexShrink: 0 }} />
                ) : (
                  <span className="item-text-fallback" style={{ flexShrink: 0 }}>{primaryItemDisplay.name.substring(0, 2)}</span>
                )}
              </div>
              {primaryItemDisplay.pct && (
                <span className="top-item-pct" style={{ marginLeft: 'auto', flexShrink: 0 }}>{Math.round(primaryItemDisplay.pct)}%</span>
              )}
            </div>
          ) : (
            <div className="top-item-icon placeholder-item">
              <span>...</span>
            </div>
          )}

          {showTooltip && (
            <div className="item-dropdown-tooltip">
              {topItems.length > 0 && (
                <div className="tooltip-section">
                  <div className="tooltip-title">주요 도구 순위</div>
                  {topItems.map((item, i) => (
                    <div key={i} className="tooltip-row">
                      <span className="tooltip-rank">{i + 1}</span>
                      <img src={item.sprite} alt={item.name} className="tooltip-item-img" />
                      <span className="tooltip-item-name">{item.name}</span>
                      <span className="tooltip-item-pct">{Math.round(item.percentage_value)}%</span>
                    </div>
                  ))}
                </div>
              )}
              
              {availableForms && (
                <div className="tooltip-section mega-section">
                  <div className="tooltip-title">메가진화 토글</div>
                  <div className="mega-actions">
                    {availableForms.map(form => (
                      <button
                        key={form}
                        className={`mega-action-btn mega-action-btn--${form} ${activeMega === form ? 'active' : ''}`}
                        onClick={(e) => handleToggleMega(e, form)}
                        title={form === 'mega' ? '메가진화' : `메가진화 ${form.toUpperCase()}`}
                      >
                        <img src={getMegaStoneUrl(pokemon.name, form)} alt={`mega-${form}`} className="mega-stone-icon" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pokemon-card__info">
        <div className="pokemon-card__header-row">
          <div className="pokemon-card__name-type">
            <span className="pokemon-card__name">{koName}</span>
            <div className="pokemon-card__types" style={{display: 'flex', gap: '4px'}}>
              {types.map((type) => (
                <img
                  key={type}
                  src={getPokeApiTypeIconUrl(type)}
                  alt={type}
                  title={getTypeKo(type)}
                  style={{width: '20px', height: '20px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="pokemon-card__meta">
          {topMoves.length > 0 && (
            <div className="pokemon-card__top-moves">
              {topMoves.map((m, i) => {
                const color = typeColors[m.type] || '#ccc';
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


    </div>
  );
}

export default PokemonCard;
